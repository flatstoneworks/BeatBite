/**
 * GuitarSynthesizer generates guitar sounds using Web Audio API synthesis.
 *
 * Converts detected voice pitch to guitar notes.
 * Uses various synthesis techniques for different guitar styles.
 *
 * Guitar styles:
 * - Clean: Crystal clear tone with filtered oscillators
 * - Distorted: Heavy overdrive with waveshaper
 * - Acoustic: Natural string pluck using Karplus-Strong-inspired synthesis
 * - Muted: Palm-muted punch with short envelope
 */

import { frequencyToNoteName, createDistortionCurve } from './utils/audioUtils';

export type GuitarStyle = 'clean' | 'distorted' | 'acoustic' | 'muted';

export interface GuitarConfig {
  style: GuitarStyle;
  volume: number;      // 0.0 to 1.0
  octaveShift: number; // -2 to +2 octaves from detected pitch
  glide: number;       // Portamento time in seconds (0 = instant)
}

// Default guitar configurations
const GUITAR_DEFAULTS: Record<GuitarStyle, Omit<GuitarConfig, 'style'>> = {
  clean: { volume: 0.7, octaveShift: 0, glide: 0.02 },
  distorted: { volume: 0.6, octaveShift: 0, glide: 0.01 },
  acoustic: { volume: 0.8, octaveShift: 0, glide: 0 },
  muted: { volume: 0.7, octaveShift: 0, glide: 0 },
};

// Guitar frequency range (roughly E2 to E5)
const GUITAR_RANGE = {
  min: 82,   // E2
  max: 659,  // E5
};

export class GuitarSynthesizer {
  private audioContext: AudioContext | null = null;
  private masterGain: GainNode | null = null;
  private volume = 0.7;

  // Current note state
  private currentFrequency = 0;
  private targetFrequency = 0;
  private isPlaying = false;

  // Oscillators and nodes for sustained playback
  private oscillator1: OscillatorNode | null = null;
  private oscillator2: OscillatorNode | null = null;
  private noiseBuffer: AudioBufferSourceNode | null = null;
  private filter: BiquadFilterNode | null = null;
  private filter2: BiquadFilterNode | null = null;
  private ampEnvelope: GainNode | null = null;
  private distortion: WaveShaperNode | null = null;
  private delayNode: DelayNode | null = null;
  private feedbackGain: GainNode | null = null;

  // Configuration
  private style: GuitarStyle = 'clean';
  private octaveShift = 0;
  private glideTime = 0.02;

  // Callbacks
  private onNoteChanged?: (frequency: number, noteName: string) => void;

  /**
   * Initialize the guitar synthesizer with an audio context.
   */
  initialize(audioContext: AudioContext): void {
    this.audioContext = audioContext;

    // Create master gain for overall volume control
    this.masterGain = audioContext.createGain();
    this.masterGain.gain.value = this.volume;
    this.masterGain.connect(audioContext.destination);

    console.log('[GuitarSynth] Initialized');
  }

  /**
   * Set callback for note change events.
   */
  setOnNoteChanged(callback: (frequency: number, noteName: string) => void): void {
    this.onNoteChanged = callback;
  }

  /**
   * Set the guitar style.
   */
  setStyle(style: GuitarStyle): void {
    this.style = style;
    const defaults = GUITAR_DEFAULTS[style];
    this.octaveShift = defaults.octaveShift;
    this.glideTime = defaults.glide;

    // If currently playing, rebuild the sound
    if (this.isPlaying && this.currentFrequency > 0) {
      this.stopNote();
      this.playNote(this.targetFrequency);
    }
  }

  /**
   * Get current style.
   */
  getStyle(): GuitarStyle {
    return this.style;
  }

  /**
   * Convert voice pitch to guitar frequency.
   */
  private voiceToGuitarFrequency(voiceFrequency: number): number {
    let guitarFreq = voiceFrequency;

    // Apply octave shift
    guitarFreq *= Math.pow(2, this.octaveShift);

    // Ensure we're in guitar range by shifting octaves if needed
    while (guitarFreq > GUITAR_RANGE.max) {
      guitarFreq /= 2;
    }
    while (guitarFreq < GUITAR_RANGE.min) {
      guitarFreq *= 2;
    }

    return guitarFreq;
  }

