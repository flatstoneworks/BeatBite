/**
 * RealisticPianoSampler - High-quality sampled piano using Tone.js.
 *
 * Uses Salamander Grand Piano samples (public domain) for realistic sound.
 * Samples are self-hosted to avoid external dependencies.
 *
 * Styles:
 * - Acoustic Grand: Full, rich concert grand sound
 * - Bright: Enhanced high frequencies for cutting through a mix
 * - Warm: Rolled-off highs for a mellow, intimate sound
 * - Honky Tonk: Detuned for classic honky-tonk character
 */

import * as Tone from 'tone';
import { frequencyToNoteName } from './utils/audioUtils';
import { logger } from './utils/logger';

export type RealisticPianoStyle = 'acoustic' | 'bright' | 'warm' | 'honkytonk';

export interface RealisticPianoConfig {
  style: RealisticPianoStyle;
  volume: number;      // 0.0 to 1.0
  reverb: number;      // Reverb mix 0.0 to 1.0
  release: number;     // Release time multiplier
}

// Style configurations
const STYLE_CONFIGS: Record<RealisticPianoStyle, {
  filterFreq: number;
  filterQ: number;
  attack: number;
  release: number;
  detune: number;
  reverbMix: number;
}> = {
  acoustic: {
    filterFreq: 8000,
    filterQ: 0.5,
    attack: 0,
    release: 1.2,
    detune: 0,
    reverbMix: 0.15,
  },
  bright: {
    filterFreq: 12000,
    filterQ: 1,
    attack: 0,
    release: 1.0,
    detune: 0,
    reverbMix: 0.1,
  },
  warm: {
    filterFreq: 3000,
    filterQ: 0.3,
    attack: 0.01,
    release: 1.5,
    detune: 0,
    reverbMix: 0.25,
  },
  honkytonk: {
    filterFreq: 6000,
    filterQ: 0.7,
    attack: 0,
    release: 0.8,
    detune: 15, // Slight detune for honky-tonk character
    reverbMix: 0.1,
  },
};

// Display names and descriptions for UI
export const REALISTIC_PIANO_STYLE_CONFIG: Record<RealisticPianoStyle, {
  displayName: string;
  description: string;
  color: string;
}> = {
  acoustic: {
    displayName: 'Acoustic Grand',
    description: 'Full concert grand piano',
    color: '#8b4513',
  },
  bright: {
    displayName: 'Bright',
    description: 'Clear, cutting tone',
    color: '#ffd700',
  },
  warm: {
    displayName: 'Warm',
    description: 'Mellow, intimate sound',
    color: '#cd853f',
  },
  honkytonk: {
    displayName: 'Honky Tonk',
    description: 'Classic detuned character',
    color: '#daa520',
  },
};

// Sample URL mapping (every minor 3rd across the keyboard)
const SAMPLE_URLS: Record<string, string> = {
  'A0': 'A0.mp3',
  'C1': 'C1.mp3',
  'D#1': 'Ds1.mp3',
  'F#1': 'Fs1.mp3',
  'A1': 'A1.mp3',
  'C2': 'C2.mp3',
  'D#2': 'Ds2.mp3',
  'F#2': 'Fs2.mp3',
  'A2': 'A2.mp3',
  'C3': 'C3.mp3',
  'D#3': 'Ds3.mp3',
  'F#3': 'Fs3.mp3',
  'A3': 'A3.mp3',
  'C4': 'C4.mp3',
  'D#4': 'Ds4.mp3',
  'F#4': 'Fs4.mp3',
  'A4': 'A4.mp3',
  'C5': 'C5.mp3',
  'D#5': 'Ds5.mp3',
  'F#5': 'Fs5.mp3',
  'A5': 'A5.mp3',
  'C6': 'C6.mp3',
  'D#6': 'Ds6.mp3',
  'F#6': 'Fs6.mp3',
  'A6': 'A6.mp3',
  'C7': 'C7.mp3',
  'D#7': 'Ds7.mp3',
  'F#7': 'Fs7.mp3',
  'A7': 'A7.mp3',
  'C8': 'C8.mp3',
};

// Piano frequency range
const PIANO_RANGE = {
  min: 27.5,   // A0
  max: 4186,   // C8
};

export class RealisticPianoSampler {
  private sampler: Tone.Sampler | null = null;
  private filter: Tone.Filter | null = null;
  private reverb: Tone.Reverb | null = null;
  private volume: Tone.Volume | null = null;
  private isLoaded = false;
  private isLoading = false;
  private loadPromise: Promise<void> | null = null;

