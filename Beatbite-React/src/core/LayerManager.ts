/**
 * LayerManager manages recorded layers for the looper workstation.
 *
 * Supports multiple types of layers:
 * - Audio layers (kind: 'audio'): Store AudioBuffer, play via Web Audio
 * - Drum event layers (kind: 'drum_events'): Store DrumHitEvent[], play via DrumEventPlayer
 * - Bass event layers (kind: 'bass_events'): Store BassNoteEvent[], play via MelodicEventPlayer
 * - Guitar event layers (kind: 'guitar_events'): Store GuitarNoteEvent[], play via MelodicEventPlayer
 * - Piano event layers (kind: 'piano_events'): Store PianoNoteEvent[], play via MelodicEventPlayer
 *
 * Responsibilities:
 * - Store layers with their data (AudioBuffer or event arrays)
 * - Play all layers in sync (loop)
 * - Per-layer volume control
 * - Mute/unmute layers
 * - Replace layer (re-record)
 * - Mix all layers for export
 */

import type { Layer, LayerType, LayerInfo, DrumHitEvent, BassNoteEvent, GuitarNoteEvent, PianoNoteEvent } from '../types';
import { drumEventPlayer } from './DrumEventPlayer';
import { bassEventPlayer, guitarEventPlayer, pianoEventPlayer } from './MelodicEventPlayer';

export interface LayerManagerCallbacks {
  onLayersChanged?: (layers: LayerInfo[]) => void;
  onPlaybackStateChanged?: (isPlaying: boolean) => void;
}

export class LayerManager {
  private audioContext: AudioContext | null = null;
  private layers: Map<string, Layer> = new Map();
  private masterGain: GainNode | null = null;
  private callbacks: LayerManagerCallbacks = {};

  // Playback state
  private isPlaying = false;
  private playbackStartTime = 0;
  private loopLengthMs = 0;

  /**
   * Initialize with an audio context.
   */
  initialize(audioContext: AudioContext): GainNode {
    this.audioContext = audioContext;

    // Create master gain for all layers
    this.masterGain = audioContext.createGain();
    this.masterGain.gain.value = 1.0;
    this.masterGain.connect(audioContext.destination);

    console.log('[LayerManager] Initialized');
    return this.masterGain;
  }

  /**
   * Set callbacks for layer events.
   */
  setCallbacks(callbacks: LayerManagerCallbacks): void {
    this.callbacks = callbacks;
  }

  /**
   * Add a new audio layer.
   */
  addLayer(type: LayerType, audioBuffer: AudioBuffer, name?: string): Layer {
    if (!this.audioContext || !this.masterGain) {
      throw new Error('LayerManager not initialized');
    }

    const id = crypto.randomUUID();
    const layerName = name || `${type.charAt(0).toUpperCase() + type.slice(1)} ${this.getLayerCountByType(type) + 1}`;

    // Create gain node for this layer
    const gainNode = this.audioContext.createGain();
    gainNode.gain.value = 1.0;
    gainNode.connect(this.masterGain);

    const duration = audioBuffer.duration * 1000;

    // Set loop length from first layer
    if (this.loopLengthMs === 0) {
      this.loopLengthMs = duration;
    }

    const layer: Layer = {
      id,
      type,
      kind: 'audio',
      name: layerName,
      audioBuffer,
      volume: 1.0,
      muted: false,
      duration,
      sourceNode: null,
      gainNode,
      isPlaying: false,
    };

    this.layers.set(id, layer);
    this.notifyLayersChanged();

    console.log(`[LayerManager] Added audio layer: ${layerName} (${audioBuffer.duration.toFixed(2)}s)`);

    return layer;
  }

