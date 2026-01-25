import { create } from 'zustand';
import type { AudioState, InstrumentType, RecordedLoop, PitchState, DrumType, InstrumentMode, BassState, BassSynthType, BassStyle, RealisticBassStyle, GuitarState, GuitarSynthType, GuitarStyle, RealisticGuitarStyle, ElectricGuitarStyle, PianoState, PianoSynthType, PianoStyle, RealisticPianoStyle, LayerInfo, TransportState, RecordingState as LayerRecordingState, LayerType, DrumHitEvent } from '../types';
import { libraryStorage, type SongMetadata } from './LibraryStorage';
import type { EffectType } from './VoiceEffects';
import type { DrumKitType } from './DrumKitPlayer';
import { bandStorage, type Band, type CreateBandInput } from './BandStorage';

/**
 * Zustand store for Beatbite application state.
 *
 * This store manages all audio-related state and provides actions
 * for updating it. Compatible with both React (web) and React Native.
 */

// Navigation state
type TabType = 'library' | 'record' | 'settings';
type GuidedFlowStep =
  | 'band-select'      // Select or create a band
  | 'band-name'        // Name the new band
  | 'tempo'
  | 'setup-drums'
  | 'setup-bass'
  | 'setup-guitar'
  | 'setup-piano'
  | 'setup-voice'
  | 'drums'
  | 'bass'
  | 'guitar'
  | 'piano'
  | 'voice'
  | 'complete';

interface NavigationState {
  currentTab: TabType;
  isGuidedFlowActive: boolean;
  guidedFlowStep: GuidedFlowStep;
  isRecordArmed: boolean;
  isCreatingNewBand: boolean;  // True when going through setup to create a new band
}

// Band state
interface BandState {
  bands: Band[];
  activeBandId: string | null;
  pendingBandName: string;  // Name for band being created
}

// Voice effects state for storing user selections
type VoiceEffectsSelection = Record<EffectType, boolean>;

// Instrument setup state (pre-recording selections)
interface InstrumentSetupState {
  selectedDrumKit: DrumKitType;
  // Bass synth selection
  selectedBassSynthType: BassSynthType;
  selectedBassStyle: BassStyle;              // For electronic synth
  selectedRealisticBassStyle: RealisticBassStyle;  // For realistic synth
  // Guitar synth selection
  selectedGuitarSynthType: GuitarSynthType;
  selectedGuitarStyle: GuitarStyle;          // For electronic synth
  selectedRealisticGuitarStyle: RealisticGuitarStyle;  // For acoustic sampled
  selectedElectricGuitarStyle: ElectricGuitarStyle;    // For electric sampled
  // Piano and voice
  selectedPianoStyle: PianoStyle;
  selectedVoiceEffects: VoiceEffectsSelection;
}

// Library state
interface LibraryState {
  songs: SongMetadata[];
  isLoading: boolean;
  selectedSongId: string | null;
}

// Playback state
interface PlaybackState {
  currentSongId: string | null;
  currentSong: SongMetadata | null;
  isPlaying: boolean;
  currentPosition: number; // ms
  duration: number; // ms
  isFullScreenOpen: boolean;
}

// Tempo selection state
interface TempoSelectionState {
  isTempoSelectionActive: boolean;
  selectedBpm: number;
  tempoConfirmed: boolean;
  currentMetronomeBeat: number;
}

// Looper state
interface LooperState {
  // Tempo selection
  tempoSelection: TempoSelectionState;
  // Transport
  transport: TransportState;
  // Layers
  layers: LayerInfo[];
  // Recording
  layerRecordingState: LayerRecordingState;
  activeRecordingLayer: LayerType | null;
  // Recorded events from guided flow
  recordedDrumEvents: DrumHitEvent[];
  // Instrument setup
  instrumentSetup: InstrumentSetupState;
  // Guitar
  guitar: GuitarState;
  // Piano
  piano: PianoState;
  // Library
  library: LibraryState;
  // Playback
  playback: PlaybackState;
}

interface AppStore extends AudioState, LooperState, NavigationState, BandState {
  // Actions for passthrough state
  setPassthroughActive: (active: boolean) => void;
  setRecording: (recording: boolean) => void;

  // Actions for audio levels
  setInputLevel: (level: number) => void;
  setLatency: (latencyMs: number) => void;

  // Actions for pitch
  setPitch: (pitch: PitchState) => void;

