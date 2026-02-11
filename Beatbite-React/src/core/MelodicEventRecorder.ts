/**
 * MelodicEventRecorder records melodic note events for bass, guitar, and piano.
 *
 * Uses VoiceOnsetDetector to detect when the user starts/stops singing,
 * then records events with:
 * - frequency: The detected pitch
 * - noteName: The note name (e.g., "C4")
 * - timeInLoop: When the note started (ms from loop start)
 * - duration: How long the note was held (ms)
 * - velocity: Volume/intensity (0-1)
 *
 * This enables the new recording system where:
 * ONE vocal sound = ONE instrument hit (no continuous pitch following)
 */

import type { MelodicNoteEvent, PitchContourPoint, BassNoteEvent, GuitarNoteEvent, PianoNoteEvent, BassStyle, GuitarStyle, PianoStyle, VoiceOnsetResult } from '../types';
import { voiceOnsetDetector } from './VoiceOnsetDetector';
import { bassSynthesizer, guitarSynthesizer, pianoSynthesizer } from './synthesizers';
import { logger } from './utils/logger';

export type MelodicInstrumentType = 'bass' | 'guitar' | 'piano';

export interface MelodicEventRecorderCallbacks {
  onEventRecorded?: (event: MelodicNoteEvent) => void;
  onRecordingStarted?: () => void;
  onRecordingStopped?: (events: MelodicNoteEvent[]) => void;
  onNoteOn?: (frequency: number, noteName: string) => void;
  onNoteOff?: () => void;
}

export interface MelodicQuantizeConfig {
  enabled: boolean;
  subdivision: number;  // 16 = 16th notes, 8 = 8th notes, etc.
  strength: number;     // 0-1, how much to snap to grid
}

export class MelodicEventRecorder {
  private isRecording = false;
  private recordingStartTime = 0;
  private loopLengthMs = 0;
  private events: MelodicNoteEvent[] = [];
  private callbacks: MelodicEventRecorderCallbacks = {};

  // Current instrument being recorded
  private instrumentType: MelodicInstrumentType = 'bass';

  // Styles for each instrument
  private bassStyle: BassStyle = 'synth';
  private guitarStyle: GuitarStyle = 'clean';
  private pianoStyle: PianoStyle = 'grand';

  // Quantization settings
  private quantize: MelodicQuantizeConfig = {
    enabled: true,
    subdivision: 16,
    strength: 0.5,
  };

  // BPM for quantization
  private bpm = 120;

  // Pending note (onset received, waiting for offset)
  private pendingNote: {
    frequency: number;
    noteName: string;
    timeInLoop: number;
    velocity: number;
    onsetTimestamp: number;
    pitchContour: PitchContourPoint[];
    lastContourSampleTime: number;
  } | null = null;

  /**
   * Set callbacks for recorder events.
   */
  setCallbacks(callbacks: MelodicEventRecorderCallbacks): void {
    this.callbacks = callbacks;
  }

  /**
   * Set quantization configuration.
   */
  setQuantize(config: Partial<MelodicQuantizeConfig>): void {
    this.quantize = { ...this.quantize, ...config };
  }

  /**
   * Set BPM for quantization calculations.
   */
  setBpm(bpm: number): void {
    this.bpm = bpm;
  }

  /**
   * Set the instrument type to record.
   */
  setInstrumentType(type: MelodicInstrumentType): void {
    this.instrumentType = type;
  }

  /**
   * Set instrument styles.
   */
  setStyles(bass: BassStyle, guitar: GuitarStyle, piano: PianoStyle): void {
    this.bassStyle = bass;
    this.guitarStyle = guitar;
    this.pianoStyle = piano;
  }

  /**
   * Start recording melodic events.
   *
   * @param loopLengthMs - The length of the loop in milliseconds.
   *                       Must be > 0 for melodic instruments (set by drums).
   */
  startRecording(loopLengthMs: number): void {
    if (this.isRecording) return;
    if (loopLengthMs <= 0) {
      logger.error('[MelodicEventRecorder] Loop length must be > 0');
      return;
    }

    this.isRecording = true;
    this.recordingStartTime = performance.now();
    this.loopLengthMs = loopLengthMs;
    this.events = [];
    this.pendingNote = null;

    // Set up voice onset detector callbacks
    voiceOnsetDetector.setCallbacks({
      onOnset: (result) => this.handleOnset(result),
      onOffset: (result) => this.handleOffset(result),
      onSustainUpdate: (freq, noteName, rms) => this.handleSustainUpdate(freq, noteName, rms),
    });

    // Start the voice onset detector
    voiceOnsetDetector.start();

    this.callbacks.onRecordingStarted?.();
    logger.info(`[MelodicEventRecorder] Started recording ${this.instrumentType} (${loopLengthMs}ms loop)`);
  }

