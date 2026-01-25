/**
 * VoiceOnsetDetector detects the start (onset) and end (offset) of vocal sounds.
 *
 * Unlike continuous pitch tracking, this enables one-to-one mapping:
 * - Detects when voice STARTS (onset - amplitude crosses threshold going up)
 * - Captures the pitch at that moment
 * - Detects when voice ENDS (offset - amplitude drops below threshold)
 * - Reports the note with duration
 *
 * This is the key component for the new recording system where:
 * ONE vocal sound = ONE instrument hit
 */

import type { VoiceOnsetResult } from '../types';
import { pitchDetector } from './PitchDetector';

export interface VoiceOnsetDetectorCallbacks {
  onOnset?: (result: VoiceOnsetResult) => void;
  onOffset?: (result: VoiceOnsetResult) => void;
}

export interface VoiceOnsetDetectorConfig {
  onsetThreshold: number;    // RMS level to trigger onset (default 0.03)
  offsetThreshold: number;   // RMS level to trigger offset (default 0.015) - hysteresis
  minDuration: number;       // Minimum note duration in ms (default 50)
  minOnsetInterval: number;  // Minimum time between onsets in ms (default 100)
  confidenceThreshold: number; // Minimum pitch confidence (default 0.6)
}

const DEFAULT_CONFIG: VoiceOnsetDetectorConfig = {
  onsetThreshold: 0.03,
  offsetThreshold: 0.015,
  minDuration: 50,
  minOnsetInterval: 100,
  confidenceThreshold: 0.6,
};

type DetectorState = 'silent' | 'sustaining';

export class VoiceOnsetDetector {
  private analyser: AnalyserNode | null = null;
  // Use explicit type to avoid TypeScript generic issues with ArrayBufferLike
  private analyserBuffer: Float32Array<ArrayBuffer> | null = null;

  // State machine
  private state: DetectorState = 'silent';

  // Configuration
  private config: VoiceOnsetDetectorConfig = { ...DEFAULT_CONFIG };

  // Current note data (captured at onset)
  private onsetTime = 0;
  private onsetFrequency = 0;
  private onsetNoteName = '';
  private onsetVelocity = 0;

  // Timing
  private lastOnsetTime = 0;

  // Callbacks
  private callbacks: VoiceOnsetDetectorCallbacks = {};

  // Analysis state
  private isAnalyzing = false;
  private animationFrameId: number | null = null;

  // RMS smoothing
  private rmsHistory: number[] = [];
  private readonly RMS_HISTORY_SIZE = 5;

  /**
   * Initialize the detector with an analyser node.
   */
  initialize(analyser: AnalyserNode): void {
    this.analyser = analyser;
    // Create buffer with explicit ArrayBuffer for type compatibility
    const buffer = new ArrayBuffer(analyser.fftSize * 4); // 4 bytes per float32
    this.analyserBuffer = new Float32Array(buffer);
    this.rmsHistory = [];

    console.log('[VoiceOnsetDetector] Initialized');
  }

  /**
   * Set callbacks for onset/offset events.
   */
  setCallbacks(callbacks: VoiceOnsetDetectorCallbacks): void {
    this.callbacks = callbacks;
  }

  /**
   * Configure detection thresholds.
   */
  setConfig(config: Partial<VoiceOnsetDetectorConfig>): void {
    this.config = { ...this.config, ...config };
  }

  /**
   * Start the analysis loop.
   */
  start(): void {
    if (this.isAnalyzing) return;
    this.isAnalyzing = true;
    this.state = 'silent';
    this.rmsHistory = [];
    this.startAnalysisLoop();
    console.log('[VoiceOnsetDetector] Started');
  }

  /**
   * Stop the analysis loop.
   */
  stop(): void {
    if (!this.isAnalyzing) return;
    this.isAnalyzing = false;
    this.stopAnalysisLoop();

    // Force offset if we were sustaining
    if (this.state === 'sustaining') {
      this.handleOffset();
    }

    this.state = 'silent';
    console.log('[VoiceOnsetDetector] Stopped');
  }

  /**
   * Process one analysis frame.
   * Called internally by the animation loop, or can be called manually.
   */
  analyze(): VoiceOnsetResult | null {
    if (!this.analyser || !this.analyserBuffer) return null;

    // Get time domain data
    this.analyser.getFloatTimeDomainData(this.analyserBuffer);

    // Calculate RMS (root mean square) for amplitude
    const rms = this.calculateRms(this.analyserBuffer);

    // Smooth RMS with history
    const smoothedRms = this.smoothRms(rms);

    // Get pitch if above threshold
    let frequency = 0;
    let noteName = '';

    if (smoothedRms > this.config.offsetThreshold) {
      // Cast buffer to satisfy TypeScript (same underlying data)
      const pitchResult = pitchDetector.detect(this.analyserBuffer as Float32Array);
      if (pitchResult && pitchResult.confidence >= this.config.confidenceThreshold) {
        frequency = pitchResult.frequency;
        noteName = pitchResult.note;
      }
    }

    // State machine transitions
    const now = performance.now();

    if (this.state === 'silent') {
      // Check for onset
      if (
        smoothedRms >= this.config.onsetThreshold &&
        frequency > 0 &&
        now - this.lastOnsetTime >= this.config.minOnsetInterval
      ) {
        return this.handleOnset(frequency, noteName, smoothedRms, now);
      }
    } else if (this.state === 'sustaining') {
      // Check for offset
      if (smoothedRms < this.config.offsetThreshold) {
        return this.handleOffset();
      }
    }

    return null;
  }

