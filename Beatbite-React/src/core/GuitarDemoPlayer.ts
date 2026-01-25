/**
 * GuitarDemoPlayer - Plays demo guitar riffs with different guitar styles.
 *
 * Supports three synth types:
 * - Electronic: Oscillator-based synthesis (Clean, Distorted, Acoustic, Muted)
 * - Sampled: Real acoustic guitar samples (Clean, Acoustic, Muted, Bright)
 * - Electric: Real electric guitar samples with effects (Clean, Crunch, Overdrive, Distortion)
 */

import type { GuitarStyle, GuitarSynthType, RealisticGuitarStyle, ElectricGuitarStyle } from '../types';
import { realisticGuitarSampler } from './RealisticGuitarSampler';
import { electricGuitarSampler } from './ElectricGuitarSampler';

// Simple 4-beat guitar pattern (power chord root notes)
const DEMO_PATTERN = [
  { beat: 0, note: 110 },   // A2
  { beat: 1, note: 110 },   // A2
  { beat: 2, note: 146.83 }, // D3
  { beat: 3, note: 110 },   // A2
];

class GuitarDemoPlayer {
  private audioContext: AudioContext | null = null;
  private masterGain: GainNode | null = null;

  // Synth type and styles
  private synthType: GuitarSynthType = 'sampled';
  private currentStyle: GuitarStyle = 'clean';
  private realisticStyle: RealisticGuitarStyle = 'acoustic';
  private electricStyle: ElectricGuitarStyle = 'clean';

  // Playback state
  private isPlaying = false;
  private bpm = 120;
  private intervalId: number | null = null;
  private currentBeat = 0;
  private onBeatCallback: ((beat: number) => void) | null = null;

  // Active nodes for stopping (electronic only)
  private activeOsc: OscillatorNode | null = null;

  // Sampler loading state
  private samplerLoaded = false;
  private samplerLoading = false;
  private electricSamplerLoaded = false;
  private electricSamplerLoading = false;

  /**
   * Initialize with audio context.
   */
  initialize(audioContext: AudioContext): void {
    this.audioContext = audioContext;
    this.masterGain = audioContext.createGain();
    this.masterGain.gain.value = 0.5;
    this.masterGain.connect(audioContext.destination);
  }

  /**
   * Set synth type (electronic or sampled).
   */
  setSynthType(type: GuitarSynthType): void {
    this.synthType = type;
  }

  /**
   * Get current synth type.
   */
  getSynthType(): GuitarSynthType {
    return this.synthType;
  }

  /**
   * Set the electronic guitar style.
   */
  setStyle(style: GuitarStyle): void {
    this.currentStyle = style;
    this.synthType = 'electronic';
  }

  /**
   * Set the sampled guitar style.
   */
  setRealisticStyle(style: RealisticGuitarStyle): void {
    this.realisticStyle = style;
    this.synthType = 'sampled';
    realisticGuitarSampler.setStyle(style);
  }

  /**
   * Get current electronic style.
   */
  getStyle(): GuitarStyle {
    return this.currentStyle;
  }

  /**
   * Get current sampled style.
   */
  getRealisticStyle(): RealisticGuitarStyle {
    return this.realisticStyle;
  }

  /**
   * Set the electric guitar style.
   */
  setElectricStyle(style: ElectricGuitarStyle): void {
    this.electricStyle = style;
    this.synthType = 'electric';
    electricGuitarSampler.setStyle(style);
    console.log(`[GuitarDemoPlayer] Set electric style: ${style}`);
  }

  /**
   * Get current electric style.
   */
  getElectricStyle(): ElectricGuitarStyle {
    return this.electricStyle;
  }

  /**
   * Set master volume (0-1).
   */
  setVolume(volume: number): void {
    if (this.masterGain) {
      this.masterGain.gain.value = Math.max(0, Math.min(1, volume));
    }
    realisticGuitarSampler.setVolume(volume);
    electricGuitarSampler.setVolume(volume);
  }

