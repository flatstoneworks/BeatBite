/**
 * Types for Beatbite application.
 *
 * These types are shared between React (web) and React Native.
 * Web Audio API types are excluded - use native implementations instead.
 */

// Instrument types available for recording
export type InstrumentType =
  | 'drums'
  | 'bass'
  | 'keyboard'
  | 'violin'
  | 'synth'
  | 'vocals';

export const INSTRUMENT_CONFIG: Record<InstrumentType, {
  displayName: string;
  icon: string;
  color: string;
}> = {
  drums: { displayName: 'Drums', icon: '🥁', color: '#ef4444' },
  bass: { displayName: 'Bass', icon: '🎸', color: '#f97316' },
  keyboard: { displayName: 'Keyboard', icon: '🎹', color: '#eab308' },
  violin: { displayName: 'Violin', icon: '🎻', color: '#22c55e' },
  synth: { displayName: 'Synth', icon: '🎛️', color: '#3b82f6' },
  vocals: { displayName: 'Vocals', icon: '🎤', color: '#a855f7' },
};

// Drum types for synthesis
export type DrumType = 'kick' | 'snare' | 'tom' | 'hihat' | 'hihat_open';

export const DRUM_CONFIG: Record<DrumType, {
  displayName: string;
  color: string;
  pitchRange: string;
}> = {
  kick: { displayName: 'Kick', color: '#ef4444', pitchRange: '80-200 Hz' },
  snare: { displayName: 'Snare', color: '#f97316', pitchRange: '200-350 Hz' },
  tom: { displayName: 'Tom', color: '#eab308', pitchRange: '350-500 Hz' },
  hihat: { displayName: 'Hi-Hat', color: '#22c55e', pitchRange: '500+ Hz' },
  hihat_open: { displayName: 'Open Hat', color: '#10b981', pitchRange: '500+ Hz' },
};

// Bass synthesis styles
export type BassStyle = 'sub' | 'synth' | 'pluck' | 'wobble';

export const BASS_STYLE_CONFIG: Record<BassStyle, {
  displayName: string;
  color: string;
  description: string;
}> = {
  sub: { displayName: 'Sub', color: '#8b5cf6', description: 'Deep sine wave' },
  synth: { displayName: 'Synth', color: '#3b82f6', description: 'Classic analog' },
  pluck: { displayName: 'Pluck', color: '#06b6d4', description: 'Punchy attack' },
  wobble: { displayName: 'Wobble', color: '#ec4899', description: 'Dubstep style' },
};

// Guitar synthesis styles
export type GuitarStyle = 'clean' | 'distorted' | 'acoustic' | 'muted';

export const GUITAR_STYLE_CONFIG: Record<GuitarStyle, {
  displayName: string;
  color: string;
  description: string;
}> = {
  clean: { displayName: 'Clean', color: '#22c55e', description: 'Crystal clear tone' },
  distorted: { displayName: 'Distorted', color: '#ef4444', description: 'Heavy overdrive' },
  acoustic: { displayName: 'Acoustic', color: '#f59e0b', description: 'Natural string' },
  muted: { displayName: 'Muted', color: '#6366f1', description: 'Palm-muted punch' },
};

// Active instrument mode
export type InstrumentMode = 'drums' | 'bass' | 'guitar' | 'off';

// Voice effects
export type EffectType = 'reverb' | 'delay' | 'chorus' | 'distortion';

// Drum kit types
export type DrumKitType = 'electronic' | 'acoustic' | 'lofi' | 'trap';

export const DRUM_KIT_CONFIG: Record<DrumKitType, {
  displayName: string;
  description: string;
  color: string;
}> = {
  electronic: {
    displayName: 'Electronic',
    description: '808-style punchy beats',
    color: '#00ffff',
  },
  acoustic: {
    displayName: 'Acoustic',
    description: 'Natural drum sounds',
    color: '#f59e0b',
  },
  lofi: {
    displayName: 'Lo-Fi',
    description: 'Vintage filtered vibes',
    color: '#a855f7',
  },
  trap: {
    displayName: 'Trap',
    description: 'Modern hard-hitting',
    color: '#ef4444',
  },
};

// Latency quality thresholds (in milliseconds)
export const LATENCY_THRESHOLDS = {
  excellent: 15,   // Imperceptible
  good: 50,        // Acceptable
  acceptable: 100, // Noticeable but usable
} as const;

export type LatencyQuality = 'excellent' | 'good' | 'acceptable' | 'poor' | 'unknown';

export function getLatencyQuality(latencyMs: number): LatencyQuality {
  if (latencyMs <= 0) return 'unknown';
  if (latencyMs < LATENCY_THRESHOLDS.excellent) return 'excellent';
  if (latencyMs < LATENCY_THRESHOLDS.good) return 'good';
  if (latencyMs < LATENCY_THRESHOLDS.acceptable) return 'acceptable';
  return 'poor';
}

export const LATENCY_COLORS: Record<LatencyQuality, string> = {
  unknown: '#6b7280',
  excellent: '#22c55e',
  good: '#eab308',
  acceptable: '#f97316',
  poor: '#ef4444',
};

// Beatbox drum types for spectral detection
export type BeatboxDrumType = 'kick' | 'snare' | 'hihat_closed' | 'hihat_open';

export const BEATBOX_DRUM_CONFIG: Record<BeatboxDrumType, {
  displayName: string;
  color: string;
  description: string;
}> = {
  kick: { displayName: 'Kick', color: '#ef4444', description: 'Low "boom" sound' },
  snare: { displayName: 'Snare', color: '#f97316', description: '"Psh" or "kah" sound' },
  hihat_closed: { displayName: 'Hi-Hat', color: '#22c55e', description: 'Short "ts" sound' },
  hihat_open: { displayName: 'Open Hat', color: '#10b981', description: 'Sustained "tss" sound' },
};

// Layer types
export type LayerType = 'drums' | 'bass' | 'guitar' | 'voice';

export const LAYER_CONFIG: Record<LayerType, {
  displayName: string;
  icon: string;
  color: string;
}> = {
  drums: { displayName: 'Drums', icon: '🥁', color: '#ef4444' },
  bass: { displayName: 'Bass', icon: '🎸', color: '#3b82f6' },
  guitar: { displayName: 'Guitar', icon: '🎸', color: '#22c55e' },
  voice: { displayName: 'Voice', icon: '🎤', color: '#a855f7' },
};

// Recording state
export type RecordingState = 'idle' | 'waiting' | 'recording' | 'processing';

// Guided flow steps
export type GuidedFlowStep =
  | 'welcome'
  | 'tempo'
  | 'setup-drums'
  | 'setup-bass'
  | 'setup-guitar'
  | 'setup-voice'
  | 'drums'
  | 'bass'
  | 'guitar'
  | 'voice'
  | 'mix';
