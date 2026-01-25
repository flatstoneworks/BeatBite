/**
 * PianoSynthesizer generates piano/keyboard sounds using Web Audio API synthesis.
 *
 * Converts detected voice pitch to piano notes.
 * Uses multiple synthesis techniques for different piano styles:
 *
 * Piano styles:
 * - Grand: Physical modeling inspired - rich harmonics with hammer strike and string resonance
 * - Upright: Warmer, slightly muted tone
 * - Electric: FM synthesis for classic electric piano (Wurlitzer-style)
 * - Rhodes: FM synthesis for Fender Rhodes-style sound
 * - Synth: Classic synthesizer piano sound
 *
 * Physical modeling approach:
 * - Uses noise burst for hammer excitation
 * - Multiple detuned oscillators for string complexity
 * - Filter envelopes for body resonance
 * - Karplus-Strong inspired decay for realistic sustain
 */

export type PianoStyle = 'grand' | 'upright' | 'electric' | 'rhodes' | 'synth';

export interface PianoConfig {
  style: PianoStyle;
  volume: number;      // 0.0 to 1.0
  octaveShift: number; // -2 to +2 octaves from detected pitch
  sustain: number;     // Sustain pedal simulation (0.0 to 1.0)
  brightness: number;  // Tonal brightness (0.0 to 1.0)
}

// Default piano configurations
const PIANO_DEFAULTS: Record<PianoStyle, Omit<PianoConfig, 'style'>> = {
  grand: { volume: 0.8, octaveShift: 0, sustain: 0.5, brightness: 0.7 },
  upright: { volume: 0.75, octaveShift: 0, sustain: 0.4, brightness: 0.5 },
  electric: { volume: 0.7, octaveShift: 0, sustain: 0.3, brightness: 0.8 },
  rhodes: { volume: 0.7, octaveShift: 0, sustain: 0.6, brightness: 0.6 },
  synth: { volume: 0.75, octaveShift: 0, sustain: 0.4, brightness: 0.9 },
};

// Piano frequency range (A0 to C8)
const PIANO_RANGE = {
  min: 27.5,   // A0
  max: 4186,   // C8
};

// Harmonic ratios for realistic piano timbre
const HARMONIC_RATIOS = [1, 2, 3, 4, 5, 6, 7, 8];
const HARMONIC_AMPLITUDES = [1.0, 0.5, 0.33, 0.25, 0.2, 0.16, 0.14, 0.125];

export class PianoSynthesizer {
  private audioContext: AudioContext | null = null;
  private masterGain: GainNode | null = null;
  private volume = 0.7;

  // Current note state
  private currentFrequency = 0;
  private isPlaying = false;

  // Active voices for polyphony
  private activeVoices: Map<number, PianoVoice> = new Map();
  private voiceIdCounter = 0;

  // Configuration
  private style: PianoStyle = 'grand';
  private octaveShift = 0;
  private sustain = 0.5;
  private brightness = 0.7;

  // Callbacks
  private onNoteChanged?: (frequency: number, noteName: string) => void;

  /**
   * Initialize the piano synthesizer with an audio context.
   */
  initialize(audioContext: AudioContext): void {
    this.audioContext = audioContext;

    // Create master gain for overall volume control
    this.masterGain = audioContext.createGain();
    this.masterGain.gain.value = this.volume;
    this.masterGain.connect(audioContext.destination);

    console.log('[PianoSynth] Initialized');
  }

  /**
   * Set callback for note change events.
   */
  setOnNoteChanged(callback: (frequency: number, noteName: string) => void): void {
    this.onNoteChanged = callback;
  }

  /**
   * Set the piano style.
   */
  setStyle(style: PianoStyle): void {
    this.style = style;
    const defaults = PIANO_DEFAULTS[style];
    this.octaveShift = defaults.octaveShift;
    this.sustain = defaults.sustain;
    this.brightness = defaults.brightness;
  }

  /**
   * Get current style.
   */
  getStyle(): PianoStyle {
    return this.style;
  }

