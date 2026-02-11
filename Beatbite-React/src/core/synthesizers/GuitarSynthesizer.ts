/**
 * GuitarSynthesizer generates guitar sounds using Web Audio API synthesis.
 *
 * Guitar styles:
 * - Clean: Crystal clear tone with filtered oscillators
 * - Distorted: Heavy overdrive with waveshaper
 * - Acoustic: Natural string pluck using Karplus-Strong-inspired synthesis
 * - Muted: Palm-muted punch with short envelope
 */

import { createDistortionCurve } from '../utils/audioUtils';
import { MonophonicSynthesizer } from './MonophonicSynthesizer';

export type GuitarStyle = 'clean' | 'distorted' | 'acoustic' | 'muted';

export interface GuitarConfig {
  style: GuitarStyle;
  volume: number;
  octaveShift: number;
  glide: number;
}

const GUITAR_DEFAULTS: Record<GuitarStyle, Omit<GuitarConfig, 'style'>> = {
  clean: { volume: 0.7, octaveShift: 0, glide: 0.02 },
  distorted: { volume: 0.6, octaveShift: 0, glide: 0.01 },
  acoustic: { volume: 0.8, octaveShift: 0, glide: 0 },
  muted: { volume: 0.7, octaveShift: 0, glide: 0 },
};

const GUITAR_RANGE = {
  min: 82,   // E2
  max: 659,  // E5
};

export class GuitarSynthesizer extends MonophonicSynthesizer<GuitarStyle> {
  // Guitar-specific nodes
  private noiseBuffer: AudioBufferSourceNode | null = null;
  private filter2: BiquadFilterNode | null = null;
  private distortion: WaveShaperNode | null = null;
  private delayNode: DelayNode | null = null;
  private feedbackGain: GainNode | null = null;

  constructor() {
    super('clean');
    this.octaveShift = 0;
    this.glideTime = 0.02;
  }

  protected get logTag(): string { return 'GuitarSynth'; }

  get frequencyRange(): { min: number; max: number } {
    return GUITAR_RANGE;
  }

  protected applyStyleDefaults(style: GuitarStyle): void {
    const defaults = GUITAR_DEFAULTS[style];
    this.octaveShift = defaults.octaveShift;
    this.glideTime = defaults.glide;
  }

  protected createSoundForStyle(frequency: number, now: number): void {
    switch (this.style) {
      case 'clean': this.createCleanGuitar(frequency, now); break;
      case 'distorted': this.createDistortedGuitar(frequency, now); break;
      case 'acoustic': this.createAcousticGuitar(frequency, now); break;
      case 'muted': this.createMutedGuitar(frequency, now); break;
    }
  }

  protected glideToFrequency(frequency: number): void {
    if (!this.audioContext) return;

    const now = this.audioContext.currentTime;
    const glideEnd = now + this.glideTime;

    if (this.oscillator1) {
      this.oscillator1.frequency.linearRampToValueAtTime(frequency, glideEnd);
    }
    if (this.oscillator2) {
      const freq2 = this.style === 'clean' ? frequency * 2 :
                    this.style === 'distorted' ? frequency * 0.998 : frequency;
      this.oscillator2.frequency.linearRampToValueAtTime(freq2, glideEnd);
    }
    if (this.delayNode && this.style === 'acoustic') {
      const delayTime = 1 / frequency;
      this.delayNode.delayTime.linearRampToValueAtTime(delayTime, glideEnd);
    }

    if (this.filter) {
      const filterFreq = this.style === 'clean' ? frequency * 3 :
                         this.style === 'muted' ? frequency * 2 : frequency * 4;
      this.filter.frequency.linearRampToValueAtTime(filterFreq, glideEnd);
    }

    this.currentFrequency = frequency;
  }

