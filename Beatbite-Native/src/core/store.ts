import { create } from 'zustand';
import type {
  InstrumentType,
  InstrumentMode,
  BassStyle,
  GuitarStyle,
  DrumKitType,
  EffectType,
  GuidedFlowStep,
  LayerType,
  RecordingState,
} from '../types';

/**
 * Zustand store for Beatbite Native application state.
 *
 * This store manages all audio-related state and provides actions
 * for updating it. Compatible with React Native.
 */

// Navigation state
type TabType = 'library' | 'record' | 'settings';

interface NavigationState {
  currentTab: TabType;
  isGuidedFlowActive: boolean;
  guidedFlowStep: GuidedFlowStep;
  isRecordArmed: boolean;
}

// Instrument setup state (pre-recording selections)
interface InstrumentSetupState {
  selectedDrumKit: DrumKitType;
  selectedBassStyle: BassStyle;
  selectedGuitarStyle: GuitarStyle;
  selectedVoiceEffect: EffectType | null;
}

// Tempo selection state
interface TempoSelectionState {
  isTempoSelectionActive: boolean;
  selectedBpm: number;
  tempoConfirmed: boolean;
  currentMetronomeBeat: number;
}

// Transport state
interface TransportState {
  bpm: number;
  loopLengthMs: number;
  bars: number;
  beatsPerBar: number;
  currentPosition: number;
  currentBeat: number;
  currentBar: number;
  isPlaying: boolean;
}

// Bass state
interface BassState {
  frequency: number;
  noteName: string;
  style: BassStyle;
  isPlaying: boolean;
}

// Guitar state
interface GuitarState {
  frequency: number;
  noteName: string;
  style: GuitarStyle;
  isPlaying: boolean;
}

// Layer info
interface LayerInfo {
  id: string;
  type: LayerType;
  name: string;
  volume: number;
  muted: boolean;
  duration: number;
}

// Audio state
interface AudioState {
  isPassthroughActive: boolean;
  isRecording: boolean;
  inputLevel: number;
  latencyMs: number;
  inputGain: number;
  outputVolume: number;
  currentInstrument: InstrumentType;
  error: string | null;
  instrumentMode: InstrumentMode;
}

// Full app state
interface AppStore extends AudioState, NavigationState {
  // Nested state
  tempoSelection: TempoSelectionState;
  transport: TransportState;
  layers: LayerInfo[];
  layerRecordingState: RecordingState;
  activeRecordingLayer: LayerType | null;
  instrumentSetup: InstrumentSetupState;
  bass: BassState;
  guitar: GuitarState;

  // Audio actions
  setPassthroughActive: (active: boolean) => void;
  setRecording: (recording: boolean) => void;
  setInputLevel: (level: number) => void;
  setLatency: (latencyMs: number) => void;
  setInstrumentMode: (mode: InstrumentMode) => void;
  setInputGain: (gain: number) => void;
  setOutputVolume: (volume: number) => void;
  setCurrentInstrument: (instrument: InstrumentType) => void;
  setError: (error: string | null) => void;
  clearError: () => void;

  // Bass/Guitar actions
  setBass: (bass: Partial<BassState>) => void;
  setBassStyle: (style: BassStyle) => void;
  setGuitar: (guitar: Partial<GuitarState>) => void;
  setGuitarStyle: (style: GuitarStyle) => void;

  // Tempo selection actions
  setTempoSelectionActive: (active: boolean) => void;
  setSelectedBpm: (bpm: number) => void;
  confirmTempo: () => void;
  resetTempoSelection: () => void;
  setCurrentMetronomeBeat: (beat: number) => void;

  // Looper actions
  setTransport: (transport: TransportState) => void;
  setLayers: (layers: LayerInfo[]) => void;
  setLayerRecordingState: (state: RecordingState, layerType: LayerType | null) => void;

  // Instrument setup actions
  setSelectedDrumKit: (kit: DrumKitType) => void;
  setSelectedBassStyle: (style: BassStyle) => void;
  setSelectedGuitarStyle: (style: GuitarStyle) => void;
  setSelectedVoiceEffect: (effect: EffectType | null) => void;
  resetInstrumentSetup: () => void;

