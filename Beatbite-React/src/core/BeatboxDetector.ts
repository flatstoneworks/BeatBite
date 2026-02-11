/**
 * BeatboxDetector detects beatbox sounds using spectral and transient analysis.
 *
 * Unlike pitch-based detection, this uses frequency band energy analysis
 * to detect percussive sounds:
 * - Kick: Low frequency "boom" (50-150 Hz) with quick transient
 * - Snare: Mid/high noise with sharp attack ("psh", "kah") (150-2000 Hz)
 * - Hi-hat closed: High frequency noise, short ("ts") (2000-8000 Hz)
 * - Hi-hat open: High frequency noise, longer ("tss") (2000-8000 Hz)
 *
 * Detection is based on:
 * 1. Spectral centroid (brightness of sound)
 * 2. Energy in frequency bands (low/mid/high)
 * 3. Transient detection (attack sharpness)
 * 4. Onset detection (when a new sound starts)
 */

import type { BeatboxDrumType, BeatboxDetectionResult } from '../types';
import { logger } from './utils/logger';

// Frequency band definitions (Hz)
const BANDS = {
  low: { min: 50, max: 150 },      // Kick drum range
  mid: { min: 150, max: 2000 },    // Snare body range
  high: { min: 2000, max: 8000 },  // Hi-hat range
} as const;

// Detection thresholds
const THRESHOLDS = {
  onsetThreshold: 0.008,          // Minimum energy for onset detection (very sensitive)
  kickLowRatio: 0.35,             // Low band must be this ratio of total for kick
  snareMidRatio: 0.2,             // Mid band ratio for snare
  hihatHighRatio: 0.35,           // High band ratio for hi-hat
  transientSteepness: 0.8,        // How fast energy must rise for transient (very sensitive)
  minConfidence: 0.2,             // Minimum confidence to report detection
} as const;

export interface BeatboxDetectorCallbacks {
  onDrumDetected?: (result: BeatboxDetectionResult) => void;
}

export class BeatboxDetector {
  private audioContext: AudioContext | null = null;
  private analyser: AnalyserNode | null = null;
  private fftSize = 2048;
  private frequencyData: Float32Array | null = null;
  private previousEnergy = 0;
  private smoothedEnergy = 0;
  private callbacks: BeatboxDetectorCallbacks = {};
  private enabled = true;

  // State for onset detection
  private isInOnset = false;
  private onsetPeakEnergy = 0;
  private lastDetectionTime = 0;
  private minDetectionInterval = 1000; // ms between detections (1 second for testing)

  // Running statistics for adaptive thresholds
  private energyHistory: number[] = [];
  private historyMaxLength = 50;

  /**
   * Initialize the detector with an audio context.
   */
  initialize(audioContext: AudioContext): AnalyserNode {
    this.audioContext = audioContext;

    // Create analyser for FFT
    this.analyser = audioContext.createAnalyser();
    this.analyser.fftSize = this.fftSize;
    this.analyser.smoothingTimeConstant = 0.3;

    // Allocate frequency data buffer
    this.frequencyData = new Float32Array(this.analyser.frequencyBinCount);

    logger.info('[BeatboxDetector] Initialized');
    return this.analyser;
  }

  /**
   * Set callbacks for detection events.
   */
  setCallbacks(callbacks: BeatboxDetectorCallbacks): void {
    this.callbacks = callbacks;
  }

  /**
   * Enable or disable beatbox detection.
   * When disabled, analyze() returns no detection.
   */
  setEnabled(enabled: boolean): void {
    this.enabled = enabled;
    logger.debug(`[BeatboxDetector] ${enabled ? 'Enabled' : 'Disabled'}`);
  }

  /**
   * Check if detection is enabled.
   */
  isEnabled(): boolean {
    return this.enabled;
  }

  /**
   * Connect an audio source to the detector.
   */
  connectSource(source: AudioNode): void {
    if (this.analyser) {
      source.connect(this.analyser);
    }
  }