  /**
   * Convert voice pitch to piano frequency.
   */
  private voiceToPianoFrequency(voiceFrequency: number): number {
    let pianoFreq = voiceFrequency;

    // Apply octave shift
    pianoFreq *= Math.pow(2, this.octaveShift);

    // Ensure we're in piano range
    while (pianoFreq > PIANO_RANGE.max) {
      pianoFreq /= 2;
    }
    while (pianoFreq < PIANO_RANGE.min) {
      pianoFreq *= 2;
    }

    // Quantize to nearest semitone for piano-like behavior
    const semitone = Math.round(12 * Math.log2(pianoFreq / 440));
    pianoFreq = 440 * Math.pow(2, semitone / 12);

    return pianoFreq;
  }

  /**
   * Get note name from frequency.
   */
  private frequencyToNoteName(frequency: number): string {
    const noteNames = ['C', 'C#', 'D', 'D#', 'E', 'F', 'F#', 'G', 'G#', 'A', 'A#', 'B'];
    const a4 = 440;
    const semitones = 12 * Math.log2(frequency / a4);
    const noteIndex = Math.round(semitones) + 9;
    const octave = Math.floor((noteIndex + 3) / 12) + 4;
    const noteName = noteNames[((noteIndex % 12) + 12) % 12];
    return `${noteName}${octave}`;
  }

  /**
   * Update piano from detected pitch.
   * Called continuously from audio engine.
   */
  updateFromPitch(frequency: number, confidence: number): void {
    if (!this.audioContext || !this.masterGain) return;

    // Stop when voice stops
    if (confidence < 0.5 || frequency <= 0) {
      if (this.isPlaying) {
        this.releaseAllNotes();
        this.onNoteChanged?.(0, '--');
      }
      return;
    }

    const pianoFreq = this.voiceToPianoFrequency(frequency);

    // Check if this is a new note (different from current)
    const currentNote = this.frequencyToNoteName(this.currentFrequency);
    const newNote = this.frequencyToNoteName(pianoFreq);

    if (!this.isPlaying || currentNote !== newNote) {
      // Release old note and play new one
      this.releaseAllNotes();
      this.playNote(pianoFreq);
    }

    const noteName = this.frequencyToNoteName(pianoFreq);
    this.onNoteChanged?.(pianoFreq, noteName);
  }

  /**
   * Trigger a specific note (for keyboard UI).
   */
  triggerNote(frequency: number, velocity: number = 0.8): void {
    if (!this.audioContext || !this.masterGain) return;
    this.playNote(frequency, velocity);
  }

  /**
   * Release a specific note.
   */
  releaseNote(frequency: number): void {
    // Find and release voice playing this frequency
    for (const [id, voice] of this.activeVoices) {
      if (Math.abs(voice.frequency - frequency) < 1) {
        this.releaseVoice(id);
        break;
      }
    }
  }

  /**
   * Play a piano note.
   */
  private playNote(frequency: number, velocity: number = 0.8): void {
    if (!this.audioContext || !this.masterGain) return;

    this.currentFrequency = frequency;
    this.isPlaying = true;

    const voiceId = this.voiceIdCounter++;
    let voice: PianoVoice;

    switch (this.style) {
      case 'grand':
        voice = this.createGrandPianoVoice(frequency, velocity);
        break;
      case 'upright':
        voice = this.createUprightPianoVoice(frequency, velocity);
        break;
      case 'electric':
        voice = this.createElectricPianoVoice(frequency, velocity);
        break;
      case 'rhodes':
        voice = this.createRhodesVoice(frequency, velocity);
        break;
      case 'synth':
        voice = this.createSynthPianoVoice(frequency, velocity);
        break;
      default:
        voice = this.createGrandPianoVoice(frequency, velocity);
    }

    this.activeVoices.set(voiceId, voice);
  }

