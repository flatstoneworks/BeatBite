/**
 * MelodicEventPlayer plays back recorded melodic events through synthesizers.
 *
 * Features:
 * - Accurate timing using Web Audio scheduling
 * - Loop playback with seamless looping
 * - Velocity-sensitive note triggering
 * - Volume control
 * - Sync with transport/metronome
 * - Supports bass, guitar, and piano instruments
 */

import type { MelodicNoteEvent, BassNoteEvent, GuitarNoteEvent, PianoNoteEvent } from '../types';
import { bassSynthesizer } from './BassSynthesizer';
import { guitarSynthesizer } from './GuitarSynthesizer';
import { pianoSynthesizer } from './PianoSynthesizer';
import type { MelodicInstrumentType } from './MelodicEventRecorder';

export interface MelodicEventPlayerCallbacks {
  onEventPlayed?: (event: MelodicNoteEvent) => void;
  onLoopComplete?: () => void;
  onPlaybackStarted?: () => void;
  onPlaybackStopped?: () => void;
}

export class MelodicEventPlayer {
  private audioContext: AudioContext | null = null;
  private events: MelodicNoteEvent[] = [];
  private isPlaying = false;
  private loopLengthMs = 0;
  private callbacks: MelodicEventPlayerCallbacks = {};

  // Instrument type this player handles
  private instrumentType: MelodicInstrumentType = 'bass';

  // Scheduling
  private scheduledEvents: Map<number, ReturnType<typeof setTimeout>> = new Map();
  private playbackStartTime = 0;
  private scheduleAheadMs = 100; // Schedule events 100ms ahead
  private lookaheadMs = 25; // Check every 25ms
  private schedulerTimerId: ReturnType<typeof setTimeout> | null = null;
  private currentLoopCount = 0;

  // Volume
  private volume = 1.0;
  private muted = false;

  /**
   * Initialize the player with an audio context.
   */
  initialize(audioContext: AudioContext): void {
    this.audioContext = audioContext;
    console.log('[MelodicEventPlayer] Initialized');
  }

  /**
   * Set the instrument type to play.
   */
  setInstrumentType(type: MelodicInstrumentType): void {
    this.instrumentType = type;
  }

  /**
   * Set callbacks for player events.
   */
  setCallbacks(callbacks: MelodicEventPlayerCallbacks): void {
    this.callbacks = callbacks;
  }

  /**
   * Load events to play.
   * Events should already have style information.
   */
  loadEvents(events: MelodicNoteEvent[], loopLengthMs: number): void {
    this.events = [...events].sort((a, b) => a.timeInLoop - b.timeInLoop);
    this.loopLengthMs = loopLengthMs;
    this.scheduledEvents.clear();
    console.log(`[MelodicEventPlayer] Loaded ${events.length} ${this.instrumentType} events, loop=${loopLengthMs}ms`);
  }

  /**
   * Load bass events.
   */
  loadBassEvents(events: BassNoteEvent[], loopLengthMs: number): void {
    this.instrumentType = 'bass';
    // Set bass style from first event if available
    if (events.length > 0 && events[0].style) {
      bassSynthesizer.setStyle(events[0].style);
    }
    this.loadEvents(events, loopLengthMs);
  }

  /**
   * Load guitar events.
   */
  loadGuitarEvents(events: GuitarNoteEvent[], loopLengthMs: number): void {
    this.instrumentType = 'guitar';
    // Set guitar style from first event if available
    if (events.length > 0 && events[0].style) {
      guitarSynthesizer.setStyle(events[0].style);
    }
    this.loadEvents(events, loopLengthMs);
  }

  /**
   * Load piano events.
   */
  loadPianoEvents(events: PianoNoteEvent[], loopLengthMs: number): void {
    this.instrumentType = 'piano';
    // Set piano style from first event if available
    if (events.length > 0 && events[0].style) {
      pianoSynthesizer.setStyle(events[0].style);
    }
    this.loadEvents(events, loopLengthMs);
  }

  /**
   * Start playback.
   *
   * @param startTime - Optional start time in audio context time.
   *                    Used for syncing with other players.
   */
  start(startTime?: number): void {
    if (!this.audioContext || this.isPlaying || this.events.length === 0) return;

    this.isPlaying = true;
    this.playbackStartTime = startTime ?? this.audioContext.currentTime;
    this.currentLoopCount = 0;
    this.scheduledEvents.clear();

    // Start the scheduler
    this.scheduler();

    this.callbacks.onPlaybackStarted?.();
    console.log(`[MelodicEventPlayer] Started ${this.instrumentType} playback`);
  }

  /**
   * Stop playback.
   */
  stop(): void {
    this.isPlaying = false;

    if (this.schedulerTimerId !== null) {
      clearTimeout(this.schedulerTimerId);
      this.schedulerTimerId = null;
    }

    // Clear all scheduled events
    for (const timerId of this.scheduledEvents.values()) {
      clearTimeout(timerId);
    }
    this.scheduledEvents.clear();

    // Release any playing notes
    this.releaseCurrentNote();

    this.callbacks.onPlaybackStopped?.();
    console.log(`[MelodicEventPlayer] Stopped ${this.instrumentType} playback`);
  }

