/**
 * BassDemoPlayer - Plays demo bass lines with different bass styles.
 *
 * Supports two synth types:
 * - Electronic: Oscillator-based synthesis (Sub, Synth, Pluck, Wobble)
 * - Sampled: Real bass guitar samples (Finger, Pick, Slap, Muted)
 */

import type { BassStyle, BassSynthType, RealisticBassStyle } from '../types';
import { realisticBassSampler, type SampledBassStyle } from './RealisticBassSampler';

export { SAMPLED_BASS_STYLE_CONFIG } from './RealisticBassSampler';

// Simple 4-beat bass pattern (root notes)
const DEMO_PATTERN = [
  { beat: 0, note: 55 },    // A1
  { beat: 1, note: 0 },     // rest
  { beat: 2, note: 73.42 }, // D2
  { beat: 3, note: 55 },    // A1
];

class BassDemoPlayer {
  private audioContext: AudioContext | null = null;
  private masterGain: GainNode | null = null;

  // Synth type and styles
  private synthType: BassSynthType = 'sampled';
  private currentStyle: BassStyle = 'synth';
  private realisticStyle: RealisticBassStyle = 'finger';

  // Playback state
  private isPlaying = false;
  private bpm = 120;
  private intervalId: number | null = null;
  private currentBeat = 0;
  private onBeatCallback: ((beat: number) => void) | null = null;

  // Active oscillators for stopping (electronic only)
  private activeOsc: OscillatorNode | null = null;
  private lfoOsc: OscillatorNode | null = null;

  // Sampler loading state
  private samplerLoaded = false;
  private samplerLoading = false;

  /**
   * Initialize with audio context.
   */
  initialize(audioContext: AudioContext): void {
    this.audioContext = audioContext;
    this.masterGain = audioContext.createGain();
    this.masterGain.gain.value = 0.6;
    this.masterGain.connect(audioContext.destination);
  }

  /**
   * Set synth type (electronic or sampled).
   */
  setSynthType(type: BassSynthType): void {
    this.synthType = type;
  }

  /**
   * Get current synth type.
   */
  getSynthType(): BassSynthType {
    return this.synthType;
  }

  /**
   * Set the electronic bass style.
   */
  setStyle(style: BassStyle): void {
    this.currentStyle = style;
    this.synthType = 'electronic';
  }

  /**
   * Set the realistic (sampled) bass style.
   */
  setRealisticStyle(style: RealisticBassStyle): void {
    this.realisticStyle = style;
    this.synthType = 'sampled';
    realisticBassSampler.setStyle(style as SampledBassStyle);
  }

  /**
   * Get current electronic style.
   */
  getStyle(): BassStyle {
    return this.currentStyle;
  }

  /**
   * Get current realistic style.
   */
  getRealisticStyle(): RealisticBassStyle {
    return this.realisticStyle;
  }

  /**
   * Set master volume (0-1).
   */
  setVolume(volume: number): void {
    if (this.masterGain) {
      this.masterGain.gain.value = Math.max(0, Math.min(1, volume));
    }
    realisticBassSampler.setVolume(volume);
  }

  /**
   * Load sampler (call before playing sampled bass).
   */
  async loadSampler(): Promise<void> {
    if (this.samplerLoaded || this.samplerLoading) return;

    this.samplerLoading = true;
    try {
      await realisticBassSampler.load();
      this.samplerLoaded = true;
      console.log('[BassDemoPlayer] Sampler loaded');
    } catch (error) {
      console.error('[BassDemoPlayer] Failed to load sampler:', error);
    } finally {
      this.samplerLoading = false;
    }
  }

  /**
   * Check if sampler is loaded.
   */
  isSamplerLoaded(): boolean {
    return this.samplerLoaded;
  }

  /**
   * Set BPM.
   */
  setBpm(bpm: number): void {
    this.bpm = bpm;
    if (this.isPlaying) {
      this.stop();
      this.start();
    }
  }

  /**
   * Set beat callback.
   */
  setOnBeat(callback: (beat: number) => void): void {
    this.onBeatCallback = callback;
  }