  /**
   * Handle voice onset - transition to sustaining state.
   */
  private handleOnset(
    frequency: number,
    noteName: string,
    rms: number,
    timestamp: number
  ): VoiceOnsetResult {
    this.state = 'sustaining';
    this.onsetTime = timestamp;
    this.onsetFrequency = frequency;
    this.onsetNoteName = noteName;
    this.onsetVelocity = Math.min(1, rms / 0.1); // Normalize velocity
    this.lastOnsetTime = timestamp;

    const result: VoiceOnsetResult = {
      type: 'onset',
      frequency: this.onsetFrequency,
      noteName: this.onsetNoteName,
      velocity: this.onsetVelocity,
      timestamp,
    };

    this.callbacks.onOnset?.(result);
    console.log(
      `[VoiceOnsetDetector] ONSET: ${noteName} (${frequency.toFixed(1)}Hz) vel=${this.onsetVelocity.toFixed(2)}`
    );

    return result;
  }

  /**
   * Handle voice offset - transition to silent state.
   */
  private handleOffset(): VoiceOnsetResult {
    const now = performance.now();
    const duration = now - this.onsetTime;

    // Only report if above minimum duration
    if (duration < this.config.minDuration) {
      this.state = 'silent';
      return {
        type: 'offset',
        frequency: 0,
        noteName: '',
        velocity: 0,
        timestamp: now,
        duration: 0,
      };
    }

    const result: VoiceOnsetResult = {
      type: 'offset',
      frequency: this.onsetFrequency,
      noteName: this.onsetNoteName,
      velocity: this.onsetVelocity,
      timestamp: now,
      duration,
    };

    this.state = 'silent';
    this.callbacks.onOffset?.(result);
    console.log(
      `[VoiceOnsetDetector] OFFSET: ${this.onsetNoteName} duration=${duration.toFixed(0)}ms`
    );

    return result;
  }

  /**
   * Force note off - used when stopping recording.
   * Returns the offset result if we were sustaining.
   */
  forceOffset(): VoiceOnsetResult | null {
    if (this.state !== 'sustaining') return null;
    return this.handleOffset();
  }

  /**
   * Get current detector state.
   */
  getState(): DetectorState {
    return this.state;
  }

  /**
   * Check if currently in sustaining state (note is being held).
   */
  isSustaining(): boolean {
    return this.state === 'sustaining';
  }

  /**
   * Get current note info if sustaining.
   */
  getCurrentNote(): { frequency: number; noteName: string } | null {
    if (this.state !== 'sustaining') return null;
    return {
      frequency: this.onsetFrequency,
      noteName: this.onsetNoteName,
    };
  }

  /**
   * Calculate RMS from audio buffer.
   */
  private calculateRms(buffer: Float32Array): number {
    let sum = 0;
    for (let i = 0; i < buffer.length; i++) {
      sum += buffer[i] * buffer[i];
    }
    return Math.sqrt(sum / buffer.length);
  }

  /**
   * Smooth RMS with moving average.
   */
  private smoothRms(rms: number): number {
    this.rmsHistory.push(rms);
    if (this.rmsHistory.length > this.RMS_HISTORY_SIZE) {
      this.rmsHistory.shift();
    }

    const sum = this.rmsHistory.reduce((a, b) => a + b, 0);
    return sum / this.rmsHistory.length;
  }

  /**
   * Start the internal analysis loop.
   */
  private startAnalysisLoop(): void {
    const loop = () => {
      if (!this.isAnalyzing) return;
      this.analyze();
      this.animationFrameId = requestAnimationFrame(loop);
    };
    this.animationFrameId = requestAnimationFrame(loop);
  }

  /**
   * Stop the internal analysis loop.
   */
  private stopAnalysisLoop(): void {
    if (this.animationFrameId !== null) {
      cancelAnimationFrame(this.animationFrameId);
      this.animationFrameId = null;
    }
  }

  /**
   * Reset detector state.
   */
  reset(): void {
    this.stop();
    this.state = 'silent';
    this.onsetTime = 0;
    this.onsetFrequency = 0;
    this.onsetNoteName = '';
    this.onsetVelocity = 0;
    this.lastOnsetTime = 0;
    this.rmsHistory = [];
  }
}

// Singleton instance
export const voiceOnsetDetector = new VoiceOnsetDetector();
