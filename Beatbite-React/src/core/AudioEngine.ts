/**
 * AudioEngine handles low-latency audio passthrough for Beatbite.
 *
 * Prototype v0.1: Tests audio latency by passing microphone input
 * directly to headphone output with minimal processing.
 *
 * Prototype v0.2: Added pitch detection using autocorrelation.
 *
 * Uses Web Audio API for browser-based audio processing.
 * For React Native, this would be replaced with native audio modules.
 *
 * Target latency: < 15ms (imperceptible to most users)
 * Maximum acceptable: < 100ms (per spec)
 */

import { PitchDetector, type PitchResult } from './PitchDetector';
import { drumSynthesizer, type DrumType, type DrumKitType } from './DrumSynthesizer';
import { bassSynthesizer, type BassStyle, guitarSynthesizer, type GuitarStyle, pianoSynthesizer, type PianoStyle } from './synthesizers';
import { electricGuitarSampler } from './ElectricGuitarSampler';
import type { GuitarSynthType, ElectricGuitarStyle } from '../types';
import { voiceEffects, type EffectType, type VoiceEffectsState } from './VoiceEffects';
import { loopRecorder, type Recording, type RecorderState } from './LoopRecorder';
import { transportController } from './TransportController';
import { layerManager } from './LayerManager';
import { layerRecorder } from './LayerRecorder';
import { bpmDetector } from './BpmDetector';
import { quantizer } from './Quantizer';
import { beatboxDetector } from './BeatboxDetector';
import { drumEventRecorder } from './DrumEventRecorder';
import { metronomeAudio } from './MetronomeAudio';
import { melodicEventRecorder } from './MelodicEventRecorder';
import { voiceOnsetDetector } from './VoiceOnsetDetector';
import { loopQuantizer } from './LoopQuantizer';
// Note: MelodicEventPlayers are used via LayerManager, not directly here
import type { LayerType, LayerInfo, TransportState, RecordingState as LayerRecordingState, DrumHitEvent, BassNoteEvent, GuitarNoteEvent, PianoNoteEvent, MelodicNoteEvent } from '../types';

export type InstrumentMode = 'drums' | 'bass' | 'guitar' | 'piano' | 'off';

export interface AudioEngineCallbacks {
  onLatencyMeasured?: (latencyMs: number) => void;
  onLevelChanged?: (level: number) => void;
  onPitchDetected?: (pitch: PitchResult) => void;
  onDrumTriggered?: (drum: DrumType) => void;
  onBassNoteChanged?: (frequency: number, noteName: string) => void;
  onGuitarNoteChanged?: (frequency: number, noteName: string) => void;
  onPianoNoteChanged?: (frequency: number, noteName: string) => void;
  onEffectsChanged?: (state: VoiceEffectsState) => void;
  onRecorderStateChanged?: (state: RecorderState) => void;
  onRecordingComplete?: (recording: Recording) => void;
  onError?: (error: string) => void;
  onStateChanged?: (isActive: boolean) => void;
  // Looper callbacks
  onTransportUpdate?: (state: TransportState) => void;
  onLayersChanged?: (layers: LayerInfo[]) => void;
  onLayerRecordingStateChanged?: (state: LayerRecordingState, layerType: LayerType | null) => void;
}

export interface AudioEngineConfig {
  sampleRate?: number;
  bufferSize?: number;
  channels?: number;
}

const DEFAULT_CONFIG: Required<AudioEngineConfig> = {
  sampleRate: 48000,
  bufferSize: 256, // Low buffer for minimal latency
  channels: 1,     // Mono for voice input
};

class AudioEngine {
  private audioContext: AudioContext | null = null;
  private mediaStream: MediaStream | null = null;
  private sourceNode: MediaStreamAudioSourceNode | null = null;
  private analyzerNode: AnalyserNode | null = null;
  private pitchAnalyzerNode: AnalyserNode | null = null;
  private gainNode: GainNode | null = null;

  private config: Required<AudioEngineConfig> = DEFAULT_CONFIG;
  private callbacks: AudioEngineCallbacks = {};

  private isInitialized = false;
  private isPassthroughActive = false;
  private currentLatency = 0;

  private inputGain = 1.0;
  private outputVolume = 0.8;

  private animationFrameId: number | null = null;

  // Pitch detection
  private pitchDetector: PitchDetector | null = null;
  private pitchEnabled = true;

  // Instrument synthesis mode
  private instrumentMode: InstrumentMode = 'drums';
  private guitarSynthType: GuitarSynthType = 'electric';  // Default to electric guitar

  // Recording
  private recorderDest: MediaStreamAudioDestinationNode | null = null;

  // Layer recording capture nodes
  private layerCaptureNodes: {
    drumsCapture: GainNode | null;
    bassCapture: GainNode | null;
    guitarCapture: GainNode | null;
    voiceCapture: GainNode | null;
  } = { drumsCapture: null, bassCapture: null, guitarCapture: null, voiceCapture: null };

  // Beatbox detection mode (new two-part architecture)
  private useBeatboxDetection = true;
  private loopLengthMs = 0;

  /**
   * Set callbacks for audio events.
   */
  setCallbacks(callbacks: AudioEngineCallbacks): void {
    this.callbacks = callbacks;
  }