  /**
   * Update guitar from detected pitch.
   * Called continuously from audio engine.
   */
  updateFromPitch(frequency: number, confidence: number): void {
    if (!this.audioContext || !this.masterGain) return;

    // Stop immediately when voice stops
    if (confidence < 0.5 || frequency <= 0) {
      if (this.isPlaying) {
        this.stopNote();
        this.onNoteChanged?.(0, '--');
      }
      return;
    }

    const guitarFreq = this.voiceToGuitarFrequency(frequency);
    this.targetFrequency = guitarFreq;

    if (!this.isPlaying) {
      this.playNote(guitarFreq);
    } else {
      this.glideToFrequency(guitarFreq);
    }

    const noteName = frequencyToNoteName(guitarFreq);
    this.onNoteChanged?.(guitarFreq, noteName);
  }

  /**
   * Start playing a guitar note.
   */
  private playNote(frequency: number): void {
    if (!this.audioContext || !this.masterGain) return;

    this.cleanupNodes();

    const ctx = this.audioContext;
    const now = ctx.currentTime;

    this.currentFrequency = frequency;

    // Create amplitude envelope
    this.ampEnvelope = ctx.createGain();
    this.ampEnvelope.gain.setValueAtTime(0, now);

    switch (this.style) {
      case 'clean':
        this.createCleanGuitar(frequency, now);
        break;
      case 'distorted':
        this.createDistortedGuitar(frequency, now);
        break;
      case 'acoustic':
        this.createAcousticGuitar(frequency, now);
        break;
      case 'muted':
        this.createMutedGuitar(frequency, now);
        break;
    }

    this.ampEnvelope.connect(this.masterGain);
    this.isPlaying = true;
  }

  /**
   * Clean guitar: Triangle and sine oscillators with bandpass filter.
   */
  private createCleanGuitar(frequency: number, now: number): void {
    const ctx = this.audioContext!;

    // Main triangle oscillator for warmth
    this.oscillator1 = ctx.createOscillator();
    this.oscillator1.type = 'triangle';
    this.oscillator1.frequency.setValueAtTime(frequency, now);

    // Secondary sine for body
    this.oscillator2 = ctx.createOscillator();
    this.oscillator2.type = 'sine';
    this.oscillator2.frequency.setValueAtTime(frequency * 2, now); // Octave up for brightness

    // Bandpass filter for guitar-like tone
    this.filter = ctx.createBiquadFilter();
    this.filter.type = 'bandpass';
    this.filter.frequency.setValueAtTime(frequency * 3, now);
    this.filter.Q.setValueAtTime(1.5, now);

    // Highpass to remove mud
    this.filter2 = ctx.createBiquadFilter();
    this.filter2.type = 'highpass';
    this.filter2.frequency.setValueAtTime(80, now);

    // Mix
    const osc1Gain = ctx.createGain();
    osc1Gain.gain.value = 0.6;
    const osc2Gain = ctx.createGain();
    osc2Gain.gain.value = 0.3;

    this.oscillator1.connect(osc1Gain);
    this.oscillator2.connect(osc2Gain);
    osc1Gain.connect(this.filter);
    osc2Gain.connect(this.filter);
    this.filter.connect(this.filter2);
    this.filter2.connect(this.ampEnvelope!);

    // Attack/sustain envelope
    this.ampEnvelope!.gain.linearRampToValueAtTime(GUITAR_DEFAULTS.clean.volume, now + 0.01);

    this.oscillator1.start(now);
    this.oscillator2.start(now);
  }

