import type { StateCreator } from 'zustand';
import type { AppStore, LooperSlice } from './types';
import { initialTempoSelection, initialTransport } from './types';

export const createLooperSlice: StateCreator<AppStore, [], [], LooperSlice> = (set) => ({
  tempoSelection: initialTempoSelection,
  transport: initialTransport,
  layers: [],
  layerRecordingState: 'idle',
  activeRecordingLayer: null,
  recordedDrumEvents: [],

  setTempoSelectionActive: (active) =>
    set((state) => ({ tempoSelection: { ...state.tempoSelection, isTempoSelectionActive: active } })),

  setSelectedBpm: (bpm) =>
    set((state) => ({ tempoSelection: { ...state.tempoSelection, selectedBpm: Math.max(60, Math.min(200, bpm)) } })),

  confirmTempo: () =>
    set((state) => ({
      tempoSelection: { ...state.tempoSelection, tempoConfirmed: true, isTempoSelectionActive: false },
      transport: { ...state.transport, bpm: state.tempoSelection.selectedBpm },
    })),

  resetTempoSelection: () => set({ tempoSelection: initialTempoSelection }),

  setCurrentMetronomeBeat: (beat) =>
    set((state) => ({ tempoSelection: { ...state.tempoSelection, currentMetronomeBeat: beat } })),

  setTransport: (transport) => set({ transport }),

  setLayers: (layers) => set({ layers }),

  setLayerRecordingState: (recordingState, layerType) =>
    set({ layerRecordingState: recordingState, activeRecordingLayer: layerType }),

  setRecordedDrumEvents: (events) => set({ recordedDrumEvents: events }),
});