  /**
   * Initialize the audio engine with optimal settings for low latency.
   */
  async initialize(config?: AudioEngineConfig): Promise<boolean> {
    if (this.isInitialized) return true;

    this.config = { ...DEFAULT_CONFIG, ...config };

    try {
      // Create AudioContext with low latency hint
      this.audioContext = new AudioContext({
        sampleRate: this.config.sampleRate,
        latencyHint: 'interactive', // Request lowest latency
      });

      // Check if we can get actual latency info
      if ('baseLatency' in this.audioContext) {
        const baseLatency = (this.audioContext as AudioContext & { baseLatency: number }).baseLatency;
        console.log(`[AudioEngine] Base latency: ${baseLatency * 1000}ms`);
      }

      if ('outputLatency' in this.audioContext) {
        const outputLatency = (this.audioContext as AudioContext & { outputLatency: number }).outputLatency;
        console.log(`[AudioEngine] Output latency: ${outputLatency * 1000}ms`);
      }

      this.isInitialized = true;
      console.log('[AudioEngine] Initialized successfully');
      return true;
    } catch (error) {
      const message = error instanceof Error ? error.message : 'Unknown error';
      console.error('[AudioEngine] Initialization failed:', message);
      this.callbacks.onError?.(`Failed to initialize audio engine: ${message}`);
      return false;
    }
  }

  /**
   * Request microphone permission.
   */
  async requestPermission(): Promise<boolean> {
    try {
      // Check if we already have permission
      const permissionStatus = await navigator.permissions.query({
        name: 'microphone' as PermissionName,
      });

      if (permissionStatus.state === 'granted') {
        return true;
      }

      if (permissionStatus.state === 'denied') {
        this.callbacks.onError?.('Microphone permission denied');
        return false;
      }

      // Request permission by attempting to get user media
      const stream = await navigator.mediaDevices.getUserMedia({
        audio: {
          echoCancellation: false, // Disable for lowest latency
          noiseSuppression: false,
          autoGainControl: false,
          channelCount: this.config.channels,
          sampleRate: this.config.sampleRate,
        },
      });

      // Stop the test stream
      stream.getTracks().forEach(track => track.stop());

      return true;
    } catch (error) {
      const message = error instanceof Error ? error.message : 'Unknown error';
      console.error('[AudioEngine] Permission request failed:', message);
      this.callbacks.onError?.(`Microphone permission required: ${message}`);
      return false;
    }
  }

