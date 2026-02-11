/**
 * Types for Beatbite application.
 *
 * These types are designed to be compatible with both React (web)
 * and React Native for easy migration.
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

// Recorded loop data
export interface RecordedLoop {
  id: string;
  instrument: InstrumentType;
  duration: number; // milliseconds
  filePath: string;
  createdAt: Date;
  volume: number;   // 0.0 to 1.0
  speed: number;    // 0.5 to 2.0
}

// Pitch detection result
export interface PitchState {
  frequency: number;    // Hz (0 if no pitch detected)
  note: string;         // e.g., "A4", "C#3"
  noteName: string;     // e.g., "A", "C#"
  octave: number;       // e.g., 4
  cents: number;        // Deviation from perfect pitch (-50 to +50)
  confidence: number;   // 0.0 to 1.0
}

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

// Bass synthesizer types
export type BassSynthType = 'electronic' | 'sampled';

// Electronic bass synthesis styles (oscillator-based)
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

// Realistic bass synthesis styles (Karplus-Strong physical modeling)
export type RealisticBassStyle = 'finger' | 'pick' | 'slap' | 'muted';

export const REALISTIC_BASS_STYLE_CONFIG: Record<RealisticBassStyle, {
  displayName: string;
  color: string;
  description: string;
}> = {
  finger: { displayName: 'Finger', color: '#f59e0b', description: 'Warm fingerstyle' },
  pick: { displayName: 'Pick', color: '#ef4444', description: 'Bright picked' },
  slap: { displayName: 'Slap', color: '#ec4899', description: 'Funky slap bass' },
  muted: { displayName: 'Muted', color: '#6366f1', description: 'Palm-muted thud' },
};

// Combined bass synth type configuration
export const BASS_SYNTH_TYPE_CONFIG: Record<BassSynthType, {
  displayName: string;
  description: string;
  styles: readonly string[];
}> = {
  electronic: {
    displayName: 'Electronic',
    description: 'Synthesizer bass sounds',
    styles: ['sub', 'synth', 'pluck', 'wobble'] as const,
  },
  sampled: {
    displayName: 'Sampled',
    description: 'Real bass guitar samples',
    styles: ['finger', 'pick', 'slap', 'muted'] as const,
  },
};

// Combined bass options (single source of truth for all UI)
export interface CombinedBassOption {
  synthType: BassSynthType;
  style: string;
  displayName: string;
  description: string;
  color: string;
  tag: string;
  tagColor: string;
}

export const ALL_BASS_OPTIONS: CombinedBassOption[] = [
  // Sampled options (real bass guitar) - shown first as they sound better
  ...(['finger', 'pick', 'slap', 'muted'] as RealisticBassStyle[]).map((style) => ({
    synthType: 'sampled' as BassSynthType,
    style,
    ...REALISTIC_BASS_STYLE_CONFIG[style],
    tag: 'Sampled',
    tagColor: '#22c55e',
  })),
  // Electronic options (synthesized)
  ...(['sub', 'synth', 'pluck', 'wobble'] as BassStyle[]).map((style) => ({
    synthType: 'electronic' as BassSynthType,
    style,
    ...BASS_STYLE_CONFIG[style],
    tag: 'Electronic',
    tagColor: '#3b82f6',
  })),
];

// Bass note state
export interface BassState {
  frequency: number;
  noteName: string;
  synthType: BassSynthType;
  style: BassStyle;                    // For electronic synth
  realisticStyle: RealisticBassStyle;  // For sampled bass
  isPlaying: boolean;
}

// Guitar synthesizer types
export type GuitarSynthType = 'electronic' | 'sampled' | 'electric';

// Electronic guitar synthesis styles (oscillator-based)
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

// Realistic guitar synthesis styles (Karplus-Strong physical modeling)
export type RealisticGuitarStyle = 'clean' | 'acoustic' | 'muted' | 'bright';

export const REALISTIC_GUITAR_STYLE_CONFIG: Record<RealisticGuitarStyle, {
  displayName: string;
  color: string;
  description: string;
}> = {
  clean: { displayName: 'Clean', color: '#22c55e', description: 'Warm clean tone' },
  acoustic: { displayName: 'Acoustic', color: '#f59e0b', description: 'Nylon/steel string' },
  muted: { displayName: 'Muted', color: '#6366f1', description: 'Palm-muted chunk' },
  bright: { displayName: 'Bright', color: '#06b6d4', description: 'Trebly single-coil' },
};

// Electric guitar styles (sampled electric guitar with effects)
export type ElectricGuitarStyle = 'clean' | 'crunch' | 'overdrive' | 'distortion';

export const ELECTRIC_GUITAR_STYLE_CONFIG: Record<ElectricGuitarStyle, {
  displayName: string;
  color: string;
  description: string;
}> = {
  clean: { displayName: 'Clean', color: '#22c55e', description: 'Crystal clear tone' },
  crunch: { displayName: 'Crunch', color: '#f59e0b', description: 'Light blues overdrive' },
  overdrive: { displayName: 'Overdrive', color: '#ef4444', description: 'Classic rock drive' },
  distortion: { displayName: 'Distortion', color: '#8b5cf6', description: 'Heavy metal crunch' },
};

// Combined guitar synth type configuration
export const GUITAR_SYNTH_TYPE_CONFIG: Record<GuitarSynthType, {
  displayName: string;
  description: string;
  styles: readonly string[];
}> = {
  electric: {
    displayName: 'Electric',
    description: 'High-quality electric guitar samples',
    styles: ['clean', 'crunch', 'overdrive', 'distortion'] as const,
  },
  sampled: {
    displayName: 'Acoustic',
    description: 'Real acoustic guitar samples',
    styles: ['clean', 'acoustic', 'muted', 'bright'] as const,
  },
  electronic: {
    displayName: 'Electronic',
    description: 'Synthesizer guitar sounds',
    styles: ['clean', 'distorted', 'acoustic', 'muted'] as const,
  },
};

// Combined guitar options (single source of truth for all UI)
export interface CombinedGuitarOption {
  synthType: GuitarSynthType;
  style: string;
  displayName: string;
  description: string;
  color: string;
  tag: string;
  tagColor: string;
}

export const ALL_GUITAR_OPTIONS: CombinedGuitarOption[] = [
  // Electric guitar options (sampled electric with effects) - shown first as they sound best
  ...(['clean', 'crunch', 'overdrive', 'distortion'] as ElectricGuitarStyle[]).map((style) => ({
    synthType: 'electric' as GuitarSynthType,
    style,
    ...ELECTRIC_GUITAR_STYLE_CONFIG[style],
    tag: 'Electric',
    tagColor: '#ef4444',
  })),
  // Acoustic sampled options (real acoustic guitar)
  ...(['clean', 'acoustic', 'muted', 'bright'] as RealisticGuitarStyle[]).map((style) => ({
    synthType: 'sampled' as GuitarSynthType,
    style,
    ...REALISTIC_GUITAR_STYLE_CONFIG[style],
    tag: 'Acoustic',
    tagColor: '#22c55e',
  })),
  // Electronic options (synthesized)
  ...(['clean', 'distorted', 'acoustic', 'muted'] as GuitarStyle[]).map((style) => ({
    synthType: 'electronic' as GuitarSynthType,
    style,
    ...GUITAR_STYLE_CONFIG[style],
    tag: 'Synth',
    tagColor: '#3b82f6',
  })),
];

// Piano synthesis types
export type PianoSynthType = 'electronic' | 'sampled';

// Electronic piano styles (FM/additive synthesis)
export type PianoStyle = 'grand' | 'upright' | 'electric' | 'rhodes' | 'synth';

export const PIANO_STYLE_CONFIG: Record<PianoStyle, {
  displayName: string;
  color: string;
  description: string;
}> = {
  grand: { displayName: 'Grand', color: '#1f2937', description: 'Synthesized grand' },
  upright: { displayName: 'Upright', color: '#78350f', description: 'Warm synth upright' },
  electric: { displayName: 'Electric', color: '#dc2626', description: 'Wurlitzer style' },
  rhodes: { displayName: 'Rhodes', color: '#059669', description: 'Fender Rhodes' },
  synth: { displayName: 'Synth', color: '#7c3aed', description: 'Synthesizer piano' },
};

// Realistic sampled piano styles
export type RealisticPianoStyle = 'acoustic' | 'bright' | 'warm' | 'honkytonk';

export const REALISTIC_PIANO_STYLE_CONFIG: Record<RealisticPianoStyle, {
  displayName: string;
  color: string;
  description: string;
}> = {
  acoustic: { displayName: 'Acoustic Grand', color: '#8b4513', description: 'Full concert grand' },
  bright: { displayName: 'Bright', color: '#ffd700', description: 'Clear, cutting tone' },
  warm: { displayName: 'Warm', color: '#cd853f', description: 'Mellow, intimate' },
  honkytonk: { displayName: 'Honky Tonk', color: '#daa520', description: 'Classic detuned' },
};

// Combined piano options for UI (single source of truth)
export interface CombinedPianoOption {
  synthType: PianoSynthType;
  style: PianoStyle | RealisticPianoStyle;
  displayName: string;
  description: string;
  color: string;
  tag: string;
  tagColor: string;
}

export const ALL_PIANO_OPTIONS: CombinedPianoOption[] = [
  // Sampled options (realistic) - shown first as they sound better
  ...(['acoustic', 'bright', 'warm', 'honkytonk'] as RealisticPianoStyle[]).map((style) => ({
    synthType: 'sampled' as PianoSynthType,
    style,
    ...REALISTIC_PIANO_STYLE_CONFIG[style],
    tag: 'Sampled',
    tagColor: '#22c55e',
  })),
  // Electronic options (synthesized)
  ...(['electric', 'rhodes', 'synth'] as PianoStyle[]).map((style) => ({
    synthType: 'electronic' as PianoSynthType,
    style,
    ...PIANO_STYLE_CONFIG[style],
    tag: 'Electronic',
    tagColor: '#3b82f6',
  })),
];

// Piano note state
export interface PianoState {
  frequency: number;
  noteName: string;
  synthType: PianoSynthType;
  style: PianoStyle;                         // For electronic synth
  realisticStyle: RealisticPianoStyle;       // For sampled piano
  isPlaying: boolean;
}

// Drum synthesis types
export type DrumSynthType = 'electronic' | 'sampled';

// Electronic drum kit types (synthesized)
export type DrumKitType = 'electronic' | 'acoustic' | 'jazz' | 'vintage' | 'rock';

export const DRUM_KIT_CONFIG: Record<DrumKitType, {
  displayName: string;
  color: string;
  description: string;
}> = {
  electronic: { displayName: 'Electronic', color: '#06b6d4', description: 'Classic 808/909' },
  acoustic: { displayName: 'Acoustic', color: '#f59e0b', description: 'Natural drum kit' },
  jazz: { displayName: 'Jazz', color: '#8b5cf6', description: 'Soft brushed sounds' },
  vintage: { displayName: 'Vintage', color: '#ef4444', description: 'Enhanced drum machine' },
  rock: { displayName: 'Rock', color: '#22c55e', description: 'Punchy aggressive' },
};

// Sampled drum kit types (real samples)
export type SampledDrumKitType = 'acoustic' | 'cr78' | '4opfm' | 'techno' | 'linn';

export const SAMPLED_DRUM_KIT_CONFIG: Record<SampledDrumKitType, {
  displayName: string;
  color: string;
  description: string;
}> = {
  acoustic: { displayName: 'Acoustic', color: '#f59e0b', description: 'Real acoustic kit' },
  cr78: { displayName: 'CR-78', color: '#ec4899', description: 'Classic Roland' },
  '4opfm': { displayName: 'FM Drums', color: '#8b5cf6', description: 'Yamaha FM synth' },
  techno: { displayName: 'Techno', color: '#06b6d4', description: 'Modern electronic' },
  linn: { displayName: 'LinnDrum', color: '#ef4444', description: '80s classic' },
};

// Combined drum options for UI (single source of truth)
export interface CombinedDrumOption {
  synthType: DrumSynthType;
  kit: string;
  displayName: string;
  description: string;
  color: string;
  tag: string;
  tagColor: string;
}

export const ALL_DRUM_OPTIONS: CombinedDrumOption[] = [
  // Sampled options (real drum samples) - shown first as they sound better
  ...(['acoustic', 'cr78', '4opfm', 'techno', 'linn'] as SampledDrumKitType[]).map((kit) => ({
    synthType: 'sampled' as DrumSynthType,
    kit,
    ...SAMPLED_DRUM_KIT_CONFIG[kit],
    tag: 'Sampled',
    tagColor: '#22c55e',
  })),
  // Electronic options (synthesized)
  ...(['electronic', 'acoustic', 'jazz', 'vintage', 'rock'] as DrumKitType[]).map((kit) => ({
    synthType: 'electronic' as DrumSynthType,
    kit,
    ...DRUM_KIT_CONFIG[kit],
    tag: 'Electronic',
    tagColor: '#3b82f6',
  })),
];

// Guitar note state
export interface GuitarState {
  frequency: number;
  noteName: string;
  synthType: GuitarSynthType;
  style: GuitarStyle;                      // For electronic synth
  realisticStyle: RealisticGuitarStyle;    // For acoustic sampled guitar
  electricStyle: ElectricGuitarStyle;      // For electric sampled guitar
  isPlaying: boolean;
}

// Active instrument mode
export type InstrumentMode = 'drums' | 'bass' | 'guitar' | 'piano' | 'off';

// Audio session state
export interface AudioState {
  isPassthroughActive: boolean;
  isRecording: boolean;
  inputLevel: number;
  latencyMs: number;
  inputGain: number;
  outputVolume: number;
  currentInstrument: InstrumentType;
  loops: RecordedLoop[];
  error: string | null;
  pitch: PitchState;
  instrumentMode: InstrumentMode;
  currentDrum: DrumType | null;
  bass: BassState;
}

// Latency quality thresholds (in milliseconds)
export const LATENCY_THRESHOLDS = {
  excellent: 15,   // Imperceptible
  good: 50,        // Acceptable
  acceptable: 100, // Noticeable but usable
  // Above 100ms is problematic
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
  unknown: '#6b7280',  // gray-500
  excellent: '#22c55e', // green-500
  good: '#eab308',     // yellow-500
  acceptable: '#f97316', // orange-500
  poor: '#ef4444',     // red-500
};

// ==================== Looper Workstation Types ====================

/**
 * Beatbox drum types for spectral detection.
 * Different from pitched DrumType - these are percussive sounds.
 */
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

