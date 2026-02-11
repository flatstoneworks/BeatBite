import type { BassStyle, BassSynthType, RealisticBassStyle } from '../../types';
import { realisticBassSampler, type SampledBassStyle } from '../RealisticBassSampler';
import { AbstractDemoPlayer } from './AbstractDemoPlayer';

export { SAMPLED_BASS_STYLE_CONFIG } from '../RealisticBassSampler';

const DEMO_PATTERN = [
  { beat: 0, note: 55 },    // A1
  { beat: 1, note: 0 },     // rest
  { beat: 2, note: 73.42 }, // D2
  { beat: 3, note: 55 },    // A1
];

class BassDemoPlayer extends AbstractDemoPlayer {
  private synthType: BassSynthType = 'sampled';
  private currentStyle: BassStyle = 'synth';
  private realisticStyle: RealisticBassStyle = 'finger';

  // Active oscillators for stopping (electronic only)
  private activeOsc: OscillatorNode | null = null;
  private lfoOsc: OscillatorNode | null = null;

  protected get logTag(): string { return 'BassDemoPlayer'; }
  protected get defaultVolume(): number { return 0.6; }

  protected async loadSamplerImpl(): Promise<void> {
    await realisticBassSampler.load();
  }

  protected async beforeStart(): Promise<void> {
    if (this.synthType === 'sampled' && !this.samplerLoaded) {
      await this.loadSampler();
    }
  }

  protected onStop(): void {
    this.stopCurrentNote();
    if (this.synthType === 'sampled') {
      realisticBassSampler.releaseAllNotes();
    }
  }

  protected onDispose(): void {
    realisticBassSampler.dispose();
  }

  protected onVolumeChange(volume: number): void {
    realisticBassSampler.setVolume(volume);
  }

  // ============ Synth Type & Style ============

  setSynthType(type: BassSynthType): void {
    this.synthType = type;
  }

  getSynthType(): BassSynthType {
    return this.synthType;
  }

  setStyle(style: BassStyle): void {
    this.currentStyle = style;
    this.synthType = 'electronic';
  }

  setRealisticStyle(style: RealisticBassStyle): void {
    this.realisticStyle = style;
    this.synthType = 'sampled';
    realisticBassSampler.setStyle(style as SampledBassStyle);
  }

  getStyle(): BassStyle {
    return this.currentStyle;
  }

  getRealisticStyle(): RealisticBassStyle {
    return this.realisticStyle;
  }

  // ============ Beat Playback ============

  protected playBeat(beat: number): void {
    const event = DEMO_PATTERN.find(e => e.beat === beat);
    if (event && event.note > 0) {
      if (this.synthType === 'sampled') {
        this.playSampledNote(event.note);
      } else {
        this.playNote(event.note);
      }
    } else {
      this.stopCurrentNote();
      if (this.synthType === 'sampled') {
        realisticBassSampler.releaseAllNotes();
      }
    }
  }

  private playSampledNote(frequency: number, velocity: number = 0.7): void {
    if (!this.samplerLoaded) return;
    realisticBassSampler.playNote(frequency, velocity);
  }

  private stopCurrentNote(): void {
    if (this.activeOsc) {
      try { this.activeOsc.stop(); } catch { /* already stopped */ }
      this.activeOsc = null;
    }
    if (this.lfoOsc) {
      try { this.lfoOsc.stop(); } catch { /* already stopped */ }
      this.lfoOsc = null;
    }
  }

  private playNote(frequency: number): void {
    if (!this.audioContext || !this.masterGain) return;

    this.stopCurrentNote();

    const now = this.audioContext.currentTime;
    const duration = (60 / this.bpm) * 0.8;

    switch (this.currentStyle) {
      case 'sub': this.playSub(frequency, now, duration); break;
      case 'synth': this.playSynth(frequency, now, duration); break;
      case 'pluck': this.playPluck(frequency, now, duration); break;
      case 'wobble': this.playWobble(frequency, now, duration); break;
    }
  }

  // ============ Electronic Synthesis ============