  /**
   * Stop recording and return recorded events.
   */
  stopRecording(): MelodicNoteEvent[] {
    if (!this.isRecording) return this.events;

    this.isRecording = false;

    // Force any pending note to complete
    const finalOffset = voiceOnsetDetector.forceOffset();
    if (finalOffset && this.pendingNote) {
      this.handleOffset(finalOffset);
    }

    // Stop the voice onset detector
    voiceOnsetDetector.stop();

    // Release any playing notes
    this.releaseCurrentInstrument();

    // Apply quantization if enabled
    if (this.quantize.enabled && this.events.length > 0) {
      this.events = this.quantizeEvents(this.events);
    }

    this.callbacks.onRecordingStopped?.(this.events);
    logger.info(`[MelodicEventRecorder] Stopped recording, ${this.events.length} events`);

    return this.events;
  }

  /**
   * Handle voice onset - start a new note.
   */
  private handleOnset(result: VoiceOnsetResult): void {
    if (!this.isRecording) return;

    const now = performance.now();
    let timeInLoop = now - this.recordingStartTime;

    // Wrap time if we exceed loop length
    if (timeInLoop >= this.loopLengthMs) {
      timeInLoop = timeInLoop % this.loopLengthMs;
    }

    // Store pending note info
    this.pendingNote = {
      frequency: result.frequency,
      noteName: result.noteName,
      timeInLoop,
      velocity: result.velocity,
      onsetTimestamp: result.timestamp,
      pitchContour: [],
      lastContourSampleTime: result.timestamp,
    };

    // Trigger the instrument sound
    this.triggerCurrentInstrument(result.frequency, result.velocity);

    this.callbacks.onNoteOn?.(result.frequency, result.noteName);
    logger.debug(`[MelodicEventRecorder] Note ON: ${result.noteName} @ ${timeInLoop.toFixed(0)}ms`);
  }

  /**
   * Handle voice offset - complete the note event.
   */
  private handleOffset(result: VoiceOnsetResult): void {
    if (!this.isRecording || !this.pendingNote) return;

    const duration = result.duration || 0;

    // Only record notes with minimum duration
    if (duration >= 50) {
      const event: MelodicNoteEvent = {
        frequency: this.pendingNote.frequency,
        noteName: this.pendingNote.noteName,
        timeInLoop: this.pendingNote.timeInLoop,
        duration,
        velocity: this.pendingNote.velocity,
        pitchContour: this.pendingNote.pitchContour.length > 0
          ? this.pendingNote.pitchContour
          : undefined,
      };

      this.events.push(event);
      this.callbacks.onEventRecorded?.(event);

      logger.debug(
        `[MelodicEventRecorder] Note OFF: ${event.noteName} duration=${duration.toFixed(0)}ms`
      );
    }

    // Release the instrument
    this.releaseCurrentInstrument();

    this.pendingNote = null;
    this.callbacks.onNoteOff?.();
  }

  /**
   * Handle continuous pitch update during sustain.
   * Captures pitch contour and forwards pitch to synth in real-time.
   */
  private handleSustainUpdate(frequency: number, _noteName: string, _rms: number): void {
    if (!this.isRecording || !this.pendingNote) return;

    const now = performance.now();
    const timeOffset = now - this.pendingNote.onsetTimestamp;

    // Downsample: capture every 50ms (~20 Hz)
    if (now - this.pendingNote.lastContourSampleTime >= 50) {
      this.pendingNote.pitchContour.push({ timeOffset, frequency });
      this.pendingNote.lastContourSampleTime = now;
    }

    // Update synth in real-time
    this.updateCurrentInstrumentPitch(frequency);
  }

