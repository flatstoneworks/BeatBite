/**
 * TransportController manages tempo, loop timing, and beat position.
 *
 * Responsibilities:
 * - Track BPM and loop length
 * - Provide current beat position for visual metronome
 * - Calculate quantization grid points
 * - Sync all layer playback
 */

import type { TransportState } from '../types';

export interface TransportCallbacks {
  onPositionUpdate?: (state: TransportState) => void;
  onBeatChange?: (beat: number, bar: number) => void;
  onLoopBoundary?: () => void;
}

export class TransportController {
  private audioContext: AudioContext | null = null;
  private callbacks: TransportCallbacks = {};

  // Timing state
  private bpm = 120;
  private bars = 4;
  private beatsPerBar = 4;
  private loopLengthMs = 0;
  private loopLengthSamples = 0;

  // Playback state
  private isPlaying = false;
  private startTime = 0;  // audioContext.currentTime when playback started
  private animationFrameId: number | null = null;

  // Position tracking
  private currentPosition = 0;
  private currentBeat = 0;
  private currentBar = 0;
  private lastBeat = -1;

  /**
   * Initialize with an audio context.
   */
  initialize(audioContext: AudioContext): void {
    this.audioContext = audioContext;
    console.log('[Transport] Initialized');
  }

  /**
   * Set callbacks for transport events.
   */
  setCallbacks(callbacks: TransportCallbacks): void {
    this.callbacks = callbacks;
  }

  /**
   * Set loop from an AudioBuffer (first recording).
   * Detects or infers BPM and bar count from the buffer duration.
   */
  setLoopFromBuffer(buffer: AudioBuffer, detectedBpm?: number): void {
    const durationMs = buffer.duration * 1000;

    if (detectedBpm && detectedBpm > 0) {
      this.bpm = detectedBpm;
    } else {
      // Infer BPM assuming 4 or 8 bars
      // Try 4 bars first, if BPM is too slow/fast, try 8 bars
      const bpm4bars = (4 * this.beatsPerBar * 60000) / durationMs;
      const bpm8bars = (8 * this.beatsPerBar * 60000) / durationMs;

      // Prefer BPM in 80-160 range
      if (bpm4bars >= 80 && bpm4bars <= 160) {
        this.bpm = Math.round(bpm4bars);
        this.bars = 4;
      } else if (bpm8bars >= 80 && bpm8bars <= 160) {
        this.bpm = Math.round(bpm8bars);
        this.bars = 8;
      } else if (bpm4bars >= 60 && bpm4bars <= 200) {
        this.bpm = Math.round(bpm4bars);
        this.bars = 4;
      } else {
        this.bpm = Math.round(bpm8bars);
        this.bars = 8;
      }
    }

    this.loopLengthMs = durationMs;
    this.loopLengthSamples = buffer.length;

    // Recalculate bars based on final BPM
    const msPerBeat = 60000 / this.bpm;
    const totalBeats = durationMs / msPerBeat;
    this.bars = Math.round(totalBeats / this.beatsPerBar);
    if (this.bars < 1) this.bars = 1;

    console.log(`[Transport] Loop set: ${this.bpm} BPM, ${this.bars} bars, ${durationMs.toFixed(0)}ms`);
  }

  /**
   * Set BPM manually.
   */
  setBpm(bpm: number): void {
    this.bpm = Math.max(40, Math.min(240, bpm));

    // Recalculate loop length if we have one
    if (this.bars > 0) {
      const msPerBeat = 60000 / this.bpm;
      this.loopLengthMs = this.bars * this.beatsPerBar * msPerBeat;

      if (this.audioContext) {
        this.loopLengthSamples = Math.round(
          (this.loopLengthMs / 1000) * this.audioContext.sampleRate
        );
      }
    }
  }

  /**
   * Set number of bars.
   */
  setBars(bars: number): void {
    this.bars = Math.max(1, Math.min(16, bars));

    // Recalculate loop length
    const msPerBeat = 60000 / this.bpm;
    this.loopLengthMs = this.bars * this.beatsPerBar * msPerBeat;

    if (this.audioContext) {
      this.loopLengthSamples = Math.round(
        (this.loopLengthMs / 1000) * this.audioContext.sampleRate
      );
    }
  }

  /**
   * Set tempo manually (for tempo selection flow).
   * Sets BPM, bars, and beatsPerBar in one call.
   */
  setManualTempo(bpm: number, bars: number = 4, beatsPerBar: number = 4): void {
    this.bpm = Math.max(40, Math.min(240, bpm));
    this.bars = Math.max(1, Math.min(16, bars));
    this.beatsPerBar = Math.max(2, Math.min(8, beatsPerBar));

    // Calculate loop length
    const msPerBeat = 60000 / this.bpm;
    this.loopLengthMs = this.bars * this.beatsPerBar * msPerBeat;

    if (this.audioContext) {
      this.loopLengthSamples = Math.round(
        (this.loopLengthMs / 1000) * this.audioContext.sampleRate
      );
    }

    console.log(`[Transport] Manual tempo: ${this.bpm} BPM, ${this.bars} bars, ${this.loopLengthMs.toFixed(0)}ms`);
  }

  /**
   * Start playback/position tracking.
   */
  start(): void {
    if (!this.audioContext || this.isPlaying) return;

    this.isPlaying = true;
    this.startTime = this.audioContext.currentTime;
    this.lastBeat = -1;

    this.startPositionTracking();
    console.log('[Transport] Started');
  }

  /**
   * Stop playback/position tracking.
   */
  stop(): void {
    this.isPlaying = false;
    this.stopPositionTracking();
    this.currentPosition = 0;
    this.currentBeat = 0;
    this.currentBar = 0;
    this.lastBeat = -1;

    this.notifyPositionUpdate();
    console.log('[Transport] Stopped');
  }

