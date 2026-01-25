/**
 * DrumKitPlayer - Plays demo beats with different drum kit sounds.
 *
 * Supports two synth types:
 * - Electronic: Oscillator-based synthesis
 * - Sampled: Real drum samples (Acoustic, CR-78, FM, Techno, LinnDrum)
 */

import { sampledDrumKit, type SampledDrumKitType } from './SampledDrumKit';

export { SAMPLED_DRUM_KIT_CONFIG } from './SampledDrumKit';

export type DrumSynthType = 'electronic' | 'sampled';

export type DrumKitType = 'electronic' | 'acoustic' | 'lofi' | 'trap' | 'jazz' | 'vintage' | 'rock';

export const DRUM_KIT_CONFIG: Record<DrumKitType, {
  displayName: string;
  description: string;
  color: string;
}> = {
  electronic: {
    displayName: 'Electronic',
    description: '808-style punchy beats',
    color: '#00ffff',
  },
  acoustic: {
    displayName: 'Acoustic',
    description: 'Natural drum sounds',
    color: '#f59e0b',
  },
  lofi: {
    displayName: 'Lo-Fi',
    description: 'Vintage filtered vibes',
    color: '#a855f7',
  },
  trap: {
    displayName: 'Trap',
    description: 'Modern hard-hitting',
    color: '#ef4444',
  },
  jazz: {
    displayName: 'Jazz',
    description: 'Soft brushed tones',
    color: '#8b5cf6',
  },
  vintage: {
    displayName: 'Vintage',
    description: 'Classic drum machine',
    color: '#ec4899',
  },
  rock: {
    displayName: 'Rock',
    description: 'Punchy aggressive',
    color: '#22c55e',
  },
};

// Simple 4-beat pattern: kick on 1 and 3, snare on 2 and 4, hihat on all
const DEMO_PATTERN = [
  { beat: 0, drum: 'kick' as const },
  { beat: 0, drum: 'hihat' as const },
  { beat: 1, drum: 'snare' as const },
  { beat: 1, drum: 'hihat' as const },
  { beat: 2, drum: 'kick' as const },
  { beat: 2, drum: 'hihat' as const },
  { beat: 3, drum: 'snare' as const },
  { beat: 3, drum: 'hihat' as const },
];

type DrumSound = 'kick' | 'snare' | 'hihat';

interface KitSoundParams {
  kick: { freq: number; decay: number; tone: number };
  snare: { freq: number; noise: number; decay: number };
  hihat: { freq: number; decay: number; filter: number };
}

const KIT_PARAMS: Record<DrumKitType, KitSoundParams> = {
  electronic: {
    kick: { freq: 55, decay: 0.5, tone: 0.8 },
    snare: { freq: 180, noise: 0.7, decay: 0.2 },
    hihat: { freq: 8000, decay: 0.05, filter: 10000 },
  },
  acoustic: {
    kick: { freq: 80, decay: 0.3, tone: 0.4 },
    snare: { freq: 220, noise: 0.9, decay: 0.15 },
    hihat: { freq: 6000, decay: 0.08, filter: 8000 },
  },
  lofi: {
    kick: { freq: 50, decay: 0.4, tone: 0.3 },
    snare: { freq: 150, noise: 0.5, decay: 0.25 },
    hihat: { freq: 4000, decay: 0.1, filter: 3000 },
  },
  trap: {
    kick: { freq: 40, decay: 0.8, tone: 1.0 },
    snare: { freq: 200, noise: 0.8, decay: 0.18 },
    hihat: { freq: 10000, decay: 0.03, filter: 12000 },
  },
  jazz: {
    kick: { freq: 70, decay: 0.25, tone: 0.3 },
    snare: { freq: 200, noise: 0.4, decay: 0.3 },
    hihat: { freq: 5000, decay: 0.12, filter: 6000 },
  },
  vintage: {
    kick: { freq: 45, decay: 0.6, tone: 0.9 },
    snare: { freq: 170, noise: 0.6, decay: 0.22 },
    hihat: { freq: 7000, decay: 0.06, filter: 9000 },
  },
  rock: {
    kick: { freq: 60, decay: 0.35, tone: 0.7 },
    snare: { freq: 240, noise: 0.85, decay: 0.12 },
    hihat: { freq: 9000, decay: 0.04, filter: 11000 },
  },
};