  /**
   * Add a new drum event layer.
   */
  addDrumEventLayer(events: DrumHitEvent[], loopLengthMs: number, name?: string): Layer {
    if (!this.audioContext || !this.masterGain) {
      throw new Error('LayerManager not initialized');
    }

    const id = crypto.randomUUID();
    const layerName = name || `Drums ${this.getLayerCountByType('drums') + 1}`;

    // Create gain node for this layer (controls DrumEventPlayer volume)
    const gainNode = this.audioContext.createGain();
    gainNode.gain.value = 1.0;
    // Note: drum events play through DrumSynthesizer, not this gain node
    // gainNode is kept for consistency and potential future use

    // Set loop length from first layer
    if (this.loopLengthMs === 0) {
      this.loopLengthMs = loopLengthMs;
    }

    const layer: Layer = {
      id,
      type: 'drums',
      kind: 'drum_events',
      name: layerName,
      events: [...events],
      volume: 1.0,
      muted: false,
      duration: loopLengthMs,
      gainNode,
      isPlaying: false,
    };

    this.layers.set(id, layer);
    this.notifyLayersChanged();

    console.log(`[LayerManager] Added drum event layer: ${layerName} (${events.length} events)`);

    return layer;
  }

  /**
   * Add a new bass event layer.
   */
  addBassEventLayer(events: BassNoteEvent[], loopLengthMs: number, name?: string): Layer {
    if (!this.audioContext || !this.masterGain) {
      throw new Error('LayerManager not initialized');
    }

    const id = crypto.randomUUID();
    const layerName = name || `Bass ${this.getLayerCountByType('bass') + 1}`;

    // Create gain node for this layer
    const gainNode = this.audioContext.createGain();
    gainNode.gain.value = 1.0;

    // Set loop length from first layer
    if (this.loopLengthMs === 0) {
      this.loopLengthMs = loopLengthMs;
    }

    const layer: Layer = {
      id,
      type: 'bass',
      kind: 'bass_events',
      name: layerName,
      bassEvents: [...events],
      volume: 1.0,
      muted: false,
      duration: loopLengthMs,
      gainNode,
      isPlaying: false,
    };

    this.layers.set(id, layer);
    this.notifyLayersChanged();

    console.log(`[LayerManager] Added bass event layer: ${layerName} (${events.length} events)`);

    return layer;
  }

  /**
   * Add a new guitar event layer.
   */
  addGuitarEventLayer(events: GuitarNoteEvent[], loopLengthMs: number, name?: string): Layer {
    if (!this.audioContext || !this.masterGain) {
      throw new Error('LayerManager not initialized');
    }

    const id = crypto.randomUUID();
    const layerName = name || `Guitar ${this.getLayerCountByType('guitar') + 1}`;

    // Create gain node for this layer
    const gainNode = this.audioContext.createGain();
    gainNode.gain.value = 1.0;

    // Set loop length from first layer
    if (this.loopLengthMs === 0) {
      this.loopLengthMs = loopLengthMs;
    }

    const layer: Layer = {
      id,
      type: 'guitar',
      kind: 'guitar_events',
      name: layerName,
      guitarEvents: [...events],
      volume: 1.0,
      muted: false,
      duration: loopLengthMs,
      gainNode,
      isPlaying: false,
    };

    this.layers.set(id, layer);
    this.notifyLayersChanged();

    console.log(`[LayerManager] Added guitar event layer: ${layerName} (${events.length} events)`);

    return layer;
  }

  /**
   * Add a new piano event layer.
   */
  addPianoEventLayer(events: PianoNoteEvent[], loopLengthMs: number, name?: string): Layer {
    if (!this.audioContext || !this.masterGain) {
      throw new Error('LayerManager not initialized');
    }

    const id = crypto.randomUUID();
    const layerName = name || `Piano ${this.getLayerCountByType('piano') + 1}`;

    // Create gain node for this layer
    const gainNode = this.audioContext.createGain();
    gainNode.gain.value = 1.0;

    // Set loop length from first layer
    if (this.loopLengthMs === 0) {
      this.loopLengthMs = loopLengthMs;
    }

    const layer: Layer = {
      id,
      type: 'piano',
      kind: 'piano_events',
      name: layerName,
      pianoEvents: [...events],
      volume: 1.0,
      muted: false,
      duration: loopLengthMs,
      gainNode,
      isPlaying: false,
    };

    this.layers.set(id, layer);
    this.notifyLayersChanged();

    console.log(`[LayerManager] Added piano event layer: ${layerName} (${events.length} events)`);

    return layer;
  }