  /**
   * Route pitch updates to the current instrument's synth.
   */
  private updateCurrentInstrumentPitch(frequency: number): void {
    switch (this.instrumentType) {
      case 'bass':
        bassSynthesizer.updatePitch(frequency);
        break;
      case 'guitar':
        guitarSynthesizer.updatePitch(frequency);
        break;
      case 'piano':
        break; // Piano stays discrete
    }
  }

  /**
   * Trigger the current instrument with a note.
   */
  private triggerCurrentInstrument(frequency: number, velocity: number): void {
    switch (this.instrumentType) {
      case 'bass':
        bassSynthesizer.triggerNote(frequency, velocity);
        break;
      case 'guitar':
        guitarSynthesizer.triggerNote(frequency, velocity);
        break;
      case 'piano':
        pianoSynthesizer.triggerNoteFromVoice(frequency, velocity);
        break;
    }
  }

  /**
   * Release (stop) the current instrument.
   */
  private releaseCurrentInstrument(): void {
    switch (this.instrumentType) {
      case 'bass':
        bassSynthesizer.releaseNote();
        break;
      case 'guitar':
        guitarSynthesizer.releaseNote();
        break;
      case 'piano':
        pianoSynthesizer.releaseAllAndNotify();
        break;
    }
  }

  /**
   * Quantize events to a grid.
   */
  private quantizeEvents(events: MelodicNoteEvent[]): MelodicNoteEvent[] {
    // Calculate grid interval in ms
    const beatsPerMs = this.bpm / 60000;
    const gridIntervalMs = 1 / (beatsPerMs * (this.quantize.subdivision / 4));

    return events.map(event => {
      // Find nearest grid position for start time
      const nearestGrid = Math.round(event.timeInLoop / gridIntervalMs) * gridIntervalMs;

      // Apply strength (0 = no change, 1 = full snap)
      const quantizedTime = event.timeInLoop + (nearestGrid - event.timeInLoop) * this.quantize.strength;

      return {
        ...event,
        timeInLoop: quantizedTime,
      };
    });
  }

  /**
   * Get events with style information for the current instrument.
   */
  getStyledEvents(): BassNoteEvent[] | GuitarNoteEvent[] | PianoNoteEvent[] {
    switch (this.instrumentType) {
      case 'bass':
        return this.events.map(e => ({ ...e, style: this.bassStyle })) as BassNoteEvent[];
      case 'guitar':
        return this.events.map(e => ({ ...e, style: this.guitarStyle })) as GuitarNoteEvent[];
      case 'piano':
        return this.events.map(e => ({ ...e, style: this.pianoStyle })) as PianoNoteEvent[];
    }
  }

  /**
   * Get current events (during or after recording).
   */
  getEvents(): MelodicNoteEvent[] {
    return [...this.events];
  }

  /**
   * Check if recording is active.
   */
  getIsRecording(): boolean {
    return this.isRecording;
  }

  /**
   * Get elapsed recording time in ms.
   */
  getElapsedTime(): number {
    if (!this.isRecording) return 0;
    return performance.now() - this.recordingStartTime;
  }

  /**
   * Get position in loop (0 to 1).
   */
  getLoopPosition(): number {
    if (!this.isRecording || this.loopLengthMs <= 0) return 0;
    const elapsed = this.getElapsedTime();
    return (elapsed % this.loopLengthMs) / this.loopLengthMs;
  }

  /**
   * Check if a note is currently being held.
   */
  isNoteActive(): boolean {
    return this.pendingNote !== null;
  }

  /**
   * Add events manually (e.g., for loading).
   */
  addEvents(events: MelodicNoteEvent[]): void {
    this.events.push(...events);
  }

  /**
   * Clear all events.
   */
  clearEvents(): void {
    this.events = [];
  }

  /**
   * Export events as JSON string.
   */
  exportAsJson(): string {
    return JSON.stringify({
      instrumentType: this.instrumentType,
      bpm: this.bpm,
      loopLengthMs: this.loopLengthMs,
      events: this.getStyledEvents(),
    }, null, 2);
  }

  /**
   * Reset recorder state.
   */
  reset(): void {
    this.stopRecording();
    this.events = [];
    this.pendingNote = null;
    this.recordingStartTime = 0;
    this.loopLengthMs = 0;
  }
}

// Singleton instance
export const melodicEventRecorder = new MelodicEventRecorder();
