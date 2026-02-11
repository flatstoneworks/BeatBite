/**
 * Store type definitions, initial values, and the combined AppStore type.
 */

import type {
  AudioState, InstrumentType, RecordedLoop, PitchState, DrumType, InstrumentMode,
  BassState, BassSynthType, BassStyle, RealisticBassStyle,
  GuitarState, GuitarSynthType, GuitarStyle, RealisticGuitarStyle, ElectricGuitarStyle,
  PianoState, PianoSynthType, PianoStyle, RealisticPianoStyle,
  LayerInfo, TransportState, RecordingState as LayerRecordingState, LayerType, DrumHitEvent,
} from '../../types';
import type { SongMetadata } from '../LibraryStorage';
import type { EffectType } from '../VoiceEffects';
import type { DrumKitType } from '../DrumKitPlayer';
import type { Band, CreateBandInput } from '../BandStorage';

// ==================== Navigation types ====================

export type TabType = 'library' | 'record' | 'settings';

export type GuidedFlowStep =
  | 'band-select'
  | 'band-name'
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

// ==================== State interfaces ====================

export interface NavigationState {
  currentTab: TabType;
  isGuidedFlowActive: boolean;
  guidedFlowStep: GuidedFlowStep;
  isRecordArmed: boolean;
  isCreatingNewBand: boolean;
}

export interface BandState {
  bands: Band[];
  activeBandId: string | null;
  pendingBandName: string;
}

export type VoiceEffectsSelection = Record<EffectType, boolean>;

export interface InstrumentSetupState {
  selectedDrumKit: DrumKitType;
  selectedBassSynthType: BassSynthType;
  selectedBassStyle: BassStyle;
  selectedRealisticBassStyle: RealisticBassStyle;
  selectedGuitarSynthType: GuitarSynthType;
  selectedGuitarStyle: GuitarStyle;
  selectedRealisticGuitarStyle: RealisticGuitarStyle;
  selectedElectricGuitarStyle: ElectricGuitarStyle;
  selectedPianoStyle: PianoStyle;
  selectedVoiceEffects: VoiceEffectsSelection;
}

export interface LibraryState {
  songs: SongMetadata[];
  isLoading: boolean;
  selectedSongId: string | null;
}

export interface PlaybackState {
  currentSongId: string | null;
  currentSong: SongMetadata | null;
  isPlaying: boolean;
  currentPosition: number;
  duration: number;
  isFullScreenOpen: boolean;
}

export interface TempoSelectionState {
  isTempoSelectionActive: boolean;
  selectedBpm: number;
  tempoConfirmed: boolean;
  currentMetronomeBeat: number;
}

// ==================== Initial values ====================

export const initialPitch: PitchState = {
  frequency: 0, note: '--', noteName: '--', octave: 0, cents: 0, confidence: 0,
};

export const initialBass: BassState = {
  frequency: 0, noteName: '--', synthType: 'electronic', style: 'synth', realisticStyle: 'finger', isPlaying: false,
};

export const initialGuitar: GuitarState = {
  frequency: 0, noteName: '--', synthType: 'electric', style: 'clean', realisticStyle: 'clean', electricStyle: 'clean', isPlaying: false,
};

export const initialPiano: PianoState = {
  frequency: 0, noteName: '--', synthType: 'sampled', style: 'grand', realisticStyle: 'acoustic', isPlaying: false,
};

export const initialInstrumentSetup: InstrumentSetupState = {
  selectedDrumKit: 'electronic',
  selectedBassSynthType: 'electronic',
  selectedBassStyle: 'synth',
  selectedRealisticBassStyle: 'finger',
  selectedGuitarSynthType: 'electric',
  selectedGuitarStyle: 'clean',
  selectedRealisticGuitarStyle: 'clean',
  selectedElectricGuitarStyle: 'clean',
  selectedPianoStyle: 'grand',
  selectedVoiceEffects: { reverb: false, delay: false, chorus: false, distortion: false },
};

export const initialLibrary: LibraryState = {
  songs: [], isLoading: false, selectedSongId: null,
};

export const initialPlayback: PlaybackState = {
  currentSongId: null, currentSong: null, isPlaying: false, currentPosition: 0, duration: 0, isFullScreenOpen: false,
};

export const initialNavigation: NavigationState = {
  currentTab: 'record',
  isGuidedFlowActive: false,
  guidedFlowStep: 'band-select',
  isRecordArmed: false,
  isCreatingNewBand: false,
};

export const initialTempoSelection: TempoSelectionState = {
  isTempoSelectionActive: false, selectedBpm: 120, tempoConfirmed: false, currentMetronomeBeat: 0,
};

export const initialTransport: TransportState = {
  bpm: 120, loopLengthMs: 0, loopLengthSamples: 0, bars: 4, beatsPerBar: 4,
  currentPosition: 0, currentBeat: 0, currentBar: 0, isPlaying: false,
};

// ==================== Slice interfaces ====================