  /**
   * Set loop length in milliseconds.
   */
  setLoopLength(ms: number): void {
    this.loopLengthMs = ms;
  }

  /**
   * Get loop length in milliseconds.
   */
  getLoopLength(): number {
    return this.loopLengthMs;
  }

  /**
   * Remove a layer by ID.
   */
  removeLayer(id: string): void {
    const layer = this.layers.get(id);
    if (!layer) return;

    // Stop if playing
    this.stopLayerPlayback(layer);

    // Disconnect and cleanup
    layer.gainNode?.disconnect();
    layer.gainNode = null;

    this.layers.delete(id);
    this.notifyLayersChanged();

    console.log(`[LayerManager] Removed layer: ${layer.name}`);
  }

  /**
   * Replace a layer's audio (for re-recording).
   */
  replaceLayerAudio(id: string, audioBuffer: AudioBuffer): void {
    const layer = this.layers.get(id);
    if (!layer) return;

    // Stop current playback
    this.stopLayerPlayback(layer);

    // Replace buffer
    layer.audioBuffer = audioBuffer;
    layer.duration = audioBuffer.duration * 1000;

    this.notifyLayersChanged();

    // Restart if was playing
    if (this.isPlaying) {
      this.startLayerPlayback(layer);
    }

    console.log(`[LayerManager] Replaced layer audio: ${layer.name}`);
  }

  /**
   * Set layer volume.
   */
  setLayerVolume(id: string, volume: number): void {
    const layer = this.layers.get(id);
    if (!layer) return;

    layer.volume = Math.max(0, Math.min(1, volume));

    if (layer.kind === 'drum_events') {
      // Update DrumEventPlayer volume
      drumEventPlayer.setVolume(layer.muted ? 0 : layer.volume);
    } else if (layer.kind === 'bass_events') {
      bassEventPlayer.setVolume(layer.muted ? 0 : layer.volume);
    } else if (layer.kind === 'guitar_events') {
      guitarEventPlayer.setVolume(layer.muted ? 0 : layer.volume);
    } else if (layer.kind === 'piano_events') {
      pianoEventPlayer.setVolume(layer.muted ? 0 : layer.volume);
    } else if (layer.gainNode && !layer.muted) {
      layer.gainNode.gain.setTargetAtTime(
        layer.volume,
        this.audioContext?.currentTime ?? 0,
        0.02
      );
    }

    this.notifyLayersChanged();
  }

  /**
   * Toggle layer mute.
   */
  setLayerMuted(id: string, muted: boolean): void {
    const layer = this.layers.get(id);
    if (!layer) return;

    layer.muted = muted;

    if (layer.kind === 'drum_events') {
      // Update DrumEventPlayer mute
      drumEventPlayer.setMuted(muted);
    } else if (layer.kind === 'bass_events') {
      bassEventPlayer.setMuted(muted);
    } else if (layer.kind === 'guitar_events') {
      guitarEventPlayer.setMuted(muted);
    } else if (layer.kind === 'piano_events') {
      pianoEventPlayer.setMuted(muted);
    } else if (layer.gainNode) {
      const targetVolume = muted ? 0 : layer.volume;
      layer.gainNode.gain.setTargetAtTime(
        targetVolume,
        this.audioContext?.currentTime ?? 0,
        0.02
      );
    }

    this.notifyLayersChanged();
  }