  /**
   * Distorted guitar: Sawtooth through waveshaper distortion.
   */
  private createDistortedGuitar(frequency: number, now: number): void {
    const ctx = this.audioContext!;

    // Sawtooth for harmonically rich input
    this.oscillator1 = ctx.createOscillator();
    this.oscillator1.type = 'sawtooth';
    this.oscillator1.frequency.setValueAtTime(frequency, now);

    // Square slightly detuned for thickness
    this.oscillator2 = ctx.createOscillator();
    this.oscillator2.type = 'square';
    this.oscillator2.frequency.setValueAtTime(frequency * 0.998, now);

    // Pre-distortion filter
    this.filter = ctx.createBiquadFilter();
    this.filter.type = 'lowpass';
    this.filter.frequency.setValueAtTime(2000, now);
    this.filter.Q.setValueAtTime(1, now);

    // Waveshaper for distortion
    this.distortion = ctx.createWaveShaper();
    this.distortion.curve = createDistortionCurve(50);
    this.distortion.oversample = '4x';

    // Post-distortion filter (cabinet simulation)
    this.filter2 = ctx.createBiquadFilter();
    this.filter2.type = 'lowpass';
    this.filter2.frequency.setValueAtTime(4000, now);
    this.filter2.Q.setValueAtTime(0.5, now);

    // Mix
    const osc1Gain = ctx.createGain();
    osc1Gain.gain.value = 0.5;
    const osc2Gain = ctx.createGain();
    osc2Gain.gain.value = 0.3;

    this.oscillator1.connect(osc1Gain);
    this.oscillator2.connect(osc2Gain);
    osc1Gain.connect(this.filter);
    osc2Gain.connect(this.filter);
    this.filter.connect(this.distortion);
    this.distortion.connect(this.filter2);
    this.filter2.connect(this.ampEnvelope!);

    this.ampEnvelope!.gain.linearRampToValueAtTime(GUITAR_DEFAULTS.distorted.volume, now + 0.005);

    this.oscillator1.start(now);
    this.oscillator2.start(now);
  }

  /**
   * Acoustic guitar: Karplus-Strong-inspired pluck synthesis.
   */
  private createAcousticGuitar(frequency: number, now: number): void {
    const ctx = this.audioContext!;

    // Create noise burst for initial pluck
    const bufferSize = ctx.sampleRate * 0.05; // 50ms of noise
    const noiseBuffer = ctx.createBuffer(1, bufferSize, ctx.sampleRate);
    const data = noiseBuffer.getChannelData(0);

    // Fill with filtered noise
    for (let i = 0; i < bufferSize; i++) {
      data[i] = (Math.random() * 2 - 1) * (1 - i / bufferSize);
    }

    this.noiseBuffer = ctx.createBufferSource();
    this.noiseBuffer.buffer = noiseBuffer;

    // Also use oscillator for sustained tone
    this.oscillator1 = ctx.createOscillator();
    this.oscillator1.type = 'triangle';
    this.oscillator1.frequency.setValueAtTime(frequency, now);

    // Comb filter effect using delay (simulates string resonance)
    const delayTime = 1 / frequency;
    this.delayNode = ctx.createDelay(1);
    this.delayNode.delayTime.setValueAtTime(delayTime, now);

    this.feedbackGain = ctx.createGain();
    this.feedbackGain.gain.setValueAtTime(0.7, now);

    // Lowpass for string damping
    this.filter = ctx.createBiquadFilter();
    this.filter.type = 'lowpass';
    this.filter.frequency.setValueAtTime(frequency * 6, now);
    this.filter.frequency.exponentialRampToValueAtTime(frequency * 2, now + 0.5);
    this.filter.Q.setValueAtTime(0.5, now);

    // Body resonance
    this.filter2 = ctx.createBiquadFilter();
    this.filter2.type = 'peaking';
    this.filter2.frequency.setValueAtTime(400, now);
    this.filter2.Q.setValueAtTime(2, now);
    this.filter2.gain.setValueAtTime(6, now);

    // Mix noise and oscillator
    const noiseGain = ctx.createGain();
    noiseGain.gain.setValueAtTime(0.8, now);
    noiseGain.gain.exponentialRampToValueAtTime(0.01, now + 0.1);

    const oscGain = ctx.createGain();
    oscGain.gain.setValueAtTime(0, now);
    oscGain.gain.linearRampToValueAtTime(0.5, now + 0.02);

    this.noiseBuffer.connect(noiseGain);
    this.oscillator1.connect(oscGain);

    noiseGain.connect(this.filter);
    oscGain.connect(this.filter);
    this.filter.connect(this.delayNode);
    this.delayNode.connect(this.feedbackGain);
    this.feedbackGain.connect(this.delayNode);
    this.filter.connect(this.filter2);
    this.filter2.connect(this.ampEnvelope!);

    // Pluck envelope
    this.ampEnvelope!.gain.linearRampToValueAtTime(GUITAR_DEFAULTS.acoustic.volume, now + 0.002);
    this.ampEnvelope!.gain.exponentialRampToValueAtTime(GUITAR_DEFAULTS.acoustic.volume * 0.3, now + 0.3);

    this.noiseBuffer.start(now);
    this.oscillator1.start(now);
  }

