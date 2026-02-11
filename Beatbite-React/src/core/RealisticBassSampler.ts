/**
 * RealisticBassSampler - High-quality sampled bass using Tone.js.
 *
 * Uses electric bass samples from tonejs-instruments (CC-by 3.0).
 * Samples are self-hosted to avoid external dependencies.
 *
 * Styles apply different EQ/envelope characteristics:
 * - Finger: Warm, round tone with smooth attack
 * - Pick: Bright, punchy with fast attack
 * - Slap: Funky with emphasized highs and compression
 * - Muted: Palm-muted with reduced sustain
 */

import * as Tone from 'tone';
import { frequencyToNoteName } from './utils/audioUtils';
import { logger } from './utils/logger';

export type SampledBassStyle = 'finger' | 'pick' | 'slap' | 'muted';

export interface SampledBassConfig {
  style: SampledBassStyle;
  volume: number;      // 0.0 to 1.0
  release: number;     // Release time multiplier
}

// Style configurations - apply different processing to the same samples
const STYLE_CONFIGS: Record<SampledBassStyle, {
  filterFreq: number;
  filterQ: number;
  attack: number;
  release: number;
  highShelf: number;   // dB boost/cut at high frequencies
  lowShelf: number;    // dB boost/cut at low frequencies
  compression: number; // Compression ratio (1 = none)
}> = {
  finger: {
    filterFreq: 2000,
    filterQ: 0.5,
    attack: 0.01,
    release: 0.8,
    highShelf: -3,
    lowShelf: 3,
    compression: 1,
  },
  pick: {
    filterFreq: 4000,
    filterQ: 1,
    attack: 0.002,
    release: 0.6,
    highShelf: 4,
    lowShelf: 0,
    compression: 1.5,
  },
  slap: {
    filterFreq: 6000,
    filterQ: 2,
    attack: 0.001,
    release: 0.4,
    highShelf: 6,
    lowShelf: 4,
    compression: 3,
  },
  muted: {
    filterFreq: 1200,
    filterQ: 0.3,
    attack: 0.005,
    release: 0.2,
    highShelf: -6,
    lowShelf: 2,
    compression: 2,
  },
};

// Display names and descriptions for UI
export const SAMPLED_BASS_STYLE_CONFIG: Record<SampledBassStyle, {
  displayName: string;
  description: string;
  color: string;
}> = {
  finger: {
    displayName: 'Finger',
    description: 'Warm fingerstyle bass',
    color: '#f59e0b',
  },
  pick: {
    displayName: 'Pick',
    description: 'Bright picked bass',
    color: '#ef4444',
  },
  slap: {
    displayName: 'Slap',
    description: 'Funky slap bass',
    color: '#ec4899',
  },
  muted: {
    displayName: 'Muted',
    description: 'Palm-muted thud',
    color: '#6366f1',
  },
};

// Sample URL mapping - every major 3rd across bass range
const SAMPLE_URLS: Record<string, string> = {
  'A#1': 'As1.mp3',
  'A#2': 'As2.mp3',
  'A#3': 'As3.mp3',
  'A#4': 'As4.mp3',
  'C#1': 'Cs1.mp3',
  'C#2': 'Cs2.mp3',
  'C#3': 'Cs3.mp3',
  'C#4': 'Cs4.mp3',
  'C#5': 'Cs5.mp3',
  'E1': 'E1.mp3',
  'E2': 'E2.mp3',
  'E3': 'E3.mp3',
  'E4': 'E4.mp3',
  'G1': 'G1.mp3',
  'G2': 'G2.mp3',
  'G3': 'G3.mp3',
  'G4': 'G4.mp3',
};

// Bass frequency range (standard 4-string bass)
const BASS_RANGE = {
  min: 41.2,   // E1 (low E on bass)
  max: 392,    // G4 (high frets)
};

export class RealisticBassSampler {
  private sampler: Tone.Sampler | null = null;
  private filter: Tone.Filter | null = null;
  private highShelf: Tone.EQ3 | null = null;
  private compressor: Tone.Compressor | null = null;
  private volume: Tone.Volume | null = null;
  private isLoaded = false;
  private isLoading = false;
  private loadPromise: Promise<void> | null = null;