class DrumKitPlayer {
  private audioContext: AudioContext | null = null;
  private masterGain: GainNode | null = null;

  // Synth type and kits
  private synthType: DrumSynthType = 'sampled';
  private currentKit: DrumKitType = 'electronic';
  private sampledKit: SampledDrumKitType = 'acoustic';

  // Playback state
  private isPlaying = false;
  private bpm = 120;
  private intervalId: number | null = null;
  private currentBeat = 0;
  private onBeatCallback: ((beat: number) => void) | null = null;

  // Sampler state
  private samplerInitialized = false;

  /**
   * Initialize with audio context.
   */
  initialize(audioContext: AudioContext): void {
    this.audioContext = audioContext;
    this.masterGain = audioContext.createGain();
    this.masterGain.gain.value = 0.7;
    this.masterGain.connect(audioContext.destination);
  }

  /**
   * Set synth type (electronic or sampled).
   */
  setSynthType(type: DrumSynthType): void {
    this.synthType = type;
  }

  /**
   * Get current synth type.
   */
  getSynthType(): DrumSynthType {
    return this.synthType;
  }

  /**
   * Set the electronic drum kit.
   */
  setKit(kit: DrumKitType): void {
    this.currentKit = kit;
    this.synthType = 'electronic';
  }

  /**
   * Set the sampled drum kit.
   */
  async setSampledKit(kit: SampledDrumKitType): Promise<void> {
    this.sampledKit = kit;
    this.synthType = 'sampled';
    // Ensure sampler is initialized before setting the kit
    await this.initializeSampler();
    await sampledDrumKit.setKit(kit);
  }

  /**
   * Get current electronic kit.
   */
  getKit(): DrumKitType {
    return this.currentKit;
  }

  /**
   * Get current sampled kit.
   */
  getSampledKit(): SampledDrumKitType {
    return this.sampledKit;
  }

  /**
   * Set master volume (0-1).
   */
  setVolume(volume: number): void {
    if (this.masterGain) {
      this.masterGain.gain.value = Math.max(0, Math.min(1, volume));
    }
    sampledDrumKit.setVolume(volume);
  }

  /**
   * Initialize sampler.
   */
  async initializeSampler(): Promise<void> {
    if (this.samplerInitialized) return;
    await sampledDrumKit.initialize();
    this.samplerInitialized = true;
  }

  /**
   * Check if sampler is ready for current kit.
   */
  isSamplerReady(): boolean {
    return this.samplerInitialized && sampledDrumKit.isKitLoaded(this.sampledKit);
  }

