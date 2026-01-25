/**
 * LoopQuantizer quantizes recording durations to multiples of 4 bars.
 *
 * When the user presses STOP during drum recording, the raw duration
 * is quantized to the nearest 4-bar boundary. This ensures:
 * - Loop length is always musically coherent
 * - Subsequent layers can loop cleanly
 * - Minimum loop is 4 bars (prevents too-short loops)
 *
 * Example at 120 BPM (4/4 time):
 * - 1 beat = 500ms
 * - 1 bar = 2000ms (4 beats)
 * - 4 bars = 8000ms (minimum loop)
 *
 * If user records 25000ms:
 * - Nearest 4-bar multiple: 24000ms (12 bars = 3 × 4 bars)
 */

import type { QuantizedLoopResult } from '../types';

export class LoopQuantizer {
  /**
   * Quantize a raw recording duration to the nearest 4-bar boundary.
   *
   * @param durationMs - Raw recording duration in milliseconds
   * @param bpm - Tempo in beats per minute
   * @param beatsPerBar - Beats per bar (default 4 for 4/4 time)
   * @returns Quantized loop info with adjusted duration and bar count
   */
  quantize(
    durationMs: number,
    bpm: number,
    beatsPerBar: number = 4
  ): QuantizedLoopResult {
    // Calculate timing values
    const msPerBeat = 60000 / bpm;
    const msPerBar = msPerBeat * beatsPerBar;
    const msPer4Bars = msPerBar * 4;

    // Calculate nearest 4-bar multiple (minimum 1 block = 4 bars)
    const num4BarBlocks = Math.max(1, Math.round(durationMs / msPer4Bars));
    const quantizedBars = num4BarBlocks * 4;
    const quantizedDurationMs = quantizedBars * msPerBar;

    console.log(
      `[LoopQuantizer] ${durationMs.toFixed(0)}ms → ${quantizedDurationMs.toFixed(0)}ms (${quantizedBars} bars @ ${bpm} BPM)`
    );

    return {
      originalDurationMs: durationMs,
      quantizedDurationMs,
      bars: quantizedBars,
      bpm,
    };
  }

  /**
   * Quantize to minimum 4-bar boundary, rounding up if past halfway.
   * This is a stricter version that always rounds to the nearest boundary.
   */
  quantizeStrict(
    durationMs: number,
    bpm: number,
    beatsPerBar: number = 4
  ): QuantizedLoopResult {
    const msPerBeat = 60000 / bpm;
    const msPerBar = msPerBeat * beatsPerBar;
    const msPer4Bars = msPerBar * 4;

    // Round to nearest (not floor/ceil)
    const num4BarBlocks = Math.max(1, Math.round(durationMs / msPer4Bars));
    const quantizedBars = num4BarBlocks * 4;
    const quantizedDurationMs = quantizedBars * msPerBar;

    return {
      originalDurationMs: durationMs,
      quantizedDurationMs,
      bars: quantizedBars,
      bpm,
    };
  }

  /**
   * Get minimum recording duration (4 bars at given BPM).
   */
  getMinimumDuration(bpm: number, beatsPerBar: number = 4): number {
    const msPerBeat = 60000 / bpm;
    return msPerBeat * beatsPerBar * 4;
  }

  /**
   * Get duration for a specific number of bars.
   */
  getBarsDuration(bars: number, bpm: number, beatsPerBar: number = 4): number {
    const msPerBeat = 60000 / bpm;
    return msPerBeat * beatsPerBar * bars;
  }

  /**
   * Calculate how many bars fit in a given duration.
   */
  getBarsFromDuration(
    durationMs: number,
    bpm: number,
    beatsPerBar: number = 4
  ): number {
    const msPerBeat = 60000 / bpm;
    const msPerBar = msPerBeat * beatsPerBar;
    return Math.round(durationMs / msPerBar);
  }

  /**
   * Get the time remaining until the next 4-bar boundary.
   * Useful for showing a countdown before recording stops.
   */
  getTimeToNextBoundary(
    elapsedMs: number,
    bpm: number,
    beatsPerBar: number = 4
  ): number {
    const msPerBeat = 60000 / bpm;
    const msPerBar = msPerBeat * beatsPerBar;
    const msPer4Bars = msPerBar * 4;

    // How far into the current 4-bar block?
    const positionIn4Bars = elapsedMs % msPer4Bars;

    // Time remaining in current 4-bar block
    return msPer4Bars - positionIn4Bars;
  }

  /**
   * Check if the current elapsed time is near a 4-bar boundary.
   * Useful for UI feedback.
   */
  isNearBoundary(
    elapsedMs: number,
    bpm: number,
    toleranceMs: number = 500,
    beatsPerBar: number = 4
  ): boolean {
    const timeToNext = this.getTimeToNextBoundary(elapsedMs, bpm, beatsPerBar);
    const msPerBeat = 60000 / bpm;
    const msPer4Bars = msPerBeat * beatsPerBar * 4;

    // Near the end of a 4-bar block
    return timeToNext <= toleranceMs || timeToNext >= msPer4Bars - toleranceMs;
  }

  /**
   * Format duration as bars + beats for display.
   * Example: "12 bars + 2 beats"
   */
  formatDuration(
    durationMs: number,
    bpm: number,
    beatsPerBar: number = 4
  ): string {
    const msPerBeat = 60000 / bpm;
    const totalBeats = durationMs / msPerBeat;
    const bars = Math.floor(totalBeats / beatsPerBar);
    const beats = Math.round(totalBeats % beatsPerBar);

    if (beats === 0) {
      return `${bars} bar${bars !== 1 ? 's' : ''}`;
    }
    return `${bars} bar${bars !== 1 ? 's' : ''} + ${beats} beat${beats !== 1 ? 's' : ''}`;
  }
}

// Singleton instance
export const loopQuantizer = new LoopQuantizer();