/**
 * Drum hit event - MIDI-like representation of a drum hit.
 * Stores timing and velocity instead of audio waveform.
 */
export interface DrumHitEvent {
  drumType: BeatboxDrumType;
  timeInLoop: number;      // milliseconds from loop start
  velocity: number;        // 0.0 - 1.0 (from audio amplitude at detection)
}

/**
 * Beatbox detection result from spectral analysis.
 */
export interface BeatboxDetectionResult {
  drumType: BeatboxDrumType | null;
  velocity: number;
  confidence: number;
}

/**
 * Tempo selection state.
 */
export interface TempoState {
  bpm: number;
  isConfirmed: boolean;
  metronomeEnabled: boolean;
}

/**
 * Layer types for the looper workstation.
 * Each layer can contain one type of audio.
 */
export type LayerType = 'drums' | 'bass' | 'guitar' | 'piano' | 'voice';

/**
 * Layer kind distinguishes between event-based and audio-based layers.
 */
export type LayerKind = 'drum_events' | 'bass_events' | 'guitar_events' | 'piano_events' | 'audio';

export const LAYER_CONFIG: Record<LayerType, {
  displayName: string;
  icon: string;
  color: string;
}> = {
  drums: { displayName: 'Drums', icon: '🥁', color: '#ef4444' },
  bass: { displayName: 'Bass', icon: '🎸', color: '#3b82f6' },
  guitar: { displayName: 'Guitar', icon: '🎸', color: '#22c55e' },
  piano: { displayName: 'Piano', icon: '🎹', color: '#f59e0b' },
  voice: { displayName: 'Voice', icon: '🎤', color: '#a855f7' },
};