  /**
   * Start audio passthrough (microphone → headphones).
   * This is the core test for Prototype v0.1.
   */
  async startPassthrough(): Promise<boolean> {
    if (!this.isInitialized) {
      const initialized = await this.initialize();
      if (!initialized) return false;
    }

    if (this.isPassthroughActive) return true;

    try {
      // Resume audio context if suspended (required for user gesture)
      if (this.audioContext?.state === 'suspended') {
        await this.audioContext.resume();
      }

      // Get microphone stream with low-latency settings
      this.mediaStream = await navigator.mediaDevices.getUserMedia({
        audio: {
          echoCancellation: false,
          noiseSuppression: false,
          autoGainControl: false,
          channelCount: this.config.channels,
          sampleRate: this.config.sampleRate,
        },
      });

      if (!this.audioContext) {
        throw new Error('Audio context not initialized');
      }

      // Create source from microphone
      this.sourceNode = this.audioContext.createMediaStreamSource(this.mediaStream);

      // Create analyzer for level monitoring
      this.analyzerNode = this.audioContext.createAnalyser();
      this.analyzerNode.fftSize = 256;
      this.analyzerNode.smoothingTimeConstant = 0.3;

      // Create analyzer for pitch detection (needs larger buffer)
      this.pitchAnalyzerNode = this.audioContext.createAnalyser();
      this.pitchAnalyzerNode.fftSize = 2048;
      this.pitchAnalyzerNode.smoothingTimeConstant = 0;

      // Initialize pitch detector
      this.pitchDetector = new PitchDetector({
        sampleRate: this.audioContext.sampleRate,
        bufferSize: 2048,
      });

      // Initialize loop recorder first (need destination for synthesizers)
      this.recorderDest = loopRecorder.initialize(this.audioContext);
      loopRecorder.setOnStateChanged((state) => {
        this.callbacks.onRecorderStateChanged?.(state);
      });
      loopRecorder.setOnRecordingComplete((recording) => {
        this.callbacks.onRecordingComplete?.(recording);
      });

      // Initialize looper workstation modules
      transportController.initialize(this.audioContext);
      transportController.setCallbacks({
        onPositionUpdate: (state) => this.callbacks.onTransportUpdate?.(state),
        onBeatChange: (_beat, _bar) => {
          // Could trigger visual metronome here
        },
        onLoopBoundary: () => {
          // Loop boundary events handled internally
        },
      });

      const masterGain = layerManager.initialize(this.audioContext);
      masterGain.connect(this.audioContext.destination);
      layerManager.setCallbacks({
        onLayersChanged: (layers) => this.callbacks.onLayersChanged?.(layers),
        onPlaybackStateChanged: (_isPlaying) => {
          // Sync with transport
        },
      });

      this.layerCaptureNodes = layerRecorder.initialize(this.audioContext);
      layerRecorder.setCallbacks({
        onStateChanged: (state, layerType) => {
          this.callbacks.onLayerRecordingStateChanged?.(state, layerType);
        },
        onRecordingComplete: (layerType, audioBuffer) => {
          this.handleLayerRecordingComplete(layerType, audioBuffer);
        },
        onDurationUpdate: (_durationMs) => {
          // Could update UI with recording progress
        },
      });

      quantizer.initialize(this.audioContext);

      // Initialize drum synthesizer
      drumSynthesizer.initialize(this.audioContext);
      drumSynthesizer.setOnDrumTriggered((drum) => {
        this.callbacks.onDrumTriggered?.(drum);
      });
      // Connect drums to recorder and layer capture
      drumSynthesizer.connectToRecorder(this.recorderDest);
      if (this.layerCaptureNodes.drumsCapture) {
        drumSynthesizer.connectToRecorder(this.layerCaptureNodes.drumsCapture);
      }

      // Initialize beatbox detector for new architecture
      const detectorAnalyser = beatboxDetector.initialize(this.audioContext);
      beatboxDetector.setCallbacks({
        onDrumDetected: (result) => {
          if (result.drumType) {
            // Trigger drum sound immediately for feedback
            const synthDrum = result.drumType === 'hihat_closed' ? 'hihat' :
              result.drumType === 'hihat_open' ? 'hihat_open' : result.drumType;
            drumSynthesizer.trigger(synthDrum, { volume: result.velocity });
            this.callbacks.onDrumTriggered?.(synthDrum);
          }
        },
      });

      // Initialize metronome
      metronomeAudio.initialize(this.audioContext);

      // Initialize bass synthesizer
      bassSynthesizer.initialize(this.audioContext);
      bassSynthesizer.setOnNoteChanged((frequency, noteName) => {
        this.callbacks.onBassNoteChanged?.(frequency, noteName);
      });
      // Connect bass to recorder and layer capture
      bassSynthesizer.connectToRecorder(this.recorderDest);
      if (this.layerCaptureNodes.bassCapture) {
        bassSynthesizer.connectToRecorder(this.layerCaptureNodes.bassCapture);
      }

      // Initialize guitar synthesizer (electronic)
      guitarSynthesizer.initialize(this.audioContext);
      guitarSynthesizer.setOnNoteChanged((frequency, noteName) => {
        this.callbacks.onGuitarNoteChanged?.(frequency, noteName);
      });
      // Connect guitar to recorder and layer capture
      guitarSynthesizer.connectToRecorder(this.recorderDest);
      if (this.layerCaptureNodes.guitarCapture) {
        guitarSynthesizer.connectToRecorder(this.layerCaptureNodes.guitarCapture);
      }

      // Initialize electric guitar sampler
      await electricGuitarSampler.load();
      electricGuitarSampler.setOnNoteChanged((frequency, noteName) => {
        this.callbacks.onGuitarNoteChanged?.(frequency, noteName);
      });
      // Note: ElectricGuitarSampler connects to Tone.js destination directly

      // Initialize piano synthesizer
      pianoSynthesizer.initialize(this.audioContext);
      pianoSynthesizer.setOnNoteChanged((frequency, noteName) => {
        this.callbacks.onPianoNoteChanged?.(frequency, noteName);
      });
      // Connect piano to recorder
      pianoSynthesizer.connectToRecorder(this.recorderDest);

      // Initialize voice effects
      const effectsNodes = voiceEffects.initialize(this.audioContext);
      voiceEffects.setOnStateChanged((state) => {
        this.callbacks.onEffectsChanged?.(state);
      });

      // Create gain node for volume control
      this.gainNode = this.audioContext.createGain();
      this.gainNode.gain.value = this.inputGain * this.outputVolume;

      // Connect the audio graph: source → analyzers → gain → effects → destination
      this.sourceNode.connect(this.analyzerNode);
      this.sourceNode.connect(this.pitchAnalyzerNode);
      // Connect to beatbox detector for new architecture
      this.sourceNode.connect(detectorAnalyser);
      this.analyzerNode.connect(this.gainNode);
      this.gainNode.connect(effectsNodes.input);
      effectsNodes.output.connect(this.audioContext.destination);
      // Also connect to recorder destination for capturing audio
      effectsNodes.output.connect(this.recorderDest);
      // Connect voice to layer capture node
      if (this.layerCaptureNodes.voiceCapture) {
        effectsNodes.output.connect(this.layerCaptureNodes.voiceCapture);
      }

      // Start level and pitch monitoring
      this.startLevelMonitoring();

      // Calculate estimated latency
      this.currentLatency = this.measureLatency();
      this.callbacks.onLatencyMeasured?.(this.currentLatency);

      this.isPassthroughActive = true;
      this.callbacks.onStateChanged?.(true);
      console.log('[AudioEngine] Passthrough started');

      return true;
    } catch (error) {
      const message = error instanceof Error ? error.message : 'Unknown error';
      console.error('[AudioEngine] Failed to start passthrough:', message);
      this.callbacks.onError?.(`Failed to start audio: ${message}`);
      this.stopPassthrough();
      return false;
    }
  }

  /**
   * Stop audio passthrough.
   */
  stopPassthrough(): void {
    // Stop level monitoring
    if (this.animationFrameId !== null) {
      cancelAnimationFrame(this.animationFrameId);
      this.animationFrameId = null;
    }

    // Disconnect audio nodes
    this.sourceNode?.disconnect();
    this.analyzerNode?.disconnect();
    this.pitchAnalyzerNode?.disconnect();
    this.gainNode?.disconnect();

    // Stop media stream tracks
    this.mediaStream?.getTracks().forEach(track => track.stop());

    // Clean up references
    this.sourceNode = null;
    this.analyzerNode = null;
    this.pitchAnalyzerNode = null;
    this.gainNode = null;
    this.mediaStream = null;
    this.pitchDetector = null;

    this.isPassthroughActive = false;
    this.callbacks.onStateChanged?.(false);
    console.log('[AudioEngine] Passthrough stopped');
  }

