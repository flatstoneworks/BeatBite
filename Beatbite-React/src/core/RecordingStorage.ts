/**
 * RecordingStorage handles persistence of recording sessions to IndexedDB.
 *
 * Stores:
 * - Recording session metadata (bpm, bars, band info, instrument styles)
 * - Drum events
 * - Bass events
 * - Guitar events
 * - Piano events
 * - Voice recording flag (actual audio stored separately)
 *
 * Also supports WAV export storage.
 */

import type {
  RecordingSessionData,
  SavedRecordingSummary,
  DrumHitEvent,
  BassNoteEvent,
  GuitarNoteEvent,
  PianoNoteEvent,
  BassStyle,
  GuitarStyle,
  PianoStyle,
} from '../types';
import type { DrumKitType } from './DrumKitPlayer';
import { logger } from './utils/logger';

const DB_NAME = 'beatbite-recordings';
const DB_VERSION = 1;
const SESSIONS_STORE = 'sessions';
const AUDIO_STORE = 'audio';

interface StoredAudio {
  sessionId: string;
  type: 'voice' | 'mix';
  blob: Blob;
  createdAt: number;
}

export class RecordingStorage {
  private db: IDBDatabase | null = null;
  private initPromise: Promise<void> | null = null;

  /**
   * Initialize the database.
   */
  async initialize(): Promise<void> {
    if (this.db) return;
    if (this.initPromise) return this.initPromise;

    this.initPromise = new Promise((resolve, reject) => {
      const request = indexedDB.open(DB_NAME, DB_VERSION);

      request.onerror = () => {
        logger.error('[RecordingStorage] Failed to open database:', request.error);
        reject(request.error);
      };

      request.onsuccess = () => {
        this.db = request.result;
        logger.info('[RecordingStorage] Database opened successfully');
        resolve();
      };

      request.onupgradeneeded = (event) => {
        const db = (event.target as IDBOpenDBRequest).result;

        // Sessions store
        if (!db.objectStoreNames.contains(SESSIONS_STORE)) {
          const sessionsStore = db.createObjectStore(SESSIONS_STORE, { keyPath: 'id' });
          sessionsStore.createIndex('createdAt', 'createdAt', { unique: false });
          sessionsStore.createIndex('name', 'name', { unique: false });
          sessionsStore.createIndex('bandId', 'bandId', { unique: false });
        }

        // Audio store (for voice recordings and exported mixes)
        if (!db.objectStoreNames.contains(AUDIO_STORE)) {
          const audioStore = db.createObjectStore(AUDIO_STORE, { keyPath: ['sessionId', 'type'] });
          audioStore.createIndex('sessionId', 'sessionId', { unique: false });
        }

        logger.info('[RecordingStorage] Database schema created/upgraded');
      };
    });

    return this.initPromise;
  }

  /**
   * Create a new recording session.
   */
  async createSession(params: {
    name: string;
    bpm: number;
    bars: number;
    beatsPerBar?: number;
    loopLengthMs: number;
    bandId?: string;
    bandName?: string;
    drumKit: DrumKitType;
    bassStyle: BassStyle;
    guitarStyle: GuitarStyle;
    pianoStyle: PianoStyle;
  }): Promise<RecordingSessionData> {
    await this.initialize();

    const now = Date.now();
    const session: RecordingSessionData = {
      id: crypto.randomUUID(),
      name: params.name,
      createdAt: now,
      updatedAt: now,
      bpm: params.bpm,
      bars: params.bars,
      beatsPerBar: params.beatsPerBar ?? 4,
      loopLengthMs: params.loopLengthMs,
      bandId: params.bandId ?? null,
      bandName: params.bandName ?? null,
      drumEvents: [],
      bassEvents: [],
      guitarEvents: [],
      pianoEvents: [],
      hasVoiceRecording: false,
      drumKit: params.drumKit,
      bassStyle: params.bassStyle,
      guitarStyle: params.guitarStyle,
      pianoStyle: params.pianoStyle,
    };

    await this.saveSession(session);
    return session;
  }

  /**
   * Save a session to the database.
   */
  async saveSession(session: RecordingSessionData): Promise<void> {
    await this.initialize();
    if (!this.db) throw new Error('Database not initialized');

    return new Promise((resolve, reject) => {
      const transaction = this.db!.transaction(SESSIONS_STORE, 'readwrite');
      const store = transaction.objectStore(SESSIONS_STORE);

      session.updatedAt = Date.now();
      const request = store.put(session);

      request.onsuccess = () => {
        logger.debug(`[RecordingStorage] Session saved: ${session.id}`);
        resolve();
      };

      request.onerror = () => {
        logger.error('[RecordingStorage] Failed to save session:', request.error);
        reject(request.error);
      };
    });
  }

