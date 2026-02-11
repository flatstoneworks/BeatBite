/**
 * BandStorage - Persistent storage for band configurations.
 *
 * A "Band" is a preset configuration of instruments:
 * - Drum kit selection
 * - Bass style
 * - Guitar style
 * - Piano style
 * - Voice effects
 *
 * Users can create multiple bands and reuse them across songs.
 */

import type { BassStyle, BassSynthType, RealisticBassStyle, GuitarStyle, GuitarSynthType, RealisticGuitarStyle, ElectricGuitarStyle, PianoStyle, PianoSynthType, RealisticPianoStyle, SampledDrumKitType } from '../types';
import type { DrumKitType, DrumSynthType } from './DrumKitPlayer';
import type { EffectType } from './VoiceEffects';
import { logger } from './utils/logger';

/**
 * Voice effects configuration for a band.
 */
export type VoiceEffectsConfig = Record<EffectType, boolean>;

/**
 * Band configuration - stores all instrument selections.
 */
export interface Band {
  id: string;
  name: string;
  avatar?: string;      // Base64 data URL for band photo
  backstory?: string;   // Band backstory/description
  createdAt: number;
  updatedAt: number;
  // Instrument configurations
  drumSynthType: DrumSynthType;
  drumKit: DrumKitType;                  // For electronic synth
  sampledDrumKit: SampledDrumKitType;    // For sampled drums
  // Bass configuration
  bassSynthType: BassSynthType;
  bassStyle: BassStyle;              // For electronic synth
  realisticBassStyle: RealisticBassStyle;  // For realistic synth
  // Guitar configuration
  guitarSynthType: GuitarSynthType;
  guitarStyle: GuitarStyle;                    // For electronic synth
  realisticGuitarStyle: RealisticGuitarStyle;  // For acoustic sampled
  electricGuitarStyle: ElectricGuitarStyle;    // For electric sampled
  // Piano configuration
  pianoSynthType: PianoSynthType;
  pianoStyle: PianoStyle;                    // For electronic synth
  realisticPianoStyle: RealisticPianoStyle;  // For sampled piano
  // Voice effects
  voiceEffects: VoiceEffectsConfig;
}

/**
 * Data needed to create a new band.
 */
export interface CreateBandInput {
  name: string;
  // Drum configuration
  drumSynthType: DrumSynthType;
  drumKit: DrumKitType;
  sampledDrumKit: SampledDrumKitType;
  // Bass configuration
  bassSynthType: BassSynthType;
  bassStyle: BassStyle;
  realisticBassStyle: RealisticBassStyle;
  // Guitar configuration
  guitarSynthType: GuitarSynthType;
  guitarStyle: GuitarStyle;
  realisticGuitarStyle: RealisticGuitarStyle;
  electricGuitarStyle: ElectricGuitarStyle;
  // Piano configuration
  pianoSynthType: PianoSynthType;
  pianoStyle: PianoStyle;
  realisticPianoStyle: RealisticPianoStyle;
  // Voice effects
  voiceEffects: VoiceEffectsConfig;
}

const STORAGE_KEY = 'beatbite_bands';
const ACTIVE_BAND_KEY = 'beatbite_active_band';

/**
 * Generate a unique ID for a new band.
 */
function generateId(): string {
  return `band_${Date.now()}_${Math.random().toString(36).substr(2, 9)}`;
}

/**
 * BandStorage class for managing band configurations.
 */
class BandStorage {
  /**
   * Get all saved bands.
   */
  getAllBands(): Band[] {
    try {
      const data = localStorage.getItem(STORAGE_KEY);
      if (!data) return [];
      const bands = JSON.parse(data) as Band[];
      // Sort by most recently updated
      return bands.sort((a, b) => b.updatedAt - a.updatedAt);
    } catch (error) {
      logger.error('[BandStorage] Failed to load bands:', error);
      return [];
    }
  }

  /**
   * Get a band by ID.
   */
  getBandById(id: string): Band | null {
    const bands = this.getAllBands();
    return bands.find(b => b.id === id) || null;
  }

  /**
   * Create a new band.
   */
  createBand(input: CreateBandInput): Band {
    const now = Date.now();
    const band: Band = {
      id: generateId(),
      name: input.name,
      createdAt: now,
      updatedAt: now,
      // Drums
      drumSynthType: input.drumSynthType,
      drumKit: input.drumKit,
      sampledDrumKit: input.sampledDrumKit,
      // Bass
      bassSynthType: input.bassSynthType,
      bassStyle: input.bassStyle,
      realisticBassStyle: input.realisticBassStyle,
      // Guitar
      guitarSynthType: input.guitarSynthType,
      guitarStyle: input.guitarStyle,
      realisticGuitarStyle: input.realisticGuitarStyle,
      electricGuitarStyle: input.electricGuitarStyle,
      // Piano
      pianoSynthType: input.pianoSynthType,
      pianoStyle: input.pianoStyle,
      realisticPianoStyle: input.realisticPianoStyle,
      // Voice
      voiceEffects: input.voiceEffects,
    };

    const bands = this.getAllBands();
    bands.push(band);
    this.saveBands(bands);

    logger.debug('[BandStorage] Created band:', band.name);
    return band;
  }

  /**
   * Update an existing band.
   */
  updateBand(id: string, updates: Partial<Omit<Band, 'id' | 'createdAt'>>): Band | null {
    const bands = this.getAllBands();
    const index = bands.findIndex(b => b.id === id);

    if (index === -1) {
      logger.error('[BandStorage] Band not found:', id);
      return null;
    }

    bands[index] = {
      ...bands[index],
      ...updates,
      updatedAt: Date.now(),
    };

    this.saveBands(bands);
    logger.debug('[BandStorage] Updated band:', bands[index].name);
    return bands[index];
  }

  /**
   * Delete a band.
   */
  deleteBand(id: string): boolean {
    const bands = this.getAllBands();
    const filtered = bands.filter(b => b.id !== id);

    if (filtered.length === bands.length) {
      return false; // Band not found
    }

    this.saveBands(filtered);

    // Clear active band if it was deleted
    if (this.getActiveBandId() === id) {
      this.setActiveBandId(null);
    }

    logger.debug('[BandStorage] Deleted band:', id);
    return true;
  }

  /**
   * Get the active band ID.
   */
  getActiveBandId(): string | null {
    try {
      return localStorage.getItem(ACTIVE_BAND_KEY);
    } catch {
      return null;
    }
  }

  /**
   * Set the active band ID.
   */
  setActiveBandId(id: string | null): void {
    try {
      if (id) {
        localStorage.setItem(ACTIVE_BAND_KEY, id);
      } else {
        localStorage.removeItem(ACTIVE_BAND_KEY);
      }
    } catch (error) {
      logger.error('[BandStorage] Failed to set active band:', error);
    }
  }

  /**
   * Get the active band.
   */
  getActiveBand(): Band | null {
    const id = this.getActiveBandId();
    if (!id) return null;
    return this.getBandById(id);
  }

  /**
   * Check if any bands exist.
   */
  hasBands(): boolean {
    return this.getAllBands().length > 0;
  }

  /**
   * Save bands to storage.
   */
  private saveBands(bands: Band[]): void {
    try {
      localStorage.setItem(STORAGE_KEY, JSON.stringify(bands));
    } catch (error) {
      logger.error('[BandStorage] Failed to save bands:', error);
    }
  }

  /**
   * Clear all bands (for testing/reset).
   */
  clearAll(): void {
    localStorage.removeItem(STORAGE_KEY);
    localStorage.removeItem(ACTIVE_BAND_KEY);
  }
}

export const bandStorage = new BandStorage();
