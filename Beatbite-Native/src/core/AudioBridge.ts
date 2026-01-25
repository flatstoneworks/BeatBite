/**
 * AudioBridge - JavaScript interface to native audio module.
 *
 * This provides a similar API to the web AudioEngine, but bridges
 * to native Kotlin code for low-latency audio on Android.
 *
 * For development/testing without native module, provides mock implementations.
 */

import { NativeModules, NativeEventEmitter, Platform } from 'react-native';
import type { EffectType, DrumKitType, BassStyle, GuitarStyle, InstrumentMode } from '../types';

// Check if native module is available
const BeatbiteAudio = NativeModules.BeatbiteAudio;
const isNativeAvailable = BeatbiteAudio != null;

// Create event emitter only if native module exists
const audioEmitter = isNativeAvailable ? new NativeEventEmitter(BeatbiteAudio) : null;

// Callbacks for mock mode
type AudioCallbacks = {
  onLevelChanged?: (level: number) => void;
  onBeatDetected?: (data: { drum: string; velocity: number }) => void;
  onPitchDetected?: (data: { frequency: number; confidence: number }) => void;
  onLatencyMeasured?: (latency: number) => void;
  onError?: (error: string) => void;
};

let mockCallbacks: AudioCallbacks = {};

/**
 * Audio Bridge API
 *
 * When native module is available, calls go to Kotlin.
 * When not available (Expo Go), provides mock implementations for UI testing.
 */
