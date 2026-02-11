/**
 * BassSynthesizer generates bass sounds using Web Audio API synthesis.
 *
 * Bass styles:
 * - Sub bass: Pure sine wave for deep low end
 * - Synth bass: Saw/square with filter for classic synth sound
 * - Pluck bass: Short attack with filter envelope for plucky sound
 * - Wobble bass: LFO-modulated filter for dubstep-style wobble
 */

import { MonophonicSynthesizer } from './MonophonicSynthesizer';

export type BassStyle = 'sub' | 'synth' | 'pluck' | 'wobble';

export interface BassConfig {
  style: BassStyle;
  volume: number;
  octaveShift: number;
  glide: number;
}

const BASS_DEFAULTS: Record<BassStyle, Omit<BassConfig, 'style'>> = {
  sub: { volume: 0.8, octaveShift: -2, glide: 0.05 },
  synth: { volume: 0.7, octaveShift: -1, glide: 0.03 },
  pluck: { volume: 0.8, octaveShift: -1, glide: 0 },
  wobble: { volume: 0.6, octaveShift: -1, glide: 0.05 },
};

const BASS_RANGE = {
  min: 41,   // E1
  max: 165,  // E3
};

export class BassSynthesizer extends MonophonicSynthesizer<BassStyle> {
  // Bass-specific nodes
  private subOscillator: OscillatorNode | null = null;
  private lfo: OscillatorNode | null = null;
  private lfoGain: GainNode | null = null;

  constructor() {
    super('synth');
    this.octaveShift = -1;
    this.glideTime = 0.03;
  }

  protected get logTag(): string { return 'BassSynth'; }

  get frequencyRange(): { min: number; max: number } {
    return BASS_RANGE;
  }

  protected applyStyleDefaults(style: BassStyle): void {
    const defaults = BASS_DEFAULTS[style];
    this.octaveShift = defaults.octaveShift;
    this.glideTime = defaults.glide;
  }

  protected createSoundForStyle(frequency: number, now: number): void {
    switch (this.style) {
      case 'sub': this.createSubBass(frequency, now); break;
      case 'synth': this.createSynthBass(frequency, now); break;
      case 'pluck': this.createPluckBass(frequency, now); break;
      case 'wobble': this.createWobbleBass(frequency, now); break;
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
      const detunedFreq = this.style === 'synth' ? frequency * 1.005 : frequency;
      this.oscillator2.frequency.linearRampToValueAtTime(detunedFreq, glideEnd);
    }
    if (this.subOscillator) {
      this.subOscillator.frequency.linearRampToValueAtTime(frequency / 2, glideEnd);
    }

    if (this.filter && (this.style === 'synth' || this.style === 'wobble')) {
      this.filter.frequency.linearRampToValueAtTime(frequency * 4, glideEnd);
    }

    this.currentFrequency = frequency;
  }

  protected cleanupAllNodes(): void {
    try {
      this.oscillator1?.stop();
      this.oscillator2?.stop();
      this.subOscillator?.stop();
      this.lfo?.stop();
    } catch {
      // Ignore errors from already stopped oscillators
    }

    this.oscillator1?.disconnect();
    this.oscillator2?.disconnect();
    this.subOscillator?.disconnect();
    this.filter?.disconnect();
    this.ampEnvelope?.disconnect();
    this.lfo?.disconnect();
    this.lfoGain?.disconnect();

    this.oscillator1 = null;
    this.oscillator2 = null;
    this.subOscillator = null;
    this.filter = null;
    this.ampEnvelope = null;
    this.lfo = null;
    this.lfoGain = null;
  }

  // ==================== Style-specific sound creation ====================

  private createSubBass(frequency: number, now: number): void {
    const ctx = this.audioContext!;

    this.oscillator1 = ctx.createOscillator();
    this.oscillator1.type = 'sine';
    this.oscillator1.frequency.setValueAtTime(frequency, now);

    this.oscillator1.connect(this.ampEnvelope!);
    this.ampEnvelope!.gain.linearRampToValueAtTime(BASS_DEFAULTS.sub.volume, now + 0.02);

    this.oscillator1.start(now);
  }