/**
 * Recording state for the layer recorder.
 */
export type RecordingState = 'idle' | 'waiting' | 'recording' | 'processing';

/**
 * Transport state for timing and loop management.
 */
export interface TransportState {
  bpm: number;
  loopLengthMs: number;
  loopLengthSamples: number;
  bars: number;
  beatsPerBar: number;
  currentPosition: number;    // 0-1 normalized position in loop
  currentBeat: number;        // 0 to (bars * beatsPerBar - 1)
  currentBar: number;         // 0 to (bars - 1)
  isPlaying: boolean;
}

/**
 * Layer information for UI display (backward compatible).
 */
export interface LayerInfo {
  id: string;
  type: LayerType;
  kind?: LayerKind;  // Optional for backward compatibility
  name: string;
  volume: number;
  muted: boolean;
  duration: number;
  events?: DrumHitEvent[];  // Only for drum_events kind
  bassEvents?: BassNoteEvent[];  // Only for bass_events kind
  guitarEvents?: GuitarNoteEvent[];  // Only for guitar_events kind
  pianoEvents?: PianoNoteEvent[];  // Only for piano_events kind
}

/**
 * Full layer data including audio buffer (backward compatible).
 */
export interface Layer extends LayerInfo {
  audioBuffer?: AudioBuffer;  // Optional - only for audio layers
  sourceNode?: AudioBufferSourceNode | null;
  gainNode: GainNode | null;
  isPlaying: boolean;
}