  /**
   * Start monitoring audio input levels and pitch.
   */
  private startLevelMonitoring(): void {
    if (!this.analyzerNode) return;

    const levelDataArray = new Uint8Array(this.analyzerNode.frequencyBinCount);
    const pitchDataArray = new Float32Array(this.pitchAnalyzerNode?.fftSize || 2048);

    const updateLevel = () => {
      if (!this.analyzerNode || !this.isPassthroughActive) return;

      // Level monitoring
      this.analyzerNode.getByteFrequencyData(levelDataArray);

      // Calculate RMS level
      let sum = 0;
      for (let i = 0; i < levelDataArray.length; i++) {
        sum += levelDataArray[i] * levelDataArray[i];
      }
      const rms = Math.sqrt(sum / levelDataArray.length);
      const level = rms / 255; // Normalize to 0-1

      this.callbacks.onLevelChanged?.(level);

      // Pitch detection
      if (this.pitchEnabled && this.pitchAnalyzerNode && this.pitchDetector) {
        this.pitchAnalyzerNode.getFloatTimeDomainData(pitchDataArray);
        const pitchResult = this.pitchDetector.detect(pitchDataArray);
        this.callbacks.onPitchDetected?.(pitchResult);

        // Trigger instrument synthesis based on mode
        if (this.instrumentMode === 'drums' && pitchResult.frequency > 0) {
          drumSynthesizer.triggerFromPitch(pitchResult.frequency, pitchResult.confidence);
        } else if (this.instrumentMode === 'bass') {
          // Always call updateFromPitch for bass - it handles stopping when no voice
          bassSynthesizer.updateFromPitch(pitchResult.frequency, pitchResult.confidence);
        } else if (this.instrumentMode === 'guitar') {
          // Always call updateFromPitch for guitar - it handles stopping when no voice
          // Use the appropriate guitar synth based on type
          if (this.guitarSynthType === 'electric') {
            electricGuitarSampler.updateFromPitch(pitchResult.frequency, pitchResult.confidence);
          } else {
            guitarSynthesizer.updateFromPitch(pitchResult.frequency, pitchResult.confidence);
          }
        } else if (this.instrumentMode === 'piano') {
          // Always call updateFromPitch for piano - it handles stopping when no voice
          pianoSynthesizer.updateFromPitch(pitchResult.frequency, pitchResult.confidence);
        }
      }

      this.animationFrameId = requestAnimationFrame(updateLevel);
    };

    this.animationFrameId = requestAnimationFrame(updateLevel);
  }

  /**
   * Enable or disable pitch detection.
   */
  setPitchEnabled(enabled: boolean): void {
    this.pitchEnabled = enabled;
  }

  /**
   * Set instrument synthesis mode.
   */
  setInstrumentMode(mode: InstrumentMode): void {
    this.instrumentMode = mode;
    // Clear state when switching modes
    if (mode !== 'drums') {
      drumSynthesizer.clearCurrentDrum();
    }
  }

  /**
   * Set drum synthesizer volume.
   */
  setDrumVolume(volume: number): void {
    drumSynthesizer.setVolume(volume);
  }

  /**
   * Set bass synthesizer volume.
   */
  setBassVolume(volume: number): void {
    bassSynthesizer.setVolume(volume);
  }

  /**
   * Set bass style.
   */
  setBassStyle(style: BassStyle): void {
    bassSynthesizer.setStyle(style);
  }

  /**
   * Set guitar style.
   */
  setGuitarStyle(style: GuitarStyle): void {
    guitarSynthesizer.setStyle(style);
  }

  /**
   * Set guitar synth type (electronic, sampled, or electric).
   */
  setGuitarSynthType(synthType: GuitarSynthType): void {
    this.guitarSynthType = synthType;
    console.log(`[AudioEngine] Guitar synth type set to: ${synthType}`);
  }

  /**
   * Get current guitar synth type.
   */
  getGuitarSynthType(): GuitarSynthType {
    return this.guitarSynthType;
  }

  /**
   * Set electric guitar style.
   */
  setElectricGuitarStyle(style: ElectricGuitarStyle): void {
    electricGuitarSampler.setStyle(style);
    console.log(`[AudioEngine] Electric guitar style set to: ${style}`);
  }

  /**
   * Set piano style.
   */
  setPianoStyle(style: PianoStyle): void {
    pianoSynthesizer.setStyle(style);
  }

  /**
   * Set piano volume.
   */
  setPianoVolume(volume: number): void {
    pianoSynthesizer.setVolume(volume);
  }

  /**
   * Set drum kit.
   */
  setDrumKit(kit: DrumKitType): void {
    drumSynthesizer.setKit(kit);
  }

  /**
   * Get bass synthesizer instance for advanced configuration.
   */
  getBassSynthesizer() {
    return bassSynthesizer;
  }

  /**
   * Get piano synthesizer instance for advanced configuration.
   */
  getPianoSynthesizer() {
    return pianoSynthesizer;
  }

  /**
   * Get drum synthesizer instance for advanced configuration.
   */
  getDrumSynthesizer() {
    return drumSynthesizer;
  }

  /**
   * Toggle a voice effect on/off.
   */
  toggleEffect(effect: EffectType, enabled?: boolean): void {
    voiceEffects.toggleEffect(effect, enabled);
  }

  /**
   * Enable or disable beatbox detection.
   * Used to disable drum triggering during voice-only modes.
   */
  setBeatboxEnabled(enabled: boolean): void {
    beatboxDetector.setEnabled(enabled);
  }

  /**
   * Set a voice effect parameter.
   */
  setEffectParam(effect: EffectType, param: string, value: number): void {
    voiceEffects.setEffectParam(effect, param, value);
  }