  /**
   * Grand Piano: Physical modeling inspired with hammer strike and string resonance.
   */
  private createGrandPianoVoice(frequency: number, velocity: number): PianoVoice {
    const ctx = this.audioContext!;
    const now = ctx.currentTime;

    const voice: PianoVoice = {
      frequency,
      oscillators: [],
      gainNodes: [],
      filterNodes: [],
      noiseSource: null,
      mainGain: ctx.createGain(),
    };

    // Velocity affects brightness and volume
    const velocityBrightness = 0.5 + velocity * 0.5;
    const baseVolume = PIANO_DEFAULTS.grand.volume * velocity;

    // Create multiple oscillators for string complexity (piano has 2-3 strings per note)
    const stringCount = frequency < 200 ? 1 : frequency < 400 ? 2 : 3;
    const detuneAmount = frequency < 200 ? 0.5 : frequency < 400 ? 1.0 : 1.5;

    for (let s = 0; s < stringCount; s++) {
      // Each "string" has multiple harmonics
      for (let h = 0; h < 4; h++) {
        const osc = ctx.createOscillator();
        const gain = ctx.createGain();

        // Detune slightly for each string
        const detune = (s - (stringCount - 1) / 2) * detuneAmount;
        osc.frequency.setValueAtTime(frequency * HARMONIC_RATIOS[h] + detune, now);
        osc.type = h === 0 ? 'sine' : 'sine';

        // Higher harmonics decay faster
        const harmonicAmp = HARMONIC_AMPLITUDES[h] * (1 - h * 0.1 * (1 - velocityBrightness));
        const attackTime = 0.003 + h * 0.001;
        const decayTime = (3 - h * 0.3) * (1 + this.sustain);

        gain.gain.setValueAtTime(0, now);
        gain.gain.linearRampToValueAtTime(harmonicAmp * baseVolume / stringCount, now + attackTime);
        gain.gain.exponentialRampToValueAtTime(0.001, now + decayTime);

        osc.connect(gain);
        gain.connect(voice.mainGain);
        osc.start(now);
        osc.stop(now + decayTime + 0.1);

        voice.oscillators.push(osc);
        voice.gainNodes.push(gain);
      }
    }

    // Hammer strike transient using filtered noise
    const noiseBuffer = this.createNoiseBuffer(0.05);
    const noiseSource = ctx.createBufferSource();
    noiseSource.buffer = noiseBuffer;

    const hammerFilter = ctx.createBiquadFilter();
    hammerFilter.type = 'bandpass';
    hammerFilter.frequency.setValueAtTime(frequency * 4 * velocityBrightness, now);
    hammerFilter.Q.setValueAtTime(2, now);

    const hammerGain = ctx.createGain();
    hammerGain.gain.setValueAtTime(velocity * 0.3, now);
    hammerGain.gain.exponentialRampToValueAtTime(0.001, now + 0.02);

    noiseSource.connect(hammerFilter);
    hammerFilter.connect(hammerGain);
    hammerGain.connect(voice.mainGain);
    noiseSource.start(now);

    voice.noiseSource = noiseSource;
    voice.filterNodes.push(hammerFilter);
    voice.gainNodes.push(hammerGain);

    // Body resonance filter
    const bodyFilter = ctx.createBiquadFilter();
    bodyFilter.type = 'peaking';
    bodyFilter.frequency.setValueAtTime(250, now);
    bodyFilter.Q.setValueAtTime(1, now);
    bodyFilter.gain.setValueAtTime(3, now);

    voice.mainGain.connect(bodyFilter);
    bodyFilter.connect(this.masterGain!);
    voice.filterNodes.push(bodyFilter);

    return voice;
  }