/**
 * Type guard for drum event layers.
 */
export function isDrumEventLayer(layer: Layer | LayerInfo): layer is (Layer | LayerInfo) & { kind: 'drum_events' } {
  return layer.kind === 'drum_events';
}

/**
 * Type guard for bass event layers.
 */
export function isBassEventLayer(layer: Layer | LayerInfo): layer is (Layer | LayerInfo) & { kind: 'bass_events' } {
  return layer.kind === 'bass_events';
}

/**
 * Type guard for guitar event layers.
 */
export function isGuitarEventLayer(layer: Layer | LayerInfo): layer is (Layer | LayerInfo) & { kind: 'guitar_events' } {
  return layer.kind === 'guitar_events';
}

/**
 * Type guard for piano event layers.
 */
export function isPianoEventLayer(layer: Layer | LayerInfo): layer is (Layer | LayerInfo) & { kind: 'piano_events' } {
  return layer.kind === 'piano_events';
}

/**
 * Type guard for any melodic event layer (bass, guitar, piano).
 */
export function isMelodicEventLayer(layer: Layer | LayerInfo): layer is (Layer | LayerInfo) & { kind: 'bass_events' | 'guitar_events' | 'piano_events' } {
  return layer.kind === 'bass_events' || layer.kind === 'guitar_events' || layer.kind === 'piano_events';
}