  /**
   * Get a session by ID.
   */
  async getSession(id: string): Promise<RecordingSessionData | null> {
    await this.initialize();
    if (!this.db) throw new Error('Database not initialized');

    return new Promise((resolve, reject) => {
      const transaction = this.db!.transaction(SESSIONS_STORE, 'readonly');
      const store = transaction.objectStore(SESSIONS_STORE);
      const request = store.get(id);

      request.onsuccess = () => {
        resolve(request.result || null);
      };

      request.onerror = () => {
        logger.error('[RecordingStorage] Failed to get session:', request.error);
        reject(request.error);
      };
    });
  }

  /**
   * Get all sessions (summaries only).
   */
  async getAllSessions(): Promise<SavedRecordingSummary[]> {
    await this.initialize();
    if (!this.db) throw new Error('Database not initialized');

    return new Promise((resolve, reject) => {
      const transaction = this.db!.transaction(SESSIONS_STORE, 'readonly');
      const store = transaction.objectStore(SESSIONS_STORE);
      const index = store.index('createdAt');
      const request = index.openCursor(null, 'prev'); // Newest first

      const sessions: SavedRecordingSummary[] = [];

      request.onsuccess = () => {
        const cursor = request.result;
        if (cursor) {
          const session = cursor.value as RecordingSessionData;
          sessions.push({
            id: session.id,
            name: session.name,
            createdAt: session.createdAt,
            durationMs: session.loopLengthMs,
            bpm: session.bpm,
            bars: session.bars,
            bandName: session.bandName,
            drumEventCount: session.drumEvents.length,
            bassEventCount: session.bassEvents.length,
            guitarEventCount: session.guitarEvents.length,
            pianoEventCount: session.pianoEvents.length,
            hasVoice: session.hasVoiceRecording,
            hasMixExport: false, // Will be set later when checking audio store
          });
          cursor.continue();
        } else {
          resolve(sessions);
        }
      };

      request.onerror = () => {
        logger.error('[RecordingStorage] Failed to get sessions:', request.error);
        reject(request.error);
      };
    });
  }

  /**
   * Update drum events for a session.
   */
  async updateDrumEvents(sessionId: string, events: DrumHitEvent[]): Promise<void> {
    const session = await this.getSession(sessionId);
    if (!session) throw new Error(`Session not found: ${sessionId}`);

    session.drumEvents = events;
    await this.saveSession(session);
  }

  /**
   * Update bass events for a session.
   */
  async updateBassEvents(sessionId: string, events: BassNoteEvent[]): Promise<void> {
    const session = await this.getSession(sessionId);
    if (!session) throw new Error(`Session not found: ${sessionId}`);

    session.bassEvents = events;
    await this.saveSession(session);
  }

  /**
   * Update guitar events for a session.
   */
  async updateGuitarEvents(sessionId: string, events: GuitarNoteEvent[]): Promise<void> {
    const session = await this.getSession(sessionId);
    if (!session) throw new Error(`Session not found: ${sessionId}`);

    session.guitarEvents = events;
    await this.saveSession(session);
  }

  /**
   * Update piano events for a session.
   */
  async updatePianoEvents(sessionId: string, events: PianoNoteEvent[]): Promise<void> {
    const session = await this.getSession(sessionId);
    if (!session) throw new Error(`Session not found: ${sessionId}`);

    session.pianoEvents = events;
    await this.saveSession(session);
  }

  /**
   * Save voice recording audio blob.
   */
  async saveVoiceRecording(sessionId: string, blob: Blob): Promise<void> {
    await this.initialize();
    if (!this.db) throw new Error('Database not initialized');

    return new Promise((resolve, reject) => {
      const transaction = this.db!.transaction([AUDIO_STORE, SESSIONS_STORE], 'readwrite');

      // Save audio blob
      const audioStore = transaction.objectStore(AUDIO_STORE);
      const audioData: StoredAudio = {
        sessionId,
        type: 'voice',
        blob,
        createdAt: Date.now(),
      };
      audioStore.put(audioData);

      // Update session flag
      const sessionsStore = transaction.objectStore(SESSIONS_STORE);
      const getRequest = sessionsStore.get(sessionId);

      getRequest.onsuccess = () => {
        const session = getRequest.result as RecordingSessionData;
        if (session) {
          session.hasVoiceRecording = true;
          session.updatedAt = Date.now();
          sessionsStore.put(session);
        }
      };

      transaction.oncomplete = () => {
        logger.debug(`[RecordingStorage] Voice recording saved for session: ${sessionId}`);
        resolve();
      };

      transaction.onerror = () => {
        logger.error('[RecordingStorage] Failed to save voice recording:', transaction.error);
        reject(transaction.error);
      };
    });
  }

