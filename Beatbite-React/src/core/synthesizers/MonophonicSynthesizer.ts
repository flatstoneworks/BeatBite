/**
 * MonophonicSynthesizer - Base class for single-voice instruments (bass, guitar).
 *
 * Handles: pitch tracking, glide/portamento, note triggering, stop/release,
 * and the common playNote/stopNote lifecycle with amplitude envelope.
 */

import { frequencyToNoteName } from '../utils/audioUtils';
import { AbstractSynthesizer } from './AbstractSynthesizer';

export abstract class MonophonicSynthesizer<StyleType extends string> extends AbstractSynthesizer<StyleType> {
  protected targetFrequency = 0;
  protected glideTime = 0.03;

  // Shared oscillator/filter nodes (subclasses may add more)
  protected oscillator1: OscillatorNode | null = null;
  protected oscillator2: OscillatorNode | null = null;
  protected filter: BiquadFilterNode | null = null;
  protected ampEnvelope: GainNode | null = null;

  setStyle(style: StyleType): void {
    this.style = style;
    this.applyStyleDefaults(style);
    if (this.isPlaying && this.currentFrequency > 0) {
      this.stopNote();
      this.playNote(this.targetFrequency);
    }
  }

  updateFromPitch(frequency: number, confidence: number): void {
    if (!this.audioContext || !this.masterGain) return;

    if (confidence < 0.5 || frequency <= 0) {
      if (this.isPlaying) {
        this.stopNote();
        this.onNoteChanged?.(0, '--');
      }
      return;
    }

    const instrumentFreq = this.voiceToInstrumentFrequency(frequency);
    this.targetFrequency = instrumentFreq;

    if (!this.isPlaying) {
      this.playNote(instrumentFreq);
    } else {
      this.glideToFrequency(instrumentFreq);
    }

    this.onNoteChanged?.(instrumentFreq, frequencyToNoteName(instrumentFreq));
  }

  /**
   * Trigger a single note (one-shot mode).
   * Transposes voice frequency to instrument range.
   */
  triggerNote(frequency: number, velocity: number = 0.8, duration?: number): void {
    if (!this.audioContext || !this.masterGain) return;

    if (this.isPlaying) this.stopNote();

    const instrumentFreq = this.voiceToInstrumentFrequency(frequency);
    const prevVolume = this.volume;
    this.volume = prevVolume * velocity;
    this.playNote(instrumentFreq);
    this.volume = prevVolume;

    const noteName = frequencyToNoteName(instrumentFreq);
    this.onNoteChanged?.(instrumentFreq, noteName);

    console.log(
      `[${this.logTag}] triggerNote: ${noteName} (${instrumentFreq.toFixed(1)}Hz) vel=${velocity.toFixed(2)}`
    );

    if (duration !== undefined && duration > 0) {
      setTimeout(() => this.releaseNote(), duration);
    }
  }

  releaseNote(): void {
    if (this.isPlaying) {
      this.stopNote();
      this.onNoteChanged?.(0, '--');
    }
  }

  /**
   * Play a note directly at a specific frequency (no transposition).
   * Used by MelodicEventPlayer for playback of recorded events.
   */
  playNoteAtFrequency(frequency: number, velocity: number = 0.8): void {
    if (!this.audioContext || !this.masterGain) return;

    if (this.isPlaying) this.stopNote();

    const prevVolume = this.volume;
    this.volume = prevVolume * velocity;
    this.playNote(frequency);
    this.volume = prevVolume;

    this.onNoteChanged?.(frequency, frequencyToNoteName(frequency));
  }

  /**
   * Update pitch of a currently playing note (continuous voice control).
   */
  updatePitch(frequency: number): void {
    if (!this.isPlaying || !this.audioContext) return;
    const instrumentFreq = this.voiceToInstrumentFrequency(frequency);
    this.targetFrequency = instrumentFreq;
    this.glideToFrequency(instrumentFreq);
  }

  setGlideTime(seconds: number): void {
    this.glideTime = Math.max(0, Math.min(0.5, seconds));
  }

  dispose(): void {
    this.stopNote();
    this.masterGain?.disconnect();
    this.masterGain = null;
    this.audioContext = null;
  }

  protected playNote(frequency: number): void {
    if (!this.audioContext || !this.masterGain) return;

    this.cleanupAllNodes();

    const ctx = this.audioContext;
    const now = ctx.currentTime;

    this.currentFrequency = frequency;

    this.ampEnvelope = ctx.createGain();
    this.ampEnvelope.gain.setValueAtTime(0, now);

    this.createSoundForStyle(frequency, now);

    this.ampEnvelope.connect(this.masterGain);
    this.isPlaying = true;
  }

  protected stopNote(): void {
    if (!this.audioContext || !this.ampEnvelope) {
      this.cleanupAllNodes();
      this.isPlaying = false;
      this.currentFrequency = 0;
      return;
    }

    const now = this.audioContext.currentTime;
    this.ampEnvelope.gain.cancelScheduledValues(now);
    this.ampEnvelope.gain.setValueAtTime(this.ampEnvelope.gain.value, now);
    this.ampEnvelope.gain.linearRampToValueAtTime(0, now + 0.005);

    this.isPlaying = false;
    this.currentFrequency = 0;

    const envelopeToClean = this.ampEnvelope;
    setTimeout(() => {
      if (this.ampEnvelope === envelopeToClean) {
        this.cleanupAllNodes();
      }
    }, 10);
  }

  protected abstract createSoundForStyle(frequency: number, now: number): void;
  protected abstract glideToFrequency(frequency: number): void;
  protected abstract cleanupAllNodes(): void;
  protected abstract applyStyleDefaults(style: StyleType): void;
}