  // Navigation actions
  setCurrentTab: (tab: TabType) => void;
  startGuidedFlow: () => void;
  exitGuidedFlow: () => void;
  setGuidedFlowStep: (step: GuidedFlowStep) => void;
  armRecording: () => void;
  disarmRecording: () => void;
  advanceGuidedFlowStep: () => void;

  // Reset
  reset: () => void;
}

const initialBass: BassState = {
  frequency: 0,
  noteName: '--',
  style: 'synth',
  isPlaying: false,
};

const initialGuitar: GuitarState = {
  frequency: 0,
  noteName: '--',
  style: 'clean',
  isPlaying: false,
};

const initialInstrumentSetup: InstrumentSetupState = {
  selectedDrumKit: 'electronic',
  selectedBassStyle: 'synth',
  selectedGuitarStyle: 'clean',
  selectedVoiceEffect: null,
};

const initialNavigation: NavigationState = {
  currentTab: 'record',
  isGuidedFlowActive: false,
  guidedFlowStep: 'welcome',
  isRecordArmed: false,
};

const initialTempoSelection: TempoSelectionState = {
  isTempoSelectionActive: false,
  selectedBpm: 120,
  tempoConfirmed: false,
  currentMetronomeBeat: 0,
};

const initialTransport: TransportState = {
  bpm: 120,
  loopLengthMs: 0,
  bars: 4,
  beatsPerBar: 4,
  currentPosition: 0,
  currentBeat: 0,
  currentBar: 0,
  isPlaying: false,
};

const initialState = {
  // Navigation
  ...initialNavigation,
  // Audio
  isPassthroughActive: false,
  isRecording: false,
  inputLevel: 0,
  latencyMs: 0,
  inputGain: 1.0,
  outputVolume: 0.8,
  currentInstrument: 'drums' as InstrumentType,
  error: null,
  instrumentMode: 'drums' as InstrumentMode,
  // Nested state
  tempoSelection: initialTempoSelection,
  transport: initialTransport,
  layers: [] as LayerInfo[],
  layerRecordingState: 'idle' as RecordingState,
  activeRecordingLayer: null as LayerType | null,
  instrumentSetup: initialInstrumentSetup,
  bass: initialBass,
  guitar: initialGuitar,
};

