import type { GuitarStyle, GuitarSynthType, RealisticGuitarStyle, ElectricGuitarStyle } from '../../types';
import { realisticGuitarSampler } from '../RealisticGuitarSampler';
import { electricGuitarSampler } from '../ElectricGuitarSampler';
import { logger } from '../utils/logger';
import { AbstractDemoPlayer } from './AbstractDemoPlayer';

const DEMO_PATTERN = [
  { beat: 0, note: 110 },    // A2
  { beat: 1, note: 110 },    // A2
  { beat: 2, note: 146.83 }, // D3
  { beat: 3, note: 110 },    // A2
];

class GuitarDemoPlayer extends AbstractDemoPlayer {
  private synthType: GuitarSynthType = 'sampled';
  private currentStyle: GuitarStyle = 'clean';
  private realisticStyle: RealisticGuitarStyle = 'acoustic';
  private electricStyle: ElectricGuitarStyle = 'clean';

  // Active nodes for stopping (electronic only)
  private activeOsc: OscillatorNode | null = null;

  // Electric sampler has separate loading state
  private electricSamplerLoaded = false;
  private electricSamplerLoading = false;

  protected get logTag(): string { return 'GuitarDemoPlayer'; }
  protected get defaultVolume(): number { return 0.5; }

  protected async loadSamplerImpl(): Promise<void> {
    await realisticGuitarSampler.load();
  }

  protected async beforeStart(): Promise<void> {
    if (this.synthType === 'sampled' && !this.samplerLoaded) {
      await this.loadSampler();
    }
    if (this.synthType === 'electric' && !this.electricSamplerLoaded) {
      await this.loadElectricSampler();
    }
  }

  protected onStop(): void {
    this.stopCurrentNote();
    if (this.synthType === 'sampled') {
      realisticGuitarSampler.releaseAllNotes();
    }
    if (this.synthType === 'electric') {
      electricGuitarSampler.releaseAllNotes();
    }
  }

  protected onDispose(): void {
    realisticGuitarSampler.dispose();
    electricGuitarSampler.dispose();
    this.electricSamplerLoaded = false;
  }

  protected onVolumeChange(volume: number): void {
    realisticGuitarSampler.setVolume(volume);
    electricGuitarSampler.setVolume(volume);
  }

  // ============ Synth Type & Style ============

  setSynthType(type: GuitarSynthType): void {
    this.synthType = type;
  }

  getSynthType(): GuitarSynthType {
    return this.synthType;
  }

  setStyle(style: GuitarStyle): void {
    this.currentStyle = style;
    this.synthType = 'electronic';
  }

  setRealisticStyle(style: RealisticGuitarStyle): void {
    this.realisticStyle = style;
    this.synthType = 'sampled';
    realisticGuitarSampler.setStyle(style);
  }

  getStyle(): GuitarStyle {
    return this.currentStyle;
  }

  getRealisticStyle(): RealisticGuitarStyle {
    return this.realisticStyle;
  }

  setElectricStyle(style: ElectricGuitarStyle): void {
    this.electricStyle = style;
    this.synthType = 'electric';
    electricGuitarSampler.setStyle(style);
    logger.debug(`[GuitarDemoPlayer] Set electric style: ${style}`);
  }

  getElectricStyle(): ElectricGuitarStyle {
    return this.electricStyle;
  }

  // ============ Electric Sampler ============

  async loadElectricSampler(): Promise<void> {
    if (this.electricSamplerLoaded || this.electricSamplerLoading) return;

    this.electricSamplerLoading = true;
    try {
      await electricGuitarSampler.load();
      this.electricSamplerLoaded = true;
      logger.info('[GuitarDemoPlayer] Electric sampler loaded');
    } catch (error) {
      logger.error('[GuitarDemoPlayer] Failed to load electric sampler:', error);
    } finally {
      this.electricSamplerLoading = false;
    }
  }

  isElectricSamplerLoaded(): boolean {
    return this.electricSamplerLoaded;
  }

  // ============ Beat Playback ============

  protected playBeat(beat: number): void {
    const event = DEMO_PATTERN.find(e => e.beat === beat);
    if (event && event.note > 0) {
      if (this.synthType === 'sampled') {
        this.playSampledNote(event.note);
      } else if (this.synthType === 'electric') {
        this.playElectricNote(event.note);
      } else {
        this.playNote(event.note);
      }
    }
  }

  private playSampledNote(frequency: number, velocity: number = 0.7): void {
    if (!this.samplerLoaded) return;
    realisticGuitarSampler.releaseAllNotes();
    realisticGuitarSampler.playNote(frequency, velocity);
  }

  private playElectricNote(frequency: number, velocity: number = 0.7): void {
    if (!this.electricSamplerLoaded) {
      logger.debug('[GuitarDemoPlayer] Electric sampler not loaded');
      return;
    }
    electricGuitarSampler.releaseAllNotes();
    electricGuitarSampler.playNote(frequency, velocity);
  }

  private stopCurrentNote(): void {
    if (this.activeOsc) {
      try { this.activeOsc.stop(); } catch { /* already stopped */ }
      this.activeOsc = null;
    }
  }

