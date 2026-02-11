/**
 * SampledDrumKit - High-quality sampled drums using Tone.js.
 *
 * Uses drum samples from Tone.js audio repository.
 * Samples are self-hosted to avoid external dependencies.
 *
 * Available kits:
 * - Acoustic: Real acoustic drum kit
 * - CR78: Classic Roland CR-78 drum machine
 * - 4OP-FM: Yamaha FM synthesis drums
 * - Techno: Modern electronic drums
 * - LINN: LinnDrum classic sounds
 */

import * as Tone from 'tone';
import { logger } from './utils/logger';

export type SampledDrumKitType = 'acoustic' | 'cr78' | '4opfm' | 'techno' | 'linn';

export type DrumSoundType = 'kick' | 'snare' | 'hihat' | 'tom1' | 'tom2' | 'tom3';

// Display names and descriptions for UI
export const SAMPLED_DRUM_KIT_CONFIG: Record<SampledDrumKitType, {
  displayName: string;
  description: string;
  color: string;
}> = {
  acoustic: {
    displayName: 'Acoustic',
    description: 'Real acoustic drum kit',
    color: '#f59e0b',
  },
  cr78: {
    displayName: 'CR-78',
    description: 'Classic Roland sounds',
    color: '#ec4899',
  },
  '4opfm': {
    displayName: 'FM Drums',
    description: 'Yamaha FM synthesis',
    color: '#8b5cf6',
  },
  techno: {
    displayName: 'Techno',
    description: 'Modern electronic',
    color: '#06b6d4',
  },
  linn: {
    displayName: 'LinnDrum',
    description: '80s classic machine',
    color: '#ef4444',
  },
};

// Sample paths for each kit
const KIT_PATHS: Record<SampledDrumKitType, string> = {
  acoustic: '/samples/drums/acoustic/',
  cr78: '/samples/drums/cr78/',
  '4opfm': '/samples/drums/4opfm/',
  techno: '/samples/drums/techno/',
  linn: '/samples/drums/linn/',
};

// Drum sound file names
const DRUM_FILES: Record<DrumSoundType, string> = {
  kick: 'kick.mp3',
  snare: 'snare.mp3',
  hihat: 'hihat.mp3',
  tom1: 'tom1.mp3',
  tom2: 'tom2.mp3',
  tom3: 'tom3.mp3',
};

export class SampledDrumKit {
  private players: Map<SampledDrumKitType, Tone.Players> = new Map();
  private volume: Tone.Volume | null = null;
  private currentKit: SampledDrumKitType = 'acoustic';
  private loadedKits: Set<SampledDrumKitType> = new Set();
  private loadingKits: Set<SampledDrumKitType> = new Set();

  // Callbacks
  private onLoaded?: () => void;

  /**
   * Initialize the drum kit system.
   */
  async initialize(): Promise<void> {
    // Start Tone.js audio context (required after user gesture)
    await Tone.start();
    logger.info('[SampledDrumKit] Tone.js started, context state:', Tone.context.state);

    // Create master volume
    this.volume = new Tone.Volume(-6).toDestination();
  }

  /**
   * Load a specific drum kit.
   */
  async loadKit(kit: SampledDrumKitType): Promise<void> {
    if (this.loadedKits.has(kit)) {
      logger.debug(`[SampledDrumKit] Kit already loaded: ${kit}`);
      return;
    }
    if (this.loadingKits.has(kit)) {
      logger.debug(`[SampledDrumKit] Kit already loading: ${kit}`);
      return;
    }

    this.loadingKits.add(kit);
    logger.info(`[SampledDrumKit] Starting to load kit: ${kit}`);

    return new Promise((resolve, reject) => {
      const basePath = KIT_PATHS[kit];
      const urls: Record<string, string> = {};

      for (const [sound, file] of Object.entries(DRUM_FILES)) {
        urls[sound] = basePath + file;
      }

      logger.debug(`[SampledDrumKit] Loading URLs for ${kit}:`, urls);

      const players = new Tone.Players({
        urls,
        onload: () => {
          if (this.volume) {
            players.connect(this.volume);
          }
          this.players.set(kit, players);
          this.loadedKits.add(kit);
          this.loadingKits.delete(kit);
          logger.info(`[SampledDrumKit] Successfully loaded kit: ${kit}`);
          this.onLoaded?.();
          resolve();
        },
        onerror: (error) => {
          logger.error(`[SampledDrumKit] Failed to load kit ${kit}:`, error);
          this.loadingKits.delete(kit);
          reject(error);
        },
      });
    });
  }

  /**
   * Check if a kit is loaded.
   */
  isKitLoaded(kit: SampledDrumKitType): boolean {
    return this.loadedKits.has(kit);
  }

  /**
   * Check if any kit is loaded.
   */
  isAnyKitLoaded(): boolean {
    return this.loadedKits.size > 0;
  }

  /**
   * Set callback for load completion.
   */
  setOnLoaded(callback: () => void): void {
    this.onLoaded = callback;
  }

  /**
   * Set the current drum kit.
   */
  async setKit(kit: SampledDrumKitType): Promise<void> {
    this.currentKit = kit;
    if (!this.loadedKits.has(kit)) {
      await this.loadKit(kit);
    }
  }

  /**
   * Get current kit.
   */
  getKit(): SampledDrumKitType {
    return this.currentKit;
  }

  /**
   * Play a drum sound.
   */
  playDrum(sound: DrumSoundType, velocity: number = 0.8): void {
    const players = this.players.get(this.currentKit);
    if (!players) {
      logger.warn(`[SampledDrumKit] Kit not loaded: ${this.currentKit}`);
      return;
    }

    try {
      const player = players.player(sound);
      logger.debug(`[SampledDrumKit] Playing ${sound} from ${this.currentKit}, loaded: ${player.loaded}`);
      if (player.loaded) {
        // Stop if already playing to allow retriggering
        player.stop();
        player.volume.value = 20 * Math.log10(velocity);
        player.start();
      } else {
        logger.warn(`[SampledDrumKit] Player for ${sound} not loaded yet`);
      }
    } catch (error) {
      logger.error(`[SampledDrumKit] Error playing ${sound}:`, error);
    }
  }

  /**
   * Play kick drum.
   */
  playKick(velocity: number = 0.8): void {
    this.playDrum('kick', velocity);
  }

  /**
   * Play snare drum.
   */
  playSnare(velocity: number = 0.8): void {
    this.playDrum('snare', velocity);
  }

  /**
   * Play hi-hat.
   */
  playHihat(velocity: number = 0.8): void {
    this.playDrum('hihat', velocity);
  }

  /**
   * Play tom 1.
   */
  playTom1(velocity: number = 0.8): void {
    this.playDrum('tom1', velocity);
  }

  /**
   * Play tom 2.
   */
  playTom2(velocity: number = 0.8): void {
    this.playDrum('tom2', velocity);
  }

  /**
   * Play tom 3.
   */
  playTom3(velocity: number = 0.8): void {
    this.playDrum('tom3', velocity);
  }

  /**
   * Set master volume (0.0 to 1.0).
   */
  setVolume(volume: number): void {
    if (this.volume) {
      const db = volume === 0 ? -60 : 20 * Math.log10(volume);
      this.volume.volume.value = db;
    }
  }

  /**
   * Dispose of all resources.
   */
  dispose(): void {
    for (const players of this.players.values()) {
      players.dispose();
    }
    this.players.clear();
    this.volume?.dispose();
    this.volume = null;
    this.loadedKits.clear();
  }
}

// Singleton instance
export const sampledDrumKit = new SampledDrumKit();