  /**
   * Get current voice effects state.
   */
  getEffectsState(): VoiceEffectsState {
    return voiceEffects.getState();
  }

  /**
   * Disable all voice effects.
   */
  disableAllEffects(): void {
    voiceEffects.disableAllEffects();
  }

  // ==================== Recording Controls ====================

  /**
   * Start recording the audio session.
   */
  startRecording(): boolean {
    return loopRecorder.startRecording();
  }

  /**
   * Stop recording.
   */
  stopRecording(): void {
    loopRecorder.stopRecording();
  }

  /**
   * Play a recording.
   */
  playRecording(id: string, loop = false): void {
    loopRecorder.playRecording(id, loop);
  }

  /**
   * Stop playback of a recording.
   */
  stopPlayback(id: string): void {
    loopRecorder.stopPlayback(id);
  }

  /**
   * Stop all playback.
   */
  stopAllPlayback(): void {
    loopRecorder.stopAllPlayback();
  }

  /**
   * Delete a recording.
   */
  deleteRecording(id: string): void {
    loopRecorder.deleteRecording(id);
  }

  /**
   * Rename a recording.
   */
  renameRecording(id: string, name: string): void {
    loopRecorder.renameRecording(id, name);
  }

  /**
   * Download a recording as WAV file.
   */
  downloadRecording(id: string): Promise<void> {
    return loopRecorder.downloadRecording(id);
  }

  /**
   * Get recorder state.
   */
  getRecorderState(): RecorderState {
    return loopRecorder.getState();
  }

  /**
   * Get all recordings.
   */
  getRecordings(): Recording[] {
    return loopRecorder.getRecordings();
  }

  // ==================== End Recording Controls ====================

  // ==================== Looper Workstation Controls ====================

  /**
   * Handle completion of a layer recording.
   * Called by LayerRecorder when recording finishes.
   */
  private handleLayerRecordingComplete(layerType: LayerType, audioBuffer: AudioBuffer): void {
    // If this is the first layer, set up the transport timing
    if (!transportController.hasLoop()) {
      const bpmResult = bpmDetector.detectFromBuffer(audioBuffer);
      transportController.setLoopFromBuffer(audioBuffer, bpmResult.bpm);
      layerRecorder.setIsFirstLayer(false);
      console.log(`[AudioEngine] Base loop: ${bpmResult.bpm} BPM, ${bpmResult.bars} bars`);
    }

    // Add the layer to layer manager
    layerManager.addLayer(layerType, audioBuffer);

    // If playback isn't running, start it
    if (!layerManager.getIsPlaying()) {
      layerManager.startAllLayers();
      transportController.start();
    }
  }

  /**
   * Start recording a layer (drums, bass, or voice).
   */
  startLayerRecording(layerType: LayerType): void {
    layerRecorder.startRecording(layerType);
  }

  /**
   * Stop layer recording.
   */
  stopLayerRecording(): void {
    layerRecorder.stopRecording();
  }

  /**
   * Start looper playback (plays all layers in sync).
   */
  startLooperPlayback(): void {
    if (!layerManager.hasLayers()) return;

    layerManager.startAllLayers();
    transportController.start();
  }

  /**
   * Stop looper playback.
   */
  stopLooperPlayback(): void {
    layerManager.stopAllLayers();
    transportController.stop();
  }

  /**
   * Toggle looper playback.
   */
  toggleLooperPlayback(): void {
    if (layerManager.getIsPlaying()) {
      this.stopLooperPlayback();
    } else {
      this.startLooperPlayback();
    }
  }

  /**
   * Set a layer's volume.
   */
  setLayerVolume(layerId: string, volume: number): void {
    layerManager.setLayerVolume(layerId, volume);
  }

  /**
   * Toggle layer mute.
   */
  setLayerMuted(layerId: string, muted: boolean): void {
    layerManager.setLayerMuted(layerId, muted);
  }

  /**
   * Remove a layer.
   */
  removeLayer(layerId: string): void {
    layerManager.removeLayer(layerId);
  }

  /**
   * Get layer infos for UI.
   */
  getLayerInfos(): LayerInfo[] {
    return layerManager.getLayerInfos();
  }

  /**
   * Get transport state for UI.
   */
  getTransportState(): TransportState {
    return transportController.getState();
  }

  /**
   * Check if looper has layers.
   */
  hasLayers(): boolean {
    return layerManager.hasLayers();
  }

  /**
   * Check if looper is playing.
   */
  isLooperPlaying(): boolean {
    return layerManager.getIsPlaying();
  }

  /**
   * Export mixed layers as WAV and download.
   */
  downloadLooperMix(filename?: string): void {
    layerManager.downloadMix(filename);
  }

  /**
   * Reset the looper (remove all layers and reset transport).
   */
  resetLooper(): void {
    layerManager.stopAllLayers();
    transportController.stop();
    transportController.dispose();
    layerRecorder.setIsFirstLayer(true);

    // Remove all layers
    const layers = layerManager.getLayerInfos();
    for (const layer of layers) {
      layerManager.removeLayer(layer.id);
    }

    // Reinitialize transport if audio context exists
    if (this.audioContext) {
      transportController.initialize(this.audioContext);
    }
  }

  /**
   * Set quantization enabled/disabled.
   */
  setQuantizationEnabled(enabled: boolean): void {
    quantizer.setEnabled(enabled);
  }

  /**
   * Set quantization subdivision.
   */
  setQuantizationSubdivision(subdivision: number): void {
    quantizer.setSubdivision(subdivision);
  }