  /**
   * Start playback of all layers in sync.
   */
  startAllLayers(): void {
    if (!this.audioContext || this.isPlaying) return;

    this.isPlaying = true;
    this.playbackStartTime = this.audioContext.currentTime + 0.05; // Small buffer for sync

    // Start event-based layers first (they need the playback start time)
    for (const layer of this.layers.values()) {
      if (layer.kind === 'drum_events') {
        this.startDrumEventLayerPlayback(layer);
      } else if (layer.kind === 'bass_events') {
        this.startBassEventLayerPlayback(layer);
      } else if (layer.kind === 'guitar_events') {
        this.startGuitarEventLayerPlayback(layer);
      } else if (layer.kind === 'piano_events') {
        this.startPianoEventLayerPlayback(layer);
      } else {
        this.startLayerPlayback(layer);
      }
    }

    this.callbacks.onPlaybackStateChanged?.(true);
    console.log('[LayerManager] Started all layers');
  }

  /**
   * Stop playback of all layers.
   */
  stopAllLayers(): void {
    this.isPlaying = false;

    // Stop all event players
    drumEventPlayer.stop();
    bassEventPlayer.stop();
    guitarEventPlayer.stop();
    pianoEventPlayer.stop();

    for (const layer of this.layers.values()) {
      this.stopLayerPlayback(layer);
    }

    this.callbacks.onPlaybackStateChanged?.(false);
    console.log('[LayerManager] Stopped all layers');
  }

  /**
   * Start playback of a drum event layer.
   */
  private startDrumEventLayerPlayback(layer: Layer): void {
    if (!this.audioContext || !layer.events || layer.kind !== 'drum_events') return;

    // Initialize drum event player if needed
    if (!drumEventPlayer.getIsPlaying()) {
      drumEventPlayer.initialize(this.audioContext);
    }

    // Load events and start
    drumEventPlayer.loadEvents(layer.events, this.loopLengthMs);
    drumEventPlayer.setVolume(layer.muted ? 0 : layer.volume);
    drumEventPlayer.start(this.playbackStartTime);
    layer.isPlaying = true;
  }

  /**
   * Start playback of a bass event layer.
   */
  private startBassEventLayerPlayback(layer: Layer): void {
    if (!this.audioContext || !layer.bassEvents || layer.kind !== 'bass_events') return;

    // Initialize bass event player if needed
    bassEventPlayer.initialize(this.audioContext);

    // Load events and start
    bassEventPlayer.loadBassEvents(layer.bassEvents, this.loopLengthMs);
    bassEventPlayer.setVolume(layer.muted ? 0 : layer.volume);
    bassEventPlayer.start(this.playbackStartTime);
    layer.isPlaying = true;
  }

  /**
   * Start playback of a guitar event layer.
   */
  private startGuitarEventLayerPlayback(layer: Layer): void {
    if (!this.audioContext || !layer.guitarEvents || layer.kind !== 'guitar_events') return;

    // Initialize guitar event player if needed
    guitarEventPlayer.initialize(this.audioContext);

    // Load events and start
    guitarEventPlayer.loadGuitarEvents(layer.guitarEvents, this.loopLengthMs);
    guitarEventPlayer.setVolume(layer.muted ? 0 : layer.volume);
    guitarEventPlayer.start(this.playbackStartTime);
    layer.isPlaying = true;
  }

  /**
   * Start playback of a piano event layer.
   */
  private startPianoEventLayerPlayback(layer: Layer): void {
    if (!this.audioContext || !layer.pianoEvents || layer.kind !== 'piano_events') return;

    // Initialize piano event player if needed
    pianoEventPlayer.initialize(this.audioContext);

    // Load events and start
    pianoEventPlayer.loadPianoEvents(layer.pianoEvents, this.loopLengthMs);
    pianoEventPlayer.setVolume(layer.muted ? 0 : layer.volume);
    pianoEventPlayer.start(this.playbackStartTime);
    layer.isPlaying = true;
  }