  /**
   * Scheduler function - schedules events ahead of time for accurate playback.
   */
  private scheduler(): void {
    if (!this.isPlaying || !this.audioContext) return;

    const now = this.audioContext.currentTime;
    const loopLengthSec = this.loopLengthMs / 1000;
    const scheduleAheadSec = this.scheduleAheadMs / 1000;

    // Calculate current position in the loop
    const elapsed = now - this.playbackStartTime;
    const currentLoop = Math.floor(elapsed / loopLengthSec);

    // Check if we've started a new loop
    if (currentLoop > this.currentLoopCount) {
      this.currentLoopCount = currentLoop;
      this.callbacks.onLoopComplete?.();
    }

    // Schedule events that fall within our look-ahead window
    for (const event of this.events) {
      const eventTimeSec = event.timeInLoop / 1000;

      // Calculate event's absolute time in this loop iteration
      const eventAbsoluteTime = this.playbackStartTime + currentLoop * loopLengthSec + eventTimeSec;

      // Also check next loop for events that might be upcoming
      const eventAbsoluteTimeNextLoop = eventAbsoluteTime + loopLengthSec;

      // Check current loop
      if (eventAbsoluteTime > now && eventAbsoluteTime < now + scheduleAheadSec) {
        this.scheduleEvent(event, eventAbsoluteTime, currentLoop);
      }

      // Check next loop (for wrap-around at end of loop)
      if (eventAbsoluteTimeNextLoop > now && eventAbsoluteTimeNextLoop < now + scheduleAheadSec) {
        this.scheduleEvent(event, eventAbsoluteTimeNextLoop, currentLoop + 1);
      }
    }

    // Schedule next check
    this.schedulerTimerId = setTimeout(() => this.scheduler(), this.lookaheadMs);
  }

  /**
   * Schedule a single event for playback.
   */
  private scheduleEvent(event: MelodicNoteEvent, time: number, loopIndex: number): void {
    // Create unique key for this event instance
    const key = loopIndex * 1000000 + Math.round(event.timeInLoop);

    // Don't schedule if already scheduled
    if (this.scheduledEvents.has(key)) return;

    // Schedule the note trigger
    const delay = Math.max(0, (time - (this.audioContext?.currentTime ?? 0)) * 1000);

    const timerId = setTimeout(() => {
      if (!this.isPlaying) return;

      // Trigger note sound
      this.triggerNote(event);

      // Notify callback
      this.callbacks.onEventPlayed?.(event);

      // Schedule note release if duration is specified
      if (event.duration > 0) {
        setTimeout(() => {
          this.releaseCurrentNote();
        }, event.duration);
      }

      // Clean up scheduled event after a reasonable time
      setTimeout(() => this.scheduledEvents.delete(key), event.duration + 100);
    }, delay);

    this.scheduledEvents.set(key, timerId);
  }

  /**
   * Trigger a note sound with velocity.
   */
  private triggerNote(event: MelodicNoteEvent): void {
    if (this.muted) return;

    // Apply volume and velocity
    const velocity = event.velocity * this.volume;

    switch (this.instrumentType) {
      case 'bass':
        // Use playNoteAtFrequency since events store the already-transposed frequency
        bassSynthesizer.playNoteAtFrequency(event.frequency, velocity);
        break;
      case 'guitar':
        guitarSynthesizer.playNoteAtFrequency(event.frequency, velocity);
        break;
      case 'piano':
        pianoSynthesizer.playNoteAtFrequency(event.frequency, velocity);
        break;
    }
  }

  /**
   * Release the currently playing note.
   */
  private releaseCurrentNote(): void {
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
   * Set playback volume (0-1).
   */
  setVolume(volume: number): void {
    this.volume = Math.max(0, Math.min(1, volume));
  }

  /**
   * Get current volume.
   */
  getVolume(): number {
    return this.volume;
  }

  /**
   * Set muted state.
   */
  setMuted(muted: boolean): void {
    this.muted = muted;
    if (muted) {
      this.releaseCurrentNote();
    }
  }

  /**
   * Check if muted.
   */
  isMuted(): boolean {
    return this.muted;
  }

  /**
   * Check if playing.
   */
  getIsPlaying(): boolean {
    return this.isPlaying;
  }

  /**
   * Get current loop count.
   */
  getLoopCount(): number {
    return this.currentLoopCount;
  }

  /**
   * Get current position in loop (0 to loopLengthMs).
   */
  getCurrentPosition(): number {
    if (!this.isPlaying || !this.audioContext) return 0;
    const elapsed = (this.audioContext.currentTime - this.playbackStartTime) * 1000;
    return elapsed % this.loopLengthMs;
  }

  /**
   * Get loop length in ms.
   */
  getLoopLengthMs(): number {
    return this.loopLengthMs;
  }

  /**
   * Reset player state.
   */
  reset(): void {
    this.stop();
    this.events = [];
    this.loopLengthMs = 0;
    this.currentLoopCount = 0;
  }
}

// Create singleton instances for each instrument type
export const bassEventPlayer = new MelodicEventPlayer();
export const guitarEventPlayer = new MelodicEventPlayer();
export const pianoEventPlayer = new MelodicEventPlayer();

// Initialize instrument types
bassEventPlayer.setInstrumentType('bass');
guitarEventPlayer.setInstrumentType('guitar');
pianoEventPlayer.setInstrumentType('piano');