  // ==================== New Two-Part Architecture ====================

  /**
   * Get the audio context (for TempoSelectorScreen).
   */
  getAudioContext(): AudioContext | null {
    return this.audioContext;
  }

  /**
   * Set the confirmed tempo and loop length.
   * Called after tempo selection.
   */
  setTempo(bpm: number, bars: number = 4, beatsPerBar: number = 4): void {
    const beatsPerMs = bpm / 60000;
    const totalBeats = bars * beatsPerBar;
    this.loopLengthMs = totalBeats / beatsPerMs;

    transportController.setManualTempo(bpm, bars, beatsPerBar);
    layerManager.setLoopLength(this.loopLengthMs);
    drumEventRecorder.setBpm(bpm);

    console.log(`[AudioEngine] Tempo set: ${bpm} BPM, ${bars} bars, loop=${this.loopLengthMs.toFixed(0)}ms`);
  }

  /**
   * Start drum event recording (new architecture).
   * Records drum hits as MIDI-like events instead of audio.
   */
  startDrumEventRecording(): void {
    if (this.loopLengthMs === 0) {
      console.warn('[AudioEngine] Cannot start drum recording without tempo set');
      return;
    }

    // Notify recording state change
    this.callbacks.onLayerRecordingStateChanged?.('waiting', 'drums');

    // Wait for downbeat, then start recording
    // For now, start immediately (TODO: sync with metronome)
    drumEventRecorder.setCallbacks({
      onRecordingStarted: () => {
        this.callbacks.onLayerRecordingStateChanged?.('recording', 'drums');
      },
      onEventRecorded: (_event) => {
        // Could update UI with event count
      },
      onRecordingStopped: (events) => {
        this.handleDrumEventRecordingComplete(events);
      },
    });

    drumEventRecorder.startRecording(this.loopLengthMs);
  }

  /**
   * Stop drum event recording.
   */
  stopDrumEventRecording(): DrumHitEvent[] {
    return drumEventRecorder.stopRecording();
  }

  /**
   * Handle completion of drum event recording.
   */
  private handleDrumEventRecordingComplete(_events: DrumHitEvent[]): void {
    this.callbacks.onLayerRecordingStateChanged?.('processing', 'drums');

    // Deduplicate close events (jitter cleanup)
    drumEventRecorder.deduplicateEvents(50);
    const cleanedEvents = drumEventRecorder.getEvents();

    // Add drum event layer
    layerManager.addDrumEventLayer(cleanedEvents, this.loopLengthMs);

    // If playback isn't running, start it
    if (!layerManager.getIsPlaying() && layerManager.hasLayers()) {
      layerManager.startAllLayers();
      transportController.start();
    }

    this.callbacks.onLayerRecordingStateChanged?.('idle', null);
    console.log(`[AudioEngine] Drum event recording complete: ${cleanedEvents.length} events`);
  }

  // ==================== New Melodic Event Recording ====================

  /**
   * Initialize the voice onset detector with the current analyser.
   */
  initializeVoiceOnsetDetector(): void {
    if (this.pitchAnalyzerNode) {
      voiceOnsetDetector.initialize(this.pitchAnalyzerNode);
    }
  }

  /**
   * Start melodic event recording (bass, guitar, or piano).
   * Uses VoiceOnsetDetector for one-to-one mapping: ONE vocal sound = ONE instrument hit.
   */
  startMelodicEventRecording(instrumentType: 'bass' | 'guitar' | 'piano'): void {
    if (this.loopLengthMs === 0) {
      console.warn('[AudioEngine] Cannot start melodic recording without loop length set');
      return;
    }

    // Initialize voice onset detector if not already
    if (this.pitchAnalyzerNode) {
      voiceOnsetDetector.initialize(this.pitchAnalyzerNode);
    }

    // Set up melodic event recorder
    melodicEventRecorder.setInstrumentType(instrumentType);
    melodicEventRecorder.setStyles(
      bassSynthesizer.getStyle(),
      guitarSynthesizer.getStyle(),
      pianoSynthesizer.getStyle()
    );
    melodicEventRecorder.setBpm(transportController.getBpm());

    melodicEventRecorder.setCallbacks({
      onRecordingStarted: () => {
        this.callbacks.onLayerRecordingStateChanged?.('recording', instrumentType);
      },
      onNoteOn: (frequency, noteName) => {
        // Update UI with current note
        if (instrumentType === 'bass') {
          this.callbacks.onBassNoteChanged?.(frequency, noteName);
        } else if (instrumentType === 'guitar') {
          this.callbacks.onGuitarNoteChanged?.(frequency, noteName);
        } else if (instrumentType === 'piano') {
          this.callbacks.onPianoNoteChanged?.(frequency, noteName);
        }
      },
      onNoteOff: () => {
        // Clear note display
        if (instrumentType === 'bass') {
          this.callbacks.onBassNoteChanged?.(0, '--');
        } else if (instrumentType === 'guitar') {
          this.callbacks.onGuitarNoteChanged?.(0, '--');
        } else if (instrumentType === 'piano') {
          this.callbacks.onPianoNoteChanged?.(0, '--');
        }
      },
      onRecordingStopped: (events) => {
        this.handleMelodicEventRecordingComplete(instrumentType, events);
      },
    });

    this.callbacks.onLayerRecordingStateChanged?.('waiting', instrumentType);
    melodicEventRecorder.startRecording(this.loopLengthMs);
    console.log(`[AudioEngine] Started ${instrumentType} melodic recording`);
  }