  // Configuration
  private style: SampledBassStyle = 'finger';
  private volumeLevel = 0.8;
  private octaveShift = 0;

  // State
  private currentFrequency = 0;
  private isPlaying = false;
  private activeNotes: Set<string> = new Set();

  // Callbacks
  private onNoteChanged?: (frequency: number, noteName: string) => void;
  private onLoaded?: () => void;

  /**
   * Initialize and load the sampler.
   */
  async load(): Promise<void> {
    if (this.isLoaded) return;
    if (this.loadPromise) return this.loadPromise;

    this.isLoading = true;

    this.loadPromise = new Promise((resolve, reject) => {
      try {
        // Create effects chain
        this.volume = new Tone.Volume(-6).toDestination();

        this.compressor = new Tone.Compressor({
          threshold: -20,
          ratio: STYLE_CONFIGS[this.style].compression,
          attack: 0.003,
          release: 0.25,
        });
        this.compressor.connect(this.volume);

        this.highShelf = new Tone.EQ3({
          low: STYLE_CONFIGS[this.style].lowShelf,
          mid: 0,
          high: STYLE_CONFIGS[this.style].highShelf,
        });
        this.highShelf.connect(this.compressor);

        this.filter = new Tone.Filter({
          frequency: STYLE_CONFIGS[this.style].filterFreq,
          Q: STYLE_CONFIGS[this.style].filterQ,
          type: 'lowpass',
        });
        this.filter.connect(this.highShelf);

        // Create sampler with self-hosted samples
        this.sampler = new Tone.Sampler({
          urls: SAMPLE_URLS,
          baseUrl: '/samples/bass/',
          release: STYLE_CONFIGS[this.style].release,
          onload: () => {
            this.isLoaded = true;
            this.isLoading = false;
            logger.info('[RealisticBass] Samples loaded');
            this.onLoaded?.();
            resolve();
          },
          onerror: (error) => {
            logger.error('[RealisticBass] Failed to load samples:', error);
            this.isLoading = false;
            reject(error);
          },
        });

        this.sampler.connect(this.filter);

        // Apply style settings
        this.applyStyle();

      } catch (error) {
        logger.error('[RealisticBass] Initialization error:', error);
        this.isLoading = false;
        reject(error);
      }
    });

    return this.loadPromise;
  }

  /**
   * Check if samples are loaded.
   */
  getIsLoaded(): boolean {
    return this.isLoaded;
  }

  /**
   * Check if currently loading.
   */
  getIsLoading(): boolean {
    return this.isLoading;
  }

  /**
   * Set callback for load completion.
   */
  setOnLoaded(callback: () => void): void {
    this.onLoaded = callback;
  }

  /**
   * Set callback for note changes.
   */
  setOnNoteChanged(callback: (frequency: number, noteName: string) => void): void {
    this.onNoteChanged = callback;
  }

  /**
   * Set the bass style.
   */
  setStyle(style: SampledBassStyle): void {
    this.style = style;
    this.applyStyle();
  }

  /**
   * Get current style.
   */
  getStyle(): SampledBassStyle {
    return this.style;
  }

  /**
   * Apply current style settings to the audio chain.
   */
  private applyStyle(): void {
    const config = STYLE_CONFIGS[this.style];

    if (this.filter) {
      this.filter.frequency.value = config.filterFreq;
      this.filter.Q.value = config.filterQ;
    }

    if (this.highShelf) {
      this.highShelf.low.value = config.lowShelf;
      this.highShelf.high.value = config.highShelf;
    }

    if (this.compressor) {
      this.compressor.ratio.value = config.compression;
    }

    if (this.sampler) {
      this.sampler.release = config.release;
    }
  }

