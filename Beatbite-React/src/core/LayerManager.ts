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

import type { Layer, LayerType, LayerKind, LayerInfo, DrumHitEvent, BassNoteEvent, GuitarNoteEvent, PianoNoteEvent } from '../types';
import { drumEventPlayer } from './DrumEventPlayer';
import { bassEventPlayer, guitarEventPlayer, pianoEventPlayer } from './MelodicEventPlayer';

// Event layer configuration for generic handling
type EventLayerKind = Exclude<LayerKind, 'audio'>;

const EVENT_LAYER_CONFIGS: Record<EventLayerKind, {
  type: LayerType;
  displayName: string;
  eventProperty: 'events' | 'bassEvents' | 'guitarEvents' | 'pianoEvents';
  getPlayer: () => { initialize(ctx: AudioContext): void; setVolume(v: number): void; setMuted(m: boolean): void; start(t: number): void };
  loadEvents: (events: unknown[], ms: number) => void;
}> = {
  drum_events: {
    type: 'drums',
    displayName: 'Drums',
    eventProperty: 'events',
    getPlayer: () => drumEventPlayer,
    loadEvents: (events, ms) => drumEventPlayer.loadEvents(events as DrumHitEvent[], ms),
  },
  bass_events: {
    type: 'bass',
    displayName: 'Bass',
    eventProperty: 'bassEvents',
    getPlayer: () => bassEventPlayer,
    loadEvents: (events, ms) => bassEventPlayer.loadBassEvents(events as BassNoteEvent[], ms),
  },
  guitar_events: {
    type: 'guitar',
    displayName: 'Guitar',
    eventProperty: 'guitarEvents',
    getPlayer: () => guitarEventPlayer,
    loadEvents: (events, ms) => guitarEventPlayer.loadGuitarEvents(events as GuitarNoteEvent[], ms),
  },
  piano_events: {
    type: 'piano',
    displayName: 'Piano',
    eventProperty: 'pianoEvents',
    getPlayer: () => pianoEventPlayer,
    loadEvents: (events, ms) => pianoEventPlayer.loadPianoEvents(events as PianoNoteEvent[], ms),
  },
};

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
   * Generic: Add any event-based layer (drum, bass, guitar, piano).
   */
  private addEventLayer(kind: EventLayerKind, events: unknown[], loopLengthMs: number, name?: string): Layer {
    if (!this.audioContext || !this.masterGain) {
      throw new Error('LayerManager not initialized');
    }

    const config = EVENT_LAYER_CONFIGS[kind];
    const id = crypto.randomUUID();
    const layerName = name || `${config.displayName} ${this.getLayerCountByType(config.type) + 1}`;

    // Gain node kept for consistency (event layers play through their synthesizer)
    const gainNode = this.audioContext.createGain();
    gainNode.gain.value = 1.0;

    if (this.loopLengthMs === 0) {
      this.loopLengthMs = loopLengthMs;
    }

    const layer = {
      id,
      type: config.type,
      kind,
      name: layerName,
      [config.eventProperty]: [...(events as unknown[])],
      volume: 1.0,
      muted: false,
      duration: loopLengthMs,
      gainNode,
      isPlaying: false,
    } as Layer;

    this.layers.set(id, layer);
    this.notifyLayersChanged();

    console.log(`[LayerManager] Added ${config.displayName.toLowerCase()} event layer: ${layerName} (${(events as unknown[]).length} events)`);

    return layer;
  }

  addDrumEventLayer(events: DrumHitEvent[], loopLengthMs: number, name?: string): Layer {
    return this.addEventLayer('drum_events', events, loopLengthMs, name);
  }

  addBassEventLayer(events: BassNoteEvent[], loopLengthMs: number, name?: string): Layer {
    return this.addEventLayer('bass_events', events, loopLengthMs, name);
  }

  addGuitarEventLayer(events: GuitarNoteEvent[], loopLengthMs: number, name?: string): Layer {
    return this.addEventLayer('guitar_events', events, loopLengthMs, name);
  }

  addPianoEventLayer(events: PianoNoteEvent[], loopLengthMs: number, name?: string): Layer {
    return this.addEventLayer('piano_events', events, loopLengthMs, name);
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

    if (layer.kind && layer.kind !== 'audio') {
      EVENT_LAYER_CONFIGS[layer.kind].getPlayer().setVolume(layer.muted ? 0 : layer.volume);
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

    if (layer.kind && layer.kind !== 'audio') {
      EVENT_LAYER_CONFIGS[layer.kind].getPlayer().setMuted(muted);
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

    for (const layer of this.layers.values()) {
      if (layer.kind && layer.kind !== 'audio') {
        this.startEventLayerPlayback(layer);
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
   * Generic: Start playback of any event-based layer.
   */
  private startEventLayerPlayback(layer: Layer): void {
    if (!this.audioContext || !layer.kind || layer.kind === 'audio') return;

    const config = EVENT_LAYER_CONFIGS[layer.kind];
    const events = layer[config.eventProperty];
    if (!events) return;

    const player = config.getPlayer();
    player.initialize(this.audioContext);
    config.loadEvents(events, this.loopLengthMs);
    player.setVolume(layer.muted ? 0 : layer.volume);
    player.start(this.playbackStartTime);
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
