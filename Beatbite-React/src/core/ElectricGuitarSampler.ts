/**
 * ElectricGuitarSampler - High-quality sampled electric guitar using Tone.js.
 *
 * Uses electric guitar samples from tonejs-instruments (CC-by 3.0).
 * University of Iowa Electronic Music Studios.
 *
 * Extends BaseSamplerInstrument with distortion effects for different styles:
 * - Clean: Crystal clear, no distortion
 * - Crunch: Light overdrive, blues/rock
 * - Overdrive: Medium drive, classic rock
 * - Distortion: Heavy distortion, metal/hard rock
 */

import * as Tone from 'tone';
import { BaseSamplerInstrument, type BaseStyleConfig, type InstrumentRange } from './BaseSamplerInstrument';
import type { ElectricGuitarStyle } from '../types';
import { logger } from './utils/logger';

// Extended style config with distortion settings
interface ElectricStyleConfig extends BaseStyleConfig {
  distortion: number;
  reverbWet: number;
}

// Style configurations with distortion and EQ settings
const STYLE_CONFIGS: Record<ElectricGuitarStyle, ElectricStyleConfig> = {
  clean: {
    distortion: 0,
    filterFreq: 6000,
    filterQ: 0.5,
    attack: 0.005,
    release: 1.5,
    highShelf: 2,
    midBoost: 0,
    lowShelf: 0,
    reverbWet: 0.1,
  },
  crunch: {
    distortion: 0.2,
    filterFreq: 4500,
    filterQ: 0.7,
    attack: 0.003,
    release: 1.2,
    highShelf: 1,
    midBoost: 3,
    lowShelf: 1,
    reverbWet: 0.15,
  },
  overdrive: {
    distortion: 0.45,
    filterFreq: 3500,
    filterQ: 0.8,
    attack: 0.002,
    release: 1.0,
    highShelf: 0,
    midBoost: 5,
    lowShelf: 2,
    reverbWet: 0.2,
  },
  distortion: {
    distortion: 0.8,
    filterFreq: 2500,
    filterQ: 1.0,
    attack: 0.001,
    release: 0.8,
    highShelf: -3,
    midBoost: 6,
    lowShelf: 3,
    reverbWet: 0.25,
  },
};

// Sample URL mapping - sparse chromatic sampling
// Tone.js Sampler interpolates between these notes
const SAMPLE_URLS: Record<string, string> = {
  'E2': 'E2.mp3',
  'F#2': 'Fs2.mp3',
  'A2': 'A2.mp3',
  'C3': 'C3.mp3',
  'D#3': 'Ds3.mp3',
  'F#3': 'Fs3.mp3',
  'A3': 'A3.mp3',
  'C4': 'C4.mp3',
  'D#4': 'Ds4.mp3',
  'F#4': 'Fs4.mp3',
  'A4': 'A4.mp3',
  'C5': 'C5.mp3',
  'D#5': 'Ds5.mp3',
  'F#5': 'Fs5.mp3',
};

// Electric guitar frequency range (standard tuning E2 to E6)
const GUITAR_RANGE: InstrumentRange = {
  min: 82.41,   // E2 (low E on guitar)
  max: 1319,    // E6 (high frets)
};

export class ElectricGuitarSampler extends BaseSamplerInstrument<ElectricGuitarStyle> {
  // Additional effect node for distortion
  private distortionNode: Tone.Distortion | null = null;

  // Implement abstract properties
  protected readonly sampleUrls = SAMPLE_URLS;
  protected readonly baseUrl = '/samples/guitar-electric/';
  protected readonly instrumentRange = GUITAR_RANGE;
  protected readonly styleConfigs = STYLE_CONFIGS;
  protected readonly logPrefix = 'ElectricGuitar';

  constructor() {
    super('clean');
  }

  /**
   * Override to add distortion to the effects chain.
   */
  protected override createEffectsChain(): Tone.ToneAudioNode {
    const config = STYLE_CONFIGS[this.style];

    // Create base chain (volume -> eq -> filter)
    this.volume = new Tone.Volume(-6).toDestination();

    this.eq = new Tone.EQ3({
      low: config.lowShelf,
      mid: config.midBoost,
      high: config.highShelf,
    });
    this.eq.connect(this.volume);

    this.filter = new Tone.Filter({
      frequency: config.filterFreq,
      Q: config.filterQ,
      type: 'lowpass',
    });
    this.filter.connect(this.eq);

    // Add distortion before filter
    this.distortionNode = new Tone.Distortion({
      distortion: config.distortion,
      wet: config.distortion > 0 ? 1 : 0,
    });
    this.distortionNode.connect(this.filter);

    // Return the node that sampler should connect to
    return this.distortionNode;
  }

  /**
   * Override to apply distortion settings.
   */
  protected override applyStyle(): void {
    const config = STYLE_CONFIGS[this.style];
    logger.debug(`[${this.logPrefix}] Applying style: ${this.style}, distortion: ${config.distortion}`);

    // Apply base style settings
    super.applyStyle();

    // Apply distortion settings
    if (this.distortionNode) {
      this.distortionNode.distortion = config.distortion;
      this.distortionNode.wet.value = config.distortion > 0 ? 1 : 0;
    }
  }

  /**
   * Set distortion amount directly (0.0 to 1.0).
   */
  setDistortion(amount: number): void {
    if (this.distortionNode) {
      this.distortionNode.distortion = Math.max(0, Math.min(1, amount));
      this.distortionNode.wet.value = amount > 0 ? 1 : 0;
    }
  }

  /**
   * Override dispose to clean up distortion node.
   */
  override dispose(): void {
    super.dispose();
    this.distortionNode?.dispose();
    this.distortionNode = null;
  }
}

// Singleton instance
export const electricGuitarSampler = new ElectricGuitarSampler();