  private createSynthBass(frequency: number, now: number): void {
    const ctx = this.audioContext!;

    this.oscillator1 = ctx.createOscillator();
    this.oscillator1.type = 'sawtooth';
    this.oscillator1.frequency.setValueAtTime(frequency, now);

    this.oscillator2 = ctx.createOscillator();
    this.oscillator2.type = 'square';
    this.oscillator2.frequency.setValueAtTime(frequency * 1.005, now);

    this.subOscillator = ctx.createOscillator();
    this.subOscillator.type = 'sine';
    this.subOscillator.frequency.setValueAtTime(frequency / 2, now);

    this.filter = ctx.createBiquadFilter();
    this.filter.type = 'lowpass';
    this.filter.frequency.setValueAtTime(frequency * 4, now);
    this.filter.Q.setValueAtTime(2, now);

    const osc1Gain = ctx.createGain();
    osc1Gain.gain.value = 0.4;
    const osc2Gain = ctx.createGain();
    osc2Gain.gain.value = 0.3;
    const subGain = ctx.createGain();
    subGain.gain.value = 0.5;

    this.oscillator1.connect(osc1Gain);
    this.oscillator2.connect(osc2Gain);
    this.subOscillator.connect(subGain);

    osc1Gain.connect(this.filter);
    osc2Gain.connect(this.filter);
    subGain.connect(this.filter);

    this.filter.connect(this.ampEnvelope!);

    this.ampEnvelope!.gain.linearRampToValueAtTime(BASS_DEFAULTS.synth.volume, now + 0.01);

    this.oscillator1.start(now);
    this.oscillator2.start(now);
    this.subOscillator.start(now);
  }

  private createPluckBass(frequency: number, now: number): void {
    const ctx = this.audioContext!;

    this.oscillator1 = ctx.createOscillator();
    this.oscillator1.type = 'sawtooth';
    this.oscillator1.frequency.setValueAtTime(frequency, now);

    this.subOscillator = ctx.createOscillator();
    this.subOscillator.type = 'sine';
    this.subOscillator.frequency.setValueAtTime(frequency / 2, now);

    this.filter = ctx.createBiquadFilter();
    this.filter.type = 'lowpass';
    this.filter.frequency.setValueAtTime(frequency * 8, now);
    this.filter.frequency.exponentialRampToValueAtTime(frequency * 2, now + 0.15);
    this.filter.Q.setValueAtTime(4, now);

    const oscGain = ctx.createGain();
    oscGain.gain.value = 0.6;
    const subGain = ctx.createGain();
    subGain.gain.value = 0.5;

    this.oscillator1.connect(oscGain);
    this.subOscillator.connect(subGain);
    oscGain.connect(this.filter);
    subGain.connect(this.filter);
    this.filter.connect(this.ampEnvelope!);

    this.ampEnvelope!.gain.linearRampToValueAtTime(BASS_DEFAULTS.pluck.volume, now + 0.005);
    this.ampEnvelope!.gain.exponentialRampToValueAtTime(BASS_DEFAULTS.pluck.volume * 0.6, now + 0.1);

    this.oscillator1.start(now);
    this.subOscillator.start(now);
  }

  private createWobbleBass(frequency: number, now: number): void {
    const ctx = this.audioContext!;

    this.oscillator1 = ctx.createOscillator();
    this.oscillator1.type = 'sawtooth';
    this.oscillator1.frequency.setValueAtTime(frequency, now);

    this.oscillator2 = ctx.createOscillator();
    this.oscillator2.type = 'square';
    this.oscillator2.frequency.setValueAtTime(frequency, now);

    this.filter = ctx.createBiquadFilter();
    this.filter.type = 'lowpass';
    this.filter.frequency.setValueAtTime(frequency * 6, now);
    this.filter.Q.setValueAtTime(8, now);

    this.lfo = ctx.createOscillator();
    this.lfo.type = 'sine';
    this.lfo.frequency.setValueAtTime(4, now);

    this.lfoGain = ctx.createGain();
    this.lfoGain.gain.setValueAtTime(frequency * 4, now);

    this.lfo.connect(this.lfoGain);
    this.lfoGain.connect(this.filter.frequency);

    const osc1Gain = ctx.createGain();
    osc1Gain.gain.value = 0.5;
    const osc2Gain = ctx.createGain();
    osc2Gain.gain.value = 0.3;

    this.oscillator1.connect(osc1Gain);
    this.oscillator2.connect(osc2Gain);
    osc1Gain.connect(this.filter);
    osc2Gain.connect(this.filter);
    this.filter.connect(this.ampEnvelope!);

    this.ampEnvelope!.gain.linearRampToValueAtTime(BASS_DEFAULTS.wobble.volume, now + 0.02);

    this.oscillator1.start(now);
    this.oscillator2.start(now);
    this.lfo.start(now);
  }
}

// Singleton instance
export const bassSynthesizer = new BassSynthesizer();