  private playNote(frequency: number): void {
    if (!this.audioContext || !this.masterGain) return;

    const now = this.audioContext.currentTime;
    const duration = (60 / this.bpm) * 0.7;

    switch (this.currentStyle) {
      case 'clean': this.playClean(frequency, now, duration); break;
      case 'distorted': this.playDistorted(frequency, now, duration); break;
      case 'acoustic': this.playAcoustic(frequency, now, duration); break;
      case 'muted': this.playMuted(frequency, now, duration); break;
    }
  }

  // ============ Electronic Synthesis ============

  private playClean(freq: number, time: number, duration: number): void {
    if (!this.audioContext || !this.masterGain) return;

    const osc = this.audioContext.createOscillator();
    const osc2 = this.audioContext.createOscillator();
    const gain = this.audioContext.createGain();

    osc.type = 'sine';
    osc.frequency.value = freq;

    osc2.type = 'sine';
    osc2.frequency.value = freq * 2;

    const osc2Gain = this.audioContext.createGain();
    osc2Gain.gain.value = 0.3;

    gain.gain.setValueAtTime(0, time);
    gain.gain.linearRampToValueAtTime(0.6, time + 0.01);
    gain.gain.exponentialRampToValueAtTime(0.1, time + duration);
    gain.gain.linearRampToValueAtTime(0, time + duration + 0.05);

    osc.connect(gain);
    osc2.connect(osc2Gain);
    osc2Gain.connect(gain);
    gain.connect(this.masterGain);

    osc.start(time);
    osc2.start(time);
    osc.stop(time + duration + 0.1);
    osc2.stop(time + duration + 0.1);

    this.activeOsc = osc;
  }

  private playDistorted(freq: number, time: number, duration: number): void {
    if (!this.audioContext || !this.masterGain) return;

    const osc = this.audioContext.createOscillator();
    const distortion = this.audioContext.createWaveShaper();
    const filter = this.audioContext.createBiquadFilter();
    const gain = this.audioContext.createGain();

    osc.type = 'sawtooth';
    osc.frequency.value = freq;

    const samples = 256;
    const curve = new Float32Array(samples);
    for (let i = 0; i < samples; i++) {
      const x = (i * 2) / samples - 1;
      curve[i] = Math.tanh(x * 3);
    }
    distortion.curve = curve as any;

    filter.type = 'lowpass';
    filter.frequency.value = 3000;

    gain.gain.setValueAtTime(0, time);
    gain.gain.linearRampToValueAtTime(0.8, time + 0.005);
    gain.gain.setValueAtTime(0.7, time + duration * 0.8);
    gain.gain.linearRampToValueAtTime(0, time + duration);

    osc.connect(distortion);
    distortion.connect(filter);
    filter.connect(gain);
    gain.connect(this.masterGain);

    osc.start(time);
    osc.stop(time + duration);

    this.activeOsc = osc;
  }

  private playAcoustic(freq: number, time: number, duration: number): void {
    if (!this.audioContext || !this.masterGain) return;

    const bufferSize = this.audioContext.sampleRate * duration;
    const buffer = this.audioContext.createBuffer(1, bufferSize, this.audioContext.sampleRate);
    const data = buffer.getChannelData(0);

    const burstLength = Math.floor(this.audioContext.sampleRate / freq);
    for (let i = 0; i < burstLength; i++) {
      data[i] = Math.random() * 2 - 1;
    }

    for (let i = burstLength; i < bufferSize; i++) {
      const prev = data[i - burstLength] || 0;
      const prev2 = data[i - burstLength + 1] || 0;
      data[i] = (prev + prev2) * 0.498;
    }

    const source = this.audioContext.createBufferSource();
    source.buffer = buffer;

    const gain = this.audioContext.createGain();
    gain.gain.setValueAtTime(0.7, time);

    source.connect(gain);
    gain.connect(this.masterGain);

    source.start(time);
  }

  private playMuted(freq: number, time: number, _duration: number): void {
    if (!this.audioContext || !this.masterGain) return;

    const shortDuration = 0.08;

    const osc = this.audioContext.createOscillator();
    const filter = this.audioContext.createBiquadFilter();
    const gain = this.audioContext.createGain();

    osc.type = 'square';
    osc.frequency.value = freq;

    filter.type = 'lowpass';
    filter.frequency.value = freq * 3;
    filter.Q.value = 1;

    gain.gain.setValueAtTime(0.7, time);
    gain.gain.exponentialRampToValueAtTime(0.001, time + shortDuration);

    osc.connect(filter);
    filter.connect(gain);
    gain.connect(this.masterGain);

    osc.start(time);
    osc.stop(time + shortDuration);

    this.activeOsc = osc;
  }

  // ============ Preview ============

  async playPreview(): Promise<void> {
    if (!this.audioContext) return;

    if (this.synthType === 'sampled') {
      if (!this.samplerLoaded) {
        await this.loadSampler();
      }
      this.playSampledNote(110, 0.7);
      setTimeout(() => realisticGuitarSampler.releaseAllNotes(), 500);
    } else if (this.synthType === 'electric') {
      if (!this.electricSamplerLoaded) {
        await this.loadElectricSampler();
      }
      this.playElectricNote(110, 0.7);
      setTimeout(() => electricGuitarSampler.releaseAllNotes(), 500);
    } else {
      this.playNote(110);
    }
  }
}

export const guitarDemoPlayer = new GuitarDemoPlayer();