  /**
   * Convert voice pitch to bass frequency (quantized to nearest semitone).
   */
  private voiceToBassFrequency(voiceFrequency: number): number {
    let bassFreq = voiceFrequency;

    // Voice is typically 80-300Hz, bass is 41-200Hz
    // Shift down an octave if voice is too high
    while (bassFreq > BASS_RANGE.max) {
      bassFreq /= 2;
    }
    while (bassFreq < BASS_RANGE.min) {
      bassFreq *= 2;
    }

    // Apply octave shift
    bassFreq *= Math.pow(2, this.octaveShift);

    // Clamp to bass range
    bassFreq = Math.max(BASS_RANGE.min, Math.min(BASS_RANGE.max, bassFreq));

    // Quantize to nearest semitone
    const semitone = Math.round(12 * Math.log2(bassFreq / 440));
    bassFreq = 440 * Math.pow(2, semitone / 12);

    return bassFreq;
  }

  /**
   * Play a note at the given frequency.
   */
  playNote(frequency: number, velocity: number = 0.8): void {
    if (!this.sampler || !this.isLoaded) return;

    this.currentFrequency = frequency;
    this.isPlaying = true;

    const noteName = frequencyToNoteName(frequency);

    this.sampler.triggerAttack(noteName, Tone.now(), velocity);
    this.activeNotes.add(noteName);
  }

  /**
   * Trigger a note from voice input.
   */
  triggerNoteFromVoice(frequency: number, velocity: number = 0.8, duration?: number): void {
    if (!this.sampler || !this.isLoaded) return;

    this.releaseAllNotes();

    const bassFreq = this.voiceToBassFrequency(frequency);
    this.playNote(bassFreq, velocity);

    const noteName = frequencyToNoteName(bassFreq);
    this.onNoteChanged?.(bassFreq, noteName);

    logger.debug(
      `[RealisticBass] triggerNoteFromVoice: ${noteName} (${bassFreq.toFixed(1)}Hz) vel=${velocity.toFixed(2)}`
    );

    if (duration !== undefined && duration > 0) {
      setTimeout(() => {
        this.releaseAllNotes();
        this.onNoteChanged?.(0, '--');
      }, duration);
    }
  }

  /**
   * Play a note directly at a specific frequency (no transposition).
   */
  playNoteAtFrequency(frequency: number, velocity: number = 0.8): void {
    if (!this.sampler || !this.isLoaded) return;

    this.releaseAllNotes();
    this.playNote(frequency, velocity);

    const noteName = frequencyToNoteName(frequency);
    this.onNoteChanged?.(frequency, noteName);
  }

  /**
   * Release all active notes.
   */
  releaseAllNotes(): void {
    if (!this.sampler) return;

    for (const note of this.activeNotes) {
      this.sampler.triggerRelease(note, Tone.now());
    }
    this.activeNotes.clear();
    this.isPlaying = false;
    this.currentFrequency = 0;
  }

  /**
   * Release all notes and notify callback.
   */
  releaseAllAndNotify(): void {
    this.releaseAllNotes();
    this.onNoteChanged?.(0, '--');
  }

  /**
   * Set master volume (0.0 to 1.0).
   */
  setVolume(volume: number): void {
    this.volumeLevel = Math.max(0, Math.min(1, volume));
    if (this.volume) {
      const db = this.volumeLevel === 0 ? -60 : 20 * Math.log10(this.volumeLevel);
      this.volume.volume.value = db;
    }
  }

  /**
   * Set octave shift (-2 to +2).
   */
  setOctaveShift(shift: number): void {
    this.octaveShift = Math.max(-2, Math.min(2, shift));
  }

  /**
   * Get current playing state.
   */
  getIsPlaying(): boolean {
    return this.isPlaying;
  }

  /**
   * Get current frequency.
   */
  getCurrentFrequency(): number {
    return this.currentFrequency;
  }

  /**
   * Dispose of all resources.
   */
  dispose(): void {
    this.releaseAllNotes();
    this.sampler?.dispose();
    this.filter?.dispose();
    this.highShelf?.dispose();
    this.compressor?.dispose();
    this.volume?.dispose();
    this.sampler = null;
    this.filter = null;
    this.highShelf = null;
    this.compressor = null;
    this.volume = null;
    this.isLoaded = false;
    this.loadPromise = null;
  }
}

// Singleton instance
export const realisticBassSampler = new RealisticBassSampler();