  /**
   * Upright Piano: Warmer, slightly muted tone.
   */
  private createUprightPianoVoice(frequency: number, velocity: number): PianoVoice {
    const ctx = this.audioContext!;
    const now = ctx.currentTime;

    const voice: PianoVoice = {
      frequency,
      oscillators: [],
      gainNodes: [],
      filterNodes: [],
      noiseSource: null,
      mainGain: ctx.createGain(),
    };

    const baseVolume = PIANO_DEFAULTS.upright.volume * velocity;

    // Fewer harmonics for warmer sound
    for (let h = 0; h < 3; h++) {
      const osc = ctx.createOscillator();
      const gain = ctx.createGain();

      osc.frequency.setValueAtTime(frequency * HARMONIC_RATIOS[h], now);
      osc.type = 'sine';

      const harmonicAmp = HARMONIC_AMPLITUDES[h] * 0.8; // Reduced brightness
      const decayTime = (2.5 - h * 0.4) * (1 + this.sustain * 0.8);

      gain.gain.setValueAtTime(0, now);
      gain.gain.linearRampToValueAtTime(harmonicAmp * baseVolume, now + 0.005);
      gain.gain.exponentialRampToValueAtTime(0.001, now + decayTime);

      osc.connect(gain);
      gain.connect(voice.mainGain);
      osc.start(now);
      osc.stop(now + decayTime + 0.1);

      voice.oscillators.push(osc);
      voice.gainNodes.push(gain);
    }

    // Softer hammer strike
    const noiseBuffer = this.createNoiseBuffer(0.03);
    const noiseSource = ctx.createBufferSource();
    noiseSource.buffer = noiseBuffer;

    const hammerFilter = ctx.createBiquadFilter();
    hammerFilter.type = 'lowpass';
    hammerFilter.frequency.setValueAtTime(frequency * 2, now);

    const hammerGain = ctx.createGain();
    hammerGain.gain.setValueAtTime(velocity * 0.15, now);
    hammerGain.gain.exponentialRampToValueAtTime(0.001, now + 0.015);

    noiseSource.connect(hammerFilter);
    hammerFilter.connect(hammerGain);
    hammerGain.connect(voice.mainGain);
    noiseSource.start(now);

    voice.noiseSource = noiseSource;

    // Warmer body resonance
    const bodyFilter = ctx.createBiquadFilter();
    bodyFilter.type = 'lowpass';
    bodyFilter.frequency.setValueAtTime(3000, now);
    bodyFilter.Q.setValueAtTime(0.5, now);

    voice.mainGain.connect(bodyFilter);
    bodyFilter.connect(this.masterGain!);
    voice.filterNodes.push(bodyFilter);

    return voice;
  }

  /**
   * Electric Piano: FM synthesis for Wurlitzer-style sound.
   */
  private createElectricPianoVoice(frequency: number, velocity: number): PianoVoice {
    const ctx = this.audioContext!;
    const now = ctx.currentTime;

    const voice: PianoVoice = {
      frequency,
      oscillators: [],
      gainNodes: [],
      filterNodes: [],
      noiseSource: null,
      mainGain: ctx.createGain(),
    };

    const baseVolume = PIANO_DEFAULTS.electric.volume * velocity;

    // FM synthesis: carrier + modulator
    // Wurlitzer: ratio around 1:1 to 1:3 with moderate index
    const carrier = ctx.createOscillator();
    const modulator = ctx.createOscillator();
    const modulatorGain = ctx.createGain();
    const carrierGain = ctx.createGain();

    carrier.frequency.setValueAtTime(frequency, now);
    carrier.type = 'sine';

    // Modulator at harmonic ratio
    const modRatio = 1;
    modulator.frequency.setValueAtTime(frequency * modRatio, now);
    modulator.type = 'sine';

    // Modulation index (higher velocity = brighter)
    const modIndex = frequency * (0.5 + velocity * 1.5);
    modulatorGain.gain.setValueAtTime(modIndex, now);
    modulatorGain.gain.exponentialRampToValueAtTime(modIndex * 0.1, now + 1.5);

    // Envelope
    const decayTime = 1.5 * (1 + this.sustain);
    carrierGain.gain.setValueAtTime(0, now);
    carrierGain.gain.linearRampToValueAtTime(baseVolume, now + 0.002);
    carrierGain.gain.exponentialRampToValueAtTime(baseVolume * 0.3, now + 0.1);
    carrierGain.gain.exponentialRampToValueAtTime(0.001, now + decayTime);

    // FM connection
    modulator.connect(modulatorGain);
    modulatorGain.connect(carrier.frequency);
    carrier.connect(carrierGain);
    carrierGain.connect(voice.mainGain);

    modulator.start(now);
    carrier.start(now);
    modulator.stop(now + decayTime + 0.1);
    carrier.stop(now + decayTime + 0.1);

    voice.oscillators.push(carrier, modulator);
    voice.gainNodes.push(carrierGain, modulatorGain);

    // Tine resonance (characteristic electric piano sound)
    const tineFilter = ctx.createBiquadFilter();
    tineFilter.type = 'peaking';
    tineFilter.frequency.setValueAtTime(frequency * 2, now);
    tineFilter.Q.setValueAtTime(5, now);
    tineFilter.gain.setValueAtTime(6, now);

    voice.mainGain.connect(tineFilter);
    tineFilter.connect(this.masterGain!);
    voice.filterNodes.push(tineFilter);

    return voice;
  }

