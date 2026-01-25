/**
 * BpmDetector analyzes audio to detect tempo (BPM).
 *
 * Algorithm: Onset Detection + Autocorrelation
 * 1. Compute amplitude envelope (10ms windows)
 * 2. Detect onset peaks (transients)
 * 3. Autocorrelate onset intervals to find periodic patterns
 * 4. Map dominant interval to BPM (60-200 range)
 * 5. Fallback: assume 4 bars, calculate BPM from duration
 */

import type { BpmResult } from '../types';

// BPM detection range
const MIN_BPM = 60;
const MAX_BPM = 200;

// Analysis parameters
const HOP_SIZE_MS = 10;  // Window hop size in ms
const ONSET_THRESHOLD_MULTIPLIER = 1.5;  // Peak detection sensitivity

export class BpmDetector {
  /**
   * Detect BPM from an AudioBuffer.
   */
  detectFromBuffer(buffer: AudioBuffer): BpmResult {
    const samples = buffer.getChannelData(0);
    const sampleRate = buffer.sampleRate;
    const durationMs = buffer.duration * 1000;

    // Step 1: Compute onset envelope
    const envelope = this.computeOnsetEnvelope(samples, sampleRate);

    // Step 2: Detect onset peaks
    const threshold = this.computeAdaptiveThreshold(envelope);
    const onsets = this.detectOnsets(envelope, threshold, sampleRate);

    // Step 3: Autocorrelate to find tempo
    const candidates = this.autocorrelateOnsets(onsets, durationMs);

    // Step 4: Select best BPM
    if (candidates.length > 0 && candidates[0].confidence > 3) {
      const bestCandidate = candidates[0];
      const bars = this.inferBars(durationMs, bestCandidate.bpm);

      return {
        bpm: bestCandidate.bpm,
        confidence: Math.min(bestCandidate.confidence / 20, 1),
        bars,
        beatsDetected: onsets,
      };
    }

    // Fallback: estimate from duration assuming 4 or 8 bars
    return this.fallbackDetection(durationMs);
  }

  /**
   * Compute onset envelope using spectral flux approximation.
   * Returns array of energy values at HOP_SIZE_MS intervals.
   */
  private computeOnsetEnvelope(samples: Float32Array, sampleRate: number): Float32Array {
    const hopSamples = Math.floor(sampleRate * HOP_SIZE_MS / 1000);
    const frameSamples = hopSamples * 4;
    const numFrames = Math.floor(samples.length / hopSamples);
    const envelope = new Float32Array(numFrames);

    let prevEnergy = 0;

    for (let i = 0; i < numFrames; i++) {
      const start = i * hopSamples;
      const end = Math.min(start + frameSamples, samples.length);

      // Calculate RMS energy
      let energy = 0;
      for (let j = start; j < end; j++) {
        energy += samples[j] * samples[j];
      }
      energy = Math.sqrt(energy / (end - start));

      // Spectral flux: positive change in energy (onset indicator)
      const flux = Math.max(0, energy - prevEnergy);
      envelope[i] = flux;

      prevEnergy = energy;
    }

    return envelope;
  }

  /**
   * Compute adaptive threshold based on envelope statistics.
   */
  private computeAdaptiveThreshold(envelope: Float32Array): number {
    // Calculate mean and standard deviation
    let sum = 0;
    for (let i = 0; i < envelope.length; i++) {
      sum += envelope[i];
    }
    const mean = sum / envelope.length;

    let variance = 0;
    for (let i = 0; i < envelope.length; i++) {
      variance += (envelope[i] - mean) * (envelope[i] - mean);
    }
    const stdDev = Math.sqrt(variance / envelope.length);

    // Threshold is mean + multiplier * stdDev
    return mean + ONSET_THRESHOLD_MULTIPLIER * stdDev;
  }

  /**
   * Detect onset peaks in the envelope.
   * Returns array of onset times in milliseconds.
   */
  private detectOnsets(
    envelope: Float32Array,
    threshold: number,
    _sampleRate: number
  ): number[] {
    const onsets: number[] = [];
    const minIntervalFrames = 5; // Minimum frames between onsets (~50ms)

    let lastOnsetFrame = -minIntervalFrames;

    for (let i = 1; i < envelope.length - 1; i++) {
      // Check if this is a local maximum above threshold
      if (
        envelope[i] > envelope[i - 1] &&
        envelope[i] >= envelope[i + 1] &&
        envelope[i] > threshold &&
        i - lastOnsetFrame >= minIntervalFrames
      ) {
        const timeMs = i * HOP_SIZE_MS;
        onsets.push(timeMs);
        lastOnsetFrame = i;
      }
    }

    return onsets;
  }

