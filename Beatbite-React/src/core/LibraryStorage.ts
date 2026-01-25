/**
 * LibraryStorage manages saved songs using IndexedDB.
 *
 * Stores song metadata and serialized audio data for playback and export.
 */

import type {
  LayerType,
  LayerInfo,
  LayerKind,
  DrumHitEvent,
  BassNoteEvent,
  GuitarNoteEvent,
  PianoNoteEvent,
} from '../types';

/**
 * Serialized layer data for storage.
 */
export interface SerializedLayer {
  id: string;
  type: LayerType;
  kind?: LayerKind;
  name: string;
  volume: number;
  muted: boolean;
  duration: number;
  // Audio data for audio layers
  audioData: ArrayBuffer | null;
  // Event data for event-based layers
  drumEvents?: DrumHitEvent[];
  bassEvents?: BassNoteEvent[];
  guitarEvents?: GuitarNoteEvent[];
  pianoEvents?: PianoNoteEvent[];
}

/**
 * Saved song structure.
 */
export interface SavedSong {
  id: string;
  name: string;
  createdAt: number;
  updatedAt: number;
  bpm: number;
  duration: number;
  layers: SerializedLayer[];
  thumbnail?: string; // Base64 waveform image (optional)
}

/**
 * Song metadata for list display (without audio data).
 */
export interface SongMetadata {
  id: string;
  name: string;
  createdAt: number;
  updatedAt: number;
  bpm: number;
  duration: number;
  layerCount: number;
  thumbnail?: string;
}

const DB_NAME = 'beatbite-library';
const DB_VERSION = 1;
const SONGS_STORE = 'songs';

export class LibraryStorage {
  private db: IDBDatabase | null = null;
  private initPromise: Promise<void> | null = null;

  /**
   * Initialize the database connection.
   */
  async initialize(): Promise<void> {
    if (this.db) return;
    if (this.initPromise) return this.initPromise;

    this.initPromise = new Promise((resolve, reject) => {
      const request = indexedDB.open(DB_NAME, DB_VERSION);

      request.onerror = () => {
        console.error('[LibraryStorage] Failed to open database:', request.error);
        reject(request.error);
      };

      request.onsuccess = () => {
        this.db = request.result;
        console.log('[LibraryStorage] Database opened successfully');
        resolve();
      };

      request.onupgradeneeded = (event) => {
        const db = (event.target as IDBOpenDBRequest).result;

        // Create songs object store
        if (!db.objectStoreNames.contains(SONGS_STORE)) {
          const store = db.createObjectStore(SONGS_STORE, { keyPath: 'id' });
          store.createIndex('createdAt', 'createdAt', { unique: false });
          store.createIndex('name', 'name', { unique: false });
          console.log('[LibraryStorage] Created songs store');
        }
      };
    });

    return this.initPromise;
  }

  /**
   * Ensure database is ready.
   */
  private async ensureDb(): Promise<IDBDatabase> {
    await this.initialize();
    if (!this.db) {
      throw new Error('Database not initialized');
    }
    return this.db;
  }

  /**
   * Generate a unique song ID.
   */
  private generateId(): string {
    return `song_${Date.now()}_${Math.random().toString(36).substr(2, 9)}`;
  }

  /**
   * Save a new song or update existing.
   */
  async saveSong(song: Omit<SavedSong, 'id' | 'createdAt' | 'updatedAt'> & { id?: string }): Promise<string> {
    const db = await this.ensureDb();

    const now = Date.now();
    const fullSong: SavedSong = {
      id: song.id || this.generateId(),
      name: song.name,
      createdAt: song.id ? (await this.getSong(song.id))?.createdAt || now : now,
      updatedAt: now,
      bpm: song.bpm,
      duration: song.duration,
      layers: song.layers,
      thumbnail: song.thumbnail,
    };

    return new Promise((resolve, reject) => {
      const transaction = db.transaction([SONGS_STORE], 'readwrite');
      const store = transaction.objectStore(SONGS_STORE);
      const request = store.put(fullSong);

      request.onsuccess = () => {
        console.log('[LibraryStorage] Song saved:', fullSong.id);
        resolve(fullSong.id);
      };

      request.onerror = () => {
        console.error('[LibraryStorage] Failed to save song:', request.error);
        reject(request.error);
      };
    });
  }