  /**
   * Disconnect the source from the detector.
   */
  disconnectSource(source: AudioNode): void {
    if (this.analyser) {
      try {
        source.disconnect(this.analyser);
      } catch {
        // Ignore if not connected
      }
    }
  }

  /**
   * Analyze current audio and detect drum sounds.
   * Call this regularly (e.g., in an animation frame or audio worklet).
   */
  analyze(): BeatboxDetectionResult {
    if (!this.enabled || !this.analyser || !this.frequencyData || !this.audioContext) {
      return { drumType: null, velocity: 0, confidence: 0 };
    }

    const now = performance.now();

    // Get frequency data
    this.analyser.getFloatFrequencyData(this.frequencyData as Float32Array<ArrayBuffer>);

    // Calculate energy in each band
    const bandEnergies = this.calculateBandEnergies();
    const totalEnergy = bandEnergies.low + bandEnergies.mid + bandEnergies.high;

    // Update energy history for adaptive thresholds
    this.updateEnergyHistory(totalEnergy);

    // Check for rate limiting - completely ignore everything during cooldown
    if (now - this.lastDetectionTime < this.minDetectionInterval) {
      // Reset onset state during cooldown to prevent carryover
      this.isInOnset = false;
      this.onsetPeakEnergy = 0;
      return { drumType: null, velocity: 0, confidence: 0 };
    }

    // Detect onset (transient)
    const energyDerivative = totalEnergy - this.previousEnergy;
    const isTransient = energyDerivative > THRESHOLDS.transientSteepness * this.getAdaptiveThreshold();

    // Update state
    this.smoothedEnergy = this.smoothedEnergy * 0.7 + totalEnergy * 0.3;
    this.previousEnergy = totalEnergy;

    // No detection if below onset threshold
    if (totalEnergy < THRESHOLDS.onsetThreshold) {
      this.isInOnset = false;
      return { drumType: null, velocity: 0, confidence: 0 };
    }

    // Track onset - only start a new onset if we're not in rate-limiting cooldown
    if (isTransient && !this.isInOnset && (now - this.lastDetectionTime >= this.minDetectionInterval)) {
      this.isInOnset = true;
      this.onsetPeakEnergy = totalEnergy;
    } else if (this.isInOnset) {
      this.onsetPeakEnergy = Math.max(this.onsetPeakEnergy, totalEnergy);

      // Check if onset has peaked (energy starting to decay significantly)
      // Using 0.5 instead of 0.7 to require more decay before triggering
      if (totalEnergy < this.onsetPeakEnergy * 0.5) {
        const result = this.classifyDrum(bandEnergies, this.onsetPeakEnergy);

        if (result.confidence >= THRESHOLDS.minConfidence) {
          this.lastDetectionTime = now;
          this.isInOnset = false;
          // Reset energy tracking to prevent immediate re-trigger
          this.previousEnergy = 0;
          this.onsetPeakEnergy = 0;
          this.callbacks.onDrumDetected?.(result);
          return result;
        }

        this.isInOnset = false;
        this.onsetPeakEnergy = 0;
      }
    }

    return { drumType: null, velocity: 0, confidence: 0 };
  }

  /**
   * Calculate energy in each frequency band.
   */
  private calculateBandEnergies(): { low: number; mid: number; high: number } {
    if (!this.audioContext || !this.analyser || !this.frequencyData) {
      return { low: 0, mid: 0, high: 0 };
    }

    const sampleRate = this.audioContext.sampleRate;
    const binCount = this.analyser.frequencyBinCount;
    const binSize = sampleRate / (binCount * 2); // Hz per bin

    let lowEnergy = 0;
    let midEnergy = 0;
    let highEnergy = 0;
    let lowCount = 0;
    let midCount = 0;
    let highCount = 0;

    for (let i = 0; i < binCount; i++) {
      const frequency = i * binSize;
      // Convert from dB to linear (frequencyData is in dB)
      const amplitude = Math.pow(10, this.frequencyData[i] / 20);

      if (frequency >= BANDS.low.min && frequency < BANDS.low.max) {
        lowEnergy += amplitude;
        lowCount++;
      } else if (frequency >= BANDS.mid.min && frequency < BANDS.mid.max) {
        midEnergy += amplitude;
        midCount++;
      } else if (frequency >= BANDS.high.min && frequency < BANDS.high.max) {
        highEnergy += amplitude;
        highCount++;
      }
    }

    // Normalize by number of bins in each band
    return {
      low: lowCount > 0 ? lowEnergy / lowCount : 0,
      mid: midCount > 0 ? midEnergy / midCount : 0,
      high: highCount > 0 ? highEnergy / highCount : 0,
    };
  }