export const AudioBridge = {
  /**
   * Check if native audio module is available.
   */
  isNativeAvailable: (): boolean => isNativeAvailable,

  /**
   * Initialize audio engine.
   */
  initialize: async (): Promise<boolean> => {
    if (isNativeAvailable) {
      return BeatbiteAudio.initialize();
    }
    console.log('[AudioBridge] Mock: initialize');
    return true;
  },

  /**
   * Dispose audio engine resources.
   */
  dispose: async (): Promise<void> => {
    if (isNativeAvailable) {
      return BeatbiteAudio.dispose();
    }
    console.log('[AudioBridge] Mock: dispose');
  },

  /**
   * Request microphone permission.
   */
  requestPermission: async (): Promise<boolean> => {
    if (isNativeAvailable) {
      return BeatbiteAudio.requestPermission();
    }
    console.log('[AudioBridge] Mock: requestPermission');
    return true;
  },

  /**
   * Start voice passthrough (mic → effects → speaker).
   */
  startPassthrough: async (): Promise<void> => {
    if (isNativeAvailable) {
      return BeatbiteAudio.startPassthrough();
    }
    console.log('[AudioBridge] Mock: startPassthrough');
    // Simulate level changes in mock mode
    if (mockCallbacks.onLevelChanged) {
      const interval = setInterval(() => {
        mockCallbacks.onLevelChanged?.(Math.random() * 0.5);
      }, 100);
      // Store interval ID for cleanup
      (AudioBridge as any)._mockInterval = interval;
    }
  },

  /**
   * Stop voice passthrough.
   */
  stopPassthrough: async (): Promise<void> => {
    if (isNativeAvailable) {
      return BeatbiteAudio.stopPassthrough();
    }
    console.log('[AudioBridge] Mock: stopPassthrough');
    // Clear mock interval
    if ((AudioBridge as any)._mockInterval) {
      clearInterval((AudioBridge as any)._mockInterval);
    }
  },

  /**
   * Toggle an effect on/off.
   */
  toggleEffect: (effect: EffectType, enabled: boolean): void => {
    if (isNativeAvailable) {
      BeatbiteAudio.toggleEffect(effect, enabled);
      return;
    }
    console.log(`[AudioBridge] Mock: toggleEffect(${effect}, ${enabled})`);
  },

  /**
   * Set effect parameter.
   */
  setEffectParam: (effect: EffectType, param: string, value: number): void => {
    if (isNativeAvailable) {
      BeatbiteAudio.setEffectParam(effect, param, value);
      return;
    }
    console.log(`[AudioBridge] Mock: setEffectParam(${effect}, ${param}, ${value})`);
  },

  /**
   * Set drum kit type.
   */
  setDrumKit: (kit: DrumKitType): void => {
    if (isNativeAvailable) {
      BeatbiteAudio.setDrumKit(kit);
      return;
    }
    console.log(`[AudioBridge] Mock: setDrumKit(${kit})`);
  },

  /**
   * Trigger a drum sound.
   */
  triggerDrum: (drum: string, velocity: number): void => {
    if (isNativeAvailable) {
      BeatbiteAudio.triggerDrum(drum, velocity);
      return;
    }
    console.log(`[AudioBridge] Mock: triggerDrum(${drum}, ${velocity})`);
  },

  /**
   * Set bass style.
   */
  setBassStyle: (style: BassStyle): void => {
    if (isNativeAvailable) {
      BeatbiteAudio.setBassStyle(style);
      return;
    }
    console.log(`[AudioBridge] Mock: setBassStyle(${style})`);
  },

  /**
   * Trigger a bass note.
   */
  triggerBassNote: (frequency: number, velocity: number): void => {
    if (isNativeAvailable) {
      BeatbiteAudio.triggerBassNote(frequency, velocity);
      return;
    }
    console.log(`[AudioBridge] Mock: triggerBassNote(${frequency}, ${velocity})`);
  },

  /**
   * Set guitar style.
   */
  setGuitarStyle: (style: GuitarStyle): void => {
    if (isNativeAvailable) {
      BeatbiteAudio.setGuitarStyle(style);
      return;
    }
    console.log(`[AudioBridge] Mock: setGuitarStyle(${style})`);
  },

  /**
   * Trigger a guitar note.
   */
  triggerGuitarNote: (frequency: number, velocity: number): void => {
    if (isNativeAvailable) {
      BeatbiteAudio.triggerGuitarNote(frequency, velocity);
      return;
    }
    console.log(`[AudioBridge] Mock: triggerGuitarNote(${frequency}, ${velocity})`);
  },

  /**
   * Set instrument mode for detection.
   */
  setInstrumentMode: (mode: InstrumentMode): void => {
    if (isNativeAvailable) {
      BeatbiteAudio.setInstrumentMode(mode);
      return;
    }
    console.log(`[AudioBridge] Mock: setInstrumentMode(${mode})`);
  },

  /**
   * Enable/disable beatbox detection.
   */
  setBeatboxEnabled: (enabled: boolean): void => {
    if (isNativeAvailable) {
      BeatbiteAudio.setBeatboxEnabled(enabled);
      return;
    }
    console.log(`[AudioBridge] Mock: setBeatboxEnabled(${enabled})`);
  },

  /**
   * Enable/disable pitch detection.
   */
  setPitchEnabled: (enabled: boolean): void => {
    if (isNativeAvailable) {
      BeatbiteAudio.setPitchEnabled(enabled);
      return;
    }
    console.log(`[AudioBridge] Mock: setPitchEnabled(${enabled})`);
  },

  /**
   * Set master volume.
   */
  setVolume: (volume: number): void => {
    if (isNativeAvailable) {
      BeatbiteAudio.setVolume(volume);
      return;
    }
    console.log(`[AudioBridge] Mock: setVolume(${volume})`);
  },

  /**
   * Set BPM for demo players.
   */
  setBpm: (bpm: number): void => {
    if (isNativeAvailable) {
      BeatbiteAudio.setBpm(bpm);
      return;
    }
    console.log(`[AudioBridge] Mock: setBpm(${bpm})`);
  },

  /**
   * Start drum demo playback.
   */
  startDrumDemo: (): void => {
    if (isNativeAvailable) {
      BeatbiteAudio.startDrumDemo();
      return;
    }
    console.log('[AudioBridge] Mock: startDrumDemo');
  },

  /**
   * Stop drum demo playback.
   */
  stopDrumDemo: (): void => {
    if (isNativeAvailable) {
      BeatbiteAudio.stopDrumDemo();
      return;
    }
    console.log('[AudioBridge] Mock: stopDrumDemo');
  },

  /**
   * Start bass demo playback.
   */
  startBassDemo: (): void => {
    if (isNativeAvailable) {
      BeatbiteAudio.startBassDemo();
      return;
    }
    console.log('[AudioBridge] Mock: startBassDemo');
  },

  /**
   * Stop bass demo playback.
   */
  stopBassDemo: (): void => {
    if (isNativeAvailable) {
      BeatbiteAudio.stopBassDemo();
      return;
    }
    console.log('[AudioBridge] Mock: stopBassDemo');
  },

  /**
   * Start guitar demo playback.
   */
  startGuitarDemo: (): void => {
    if (isNativeAvailable) {
      BeatbiteAudio.startGuitarDemo();
      return;
    }
    console.log('[AudioBridge] Mock: startGuitarDemo');
  },

  /**
   * Stop guitar demo playback.
   */
  stopGuitarDemo: (): void => {
    if (isNativeAvailable) {
      BeatbiteAudio.stopGuitarDemo();
      return;
    }
    console.log('[AudioBridge] Mock: stopGuitarDemo');
  },

  // ==================== Event Listeners ====================

  /**
   * Set callbacks for mock mode (used when native module not available).
   */
  setCallbacks: (callbacks: AudioCallbacks): void => {
    mockCallbacks = { ...mockCallbacks, ...callbacks };
  },

  /**
   * Subscribe to audio level changes.
   */
  onLevelChanged: (callback: (level: number) => void) => {
    if (audioEmitter) {
      return audioEmitter.addListener('onLevelChanged', callback);
    }
    mockCallbacks.onLevelChanged = callback;
    return { remove: () => { mockCallbacks.onLevelChanged = undefined; } };
  },

  /**
   * Subscribe to beat detection events.
   */
  onBeatDetected: (callback: (data: { drum: string; velocity: number }) => void) => {
    if (audioEmitter) {
      return audioEmitter.addListener('onBeatDetected', callback);
    }
    mockCallbacks.onBeatDetected = callback;
    return { remove: () => { mockCallbacks.onBeatDetected = undefined; } };
  },

  /**
   * Subscribe to pitch detection events.
   */
  onPitchDetected: (callback: (data: { frequency: number; confidence: number }) => void) => {
    if (audioEmitter) {
      return audioEmitter.addListener('onPitchDetected', callback);
    }
    mockCallbacks.onPitchDetected = callback;
    return { remove: () => { mockCallbacks.onPitchDetected = undefined; } };
  },

  /**
   * Subscribe to latency measurement events.
   */
  onLatencyMeasured: (callback: (latency: number) => void) => {
    if (audioEmitter) {
      return audioEmitter.addListener('onLatencyMeasured', callback);
    }
    mockCallbacks.onLatencyMeasured = callback;
    return { remove: () => { mockCallbacks.onLatencyMeasured = undefined; } };
  },

  /**
   * Subscribe to beat callback during demo playback.
   */
  onBeat: (callback: (beat: number) => void) => {
    if (audioEmitter) {
      return audioEmitter.addListener('onBeat', callback);
    }
    return { remove: () => {} };
  },
};

export default AudioBridge;