  /**
   * Get all songs (metadata only, without audio data).
   */
  async getSongsList(): Promise<SongMetadata[]> {
    const db = await this.ensureDb();

    return new Promise((resolve, reject) => {
      const transaction = db.transaction([SONGS_STORE], 'readonly');
      const store = transaction.objectStore(SONGS_STORE);
      const index = store.index('createdAt');
      const request = index.openCursor(null, 'prev'); // Newest first

      const songs: SongMetadata[] = [];

      request.onsuccess = () => {
        const cursor = request.result;
        if (cursor) {
          const song = cursor.value as SavedSong;
          songs.push({
            id: song.id,
            name: song.name,
            createdAt: song.createdAt,
            updatedAt: song.updatedAt,
            bpm: song.bpm,
            duration: song.duration,
            layerCount: song.layers.length,
            thumbnail: song.thumbnail,
          });
          cursor.continue();
        } else {
          resolve(songs);
        }
      };

      request.onerror = () => {
        console.error('[LibraryStorage] Failed to get songs list:', request.error);
        reject(request.error);
      };
    });
  }

  /**
   * Get a single song with full audio data.
   */
  async getSong(id: string): Promise<SavedSong | null> {
    const db = await this.ensureDb();

    return new Promise((resolve, reject) => {
      const transaction = db.transaction([SONGS_STORE], 'readonly');
      const store = transaction.objectStore(SONGS_STORE);
      const request = store.get(id);

      request.onsuccess = () => {
        resolve(request.result || null);
      };

      request.onerror = () => {
        console.error('[LibraryStorage] Failed to get song:', request.error);
        reject(request.error);
      };
    });
  }

  /**
   * Delete a song.
   */
  async deleteSong(id: string): Promise<void> {
    const db = await this.ensureDb();

    return new Promise((resolve, reject) => {
      const transaction = db.transaction([SONGS_STORE], 'readwrite');
      const store = transaction.objectStore(SONGS_STORE);
      const request = store.delete(id);

      request.onsuccess = () => {
        console.log('[LibraryStorage] Song deleted:', id);
        resolve();
      };

      request.onerror = () => {
        console.error('[LibraryStorage] Failed to delete song:', request.error);
        reject(request.error);
      };
    });
  }

  /**
   * Rename a song.
   */
  async renameSong(id: string, newName: string): Promise<void> {
    const song = await this.getSong(id);
    if (!song) {
      throw new Error('Song not found');
    }

    song.name = newName;
    song.updatedAt = Date.now();

    const db = await this.ensureDb();

    return new Promise((resolve, reject) => {
      const transaction = db.transaction([SONGS_STORE], 'readwrite');
      const store = transaction.objectStore(SONGS_STORE);
      const request = store.put(song);

      request.onsuccess = () => {
        console.log('[LibraryStorage] Song renamed:', id, newName);
        resolve();
      };

      request.onerror = () => {
        console.error('[LibraryStorage] Failed to rename song:', request.error);
        reject(request.error);
      };
    });
  }

  /**
   * Get total song count.
   */
  async getSongCount(): Promise<number> {
    const db = await this.ensureDb();

    return new Promise((resolve, reject) => {
      const transaction = db.transaction([SONGS_STORE], 'readonly');
      const store = transaction.objectStore(SONGS_STORE);
      const request = store.count();

      request.onsuccess = () => {
        resolve(request.result);
      };

      request.onerror = () => {
        reject(request.error);
      };
    });
  }