  /**
   * Muted guitar: Palm-muted sound with very short envelope.
   */
  private createMutedGuitar(frequency: number, now: number): void {
    const ctx = this.audioContext!;

    // Square wave for punch
    this.oscillator1 = ctx.createOscillator();
    this.oscillator1.type = 'square';
    this.oscillator1.frequency.setValueAtTime(frequency, now);

    // Triangle for body
    this.oscillator2 = ctx.createOscillator();
    this.oscillator2.type = 'triangle';
    this.oscillator2.frequency.setValueAtTime(frequency, now);

    // Heavy lowpass for muted character
    this.filter = ctx.createBiquadFilter();
    this.filter.type = 'lowpass';
    this.filter.frequency.setValueAtTime(frequency * 2, now);
    this.filter.Q.setValueAtTime(3, now);

    // Mix
    const osc1Gain = ctx.createGain();
    osc1Gain.gain.value = 0.4;
    const osc2Gain = ctx.createGain();
    osc2Gain.gain.value = 0.5;

    this.oscillator1.connect(osc1Gain);
    this.oscillator2.connect(osc2Gain);
    osc1Gain.connect(this.filter);
    osc2Gain.connect(this.filter);
    this.filter.connect(this.ampEnvelope!);

    // Very short, punchy envelope (palm mute)
    this.ampEnvelope!.gain.linearRampToValueAtTime(GUITAR_DEFAULTS.muted.volume, now + 0.002);
    this.ampEnvelope!.gain.exponentialRampToValueAtTime(0.01, now + 0.08);

    this.oscillator1.start(now);
    this.oscillator2.start(now);
  }

  /**
   * Glide to a new frequency (portamento).
   */
  private glideToFrequency(frequency: number): void {
    if (!this.audioContext) return;

    const now = this.audioContext.currentTime;
    const glideEnd = now + this.glideTime;

    if (this.oscillator1) {
      this.oscillator1.frequency.linearRampToValueAtTime(frequency, glideEnd);
    }
    if (this.oscillator2) {
      const freq2 = this.style === 'clean' ? frequency * 2 :
                    this.style === 'distorted' ? frequency * 0.998 : frequency;
      this.oscillator2.frequency.linearRampToValueAtTime(freq2, glideEnd);
    }
    if (this.delayNode && this.style === 'acoustic') {
      const delayTime = 1 / frequency;
      this.delayNode.delayTime.linearRampToValueAtTime(delayTime, glideEnd);
    }

    // Update filter frequencies
    if (this.filter) {
      const filterFreq = this.style === 'clean' ? frequency * 3 :
                         this.style === 'muted' ? frequency * 2 : frequency * 4;
      this.filter.frequency.linearRampToValueAtTime(filterFreq, glideEnd);
    }

    this.currentFrequency = frequency;
  }

  /**
   * Stop the current note immediately.
   */
  private stopNote(): void {
    if (!this.audioContext || !this.ampEnvelope) {
      this.cleanupNodes();
      this.isPlaying = false;
      this.currentFrequency = 0;
      return;
    }

    const now = this.audioContext.currentTime;
    this.ampEnvelope.gain.cancelScheduledValues(now);
    this.ampEnvelope.gain.setValueAtTime(this.ampEnvelope.gain.value, now);
    this.ampEnvelope.gain.linearRampToValueAtTime(0, now + 0.005);

    this.isPlaying = false;
    this.currentFrequency = 0;

    const envelopeToClean = this.ampEnvelope;

    setTimeout(() => {
      if (this.ampEnvelope === envelopeToClean) {
        this.cleanupNodes();
      }
    }, 10);
  }

  /**
   * Clean up audio nodes.
   */
  private cleanupNodes(): void {
    try {
      this.oscillator1?.stop();
      this.oscillator2?.stop();
      this.noiseBuffer?.stop();
    } catch {
      // Ignore errors from already stopped oscillators
    }

    this.oscillator1?.disconnect();
    this.oscillator2?.disconnect();
    this.noiseBuffer?.disconnect();
    this.filter?.disconnect();
    this.filter2?.disconnect();
    this.ampEnvelope?.disconnect();
    this.distortion?.disconnect();
    this.delayNode?.disconnect();
    this.feedbackGain?.disconnect();

    this.oscillator1 = null;
    this.oscillator2 = null;
    this.noiseBuffer = null;
    this.filter = null;
    this.filter2 = null;
    this.ampEnvelope = null;
    this.distortion = null;
    this.delayNode = null;
    this.feedbackGain = null;
  }