  protected cleanupAllNodes(): void {
    try {
      this.oscillator1?.stop();
      this.oscillator2?.stop();
      this.noiseBuffer?.stop();
    } catch {
      // Ignore errors from already stopped oscillators
    }

    this.oscillator1?.disconnect();
    this.oscillator2?.disconnect();
    this.noiseBuffer?.disconnect();
    this.filter?.disconnect();
    this.filter2?.disconnect();
    this.ampEnvelope?.disconnect();
    this.distortion?.disconnect();
    this.delayNode?.disconnect();
    this.feedbackGain?.disconnect();

    this.oscillator1 = null;
    this.oscillator2 = null;
    this.noiseBuffer = null;
    this.filter = null;
    this.filter2 = null;
    this.ampEnvelope = null;
    this.distortion = null;
    this.delayNode = null;
    this.feedbackGain = null;
  }

  // ==================== Style-specific sound creation ====================

  private createCleanGuitar(frequency: number, now: number): void {
    const ctx = this.audioContext!;

    this.oscillator1 = ctx.createOscillator();
    this.oscillator1.type = 'triangle';
    this.oscillator1.frequency.setValueAtTime(frequency, now);

    this.oscillator2 = ctx.createOscillator();
    this.oscillator2.type = 'sine';
    this.oscillator2.frequency.setValueAtTime(frequency * 2, now);

    this.filter = ctx.createBiquadFilter();
    this.filter.type = 'bandpass';
    this.filter.frequency.setValueAtTime(frequency * 3, now);
    this.filter.Q.setValueAtTime(1.5, now);

    this.filter2 = ctx.createBiquadFilter();
    this.filter2.type = 'highpass';
    this.filter2.frequency.setValueAtTime(80, now);

    const osc1Gain = ctx.createGain();
    osc1Gain.gain.value = 0.6;
    const osc2Gain = ctx.createGain();
    osc2Gain.gain.value = 0.3;

    this.oscillator1.connect(osc1Gain);
    this.oscillator2.connect(osc2Gain);
    osc1Gain.connect(this.filter);
    osc2Gain.connect(this.filter);
    this.filter.connect(this.filter2);
    this.filter2.connect(this.ampEnvelope!);

    this.ampEnvelope!.gain.linearRampToValueAtTime(GUITAR_DEFAULTS.clean.volume, now + 0.01);

    this.oscillator1.start(now);
    this.oscillator2.start(now);
  }

  private createDistortedGuitar(frequency: number, now: number): void {
    const ctx = this.audioContext!;

    this.oscillator1 = ctx.createOscillator();
    this.oscillator1.type = 'sawtooth';
    this.oscillator1.frequency.setValueAtTime(frequency, now);

    this.oscillator2 = ctx.createOscillator();
    this.oscillator2.type = 'square';
    this.oscillator2.frequency.setValueAtTime(frequency * 0.998, now);

    this.filter = ctx.createBiquadFilter();
    this.filter.type = 'lowpass';
    this.filter.frequency.setValueAtTime(2000, now);
    this.filter.Q.setValueAtTime(1, now);

    this.distortion = ctx.createWaveShaper();
    this.distortion.curve = createDistortionCurve(50);
    this.distortion.oversample = '4x';

    this.filter2 = ctx.createBiquadFilter();
    this.filter2.type = 'lowpass';
    this.filter2.frequency.setValueAtTime(4000, now);
    this.filter2.Q.setValueAtTime(0.5, now);

    const osc1Gain = ctx.createGain();
    osc1Gain.gain.value = 0.5;
    const osc2Gain = ctx.createGain();
    osc2Gain.gain.value = 0.3;

    this.oscillator1.connect(osc1Gain);
    this.oscillator2.connect(osc2Gain);
    osc1Gain.connect(this.filter);
    osc2Gain.connect(this.filter);
    this.filter.connect(this.distortion);
    this.distortion.connect(this.filter2);
    this.filter2.connect(this.ampEnvelope!);

    this.ampEnvelope!.gain.linearRampToValueAtTime(GUITAR_DEFAULTS.distorted.volume, now + 0.005);

    this.oscillator1.start(now);
    this.oscillator2.start(now);
  }