  /**
   * Load sampler (call before playing sampled guitar).
   */
  async loadSampler(): Promise<void> {
    if (this.samplerLoaded || this.samplerLoading) return;

    this.samplerLoading = true;
    try {
      await realisticGuitarSampler.load();
      this.samplerLoaded = true;
      console.log('[GuitarDemoPlayer] Sampler loaded');
    } catch (error) {
      console.error('[GuitarDemoPlayer] Failed to load sampler:', error);
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
   * Load electric guitar sampler (call before playing electric guitar).
   */
  async loadElectricSampler(): Promise<void> {
    if (this.electricSamplerLoaded || this.electricSamplerLoading) return;

    this.electricSamplerLoading = true;
    try {
      await electricGuitarSampler.load();
      this.electricSamplerLoaded = true;
      console.log('[GuitarDemoPlayer] Electric sampler loaded');
    } catch (error) {
      console.error('[GuitarDemoPlayer] Failed to load electric sampler:', error);
    } finally {
      this.electricSamplerLoading = false;
    }
  }

  /**
   * Check if electric sampler is loaded.
   */
  isElectricSamplerLoaded(): boolean {
    return this.electricSamplerLoaded;
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
   * Start playing the demo guitar riff.
   */
  async start(): Promise<void> {
    if (this.isPlaying || !this.audioContext) return;

    // Load sampler if using sampled guitar
    if (this.synthType === 'sampled' && !this.samplerLoaded) {
      await this.loadSampler();
    }

    // Load electric sampler if using electric guitar
    if (this.synthType === 'electric' && !this.electricSamplerLoaded) {
      await this.loadElectricSampler();
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
      realisticGuitarSampler.releaseAllNotes();
    }
    if (this.synthType === 'electric') {
      electricGuitarSampler.releaseAllNotes();
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
      } else if (this.synthType === 'electric') {
        this.playElectricNote(event.note);
      } else {
        this.playNote(event.note);
      }
    }
  }

  /**
   * Play a sampled guitar note using Tone.js.
   */
  private playSampledNote(frequency: number, velocity: number = 0.7): void {
    if (!this.samplerLoaded) return;
    realisticGuitarSampler.releaseAllNotes();
    realisticGuitarSampler.playNote(frequency, velocity);
  }

  /**
   * Play an electric guitar note using Tone.js.
   */
  private playElectricNote(frequency: number, velocity: number = 0.7): void {
    if (!this.electricSamplerLoaded) {
      console.log('[GuitarDemoPlayer] Electric sampler not loaded');
      return;
    }
    electricGuitarSampler.releaseAllNotes();
    electricGuitarSampler.playNote(frequency, velocity);
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
  }

  /**
   * Play a guitar note with current style.
   */
  private playNote(frequency: number): void {
    if (!this.audioContext || !this.masterGain) return;

    const now = this.audioContext.currentTime;
    const duration = (60 / this.bpm) * 0.7;

    switch (this.currentStyle) {
      case 'clean':
        this.playClean(frequency, now, duration);
        break;
      case 'distorted':
        this.playDistorted(frequency, now, duration);
        break;
      case 'acoustic':
        this.playAcoustic(frequency, now, duration);
        break;
      case 'muted':
        this.playMuted(frequency, now, duration);
        break;
    }
  }

  /**
   * Clean guitar - sine with harmonics.
   */
  private playClean(freq: number, time: number, duration: number): void {
    if (!this.audioContext || !this.masterGain) return;

    const osc = this.audioContext.createOscillator();
    const osc2 = this.audioContext.createOscillator();
    const gain = this.audioContext.createGain();

    osc.type = 'sine';
    osc.frequency.value = freq;

    osc2.type = 'sine';
    osc2.frequency.value = freq * 2; // Octave harmonic

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

  /**
   * Distorted guitar - waveshaper distortion.
   */
  private playDistorted(freq: number, time: number, duration: number): void {
    if (!this.audioContext || !this.masterGain) return;

    const osc = this.audioContext.createOscillator();
    const distortion = this.audioContext.createWaveShaper();
    const filter = this.audioContext.createBiquadFilter();
    const gain = this.audioContext.createGain();

    osc.type = 'sawtooth';
    osc.frequency.value = freq;

    // Create distortion curve
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

  /**
   * Acoustic guitar - Karplus-Strong pluck simulation.
   */
  private playAcoustic(freq: number, time: number, duration: number): void {
    if (!this.audioContext || !this.masterGain) return;

    // Simplified pluck using noise burst + filter
    const bufferSize = this.audioContext.sampleRate * duration;
    const buffer = this.audioContext.createBuffer(1, bufferSize, this.audioContext.sampleRate);
    const data = buffer.getChannelData(0);

    // Initial noise burst
    const burstLength = Math.floor(this.audioContext.sampleRate / freq);
    for (let i = 0; i < burstLength; i++) {
      data[i] = Math.random() * 2 - 1;
    }

    // Simple decay
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

  /**
   * Muted guitar - short percussive.
   */
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

  /**
   * Play a single preview note.
   */
  async playPreview(): Promise<void> {
    if (!this.audioContext) return;

    if (this.synthType === 'sampled') {
      if (!this.samplerLoaded) {
        await this.loadSampler();
      }
      this.playSampledNote(110, 0.7); // A2
      setTimeout(() => realisticGuitarSampler.releaseAllNotes(), 500);
    } else if (this.synthType === 'electric') {
      if (!this.electricSamplerLoaded) {
        await this.loadElectricSampler();
      }
      this.playElectricNote(110, 0.7); // A2
      setTimeout(() => electricGuitarSampler.releaseAllNotes(), 500);
    } else {
      this.playNote(110); // A2
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
    realisticGuitarSampler.dispose();
    electricGuitarSampler.dispose();
    this.samplerLoaded = false;
    this.electricSamplerLoaded = false;
  }
}

export const guitarDemoPlayer = new GuitarDemoPlayer();
