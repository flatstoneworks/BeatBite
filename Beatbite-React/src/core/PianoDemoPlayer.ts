/**
 * PianoDemoPlayer - Plays demo melodies with different piano styles.
 *
 * Supports two synth types:
 * - Electronic: FM/additive synthesis (Electric, Rhodes, Synth)
 * - Sampled: Realistic Salamander Grand Piano samples (Acoustic, Bright, Warm, Honky Tonk)
 */

import type { PianoStyle, PianoSynthType, RealisticPianoStyle } from '../types';
import { realisticPianoSampler, type RealisticPianoStyle as SamplerStyle } from './RealisticPianoSampler';

export { PIANO_STYLE_CONFIG, REALISTIC_PIANO_STYLE_CONFIG, ALL_PIANO_OPTIONS } from '../types';

// Simple ascending/descending melody for demo
const DEMO_NOTES = [
  { beat: 0, note: 'C4', freq: 261.63 },
  { beat: 1, note: 'E4', freq: 329.63 },
  { beat: 2, note: 'G4', freq: 392.00 },
  { beat: 3, note: 'C5', freq: 523.25 },
];

interface StyleParams {
  attack: number;
  decay: number;
  sustain: number;
  release: number;
  harmonics: number[];
  brightness: number;
  resonance: number;
}

const STYLE_PARAMS: Record<PianoStyle, StyleParams> = {
  grand: {
    attack: 0.005,
    decay: 0.3,
    sustain: 0.6,
    release: 0.8,
    harmonics: [1.0, 0.5, 0.33, 0.25, 0.2, 0.15],
    brightness: 0.8,
    resonance: 0.3,
  },
  upright: {
    attack: 0.008,
    decay: 0.25,
    sustain: 0.5,
    release: 0.6,
    harmonics: [1.0, 0.4, 0.2, 0.1],
    brightness: 0.5,
    resonance: 0.2,
  },
  electric: {
    attack: 0.003,
    decay: 0.4,
    sustain: 0.3,
    release: 0.5,
    harmonics: [1.0, 0.8, 0.1, 0.4],
    brightness: 0.9,
    resonance: 0.4,
  },
  rhodes: {
    attack: 0.002,
    decay: 0.5,
    sustain: 0.2,
    release: 0.7,
    harmonics: [1.0, 0.3, 0.1, 0.05],
    brightness: 0.6,
    resonance: 0.5,
  },
  synth: {
    attack: 0.001,
    decay: 0.2,
    sustain: 0.7,
    release: 0.3,
    harmonics: [1.0, 0.7, 0.5, 0.3, 0.2],
    brightness: 1.0,
    resonance: 0.6,
  },
};

class PianoDemoPlayer {
  private audioContext: AudioContext | null = null;
  private masterGain: GainNode | null = null;

  // Synth type and styles
  private synthType: PianoSynthType = 'sampled';
  private currentStyle: PianoStyle = 'grand';
  private realisticStyle: RealisticPianoStyle = 'acoustic';

  // Playback state
  private isPlaying = false;
  private bpm = 120;
  private intervalId: number | null = null;
  private currentBeat = 0;
  private onBeatCallback: ((beat: number) => void) | null = null;

  // Sampler loading state
  private samplerLoaded = false;
  private samplerLoading = false;

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
  setSynthType(type: PianoSynthType): void {
    this.synthType = type;
  }

  /**
   * Get current synth type.
   */
  getSynthType(): PianoSynthType {
    return this.synthType;
  }

  /**
   * Set the electronic piano style.
   */
  setStyle(style: PianoStyle): void {
    this.currentStyle = style;
    this.synthType = 'electronic';
  }

  /**
   * Set the realistic (sampled) piano style.
   */
  setRealisticStyle(style: RealisticPianoStyle): void {
    this.realisticStyle = style;
    this.synthType = 'sampled';
    realisticPianoSampler.setStyle(style as SamplerStyle);
  }

  /**
   * Get current electronic style.
   */
  getStyle(): PianoStyle {
    return this.currentStyle;
  }

  /**
   * Get current realistic style.
   */
  getRealisticStyle(): RealisticPianoStyle {
    return this.realisticStyle;
  }

