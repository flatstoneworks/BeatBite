import { logger } from '../utils/logger';

export abstract class AbstractDemoPlayer {
  protected audioContext: AudioContext | null = null;
  protected masterGain: GainNode | null = null;
  protected isPlaying = false;
  protected bpm = 120;
  protected intervalId: number | null = null;
  protected currentBeat = 0;
  protected onBeatCallback: ((beat: number) => void) | null = null;
  protected samplerLoaded = false;
  protected samplerLoading = false;

  // Subclasses define their identity
  protected abstract get logTag(): string;
  protected abstract get defaultVolume(): number;

  // Subclasses implement sampler loading
  protected abstract loadSamplerImpl(): Promise<void>;

  // Hook: load any samplers needed before playback starts
  protected abstract beforeStart(): Promise<void>;

  // Hook: play the instrument-specific beat
  protected abstract playBeat(beat: number): void;

  // Hook: cleanup on stop (release notes, stop oscillators)
  protected abstract onStop(): void;

  // Hook: cleanup on dispose (dispose samplers, reset extra state)
  protected abstract onDispose(): void;

  // Hook: propagate volume to samplers
  protected abstract onVolumeChange(volume: number): void;

  // Hook: play a preview sound
  abstract playPreview(): Promise<void>;

  initialize(audioContext: AudioContext): void {
    this.audioContext = audioContext;
    this.masterGain = audioContext.createGain();
    this.masterGain.gain.value = this.defaultVolume;
    this.masterGain.connect(audioContext.destination);
  }

  setBpm(bpm: number): void {
    this.bpm = bpm;
    if (this.isPlaying) {
      this.stop();
      this.start();
    }
  }

  setOnBeat(callback: (beat: number) => void): void {
    this.onBeatCallback = callback;
  }

  getIsPlaying(): boolean {
    return this.isPlaying;
  }

  isSamplerLoaded(): boolean {
    return this.samplerLoaded;
  }

  async loadSampler(): Promise<void> {
    if (this.samplerLoaded || this.samplerLoading) return;

    this.samplerLoading = true;
    try {
      await this.loadSamplerImpl();
      this.samplerLoaded = true;
      logger.info(`[${this.logTag}] Sampler loaded`);
    } catch (error) {
      logger.error(`[${this.logTag}] Failed to load sampler:`, error);
    } finally {
      this.samplerLoading = false;
    }
  }

  setVolume(volume: number): void {
    if (this.masterGain) {
      this.masterGain.gain.value = Math.max(0, Math.min(1, volume));
    }
    this.onVolumeChange(volume);
  }

  async start(): Promise<void> {
    if (this.isPlaying || !this.audioContext) return;

    await this.beforeStart();

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

  stop(): void {
    if (this.intervalId !== null) {
      clearInterval(this.intervalId);
      this.intervalId = null;
    }
    this.onStop();
    this.isPlaying = false;
    this.currentBeat = 0;
  }

  dispose(): void {
    this.stop();
    this.masterGain?.disconnect();
    this.masterGain = null;
    this.audioContext = null;
    this.onDispose();
    this.samplerLoaded = false;
  }
}
