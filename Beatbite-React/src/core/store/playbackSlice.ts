import type { StateCreator } from 'zustand';
import type { AppStore, PlaybackSlice } from './types';
import { initialPlayback } from './types';

export const createPlaybackSlice: StateCreator<AppStore, [], [], PlaybackSlice> = (set) => ({
  playback: initialPlayback,

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
    set((state) => ({ playback: { ...state.playback, isPlaying: false } })),

  resumePlayback: () =>
    set((state) => ({ playback: { ...state.playback, isPlaying: true } })),

  stopPlayback: () => set({ playback: initialPlayback }),

  setPlaybackPosition: (position) =>
    set((state) => ({ playback: { ...state.playback, currentPosition: position } })),

  openFullScreenPlayer: () =>
    set((state) => ({ playback: { ...state.playback, isFullScreenOpen: true } })),

  closeFullScreenPlayer: () =>
    set((state) => ({ playback: { ...state.playback, isFullScreenOpen: false } })),
});