  /**
   * Set master volume.
   */
  setVolume(volume: number): void {
    this.volume = Math.max(0, Math.min(1, volume));
    if (this.masterGain) {
      this.masterGain.gain.value = this.volume;
    }
  }

  /**
   * Set octave shift (-2 to +2).
   */
  setOctaveShift(shift: number): void {
    this.octaveShift = Math.max(-2, Math.min(2, shift));
  }

  /**
   * Set glide time in seconds.
   */
  setGlideTime(seconds: number): void {
    this.glideTime = Math.max(0, Math.min(0.5, seconds));
  }

  /**
   * Connect master output to an additional destination.
   */
  connectToRecorder(destination: AudioNode): void {
    if (this.masterGain) {
      this.masterGain.connect(destination);
    }
  }

  /**
   * Get current playing state.
   */
  getIsPlaying(): boolean {
    return this.isPlaying;
  }

  /**
   * Get current frequency.
   */
  getCurrentFrequency(): number {
    return this.currentFrequency;
  }

  /**
   * Update pitch of a currently playing note (continuous voice control).
   * Transposes the voice frequency to guitar range and glides to it.
   */
  updatePitch(frequency: number): void {
    if (!this.isPlaying || !this.audioContext) return;
    const guitarFreq = this.voiceToGuitarFrequency(frequency);
    this.targetFrequency = guitarFreq;
    this.glideToFrequency(guitarFreq);
  }

  // ==================== Single-Shot Mode (New Recording System) ====================

  /**
   * Trigger a single guitar note (one-shot mode).
   * Unlike updateFromPitch(), this plays the note once and lets it decay naturally.
   * Used for the new recording system where ONE vocal sound = ONE guitar hit.
   *
   * @param frequency - The frequency to play (will be transposed to guitar range)
   * @param velocity - Hit velocity 0-1 (affects volume)
   * @param duration - Optional duration in ms (if not provided, note decays naturally)
   */
  triggerNote(frequency: number, velocity: number = 0.8, duration?: number): void {
    if (!this.audioContext || !this.masterGain) return;

    // Stop any currently playing note
    if (this.isPlaying) {
      this.stopNote();
    }

    // Transpose to guitar range
    const guitarFreq = this.voiceToGuitarFrequency(frequency);

    // Scale volume by velocity
    const prevVolume = this.volume;
    this.volume = prevVolume * velocity;

    // Play the note
    this.playNote(guitarFreq);

    // Restore volume setting
    this.volume = prevVolume;

    // Notify
    const noteName = frequencyToNoteName(guitarFreq);
    this.onNoteChanged?.(guitarFreq, noteName);

    console.log(
      `[GuitarSynth] triggerNote: ${noteName} (${guitarFreq.toFixed(1)}Hz) vel=${velocity.toFixed(2)}`
    );

    // If duration provided, schedule note off
    if (duration !== undefined && duration > 0) {
      setTimeout(() => {
        this.releaseNote();
      }, duration);
    }
  }

  /**
   * Release (stop) the current note.
   * Public wrapper for stopNote for the new recording system.
   */
  releaseNote(): void {
    if (this.isPlaying) {
      this.stopNote();
      this.onNoteChanged?.(0, '--');
    }
  }

  /**
   * Play a note directly at a specific frequency (no transposition).
   * Used by MelodicEventPlayer for playback of recorded events.
   *
   * @param frequency - Exact guitar frequency to play
   * @param velocity - Volume multiplier 0-1
   */
  playNoteAtFrequency(frequency: number, velocity: number = 0.8): void {
    if (!this.audioContext || !this.masterGain) return;

    // Stop any currently playing note
    if (this.isPlaying) {
      this.stopNote();
    }

    // Scale volume by velocity
    const prevVolume = this.volume;
    this.volume = prevVolume * velocity;

    // Play directly (no transposition)
    this.playNote(frequency);

    // Restore volume setting
    this.volume = prevVolume;

    const noteName = frequencyToNoteName(frequency);
    this.onNoteChanged?.(frequency, noteName);
  }

  /**
   * Dispose of resources.
   */
  dispose(): void {
    this.stopNote();
    this.masterGain?.disconnect();
    this.masterGain = null;
    this.audioContext = null;
  }
}

// Singleton instance
export const guitarSynthesizer = new GuitarSynthesizer();
