/**
 * PianoSynthesizer generates piano/keyboard sounds using Web Audio API synthesis.
 *
 * Extends AbstractSynthesizer directly (not MonophonicSynthesizer) because
 * piano is polyphonic with a voice map, not single-voice with glide.
 *
 * Piano styles:
 * - Grand: Physical modeling inspired - rich harmonics with hammer strike
 * - Upright: Warmer, slightly muted tone
 * - Electric: FM synthesis for Wurlitzer-style sound
 * - Rhodes: FM synthesis for Fender Rhodes-style sound
 * - Synth: Classic synthesizer piano sound
 */

import { frequencyToNoteName, createNoiseBuffer } from '../utils/audioUtils';
import { AbstractSynthesizer } from './AbstractSynthesizer';

export type PianoStyle = 'grand' | 'upright' | 'electric' | 'rhodes' | 'synth';

export interface PianoConfig {
  style: PianoStyle;
  volume: number;
  octaveShift: number;
  sustain: number;
  brightness: number;
}

const PIANO_DEFAULTS: Record<PianoStyle, Omit<PianoConfig, 'style'>> = {
  grand: { volume: 0.8, octaveShift: 0, sustain: 0.5, brightness: 0.7 },
  upright: { volume: 0.75, octaveShift: 0, sustain: 0.4, brightness: 0.5 },
  electric: { volume: 0.7, octaveShift: 0, sustain: 0.3, brightness: 0.8 },
  rhodes: { volume: 0.7, octaveShift: 0, sustain: 0.6, brightness: 0.6 },
  synth: { volume: 0.75, octaveShift: 0, sustain: 0.4, brightness: 0.9 },
};

const PIANO_RANGE = {
  min: 27.5,   // A0
  max: 4186,   // C8
};

const HARMONIC_RATIOS = [1, 2, 3, 4, 5, 6, 7, 8];
const HARMONIC_AMPLITUDES = [1.0, 0.5, 0.33, 0.25, 0.2, 0.16, 0.14, 0.125];

interface PianoVoice {
  frequency: number;
  oscillators: OscillatorNode[];
  gainNodes: GainNode[];
  filterNodes: BiquadFilterNode[];
  noiseSource: AudioBufferSourceNode | null;
  mainGain: GainNode;
}

export class PianoSynthesizer extends AbstractSynthesizer<PianoStyle> {
  // Polyphonic voice management
  private activeVoices: Map<number, PianoVoice> = new Map();
  private voiceIdCounter = 0;

  // Piano-specific settings
  private sustain = 0.5;
  private brightness = 0.7;

  constructor() {
    super('grand');
  }

  protected get logTag(): string { return 'PianoSynth'; }

  get frequencyRange(): { min: number; max: number } {
    return PIANO_RANGE;
  }

  /**
   * Override: quantize to nearest semitone for piano-like behavior.
   */
  protected voiceToInstrumentFrequency(voiceFrequency: number): number {
    let pianoFreq = super.voiceToInstrumentFrequency(voiceFrequency);
    const semitone = Math.round(12 * Math.log2(pianoFreq / 440));
    pianoFreq = 440 * Math.pow(2, semitone / 12);
    return pianoFreq;
  }

  setStyle(style: PianoStyle): void {
    this.style = style;
    const defaults = PIANO_DEFAULTS[style];
    this.octaveShift = defaults.octaveShift;
    this.sustain = defaults.sustain;
    this.brightness = defaults.brightness;
  }

  updateFromPitch(frequency: number, confidence: number): void {
    if (!this.audioContext || !this.masterGain) return;

    if (confidence < 0.5 || frequency <= 0) {
      if (this.isPlaying) {
        this.releaseAllNotes();
        this.onNoteChanged?.(0, '--');
      }
      return;
    }

    const pianoFreq = this.voiceToInstrumentFrequency(frequency);

    const currentNote = frequencyToNoteName(this.currentFrequency);
    const newNote = frequencyToNoteName(pianoFreq);

    if (!this.isPlaying || currentNote !== newNote) {
      this.releaseAllNotes();
      this.playNote(pianoFreq);
    }

    this.onNoteChanged?.(pianoFreq, frequencyToNoteName(pianoFreq));
  }

  /**
   * Trigger a specific note (for keyboard UI).
   * Does NOT transpose — frequency is used directly.
   */
  triggerNote(frequency: number, velocity: number = 0.8): void {
    if (!this.audioContext || !this.masterGain) return;
    this.playNote(frequency, velocity);
  }