  /**
   * Stop melodic event recording.
   */
  stopMelodicEventRecording(): void {
    if (melodicEventRecorder.getIsRecording()) {
      melodicEventRecorder.stopRecording();
    }
  }

  /**
   * Handle completion of melodic event recording.
   */
  private handleMelodicEventRecordingComplete(
    instrumentType: 'bass' | 'guitar' | 'piano',
    _events: MelodicNoteEvent[]
  ): void {
    this.callbacks.onLayerRecordingStateChanged?.('processing', instrumentType);

    const styledEvents = melodicEventRecorder.getStyledEvents();

    // Add appropriate layer based on instrument type
    if (instrumentType === 'bass') {
      layerManager.addBassEventLayer(styledEvents as BassNoteEvent[], this.loopLengthMs);
    } else if (instrumentType === 'guitar') {
      layerManager.addGuitarEventLayer(styledEvents as GuitarNoteEvent[], this.loopLengthMs);
    } else if (instrumentType === 'piano') {
      layerManager.addPianoEventLayer(styledEvents as PianoNoteEvent[], this.loopLengthMs);
    }

    // If playback isn't running, start it
    if (!layerManager.getIsPlaying() && layerManager.hasLayers()) {
      layerManager.startAllLayers();
      transportController.start();
    }

    this.callbacks.onLayerRecordingStateChanged?.('idle', null);
    console.log(`[AudioEngine] ${instrumentType} melodic recording complete: ${styledEvents.length} events`);
  }

  /**
   * Check if melodic recording is in progress.
   */
  isMelodicRecording(): boolean {
    return melodicEventRecorder.getIsRecording();
  }

  // ==================== New Variable-Length Drum Recording ====================

  private drumRecordingStartTime = 0;

  /**
   * Start drum recording with variable length (user presses STOP when done).
   * The loop length will be determined when recording stops.
   */
  startVariableDrumRecording(bpm: number): void {
    if (!this.pitchAnalyzerNode) {
      console.warn('[AudioEngine] Cannot start drum recording - analyzer not initialized');
      return;
    }

    // Initialize beatbox detector
    if (!this.audioContext) {
      console.warn('[AudioEngine] Cannot start drum recording - audio context not initialized');
      return;
    }
    beatboxDetector.initialize(this.audioContext);

    // Connect voice input to beatbox detector
    if (this.sourceNode) {
      beatboxDetector.connectSource(this.sourceNode);
    }

    // Set up drum event recorder callbacks
    drumEventRecorder.setCallbacks({
      onRecordingStarted: () => {
        this.callbacks.onLayerRecordingStateChanged?.('recording', 'drums');
      },
      onEventRecorded: (_event) => {
        // Could update UI with event count
      },
      onRecordingStopped: () => {
        // Will be handled by stopVariableDrumRecording
      },
    });

    // Store BPM for quantization later
    transportController.setBpm(bpm);
    drumEventRecorder.setBpm(bpm);
    this.drumRecordingStartTime = performance.now();

    // Start recording with a very long loop length (will be quantized later)
    // NOTE: This sets up the beatbox callback internally, but only records events
    const maxDurationMs = 5 * 60 * 1000; // 5 minutes max
    drumEventRecorder.startRecording(maxDurationMs);

    // IMPORTANT: Set the beatbox callback AFTER startRecording() because
    // startRecording() overwrites the callback. We need to do BOTH:
    // 1. Trigger the drum synthesizer (so user hears the drum)
    // 2. Record the event (for playback later)
    beatboxDetector.setCallbacks({
      onDrumDetected: (result) => {
        if (result.drumType) {
          // Map BeatboxDrumType to DrumType for synthesis
          const synthDrumType: DrumType = result.drumType === 'hihat_closed' ? 'hihat' : result.drumType;

          // 1. Play the drum sound so user gets immediate feedback
          drumSynthesizer.trigger(synthDrumType, { volume: result.velocity });

          // 2. Notify UI callback
          this.callbacks.onDrumTriggered?.(synthDrumType);

          // 3. Record the event (manually call the recorder's handler)
          // The recorder's internal handler adds the event to its list
          if (drumEventRecorder.getIsRecording()) {
            const now = performance.now();
            const timeInLoop = now - this.drumRecordingStartTime;
            drumEventRecorder.addEvents([{
              drumType: result.drumType,
              timeInLoop,
              velocity: result.velocity,
            }]);
          }
        }
      },
    });
    beatboxDetector.setEnabled(true);

    this.callbacks.onLayerRecordingStateChanged?.('recording', 'drums');
    console.log(`[AudioEngine] Started variable-length drum recording at ${bpm} BPM`);
  }

  /**
   * Stop variable-length drum recording and quantize to 4-bar boundary.
   */
  stopVariableDrumRecording(): { events: DrumHitEvent[]; loopLengthMs: number; bars: number } {
    const recordingDuration = performance.now() - this.drumRecordingStartTime;
    const bpm = transportController.getBpm();

    // Stop recording
    beatboxDetector.setEnabled(false);
    drumEventRecorder.stopRecording();

    // Quantize duration to nearest 4-bar boundary
    const quantized = loopQuantizer.quantize(recordingDuration, bpm, 4);
    this.loopLengthMs = quantized.quantizedDurationMs;

    // Deduplicate and clean events
    drumEventRecorder.deduplicateEvents(50);
    const cleanedEvents = drumEventRecorder.getEvents();

    // Filter events to only include those within the quantized loop
    const filteredEvents = cleanedEvents.filter(e => e.timeInLoop < this.loopLengthMs);

    // Add drum event layer with quantized length
    layerManager.addDrumEventLayer(filteredEvents, this.loopLengthMs);

    // Set up transport with the new loop length (using BPM + bars)
    transportController.setManualTempo(bpm, quantized.bars, 4);

    // Start playback
    if (layerManager.hasLayers()) {
      layerManager.startAllLayers();
      transportController.start();
    }

    this.callbacks.onLayerRecordingStateChanged?.('idle', null);
    console.log(`[AudioEngine] Variable drum recording complete: ${filteredEvents.length} events, ${quantized.bars} bars, ${this.loopLengthMs}ms`);

    return {
      events: filteredEvents,
      loopLengthMs: this.loopLengthMs,
      bars: quantized.bars,
    };
  }