  // Configuration
  private style: RealisticPianoStyle = 'acoustic';
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
   * Call this before playing any notes.
   */
  async load(): Promise<void> {
    if (this.isLoaded) return;
    if (this.loadPromise) return this.loadPromise;

    this.isLoading = true;

    this.loadPromise = new Promise((resolve, reject) => {
      try {
        // Create effects chain
        this.volume = new Tone.Volume(-6).toDestination();

        this.reverb = new Tone.Reverb({
          decay: 2.5,
          wet: STYLE_CONFIGS[this.style].reverbMix,
        });
        this.reverb.connect(this.volume);

        this.filter = new Tone.Filter({
          frequency: STYLE_CONFIGS[this.style].filterFreq,
          Q: STYLE_CONFIGS[this.style].filterQ,
          type: 'lowpass',
        });
        this.filter.connect(this.reverb);

        // Create sampler with self-hosted samples
        this.sampler = new Tone.Sampler({
          urls: SAMPLE_URLS,
          baseUrl: '/samples/piano/',
          release: STYLE_CONFIGS[this.style].release,
          onload: () => {
            this.isLoaded = true;
            this.isLoading = false;
            logger.info('[RealisticPiano] Samples loaded');
            this.onLoaded?.();
            resolve();
          },
          onerror: (error) => {
            logger.error('[RealisticPiano] Failed to load samples:', error);
            this.isLoading = false;
            reject(error);
          },
        });

        this.sampler.connect(this.filter);

        // Apply style settings
        this.applyStyle();

      } catch (error) {
        logger.error('[RealisticPiano] Initialization error:', error);
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
   * Set the piano style.
   */
  setStyle(style: RealisticPianoStyle): void {
    this.style = style;
    this.applyStyle();
  }

  /**
   * Get current style.
   */
  getStyle(): RealisticPianoStyle {
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

    if (this.reverb) {
      this.reverb.wet.value = config.reverbMix;
    }

    if (this.sampler) {
      this.sampler.release = config.release;
      // Apply detune for honky-tonk effect
      // Note: Tone.Sampler doesn't have global detune, we apply it per-note
    }
  }

  /**
   * Convert voice pitch to piano frequency (quantized to nearest semitone).
   */
  private voiceToPianoFrequency(voiceFrequency: number): number {
    let pianoFreq = voiceFrequency;

    // Apply octave shift
    pianoFreq *= Math.pow(2, this.octaveShift);

    // Ensure we're in piano range
    while (pianoFreq > PIANO_RANGE.max) {
      pianoFreq /= 2;
    }
    while (pianoFreq < PIANO_RANGE.min) {
      pianoFreq *= 2;
    }

    // Quantize to nearest semitone
    const semitone = Math.round(12 * Math.log2(pianoFreq / 440));
    pianoFreq = 440 * Math.pow(2, semitone / 12);

    return pianoFreq;
  }

  /**
   * Update piano from detected pitch.
   * Called continuously from audio engine.
   */
  updateFromPitch(frequency: number, confidence: number): void {
    if (!this.sampler || !this.isLoaded) return;

    // Stop when voice stops
    if (confidence < 0.5 || frequency <= 0) {
      if (this.isPlaying) {
        this.releaseAllNotes();
        this.onNoteChanged?.(0, '--');
      }
      return;
    }

    const pianoFreq = this.voiceToPianoFrequency(frequency);

    // Check if this is a new note
    const currentNote = frequencyToNoteName(this.currentFrequency);
    const newNote = frequencyToNoteName(pianoFreq);

    if (!this.isPlaying || currentNote !== newNote) {
      this.releaseAllNotes();
      this.playNote(pianoFreq);
    }

    this.onNoteChanged?.(pianoFreq, newNote);
  }

  /**
   * Play a note at the given frequency.
   */
  playNote(frequency: number, velocity: number = 0.8): void {
    if (!this.sampler || !this.isLoaded) return;

    this.currentFrequency = frequency;
    this.isPlaying = true;

    const noteName = frequencyToNoteName(frequency);

    // Apply detune for honky-tonk style
    const config = STYLE_CONFIGS[this.style];
    if (config.detune !== 0) {
      // For honky-tonk, play two slightly detuned notes
      this.sampler.triggerAttack(noteName, Tone.now(), velocity);
      // Play a second note slightly detuned (simulating second string)
      const detuneFreq = frequency * Math.pow(2, config.detune / 1200);
      const detunedNote = frequencyToNoteName(detuneFreq);
      this.sampler.triggerAttack(detunedNote, Tone.now(), velocity * 0.7);
      this.activeNotes.add(noteName);
      this.activeNotes.add(detunedNote);
    } else {
      this.sampler.triggerAttack(noteName, Tone.now(), velocity);
      this.activeNotes.add(noteName);
    }
  }

  /**
   * Trigger a note from voice input (one-shot mode).
   */
  triggerNoteFromVoice(frequency: number, velocity: number = 0.8, duration?: number): void {
    if (!this.sampler || !this.isLoaded) return;

    this.releaseAllNotes();

    const pianoFreq = this.voiceToPianoFrequency(frequency);
    this.playNote(pianoFreq, velocity);

    const noteName = frequencyToNoteName(pianoFreq);
    this.onNoteChanged?.(pianoFreq, noteName);

    logger.debug(
      `[RealisticPiano] triggerNoteFromVoice: ${noteName} (${pianoFreq.toFixed(1)}Hz) vel=${velocity.toFixed(2)}`
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
   * Used by MelodicEventPlayer for playback.
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
      // Convert 0-1 to dB (-60 to 0)
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
   * Set reverb mix (0.0 to 1.0).
   */
  setReverbMix(mix: number): void {
    if (this.reverb) {
      this.reverb.wet.value = Math.max(0, Math.min(1, mix));
    }
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
    this.reverb?.dispose();
    this.volume?.dispose();
    this.sampler = null;
    this.filter = null;
    this.reverb = null;
    this.volume = null;
    this.isLoaded = false;
    this.loadPromise = null;
  }
}

// Singleton instance
export const realisticPianoSampler = new RealisticPianoSampler();