  private createAcousticGuitar(frequency: number, now: number): void {
    const ctx = this.audioContext!;

    const bufferSize = ctx.sampleRate * 0.05;
    const noiseBuffer = ctx.createBuffer(1, bufferSize, ctx.sampleRate);
    const data = noiseBuffer.getChannelData(0);

    for (let i = 0; i < bufferSize; i++) {
      data[i] = (Math.random() * 2 - 1) * (1 - i / bufferSize);
    }

    this.noiseBuffer = ctx.createBufferSource();
    this.noiseBuffer.buffer = noiseBuffer;

    this.oscillator1 = ctx.createOscillator();
    this.oscillator1.type = 'triangle';
    this.oscillator1.frequency.setValueAtTime(frequency, now);

    const delayTime = 1 / frequency;
    this.delayNode = ctx.createDelay(1);
    this.delayNode.delayTime.setValueAtTime(delayTime, now);

    this.feedbackGain = ctx.createGain();
    this.feedbackGain.gain.setValueAtTime(0.7, now);

    this.filter = ctx.createBiquadFilter();
    this.filter.type = 'lowpass';
    this.filter.frequency.setValueAtTime(frequency * 6, now);
    this.filter.frequency.exponentialRampToValueAtTime(frequency * 2, now + 0.5);
    this.filter.Q.setValueAtTime(0.5, now);

    this.filter2 = ctx.createBiquadFilter();
    this.filter2.type = 'peaking';
    this.filter2.frequency.setValueAtTime(400, now);
    this.filter2.Q.setValueAtTime(2, now);
    this.filter2.gain.setValueAtTime(6, now);

    const noiseGain = ctx.createGain();
    noiseGain.gain.setValueAtTime(0.8, now);
    noiseGain.gain.exponentialRampToValueAtTime(0.01, now + 0.1);

    const oscGain = ctx.createGain();
    oscGain.gain.setValueAtTime(0, now);
    oscGain.gain.linearRampToValueAtTime(0.5, now + 0.02);

    this.noiseBuffer.connect(noiseGain);
    this.oscillator1.connect(oscGain);

    noiseGain.connect(this.filter);
    oscGain.connect(this.filter);
    this.filter.connect(this.delayNode);
    this.delayNode.connect(this.feedbackGain);
    this.feedbackGain.connect(this.delayNode);
    this.filter.connect(this.filter2);
    this.filter2.connect(this.ampEnvelope!);

    this.ampEnvelope!.gain.linearRampToValueAtTime(GUITAR_DEFAULTS.acoustic.volume, now + 0.002);
    this.ampEnvelope!.gain.exponentialRampToValueAtTime(GUITAR_DEFAULTS.acoustic.volume * 0.3, now + 0.3);

    this.noiseBuffer.start(now);
    this.oscillator1.start(now);
  }

  private createMutedGuitar(frequency: number, now: number): void {
    const ctx = this.audioContext!;

    this.oscillator1 = ctx.createOscillator();
    this.oscillator1.type = 'square';
    this.oscillator1.frequency.setValueAtTime(frequency, now);

    this.oscillator2 = ctx.createOscillator();
    this.oscillator2.type = 'triangle';
    this.oscillator2.frequency.setValueAtTime(frequency, now);

    this.filter = ctx.createBiquadFilter();
    this.filter.type = 'lowpass';
    this.filter.frequency.setValueAtTime(frequency * 2, now);
    this.filter.Q.setValueAtTime(3, now);

    const osc1Gain = ctx.createGain();
    osc1Gain.gain.value = 0.4;
    const osc2Gain = ctx.createGain();
    osc2Gain.gain.value = 0.5;

    this.oscillator1.connect(osc1Gain);
    this.oscillator2.connect(osc2Gain);
    osc1Gain.connect(this.filter);
    osc2Gain.connect(this.filter);
    this.filter.connect(this.ampEnvelope!);

    this.ampEnvelope!.gain.linearRampToValueAtTime(GUITAR_DEFAULTS.muted.volume, now + 0.002);
    this.ampEnvelope!.gain.exponentialRampToValueAtTime(0.01, now + 0.08);

    this.oscillator1.start(now);
    this.oscillator2.start(now);
  }
}

// Singleton instance
export const guitarSynthesizer = new GuitarSynthesizer();