  /**
   * Set BPM.
   */
  setBpm(bpm: number): void {
    this.bpm = bpm;
    // If playing, restart with new tempo
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
   * Start playing the demo beat.
   */
  async start(): Promise<void> {
    if (this.isPlaying || !this.audioContext) return;

    // Initialize and load sampler if using sampled drums
    if (this.synthType === 'sampled') {
      await this.initializeSampler();
      await sampledDrumKit.setKit(this.sampledKit);
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
  }

  /**
   * Check if playing.
   */
  getIsPlaying(): boolean {
    return this.isPlaying;
  }

  /**
   * Play all drums for a specific beat.
   */
  private playBeat(beat: number): void {
    const events = DEMO_PATTERN.filter(e => e.beat === beat);
    for (const event of events) {
      this.playDrum(event.drum);
    }
  }

  /**
   * Play a single drum sound.
   */
  private playDrum(drum: DrumSound): void {
    // Use sampled drums if synthType is 'sampled'
    if (this.synthType === 'sampled') {
      this.playSampledDrum(drum);
      return;
    }

    if (!this.audioContext || !this.masterGain) return;

    const params = KIT_PARAMS[this.currentKit];
    const now = this.audioContext.currentTime;

    switch (drum) {
      case 'kick':
        this.playSynthKick(params.kick, now);
        break;
      case 'snare':
        this.playSynthSnare(params.snare, now);
        break;
      case 'hihat':
        this.playSynthHihat(params.hihat, now);
        break;
    }
  }

  /**
   * Play a sampled drum sound.
   */
  private playSampledDrum(drum: DrumSound): void {
    switch (drum) {
      case 'kick':
        sampledDrumKit.playKick();
        break;
      case 'snare':
        sampledDrumKit.playSnare();
        break;
      case 'hihat':
        sampledDrumKit.playHihat();
        break;
    }
  }

  /**
   * Synthesize kick drum.
   */
  private playSynthKick(params: KitSoundParams['kick'], time: number): void {
    if (!this.audioContext || !this.masterGain) return;

    const osc = this.audioContext.createOscillator();
    const gain = this.audioContext.createGain();

    osc.type = 'sine';
    osc.frequency.setValueAtTime(params.freq * 2, time);
    osc.frequency.exponentialRampToValueAtTime(params.freq, time + 0.05);

    gain.gain.setValueAtTime(params.tone, time);
    gain.gain.exponentialRampToValueAtTime(0.001, time + params.decay);

    osc.connect(gain);
    gain.connect(this.masterGain);

    osc.start(time);
    osc.stop(time + params.decay);
  }

  /**
   * Synthesize snare drum.
   */
  private playSynthSnare(params: KitSoundParams['snare'], time: number): void {
    if (!this.audioContext || !this.masterGain) return;

    // Noise component
    const bufferSize = this.audioContext.sampleRate * params.decay;
    const buffer = this.audioContext.createBuffer(1, bufferSize, this.audioContext.sampleRate);
    const data = buffer.getChannelData(0);
    for (let i = 0; i < bufferSize; i++) {
      data[i] = Math.random() * 2 - 1;
    }

    const noise = this.audioContext.createBufferSource();
    noise.buffer = buffer;

    const noiseFilter = this.audioContext.createBiquadFilter();
    noiseFilter.type = 'highpass';
    noiseFilter.frequency.value = 1000;

    const noiseGain = this.audioContext.createGain();
    noiseGain.gain.setValueAtTime(params.noise * 0.5, time);
    noiseGain.gain.exponentialRampToValueAtTime(0.001, time + params.decay);

    noise.connect(noiseFilter);
    noiseFilter.connect(noiseGain);
    noiseGain.connect(this.masterGain);

    // Tone component
    const osc = this.audioContext.createOscillator();
    const oscGain = this.audioContext.createGain();

    osc.type = 'triangle';
    osc.frequency.setValueAtTime(params.freq, time);

    oscGain.gain.setValueAtTime(0.3, time);
    oscGain.gain.exponentialRampToValueAtTime(0.001, time + params.decay * 0.5);

    osc.connect(oscGain);
    oscGain.connect(this.masterGain);

    noise.start(time);
    osc.start(time);
    osc.stop(time + params.decay);
  }

  /**
   * Synthesize hi-hat.
   */
  private playSynthHihat(params: KitSoundParams['hihat'], time: number): void {
    if (!this.audioContext || !this.masterGain) return;

    // Noise for hi-hat
    const bufferSize = this.audioContext.sampleRate * params.decay * 2;
    const buffer = this.audioContext.createBuffer(1, bufferSize, this.audioContext.sampleRate);
    const data = buffer.getChannelData(0);
    for (let i = 0; i < bufferSize; i++) {
      data[i] = Math.random() * 2 - 1;
    }

    const noise = this.audioContext.createBufferSource();
    noise.buffer = buffer;

    const filter = this.audioContext.createBiquadFilter();
    filter.type = 'bandpass';
    filter.frequency.value = params.filter;
    filter.Q.value = 1;

    const gain = this.audioContext.createGain();
    gain.gain.setValueAtTime(0.3, time);
    gain.gain.exponentialRampToValueAtTime(0.001, time + params.decay);

    noise.connect(filter);
    filter.connect(gain);
    gain.connect(this.masterGain);

    noise.start(time);
  }

  /**
   * Play a single preview hit (kick + snare + hihat together).
   */
  async playPreview(): Promise<void> {
    if (this.synthType === 'sampled') {
      await this.initializeSampler();
      await sampledDrumKit.setKit(this.sampledKit);
      sampledDrumKit.playKick();
      setTimeout(() => sampledDrumKit.playHihat(), 50);
    } else {
      if (!this.audioContext) return;
      this.playDrum('kick');
      setTimeout(() => this.playDrum('hihat'), 50);
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
    sampledDrumKit.dispose();
    this.samplerInitialized = false;
  }
}

export const drumKitPlayer = new DrumKitPlayer();
