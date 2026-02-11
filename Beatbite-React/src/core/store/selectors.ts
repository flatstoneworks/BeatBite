import { useAppStore } from './create';

// Audio selectors
export const useIsPassthroughActive = () => useAppStore((state) => state.isPassthroughActive);
export const useInputLevel = () => useAppStore((state) => state.inputLevel);
export const useLatency = () => useAppStore((state) => state.latencyMs);
export const useOutputVolume = () => useAppStore((state) => state.outputVolume);
export const useError = () => useAppStore((state) => state.error);
export const usePitch = () => useAppStore((state) => state.pitch);
export const useInstrumentMode = () => useAppStore((state) => state.instrumentMode);
export const useCurrentDrum = () => useAppStore((state) => state.currentDrum);
export const useBass = () => useAppStore((state) => state.bass);
export const useGuitar = () => useAppStore((state) => state.guitar);
export const usePiano = () => useAppStore((state) => state.piano);

// Looper selectors
export const useTransport = () => useAppStore((state) => state.transport);
export const useLayers = () => useAppStore((state) => state.layers);
export const useLayerRecordingState = () =>
  useAppStore((state) => ({
    state: state.layerRecordingState,
    activeLayer: state.activeRecordingLayer,
  }));

// Tempo selectors
export const useTempoSelection = () => useAppStore((state) => state.tempoSelection);
export const useSelectedBpm = () => useAppStore((state) => state.tempoSelection.selectedBpm);
export const useTempoConfirmed = () => useAppStore((state) => state.tempoSelection.tempoConfirmed);

// Navigation selectors
export const useCurrentTab = () => useAppStore((state) => state.currentTab);
export const useIsGuidedFlowActive = () => useAppStore((state) => state.isGuidedFlowActive);
export const useGuidedFlowStep = () => useAppStore((state) => state.guidedFlowStep);
export const useIsRecordArmed = () => useAppStore((state) => state.isRecordArmed);
export const useNavigation = () =>
  useAppStore((state) => ({
    currentTab: state.currentTab,
    isGuidedFlowActive: state.isGuidedFlowActive,
    guidedFlowStep: state.guidedFlowStep,
    isRecordArmed: state.isRecordArmed,
  }));

// Instrument setup selector
export const useInstrumentSetup = () => useAppStore((state) => state.instrumentSetup);

// Library selectors
export const useLibrary = () => useAppStore((state) => state.library);
export const useLibrarySongs = () => useAppStore((state) => state.library.songs);
export const useLibraryLoading = () => useAppStore((state) => state.library.isLoading);

// Band selectors
export const useBands = () => useAppStore((state) => state.bands);
export const useActiveBandId = () => useAppStore((state) => state.activeBandId);
export const useActiveBand = () =>
  useAppStore((state) => {
    if (!state.activeBandId) return null;
    return state.bands.find((b) => b.id === state.activeBandId) || null;
  });
export const useIsCreatingNewBand = () => useAppStore((state) => state.isCreatingNewBand);
export const usePendingBandName = () => useAppStore((state) => state.pendingBandName);

// Playback selectors
export const usePlayback = () => useAppStore((state) => state.playback);
export const useIsPlaying = () => useAppStore((state) => state.playback.isPlaying);
export const useCurrentSong = () => useAppStore((state) => state.playback.currentSong);
export const useIsFullScreenPlayerOpen = () => useAppStore((state) => state.playback.isFullScreenOpen);