  /**
   * Start playback of a single layer (looped).
   */
  private startLayerPlayback(layer: Layer): void {
    if (!this.audioContext || !layer.gainNode || !layer.audioBuffer) return;

    // Stop any existing playback
    this.stopLayerPlayback(layer);

    // Create new source node
    const source = this.audioContext.createBufferSource();
    source.buffer = layer.audioBuffer;
    source.loop = true;
    source.loopStart = 0;
    source.loopEnd = layer.audioBuffer.duration;
    source.connect(layer.gainNode);

    // Apply mute state
    if (layer.muted) {
      layer.gainNode.gain.value = 0;
    } else {
      layer.gainNode.gain.value = layer.volume;
    }

    source.start(this.playbackStartTime);
    layer.sourceNode = source;
    layer.isPlaying = true;
  }

  /**
   * Stop playback of a single layer.
   */
  private stopLayerPlayback(layer: Layer): void {
    if (layer.sourceNode) {
      try {
        layer.sourceNode.stop();
      } catch {
        // Ignore if already stopped
      }
      layer.sourceNode.disconnect();
      layer.sourceNode = null;
    }
    layer.isPlaying = false;
  }

  /**
   * Get layer info for UI (without AudioBuffer).
   */
  getLayerInfos(): LayerInfo[] {
    return Array.from(this.layers.values()).map(layer => ({
      id: layer.id,
      type: layer.type,
      kind: layer.kind,
      name: layer.name,
      volume: layer.volume,
      muted: layer.muted,
      duration: layer.duration,
      events: layer.events ? [...layer.events] : undefined,
      bassEvents: layer.bassEvents ? [...layer.bassEvents] : undefined,
      guitarEvents: layer.guitarEvents ? [...layer.guitarEvents] : undefined,
      pianoEvents: layer.pianoEvents ? [...layer.pianoEvents] : undefined,
    }));
  }

  /**
   * Get a layer by ID.
   */
  getLayer(id: string): Layer | undefined {
    return this.layers.get(id);
  }

  /**
   * Get all layers of a specific type.
   */
  getLayersByType(type: LayerType): Layer[] {
    return Array.from(this.layers.values()).filter(l => l.type === type);
  }

  /**
   * Get count of layers by type.
   */
  private getLayerCountByType(type: LayerType): number {
    return Array.from(this.layers.values()).filter(l => l.type === type).length;
  }

  /**
   * Check if any layers exist.
   */
  hasLayers(): boolean {
    return this.layers.size > 0;
  }

  /**
   * Get layer count.
   */
  getLayerCount(): number {
    return this.layers.size;
  }

  /**
   * Check if playing.
   */
  getIsPlaying(): boolean {
    return this.isPlaying;
  }

  /**
   * Mix all layers into a single AudioBuffer for export.
   */
  mixAllLayers(): AudioBuffer | null {
    if (!this.audioContext || this.layers.size === 0) return null;

    // Find the longest layer (should all be same length, but just in case)
    // Only consider layers with audioBuffer (audio layers)
    let maxLength = 0;
    for (const layer of this.layers.values()) {
      if (layer.audioBuffer) {
        maxLength = Math.max(maxLength, layer.audioBuffer.length);
      }
    }

    if (maxLength === 0) return null;

    const sampleRate = this.audioContext.sampleRate;
    const outputBuffer = this.audioContext.createBuffer(2, maxLength, sampleRate);
    const leftChannel = outputBuffer.getChannelData(0);
    const rightChannel = outputBuffer.getChannelData(1);

    // Mix all audio layers
    for (const layer of this.layers.values()) {
      if (layer.muted || !layer.audioBuffer) continue;

      const buffer = layer.audioBuffer;
      const volume = layer.volume;

      // Handle mono or stereo source
      const sourceLeft = buffer.getChannelData(0);
      const sourceRight = buffer.numberOfChannels > 1
        ? buffer.getChannelData(1)
        : sourceLeft;

      for (let i = 0; i < buffer.length; i++) {
        leftChannel[i] += sourceLeft[i] * volume;
        rightChannel[i] += sourceRight[i] * volume;
      }
    }

    // Normalize to prevent clipping
    let maxSample = 0;
    for (let i = 0; i < maxLength; i++) {
      maxSample = Math.max(maxSample, Math.abs(leftChannel[i]), Math.abs(rightChannel[i]));
    }

    if (maxSample > 1) {
      const normalizeRatio = 0.95 / maxSample;
      for (let i = 0; i < maxLength; i++) {
        leftChannel[i] *= normalizeRatio;
        rightChannel[i] *= normalizeRatio;
      }
    }

    return outputBuffer;
  }

