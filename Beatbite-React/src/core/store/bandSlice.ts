import type { StateCreator } from 'zustand';
import type { AppStore, BandSlice } from './types';
import { initialInstrumentSetup, initialTempoSelection } from './types';
import { bandStorage, type CreateBandInput } from '../BandStorage';

export const createBandSlice: StateCreator<AppStore, [], [], BandSlice> = (set, get) => ({
  bands: bandStorage.getAllBands(),
  activeBandId: bandStorage.getActiveBandId(),
  pendingBandName: '',

  loadBands: () => set({ bands: bandStorage.getAllBands() }),

  selectBand: (bandId) =>
    set((state) => {
      const band = bandStorage.getBandById(bandId);
      if (!band) return state;

      bandStorage.setActiveBandId(bandId);

      return {
        activeBandId: bandId,
        isCreatingNewBand: false,
        instrumentSetup: {
          selectedDrumKit: band.drumKit,
          selectedBassSynthType: band.bassSynthType ?? 'electronic',
          selectedBassStyle: band.bassStyle,
          selectedRealisticBassStyle: band.realisticBassStyle ?? 'finger',
          selectedGuitarSynthType: band.guitarSynthType ?? 'electric',
          selectedGuitarStyle: band.guitarStyle,
          selectedRealisticGuitarStyle: band.realisticGuitarStyle ?? 'clean',
          selectedElectricGuitarStyle: band.electricGuitarStyle ?? 'clean',
          selectedPianoStyle: band.pianoStyle,
          selectedVoiceEffects: band.voiceEffects,
        },
        guidedFlowStep: 'tempo' as const,
        tempoSelection: { ...initialTempoSelection, isTempoSelectionActive: true },
      };
    }),

  startNewBandCreation: () =>
    set({
      isCreatingNewBand: true,
      pendingBandName: '',
      guidedFlowStep: 'band-name',
      instrumentSetup: initialInstrumentSetup,
    }),

  setPendingBandName: (name) => set({ pendingBandName: name }),

  saveNewBand: () => {
    const state = get();
    const input: CreateBandInput = {
      name: state.pendingBandName || `Band ${state.bands.length + 1}`,
      drumSynthType: 'electronic',
      drumKit: state.instrumentSetup.selectedDrumKit,
      sampledDrumKit: 'acoustic',
      bassSynthType: state.instrumentSetup.selectedBassSynthType,
      bassStyle: state.instrumentSetup.selectedBassStyle,
      realisticBassStyle: state.instrumentSetup.selectedRealisticBassStyle,
      guitarSynthType: state.instrumentSetup.selectedGuitarSynthType,
      guitarStyle: state.instrumentSetup.selectedGuitarStyle,
      realisticGuitarStyle: state.instrumentSetup.selectedRealisticGuitarStyle,
      electricGuitarStyle: state.instrumentSetup.selectedElectricGuitarStyle,
      pianoSynthType: 'electronic',
      pianoStyle: state.instrumentSetup.selectedPianoStyle,
      realisticPianoStyle: 'acoustic',
      voiceEffects: state.instrumentSetup.selectedVoiceEffects,
    };
    const band = bandStorage.createBand(input);
    bandStorage.setActiveBandId(band.id);

    set({
      bands: bandStorage.getAllBands(),
      activeBandId: band.id,
      isCreatingNewBand: false,
      pendingBandName: '',
    });

    return band;
  },

  createBandFromInput: (input) => {
    const band = bandStorage.createBand(input);
    set({ bands: bandStorage.getAllBands() });
    return band;
  },

  updateBand: (bandId, updates) => {
    const updatedBand = bandStorage.updateBand(bandId, updates);
    if (updatedBand) {
      set({ bands: bandStorage.getAllBands() });
    }
    return updatedBand;
  },

  deleteBand: (bandId) =>
    set((state) => {
      bandStorage.deleteBand(bandId);
      return {
        bands: bandStorage.getAllBands(),
        activeBandId: state.activeBandId === bandId ? null : state.activeBandId,
      };
    }),

  loadBandConfiguration: (band) =>
    set({
      instrumentSetup: {
        selectedDrumKit: band.drumKit,
        selectedBassSynthType: band.bassSynthType ?? 'electronic',
        selectedBassStyle: band.bassStyle,
        selectedRealisticBassStyle: band.realisticBassStyle ?? 'finger',
        selectedGuitarSynthType: band.guitarSynthType ?? 'electric',
        selectedGuitarStyle: band.guitarStyle,
        selectedRealisticGuitarStyle: band.realisticGuitarStyle ?? 'clean',
        selectedElectricGuitarStyle: band.electricGuitarStyle ?? 'clean',
        selectedPianoStyle: band.pianoStyle,
        selectedVoiceEffects: band.voiceEffects,
      },
    }),
});
