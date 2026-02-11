/**
 * DrumEventRecorder records drum hits as MIDI-like events.
 *
 * Instead of recording audio waveforms, this records:
 * - drumType: which drum was hit
 * - timeInLoop: when the hit occurred (ms from loop start)
 * - velocity: how hard the hit was (0-1)
 *
 * This allows:
 * - Efficient storage (just events, not audio)
 * - Easy quantization
 * - Playback through any drum synthesizer
 * - MIDI export potential
 */

import type { DrumHitEvent, BeatboxDrumType, BeatboxDetectionResult } from '../types';
import { beatboxDetector } from './BeatboxDetector';
import { logger } from './utils/logger';

export interface DrumEventRecorderCallbacks {
  onEventRecorded?: (event: DrumHitEvent) => void;
  onRecordingStarted?: () => void;
  onRecordingStopped?: (events: DrumHitEvent[]) => void;
}

export interface QuantizeConfig {
  enabled: boolean;
  subdivision: number;  // 16 = 16th notes, 8 = 8th notes, etc.
  strength: number;     // 0-1, how much to snap to grid
}

export class DrumEventRecorder {
  private isRecording = false;
  private recordingStartTime = 0;
  private loopLengthMs = 0;
  private events: DrumHitEvent[] = [];
  private callbacks: DrumEventRecorderCallbacks = {};
  private animationFrameId: number | null = null;

  // Quantization settings
  private quantize: QuantizeConfig = {
    enabled: true,
    subdivision: 16,
    strength: 0.5,
  };

  // BPM for quantization
  private bpm = 120;

  /**
   * Set callbacks for recorder events.
   */
  setCallbacks(callbacks: DrumEventRecorderCallbacks): void {
    this.callbacks = callbacks;
  }

  /**
   * Set quantization configuration.
   */
  setQuantize(config: Partial<QuantizeConfig>): void {
    this.quantize = { ...this.quantize, ...config };
  }

  /**
   * Set BPM for quantization calculations.
   */
  setBpm(bpm: number): void {
    this.bpm = bpm;
  }

  /**
   * Start recording drum events.
   *
   * @param loopLengthMs - The length of the loop in milliseconds.
   *                       If 0, recording continues until stopped.
   */
  startRecording(loopLengthMs: number = 0): void {
    if (this.isRecording) return;

    this.isRecording = true;
    this.recordingStartTime = performance.now();
    this.loopLengthMs = loopLengthMs;
    this.events = [];

    // Set up beatbox detector callback
    beatboxDetector.setCallbacks({
      onDrumDetected: (result) => this.handleDrumDetected(result),
    });

    // Start analysis loop
    this.startAnalysisLoop();

    this.callbacks.onRecordingStarted?.();
    logger.info(`[DrumEventRecorder] Started recording${loopLengthMs > 0 ? ` (${loopLengthMs}ms loop)` : ''}`);
  }

  /**
   * Stop recording and return recorded events.
   */
  stopRecording(): DrumHitEvent[] {
    if (!this.isRecording) return this.events;

    this.isRecording = false;
    this.stopAnalysisLoop();

    // Apply quantization if enabled
    if (this.quantize.enabled && this.events.length > 0) {
      this.events = this.quantizeEvents(this.events);
    }

    this.callbacks.onRecordingStopped?.(this.events);
    logger.info(`[DrumEventRecorder] Stopped recording, ${this.events.length} events`);

    return this.events;
  }

  /**
   * Handle drum detection from BeatboxDetector.
   */
  private handleDrumDetected(result: BeatboxDetectionResult): void {
    if (!this.isRecording || !result.drumType) return;

    const now = performance.now();
    let timeInLoop = now - this.recordingStartTime;

    // Wrap time if we have a loop length
    if (this.loopLengthMs > 0 && timeInLoop >= this.loopLengthMs) {
      // Recording should have stopped, but handle gracefully
      timeInLoop = timeInLoop % this.loopLengthMs;
    }

    const event: DrumHitEvent = {
      drumType: result.drumType,
      timeInLoop,
      velocity: result.velocity,
    };

    this.events.push(event);
    this.callbacks.onEventRecorded?.(event);

    logger.debug(`[DrumEventRecorder] Event: ${result.drumType} @ ${timeInLoop.toFixed(0)}ms vel=${result.velocity.toFixed(2)}`);
  }