  private playSub(freq: number, time: number, duration: number): void {
    if (!this.audioContext || !this.masterGain) return;

    const osc = this.audioContext.createOscillator();
    const gain = this.audioContext.createGain();

    osc.type = 'sine';
    osc.frequency.value = freq;

    gain.gain.setValueAtTime(0, time);
    gain.gain.linearRampToValueAtTime(0.8, time + 0.02);
    gain.gain.setValueAtTime(0.8, time + duration - 0.05);
    gain.gain.linearRampToValueAtTime(0, time + duration);

    osc.connect(gain);
    gain.connect(this.masterGain);

    osc.start(time);
    osc.stop(time + duration);

    this.activeOsc = osc;
  }

  private playSynth(freq: number, time: number, duration: number): void {
    if (!this.audioContext || !this.masterGain) return;

    const osc = this.audioContext.createOscillator();
    const filter = this.audioContext.createBiquadFilter();
    const gain = this.audioContext.createGain();

    osc.type = 'sawtooth';
    osc.frequency.value = freq;

    filter.type = 'lowpass';
    filter.frequency.setValueAtTime(freq * 8, time);
    filter.frequency.exponentialRampToValueAtTime(freq * 2, time + duration * 0.5);
    filter.Q.value = 2;

    gain.gain.setValueAtTime(0, time);
    gain.gain.linearRampToValueAtTime(0.6, time + 0.01);
    gain.gain.setValueAtTime(0.5, time + duration - 0.05);
    gain.gain.linearRampToValueAtTime(0, time + duration);

    osc.connect(filter);
    filter.connect(gain);
    gain.connect(this.masterGain);

    osc.start(time);
    osc.stop(time + duration);

    this.activeOsc = osc;
  }

  private playPluck(freq: number, time: number, duration: number): void {
    if (!this.audioContext || !this.masterGain) return;

    const osc = this.audioContext.createOscillator();
    const filter = this.audioContext.createBiquadFilter();
    const gain = this.audioContext.createGain();

    osc.type = 'square';
    osc.frequency.value = freq;

    filter.type = 'lowpass';
    filter.frequency.setValueAtTime(freq * 20, time);
    filter.frequency.exponentialRampToValueAtTime(freq * 2, time + 0.1);
    filter.Q.value = 5;

    gain.gain.setValueAtTime(0.7, time);
    gain.gain.exponentialRampToValueAtTime(0.001, time + duration * 0.7);

    osc.connect(filter);
    filter.connect(gain);
    gain.connect(this.masterGain);

    osc.start(time);
    osc.stop(time + duration);

    this.activeOsc = osc;
  }

  private playWobble(freq: number, time: number, duration: number): void {
    if (!this.audioContext || !this.masterGain) return;

    const osc = this.audioContext.createOscillator();
    const filter = this.audioContext.createBiquadFilter();
    const gain = this.audioContext.createGain();
    const lfo = this.audioContext.createOscillator();
    const lfoGain = this.audioContext.createGain();

    osc.type = 'sawtooth';
    osc.frequency.value = freq;

    filter.type = 'lowpass';
    filter.frequency.value = freq * 4;
    filter.Q.value = 8;

    lfo.type = 'sine';
    lfo.frequency.value = 4;
    lfoGain.gain.value = freq * 3;

    lfo.connect(lfoGain);
    lfoGain.connect(filter.frequency);

    gain.gain.setValueAtTime(0, time);
    gain.gain.linearRampToValueAtTime(0.6, time + 0.02);
    gain.gain.setValueAtTime(0.5, time + duration - 0.05);
    gain.gain.linearRampToValueAtTime(0, time + duration);

    osc.connect(filter);
    filter.connect(gain);
    gain.connect(this.masterGain);

    osc.start(time);
    lfo.start(time);
    osc.stop(time + duration);
    lfo.stop(time + duration);

    this.activeOsc = osc;
    this.lfoOsc = lfo;
  }

  // ============ Preview ============

  async playPreview(): Promise<void> {
    if (!this.audioContext) return;

    if (this.synthType === 'sampled') {
      if (!this.samplerLoaded) {
        await this.loadSampler();
      }
      this.playSampledNote(55, 0.7);
      setTimeout(() => realisticBassSampler.releaseAllNotes(), 500);
    } else {
      this.playNote(55);
      setTimeout(() => this.stopCurrentNote(), 500);
    }
  }
}

export const bassDemoPlayer = new BassDemoPlayer();