  /**
   * Autocorrelate onset times to find dominant tempo.
   * Returns array of BPM candidates sorted by confidence.
   */
  private autocorrelateOnsets(
    onsets: number[],
    _durationMs: number
  ): { bpm: number; confidence: number }[] {
    if (onsets.length < 4) {
      return [];
    }

    // Count interval occurrences (histogram)
    const intervalCounts = new Map<number, number>();

    // Look at all pairs of onsets
    for (let i = 0; i < onsets.length; i++) {
      for (let j = i + 1; j < Math.min(i + 16, onsets.length); j++) {
        const intervalMs = onsets[j] - onsets[i];

        // Convert to BPM (interval is between beats)
        // Try different beat subdivisions
        for (const divisor of [1, 2, 4]) {
          const bpm = (60000 * divisor) / intervalMs;

          if (bpm >= MIN_BPM && bpm <= MAX_BPM) {
            // Round to nearest integer BPM
            const roundedBpm = Math.round(bpm);
            intervalCounts.set(
              roundedBpm,
              (intervalCounts.get(roundedBpm) || 0) + 1
            );
          }
        }
      }
    }

    // Convert to sorted array
    const candidates = Array.from(intervalCounts.entries())
      .map(([bpm, count]) => ({ bpm, confidence: count }))
      .sort((a, b) => b.confidence - a.confidence);

    // Merge similar BPMs (within 2 BPM)
    const merged: { bpm: number; confidence: number }[] = [];
    for (const candidate of candidates) {
      const existing = merged.find(m => Math.abs(m.bpm - candidate.bpm) <= 2);
      if (existing) {
        existing.confidence += candidate.confidence;
        // Weighted average BPM
        existing.bpm = Math.round(
          (existing.bpm * (existing.confidence - candidate.confidence) +
            candidate.bpm * candidate.confidence) /
            existing.confidence
        );
      } else {
        merged.push({ ...candidate });
      }
    }

    return merged.sort((a, b) => b.confidence - a.confidence);
  }

  /**
   * Infer number of bars from duration and BPM.
   */
  private inferBars(durationMs: number, bpm: number): number {
    const msPerBeat = 60000 / bpm;
    const totalBeats = durationMs / msPerBeat;
    const bars = totalBeats / 4; // Assuming 4/4 time

    // Round to nearest power of 2 (common bar counts: 1, 2, 4, 8, 16)
    const possibleBars = [1, 2, 4, 8, 16];
    let closestBars = 4;
    let minDiff = Infinity;

    for (const b of possibleBars) {
      const diff = Math.abs(bars - b);
      if (diff < minDiff) {
        minDiff = diff;
        closestBars = b;
      }
    }

    return closestBars;
  }

  /**
   * Fallback detection when onset detection fails.
   * Assumes recording is 4 or 8 bars.
   */
  private fallbackDetection(durationMs: number): BpmResult {
    // Try 4 bars
    const bpm4bars = (4 * 4 * 60000) / durationMs; // 4 bars × 4 beats × ms/min

    // Try 8 bars
    const bpm8bars = (8 * 4 * 60000) / durationMs;

    let bpm: number;
    let bars: number;

    // Prefer BPM in 80-160 range (common tempo range)
    if (bpm4bars >= 80 && bpm4bars <= 160) {
      bpm = Math.round(bpm4bars);
      bars = 4;
    } else if (bpm8bars >= 80 && bpm8bars <= 160) {
      bpm = Math.round(bpm8bars);
      bars = 8;
    } else if (bpm4bars >= MIN_BPM && bpm4bars <= MAX_BPM) {
      bpm = Math.round(bpm4bars);
      bars = 4;
    } else if (bpm8bars >= MIN_BPM && bpm8bars <= MAX_BPM) {
      bpm = Math.round(bpm8bars);
      bars = 8;
    } else {
      // Default to 120 BPM
      bpm = 120;
      bars = Math.round((durationMs * bpm) / (4 * 60000));
      if (bars < 1) bars = 1;
    }

    console.log(`[BpmDetector] Fallback: ${bpm} BPM, ${bars} bars`);

    return {
      bpm,
      confidence: 0.3, // Low confidence for fallback
      bars,
      beatsDetected: [],
    };
  }
}

// Singleton instance
export const bpmDetector = new BpmDetector();