  /**
   * Start playing the demo bass line.
   */
  async start(): Promise<void> {
    if (this.isPlaying || !this.audioContext) return;

    // Load sampler if using sampled bass
    if (this.synthType === 'sampled' && !this.samplerLoaded) {
      await this.loadSampler();
    }

    this.isPlaying = true;
    this.currentBeat = 0;

    const beatInterval = (60 / this.bpm) * 1000;

    this.playBeat(this.currentBeat);
    this.onBeatCallback?.(this.currentBeat);

    this.intervalId = window.setInterval(() => {
      this.currentBeat = (this.currentBeat + 1) % 4;
      this.playBeat(this.currentBeat);
      this.onBeatCallback?.(this.currentBeat);
    }, beatInterval);
  }

  /**
   * Stop playing.
   */
  stop(): void {
    if (this.intervalId !== null) {
      clearInterval(this.intervalId);
      this.intervalId = null;
    }
    this.stopCurrentNote();
    this.isPlaying = false;
    this.currentBeat = 0;

    // Release sampler notes
    if (this.synthType === 'sampled') {
      realisticBassSampler.releaseAllNotes();
    }
  }

  /**
   * Check if playing.
   */
  getIsPlaying(): boolean {
    return this.isPlaying;
  }

  /**
   * Play note for a specific beat.
   */
  private playBeat(beat: number): void {
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

  /**
   * Play a sampled bass note using Tone.js.
   */
  private playSampledNote(frequency: number, velocity: number = 0.7): void {
    if (!this.samplerLoaded) return;
    realisticBassSampler.playNote(frequency, velocity);
  }

  /**
   * Stop any currently playing note.
   */
  private stopCurrentNote(): void {
    if (this.activeOsc) {
      try {
        this.activeOsc.stop();
      } catch { /* already stopped */ }
      this.activeOsc = null;
    }
    if (this.lfoOsc) {
      try {
        this.lfoOsc.stop();
      } catch { /* already stopped */ }
      this.lfoOsc = null;
    }
  }

  /**
   * Play a bass note with current style.
   */
  private playNote(frequency: number): void {
    if (!this.audioContext || !this.masterGain) return;

    this.stopCurrentNote();

    const now = this.audioContext.currentTime;
    const duration = (60 / this.bpm) * 0.8; // 80% of beat length

    switch (this.currentStyle) {
      case 'sub':
        this.playSub(frequency, now, duration);
        break;
      case 'synth':
        this.playSynth(frequency, now, duration);
        break;
      case 'pluck':
        this.playPluck(frequency, now, duration);
        break;
      case 'wobble':
        this.playWobble(frequency, now, duration);
        break;
    }
  }

  /**
   * Sub bass - pure sine wave.
   */
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

  /**
   * Synth bass - sawtooth with filter.
   */
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

  /**
   * Pluck bass - fast attack/decay.
   */
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

  /**
   * Wobble bass - LFO modulated filter.
   */
  private playWobble(freq: number, time: number, duration: number): void {
    if (!this.audioContext || !this.masterGain) return;

    const osc = this.audioContext.createOscillator();
    const filter = this.audioContext.createBiquadFilter();
    const gain = this.audioContext.createGain();

    // LFO for wobble
    const lfo = this.audioContext.createOscillator();
    const lfoGain = this.audioContext.createGain();

    osc.type = 'sawtooth';
    osc.frequency.value = freq;

    filter.type = 'lowpass';
    filter.frequency.value = freq * 4;
    filter.Q.value = 8;

    // LFO modulates filter frequency
    lfo.type = 'sine';
    lfo.frequency.value = 4; // 4 Hz wobble rate
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

  /**
   * Play a single preview note.
   */
  async playPreview(): Promise<void> {
    if (!this.audioContext) return;

    if (this.synthType === 'sampled') {
      if (!this.samplerLoaded) {
        await this.loadSampler();
      }
      this.playSampledNote(55, 0.7); // A1
      setTimeout(() => realisticBassSampler.releaseAllNotes(), 500);
    } else {
      this.playNote(55); // A1
      setTimeout(() => this.stopCurrentNote(), 500);
    }
  }

  /**
   * Dispose resources.
   */
  dispose(): void {
    this.stop();
    this.masterGain?.disconnect();
    this.masterGain = null;
    this.audioContext = null;
    realisticBassSampler.dispose();
    this.samplerLoaded = false;
  }
}

export const bassDemoPlayer = new BassDemoPlayer();
