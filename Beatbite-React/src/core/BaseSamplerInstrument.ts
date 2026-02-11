/**
 * BaseSamplerInstrument - Abstract base class for Tone.js sampled instruments.
 *
 * Provides shared functionality for all sampler-based instruments:
 * - Sample loading and management
 * - Frequency/note conversion utilities
 * - Volume and octave shift controls
 * - Note triggering and release
 * - Voice-to-instrument pitch mapping
 *
 * Subclasses implement instrument-specific:
 * - Sample URLs and paths
 * - Effects chains (distortion, filters, etc.)
 * - Style configurations
 */

import * as Tone from 'tone';
import { frequencyToNoteName } from './utils/audioUtils';

// Instrument frequency range configuration
export interface InstrumentRange {
  min: number;  // Lowest frequency (Hz)
  max: number;  // Highest frequency (Hz)
}

// Base style configuration interface
export interface BaseStyleConfig {
  filterFreq: number;
  filterQ: number;
  attack: number;
  release: number;
  highShelf: number;
  midBoost: number;
  lowShelf: number;
}

export abstract class BaseSamplerInstrument<TStyle extends string> {
  // Tone.js nodes
  protected sampler: Tone.Sampler | null = null;
  protected filter: Tone.Filter | null = null;
  protected eq: Tone.EQ3 | null = null;
  protected volume: Tone.Volume | null = null;

  // Loading state
  protected isLoaded = false;
  protected isLoading = false;
  protected loadPromise: Promise<void> | null = null;

  // Configuration
  protected style: TStyle;
  protected volumeLevel = 0.8;
  protected octaveShift = 0;

  // Playback state
  protected currentFrequency = 0;
  protected isPlaying = false;
  protected activeNotes: Set<string> = new Set();

  // Callbacks
  protected onNoteChanged?: (frequency: number, noteName: string) => void;
  protected onLoaded?: () => void;

  // Abstract properties that subclasses must implement
  protected abstract readonly sampleUrls: Record<string, string>;
  protected abstract readonly baseUrl: string;
  protected abstract readonly instrumentRange: InstrumentRange;
  protected abstract readonly styleConfigs: Record<TStyle, BaseStyleConfig>;
  protected abstract readonly logPrefix: string;

  constructor(defaultStyle: TStyle) {
    this.style = defaultStyle;
  }

  /**
   * Create the effects chain. Subclasses can override to add additional effects.
   * Returns the node that the sampler should connect to.
   */
  protected createEffectsChain(): Tone.ToneAudioNode {
    const config = this.styleConfigs[this.style];

    this.volume = new Tone.Volume(-6).toDestination();

    this.eq = new Tone.EQ3({
      low: config.lowShelf,
      mid: config.midBoost,
      high: config.highShelf,
    });
    this.eq.connect(this.volume);

    this.filter = new Tone.Filter({
      frequency: config.filterFreq,
      Q: config.filterQ,
      type: 'lowpass',
    });
    this.filter.connect(this.eq);

    return this.filter;
  }

  /**
   * Initialize and load the sampler.
   */
  async load(): Promise<void> {
    if (this.isLoaded) return;
    if (this.loadPromise) return this.loadPromise;

    this.isLoading = true;
    console.log(`[${this.logPrefix}] Starting load...`);

    // Ensure Tone.js audio context is started
    await Tone.start();
    console.log(`[${this.logPrefix}] Tone.js context started`);

    this.loadPromise = new Promise((resolve, reject) => {
      try {
        // Create effects chain (subclasses can override)
        const connectTo = this.createEffectsChain();

        // Create sampler
        this.sampler = new Tone.Sampler({
          urls: this.sampleUrls,
          baseUrl: this.baseUrl,
          release: this.styleConfigs[this.style].release,
          onload: () => {
            this.isLoaded = true;
            this.isLoading = false;
            console.log(`[${this.logPrefix}] Samples loaded successfully`);
            this.onLoaded?.();
            resolve();
          },
          onerror: (error) => {
            console.error(`[${this.logPrefix}] Failed to load samples:`, error);
            this.isLoading = false;
            reject(error);
          },
        });

        this.sampler.connect(connectTo);

        // Apply initial style settings
        this.applyStyle();

      } catch (error) {
        console.error(`[${this.logPrefix}] Initialization error:`, error);
        this.isLoading = false;
        reject(error);
      }
    });

    return this.loadPromise;
  }

  /**
   * Apply current style settings to the audio chain.
   * Subclasses can override to apply additional style-specific settings.
   */
  protected applyStyle(): void {
    const config = this.styleConfigs[this.style];
    console.log(`[${this.logPrefix}] Applying style: ${this.style}`);

    if (this.filter) {
      this.filter.frequency.value = config.filterFreq;
      this.filter.Q.value = config.filterQ;
    }

    if (this.eq) {
      this.eq.low.value = config.lowShelf;
      this.eq.mid.value = config.midBoost;
      this.eq.high.value = config.highShelf;
    }

    if (this.sampler) {
      this.sampler.release = config.release;
    }
  }

  // ============ State Getters ============

  getIsLoaded(): boolean {
    return this.isLoaded;
  }

  getIsLoading(): boolean {
    return this.isLoading;
  }

  isReady(): boolean {
    return this.isLoaded;
  }

  getIsPlaying(): boolean {
    return this.isPlaying;
  }