  /**
   * Rhodes: FM synthesis for classic Fender Rhodes sound.
   */
  private createRhodesVoice(frequency: number, velocity: number): PianoVoice {
    const ctx = this.audioContext!;
    const now = ctx.currentTime;

    const voice: PianoVoice = {
      frequency,
      oscillators: [],
      gainNodes: [],
      filterNodes: [],
      noiseSource: null,
      mainGain: ctx.createGain(),
    };

    const baseVolume = PIANO_DEFAULTS.rhodes.volume * velocity;

    // Rhodes uses a specific FM ratio (approximately 1:1 to 1:14)
    // The "bell" character comes from inharmonic partials
    const carrier = ctx.createOscillator();
    const modulator1 = ctx.createOscillator();
    const modulator2 = ctx.createOscillator();
    const modGain1 = ctx.createGain();
    const modGain2 = ctx.createGain();
    const carrierGain = ctx.createGain();

    carrier.frequency.setValueAtTime(frequency, now);
    carrier.type = 'sine';

    // Two modulators for complex timbre
    modulator1.frequency.setValueAtTime(frequency * 1, now);
    modulator2.frequency.setValueAtTime(frequency * 14, now); // High partial for "bell"

    // Modulation indices - decay over time for the "bark" attack
    const modIndex1 = frequency * (0.3 + velocity * 0.7);
    const modIndex2 = frequency * (0.1 + velocity * 0.3);

    modGain1.gain.setValueAtTime(modIndex1, now);
    modGain1.gain.exponentialRampToValueAtTime(modIndex1 * 0.05, now + 2);

    modGain2.gain.setValueAtTime(modIndex2, now);
    modGain2.gain.exponentialRampToValueAtTime(0.001, now + 0.3); // Quick decay for bell

    // Envelope - Rhodes has characteristic "bark" attack
    const decayTime = 2.5 * (1 + this.sustain);
    carrierGain.gain.setValueAtTime(0, now);
    carrierGain.gain.linearRampToValueAtTime(baseVolume * 1.2, now + 0.001);
    carrierGain.gain.linearRampToValueAtTime(baseVolume, now + 0.02);
    carrierGain.gain.exponentialRampToValueAtTime(baseVolume * 0.4, now + 0.3);
    carrierGain.gain.exponentialRampToValueAtTime(0.001, now + decayTime);

    // FM connections
    modulator1.connect(modGain1);
    modulator2.connect(modGain2);
    modGain1.connect(carrier.frequency);
    modGain2.connect(carrier.frequency);
    carrier.connect(carrierGain);
    carrierGain.connect(voice.mainGain);

    modulator1.start(now);
    modulator2.start(now);
    carrier.start(now);
    modulator1.stop(now + decayTime + 0.1);
    modulator2.stop(now + decayTime + 0.1);
    carrier.stop(now + decayTime + 0.1);

    voice.oscillators.push(carrier, modulator1, modulator2);
    voice.gainNodes.push(carrierGain, modGain1, modGain2);

    // Subtle chorus/phaser effect simulation
    const phaseFilter = ctx.createBiquadFilter();
    phaseFilter.type = 'allpass';
    phaseFilter.frequency.setValueAtTime(1000, now);
    phaseFilter.Q.setValueAtTime(0.5, now);

    voice.mainGain.connect(phaseFilter);
    phaseFilter.connect(this.masterGain!);
    voice.filterNodes.push(phaseFilter);

    return voice;
  }