  /**
   * Start the analysis loop.
   */
  private startAnalysisLoop(): void {
    const analyze = () => {
      if (!this.isRecording) return;

      // Run beatbox detector analysis
      beatboxDetector.analyze();

      // Check if loop time exceeded
      if (this.loopLengthMs > 0) {
        const elapsed = performance.now() - this.recordingStartTime;
        if (elapsed >= this.loopLengthMs) {
          this.stopRecording();
          return;
        }
      }

      this.animationFrameId = requestAnimationFrame(analyze);
    };

    this.animationFrameId = requestAnimationFrame(analyze);
  }

  /**
   * Stop the analysis loop.
   */
  private stopAnalysisLoop(): void {
    if (this.animationFrameId !== null) {
      cancelAnimationFrame(this.animationFrameId);
      this.animationFrameId = null;
    }
  }

  /**
   * Quantize events to a grid.
   */
  private quantizeEvents(events: DrumHitEvent[]): DrumHitEvent[] {
    // Calculate grid interval in ms
    const beatsPerMs = this.bpm / 60000;
    const gridIntervalMs = 1 / (beatsPerMs * (this.quantize.subdivision / 4));

    return events.map(event => {
      // Find nearest grid position
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
   * Get current events (during or after recording).
   */
  getEvents(): DrumHitEvent[] {
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
   * Add events manually (e.g., for merging or loading).
   */
  addEvents(events: DrumHitEvent[]): void {
    this.events.push(...events);
  }

  /**
   * Clear all events.
   */
  clearEvents(): void {
    this.events = [];
  }

  /**
   * Merge overlapping or very close events.
   * Useful for cleaning up jittery detections.
   */
  deduplicateEvents(thresholdMs: number = 50): void {
    if (this.events.length < 2) return;

    // Sort by time
    this.events.sort((a, b) => a.timeInLoop - b.timeInLoop);

    // Remove duplicates of same type within threshold
    const deduped: DrumHitEvent[] = [this.events[0]];

    for (let i = 1; i < this.events.length; i++) {
      const current = this.events[i];
      const last = deduped[deduped.length - 1];

      // If same type and within threshold, keep the higher velocity one
      if (
        current.drumType === last.drumType &&
        current.timeInLoop - last.timeInLoop < thresholdMs
      ) {
        if (current.velocity > last.velocity) {
          deduped[deduped.length - 1] = current;
        }
      } else {
        deduped.push(current);
      }
    }

    this.events = deduped;
  }

  /**
   * Get events grouped by drum type.
   */
  getEventsByType(): Map<BeatboxDrumType, DrumHitEvent[]> {
    const grouped = new Map<BeatboxDrumType, DrumHitEvent[]>();

    for (const event of this.events) {
      if (!grouped.has(event.drumType)) {
        grouped.set(event.drumType, []);
      }
      grouped.get(event.drumType)!.push(event);
    }

    return grouped;
  }

  /**
   * Export events as JSON string.
   */
  exportAsJson(): string {
    return JSON.stringify({
      bpm: this.bpm,
      loopLengthMs: this.loopLengthMs,
      events: this.events,
    }, null, 2);
  }

  /**
   * Import events from JSON string.
   */
  importFromJson(json: string): void {
    try {
      const data = JSON.parse(json);
      if (data.events && Array.isArray(data.events)) {
        this.events = data.events;
        if (data.bpm) this.bpm = data.bpm;
        if (data.loopLengthMs) this.loopLengthMs = data.loopLengthMs;
      }
    } catch (e) {
      logger.error('[DrumEventRecorder] Failed to import JSON:', e);
    }
  }

  /**
   * Reset recorder state.
   */
  reset(): void {
    this.stopRecording();
    this.events = [];
    this.recordingStartTime = 0;
    this.loopLengthMs = 0;
  }
}

// Singleton instance
export const drumEventRecorder = new DrumEventRecorder();