/**
 * Type guard for audio layers.
 */
export function isAudioLayer(layer: Layer | LayerInfo): layer is (Layer | LayerInfo) & { kind: 'audio' | undefined } {
  return layer.kind === 'audio' || layer.kind === undefined;
}

/**
 * Looper state for the store.
 */
export interface LooperState {
  // Transport
  bpm: number;
  isPlaying: boolean;
  loopPosition: number;
  loopLengthMs: number;
  currentBeat: number;
  currentBar: number;
  bars: number;

  // Layers
  layers: LayerInfo[];

  // Recording
  recordingState: RecordingState;
  activeRecordingLayer: LayerType | null;
  hasBaseLoop: boolean;
}

/**
 * BPM detection result.
 */
export interface BpmResult {
  bpm: number;
  confidence: number;
  bars: number;
  beatsDetected: number[];
}

/**
 * Quantization configuration.
 */
export interface QuantizerConfig {
  subdivision: number;  // 16 = 16th notes, 8 = 8th notes, etc.
  enabled: boolean;
}

/**
 * Timed event for recording and quantization.
 */
export interface TimedEvent {
  timestamp: number;      // Time in samples from loop start
  type: 'drum' | 'bass' | 'voice';
  data: DrumEvent | BassEvent;
}

export interface DrumEvent {
  drumType: DrumType;
  velocity: number;
}