  // Actions for instrument mode
  setInstrumentMode: (mode: InstrumentMode) => void;
  setCurrentDrum: (drum: DrumType | null) => void;
  // Bass actions
  setBass: (bass: Partial<BassState>) => void;
  setBassSynthType: (synthType: BassSynthType) => void;
  setBassStyle: (style: BassStyle) => void;
  setRealisticBassStyle: (style: RealisticBassStyle) => void;
  // Guitar actions
  setGuitar: (guitar: Partial<GuitarState>) => void;
  setGuitarSynthType: (synthType: GuitarSynthType) => void;
  setGuitarStyle: (style: GuitarStyle) => void;
  setRealisticGuitarStyle: (style: RealisticGuitarStyle) => void;
  // Piano actions
  setPiano: (piano: Partial<PianoState>) => void;
  setPianoSynthType: (synthType: PianoSynthType) => void;
  setPianoStyle: (style: PianoStyle) => void;
  setRealisticPianoStyle: (style: RealisticPianoStyle) => void;

  // Actions for volume controls
  setInputGain: (gain: number) => void;
  setOutputVolume: (volume: number) => void;

  // Actions for instruments
  setCurrentInstrument: (instrument: InstrumentType) => void;

  // Actions for loops
  addLoop: (loop: RecordedLoop) => void;
  removeLoop: (id: string) => void;
  updateLoop: (id: string, updates: Partial<RecordedLoop>) => void;
  clearLoops: () => void;

  // Tempo selection actions
  setTempoSelectionActive: (active: boolean) => void;
  setSelectedBpm: (bpm: number) => void;
  confirmTempo: () => void;
  resetTempoSelection: () => void;
  setCurrentMetronomeBeat: (beat: number) => void;

  // Looper actions
  setTransport: (transport: TransportState) => void;
  setLayers: (layers: LayerInfo[]) => void;
  setLayerRecordingState: (state: LayerRecordingState, layerType: LayerType | null) => void;
  setRecordedDrumEvents: (events: DrumHitEvent[]) => void;

  // Instrument setup actions
  setSelectedDrumKit: (kit: DrumKitType) => void;
  // Bass setup
  setSelectedBassSynthType: (synthType: BassSynthType) => void;
  setSelectedBassStyle: (style: BassStyle) => void;
  setSelectedRealisticBassStyle: (style: RealisticBassStyle) => void;
  // Guitar setup
  setSelectedGuitarSynthType: (synthType: GuitarSynthType) => void;
  setSelectedGuitarStyle: (style: GuitarStyle) => void;
  setSelectedRealisticGuitarStyle: (style: RealisticGuitarStyle) => void;
  setSelectedElectricGuitarStyle: (style: ElectricGuitarStyle) => void;
  // Piano and voice setup
  setSelectedPianoStyle: (style: PianoStyle) => void;
  setSelectedVoiceEffects: (effects: VoiceEffectsSelection) => void;
  toggleSelectedVoiceEffect: (effect: EffectType) => void;
  resetInstrumentSetup: () => void;

  // Library actions
  initializeLibrary: () => Promise<void>;
  setLibrarySongs: (songs: SongMetadata[]) => void;
  setLibraryLoading: (loading: boolean) => void;
  setSelectedSongId: (id: string | null) => void;
  addSongToLibrary: (song: SongMetadata) => void;
  removeSongFromLibrary: (id: string) => void;

  // Playback actions
  playSong: (song: SongMetadata) => void;
  pausePlayback: () => void;
  resumePlayback: () => void;
  stopPlayback: () => void;
  setPlaybackPosition: (position: number) => void;
  openFullScreenPlayer: () => void;
  closeFullScreenPlayer: () => void;

  // Error handling
  setError: (error: string | null) => void;
  clearError: () => void;

  // Navigation actions
  setCurrentTab: (tab: TabType) => void;
  startGuidedFlow: () => void;
  exitGuidedFlow: () => void;
  setGuidedFlowStep: (step: GuidedFlowStep) => void;
  armRecording: () => void;
  disarmRecording: () => void;
  advanceGuidedFlowStep: () => void;