  /**
   * Serialize an AudioBuffer to ArrayBuffer for storage.
   */
  static serializeAudioBuffer(buffer: AudioBuffer): ArrayBuffer {
    const numberOfChannels = buffer.numberOfChannels;
    const length = buffer.length;
    const sampleRate = buffer.sampleRate;

    // Calculate total size: header (12 bytes) + channel data
    const headerSize = 12; // channels (4) + length (4) + sampleRate (4)
    const dataSize = numberOfChannels * length * 4; // Float32 = 4 bytes
    const totalSize = headerSize + dataSize;

    const arrayBuffer = new ArrayBuffer(totalSize);
    const view = new DataView(arrayBuffer);

    // Write header
    view.setUint32(0, numberOfChannels, true);
    view.setUint32(4, length, true);
    view.setUint32(8, sampleRate, true);

    // Write channel data
    let offset = headerSize;
    for (let channel = 0; channel < numberOfChannels; channel++) {
      const channelData = buffer.getChannelData(channel);
      for (let i = 0; i < length; i++) {
        view.setFloat32(offset, channelData[i], true);
        offset += 4;
      }
    }

    return arrayBuffer;
  }

  /**
   * Deserialize an ArrayBuffer back to AudioBuffer.
   */
  static deserializeAudioBuffer(arrayBuffer: ArrayBuffer, audioContext: AudioContext): AudioBuffer {
    const view = new DataView(arrayBuffer);

    // Read header
    const numberOfChannels = view.getUint32(0, true);
    const length = view.getUint32(4, true);
    const sampleRate = view.getUint32(8, true);

    // Create AudioBuffer
    const audioBuffer = audioContext.createBuffer(numberOfChannels, length, sampleRate);

    // Read channel data
    let offset = 12; // Header size
    for (let channel = 0; channel < numberOfChannels; channel++) {
      const channelData = audioBuffer.getChannelData(channel);
      for (let i = 0; i < length; i++) {
        channelData[i] = view.getFloat32(offset, true);
        offset += 4;
      }
    }

    return audioBuffer;
  }

  /**
   * Convert layers with AudioBuffers or events to serialized layers for storage.
   */
  static serializeLayers(layers: (LayerInfo & { audioBuffer?: AudioBuffer })[]): SerializedLayer[] {
    return layers.map(layer => {
      const serialized: SerializedLayer = {
        id: layer.id,
        type: layer.type,
        kind: layer.kind,
        name: layer.name,
        volume: layer.volume,
        muted: layer.muted,
        duration: layer.duration,
        audioData: layer.audioBuffer ? this.serializeAudioBuffer(layer.audioBuffer) : null,
      };

      // Copy event data for event-based layers
      if (layer.kind === 'drum_events' && layer.events) {
        serialized.drumEvents = [...layer.events];
      }
      if (layer.kind === 'bass_events' && layer.bassEvents) {
        serialized.bassEvents = [...layer.bassEvents];
      }
      if (layer.kind === 'guitar_events' && layer.guitarEvents) {
        serialized.guitarEvents = [...layer.guitarEvents];
      }
      if (layer.kind === 'piano_events' && layer.pianoEvents) {
        serialized.pianoEvents = [...layer.pianoEvents];
      }

      return serialized;
    });
  }

  /**
   * Clear all songs (for debugging/testing).
   */
  async clearAll(): Promise<void> {
    const db = await this.ensureDb();

    return new Promise((resolve, reject) => {
      const transaction = db.transaction([SONGS_STORE], 'readwrite');
      const store = transaction.objectStore(SONGS_STORE);
      const request = store.clear();

      request.onsuccess = () => {
        console.log('[LibraryStorage] All songs cleared');
        resolve();
      };

      request.onerror = () => {
        reject(request.error);
      };
    });
  }

  /**
   * Close the database connection.
   */
  close(): void {
    if (this.db) {
      this.db.close();
      this.db = null;
      this.initPromise = null;
    }
  }
}

// Singleton instance
export const libraryStorage = new LibraryStorage();