export const useAppStore = create<AppStore>((set) => ({
  ...initialState,

  // Audio actions
  setPassthroughActive: (active) => set({ isPassthroughActive: active }),
  setRecording: (recording) => set({ isRecording: recording }),
  setInputLevel: (level) => set({ inputLevel: Math.max(0, Math.min(1, level)) }),
  setLatency: (latencyMs) => set({ latencyMs }),
  setInstrumentMode: (mode) => set({ instrumentMode: mode }),
  setInputGain: (gain) => set({ inputGain: Math.max(0, Math.min(2, gain)) }),
  setOutputVolume: (volume) => set({ outputVolume: Math.max(0, Math.min(1, volume)) }),
  setCurrentInstrument: (instrument) => set({ currentInstrument: instrument }),
  setError: (error) => set({ error }),
  clearError: () => set({ error: null }),

  // Bass/Guitar actions
  setBass: (bass) => set((state) => ({ bass: { ...state.bass, ...bass } })),
  setBassStyle: (style) => set((state) => ({ bass: { ...state.bass, style } })),
  setGuitar: (guitar) => set((state) => ({ guitar: { ...state.guitar, ...guitar } })),
  setGuitarStyle: (style) => set((state) => ({ guitar: { ...state.guitar, style } })),

  // Tempo selection actions
  setTempoSelectionActive: (active) =>
    set((state) => ({
      tempoSelection: { ...state.tempoSelection, isTempoSelectionActive: active },
    })),
  setSelectedBpm: (bpm) =>
    set((state) => ({
      tempoSelection: { ...state.tempoSelection, selectedBpm: Math.max(60, Math.min(200, bpm)) },
    })),
  confirmTempo: () =>
    set((state) => ({
      tempoSelection: { ...state.tempoSelection, tempoConfirmed: true, isTempoSelectionActive: false },
      transport: { ...state.transport, bpm: state.tempoSelection.selectedBpm },
    })),
  resetTempoSelection: () => set({ tempoSelection: initialTempoSelection }),
  setCurrentMetronomeBeat: (beat) =>
    set((state) => ({
      tempoSelection: { ...state.tempoSelection, currentMetronomeBeat: beat },
    })),

  // Looper actions
  setTransport: (transport) => set({ transport }),
  setLayers: (layers) => set({ layers }),
  setLayerRecordingState: (state, layerType) =>
    set({ layerRecordingState: state, activeRecordingLayer: layerType }),

  // Instrument setup actions
  setSelectedDrumKit: (kit) =>
    set((state) => ({
      instrumentSetup: { ...state.instrumentSetup, selectedDrumKit: kit },
    })),
  setSelectedBassStyle: (style) =>
    set((state) => ({
      instrumentSetup: { ...state.instrumentSetup, selectedBassStyle: style },
    })),
  setSelectedGuitarStyle: (style) =>
    set((state) => ({
      instrumentSetup: { ...state.instrumentSetup, selectedGuitarStyle: style },
    })),
  setSelectedVoiceEffect: (effect) =>
    set((state) => ({
      instrumentSetup: { ...state.instrumentSetup, selectedVoiceEffect: effect },
    })),
  resetInstrumentSetup: () => set({ instrumentSetup: initialInstrumentSetup }),

  // Navigation actions
  setCurrentTab: (tab) => set({ currentTab: tab }),
  startGuidedFlow: () =>
    set({
      isGuidedFlowActive: true,
      guidedFlowStep: 'tempo',
      isRecordArmed: false,
      tempoSelection: { ...initialTempoSelection, isTempoSelectionActive: true },
    }),
  exitGuidedFlow: () =>
    set({
      isGuidedFlowActive: false,
      guidedFlowStep: 'welcome',
      isRecordArmed: false,
      tempoSelection: initialTempoSelection,
    }),
  setGuidedFlowStep: (step) => set({ guidedFlowStep: step }),
  armRecording: () => set({ isRecordArmed: true }),
  disarmRecording: () => set({ isRecordArmed: false }),
  advanceGuidedFlowStep: () =>
    set((state) => {
      const stepOrder: GuidedFlowStep[] = [
        'welcome',
        'tempo',
        'setup-drums',
        'setup-bass',
        'setup-guitar',
        'setup-voice',
        'drums',
        'bass',
        'guitar',
        'voice',
        'mix',
      ];
      const currentIndex = stepOrder.indexOf(state.guidedFlowStep);
      const nextStep = stepOrder[Math.min(currentIndex + 1, stepOrder.length - 1)];
      return { guidedFlowStep: nextStep, isRecordArmed: false };
    }),

  // Reset
  reset: () => set(initialState),
}));

// Selector hooks
export const useIsPassthroughActive = () => useAppStore((state) => state.isPassthroughActive);
export const useInputLevel = () => useAppStore((state) => state.inputLevel);
export const useLatency = () => useAppStore((state) => state.latencyMs);
export const useOutputVolume = () => useAppStore((state) => state.outputVolume);
export const useError = () => useAppStore((state) => state.error);
export const useInstrumentMode = () => useAppStore((state) => state.instrumentMode);
export const useBass = () => useAppStore((state) => state.bass);
export const useGuitar = () => useAppStore((state) => state.guitar);
export const useTransport = () => useAppStore((state) => state.transport);
export const useLayers = () => useAppStore((state) => state.layers);
export const useTempoSelection = () => useAppStore((state) => state.tempoSelection);
export const useSelectedBpm = () => useAppStore((state) => state.tempoSelection.selectedBpm);
export const useTempoConfirmed = () => useAppStore((state) => state.tempoSelection.tempoConfirmed);
export const useCurrentTab = () => useAppStore((state) => state.currentTab);
export const useIsGuidedFlowActive = () => useAppStore((state) => state.isGuidedFlowActive);
export const useGuidedFlowStep = () => useAppStore((state) => state.guidedFlowStep);
export const useIsRecordArmed = () => useAppStore((state) => state.isRecordArmed);
export const useInstrumentSetup = () => useAppStore((state) => state.instrumentSetup);

export const useNavigation = () =>
  useAppStore((state) => ({
    currentTab: state.currentTab,
    isGuidedFlowActive: state.isGuidedFlowActive,
    guidedFlowStep: state.guidedFlowStep,
    isRecordArmed: state.isRecordArmed,
  }));

// Export types
export type { GuidedFlowStep, TabType, InstrumentSetupState };