export interface BassEvent {
  frequency: number;
  style: BassStyle;
  duration: number;
}

export interface GuitarEvent {
  frequency: number;
  style: GuitarStyle;
  duration: number;
}

// ==================== New Recording System Types ====================

/**
 * Pitch contour point — captures voice pitch at a moment during sustain.
 * Used to reproduce pitch slides and vibrato during playback.
 */
export interface PitchContourPoint {
  timeOffset: number;   // ms from note onset
  frequency: number;    // Hz
}

/**
 * Melodic note event - represents a single note played.
 * Used for bass, guitar, and piano event-based recording.
 * This enables one-to-one mapping: one vocal sound = one instrument hit.
 */
export interface MelodicNoteEvent {
  frequency: number;      // Hz - detected pitch at onset
  noteName: string;       // e.g., "E2", "G3"
  timeInLoop: number;     // ms from loop start
  duration: number;       // ms - how long the note was held
  velocity: number;       // 0-1 based on voice volume at onset
  pitchContour?: PitchContourPoint[];  // continuous pitch during sustain
}

/**
 * Bass note event with style information.
 */
export interface BassNoteEvent extends MelodicNoteEvent {
  synthType: BassSynthType;
  style: BassStyle;                    // Used when synthType is 'electronic'
  realisticStyle: RealisticBassStyle;  // Used when synthType is 'sampled'
}

/**
 * Guitar note event with style information.
 */
export interface GuitarNoteEvent extends MelodicNoteEvent {
  synthType: GuitarSynthType;
  style: GuitarStyle;                      // Used when synthType is 'electronic'
  realisticStyle: RealisticGuitarStyle;    // Used when synthType is 'sampled' (acoustic)
  electricStyle: ElectricGuitarStyle;      // Used when synthType is 'electric'
}

/**
 * Piano note event with style information.
 */
export interface PianoNoteEvent extends MelodicNoteEvent {
  style: PianoStyle;
}

/**
 * Extended layer kind to support melodic event layers.
 */
export type ExtendedLayerKind =
  | 'drum_events'
  | 'bass_events'
  | 'guitar_events'
  | 'piano_events'
  | 'audio';

/**
 * Recording session metadata - stored with raw data.
 * Contains all event data for playback and editing.
 */
export interface RecordingSessionData {
  id: string;
  name: string;
  createdAt: number;
  updatedAt: number;

  // Tempo and timing
  bpm: number;
  bars: number;              // Always multiple of 4
  beatsPerBar: number;       // Usually 4
  loopLengthMs: number;

  // Band configuration (if used)
  bandId: string | null;
  bandName: string | null;

  // Event layers (JSON serializable)
  drumEvents: DrumHitEvent[];
  bassEvents: BassNoteEvent[];
  guitarEvents: GuitarNoteEvent[];
  pianoEvents: PianoNoteEvent[];

  // Voice audio stored separately (blob reference)
  hasVoiceRecording: boolean;

  // Instrument styles used
  drumKit: string;
  bassStyle: BassStyle;
  guitarStyle: GuitarStyle;
  pianoStyle: PianoStyle;
}

/**
 * Saved recording summary for library display.
 */
export interface SavedRecordingSummary {
  id: string;
  name: string;
  createdAt: number;
  durationMs: number;
  bpm: number;
  bars: number;
  bandName: string | null;

  // Layer counts for display
  drumEventCount: number;
  bassEventCount: number;
  guitarEventCount: number;
  pianoEventCount: number;
  hasVoice: boolean;
  hasMixExport: boolean;
}

/**
 * Voice onset detection result.
 */
export interface VoiceOnsetResult {
  type: 'onset' | 'offset';
  frequency: number;      // Hz at onset
  noteName: string;       // e.g., "C4"
  velocity: number;       // 0-1 based on amplitude
  timestamp: number;      // performance.now() value
  duration?: number;      // ms - only present on offset
}

/**
 * Quantized loop result from LoopQuantizer.
 */
export interface QuantizedLoopResult {
  originalDurationMs: number;
  quantizedDurationMs: number;
  bars: number;           // Always multiple of 4
  bpm: number;
}