  // Band actions
  loadBands: () => void;
  selectBand: (bandId: string) => void;
  startNewBandCreation: () => void;
  setPendingBandName: (name: string) => void;
  saveNewBand: () => Band;
  createBandFromInput: (input: CreateBandInput) => Band;
  updateBand: (bandId: string, updates: Partial<Omit<Band, 'id' | 'createdAt'>>) => Band | null;
  deleteBand: (bandId: string) => void;
  loadBandConfiguration: (band: Band) => void;

  // Reset
  reset: () => void;
}

const initialPitch: PitchState = {
  frequency: 0,
  note: '--',
  noteName: '--',
  octave: 0,
  cents: 0,
  confidence: 0,
};

const initialBass: BassState = {
  frequency: 0,
  noteName: '--',
  synthType: 'electronic',
  style: 'synth',
  realisticStyle: 'finger',
  isPlaying: false,
};

const initialGuitar: GuitarState = {
  frequency: 0,
  noteName: '--',
  synthType: 'electric',  // Default to electric guitar (best quality)
  style: 'clean',
  realisticStyle: 'clean',
  electricStyle: 'clean',
  isPlaying: false,
};

const initialPiano: PianoState = {
  frequency: 0,
  noteName: '--',
  synthType: 'sampled',
  style: 'grand',
  realisticStyle: 'acoustic',
  isPlaying: false,
};

const initialInstrumentSetup: InstrumentSetupState = {
  selectedDrumKit: 'electronic',
  // Bass
  selectedBassSynthType: 'electronic',
  selectedBassStyle: 'synth',
  selectedRealisticBassStyle: 'finger',
  // Guitar
  selectedGuitarSynthType: 'electric',  // Default to electric guitar (best quality)
  selectedGuitarStyle: 'clean',
  selectedRealisticGuitarStyle: 'clean',
  selectedElectricGuitarStyle: 'clean',
  // Piano
  selectedPianoStyle: 'grand',
  selectedVoiceEffects: {
    reverb: false,
    delay: false,
    chorus: false,
    distortion: false,
  },
};

const initialLibrary: LibraryState = {
  songs: [],
  isLoading: false,
  selectedSongId: null,
};

const initialPlayback: PlaybackState = {
  currentSongId: null,
  currentSong: null,
  isPlaying: false,
  currentPosition: 0,
  duration: 0,
  isFullScreenOpen: false,
};

const initialNavigation: NavigationState = {
  currentTab: 'record',  // Default to Record (middle tab)
  isGuidedFlowActive: false,
  guidedFlowStep: 'band-select',  // Start with band selection
  isRecordArmed: false,
  isCreatingNewBand: false,
};

const initialBandState: BandState = {
  bands: bandStorage.getAllBands(),  // Load from localStorage on startup
  activeBandId: bandStorage.getActiveBandId(),  // Restore active band
  pendingBandName: '',
};

const initialTempoSelection: TempoSelectionState = {
  isTempoSelectionActive: false,  // Now controlled by guided flow
  selectedBpm: 120,
  tempoConfirmed: false,
  currentMetronomeBeat: 0,
};

const initialTransport: TransportState = {
  bpm: 120,
  loopLengthMs: 0,
  loopLengthSamples: 0,
  bars: 4,
  beatsPerBar: 4,
  currentPosition: 0,
  currentBeat: 0,
  currentBar: 0,
  isPlaying: false,
};

const initialState: AudioState & LooperState & NavigationState & BandState = {
  // Navigation state
  ...initialNavigation,
  // Band state
  ...initialBandState,
  isPassthroughActive: false,
  isRecording: false,
  inputLevel: 0,
  latencyMs: 0,
  inputGain: 1.0,
  outputVolume: 0.8,
  currentInstrument: 'drums',
  loops: [],
  error: null,
  pitch: initialPitch,
  instrumentMode: 'drums',
  currentDrum: null,
  bass: initialBass,
  guitar: initialGuitar,
  piano: initialPiano,
  // Looper state
  tempoSelection: initialTempoSelection,
  transport: initialTransport,
  layers: [],
  layerRecordingState: 'idle',
  activeRecordingLayer: null,
  recordedDrumEvents: [],
  instrumentSetup: initialInstrumentSetup,
  library: initialLibrary,
  playback: initialPlayback,
};