  /**
   * Get voice recording audio blob.
   */
  async getVoiceRecording(sessionId: string): Promise<Blob | null> {
    await this.initialize();
    if (!this.db) throw new Error('Database not initialized');

    return new Promise((resolve, reject) => {
      const transaction = this.db!.transaction(AUDIO_STORE, 'readonly');
      const store = transaction.objectStore(AUDIO_STORE);
      const request = store.get([sessionId, 'voice']);

      request.onsuccess = () => {
        const data = request.result as StoredAudio | undefined;
        resolve(data?.blob || null);
      };

      request.onerror = () => {
        logger.error('[RecordingStorage] Failed to get voice recording:', request.error);
        reject(request.error);
      };
    });
  }

  /**
   * Save exported mix audio blob.
   */
  async saveMix(sessionId: string, blob: Blob): Promise<void> {
    await this.initialize();
    if (!this.db) throw new Error('Database not initialized');

    return new Promise((resolve, reject) => {
      const transaction = this.db!.transaction(AUDIO_STORE, 'readwrite');
      const store = transaction.objectStore(AUDIO_STORE);

      const audioData: StoredAudio = {
        sessionId,
        type: 'mix',
        blob,
        createdAt: Date.now(),
      };

      const request = store.put(audioData);

      request.onsuccess = () => {
        logger.debug(`[RecordingStorage] Mix saved for session: ${sessionId}`);
        resolve();
      };

      request.onerror = () => {
        logger.error('[RecordingStorage] Failed to save mix:', request.error);
        reject(request.error);
      };
    });
  }

  /**
   * Get exported mix audio blob.
   */
  async getMix(sessionId: string): Promise<Blob | null> {
    await this.initialize();
    if (!this.db) throw new Error('Database not initialized');

    return new Promise((resolve, reject) => {
      const transaction = this.db!.transaction(AUDIO_STORE, 'readonly');
      const store = transaction.objectStore(AUDIO_STORE);
      const request = store.get([sessionId, 'mix']);

      request.onsuccess = () => {
        const data = request.result as StoredAudio | undefined;
        resolve(data?.blob || null);
      };

      request.onerror = () => {
        logger.error('[RecordingStorage] Failed to get mix:', request.error);
        reject(request.error);
      };
    });
  }

  /**
   * Delete a session and its associated audio.
   */
  async deleteSession(sessionId: string): Promise<void> {
    await this.initialize();
    if (!this.db) throw new Error('Database not initialized');

    return new Promise((resolve, reject) => {
      const transaction = this.db!.transaction([SESSIONS_STORE, AUDIO_STORE], 'readwrite');

      // Delete session
      const sessionsStore = transaction.objectStore(SESSIONS_STORE);
      sessionsStore.delete(sessionId);

      // Delete associated audio
      const audioStore = transaction.objectStore(AUDIO_STORE);
      audioStore.delete([sessionId, 'voice']);
      audioStore.delete([sessionId, 'mix']);

      transaction.oncomplete = () => {
        logger.debug(`[RecordingStorage] Session deleted: ${sessionId}`);
        resolve();
      };

      transaction.onerror = () => {
        logger.error('[RecordingStorage] Failed to delete session:', transaction.error);
        reject(transaction.error);
      };
    });
  }

  /**
   * Export a session as JSON.
   */
  async exportSessionAsJson(sessionId: string): Promise<string> {
    const session = await this.getSession(sessionId);
    if (!session) throw new Error(`Session not found: ${sessionId}`);

    return JSON.stringify(session, null, 2);
  }

  /**
   * Import a session from JSON.
   */
  async importSessionFromJson(json: string): Promise<RecordingSessionData> {
    const session = JSON.parse(json) as RecordingSessionData;

    // Generate new ID to avoid conflicts
    session.id = crypto.randomUUID();
    session.createdAt = Date.now();
    session.updatedAt = Date.now();

    await this.saveSession(session);
    return session;
  }

  /**
   * Close the database connection.
   */
  close(): void {
    if (this.db) {
      this.db.close();
      this.db = null;
      this.initPromise = null;
      logger.info('[RecordingStorage] Database closed');
    }
  }
}

// Singleton instance
export const recordingStorage = new RecordingStorage();
