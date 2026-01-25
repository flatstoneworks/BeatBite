/**
 * PitchDetector uses autocorrelation to detect the fundamental frequency
 * of audio input in real-time.
 *
 * Based on the McLeod Pitch Method (MPM) simplified for browser use.
 * Suitable for voice and monophonic instruments.
 */

export interface PitchResult {
  frequency: number;    // Hz (0 if no pitch detected)
  note: string;         // e.g., "A4", "C#3"
  noteName: string;     // e.g., "A", "C#"
  octave: number;       // e.g., 4
  cents: number;        // Deviation from perfect pitch (-50 to +50)
  confidence: number;   // 0.0 to 1.0
}

// Note names for conversion
const NOTE_NAMES = ['C', 'C#', 'D', 'D#', 'E', 'F', 'F#', 'G', 'G#', 'A', 'A#', 'B'];

// A4 = 440 Hz (standard tuning)
const A4_FREQUENCY = 440;
const A4_MIDI_NUMBER = 69;

/**
 * Convert frequency to note information.
 */
export function frequencyToNote(frequency: number): { note: string; noteName: string; octave: number; cents: number } {
  if (frequency <= 0) {
    return { note: '--', noteName: '--', octave: 0, cents: 0 };
  }

  // Calculate MIDI note number
  const midiNumber = 12 * Math.log2(frequency / A4_FREQUENCY) + A4_MIDI_NUMBER;
  const roundedMidi = Math.round(midiNumber);

  // Get note name and octave
  const noteIndex = ((roundedMidi % 12) + 12) % 12;
  const noteName = NOTE_NAMES[noteIndex];
  const octave = Math.floor(roundedMidi / 12) - 1;

  // Calculate cents deviation
  const cents = Math.round((midiNumber - roundedMidi) * 100);

  return {
    note: `${noteName}${octave}`,
    noteName,
    octave,
    cents,
  };
}

export class PitchDetector {
  private sampleRate: number;
  private bufferSize: number;
  private minFrequency: number;
  private maxFrequency: number;

  // Buffers for autocorrelation
  private buffer: Float32Array;
  private correlationBuffer: Float32Array;

  constructor(options: {
    sampleRate?: number;
    bufferSize?: number;
    minFrequency?: number;  // Minimum detectable frequency (Hz)
    maxFrequency?: number;  // Maximum detectable frequency (Hz)
  } = {}) {
    this.sampleRate = options.sampleRate || 48000;
    this.bufferSize = options.bufferSize || 2048;
    this.minFrequency = options.minFrequency || 80;   // ~E2 (low male voice)
    this.maxFrequency = options.maxFrequency || 1000; // ~B5 (high female voice)

    this.buffer = new Float32Array(this.bufferSize);
    this.correlationBuffer = new Float32Array(this.bufferSize);
  }

  /**
   * Detect pitch from audio buffer using autocorrelation.
   */
  detect(audioBuffer: Float32Array): PitchResult {
    // Copy input to internal buffer
    const len = Math.min(audioBuffer.length, this.bufferSize);
    for (let i = 0; i < len; i++) {
      this.buffer[i] = audioBuffer[i];
    }

    // Check if signal is strong enough
    const rms = this.calculateRMS(this.buffer, len);
    if (rms < 0.01) {
      return this.noResult();
    }

    // Calculate autocorrelation
    const { frequency, confidence } = this.autocorrelate(this.buffer, len);

    if (frequency <= 0 || confidence < 0.8) {
      return this.noResult();
    }

    // Convert to note
    const noteInfo = frequencyToNote(frequency);

    return {
      frequency,
      ...noteInfo,
      confidence,
    };
  }

  /**
   * Autocorrelation-based pitch detection.
   * Returns the detected frequency and confidence level.
   */
  private autocorrelate(buffer: Float32Array, len: number): { frequency: number; confidence: number } {
    // Calculate lag range based on frequency limits
    const minLag = Math.floor(this.sampleRate / this.maxFrequency);
    const maxLag = Math.ceil(this.sampleRate / this.minFrequency);

    // Compute normalized autocorrelation
    let bestCorrelation = 0;
    let bestLag = 0;

    // First, find the first zero crossing to avoid detecting harmonics
    let foundZeroCrossing = false;
    for (let lag = minLag; lag < maxLag && lag < len; lag++) {
      let correlation = 0;
      let energy1 = 0;
      let energy2 = 0;

      for (let i = 0; i < len - lag; i++) {
        correlation += buffer[i] * buffer[i + lag];
        energy1 += buffer[i] * buffer[i];
        energy2 += buffer[i + lag] * buffer[i + lag];
      }

      // Normalize
      const energy = Math.sqrt(energy1 * energy2);
      if (energy > 0) {
        correlation /= energy;
      }

      this.correlationBuffer[lag] = correlation;

      // Look for first peak after correlation drops below threshold
      if (!foundZeroCrossing && correlation < 0.5) {
        foundZeroCrossing = true;
      }

      if (foundZeroCrossing && correlation > bestCorrelation) {
        bestCorrelation = correlation;
        bestLag = lag;
      }
    }

    if (bestLag === 0 || bestCorrelation < 0.8) {
      return { frequency: 0, confidence: 0 };
    }

    // Parabolic interpolation for sub-sample accuracy
    const refinedLag = this.parabolicInterpolation(bestLag);
    const frequency = this.sampleRate / refinedLag;

    // Validate frequency is within range
    if (frequency < this.minFrequency || frequency > this.maxFrequency) {
      return { frequency: 0, confidence: 0 };
    }

    return { frequency, confidence: bestCorrelation };
  }

  /**
   * Parabolic interpolation to refine the lag estimate.
   */
  private parabolicInterpolation(lag: number): number {
    if (lag <= 0 || lag >= this.correlationBuffer.length - 1) {
      return lag;
    }

    const y0 = this.correlationBuffer[lag - 1];
    const y1 = this.correlationBuffer[lag];
    const y2 = this.correlationBuffer[lag + 1];

    const denominator = 2 * (2 * y1 - y0 - y2);
    if (Math.abs(denominator) < 1e-10) {
      return lag;
    }

    const delta = (y2 - y0) / denominator;
    return lag + delta;
  }

  /**
   * Calculate RMS (root mean square) of the signal.
   */
  private calculateRMS(buffer: Float32Array, len: number): number {
    let sum = 0;
    for (let i = 0; i < len; i++) {
      sum += buffer[i] * buffer[i];
    }
    return Math.sqrt(sum / len);
  }

  /**
   * Return a "no pitch detected" result.
   */
  private noResult(): PitchResult {
    return {
      frequency: 0,
      note: '--',
      noteName: '--',
      octave: 0,
      cents: 0,
      confidence: 0,
    };
  }

  /**
   * Update configuration.
   */
  configure(options: { sampleRate?: number; minFrequency?: number; maxFrequency?: number }): void {
    if (options.sampleRate) this.sampleRate = options.sampleRate;
    if (options.minFrequency) this.minFrequency = options.minFrequency;
    if (options.maxFrequency) this.maxFrequency = options.maxFrequency;
  }
}

// Singleton instance
export const pitchDetector = new PitchDetector();
