/**
 * BassSynthesizer generates bass sounds using Web Audio API synthesis.
 *
 * Converts detected voice pitch to bass notes, transposing down to bass range.
 * Uses subtractive synthesis with oscillators and filters for rich bass tones.
 *
 * Bass styles:
 * - Sub bass: Pure sine wave for deep low end
 * - Synth bass: Saw/square with filter for classic synth sound
 * - Pluck bass: Short attack with filter envelope for plucky sound
 * - Wobble bass: LFO-modulated filter for dubstep-style wobble
 */

export type BassStyle = 'sub' | 'synth' | 'pluck' | 'wobble';

export interface BassConfig {
  style: BassStyle;
  volume: number;      // 0.0 to 1.0
  octaveShift: number; // -2 to +2 octaves from detected pitch
  glide: number;       // Portamento time in seconds (0 = instant)
}

// Default bass configurations
const BASS_DEFAULTS: Record<BassStyle, Omit<BassConfig, 'style'>> = {
  sub: { volume: 0.8, octaveShift: -2, glide: 0.05 },
  synth: { volume: 0.7, octaveShift: -1, glide: 0.03 },
  pluck: { volume: 0.8, octaveShift: -1, glide: 0 },
  wobble: { volume: 0.6, octaveShift: -1, glide: 0.05 },
};

// Bass frequency range (roughly E1 to E3)
const BASS_RANGE = {
  min: 41,   // E1
  max: 165,  // E3
};

export class BassSynthesizer {
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
  private subOscillator: OscillatorNode | null = null;
  private filter: BiquadFilterNode | null = null;
  private ampEnvelope: GainNode | null = null;
  private lfo: OscillatorNode | null = null;
  private lfoGain: GainNode | null = null;

  // Configuration
  private style: BassStyle = 'synth';
  private octaveShift = -1;
  private glideTime = 0.03;

  // Callbacks
  private onNoteChanged?: (frequency: number, noteName: string) => void;

  /**
   * Initialize the bass synthesizer with an audio context.
   */
  initialize(audioContext: AudioContext): void {
    this.audioContext = audioContext;

    // Create master gain for overall volume control
    this.masterGain = audioContext.createGain();
    this.masterGain.gain.value = this.volume;
    this.masterGain.connect(audioContext.destination);

    console.log('[BassSynth] Initialized');
  }

  /**
   * Set callback for note change events.
   */
  setOnNoteChanged(callback: (frequency: number, noteName: string) => void): void {
    this.onNoteChanged = callback;
  }