  /**
   * Classify the detected sound as a drum type.
   */
  private classifyDrum(
    bandEnergies: { low: number; mid: number; high: number },
    totalEnergy: number
  ): BeatboxDetectionResult {
    const { low, mid, high } = bandEnergies;

    // Calculate ratios
    const lowRatio = totalEnergy > 0 ? low / totalEnergy : 0;
    const midRatio = totalEnergy > 0 ? mid / totalEnergy : 0;
    const highRatio = totalEnergy > 0 ? high / totalEnergy : 0;

    // Velocity is based on peak energy normalized to typical range
    const velocity = Math.min(1, totalEnergy / 0.5);

    // Classification logic
    let drumType: BeatboxDrumType | null = null;
    let confidence = 0;

    // Kick: Dominant low frequency
    if (lowRatio >= THRESHOLDS.kickLowRatio && lowRatio > highRatio) {
      drumType = 'kick';
      confidence = lowRatio;
    }
    // Hi-hat: Dominant high frequency
    else if (highRatio >= THRESHOLDS.hihatHighRatio && highRatio > lowRatio) {
      // Distinguish closed vs open based on duration would require tracking
      // For now, default to closed hi-hat
      drumType = 'hihat_closed';
      confidence = highRatio;
    }
    // Snare: Strong mid with some high
    else if (midRatio >= THRESHOLDS.snareMidRatio && mid > low) {
      drumType = 'snare';
      confidence = midRatio + highRatio * 0.3;
    }
    // Default to snare for ambiguous sounds with transient
    else if (totalEnergy > THRESHOLDS.onsetThreshold * 2) {
      drumType = 'snare';
      confidence = 0.4;
    }

    // Clamp confidence
    confidence = Math.min(1, confidence);

    return { drumType, velocity, confidence };
  }

  /**
   * Update energy history for adaptive thresholds.
   */
  private updateEnergyHistory(energy: number): void {
    this.energyHistory.push(energy);
    if (this.energyHistory.length > this.historyMaxLength) {
      this.energyHistory.shift();
    }
  }

  /**
   * Get adaptive threshold based on recent energy levels.
   */
  private getAdaptiveThreshold(): number {
    if (this.energyHistory.length === 0) {
      return THRESHOLDS.onsetThreshold;
    }

    // Use average of recent energies as baseline
    const avgEnergy = this.energyHistory.reduce((a, b) => a + b, 0) / this.energyHistory.length;
    return Math.max(THRESHOLDS.onsetThreshold, avgEnergy * 0.5);
  }

  /**
   * Get the analyser node for external use.
   */
  getAnalyser(): AnalyserNode | null {
    return this.analyser;
  }

  /**
   * Set minimum detection interval.
   */
  setMinDetectionInterval(ms: number): void {
    this.minDetectionInterval = Math.max(30, ms);
  }

  /**
   * Reset detection state.
   */
  reset(): void {
    this.previousEnergy = 0;
    this.smoothedEnergy = 0;
    this.isInOnset = false;
    this.onsetPeakEnergy = 0;
    this.lastDetectionTime = 0;
    this.energyHistory = [];
  }

  /**
   * Dispose of resources.
   */
  dispose(): void {
    this.analyser?.disconnect();
    this.analyser = null;
    this.frequencyData = null;
    this.audioContext = null;
    this.energyHistory = [];
  }
}

// Singleton instance
export const beatboxDetector = new BeatboxDetector();
