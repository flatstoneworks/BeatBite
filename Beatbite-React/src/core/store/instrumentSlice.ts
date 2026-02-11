import type { StateCreator } from 'zustand';
import type { AppStore, InstrumentSlice } from './types';
import { initialInstrumentSetup } from './types';

export const createInstrumentSlice: StateCreator<AppStore, [], [], InstrumentSlice> = (set) => ({
  instrumentSetup: initialInstrumentSetup,

  setSelectedDrumKit: (kit) =>
    set((state) => ({ instrumentSetup: { ...state.instrumentSetup, selectedDrumKit: kit } })),

  setSelectedBassSynthType: (synthType) =>
    set((state) => ({ instrumentSetup: { ...state.instrumentSetup, selectedBassSynthType: synthType } })),

  setSelectedBassStyle: (style) =>
    set((state) => ({ instrumentSetup: { ...state.instrumentSetup, selectedBassStyle: style } })),

  setSelectedRealisticBassStyle: (style) =>
    set((state) => ({ instrumentSetup: { ...state.instrumentSetup, selectedRealisticBassStyle: style } })),

  setSelectedGuitarSynthType: (synthType) =>
    set((state) => ({ instrumentSetup: { ...state.instrumentSetup, selectedGuitarSynthType: synthType } })),

  setSelectedGuitarStyle: (style) =>
    set((state) => ({ instrumentSetup: { ...state.instrumentSetup, selectedGuitarStyle: style } })),

  setSelectedRealisticGuitarStyle: (style) =>
    set((state) => ({ instrumentSetup: { ...state.instrumentSetup, selectedRealisticGuitarStyle: style } })),

  setSelectedElectricGuitarStyle: (style) =>
    set((state) => ({ instrumentSetup: { ...state.instrumentSetup, selectedElectricGuitarStyle: style } })),

  setSelectedPianoStyle: (style) =>
    set((state) => ({ instrumentSetup: { ...state.instrumentSetup, selectedPianoStyle: style } })),

  setSelectedVoiceEffects: (effects) =>
    set((state) => ({ instrumentSetup: { ...state.instrumentSetup, selectedVoiceEffects: effects } })),

  toggleSelectedVoiceEffect: (effect) =>
    set((state) => ({
      instrumentSetup: {
        ...state.instrumentSetup,
        selectedVoiceEffects: {
          ...state.instrumentSetup.selectedVoiceEffects,
          [effect]: !state.instrumentSetup.selectedVoiceEffects[effect],
        },
      },
    })),

  resetInstrumentSetup: () => set({ instrumentSetup: initialInstrumentSetup }),
});
