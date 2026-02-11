import type { StateCreator } from 'zustand';
import type { AppStore, LibrarySlice } from './types';
import { initialLibrary } from './types';
import { libraryStorage } from '../LibraryStorage';
import { logger } from '../utils/logger';

export const createLibrarySlice: StateCreator<AppStore, [], [], LibrarySlice> = (set) => ({
  library: initialLibrary,

  initializeLibrary: async () => {
    set((state) => ({ library: { ...state.library, isLoading: true } }));
    try {
      const songs = await libraryStorage.getSongsList();
      set((state) => ({ library: { ...state.library, songs, isLoading: false } }));
    } catch (error) {
      logger.error('[Store] Failed to initialize library:', error);
      set((state) => ({ library: { ...state.library, isLoading: false } }));
    }
  },

  setLibrarySongs: (songs) =>
    set((state) => ({ library: { ...state.library, songs } })),

  setLibraryLoading: (loading) =>
    set((state) => ({ library: { ...state.library, isLoading: loading } })),

  setSelectedSongId: (id) =>
    set((state) => ({ library: { ...state.library, selectedSongId: id } })),

  addSongToLibrary: (song) =>
    set((state) => ({ library: { ...state.library, songs: [song, ...state.library.songs] } })),

  removeSongFromLibrary: (id) =>
    set((state) => ({
      library: { ...state.library, songs: state.library.songs.filter((s) => s.id !== id) },
    })),
});