export interface AudioSlice extends AudioState {
  guitar: GuitarState;
  piano: PianoState;
  setPassthroughActive: (active: boolean) => void;
  setRecording: (recording: boolean) => void;
  setInputLevel: (level: number) => void;
  setLatency: (latencyMs: number) => void;
  setPitch: (pitch: PitchState) => void;
  setInstrumentMode: (mode: InstrumentMode) => void;
  setCurrentDrum: (drum: DrumType | null) => void;
  setBass: (bass: Partial<BassState>) => void;
  setBassSynthType: (synthType: BassSynthType) => void;
  setBassStyle: (style: BassStyle) => void;
  setRealisticBassStyle: (style: RealisticBassStyle) => void;
  setGuitar: (guitar: Partial<GuitarState>) => void;
  setGuitarSynthType: (synthType: GuitarSynthType) => void;
  setGuitarStyle: (style: GuitarStyle) => void;
  setRealisticGuitarStyle: (style: RealisticGuitarStyle) => void;
  setPiano: (piano: Partial<PianoState>) => void;
  setPianoSynthType: (synthType: PianoSynthType) => void;
  setPianoStyle: (style: PianoStyle) => void;
  setRealisticPianoStyle: (style: RealisticPianoStyle) => void;
  setInputGain: (gain: number) => void;
  setOutputVolume: (volume: number) => void;
  setCurrentInstrument: (instrument: InstrumentType) => void;
  addLoop: (loop: RecordedLoop) => void;
  removeLoop: (id: string) => void;
  updateLoop: (id: string, updates: Partial<RecordedLoop>) => void;
  clearLoops: () => void;
  setError: (error: string | null) => void;
  clearError: () => void;
}

export interface NavigationSlice extends NavigationState {
  setCurrentTab: (tab: TabType) => void;
  startGuidedFlow: () => void;
  exitGuidedFlow: () => void;
  setGuidedFlowStep: (step: GuidedFlowStep) => void;
  armRecording: () => void;
  disarmRecording: () => void;
  advanceGuidedFlowStep: () => void;
}

export interface BandSlice extends BandState {
  loadBands: () => void;
  selectBand: (bandId: string) => void;
  startNewBandCreation: () => void;
  setPendingBandName: (name: string) => void;
  saveNewBand: () => Band;
  createBandFromInput: (input: CreateBandInput) => Band;
  updateBand: (bandId: string, updates: Partial<Omit<Band, 'id' | 'createdAt'>>) => Band | null;
  deleteBand: (bandId: string) => void;
  loadBandConfiguration: (band: Band) => void;
}

export interface InstrumentSlice {
  instrumentSetup: InstrumentSetupState;
  setSelectedDrumKit: (kit: DrumKitType) => void;
  setSelectedBassSynthType: (synthType: BassSynthType) => void;
  setSelectedBassStyle: (style: BassStyle) => void;
  setSelectedRealisticBassStyle: (style: RealisticBassStyle) => void;
  setSelectedGuitarSynthType: (synthType: GuitarSynthType) => void;
  setSelectedGuitarStyle: (style: GuitarStyle) => void;
  setSelectedRealisticGuitarStyle: (style: RealisticGuitarStyle) => void;
  setSelectedElectricGuitarStyle: (style: ElectricGuitarStyle) => void;
  setSelectedPianoStyle: (style: PianoStyle) => void;
  setSelectedVoiceEffects: (effects: VoiceEffectsSelection) => void;
  toggleSelectedVoiceEffect: (effect: EffectType) => void;
  resetInstrumentSetup: () => void;
}

export interface LooperSlice {
  tempoSelection: TempoSelectionState;
  transport: TransportState;
  layers: LayerInfo[];
  layerRecordingState: LayerRecordingState;
  activeRecordingLayer: LayerType | null;
  recordedDrumEvents: DrumHitEvent[];
  setTempoSelectionActive: (active: boolean) => void;
  setSelectedBpm: (bpm: number) => void;
  confirmTempo: () => void;
  resetTempoSelection: () => void;
  setCurrentMetronomeBeat: (beat: number) => void;
  setTransport: (transport: TransportState) => void;
  setLayers: (layers: LayerInfo[]) => void;
  setLayerRecordingState: (state: LayerRecordingState, layerType: LayerType | null) => void;
  setRecordedDrumEvents: (events: DrumHitEvent[]) => void;
}

export interface LibrarySlice {
  library: LibraryState;
  initializeLibrary: () => Promise<void>;
  setLibrarySongs: (songs: SongMetadata[]) => void;
  setLibraryLoading: (loading: boolean) => void;
  setSelectedSongId: (id: string | null) => void;
  addSongToLibrary: (song: SongMetadata) => void;
  removeSongFromLibrary: (id: string) => void;
}

export interface PlaybackSlice {
  playback: PlaybackState;
  playSong: (song: SongMetadata) => void;
  pausePlayback: () => void;
  resumePlayback: () => void;
  stopPlayback: () => void;
  setPlaybackPosition: (position: number) => void;
  openFullScreenPlayer: () => void;
  closeFullScreenPlayer: () => void;
}

export interface ResetSlice {
  reset: () => void;
}

// ==================== Combined store type ====================

export type AppStore =
  AudioSlice &
  NavigationSlice &
  BandSlice &
  InstrumentSlice &
  LooperSlice &
  LibrarySlice &
  PlaybackSlice &
  ResetSlice;