  /**
   * Synth Piano: Classic synthesizer piano sound.
   */
  private createSynthPianoVoice(frequency: number, velocity: number): PianoVoice {
    const ctx = this.audioContext!;
    const now = ctx.currentTime;

    const voice: PianoVoice = {
      frequency,
      oscillators: [],
      gainNodes: [],
      filterNodes: [],
      noiseSource: null,
      mainGain: ctx.createGain(),
    };

    const baseVolume = PIANO_DEFAULTS.synth.volume * velocity;

    // Saw wave with filter envelope for classic synth piano
    const osc1 = ctx.createOscillator();
    const osc2 = ctx.createOscillator();
    const oscGain = ctx.createGain();

    osc1.type = 'sawtooth';
    osc1.frequency.setValueAtTime(frequency, now);

    osc2.type = 'square';
    osc2.frequency.setValueAtTime(frequency * 2, now); // Octave up for brightness

    // Mix
    const osc1Gain = ctx.createGain();
    const osc2Gain = ctx.createGain();
    osc1Gain.gain.value = 0.6;
    osc2Gain.gain.value = 0.2;

    osc1.connect(osc1Gain);
    osc2.connect(osc2Gain);
    osc1Gain.connect(oscGain);
    osc2Gain.connect(oscGain);

    // Filter with envelope
    const filter = ctx.createBiquadFilter();
    filter.type = 'lowpass';
    const filterCutoff = frequency * (4 + velocity * 8) * this.brightness;
    filter.frequency.setValueAtTime(filterCutoff, now);
    filter.frequency.exponentialRampToValueAtTime(frequency * 2, now + 0.5);
    filter.Q.setValueAtTime(2, now);

    // Amplitude envelope
    const decayTime = 1.2 * (1 + this.sustain);
    oscGain.gain.setValueAtTime(0, now);
    oscGain.gain.linearRampToValueAtTime(baseVolume, now + 0.005);
    oscGain.gain.exponentialRampToValueAtTime(baseVolume * 0.5, now + 0.1);
    oscGain.gain.exponentialRampToValueAtTime(0.001, now + decayTime);

    oscGain.connect(filter);
    filter.connect(voice.mainGain);
    voice.mainGain.connect(this.masterGain!);

    osc1.start(now);
    osc2.start(now);
    osc1.stop(now + decayTime + 0.1);
    osc2.stop(now + decayTime + 0.1);

    voice.oscillators.push(osc1, osc2);
    voice.gainNodes.push(oscGain, osc1Gain, osc2Gain);
    voice.filterNodes.push(filter);

    return voice;
  }

  /**
   * Create a buffer filled with white noise.
   */
  private createNoiseBuffer(duration: number): AudioBuffer {
    const ctx = this.audioContext!;
    const sampleRate = ctx.sampleRate;
    const length = Math.ceil(sampleRate * duration);
    const buffer = ctx.createBuffer(1, length, sampleRate);
    const data = buffer.getChannelData(0);

    for (let i = 0; i < length; i++) {
      data[i] = Math.random() * 2 - 1;
    }

    return buffer;
  }

  /**
   * Release a specific voice.
   */
  private releaseVoice(voiceId: number): void {
    const voice = this.activeVoices.get(voiceId);
    if (!voice) return;

    // Quick release
    const ctx = this.audioContext;
    if (ctx) {
      const now = ctx.currentTime;
      voice.mainGain.gain.cancelScheduledValues(now);
      voice.mainGain.gain.setValueAtTime(voice.mainGain.gain.value, now);
      voice.mainGain.gain.linearRampToValueAtTime(0, now + 0.05);
    }

    // Cleanup after release
    setTimeout(() => {
      this.cleanupVoice(voice);
      this.activeVoices.delete(voiceId);
    }, 100);
  }