  /**
   * Trigger a single piano note from voice input (one-shot mode with transposition).
   */
  triggerNoteFromVoice(frequency: number, velocity: number = 0.8, duration?: number): void {
    if (!this.audioContext || !this.masterGain) return;

    this.releaseAllNotes();

    const pianoFreq = this.voiceToInstrumentFrequency(frequency);
    this.playNote(pianoFreq, velocity);

    const noteName = frequencyToNoteName(pianoFreq);
    this.onNoteChanged?.(pianoFreq, noteName);

    console.log(
      `[PianoSynth] triggerNoteFromVoice: ${noteName} (${pianoFreq.toFixed(1)}Hz) vel=${velocity.toFixed(2)}`
    );

    if (duration !== undefined && duration > 0) {
      setTimeout(() => {
        this.releaseAllNotes();
        this.onNoteChanged?.(0, '--');
      }, duration);
    }
  }

  /**
   * Release a specific note.
   */
  releaseNote(frequency: number): void {
    for (const [id, voice] of this.activeVoices) {
      if (Math.abs(voice.frequency - frequency) < 1) {
        this.releaseVoice(id);
        break;
      }
    }
  }

  /**
   * Release all notes and notify.
   */
  releaseAllAndNotify(): void {
    this.releaseAllNotes();
    this.onNoteChanged?.(0, '--');
  }

  /**
   * Play a note directly at a specific frequency (no transposition).
   * Used by MelodicEventPlayer for playback of recorded events.
   */
  playNoteAtFrequency(frequency: number, velocity: number = 0.8): void {
    if (!this.audioContext || !this.masterGain) return;

    this.releaseAllNotes();
    this.playNote(frequency, velocity);

    this.onNoteChanged?.(frequency, frequencyToNoteName(frequency));
  }

  setSustain(sustain: number): void {
    this.sustain = Math.max(0, Math.min(1, sustain));
  }

  setBrightness(brightness: number): void {
    this.brightness = Math.max(0, Math.min(1, brightness));
  }

  dispose(): void {
    this.releaseAllNotes();
    this.masterGain?.disconnect();
    this.masterGain = null;
    this.audioContext = null;
  }

  // ==================== Voice management ====================

  private playNote(frequency: number, velocity: number = 0.8): void {
    if (!this.audioContext || !this.masterGain) return;

    this.currentFrequency = frequency;
    this.isPlaying = true;

    const voiceId = this.voiceIdCounter++;
    let voice: PianoVoice;

    switch (this.style) {
      case 'grand':
        voice = this.createGrandPianoVoice(frequency, velocity);
        break;
      case 'upright':
        voice = this.createUprightPianoVoice(frequency, velocity);
        break;
      case 'electric':
        voice = this.createElectricPianoVoice(frequency, velocity);
        break;
      case 'rhodes':
        voice = this.createRhodesVoice(frequency, velocity);
        break;
      case 'synth':
        voice = this.createSynthPianoVoice(frequency, velocity);
        break;
      default:
        voice = this.createGrandPianoVoice(frequency, velocity);
    }

    this.activeVoices.set(voiceId, voice);
  }

  private releaseVoice(voiceId: number): void {
    const voice = this.activeVoices.get(voiceId);
    if (!voice) return;

    const ctx = this.audioContext;
    if (ctx) {
      const now = ctx.currentTime;
      voice.mainGain.gain.cancelScheduledValues(now);
      voice.mainGain.gain.setValueAtTime(voice.mainGain.gain.value, now);
      voice.mainGain.gain.linearRampToValueAtTime(0, now + 0.05);
    }

    setTimeout(() => {
      this.cleanupVoice(voice);
      this.activeVoices.delete(voiceId);
    }, 100);
  }

  private releaseAllNotes(): void {
    for (const voiceId of this.activeVoices.keys()) {
      this.releaseVoice(voiceId);
    }
    this.isPlaying = false;
    this.currentFrequency = 0;
  }

  private cleanupVoice(voice: PianoVoice): void {
    try {
      for (const osc of voice.oscillators) {
        osc.stop();
        osc.disconnect();
      }
      voice.noiseSource?.stop();
      voice.noiseSource?.disconnect();
    } catch {
      // Ignore errors from already stopped oscillators
    }

    for (const gain of voice.gainNodes) {
      gain.disconnect();
    }
    for (const filter of voice.filterNodes) {
      filter.disconnect();
    }
    voice.mainGain.disconnect();
  }

  // ==================== Style-specific voice creation ====================

