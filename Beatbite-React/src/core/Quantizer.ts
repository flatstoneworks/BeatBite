/**
 * Quantizer snaps drum and bass triggers to a beat grid.
 *
 * Real-time quantization approach:
 * - When trigger detected, calculate next grid point
 * - Delay trigger to that grid point (max delay = half a grid division)
 * - If closer to previous grid point, trigger immediately
 *
 * At 120 BPM: 1/16 note = 125ms, max quantization delay = 62.5ms
 */

import { transportController } from './TransportController';

export interface QuantizerConfig {
  subdivision: number;  // 16 = 16th notes, 8 = 8th notes, etc.
  enabled: boolean;
  strength: number;     // 0-1, how much to quantize (1 = full snap)
}

const DEFAULT_CONFIG: QuantizerConfig = {
  subdivision: 16,  // 1/16 notes
  enabled: true,
  strength: 1.0,
};

export class Quantizer {
  private audioContext: AudioContext | null = null;
  private config: QuantizerConfig = { ...DEFAULT_CONFIG };
  private pendingTriggers: Map<number, ReturnType<typeof setTimeout>> = new Map();
  private triggerIdCounter = 0;

  /**
   * Initialize with an audio context.
   */
  initialize(audioContext: AudioContext): void {
    this.audioContext = audioContext;
    console.log('[Quantizer] Initialized');
  }

  /**
   * Set quantization configuration.
   */
  setConfig(config: Partial<QuantizerConfig>): void {
    this.config = { ...this.config, ...config };
  }

  /**
   * Enable or disable quantization.
   */
  setEnabled(enabled: boolean): void {
    this.config.enabled = enabled;
  }

  /**
   * Set subdivision (16 = 16th notes, 8 = 8th notes, etc.).
   */
  setSubdivision(subdivision: number): void {
    this.config.subdivision = Math.max(1, Math.min(32, subdivision));
  }

  /**
   * Set quantization strength (0-1).
   * 0 = no quantization, 1 = full snap to grid
   */
  setStrength(strength: number): void {
    this.config.strength = Math.max(0, Math.min(1, strength));
  }

  /**
   * Schedule a quantized trigger.
   * The trigger function will be called at the next appropriate grid point.
   *
   * @param triggerFn - Function to call when triggering
   * @param inputTime - Current audioContext time (optional, uses current time if not provided)
   * @returns Scheduled time in audioContext units
   */
  scheduleQuantizedTrigger(triggerFn: () => void, inputTime?: number): number {
    if (!this.audioContext) {
      triggerFn();
      return 0;
    }

    const now = inputTime ?? this.audioContext.currentTime;

    // If quantization disabled, trigger immediately
    if (!this.config.enabled || this.config.strength === 0) {
      triggerFn();
      return now;
    }

    // If transport not playing, trigger immediately
    if (!transportController.getIsPlaying()) {
      triggerFn();
      return now;
    }

    // Calculate grid timing
    const bpm = transportController.getBpm();
    if (bpm <= 0) {
      triggerFn();
      return now;
    }

    const msPerBeat = 60000 / bpm;
    const msPerGrid = msPerBeat / (this.config.subdivision / 4);
    const maxDelayMs = msPerGrid / 2; // Max delay is half a grid division

    // Get current position in the loop
    const transportState = transportController.getState();
    const loopPositionMs = transportState.currentPosition * transportState.loopLengthMs;

    // Find nearest grid point
    const currentGridIndex = loopPositionMs / msPerGrid;
    const prevGridMs = Math.floor(currentGridIndex) * msPerGrid;
    const nextGridMs = Math.ceil(currentGridIndex) * msPerGrid;

    // Distance to previous and next grid points
    const distToPrev = loopPositionMs - prevGridMs;
    const distToNext = nextGridMs - loopPositionMs;

    let delayMs: number;

    if (distToNext <= maxDelayMs) {
      // Snap forward to next grid point
      delayMs = distToNext * this.config.strength;
    } else if (distToPrev <= maxDelayMs) {
      // We're close to previous grid, trigger immediately
      // (can't go back in time, so just trigger now)
      delayMs = 0;
    } else {
      // Too far from both, trigger immediately
      delayMs = 0;
    }

    // Apply strength - partial quantization
    delayMs *= this.config.strength;

    const scheduledTime = now + (delayMs / 1000);

    if (delayMs > 0) {
      // Schedule the trigger
      const triggerId = this.triggerIdCounter++;
      const timeoutId = setTimeout(() => {
        triggerFn();
        this.pendingTriggers.delete(triggerId);
      }, delayMs);

      this.pendingTriggers.set(triggerId, timeoutId);
    } else {
      // Trigger immediately
      triggerFn();
    }

    return scheduledTime;
  }

  /**
   * Cancel all pending triggers.
   */
  cancelAllPending(): void {
    for (const timeoutId of this.pendingTriggers.values()) {
      clearTimeout(timeoutId);
    }
    this.pendingTriggers.clear();
  }

  /**
   * Get the grid interval in milliseconds.
   */
  getGridIntervalMs(): number {
    const bpm = transportController.getBpm();
    if (bpm <= 0) return 0;

    const msPerBeat = 60000 / bpm;
    return msPerBeat / (this.config.subdivision / 4);
  }

  /**
   * Get current configuration.
   */
  getConfig(): QuantizerConfig {
    return { ...this.config };
  }

  /**
   * Check if quantization is enabled.
   */
  isEnabled(): boolean {
    return this.config.enabled;
  }

  /**
   * Dispose resources.
   */
  dispose(): void {
    this.cancelAllPending();
    this.audioContext = null;
  }
}

// Singleton instance
export const quantizer = new Quantizer();