  /**
   * Export mixed layers as WAV blob.
   */
  exportAsWav(): Blob | null {
    const mixedBuffer = this.mixAllLayers();
    if (!mixedBuffer) return null;

    return this.audioBufferToWav(mixedBuffer);
  }

  /**
   * Convert AudioBuffer to WAV blob.
   */
  private audioBufferToWav(buffer: AudioBuffer): Blob {
    const numChannels = buffer.numberOfChannels;
    const sampleRate = buffer.sampleRate;
    const format = 1; // PCM
    const bitDepth = 16;

    const bytesPerSample = bitDepth / 8;
    const blockAlign = numChannels * bytesPerSample;
    const byteRate = sampleRate * blockAlign;
    const dataSize = buffer.length * blockAlign;
    const headerSize = 44;
    const totalSize = headerSize + dataSize;

    const arrayBuffer = new ArrayBuffer(totalSize);
    const view = new DataView(arrayBuffer);

    // WAV header
    this.writeString(view, 0, 'RIFF');
    view.setUint32(4, totalSize - 8, true);
    this.writeString(view, 8, 'WAVE');
    this.writeString(view, 12, 'fmt ');
    view.setUint32(16, 16, true);
    view.setUint16(20, format, true);
    view.setUint16(22, numChannels, true);
    view.setUint32(24, sampleRate, true);
    view.setUint32(28, byteRate, true);
    view.setUint16(32, blockAlign, true);
    view.setUint16(34, bitDepth, true);
    this.writeString(view, 36, 'data');
    view.setUint32(40, dataSize, true);

    // Interleave channels and write samples
    const channels: Float32Array[] = [];
    for (let i = 0; i < numChannels; i++) {
      channels.push(buffer.getChannelData(i));
    }

    let offset = 44;
    for (let i = 0; i < buffer.length; i++) {
      for (let ch = 0; ch < numChannels; ch++) {
        const sample = Math.max(-1, Math.min(1, channels[ch][i]));
        const intSample = sample < 0 ? sample * 0x8000 : sample * 0x7FFF;
        view.setInt16(offset, intSample, true);
        offset += 2;
      }
    }

    return new Blob([arrayBuffer], { type: 'audio/wav' });
  }

  private writeString(view: DataView, offset: number, string: string): void {
    for (let i = 0; i < string.length; i++) {
      view.setUint8(offset + i, string.charCodeAt(i));
    }
  }

  /**
   * Download mixed layers as WAV file.
   */
  downloadMix(filename: string = 'beatbite-mix'): void {
    const wavBlob = this.exportAsWav();
    if (!wavBlob) return;

    const url = URL.createObjectURL(wavBlob);
    const a = document.createElement('a');
    a.href = url;
    a.download = `${filename}.wav`;
    document.body.appendChild(a);
    a.click();
    document.body.removeChild(a);
    URL.revokeObjectURL(url);
  }

  /**
   * Notify layers changed callback.
   */
  private notifyLayersChanged(): void {
    this.callbacks.onLayersChanged?.(this.getLayerInfos());
  }

  /**
   * Dispose resources.
   */
  dispose(): void {
    this.stopAllLayers();

    for (const layer of this.layers.values()) {
      layer.gainNode?.disconnect();
    }

    this.layers.clear();
    this.masterGain?.disconnect();
    this.masterGain = null;
    this.audioContext = null;
  }
}

// Singleton instance
export const layerManager = new LayerManager();