  getCurrentFrequency(): number {
    return this.currentFrequency;
  }

  getStyle(): TStyle {
    return this.style;
  }

  // ============ Callbacks ============

  setOnLoaded(callback: () => void): void {
    this.onLoaded = callback;
  }

  setOnNoteChanged(callback: (frequency: number, noteName: string) => void): void {
    this.onNoteChanged = callback;
  }

  // ============ Style ============

  setStyle(style: TStyle): void {
    this.style = style;
    this.applyStyle();
    console.log(`[${this.logPrefix}] Style set to: ${style}`);
  }

  // ============ Volume & Octave ============

  setVolume(volume: number): void {
    this.volumeLevel = Math.max(0, Math.min(1, volume));
    if (this.volume) {
      const db = this.volumeLevel === 0 ? -60 : 20 * Math.log10(this.volumeLevel);
      this.volume.volume.value = db;
    }
  }

  setOctaveShift(shift: number): void {
    this.octaveShift = Math.max(-2, Math.min(2, shift));
  }

  // ============ Frequency Utilities ============

  /**
   * Convert voice pitch to instrument frequency (quantized to nearest semitone).
   */
  protected voiceToInstrumentFrequency(voiceFrequency: number): number {
    let freq = voiceFrequency;

    // Apply octave shift
    freq *= Math.pow(2, this.octaveShift);

    // Ensure we're in instrument range
    while (freq > this.instrumentRange.max) {
      freq /= 2;
    }
    while (freq < this.instrumentRange.min) {
      freq *= 2;
    }

    // Quantize to nearest semitone for clean pitch
    const semitone = Math.round(12 * Math.log2(freq / 440));
    freq = 440 * Math.pow(2, semitone / 12);

    return freq;
  }

  // ============ Note Playback ============

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
   * Trigger a note from voice input with optional duration.
   */
  triggerNoteFromVoice(frequency: number, velocity: number = 0.8, duration?: number): void {
    if (!this.sampler || !this.isLoaded) return;

    this.releaseAllNotes();

    const instrumentFreq = this.voiceToInstrumentFrequency(frequency);
    this.playNote(instrumentFreq, velocity);

    const noteName = frequencyToNoteName(instrumentFreq);
    this.onNoteChanged?.(instrumentFreq, noteName);

    console.log(
      `[${this.logPrefix}] triggerNoteFromVoice: ${noteName} (${instrumentFreq.toFixed(1)}Hz) vel=${velocity.toFixed(2)} style=${this.style}`
    );

    if (duration !== undefined && duration > 0) {
      setTimeout(() => {
        this.releaseAllNotes();
        this.onNoteChanged?.(0, '--');
      }, duration);
    }
  }

  /**
   * Alias for triggerNoteFromVoice for API consistency.
   */
  triggerNote(frequency: number, velocity: number = 0.8, duration?: number): void {
    this.triggerNoteFromVoice(frequency, velocity, duration);
  }

  /**
   * Play a note directly at a specific frequency (no transposition).
   * Used by MelodicEventPlayer for playback of recorded events.
   */
  playNoteAtFrequency(frequency: number, velocity: number = 0.8): void {
    if (!this.sampler || !this.isLoaded) return;

    this.releaseAllNotes();
    this.playNote(frequency, velocity);

    const noteName = frequencyToNoteName(frequency);
    this.onNoteChanged?.(frequency, noteName);
  }

  /**
   * Update instrument from detected pitch (continuous mode).
   * Re-triggers notes when pitch changes to a different note.
   */
  updateFromPitch(frequency: number, confidence: number): void {
    if (!this.sampler || !this.isLoaded) {
      console.log(`[${this.logPrefix}] updateFromPitch: not ready`);
      return;
    }

    // Stop when voice stops
    if (confidence < 0.5 || frequency <= 0) {
      if (this.isPlaying) {
        this.releaseAllNotes();
        this.onNoteChanged?.(0, '--');
      }
      return;
    }

    const instrumentFreq = this.voiceToInstrumentFrequency(frequency);
    const newNoteName = frequencyToNoteName(instrumentFreq);

    // Check if we need to trigger a new note
    if (!this.isPlaying) {
      // Start new note
      console.log(`[${this.logPrefix}] Playing note: ${newNoteName} at ${instrumentFreq.toFixed(1)}Hz`);
      this.playNote(instrumentFreq, 0.8);
      this.onNoteChanged?.(instrumentFreq, newNoteName);
    } else {
      // Check if pitch changed to a different note
      const currentNoteName = frequencyToNoteName(this.currentFrequency);
      if (newNoteName !== currentNoteName) {
        // New note - re-trigger
        this.releaseAllNotes();
        this.playNote(instrumentFreq, 0.8);
        this.onNoteChanged?.(instrumentFreq, newNoteName);
      }
    }
  }

  // ============ Note Release ============

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
   * Alias for releaseAllAndNotify for API consistency.
   */
  releaseNote(): void {
    this.releaseAllAndNotify();
  }

  // ============ Cleanup ============

  /**
   * Dispose of all resources.
   */
  dispose(): void {
    this.releaseAllNotes();
    this.sampler?.dispose();
    this.filter?.dispose();
    this.eq?.dispose();
    this.volume?.dispose();
    this.sampler = null;
    this.filter = null;
    this.eq = null;
    this.volume = null;
    this.isLoaded = false;
    this.loadPromise = null;
  }
}