  private createGrandPianoVoice(frequency: number, velocity: number): PianoVoice {
    const ctx = this.audioContext!;
    const now = ctx.currentTime;

    const voice: PianoVoice = {
      frequency,
      oscillators: [],
      gainNodes: [],
      filterNodes: [],
      noiseSource: null,
      mainGain: ctx.createGain(),
    };

    const velocityBrightness = 0.5 + velocity * 0.5;
    const baseVolume = PIANO_DEFAULTS.grand.volume * velocity;

    const stringCount = frequency < 200 ? 1 : frequency < 400 ? 2 : 3;
    const detuneAmount = frequency < 200 ? 0.5 : frequency < 400 ? 1.0 : 1.5;

    for (let s = 0; s < stringCount; s++) {
      for (let h = 0; h < 4; h++) {
        const osc = ctx.createOscillator();
        const gain = ctx.createGain();

        const detune = (s - (stringCount - 1) / 2) * detuneAmount;
        osc.frequency.setValueAtTime(frequency * HARMONIC_RATIOS[h] + detune, now);
        osc.type = 'sine';

        const harmonicAmp = HARMONIC_AMPLITUDES[h] * (1 - h * 0.1 * (1 - velocityBrightness));
        const attackTime = 0.003 + h * 0.001;
        const decayTime = (3 - h * 0.3) * (1 + this.sustain);

        gain.gain.setValueAtTime(0, now);
        gain.gain.linearRampToValueAtTime(harmonicAmp * baseVolume / stringCount, now + attackTime);
        gain.gain.exponentialRampToValueAtTime(0.001, now + decayTime);

        osc.connect(gain);
        gain.connect(voice.mainGain);
        osc.start(now);
        osc.stop(now + decayTime + 0.1);

        voice.oscillators.push(osc);
        voice.gainNodes.push(gain);
      }
    }

    const noiseBuffer = createNoiseBuffer(this.audioContext!, 0.05);
    const noiseSource = ctx.createBufferSource();
    noiseSource.buffer = noiseBuffer;

    const hammerFilter = ctx.createBiquadFilter();
    hammerFilter.type = 'bandpass';
    hammerFilter.frequency.setValueAtTime(frequency * 4 * velocityBrightness, now);
    hammerFilter.Q.setValueAtTime(2, now);

    const hammerGain = ctx.createGain();
    hammerGain.gain.setValueAtTime(velocity * 0.3, now);
    hammerGain.gain.exponentialRampToValueAtTime(0.001, now + 0.02);

    noiseSource.connect(hammerFilter);
    hammerFilter.connect(hammerGain);
    hammerGain.connect(voice.mainGain);
    noiseSource.start(now);

    voice.noiseSource = noiseSource;
    voice.filterNodes.push(hammerFilter);
    voice.gainNodes.push(hammerGain);

    const bodyFilter = ctx.createBiquadFilter();
    bodyFilter.type = 'peaking';
    bodyFilter.frequency.setValueAtTime(250, now);
    bodyFilter.Q.setValueAtTime(1, now);
    bodyFilter.gain.setValueAtTime(3, now);

    voice.mainGain.connect(bodyFilter);
    bodyFilter.connect(this.masterGain!);
    voice.filterNodes.push(bodyFilter);

    return voice;
  }

  private createUprightPianoVoice(frequency: number, velocity: number): PianoVoice {
    const ctx = this.audioContext!;
    const now = ctx.currentTime;

    const voice: PianoVoice = {
      frequency,
      oscillators: [],
      gainNodes: [],
      filterNodes: [],
      noiseSource: null,
      mainGain: ctx.createGain(),
    };

    const baseVolume = PIANO_DEFAULTS.upright.volume * velocity;

    for (let h = 0; h < 3; h++) {
      const osc = ctx.createOscillator();
      const gain = ctx.createGain();

      osc.frequency.setValueAtTime(frequency * HARMONIC_RATIOS[h], now);
      osc.type = 'sine';

      const harmonicAmp = HARMONIC_AMPLITUDES[h] * 0.8;
      const decayTime = (2.5 - h * 0.4) * (1 + this.sustain * 0.8);

      gain.gain.setValueAtTime(0, now);
      gain.gain.linearRampToValueAtTime(harmonicAmp * baseVolume, now + 0.005);
      gain.gain.exponentialRampToValueAtTime(0.001, now + decayTime);

      osc.connect(gain);
      gain.connect(voice.mainGain);
      osc.start(now);
      osc.stop(now + decayTime + 0.1);

      voice.oscillators.push(osc);
      voice.gainNodes.push(gain);
    }

    const noiseBuffer = createNoiseBuffer(this.audioContext!, 0.03);
    const noiseSource = ctx.createBufferSource();
    noiseSource.buffer = noiseBuffer;

    const hammerFilter = ctx.createBiquadFilter();
    hammerFilter.type = 'lowpass';
    hammerFilter.frequency.setValueAtTime(frequency * 2, now);

    const hammerGain = ctx.createGain();
    hammerGain.gain.setValueAtTime(velocity * 0.15, now);
    hammerGain.gain.exponentialRampToValueAtTime(0.001, now + 0.015);

    noiseSource.connect(hammerFilter);
    hammerFilter.connect(hammerGain);
    hammerGain.connect(voice.mainGain);
    noiseSource.start(now);

    voice.noiseSource = noiseSource;

    const bodyFilter = ctx.createBiquadFilter();
    bodyFilter.type = 'lowpass';
    bodyFilter.frequency.setValueAtTime(3000, now);
    bodyFilter.Q.setValueAtTime(0.5, now);

    voice.mainGain.connect(bodyFilter);
    bodyFilter.connect(this.masterGain!);
    voice.filterNodes.push(bodyFilter);

    return voice;
  }