  /**
   * Set the bass style.
   */
  setStyle(style: BassStyle): void {
    this.style = style;
    const defaults = BASS_DEFAULTS[style];
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
  getStyle(): BassStyle {
    return this.style;
  }

  /**
   * Convert voice pitch to bass frequency.
   * Transposes the detected pitch down to bass range.
   */
  private voiceToBassFrequency(voiceFrequency: number): number {
    // Transpose down by octaves to get into bass range
    let bassFreq = voiceFrequency;

    // Apply octave shift
    bassFreq *= Math.pow(2, this.octaveShift);

    // Ensure we're in bass range by shifting octaves if needed
    while (bassFreq > BASS_RANGE.max) {
      bassFreq /= 2;
    }
    while (bassFreq < BASS_RANGE.min) {
      bassFreq *= 2;
    }

    return bassFreq;
  }

  /**
   * Get note name from frequency.
   */
  private frequencyToNoteName(frequency: number): string {
    const noteNames = ['C', 'C#', 'D', 'D#', 'E', 'F', 'F#', 'G', 'G#', 'A', 'A#', 'B'];
    const a4 = 440;
    const semitones = 12 * Math.log2(frequency / a4);
    const noteIndex = Math.round(semitones) + 9; // A is at index 9
    const octave = Math.floor((noteIndex + 3) / 12) + 4;
    const noteName = noteNames[((noteIndex % 12) + 12) % 12];
    return `${noteName}${octave}`;
  }

  /**
   * Update bass from detected pitch.
   * Called continuously from audio engine.
   * Bass only plays while voice is detected - stops immediately when voice stops.
   */
  updateFromPitch(frequency: number, confidence: number): void {
    if (!this.audioContext || !this.masterGain) return;

    // Stop immediately when voice stops (low confidence or no frequency)
    if (confidence < 0.5 || frequency <= 0) {
      if (this.isPlaying) {
        this.stopNote();
        this.onNoteChanged?.(0, '--');
      }
      return;
    }

    const bassFreq = this.voiceToBassFrequency(frequency);
    this.targetFrequency = bassFreq;

    if (!this.isPlaying) {
      this.playNote(bassFreq);
    } else {
      this.glideToFrequency(bassFreq);
    }

    const noteName = this.frequencyToNoteName(bassFreq);
    this.onNoteChanged?.(bassFreq, noteName);
  }

  /**
   * Start playing a bass note.
   */
  private playNote(frequency: number): void {
    if (!this.audioContext || !this.masterGain) return;

    // Clean up any existing note immediately (no delayed cleanup)
    this.cleanupNodes();

    const ctx = this.audioContext;
    const now = ctx.currentTime;

    this.currentFrequency = frequency;

    // Create amplitude envelope
    this.ampEnvelope = ctx.createGain();
    this.ampEnvelope.gain.setValueAtTime(0, now);

    switch (this.style) {
      case 'sub':
        this.createSubBass(frequency, now);
        break;
      case 'synth':
        this.createSynthBass(frequency, now);
        break;
      case 'pluck':
        this.createPluckBass(frequency, now);
        break;
      case 'wobble':
        this.createWobbleBass(frequency, now);
        break;
    }

    this.ampEnvelope.connect(this.masterGain);
    this.isPlaying = true;
  }

  /**
   * Sub bass: Pure sine wave for deep low end.
   */
  private createSubBass(frequency: number, now: number): void {
    const ctx = this.audioContext!;

    this.oscillator1 = ctx.createOscillator();
    this.oscillator1.type = 'sine';
    this.oscillator1.frequency.setValueAtTime(frequency, now);

    // Simple gain envelope
    this.oscillator1.connect(this.ampEnvelope!);
    this.ampEnvelope!.gain.linearRampToValueAtTime(BASS_DEFAULTS.sub.volume, now + 0.02);

    this.oscillator1.start(now);
  }

  /**
   * Synth bass: Saw + square with lowpass filter.
   */
  private createSynthBass(frequency: number, now: number): void {
    const ctx = this.audioContext!;

    // Saw wave for harmonics
    this.oscillator1 = ctx.createOscillator();
    this.oscillator1.type = 'sawtooth';
    this.oscillator1.frequency.setValueAtTime(frequency, now);

    // Square wave slightly detuned for thickness
    this.oscillator2 = ctx.createOscillator();
    this.oscillator2.type = 'square';
    this.oscillator2.frequency.setValueAtTime(frequency * 1.005, now); // Slight detune

    // Sub oscillator one octave down
    this.subOscillator = ctx.createOscillator();
    this.subOscillator.type = 'sine';
    this.subOscillator.frequency.setValueAtTime(frequency / 2, now);

    // Lowpass filter
    this.filter = ctx.createBiquadFilter();
    this.filter.type = 'lowpass';
    this.filter.frequency.setValueAtTime(frequency * 4, now);
    this.filter.Q.setValueAtTime(2, now);

    // Mix oscillators
    const osc1Gain = ctx.createGain();
    osc1Gain.gain.value = 0.4;
    const osc2Gain = ctx.createGain();
    osc2Gain.gain.value = 0.3;
    const subGain = ctx.createGain();
    subGain.gain.value = 0.5;

    this.oscillator1.connect(osc1Gain);
    this.oscillator2.connect(osc2Gain);
    this.subOscillator.connect(subGain);

    osc1Gain.connect(this.filter);
    osc2Gain.connect(this.filter);
    subGain.connect(this.filter);

    this.filter.connect(this.ampEnvelope!);

    // Envelope
    this.ampEnvelope!.gain.linearRampToValueAtTime(BASS_DEFAULTS.synth.volume, now + 0.01);

    this.oscillator1.start(now);
    this.oscillator2.start(now);
    this.subOscillator.start(now);
  }

  /**
   * Pluck bass: Short attack with filter envelope.
   */
  private createPluckBass(frequency: number, now: number): void {
    const ctx = this.audioContext!;

    // Saw wave
    this.oscillator1 = ctx.createOscillator();
    this.oscillator1.type = 'sawtooth';
    this.oscillator1.frequency.setValueAtTime(frequency, now);

    // Sub sine
    this.subOscillator = ctx.createOscillator();
    this.subOscillator.type = 'sine';
    this.subOscillator.frequency.setValueAtTime(frequency / 2, now);

    // Filter with envelope
    this.filter = ctx.createBiquadFilter();
    this.filter.type = 'lowpass';
    this.filter.frequency.setValueAtTime(frequency * 8, now);
    this.filter.frequency.exponentialRampToValueAtTime(frequency * 2, now + 0.15);
    this.filter.Q.setValueAtTime(4, now);

    const oscGain = ctx.createGain();
    oscGain.gain.value = 0.6;
    const subGain = ctx.createGain();
    subGain.gain.value = 0.5;

    this.oscillator1.connect(oscGain);
    this.subOscillator.connect(subGain);
    oscGain.connect(this.filter);
    subGain.connect(this.filter);
    this.filter.connect(this.ampEnvelope!);

    // Plucky envelope
    this.ampEnvelope!.gain.linearRampToValueAtTime(BASS_DEFAULTS.pluck.volume, now + 0.005);
    this.ampEnvelope!.gain.exponentialRampToValueAtTime(BASS_DEFAULTS.pluck.volume * 0.6, now + 0.1);

    this.oscillator1.start(now);
    this.subOscillator.start(now);
  }

  /**
   * Wobble bass: LFO-modulated filter for dubstep-style sound.
   */
  private createWobbleBass(frequency: number, now: number): void {
    const ctx = this.audioContext!;

    // Saw wave
    this.oscillator1 = ctx.createOscillator();
    this.oscillator1.type = 'sawtooth';
    this.oscillator1.frequency.setValueAtTime(frequency, now);

    // Square wave
    this.oscillator2 = ctx.createOscillator();
    this.oscillator2.type = 'square';
    this.oscillator2.frequency.setValueAtTime(frequency, now);

    // Filter
    this.filter = ctx.createBiquadFilter();
    this.filter.type = 'lowpass';
    this.filter.frequency.setValueAtTime(frequency * 6, now);
    this.filter.Q.setValueAtTime(8, now);

    // LFO for wobble
    this.lfo = ctx.createOscillator();
    this.lfo.type = 'sine';
    this.lfo.frequency.setValueAtTime(4, now); // 4 Hz wobble

    this.lfoGain = ctx.createGain();
    this.lfoGain.gain.setValueAtTime(frequency * 4, now);

    this.lfo.connect(this.lfoGain);
    this.lfoGain.connect(this.filter.frequency);

    // Mix
    const osc1Gain = ctx.createGain();
    osc1Gain.gain.value = 0.5;
    const osc2Gain = ctx.createGain();
    osc2Gain.gain.value = 0.3;

    this.oscillator1.connect(osc1Gain);
    this.oscillator2.connect(osc2Gain);
    osc1Gain.connect(this.filter);
    osc2Gain.connect(this.filter);
    this.filter.connect(this.ampEnvelope!);

    this.ampEnvelope!.gain.linearRampToValueAtTime(BASS_DEFAULTS.wobble.volume, now + 0.02);

    this.oscillator1.start(now);
    this.oscillator2.start(now);
    this.lfo.start(now);
  }

  /**
   * Glide to a new frequency (portamento).
   */
  private glideToFrequency(frequency: number): void {
    if (!this.audioContext) return;

    const now = this.audioContext.currentTime;
    const glideEnd = now + this.glideTime;

    // Update all oscillators
    if (this.oscillator1) {
      this.oscillator1.frequency.linearRampToValueAtTime(frequency, glideEnd);
    }
    if (this.oscillator2) {
      const detunedFreq = this.style === 'synth' ? frequency * 1.005 : frequency;
      this.oscillator2.frequency.linearRampToValueAtTime(detunedFreq, glideEnd);
    }
    if (this.subOscillator) {
      this.subOscillator.frequency.linearRampToValueAtTime(frequency / 2, glideEnd);
    }

    // Update filter cutoff for some styles
    if (this.filter && (this.style === 'synth' || this.style === 'wobble')) {
      this.filter.frequency.linearRampToValueAtTime(frequency * 4, glideEnd);
    }

    this.currentFrequency = frequency;
  }

  /**
   * Stop the current note immediately (with very short fade to prevent clicks).
   */
  private stopNote(): void {
    if (!this.audioContext || !this.ampEnvelope) {
      this.cleanupNodes();
      this.isPlaying = false;
      this.currentFrequency = 0;
      return;
    }

    // Very short fade (5ms) to prevent audio clicks
    const now = this.audioContext.currentTime;
    this.ampEnvelope.gain.cancelScheduledValues(now);
    this.ampEnvelope.gain.setValueAtTime(this.ampEnvelope.gain.value, now);
    this.ampEnvelope.gain.linearRampToValueAtTime(0, now + 0.005);

    // Mark as not playing immediately
    this.isPlaying = false;
    this.currentFrequency = 0;

    // Store reference to current envelope to check in cleanup
    const envelopeToClean = this.ampEnvelope;

    // Schedule cleanup after the short fade
    setTimeout(() => {
      // Only clean up if this is still the same envelope (not replaced by a new note)
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
      this.subOscillator?.stop();
      this.lfo?.stop();
    } catch {
      // Ignore errors from already stopped oscillators
    }

    this.oscillator1?.disconnect();
    this.oscillator2?.disconnect();
    this.subOscillator?.disconnect();
    this.filter?.disconnect();
    this.ampEnvelope?.disconnect();
    this.lfo?.disconnect();
    this.lfoGain?.disconnect();

    this.oscillator1 = null;
    this.oscillator2 = null;
    this.subOscillator = null;
    this.filter = null;
    this.ampEnvelope = null;
    this.lfo = null;
    this.lfoGain = null;
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
   * Connect master output to an additional destination (e.g., for recording).
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
   * Transposes the voice frequency to bass range and glides to it.
   */
  updatePitch(frequency: number): void {
    if (!this.isPlaying || !this.audioContext) return;
    const bassFreq = this.voiceToBassFrequency(frequency);
    this.targetFrequency = bassFreq;
    this.glideToFrequency(bassFreq);
  }

  // ==================== Single-Shot Mode (New Recording System) ====================

  /**
   * Trigger a single bass note (one-shot mode).
   * Unlike updateFromPitch(), this plays the note once and lets it decay naturally.
   * Used for the new recording system where ONE vocal sound = ONE bass hit.
   *
   * @param frequency - The frequency to play (will be transposed to bass range)
   * @param velocity - Hit velocity 0-1 (affects volume)
   * @param duration - Optional duration in ms (if not provided, note decays naturally)
   */
  triggerNote(frequency: number, velocity: number = 0.8, duration?: number): void {
    if (!this.audioContext || !this.masterGain) return;

    // Stop any currently playing note
    if (this.isPlaying) {
      this.stopNote();
    }

    // Transpose to bass range
    const bassFreq = this.voiceToBassFrequency(frequency);

    // Scale volume by velocity
    const prevVolume = this.volume;
    this.volume = prevVolume * velocity;

    // Play the note
    this.playNote(bassFreq);

    // Restore volume setting
    this.volume = prevVolume;

    // Notify
    const noteName = this.frequencyToNoteName(bassFreq);
    this.onNoteChanged?.(bassFreq, noteName);

    console.log(
      `[BassSynth] triggerNote: ${noteName} (${bassFreq.toFixed(1)}Hz) vel=${velocity.toFixed(2)}`
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
   * @param frequency - Exact bass frequency to play
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

    const noteName = this.frequencyToNoteName(frequency);
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
export const bassSynthesizer = new BassSynthesizer();
