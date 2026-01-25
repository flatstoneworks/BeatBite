/**
 * RealisticGuitarSampler - High-quality sampled acoustic guitar using Tone.js.
 *
 * Uses acoustic guitar samples from tonejs-instruments (CC-by 3.0).
 * Samples are self-hosted to avoid external dependencies.
 *
 * Extends BaseSamplerInstrument with styles that apply different EQ/envelope:
 * - Clean: Neutral, balanced tone
 * - Acoustic: Enhanced mids, natural resonance
 * - Muted: Palm-muted with reduced sustain
 * - Bright: Boosted highs, sparkly tone
 */

import { BaseSamplerInstrument, type BaseStyleConfig, type InstrumentRange } from './BaseSamplerInstrument';
import type { RealisticGuitarStyle } from '../types';

// Style configurations - apply different processing to the same samples
const STYLE_CONFIGS: Record<RealisticGuitarStyle, BaseStyleConfig> = {
  clean: {
    filterFreq: 5000,
    filterQ: 0.5,
    attack: 0.005,
    release: 1.2,
    highShelf: 0,
    midBoost: 0,
    lowShelf: 0,
  },
  acoustic: {
    filterFreq: 4000,
    filterQ: 0.7,
    attack: 0.003,
    release: 1.5,
    highShelf: -2,
    midBoost: 3,
    lowShelf: 2,
  },
  muted: {
    filterFreq: 1500,
    filterQ: 0.3,
    attack: 0.002,
    release: 0.3,
    highShelf: -8,
    midBoost: 0,
    lowShelf: 2,
  },
  bright: {
    filterFreq: 8000,
    filterQ: 1,
    attack: 0.002,
    release: 1.0,
    highShelf: 5,
    midBoost: -2,
    lowShelf: -2,
  },
};

// Sample URL mapping - chromatic notes across guitar range
const SAMPLE_URLS: Record<string, string> = {
  // Octave 2 (low)
  'E2': 'E2.mp3',
  'F2': 'F2.mp3',
  'F#2': 'Fs2.mp3',
  'G2': 'G2.mp3',
  'G#2': 'Gs2.mp3',
  'A2': 'A2.mp3',
  'A#2': 'As2.mp3',
  'B2': 'B2.mp3',
  // Octave 3
  'C3': 'C3.mp3',
  'C#3': 'Cs3.mp3',
  'D3': 'D3.mp3',
  'D#3': 'Ds3.mp3',
  'E3': 'E3.mp3',
  'F3': 'F3.mp3',
  'F#3': 'Fs3.mp3',
  'G3': 'G3.mp3',
  'G#3': 'Gs3.mp3',
  'A3': 'A3.mp3',
  'A#3': 'As3.mp3',
  'B3': 'B3.mp3',
  // Octave 4 (high)
  'C4': 'C4.mp3',
  'C#4': 'Cs4.mp3',
  'D4': 'D4.mp3',
  'D#4': 'Ds4.mp3',
  'E4': 'E4.mp3',
  'F4': 'F4.mp3',
  'F#4': 'Fs4.mp3',
  'G4': 'G4.mp3',
  'G#4': 'Gs4.mp3',
  'A4': 'A4.mp3',
  'A#4': 'As4.mp3',
  'B4': 'B4.mp3',
};

// Guitar frequency range
const GUITAR_RANGE: InstrumentRange = {
  min: 82.41,   // E2 (low E on guitar)
  max: 988,     // B5 (high frets)
};

export class RealisticGuitarSampler extends BaseSamplerInstrument<RealisticGuitarStyle> {
  // Implement abstract properties
  protected readonly sampleUrls = SAMPLE_URLS;
  protected readonly baseUrl = '/samples/guitar/';
  protected readonly instrumentRange = GUITAR_RANGE;
  protected readonly styleConfigs = STYLE_CONFIGS;
  protected readonly logPrefix = 'RealisticGuitar';

  constructor() {
    super('acoustic');
  }
}

// Singleton instance
export const realisticGuitarSampler = new RealisticGuitarSampler();

// Re-export type alias for backward compatibility
export type SampledGuitarStyle = RealisticGuitarStyle;