  private createElectricPianoVoice(frequency: number, velocity: number): PianoVoice {
    const ctx = this.audioContext!;
    const now = ctx.currentTime;

    const voice: PianoVoice = {
      frequency,
      oscillators: [],
      gainNodes: [],
      filterNodes: [],
      noiseSource: null,
      mainGain: ctx.createGain(),
    };

    const baseVolume = PIANO_DEFAULTS.electric.volume * velocity;

    const carrier = ctx.createOscillator();
    const modulator = ctx.createOscillator();
    const modulatorGain = ctx.createGain();
    const carrierGain = ctx.createGain();

    carrier.frequency.setValueAtTime(frequency, now);
    carrier.type = 'sine';

    const modRatio = 1;
    modulator.frequency.setValueAtTime(frequency * modRatio, now);
    modulator.type = 'sine';

    const modIndex = frequency * (0.5 + velocity * 1.5);
    modulatorGain.gain.setValueAtTime(modIndex, now);
    modulatorGain.gain.exponentialRampToValueAtTime(modIndex * 0.1, now + 1.5);

    const decayTime = 1.5 * (1 + this.sustain);
    carrierGain.gain.setValueAtTime(0, now);
    carrierGain.gain.linearRampToValueAtTime(baseVolume, now + 0.002);
    carrierGain.gain.exponentialRampToValueAtTime(baseVolume * 0.3, now + 0.1);
    carrierGain.gain.exponentialRampToValueAtTime(0.001, now + decayTime);

    modulator.connect(modulatorGain);
    modulatorGain.connect(carrier.frequency);
    carrier.connect(carrierGain);
    carrierGain.connect(voice.mainGain);

    modulator.start(now);
    carrier.start(now);
    modulator.stop(now + decayTime + 0.1);
    carrier.stop(now + decayTime + 0.1);

    voice.oscillators.push(carrier, modulator);
    voice.gainNodes.push(carrierGain, modulatorGain);

    const tineFilter = ctx.createBiquadFilter();
    tineFilter.type = 'peaking';
    tineFilter.frequency.setValueAtTime(frequency * 2, now);
    tineFilter.Q.setValueAtTime(5, now);
    tineFilter.gain.setValueAtTime(6, now);

    voice.mainGain.connect(tineFilter);
    tineFilter.connect(this.masterGain!);
    voice.filterNodes.push(tineFilter);

    return voice;
  }