  /**
   * Start tracking position with animation frame.
   */
  private startPositionTracking(): void {
    const updatePosition = () => {
      if (!this.isPlaying || !this.audioContext) return;

      const elapsed = (this.audioContext.currentTime - this.startTime) * 1000;
      const loopElapsed = elapsed % this.loopLengthMs;

      // Normalized position (0-1)
      this.currentPosition = loopElapsed / this.loopLengthMs;

      // Calculate current beat and bar
      const msPerBeat = 60000 / this.bpm;
      const totalBeats = loopElapsed / msPerBeat;
      this.currentBeat = Math.floor(totalBeats) % (this.bars * this.beatsPerBar);
      this.currentBar = Math.floor(this.currentBeat / this.beatsPerBar);

      // Notify on beat change
      if (this.currentBeat !== this.lastBeat) {
        this.callbacks.onBeatChange?.(this.currentBeat, this.currentBar);

        // Check for loop boundary (beat 0)
        if (this.currentBeat === 0 && this.lastBeat > 0) {
          this.callbacks.onLoopBoundary?.();
        }

        this.lastBeat = this.currentBeat;
      }

      this.notifyPositionUpdate();

      this.animationFrameId = requestAnimationFrame(updatePosition);
    };

    this.animationFrameId = requestAnimationFrame(updatePosition);
  }

  /**
   * Stop position tracking.
   */
  private stopPositionTracking(): void {
    if (this.animationFrameId !== null) {
      cancelAnimationFrame(this.animationFrameId);
      this.animationFrameId = null;
    }
  }

  /**
   * Get time until next loop boundary.
   */
  getTimeToNextLoopBoundary(): number {
    if (!this.audioContext || !this.isPlaying) return 0;

    const elapsed = (this.audioContext.currentTime - this.startTime) * 1000;
    const loopElapsed = elapsed % this.loopLengthMs;
    return this.loopLengthMs - loopElapsed;
  }

  /**
   * Get the audioContext time of the next loop boundary.
   */
  getNextLoopBoundaryTime(): number {
    if (!this.audioContext) return 0;

    const timeToNext = this.getTimeToNextLoopBoundary();
    return this.audioContext.currentTime + (timeToNext / 1000);
  }

  /**
   * Get the next quantized time for a given subdivision.
   * @param subdivision - 16 = 16th notes, 8 = 8th notes, 4 = quarter notes, 1 = bar
   */
  getNextQuantizedTime(subdivision: number = 16): number {
    if (!this.audioContext) return 0;

    const now = this.audioContext.currentTime;
    const msPerBeat = 60000 / this.bpm;
    const msPerGrid = msPerBeat / (subdivision / 4);

    // Calculate elapsed time in loop
    const elapsed = (now - this.startTime) * 1000;
    const loopElapsed = this.isPlaying ? (elapsed % this.loopLengthMs) : 0;

    // Find next grid point
    const gridPosition = Math.ceil(loopElapsed / msPerGrid);
    const nextGridMs = gridPosition * msPerGrid;
    const timeToNext = nextGridMs - loopElapsed;

    return now + (timeToNext / 1000);
  }

  /**
   * Quantize a timestamp to the nearest grid point.
   * @param timestamp - Time in audioContext units
   * @param subdivision - Grid subdivision (16 = 16th notes)
   * @returns Quantized timestamp
   */
  quantize(timestamp: number, subdivision: number = 16): number {
    if (!this.audioContext) return timestamp;

    const msPerBeat = 60000 / this.bpm;
    const msPerGrid = msPerBeat / (subdivision / 4);

    // Convert to ms relative to loop start
    const elapsedMs = (timestamp - this.startTime) * 1000;
    const loopMs = this.isPlaying ? (elapsedMs % this.loopLengthMs) : elapsedMs;

    // Snap to nearest grid
    const gridIndex = Math.round(loopMs / msPerGrid);
    const quantizedMs = gridIndex * msPerGrid;

    // Convert back to audioContext time
    const loopStartTime = this.startTime + Math.floor(elapsedMs / this.loopLengthMs) * (this.loopLengthMs / 1000);
    return loopStartTime + (quantizedMs / 1000);
  }

  /**
   * Get current transport state.
   */
  getState(): TransportState {
    return {
      bpm: this.bpm,
      loopLengthMs: this.loopLengthMs,
      loopLengthSamples: this.loopLengthSamples,
      bars: this.bars,
      beatsPerBar: this.beatsPerBar,
      currentPosition: this.currentPosition,
      currentBeat: this.currentBeat,
      currentBar: this.currentBar,
      isPlaying: this.isPlaying,
    };
  }

  /**
   * Get BPM.
   */
  getBpm(): number {
    return this.bpm;
  }

  /**
   * Get loop length in milliseconds.
   */
  getLoopLengthMs(): number {
    return this.loopLengthMs;
  }

  /**
   * Get loop length in samples.
   */
  getLoopLengthSamples(): number {
    return this.loopLengthSamples;
  }

  /**
   * Check if transport has a loop defined.
   */
  hasLoop(): boolean {
    return this.loopLengthMs > 0;
  }

  /**
   * Check if transport is playing.
   */
  getIsPlaying(): boolean {
    return this.isPlaying;
  }

  /**
   * Notify position update callback.
   */
  private notifyPositionUpdate(): void {
    this.callbacks.onPositionUpdate?.(this.getState());
  }

  /**
   * Dispose resources.
   */
  dispose(): void {
    this.stop();
    this.audioContext = null;
    this.loopLengthMs = 0;
    this.loopLengthSamples = 0;
    this.bpm = 120;
    this.bars = 4;
  }
}

// Singleton instance
export const transportController = new TransportController();
