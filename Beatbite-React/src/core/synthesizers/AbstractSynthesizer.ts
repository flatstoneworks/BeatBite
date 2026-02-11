/**
 * AbstractSynthesizer - Base class for all instrument synthesizers.
 *
 * Provides shared infrastructure: audio context, master gain, volume,
 * octave shift, note change callbacks, and voice-to-instrument frequency mapping.
 */

import { logger } from '../utils/logger';

export abstract class AbstractSynthesizer<StyleType extends string> {
  protected audioContext: AudioContext | null = null;
  protected masterGain: GainNode | null = null;
  protected volume = 0.7;
  protected currentFrequency = 0;
  protected isPlaying = false;
  protected style: StyleType;
  protected octaveShift = 0;
  protected onNoteChanged?: (frequency: number, noteName: string) => void;

  constructor(defaultStyle: StyleType) {
    this.style = defaultStyle;
  }

  initialize(audioContext: AudioContext): void {
    this.audioContext = audioContext;
    this.masterGain = audioContext.createGain();
    this.masterGain.gain.value = this.volume;
    this.masterGain.connect(audioContext.destination);
    logger.info(`[${this.logTag}] Initialized`);
  }

  setOnNoteChanged(callback: (frequency: number, noteName: string) => void): void {
    this.onNoteChanged = callback;
  }

  getStyle(): StyleType {
    return this.style;
  }

  setVolume(volume: number): void {
    this.volume = Math.max(0, Math.min(1, volume));
    if (this.masterGain) {
      this.masterGain.gain.value = this.volume;
    }
  }

  setOctaveShift(shift: number): void {
    this.octaveShift = Math.max(-2, Math.min(2, shift));
  }

  connectToRecorder(destination: AudioNode): void {
    if (this.masterGain) {
      this.masterGain.connect(destination);
    }
  }

  getIsPlaying(): boolean {
    return this.isPlaying;
  }

  getCurrentFrequency(): number {
    return this.currentFrequency;
  }

  /**
   * Convert voice frequency to instrument range.
   * Applies octave shift and clamps to the instrument's frequency range.
   * Subclasses can override for additional processing (e.g., semitone quantization).
   */
  protected voiceToInstrumentFrequency(voiceFrequency: number): number {
    const range = this.frequencyRange;
    let freq = voiceFrequency * Math.pow(2, this.octaveShift);
    while (freq > range.max) freq /= 2;
    while (freq < range.min) freq *= 2;
    return freq;
  }

  abstract setStyle(style: StyleType): void;
  abstract updateFromPitch(frequency: number, confidence: number): void;
  abstract dispose(): void;
  abstract get frequencyRange(): { min: number; max: number };
  protected abstract get logTag(): string;
}
