import { create } from 'zustand';
import type { AppStore } from './types';
import {
  initialPitch, initialBass, initialGuitar, initialPiano,
  initialNavigation, initialInstrumentSetup, initialTempoSelection,
  initialTransport, initialLibrary, initialPlayback,
} from './types';
import { bandStorage } from '../BandStorage';
import { createAudioSlice } from './audioSlice';
import { createNavigationSlice } from './navigationSlice';
import { createBandSlice } from './bandSlice';
import { createInstrumentSlice } from './instrumentSlice';
import { createLooperSlice } from './looperSlice';
import { createLibrarySlice } from './librarySlice';
import { createPlaybackSlice } from './playbackSlice';

export const useAppStore = create<AppStore>()((...args) => ({
  ...createAudioSlice(...args),
  ...createNavigationSlice(...args),
  ...createBandSlice(...args),
  ...createInstrumentSlice(...args),
  ...createLooperSlice(...args),
  ...createLibrarySlice(...args),
  ...createPlaybackSlice(...args),

  reset: () => {
    const set = args[0];
    set({
      // Audio
      isPassthroughActive: false, isRecording: false, inputLevel: 0, latencyMs: 0,
      inputGain: 1.0, outputVolume: 0.8, currentInstrument: 'drums', loops: [],
      error: null, pitch: initialPitch, instrumentMode: 'drums', currentDrum: null,
      bass: initialBass, guitar: initialGuitar, piano: initialPiano,
      // Navigation
      ...initialNavigation,
      // Band (reload from storage)
      bands: bandStorage.getAllBands(), activeBandId: bandStorage.getActiveBandId(), pendingBandName: '',
      // Instrument setup
      instrumentSetup: initialInstrumentSetup,
      // Looper
      tempoSelection: initialTempoSelection, transport: initialTransport,
      layers: [], layerRecordingState: 'idle', activeRecordingLayer: null, recordedDrumEvents: [],
      // Library
      library: initialLibrary,
      // Playback
      playback: initialPlayback,
    });
  },
}));