  /**
   * Release all notes.
   */
  private releaseAllNotes(): void {
    for (const voiceId of this.activeVoices.keys()) {
      this.releaseVoice(voiceId);
    }
    this.isPlaying = false;
    this.currentFrequency = 0;
  }

  /**
   * Cleanup a voice's audio nodes.
   */
  private cleanupVoice(voice: PianoVoice): void {
    try {
      for (const osc of voice.oscillators) {
        osc.stop();
        osc.disconnect();
      }
      voice.noiseSource?.stop();
      voice.noiseSource?.disconnect();
    } catch {
      // Ignore errors from already stopped oscillators
    }

    for (const gain of voice.gainNodes) {
      gain.disconnect();
    }
    for (const filter of voice.filterNodes) {
      filter.disconnect();
    }
    voice.mainGain.disconnect();
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
   * Set sustain pedal simulation (0.0 to 1.0).
   */
  setSustain(sustain: number): void {
    this.sustain = Math.max(0, Math.min(1, sustain));
  }

  /**
   * Set brightness (0.0 to 1.0).
   */
  setBrightness(brightness: number): void {
    this.brightness = Math.max(0, Math.min(1, brightness));
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

  // ==================== Single-Shot Mode (New Recording System) ====================

  /**
   * Trigger a single piano note from voice input (one-shot mode with transposition).
   * Transposes the detected voice frequency to piano range.
   * Used for the new recording system where ONE vocal sound = ONE piano hit.
   *
   * @param frequency - The voice frequency to play (will be transposed to piano range)
   * @param velocity - Hit velocity 0-1 (affects volume)
   * @param duration - Optional duration in ms (if not provided, note decays naturally)
   */
  triggerNoteFromVoice(frequency: number, velocity: number = 0.8, duration?: number): void {
    if (!this.audioContext || !this.masterGain) return;

    // Release any currently playing notes
    this.releaseAllNotes();

    // Transpose to piano range
    const pianoFreq = this.voiceToPianoFrequency(frequency);

    // Play the note with velocity
    this.playNote(pianoFreq, velocity);

    // Notify
    const noteName = this.frequencyToNoteName(pianoFreq);
    this.onNoteChanged?.(pianoFreq, noteName);

    console.log(
      `[PianoSynth] triggerNoteFromVoice: ${noteName} (${pianoFreq.toFixed(1)}Hz) vel=${velocity.toFixed(2)}`
    );

    // If duration provided, schedule note release
    if (duration !== undefined && duration > 0) {
      setTimeout(() => {
        this.releaseAllNotes();
        this.onNoteChanged?.(0, '--');
      }, duration);
    }
  }

  /**
   * Release all notes and notify.
   * Public convenience method for the new recording system.
   */
  releaseAllAndNotify(): void {
    this.releaseAllNotes();
    this.onNoteChanged?.(0, '--');
  }

  /**
   * Play a note directly at a specific frequency (no transposition).
   * Used by MelodicEventPlayer for playback of recorded events.
   *
   * @param frequency - Exact piano frequency to play
   * @param velocity - Volume multiplier 0-1
   */
  playNoteAtFrequency(frequency: number, velocity: number = 0.8): void {
    if (!this.audioContext || !this.masterGain) return;

    // Release any currently playing notes
    this.releaseAllNotes();

    // Play directly (no transposition)
    this.playNote(frequency, velocity);

    const noteName = this.frequencyToNoteName(frequency);
    this.onNoteChanged?.(frequency, noteName);
  }

  /**
   * Dispose of resources.
   */
  dispose(): void {
    this.releaseAllNotes();
    this.masterGain?.disconnect();
    this.masterGain = null;
    this.audioContext = null;
  }
}

/**
 * Internal voice structure for polyphonic playback.
 */
interface PianoVoice {
  frequency: number;
  oscillators: OscillatorNode[];
  gainNodes: GainNode[];
  filterNodes: BiquadFilterNode[];
  noiseSource: AudioBufferSourceNode | null;
  mainGain: GainNode;
}

// Singleton instance
export const pianoSynthesizer = new PianoSynthesizer();