  /**
   * Get elapsed time since drum recording started.
   */
  getDrumRecordingElapsedMs(): number {
    if (this.drumRecordingStartTime === 0) return 0;
    return performance.now() - this.drumRecordingStartTime;
  }

  // ==================== End New Recording Methods ====================

  /**
   * Start layer recording (updated for new architecture).
   * For drums: uses event recording if beatbox detection is enabled.
   * For bass/guitar/piano: uses melodic event recording.
   * For voice: uses audio recording.
   */
  startLayerRecordingNew(layerType: LayerType): void {
    if (layerType === 'drums' && this.useBeatboxDetection) {
      this.startDrumEventRecording();
    } else if (layerType === 'bass' || layerType === 'guitar' || layerType === 'piano') {
      // Use new melodic event recording for bass/guitar/piano
      this.startMelodicEventRecording(layerType);
    } else {
      // For voice, use audio recording
      layerRecorder.startRecording(layerType);
    }
  }

  /**
   * Stop layer recording (updated for new architecture).
   */
  stopLayerRecordingNew(): void {
    if (drumEventRecorder.getIsRecording()) {
      this.stopDrumEventRecording();
    } else if (melodicEventRecorder.getIsRecording()) {
      this.stopMelodicEventRecording();
    } else {
      layerRecorder.stopRecording();
    }
  }

  /**
   * Enable/disable beatbox detection mode.
   */
  setBeatboxDetectionEnabled(enabled: boolean): void {
    this.useBeatboxDetection = enabled;
  }

  /**
   * Check if beatbox detection is enabled.
   */
  isBeatboxDetectionEnabled(): boolean {
    return this.useBeatboxDetection;
  }

  /**
   * Get current loop length in milliseconds.
   */
  getLoopLengthMs(): number {
    return this.loopLengthMs;
  }

  // ==================== End Looper Workstation Controls ====================

  /**
   * Measure/estimate round-trip latency.
   * Returns latency in milliseconds.
   */
  measureLatency(): number {
    if (!this.audioContext) return 0;

    let latency = 0;

    // Get base latency (input processing time)
    if ('baseLatency' in this.audioContext) {
      latency += (this.audioContext as AudioContext & { baseLatency: number }).baseLatency * 1000;
    }

    // Get output latency
    if ('outputLatency' in this.audioContext) {
      latency += (this.audioContext as AudioContext & { outputLatency: number }).outputLatency * 1000;
    }

    // Add estimated buffer latency
    const bufferLatency = (this.config.bufferSize / this.config.sampleRate) * 1000;
    latency += bufferLatency * 2; // Input + Output buffers

    this.currentLatency = latency;
    this.callbacks.onLatencyMeasured?.(latency);

    console.log(`[AudioEngine] Estimated latency: ${latency.toFixed(1)}ms`);
    return latency;
  }

  /**
   * Set input gain (0.0 to 2.0, allowing slight boost).
   */
  setInputGain(gain: number): void {
    this.inputGain = Math.max(0, Math.min(2, gain));
    this.updateGain();
  }

  /**
   * Set output volume (0.0 to 1.0).
   */
  setOutputVolume(volume: number): void {
    this.outputVolume = Math.max(0, Math.min(1, volume));
    this.updateGain();
  }

  /**
   * Update the combined gain value.
   */
  private updateGain(): void {
    if (this.gainNode) {
      this.gainNode.gain.value = this.inputGain * this.outputVolume;
    }
  }

  /**
   * Get current state.
   */
  get state() {
    return {
      isInitialized: this.isInitialized,
      isPassthroughActive: this.isPassthroughActive,
      currentLatency: this.currentLatency,
      inputGain: this.inputGain,
      outputVolume: this.outputVolume,
      instrumentMode: this.instrumentMode,
    };
  }

  /**
   * Release all resources.
   */
  dispose(): void {
    this.stopPassthrough();
    drumSynthesizer.dispose();
    bassSynthesizer.dispose();
    guitarSynthesizer.dispose();
    electricGuitarSampler.dispose();
    pianoSynthesizer.dispose();
    voiceEffects.dispose();
    loopRecorder.dispose();

    // Dispose looper modules
    transportController.dispose();
    layerManager.dispose();
    layerRecorder.dispose();
    quantizer.dispose();

    // Dispose new architecture modules
    beatboxDetector.dispose();
    drumEventRecorder.reset();
    metronomeAudio.dispose();

    this.recorderDest = null;
    this.layerCaptureNodes = { drumsCapture: null, bassCapture: null, guitarCapture: null, voiceCapture: null };

    if (this.audioContext) {
      this.audioContext.close();
      this.audioContext = null;
    }

    this.isInitialized = false;
    console.log('[AudioEngine] Disposed');
  }
}

// Singleton instance
export const audioEngine = new AudioEngine();