export const useAppStore = create<AppStore>((set) => ({
  // Initial state
  ...initialState,

  // Passthrough state actions
  setPassthroughActive: (active) =>
    set({ isPassthroughActive: active }),

  setRecording: (recording) =>
    set({ isRecording: recording }),

  // Audio level actions
  setInputLevel: (level) =>
    set({ inputLevel: Math.max(0, Math.min(1, level)) }),

  setLatency: (latencyMs) =>
    set({ latencyMs }),

  // Pitch actions
  setPitch: (pitch) =>
    set({ pitch }),

  // Instrument mode actions
  setInstrumentMode: (mode) =>
    set({ instrumentMode: mode }),

  setCurrentDrum: (drum) =>
    set({ currentDrum: drum }),

  // Bass actions
  setBass: (bass) =>
    set((state) => ({ bass: { ...state.bass, ...bass } })),

  setBassSynthType: (synthType) =>
    set((state) => ({ bass: { ...state.bass, synthType } })),

  setBassStyle: (style) =>
    set((state) => ({ bass: { ...state.bass, style } })),

  setRealisticBassStyle: (style) =>
    set((state) => ({ bass: { ...state.bass, realisticStyle: style } })),

  // Guitar actions
  setGuitar: (guitar) =>
    set((state) => ({ guitar: { ...state.guitar, ...guitar } })),

  setGuitarSynthType: (synthType) =>
    set((state) => ({ guitar: { ...state.guitar, synthType } })),

  setGuitarStyle: (style) =>
    set((state) => ({ guitar: { ...state.guitar, style } })),

  setRealisticGuitarStyle: (style) =>
    set((state) => ({ guitar: { ...state.guitar, realisticStyle: style } })),

  // Piano actions
  setPiano: (piano) =>
    set((state) => ({ piano: { ...state.piano, ...piano } })),

  setPianoSynthType: (synthType) =>
    set((state) => ({ piano: { ...state.piano, synthType } })),

  setPianoStyle: (style) =>
    set((state) => ({ piano: { ...state.piano, style } })),

  setRealisticPianoStyle: (style) =>
    set((state) => ({ piano: { ...state.piano, realisticStyle: style } })),

  // Volume control actions
  setInputGain: (gain) =>
    set({ inputGain: Math.max(0, Math.min(2, gain)) }),

  setOutputVolume: (volume) =>
    set({ outputVolume: Math.max(0, Math.min(1, volume)) }),

  // Instrument actions
  setCurrentInstrument: (instrument) =>
    set({ currentInstrument: instrument }),

  // Loop actions
  addLoop: (loop) =>
    set((state) => ({ loops: [...state.loops, loop] })),

  removeLoop: (id) =>
    set((state) => ({
      loops: state.loops.filter((loop) => loop.id !== id),
    })),

  updateLoop: (id, updates) =>
    set((state) => ({
      loops: state.loops.map((loop) =>
        loop.id === id ? { ...loop, ...updates } : loop
      ),
    })),

  clearLoops: () =>
    set({ loops: [] }),

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

  resetTempoSelection: () =>
    set({ tempoSelection: initialTempoSelection }),

  setCurrentMetronomeBeat: (beat) =>
    set((state) => ({
      tempoSelection: { ...state.tempoSelection, currentMetronomeBeat: beat },
    })),

  // Looper actions
  setTransport: (transport) =>
    set({ transport }),

  setLayers: (layers) =>
    set({ layers }),

  setLayerRecordingState: (state, layerType) =>
    set({ layerRecordingState: state, activeRecordingLayer: layerType }),

  setRecordedDrumEvents: (events) =>
    set({ recordedDrumEvents: events }),

  // Instrument setup actions
  setSelectedDrumKit: (kit) =>
    set((state) => ({
      instrumentSetup: { ...state.instrumentSetup, selectedDrumKit: kit },
    })),

  // Bass setup actions
  setSelectedBassSynthType: (synthType) =>
    set((state) => ({
      instrumentSetup: { ...state.instrumentSetup, selectedBassSynthType: synthType },
    })),

  setSelectedBassStyle: (style) =>
    set((state) => ({
      instrumentSetup: { ...state.instrumentSetup, selectedBassStyle: style },
    })),

  setSelectedRealisticBassStyle: (style) =>
    set((state) => ({
      instrumentSetup: { ...state.instrumentSetup, selectedRealisticBassStyle: style },
    })),

  // Guitar setup actions
  setSelectedGuitarSynthType: (synthType) =>
    set((state) => ({
      instrumentSetup: { ...state.instrumentSetup, selectedGuitarSynthType: synthType },
    })),

  setSelectedGuitarStyle: (style) =>
    set((state) => ({
      instrumentSetup: { ...state.instrumentSetup, selectedGuitarStyle: style },
    })),

  setSelectedRealisticGuitarStyle: (style) =>
    set((state) => ({
      instrumentSetup: { ...state.instrumentSetup, selectedRealisticGuitarStyle: style },
    })),

  setSelectedElectricGuitarStyle: (style) =>
    set((state) => ({
      instrumentSetup: { ...state.instrumentSetup, selectedElectricGuitarStyle: style },
    })),

  setSelectedPianoStyle: (style) =>
    set((state) => ({
      instrumentSetup: { ...state.instrumentSetup, selectedPianoStyle: style },
    })),

  setSelectedVoiceEffects: (effects) =>
    set((state) => ({
      instrumentSetup: { ...state.instrumentSetup, selectedVoiceEffects: effects },
    })),

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

  resetInstrumentSetup: () =>
    set({ instrumentSetup: initialInstrumentSetup }),

  // Library actions
  initializeLibrary: async () => {
    set((state) => ({
      library: { ...state.library, isLoading: true },
    }));
    try {
      const songs = await libraryStorage.getSongsList();
      set((state) => ({
        library: { ...state.library, songs, isLoading: false },
      }));
    } catch (error) {
      console.error('[Store] Failed to initialize library:', error);
      set((state) => ({
        library: { ...state.library, isLoading: false },
      }));
    }
  },

  setLibrarySongs: (songs) =>
    set((state) => ({
      library: { ...state.library, songs },
    })),

  setLibraryLoading: (loading) =>
    set((state) => ({
      library: { ...state.library, isLoading: loading },
    })),

  setSelectedSongId: (id) =>
    set((state) => ({
      library: { ...state.library, selectedSongId: id },
    })),

  addSongToLibrary: (song) =>
    set((state) => ({
      library: { ...state.library, songs: [song, ...state.library.songs] },
    })),

  removeSongFromLibrary: (id) =>
    set((state) => ({
      library: {
        ...state.library,
        songs: state.library.songs.filter((s) => s.id !== id),
      },
    })),

  // Playback actions
  playSong: (song) =>
    set({
      playback: {
        currentSongId: song.id,
        currentSong: song,
        isPlaying: true,
        currentPosition: 0,
        duration: song.duration,
        isFullScreenOpen: false,
      },
    }),

  pausePlayback: () =>
    set((state) => ({
      playback: { ...state.playback, isPlaying: false },
    })),

  resumePlayback: () =>
    set((state) => ({
      playback: { ...state.playback, isPlaying: true },
    })),

  stopPlayback: () =>
    set({
      playback: initialPlayback,
    }),

  setPlaybackPosition: (position) =>
    set((state) => ({
      playback: { ...state.playback, currentPosition: position },
    })),

  openFullScreenPlayer: () =>
    set((state) => ({
      playback: { ...state.playback, isFullScreenOpen: true },
    })),

  closeFullScreenPlayer: () =>
    set((state) => ({
      playback: { ...state.playback, isFullScreenOpen: false },
    })),

  // Error handling
  setError: (error) =>
    set({ error }),

  clearError: () =>
    set({ error: null }),

  // Navigation actions
  setCurrentTab: (tab) =>
    set({ currentTab: tab }),

  startGuidedFlow: () =>
    set({
      isGuidedFlowActive: true,
      guidedFlowStep: 'band-select',  // Start with band selection
      isRecordArmed: false,
      isCreatingNewBand: false,
      bands: bandStorage.getAllBands(),  // Load bands from storage
      tempoSelection: { ...initialTempoSelection, isTempoSelectionActive: false },
    }),

  exitGuidedFlow: () =>
    set({
      isGuidedFlowActive: false,
      guidedFlowStep: 'band-select',
      isRecordArmed: false,
      isCreatingNewBand: false,
      pendingBandName: '',
      tempoSelection: initialTempoSelection,
    }),

  setGuidedFlowStep: (step) =>
    set({ guidedFlowStep: step }),

  armRecording: () =>
    set({ isRecordArmed: true }),

  disarmRecording: () =>
    set({ isRecordArmed: false }),

  advanceGuidedFlowStep: () =>
    set((state) => {
      // Different step orders based on whether creating new band or using existing
      const newBandStepOrder: GuidedFlowStep[] = [
        'band-select',
        'band-name',
        'setup-drums',
        'setup-bass',
        'setup-guitar',
        'setup-piano',
        'setup-voice',
        'tempo',
        'drums',
        'bass',
        'guitar',
        'piano',
        'voice',
        'complete',
      ];
      const existingBandStepOrder: GuidedFlowStep[] = [
        'band-select',
        'tempo',
        'drums',
        'bass',
        'guitar',
        'piano',
        'voice',
        'complete',
      ];
      const stepOrder = state.isCreatingNewBand ? newBandStepOrder : existingBandStepOrder;
      const currentIndex = stepOrder.indexOf(state.guidedFlowStep);
      const nextStep = stepOrder[Math.min(currentIndex + 1, stepOrder.length - 1)];
      return { guidedFlowStep: nextStep, isRecordArmed: false };
    }),

  // Band actions
  loadBands: () =>
    set({ bands: bandStorage.getAllBands() }),

  selectBand: (bandId) =>
    set((state) => {
      const band = bandStorage.getBandById(bandId);
      if (!band) return state;

      bandStorage.setActiveBandId(bandId);

      // Load the band's configuration into instrumentSetup
      // Handle backwards compatibility for bands created before synth types existed
      return {
        activeBandId: bandId,
        isCreatingNewBand: false,
        instrumentSetup: {
          selectedDrumKit: band.drumKit,
          // Bass
          selectedBassSynthType: band.bassSynthType ?? 'electronic',
          selectedBassStyle: band.bassStyle,
          selectedRealisticBassStyle: band.realisticBassStyle ?? 'finger',
          // Guitar
          selectedGuitarSynthType: band.guitarSynthType ?? 'electric',
          selectedGuitarStyle: band.guitarStyle,
          selectedRealisticGuitarStyle: band.realisticGuitarStyle ?? 'clean',
          selectedElectricGuitarStyle: band.electricGuitarStyle ?? 'clean',
          // Piano and voice
          selectedPianoStyle: band.pianoStyle,
          selectedVoiceEffects: band.voiceEffects,
        },
        guidedFlowStep: 'tempo',  // Skip setup, go to tempo
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

  setPendingBandName: (name) =>
    set({ pendingBandName: name }),

  saveNewBand: () => {
    const state = useAppStore.getState();
    const input: CreateBandInput = {
      name: state.pendingBandName || `Band ${state.bands.length + 1}`,
      // Drums - default to electronic synth type for guided flow
      drumSynthType: 'electronic',
      drumKit: state.instrumentSetup.selectedDrumKit,
      sampledDrumKit: 'acoustic',
      // Bass
      bassSynthType: state.instrumentSetup.selectedBassSynthType,
      bassStyle: state.instrumentSetup.selectedBassStyle,
      realisticBassStyle: state.instrumentSetup.selectedRealisticBassStyle,
      // Guitar
      guitarSynthType: state.instrumentSetup.selectedGuitarSynthType,
      guitarStyle: state.instrumentSetup.selectedGuitarStyle,
      realisticGuitarStyle: state.instrumentSetup.selectedRealisticGuitarStyle,
      electricGuitarStyle: state.instrumentSetup.selectedElectricGuitarStyle,
      // Piano - default to electronic synth type for guided flow
      pianoSynthType: 'electronic',
      pianoStyle: state.instrumentSetup.selectedPianoStyle,
      realisticPianoStyle: 'acoustic',
      // Voice effects
      voiceEffects: state.instrumentSetup.selectedVoiceEffects,
    };
    const band = bandStorage.createBand(input);
    bandStorage.setActiveBandId(band.id);

    useAppStore.setState({
      bands: bandStorage.getAllBands(),
      activeBandId: band.id,
      isCreatingNewBand: false,
      pendingBandName: '',
    });

    return band;
  },

  createBandFromInput: (input: CreateBandInput) => {
    const band = bandStorage.createBand(input);
    useAppStore.setState({
      bands: bandStorage.getAllBands(),
    });
    return band;
  },

  updateBand: (bandId, updates) => {
    const updatedBand = bandStorage.updateBand(bandId, updates);
    if (updatedBand) {
      useAppStore.setState({
        bands: bandStorage.getAllBands(),
      });
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
        // Bass (with backwards compatibility)
        selectedBassSynthType: band.bassSynthType ?? 'electronic',
        selectedBassStyle: band.bassStyle,
        selectedRealisticBassStyle: band.realisticBassStyle ?? 'finger',
        // Guitar (with backwards compatibility)
        selectedGuitarSynthType: band.guitarSynthType ?? 'electric',
        selectedGuitarStyle: band.guitarStyle,
        selectedRealisticGuitarStyle: band.realisticGuitarStyle ?? 'clean',
        selectedElectricGuitarStyle: band.electricGuitarStyle ?? 'clean',
        // Piano and voice
        selectedPianoStyle: band.pianoStyle,
        selectedVoiceEffects: band.voiceEffects,
      },
    }),

  // Reset to initial state
  reset: () =>
    set(initialState),
}));

// Selector hooks for optimized re-renders
export const useIsPassthroughActive = () =>
  useAppStore((state) => state.isPassthroughActive);

export const useInputLevel = () =>
  useAppStore((state) => state.inputLevel);

export const useLatency = () =>
  useAppStore((state) => state.latencyMs);

export const useOutputVolume = () =>
  useAppStore((state) => state.outputVolume);

export const useError = () =>
  useAppStore((state) => state.error);

export const usePitch = () =>
  useAppStore((state) => state.pitch);

export const useInstrumentMode = () =>
  useAppStore((state) => state.instrumentMode);

export const useCurrentDrum = () =>
  useAppStore((state) => state.currentDrum);

export const useBass = () =>
  useAppStore((state) => state.bass);

// Looper selectors
export const useTransport = () =>
  useAppStore((state) => state.transport);

export const useLayers = () =>
  useAppStore((state) => state.layers);

export const useLayerRecordingState = () =>
  useAppStore((state) => ({
    state: state.layerRecordingState,
    activeLayer: state.activeRecordingLayer,
  }));

// Tempo selection selectors
export const useTempoSelection = () =>
  useAppStore((state) => state.tempoSelection);

export const useSelectedBpm = () =>
  useAppStore((state) => state.tempoSelection.selectedBpm);

export const useTempoConfirmed = () =>
  useAppStore((state) => state.tempoSelection.tempoConfirmed);

// Navigation selectors
export const useCurrentTab = () =>
  useAppStore((state) => state.currentTab);

export const useIsGuidedFlowActive = () =>
  useAppStore((state) => state.isGuidedFlowActive);

export const useGuidedFlowStep = () =>
  useAppStore((state) => state.guidedFlowStep);

export const useIsRecordArmed = () =>
  useAppStore((state) => state.isRecordArmed);

export const useNavigation = () =>
  useAppStore((state) => ({
    currentTab: state.currentTab,
    isGuidedFlowActive: state.isGuidedFlowActive,
    guidedFlowStep: state.guidedFlowStep,
    isRecordArmed: state.isRecordArmed,
  }));

// Guitar selectors
export const useGuitar = () =>
  useAppStore((state) => state.guitar);

export const usePiano = () =>
  useAppStore((state) => state.piano);

// Instrument setup selectors
export const useInstrumentSetup = () =>
  useAppStore((state) => state.instrumentSetup);

// Library selectors
export const useLibrary = () =>
  useAppStore((state) => state.library);

export const useLibrarySongs = () =>
  useAppStore((state) => state.library.songs);

export const useLibraryLoading = () =>
  useAppStore((state) => state.library.isLoading);

// Band selectors
export const useBands = () =>
  useAppStore((state) => state.bands);

export const useActiveBandId = () =>
  useAppStore((state) => state.activeBandId);

export const useActiveBand = () =>
  useAppStore((state) => {
    if (!state.activeBandId) return null;
    return state.bands.find(b => b.id === state.activeBandId) || null;
  });

// Playback selectors
export const usePlayback = () =>
  useAppStore((state) => state.playback);

export const useIsPlaying = () =>
  useAppStore((state) => state.playback.isPlaying);

export const useCurrentSong = () =>
  useAppStore((state) => state.playback.currentSong);

export const useIsFullScreenPlayerOpen = () =>
  useAppStore((state) => state.playback.isFullScreenOpen);

export const useIsCreatingNewBand = () =>
  useAppStore((state) => state.isCreatingNewBand);

export const usePendingBandName = () =>
  useAppStore((state) => state.pendingBandName);

// Export types
export type { GuidedFlowStep, TabType, InstrumentSetupState, LibraryState, VoiceEffectsSelection };