  private createRhodesVoice(frequency: number, velocity: number): PianoVoice {
    const ctx = this.audioContext!;
    const now = ctx.currentTime;

    const voice: PianoVoice = {
      frequency,
      oscillators: [],
      gainNodes: [],
      filterNodes: [],
      noiseSource: null,
      mainGain: ctx.createGain(),
    };

    const baseVolume = PIANO_DEFAULTS.rhodes.volume * velocity;

    const carrier = ctx.createOscillator();
    const modulator1 = ctx.createOscillator();
    const modulator2 = ctx.createOscillator();
    const modGain1 = ctx.createGain();
    const modGain2 = ctx.createGain();
    const carrierGain = ctx.createGain();

    carrier.frequency.setValueAtTime(frequency, now);
    carrier.type = 'sine';

    modulator1.frequency.setValueAtTime(frequency * 1, now);
    modulator2.frequency.setValueAtTime(frequency * 14, now);

    const modIndex1 = frequency * (0.3 + velocity * 0.7);
    const modIndex2 = frequency * (0.1 + velocity * 0.3);

    modGain1.gain.setValueAtTime(modIndex1, now);
    modGain1.gain.exponentialRampToValueAtTime(modIndex1 * 0.05, now + 2);

    modGain2.gain.setValueAtTime(modIndex2, now);
    modGain2.gain.exponentialRampToValueAtTime(0.001, now + 0.3);

    const decayTime = 2.5 * (1 + this.sustain);
    carrierGain.gain.setValueAtTime(0, now);
    carrierGain.gain.linearRampToValueAtTime(baseVolume * 1.2, now + 0.001);
    carrierGain.gain.linearRampToValueAtTime(baseVolume, now + 0.02);
    carrierGain.gain.exponentialRampToValueAtTime(baseVolume * 0.4, now + 0.3);
    carrierGain.gain.exponentialRampToValueAtTime(0.001, now + decayTime);

    modulator1.connect(modGain1);
    modulator2.connect(modGain2);
    modGain1.connect(carrier.frequency);
    modGain2.connect(carrier.frequency);
    carrier.connect(carrierGain);
    carrierGain.connect(voice.mainGain);

    modulator1.start(now);
    modulator2.start(now);
    carrier.start(now);
    modulator1.stop(now + decayTime + 0.1);
    modulator2.stop(now + decayTime + 0.1);
    carrier.stop(now + decayTime + 0.1);

    voice.oscillators.push(carrier, modulator1, modulator2);
    voice.gainNodes.push(carrierGain, modGain1, modGain2);

    const phaseFilter = ctx.createBiquadFilter();
    phaseFilter.type = 'allpass';
    phaseFilter.frequency.setValueAtTime(1000, now);
    phaseFilter.Q.setValueAtTime(0.5, now);

    voice.mainGain.connect(phaseFilter);
    phaseFilter.connect(this.masterGain!);
    voice.filterNodes.push(phaseFilter);

    return voice;
  }

  private createSynthPianoVoice(frequency: number, velocity: number): PianoVoice {
    const ctx = this.audioContext!;
    const now = ctx.currentTime;

    const voice: PianoVoice = {
      frequency,
      oscillators: [],
      gainNodes: [],
      filterNodes: [],
      noiseSource: null,
      mainGain: ctx.createGain(),
    };

    const baseVolume = PIANO_DEFAULTS.synth.volume * velocity;

    const osc1 = ctx.createOscillator();
    const osc2 = ctx.createOscillator();
    const oscGain = ctx.createGain();

    osc1.type = 'sawtooth';
    osc1.frequency.setValueAtTime(frequency, now);

    osc2.type = 'square';
    osc2.frequency.setValueAtTime(frequency * 2, now);

    const osc1Gain = ctx.createGain();
    const osc2Gain = ctx.createGain();
    osc1Gain.gain.value = 0.6;
    osc2Gain.gain.value = 0.2;

    osc1.connect(osc1Gain);
    osc2.connect(osc2Gain);
    osc1Gain.connect(oscGain);
    osc2Gain.connect(oscGain);

    const filter = ctx.createBiquadFilter();
    filter.type = 'lowpass';
    const filterCutoff = frequency * (4 + velocity * 8) * this.brightness;
    filter.frequency.setValueAtTime(filterCutoff, now);
    filter.frequency.exponentialRampToValueAtTime(frequency * 2, now + 0.5);
    filter.Q.setValueAtTime(2, now);

    const decayTime = 1.2 * (1 + this.sustain);
    oscGain.gain.setValueAtTime(0, now);
    oscGain.gain.linearRampToValueAtTime(baseVolume, now + 0.005);
    oscGain.gain.exponentialRampToValueAtTime(baseVolume * 0.5, now + 0.1);
    oscGain.gain.exponentialRampToValueAtTime(0.001, now + decayTime);

    oscGain.connect(filter);
    filter.connect(voice.mainGain);
    voice.mainGain.connect(this.masterGain!);

    osc1.start(now);
    osc2.start(now);
    osc1.stop(now + decayTime + 0.1);
    osc2.stop(now + decayTime + 0.1);

    voice.oscillators.push(osc1, osc2);
    voice.gainNodes.push(oscGain, osc1Gain, osc2Gain);
    voice.filterNodes.push(filter);

    return voice;
  }
}

// Singleton instance
export const pianoSynthesizer = new PianoSynthesizer();