  /**
   * Set master volume (0-1).
   */
  setVolume(volume: number): void {
    if (this.masterGain) {
      this.masterGain.gain.value = Math.max(0, Math.min(1, volume));
    }
    realisticPianoSampler.setVolume(volume);
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
   * Load sampler (call before playing sampled piano).
   */
  async loadSampler(): Promise<void> {
    if (this.samplerLoaded || this.samplerLoading) return;

    this.samplerLoading = true;
    try {
      await realisticPianoSampler.load();
      this.samplerLoaded = true;
      console.log('[PianoDemoPlayer] Sampler loaded');
    } catch (error) {
      console.error('[PianoDemoPlayer] Failed to load sampler:', error);
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
   * Start playing the demo melody.
   */
  async start(): Promise<void> {
    if (this.isPlaying || !this.audioContext) return;

    // Load sampler if using sampled piano
    if (this.synthType === 'sampled' && !this.samplerLoaded) {
      await this.loadSampler();
    }

    this.isPlaying = true;
    this.currentBeat = 0;

    const beatInterval = (60 / this.bpm) * 1000; // ms per beat

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
    this.isPlaying = false;
    this.currentBeat = 0;

    // Release sampler notes
    if (this.synthType === 'sampled') {
      realisticPianoSampler.releaseAllNotes();
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
    const noteEvent = DEMO_NOTES.find(n => n.beat === beat);
    if (noteEvent) {
      if (this.synthType === 'sampled') {
        this.playSampledNote(noteEvent.freq);
      } else {
        this.playElectronicNote(noteEvent.freq);
      }
    }
  }

  /**
   * Play a sampled piano note using Tone.js.
   */
  private playSampledNote(frequency: number, velocity: number = 0.7): void {
    if (!this.samplerLoaded) return;
    realisticPianoSampler.playNote(frequency, velocity);
  }

  /**
   * Synthesize an electronic piano note.
   */
  private playElectronicNote(frequency: number, velocity: number = 0.7): void {
    if (!this.audioContext || !this.masterGain) return;

    const params = STYLE_PARAMS[this.currentStyle];
    const now = this.audioContext.currentTime;
    const noteDuration = 0.5; // Half second notes

    // Create oscillators for harmonics
    params.harmonics.forEach((amp, index) => {
      const osc = this.audioContext!.createOscillator();
      const gain = this.audioContext!.createGain();

      // Use sine for fundamental, triangle for upper harmonics
      osc.type = index === 0 ? 'sine' : 'triangle';
      osc.frequency.value = frequency * (index + 1);

      // Apply harmonic amplitude with brightness control
      const harmonicAmp = amp * Math.pow(params.brightness, index) * velocity;
      gain.gain.setValueAtTime(0, now);
      gain.gain.linearRampToValueAtTime(harmonicAmp * 0.5, now + params.attack);
      gain.gain.exponentialRampToValueAtTime(
        harmonicAmp * params.sustain * 0.5 + 0.001,
        now + params.attack + params.decay
      );
      gain.gain.exponentialRampToValueAtTime(
        0.001,
        now + noteDuration + params.release
      );

      osc.connect(gain);
      gain.connect(this.masterGain!);

      osc.start(now);
      osc.stop(now + noteDuration + params.release + 0.1);
    });

    // Add bell tone for Rhodes style
    if (this.currentStyle === 'rhodes') {
      this.addBellTone(frequency, now, noteDuration, velocity);
    }

    // Add slight detuning for electric style
    if (this.currentStyle === 'electric') {
      this.addDetuned(frequency, now, noteDuration, velocity);
    }
  }

  /**
   * Add bell overtone for Rhodes sound.
   */
  private addBellTone(frequency: number, time: number, duration: number, velocity: number): void {
    if (!this.audioContext || !this.masterGain) return;

    const osc = this.audioContext.createOscillator();
    const gain = this.audioContext.createGain();

    // Bell at approximately 3x frequency
    osc.type = 'sine';
    osc.frequency.value = frequency * 3.1;

    gain.gain.setValueAtTime(0, time);
    gain.gain.linearRampToValueAtTime(velocity * 0.15, time + 0.002);
    gain.gain.exponentialRampToValueAtTime(0.001, time + duration * 0.5);

    osc.connect(gain);
    gain.connect(this.masterGain);

    osc.start(time);
    osc.stop(time + duration);
  }

  /**
   * Add detuned oscillator for electric piano chorus.
   */
  private addDetuned(frequency: number, time: number, duration: number, velocity: number): void {
    if (!this.audioContext || !this.masterGain) return;

    const osc = this.audioContext.createOscillator();
    const gain = this.audioContext.createGain();

    osc.type = 'sine';
    osc.frequency.value = frequency * 1.003; // Slight detune

    gain.gain.setValueAtTime(0, time);
    gain.gain.linearRampToValueAtTime(velocity * 0.2, time + 0.003);
    gain.gain.exponentialRampToValueAtTime(0.001, time + duration);

    osc.connect(gain);
    gain.connect(this.masterGain);

    osc.start(time);
    osc.stop(time + duration + 0.1);
  }

  /**
   * Play a single preview chord.
   */
  async playPreview(): Promise<void> {
    if (!this.audioContext) return;

    if (this.synthType === 'sampled') {
      if (!this.samplerLoaded) {
        await this.loadSampler();
      }
      // Play a C major chord
      this.playSampledNote(261.63, 0.6); // C4
      setTimeout(() => this.playSampledNote(329.63, 0.5), 50); // E4
      setTimeout(() => this.playSampledNote(392.00, 0.5), 100); // G4
    } else {
      // Play a C major chord
      this.playElectronicNote(261.63, 0.6); // C4
      setTimeout(() => this.playElectronicNote(329.63, 0.5), 50); // E4
      setTimeout(() => this.playElectronicNote(392.00, 0.5), 100); // G4
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
    realisticPianoSampler.dispose();
    this.samplerLoaded = false;
  }
}

export const pianoDemoPlayer = new PianoDemoPlayer();
