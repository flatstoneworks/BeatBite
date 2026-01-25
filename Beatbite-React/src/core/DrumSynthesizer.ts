/**
 * DrumSynthesizer generates drum sounds using Web Audio API synthesis.
 *
 * Features multiple drum kits with different synthesis approaches:
 * - Electronic: Classic 808/909 style
 * - Acoustic: Physical modeling inspired natural drums
 * - Jazz: Soft brushed sounds
 * - Vintage: Enhanced classic drum machine
 * - Rock: Punchy, aggressive acoustic drums
 *
 * Maps voice pitch ranges to different drum sounds:
 * - Low pitch (80-200 Hz) → Kick drum
 * - Mid-low pitch (200-350 Hz) → Snare
 * - Mid pitch (350-500 Hz) → Tom
 * - High pitch (500+ Hz) → Hi-hat
 *
 * Synthesis techniques:
 * - Oscillator-based for kicks and toms
 * - Noise-based for snares and hi-hats
 * - Modal synthesis for acoustic drums (simulating resonant drum shells)
 * - Filter envelopes for tonal shaping
 */

export type DrumType = 'kick' | 'snare' | 'tom' | 'hihat' | 'hihat_open';
export type DrumKitType = 'electronic' | 'acoustic' | 'jazz' | 'vintage' | 'rock';

export interface DrumConfig {
  type: DrumType;
  volume: number;      // 0.0 to 1.0 (used as velocity)
  pitch?: number;      // Optional pitch modifier
  decay?: number;      // Decay time in seconds
}

// Default drum configurations per kit
const DRUM_DEFAULTS: Record<DrumKitType, Record<DrumType, { decay: number; volume: number }>> = {
  electronic: {
    kick: { decay: 0.5, volume: 1.0 },
    snare: { decay: 0.2, volume: 0.8 },
    tom: { decay: 0.3, volume: 0.7 },
    hihat: { decay: 0.08, volume: 0.5 },
    hihat_open: { decay: 0.3, volume: 0.5 },
  },
  acoustic: {
    kick: { decay: 0.4, volume: 0.9 },
    snare: { decay: 0.25, volume: 0.85 },
    tom: { decay: 0.5, volume: 0.75 },
    hihat: { decay: 0.1, volume: 0.5 },
    hihat_open: { decay: 0.4, volume: 0.55 },
  },
  jazz: {
    kick: { decay: 0.3, volume: 0.7 },
    snare: { decay: 0.35, volume: 0.6 },
    tom: { decay: 0.45, volume: 0.6 },
    hihat: { decay: 0.15, volume: 0.4 },
    hihat_open: { decay: 0.5, volume: 0.45 },
  },
  vintage: {
    kick: { decay: 0.6, volume: 1.0 },
    snare: { decay: 0.22, volume: 0.85 },
    tom: { decay: 0.35, volume: 0.75 },
    hihat: { decay: 0.06, volume: 0.55 },
    hihat_open: { decay: 0.25, volume: 0.55 },
  },
  rock: {
    kick: { decay: 0.35, volume: 1.0 },
    snare: { decay: 0.2, volume: 0.95 },
    tom: { decay: 0.4, volume: 0.85 },
    hihat: { decay: 0.08, volume: 0.6 },
    hihat_open: { decay: 0.35, volume: 0.6 },
  },
};

// Pitch ranges for drum mapping (in Hz)
const PITCH_RANGES: { min: number; max: number; drum: DrumType }[] = [
  { min: 80, max: 200, drum: 'kick' },
  { min: 200, max: 350, drum: 'snare' },
  { min: 350, max: 500, drum: 'tom' },
  { min: 500, max: 1000, drum: 'hihat' },
];

export class DrumSynthesizer {
  private audioContext: AudioContext | null = null;
  private masterGain: GainNode | null = null;
  private volume = 0.7;

  // Current kit
  private currentKit: DrumKitType = 'electronic';

  // Prevent rapid re-triggering
  private lastTriggerTime = 0;
  private minTriggerInterval = 100; // ms between triggers

  // Track current drum for visual feedback
  private currentDrum: DrumType | null = null;
  private onDrumTriggered?: (drum: DrumType) => void;

  /**
   * Initialize the drum synthesizer with an audio context.
   */
  initialize(audioContext: AudioContext): void {
    this.audioContext = audioContext;

    // Create master gain for overall volume control
    this.masterGain = audioContext.createGain();
    this.masterGain.gain.value = this.volume;
    this.masterGain.connect(audioContext.destination);

    console.log('[DrumSynth] Initialized');
  }

  /**
   * Set callback for drum trigger events.
   */
  setOnDrumTriggered(callback: (drum: DrumType) => void): void {
    this.onDrumTriggered = callback;
  }

  /**
   * Set the drum kit.
   */
  setKit(kit: DrumKitType): void {
    this.currentKit = kit;
    console.log(`[DrumSynth] Kit changed to: ${kit}`);
  }

  /**
   * Get current kit.
   */
  getKit(): DrumKitType {
    return this.currentKit;
  }

  /**
   * Trigger a drum sound based on detected pitch.
   */
  triggerFromPitch(frequency: number, confidence: number): DrumType | null {
    if (!this.audioContext || !this.masterGain) return null;
    if (confidence < 0.7) return null; // Require good confidence

    // Rate limiting
    const now = performance.now();
    if (now - this.lastTriggerTime < this.minTriggerInterval) {
      return this.currentDrum;
    }

    // Find matching drum for this pitch
    const drumType = this.pitchToDrum(frequency);
    if (!drumType) return null;

    // Trigger the drum
    this.trigger(drumType);
    this.lastTriggerTime = now;
    this.currentDrum = drumType;

    return drumType;
  }

  /**
   * Map a frequency to a drum type.
   */
  pitchToDrum(frequency: number): DrumType | null {
    for (const range of PITCH_RANGES) {
      if (frequency >= range.min && frequency < range.max) {
        return range.drum;
      }
    }
    return null;
  }

  /**
   * Trigger a specific drum sound.
   */
  trigger(type: DrumType, config?: Partial<DrumConfig>): void {
    if (!this.audioContext || !this.masterGain) return;

    const defaults = DRUM_DEFAULTS[this.currentKit][type];
    const volume = config?.volume ?? defaults.volume;
    const decay = config?.decay ?? defaults.decay;

    // Route to appropriate kit implementation
    switch (this.currentKit) {
      case 'electronic':
        this.playElectronic(type, volume, decay, config?.pitch);
        break;
      case 'acoustic':
        this.playAcoustic(type, volume, decay, config?.pitch);
        break;
      case 'jazz':
        this.playJazz(type, volume, decay, config?.pitch);
        break;
      case 'vintage':
        this.playVintage(type, volume, decay, config?.pitch);
        break;
      case 'rock':
        this.playRock(type, volume, decay, config?.pitch);
        break;
    }

    this.onDrumTriggered?.(type);
  }

  // ==================== Electronic Kit (808/909 Style) ====================

  private playElectronic(type: DrumType, volume: number, decay: number, pitch?: number): void {
    switch (type) {
      case 'kick':
        this.playElectronicKick(volume, decay);
        break;
      case 'snare':
        this.playElectronicSnare(volume, decay);
        break;
      case 'tom':
        this.playElectronicTom(volume, decay, pitch);
        break;
      case 'hihat':
        this.playElectronicHihat(volume, decay, false);
        break;
      case 'hihat_open':
        this.playElectronicHihat(volume, decay, true);
        break;
    }
  }

  private playElectronicKick(volume: number, decay: number): void {
    const ctx = this.audioContext!;
    const now = ctx.currentTime;

    // Oscillator for the body
    const osc = ctx.createOscillator();
    osc.type = 'sine';
    osc.frequency.setValueAtTime(150, now);
    osc.frequency.exponentialRampToValueAtTime(40, now + 0.1);

    // Gain envelope
    const gain = ctx.createGain();
    gain.gain.setValueAtTime(volume, now);
    gain.gain.exponentialRampToValueAtTime(0.001, now + decay);

    // Click transient
    const clickOsc = ctx.createOscillator();
    clickOsc.type = 'sine';
    clickOsc.frequency.setValueAtTime(1000, now);
    clickOsc.frequency.exponentialRampToValueAtTime(100, now + 0.02);

    const clickGain = ctx.createGain();
    clickGain.gain.setValueAtTime(volume * 0.5, now);
    clickGain.gain.exponentialRampToValueAtTime(0.001, now + 0.05);

    // Connect
    osc.connect(gain);
    gain.connect(this.masterGain!);
    clickOsc.connect(clickGain);
    clickGain.connect(this.masterGain!);

    // Play
    osc.start(now);
    osc.stop(now + decay);
    clickOsc.start(now);
    clickOsc.stop(now + 0.05);
  }

  private playElectronicSnare(volume: number, decay: number): void {
    const ctx = this.audioContext!;
    const now = ctx.currentTime;

    // Noise for the snare wires
    const noiseBuffer = this.createNoiseBuffer(0.3);
    const noise = ctx.createBufferSource();
    noise.buffer = noiseBuffer;

    const noiseFilter = ctx.createBiquadFilter();
    noiseFilter.type = 'highpass';
    noiseFilter.frequency.value = 1000;

    const noiseGain = ctx.createGain();
    noiseGain.gain.setValueAtTime(volume * 0.7, now);
    noiseGain.gain.exponentialRampToValueAtTime(0.001, now + decay);

    // Body oscillator
    const osc = ctx.createOscillator();
    osc.type = 'triangle';
    osc.frequency.setValueAtTime(200, now);
    osc.frequency.exponentialRampToValueAtTime(100, now + 0.05);

    const oscGain = ctx.createGain();
    oscGain.gain.setValueAtTime(volume * 0.5, now);
    oscGain.gain.exponentialRampToValueAtTime(0.001, now + 0.1);

    // Connect
    noise.connect(noiseFilter);
    noiseFilter.connect(noiseGain);
    noiseGain.connect(this.masterGain!);
    osc.connect(oscGain);
    oscGain.connect(this.masterGain!);

    // Play
    noise.start(now);
    noise.stop(now + decay);
    osc.start(now);
    osc.stop(now + 0.1);
  }

  private playElectronicTom(volume: number, decay: number, pitchMod?: number): void {
    const ctx = this.audioContext!;
    const now = ctx.currentTime;

    const basePitch = 150 + (pitchMod || 0) * 100;

    const osc = ctx.createOscillator();
    osc.type = 'sine';
    osc.frequency.setValueAtTime(basePitch * 1.5, now);
    osc.frequency.exponentialRampToValueAtTime(basePitch, now + 0.1);

    const gain = ctx.createGain();
    gain.gain.setValueAtTime(volume, now);
    gain.gain.exponentialRampToValueAtTime(0.001, now + decay);

    const waveshaper = ctx.createWaveShaper();
    waveshaper.curve = this.createDistortionCurve(10);

    osc.connect(waveshaper);
    waveshaper.connect(gain);
    gain.connect(this.masterGain!);

    osc.start(now);
    osc.stop(now + decay);
  }

  private playElectronicHihat(volume: number, decay: number, isOpen: boolean): void {
    const ctx = this.audioContext!;
    const now = ctx.currentTime;

    const actualDecay = isOpen ? Math.max(decay, 0.25) : decay;

    const noiseBuffer = this.createNoiseBuffer(actualDecay);
    const noise = ctx.createBufferSource();
    noise.buffer = noiseBuffer;

    const bandpass = ctx.createBiquadFilter();
    bandpass.type = 'bandpass';
    bandpass.frequency.value = isOpen ? 8000 : 10000;
    bandpass.Q.value = isOpen ? 0.5 : 1;

    const highpass = ctx.createBiquadFilter();
    highpass.type = 'highpass';
    highpass.frequency.value = isOpen ? 5000 : 7000;

    const gain = ctx.createGain();
    const gainValue = isOpen ? volume * 0.7 : volume * 0.6;
    gain.gain.setValueAtTime(gainValue, now);

    if (isOpen) {
      gain.gain.setTargetAtTime(gainValue * 0.5, now + 0.02, actualDecay * 0.3);
      gain.gain.exponentialRampToValueAtTime(0.001, now + actualDecay);
    } else {
      gain.gain.exponentialRampToValueAtTime(0.001, now + actualDecay);
    }

    noise.connect(bandpass);
    bandpass.connect(highpass);
    highpass.connect(gain);
    gain.connect(this.masterGain!);

    noise.start(now);
    noise.stop(now + actualDecay);
  }

  // ==================== Acoustic Kit (Physical Modeling) ====================

  private playAcoustic(type: DrumType, volume: number, decay: number, pitch?: number): void {
    switch (type) {
      case 'kick':
        this.playAcousticKick(volume, decay);
        break;
      case 'snare':
        this.playAcousticSnare(volume, decay);
        break;
      case 'tom':
        this.playAcousticTom(volume, decay, pitch);
        break;
      case 'hihat':
        this.playAcousticHihat(volume, decay, false);
        break;
      case 'hihat_open':
        this.playAcousticHihat(volume, decay, true);
        break;
    }
  }

  /**
   * Acoustic kick: Modal synthesis with drum shell resonance.
   * Simulates the head strike and shell resonance of a real bass drum.
   */
  private playAcousticKick(volume: number, decay: number): void {
    const ctx = this.audioContext!;
    const now = ctx.currentTime;

    // Primary mode (fundamental) - pitch sweep like real drum head
    const fundamental = ctx.createOscillator();
    fundamental.type = 'sine';
    fundamental.frequency.setValueAtTime(120, now);
    fundamental.frequency.exponentialRampToValueAtTime(55, now + 0.08);
    fundamental.frequency.exponentialRampToValueAtTime(45, now + 0.15);

    const fundGain = ctx.createGain();
    fundGain.gain.setValueAtTime(volume * 0.9, now);
    fundGain.gain.exponentialRampToValueAtTime(volume * 0.6, now + 0.05);
    fundGain.gain.exponentialRampToValueAtTime(0.001, now + decay);

    // Second mode (shell resonance)
    const mode2 = ctx.createOscillator();
    mode2.type = 'sine';
    mode2.frequency.setValueAtTime(90, now);
    mode2.frequency.exponentialRampToValueAtTime(65, now + 0.1);

    const mode2Gain = ctx.createGain();
    mode2Gain.gain.setValueAtTime(volume * 0.4, now);
    mode2Gain.gain.exponentialRampToValueAtTime(0.001, now + decay * 0.8);

    // Beater attack (filtered noise + click)
    const attackNoise = this.createNoiseBuffer(0.02);
    const attackSource = ctx.createBufferSource();
    attackSource.buffer = attackNoise;

    const attackFilter = ctx.createBiquadFilter();
    attackFilter.type = 'bandpass';
    attackFilter.frequency.setValueAtTime(3500, now);
    attackFilter.Q.value = 2;

    const attackGain = ctx.createGain();
    attackGain.gain.setValueAtTime(volume * 0.5, now);
    attackGain.gain.exponentialRampToValueAtTime(0.001, now + 0.02);

    // Body resonance (lowpass for warmth)
    const bodyFilter = ctx.createBiquadFilter();
    bodyFilter.type = 'lowpass';
    bodyFilter.frequency.setValueAtTime(200, now);
    bodyFilter.Q.value = 1.5;

    // Connect
    fundamental.connect(fundGain);
    mode2.connect(mode2Gain);
    fundGain.connect(bodyFilter);
    mode2Gain.connect(bodyFilter);
    bodyFilter.connect(this.masterGain!);

    attackSource.connect(attackFilter);
    attackFilter.connect(attackGain);
    attackGain.connect(this.masterGain!);

    // Play
    fundamental.start(now);
    fundamental.stop(now + decay);
    mode2.start(now);
    mode2.stop(now + decay);
    attackSource.start(now);
  }

  /**
   * Acoustic snare: Modal synthesis with snare wire resonance.
   * Multiple shell modes plus characteristic snare buzz.
   */
  private playAcousticSnare(volume: number, decay: number): void {
    const ctx = this.audioContext!;
    const now = ctx.currentTime;

    // Drum head modes (fundamental and overtones)
    const modes = [
      { freq: 180, amp: 0.7, decay: 0.08 },
      { freq: 330, amp: 0.4, decay: 0.06 },
      { freq: 450, amp: 0.2, decay: 0.04 },
    ];

    modes.forEach(mode => {
      const osc = ctx.createOscillator();
      osc.type = 'triangle';
      osc.frequency.setValueAtTime(mode.freq * 1.2, now);
      osc.frequency.exponentialRampToValueAtTime(mode.freq, now + 0.01);

      const gain = ctx.createGain();
      gain.gain.setValueAtTime(volume * mode.amp, now);
      gain.gain.exponentialRampToValueAtTime(0.001, now + mode.decay);

      osc.connect(gain);
      gain.connect(this.masterGain!);
      osc.start(now);
      osc.stop(now + mode.decay + 0.01);
    });

    // Snare wires (filtered noise with resonance)
    const snareNoise = this.createNoiseBuffer(decay);
    const snareSource = ctx.createBufferSource();
    snareSource.buffer = snareNoise;

    // Multiple bandpass filters for realistic snare buzz
    const snareFilter1 = ctx.createBiquadFilter();
    snareFilter1.type = 'bandpass';
    snareFilter1.frequency.value = 2500;
    snareFilter1.Q.value = 1;

    const snareFilter2 = ctx.createBiquadFilter();
    snareFilter2.type = 'highpass';
    snareFilter2.frequency.value = 1200;

    // Snare resonance
    const snareResonance = ctx.createBiquadFilter();
    snareResonance.type = 'peaking';
    snareResonance.frequency.value = 4000;
    snareResonance.Q.value = 2;
    snareResonance.gain.value = 4;

    const snareGain = ctx.createGain();
    snareGain.gain.setValueAtTime(volume * 0.6, now);
    snareGain.gain.setTargetAtTime(volume * 0.3, now + 0.02, decay * 0.2);
    snareGain.gain.exponentialRampToValueAtTime(0.001, now + decay);

    // Attack transient
    const attackNoise = this.createNoiseBuffer(0.015);
    const attackSource = ctx.createBufferSource();
    attackSource.buffer = attackNoise;

    const attackFilter = ctx.createBiquadFilter();
    attackFilter.type = 'bandpass';
    attackFilter.frequency.value = 5000;
    attackFilter.Q.value = 0.5;

    const attackGain = ctx.createGain();
    attackGain.gain.setValueAtTime(volume * 0.8, now);
    attackGain.gain.exponentialRampToValueAtTime(0.001, now + 0.01);

    // Connect
    snareSource.connect(snareFilter1);
    snareFilter1.connect(snareFilter2);
    snareFilter2.connect(snareResonance);
    snareResonance.connect(snareGain);
    snareGain.connect(this.masterGain!);

    attackSource.connect(attackFilter);
    attackFilter.connect(attackGain);
    attackGain.connect(this.masterGain!);

    // Play
    snareSource.start(now);
    snareSource.stop(now + decay);
    attackSource.start(now);
  }

  /**
   * Acoustic tom: Modal synthesis with multiple shell resonances.
   */
  private playAcousticTom(volume: number, decay: number, pitchMod?: number): void {
    const ctx = this.audioContext!;
    const now = ctx.currentTime;

    const basePitch = 120 + (pitchMod || 0) * 80;

    // Multiple modes for tom resonance
    const modes = [
      { ratio: 1.0, amp: 0.8, decayMult: 1.0 },
      { ratio: 1.58, amp: 0.3, decayMult: 0.7 },
      { ratio: 2.0, amp: 0.15, decayMult: 0.5 },
    ];

    modes.forEach(mode => {
      const osc = ctx.createOscillator();
      osc.type = 'sine';
      const freq = basePitch * mode.ratio;
      osc.frequency.setValueAtTime(freq * 1.3, now);
      osc.frequency.exponentialRampToValueAtTime(freq, now + 0.05);

      const gain = ctx.createGain();
      gain.gain.setValueAtTime(volume * mode.amp, now);
      gain.gain.exponentialRampToValueAtTime(0.001, now + decay * mode.decayMult);

      // Body resonance filter
      const bodyFilter = ctx.createBiquadFilter();
      bodyFilter.type = 'lowpass';
      bodyFilter.frequency.value = basePitch * 5;
      bodyFilter.Q.value = 1;

      osc.connect(bodyFilter);
      bodyFilter.connect(gain);
      gain.connect(this.masterGain!);
      osc.start(now);
      osc.stop(now + decay * mode.decayMult + 0.01);
    });

    // Stick attack
    const attackNoise = this.createNoiseBuffer(0.01);
    const attackSource = ctx.createBufferSource();
    attackSource.buffer = attackNoise;

    const attackFilter = ctx.createBiquadFilter();
    attackFilter.type = 'bandpass';
    attackFilter.frequency.value = 3000;
    attackFilter.Q.value = 1;

    const attackGain = ctx.createGain();
    attackGain.gain.setValueAtTime(volume * 0.4, now);
    attackGain.gain.exponentialRampToValueAtTime(0.001, now + 0.01);

    attackSource.connect(attackFilter);
    attackFilter.connect(attackGain);
    attackGain.connect(this.masterGain!);
    attackSource.start(now);
  }

  /**
   * Acoustic hi-hat: Multiple detuned oscillators for metallic cymbal sound.
   */
  private playAcousticHihat(volume: number, decay: number, isOpen: boolean): void {
    const ctx = this.audioContext!;
    const now = ctx.currentTime;

    const actualDecay = isOpen ? decay * 1.5 : decay;

    // Multiple detuned square waves for metallic partials (cymbal simulation)
    const fundamentals = [587, 845, 1245, 1578, 2453, 3256];

    fundamentals.forEach((freq, i) => {
      const osc = ctx.createOscillator();
      osc.type = 'square';
      osc.frequency.value = freq + (Math.random() - 0.5) * 20; // Slight random detune

      const oscGain = ctx.createGain();
      const amp = volume * (0.15 - i * 0.02);
      oscGain.gain.setValueAtTime(amp, now);
      oscGain.gain.exponentialRampToValueAtTime(0.001, now + actualDecay * (0.5 + i * 0.1));

      // Bandpass for each partial
      const filter = ctx.createBiquadFilter();
      filter.type = 'bandpass';
      filter.frequency.value = freq;
      filter.Q.value = 30;

      osc.connect(filter);
      filter.connect(oscGain);
      oscGain.connect(this.masterGain!);
      osc.start(now);
      osc.stop(now + actualDecay + 0.1);
    });

    // Add noise component for shimmer
    const noiseBuffer = this.createNoiseBuffer(actualDecay);
    const noise = ctx.createBufferSource();
    noise.buffer = noiseBuffer;

    const noiseFilter = ctx.createBiquadFilter();
    noiseFilter.type = 'highpass';
    noiseFilter.frequency.value = isOpen ? 6000 : 8000;

    const noiseGain = ctx.createGain();
    noiseGain.gain.setValueAtTime(volume * 0.25, now);
    noiseGain.gain.exponentialRampToValueAtTime(0.001, now + actualDecay);

    noise.connect(noiseFilter);
    noiseFilter.connect(noiseGain);
    noiseGain.connect(this.masterGain!);
    noise.start(now);
    noise.stop(now + actualDecay);
  }

  // ==================== Jazz Kit (Soft/Brushed) ====================

  private playJazz(type: DrumType, volume: number, decay: number, pitch?: number): void {
    switch (type) {
      case 'kick':
        this.playJazzKick(volume, decay);
        break;
      case 'snare':
        this.playJazzSnare(volume, decay);
        break;
      case 'tom':
        this.playJazzTom(volume, decay, pitch);
        break;
      case 'hihat':
        this.playJazzHihat(volume, decay, false);
        break;
      case 'hihat_open':
        this.playJazzHihat(volume, decay, true);
        break;
    }
  }

  /**
   * Jazz kick: Softer attack, warmer tone.
   */
  private playJazzKick(volume: number, decay: number): void {
    const ctx = this.audioContext!;
    const now = ctx.currentTime;

    const osc = ctx.createOscillator();
    osc.type = 'sine';
    osc.frequency.setValueAtTime(85, now);
    osc.frequency.exponentialRampToValueAtTime(50, now + 0.1);

    const gain = ctx.createGain();
    // Softer attack
    gain.gain.setValueAtTime(0, now);
    gain.gain.linearRampToValueAtTime(volume * 0.8, now + 0.008);
    gain.gain.exponentialRampToValueAtTime(0.001, now + decay);

    // Warm lowpass
    const filter = ctx.createBiquadFilter();
    filter.type = 'lowpass';
    filter.frequency.value = 120;
    filter.Q.value = 0.8;

    osc.connect(filter);
    filter.connect(gain);
    gain.connect(this.masterGain!);

    osc.start(now);
    osc.stop(now + decay);
  }

  /**
   * Jazz snare: Brushed sound with softer transients.
   */
  private playJazzSnare(volume: number, decay: number): void {
    const ctx = this.audioContext!;
    const now = ctx.currentTime;

    // Brush swish (filtered noise with longer attack)
    const brushNoise = this.createNoiseBuffer(decay);
    const brushSource = ctx.createBufferSource();
    brushSource.buffer = brushNoise;

    const brushFilter = ctx.createBiquadFilter();
    brushFilter.type = 'bandpass';
    brushFilter.frequency.value = 3500;
    brushFilter.Q.value = 0.5;

    const brushGain = ctx.createGain();
    // Slower attack for brush sound
    brushGain.gain.setValueAtTime(0, now);
    brushGain.gain.linearRampToValueAtTime(volume * 0.5, now + 0.02);
    brushGain.gain.setTargetAtTime(volume * 0.3, now + 0.05, decay * 0.3);
    brushGain.gain.exponentialRampToValueAtTime(0.001, now + decay);

    // Subtle body tone
    const body = ctx.createOscillator();
    body.type = 'triangle';
    body.frequency.value = 200;

    const bodyGain = ctx.createGain();
    bodyGain.gain.setValueAtTime(0, now);
    bodyGain.gain.linearRampToValueAtTime(volume * 0.15, now + 0.01);
    bodyGain.gain.exponentialRampToValueAtTime(0.001, now + 0.08);

    // Connect
    brushSource.connect(brushFilter);
    brushFilter.connect(brushGain);
    brushGain.connect(this.masterGain!);

    body.connect(bodyGain);
    bodyGain.connect(this.masterGain!);

    // Play
    brushSource.start(now);
    brushSource.stop(now + decay);
    body.start(now);
    body.stop(now + 0.1);
  }

  /**
   * Jazz tom: Warmer, softer attack.
   */
  private playJazzTom(volume: number, decay: number, pitchMod?: number): void {
    const ctx = this.audioContext!;
    const now = ctx.currentTime;

    const basePitch = 100 + (pitchMod || 0) * 60;

    const osc = ctx.createOscillator();
    osc.type = 'sine';
    osc.frequency.setValueAtTime(basePitch * 1.2, now);
    osc.frequency.exponentialRampToValueAtTime(basePitch, now + 0.08);

    const gain = ctx.createGain();
    gain.gain.setValueAtTime(0, now);
    gain.gain.linearRampToValueAtTime(volume * 0.7, now + 0.01);
    gain.gain.exponentialRampToValueAtTime(0.001, now + decay);

    const filter = ctx.createBiquadFilter();
    filter.type = 'lowpass';
    filter.frequency.value = basePitch * 4;
    filter.Q.value = 0.5;

    osc.connect(filter);
    filter.connect(gain);
    gain.connect(this.masterGain!);

    osc.start(now);
    osc.stop(now + decay);
  }

  /**
   * Jazz hi-hat: Softer, more sustained.
   */
  private playJazzHihat(volume: number, decay: number, isOpen: boolean): void {
    const ctx = this.audioContext!;
    const now = ctx.currentTime;

    const actualDecay = isOpen ? decay * 1.3 : decay;

    const noiseBuffer = this.createNoiseBuffer(actualDecay);
    const noise = ctx.createBufferSource();
    noise.buffer = noiseBuffer;

    const bandpass = ctx.createBiquadFilter();
    bandpass.type = 'bandpass';
    bandpass.frequency.value = isOpen ? 7000 : 9000;
    bandpass.Q.value = 0.3;

    const highpass = ctx.createBiquadFilter();
    highpass.type = 'highpass';
    highpass.frequency.value = 4000;

    const gain = ctx.createGain();
    // Softer attack
    gain.gain.setValueAtTime(0, now);
    gain.gain.linearRampToValueAtTime(volume * 0.4, now + 0.005);
    gain.gain.exponentialRampToValueAtTime(0.001, now + actualDecay);

    noise.connect(bandpass);
    bandpass.connect(highpass);
    highpass.connect(gain);
    gain.connect(this.masterGain!);

    noise.start(now);
    noise.stop(now + actualDecay);
  }

  // ==================== Vintage Kit (Enhanced 808/909) ====================

  private playVintage(type: DrumType, volume: number, decay: number, pitch?: number): void {
    switch (type) {
      case 'kick':
        this.playVintageKick(volume, decay);
        break;
      case 'snare':
        this.playVintageSnare(volume, decay);
        break;
      case 'tom':
        this.playVintageTom(volume, decay, pitch);
        break;
      case 'hihat':
        this.playVintageHihat(volume, decay, false);
        break;
      case 'hihat_open':
        this.playVintageHihat(volume, decay, true);
        break;
    }
  }

  /**
   * Vintage kick: Enhanced 808 with sub bass and punch.
   */
  private playVintageKick(volume: number, decay: number): void {
    const ctx = this.audioContext!;
    const now = ctx.currentTime;

    // Main body - longer pitch sweep for 808 character
    const osc = ctx.createOscillator();
    osc.type = 'sine';
    osc.frequency.setValueAtTime(200, now);
    osc.frequency.exponentialRampToValueAtTime(50, now + 0.15);
    osc.frequency.exponentialRampToValueAtTime(35, now + 0.3);

    const gain = ctx.createGain();
    gain.gain.setValueAtTime(volume, now);
    gain.gain.setTargetAtTime(volume * 0.7, now + 0.1, decay * 0.3);
    gain.gain.exponentialRampToValueAtTime(0.001, now + decay);

    // Sub oscillator for weight
    const subOsc = ctx.createOscillator();
    subOsc.type = 'sine';
    subOsc.frequency.value = 40;

    const subGain = ctx.createGain();
    subGain.gain.setValueAtTime(0, now);
    subGain.gain.linearRampToValueAtTime(volume * 0.5, now + 0.05);
    subGain.gain.exponentialRampToValueAtTime(0.001, now + decay * 0.8);

    // Click transient
    const clickOsc = ctx.createOscillator();
    clickOsc.type = 'sine';
    clickOsc.frequency.setValueAtTime(2000, now);
    clickOsc.frequency.exponentialRampToValueAtTime(150, now + 0.01);

    const clickGain = ctx.createGain();
    clickGain.gain.setValueAtTime(volume * 0.4, now);
    clickGain.gain.exponentialRampToValueAtTime(0.001, now + 0.02);

    // Soft saturation
    const saturator = ctx.createWaveShaper();
    saturator.curve = this.createSoftClipCurve();

    // Connect
    osc.connect(gain);
    subOsc.connect(subGain);
    gain.connect(saturator);
    subGain.connect(saturator);
    saturator.connect(this.masterGain!);

    clickOsc.connect(clickGain);
    clickGain.connect(this.masterGain!);

    // Play
    osc.start(now);
    osc.stop(now + decay);
    subOsc.start(now);
    subOsc.stop(now + decay);
    clickOsc.start(now);
    clickOsc.stop(now + 0.03);
  }

  /**
   * Vintage snare: Classic 909 character.
   */
  private playVintageSnare(volume: number, decay: number): void {
    const ctx = this.audioContext!;
    const now = ctx.currentTime;

    // Two oscillators for body (909 character)
    const osc1 = ctx.createOscillator();
    osc1.type = 'triangle';
    osc1.frequency.setValueAtTime(220, now);
    osc1.frequency.exponentialRampToValueAtTime(180, now + 0.03);

    const osc2 = ctx.createOscillator();
    osc2.type = 'sine';
    osc2.frequency.setValueAtTime(180, now);

    const oscGain = ctx.createGain();
    oscGain.gain.setValueAtTime(volume * 0.5, now);
    oscGain.gain.exponentialRampToValueAtTime(0.001, now + 0.1);

    // Noise with 909-style filtering
    const noiseBuffer = this.createNoiseBuffer(decay);
    const noise = ctx.createBufferSource();
    noise.buffer = noiseBuffer;

    const noiseBP = ctx.createBiquadFilter();
    noiseBP.type = 'bandpass';
    noiseBP.frequency.value = 2500;
    noiseBP.Q.value = 1.2;

    const noiseHP = ctx.createBiquadFilter();
    noiseHP.type = 'highpass';
    noiseHP.frequency.value = 800;

    const noiseGain = ctx.createGain();
    noiseGain.gain.setValueAtTime(volume * 0.8, now);
    noiseGain.gain.exponentialRampToValueAtTime(0.001, now + decay);

    // Connect
    osc1.connect(oscGain);
    osc2.connect(oscGain);
    oscGain.connect(this.masterGain!);

    noise.connect(noiseBP);
    noiseBP.connect(noiseHP);
    noiseHP.connect(noiseGain);
    noiseGain.connect(this.masterGain!);

    // Play
    osc1.start(now);
    osc1.stop(now + 0.12);
    osc2.start(now);
    osc2.stop(now + 0.12);
    noise.start(now);
    noise.stop(now + decay);
  }

  private playVintageTom(volume: number, decay: number, pitchMod?: number): void {
    // Similar to electronic but with more character
    this.playElectronicTom(volume, decay, pitchMod);
  }

  /**
   * Vintage hi-hat: Classic 909 metallic sound.
   */
  private playVintageHihat(volume: number, decay: number, isOpen: boolean): void {
    const ctx = this.audioContext!;
    const now = ctx.currentTime;

    const actualDecay = isOpen ? Math.max(decay, 0.2) : Math.min(decay, 0.06);

    // 909 uses 6 square wave oscillators
    const frequencies = [800, 1342, 1882, 3764, 5765, 8532];

    frequencies.forEach((freq, i) => {
      const osc = ctx.createOscillator();
      osc.type = 'square';
      osc.frequency.value = freq;

      const oscGain = ctx.createGain();
      const amp = volume * (0.2 - i * 0.025);
      oscGain.gain.setValueAtTime(amp, now);
      oscGain.gain.exponentialRampToValueAtTime(0.001, now + actualDecay);

      const bp = ctx.createBiquadFilter();
      bp.type = 'bandpass';
      bp.frequency.value = freq;
      bp.Q.value = 40;

      osc.connect(bp);
      bp.connect(oscGain);
      oscGain.connect(this.masterGain!);
      osc.start(now);
      osc.stop(now + actualDecay + 0.01);
    });
  }

  // ==================== Rock Kit (Punchy Acoustic) ====================

  private playRock(type: DrumType, volume: number, decay: number, pitch?: number): void {
    switch (type) {
      case 'kick':
        this.playRockKick(volume, decay);
        break;
      case 'snare':
        this.playRockSnare(volume, decay);
        break;
      case 'tom':
        this.playRockTom(volume, decay, pitch);
        break;
      case 'hihat':
        this.playAcousticHihat(volume, decay, false);
        break;
      case 'hihat_open':
        this.playAcousticHihat(volume, decay, true);
        break;
    }
  }

  /**
   * Rock kick: Punchy with strong attack.
   */
  private playRockKick(volume: number, decay: number): void {
    const ctx = this.audioContext!;
    const now = ctx.currentTime;

    // Punchy body
    const osc = ctx.createOscillator();
    osc.type = 'sine';
    osc.frequency.setValueAtTime(160, now);
    osc.frequency.exponentialRampToValueAtTime(60, now + 0.05);
    osc.frequency.exponentialRampToValueAtTime(45, now + 0.1);

    const gain = ctx.createGain();
    gain.gain.setValueAtTime(volume, now);
    gain.gain.exponentialRampToValueAtTime(volume * 0.4, now + 0.05);
    gain.gain.exponentialRampToValueAtTime(0.001, now + decay);

    // Strong beater attack
    const attackNoise = this.createNoiseBuffer(0.02);
    const attackSource = ctx.createBufferSource();
    attackSource.buffer = attackNoise;

    const attackBP = ctx.createBiquadFilter();
    attackBP.type = 'bandpass';
    attackBP.frequency.value = 4000;
    attackBP.Q.value = 1;

    const attackGain = ctx.createGain();
    attackGain.gain.setValueAtTime(volume * 0.7, now);
    attackGain.gain.exponentialRampToValueAtTime(0.001, now + 0.015);

    // Click for definition
    const click = ctx.createOscillator();
    click.type = 'sine';
    click.frequency.setValueAtTime(2500, now);
    click.frequency.exponentialRampToValueAtTime(200, now + 0.008);

    const clickGain = ctx.createGain();
    clickGain.gain.setValueAtTime(volume * 0.5, now);
    clickGain.gain.exponentialRampToValueAtTime(0.001, now + 0.015);

    // Compression simulation
    const compressor = ctx.createDynamicsCompressor();
    compressor.threshold.value = -10;
    compressor.ratio.value = 4;
    compressor.attack.value = 0.001;
    compressor.release.value = 0.1;

    // Connect
    osc.connect(gain);
    gain.connect(compressor);
    compressor.connect(this.masterGain!);

    attackSource.connect(attackBP);
    attackBP.connect(attackGain);
    attackGain.connect(this.masterGain!);

    click.connect(clickGain);
    clickGain.connect(this.masterGain!);

    // Play
    osc.start(now);
    osc.stop(now + decay);
    attackSource.start(now);
    click.start(now);
    click.stop(now + 0.02);
  }

  /**
   * Rock snare: Fat, punchy with crack.
   */
  private playRockSnare(volume: number, decay: number): void {
    const ctx = this.audioContext!;
    const now = ctx.currentTime;

    // Fat body
    const body1 = ctx.createOscillator();
    body1.type = 'triangle';
    body1.frequency.setValueAtTime(250, now);
    body1.frequency.exponentialRampToValueAtTime(180, now + 0.02);

    const body2 = ctx.createOscillator();
    body2.type = 'sine';
    body2.frequency.setValueAtTime(180, now);

    const bodyGain = ctx.createGain();
    bodyGain.gain.setValueAtTime(volume * 0.6, now);
    bodyGain.gain.exponentialRampToValueAtTime(0.001, now + 0.08);

    // Snare wires with more presence
    const snareNoise = this.createNoiseBuffer(decay);
    const snareSource = ctx.createBufferSource();
    snareSource.buffer = snareNoise;

    const snareBP = ctx.createBiquadFilter();
    snareBP.type = 'bandpass';
    snareBP.frequency.value = 3000;
    snareBP.Q.value = 0.8;

    const snareHP = ctx.createBiquadFilter();
    snareHP.type = 'highpass';
    snareHP.frequency.value = 1500;

    const snareGain = ctx.createGain();
    snareGain.gain.setValueAtTime(volume * 0.75, now);
    snareGain.gain.exponentialRampToValueAtTime(0.001, now + decay);

    // Crack/attack
    const crackNoise = this.createNoiseBuffer(0.01);
    const crackSource = ctx.createBufferSource();
    crackSource.buffer = crackNoise;

    const crackBP = ctx.createBiquadFilter();
    crackBP.type = 'bandpass';
    crackBP.frequency.value = 6000;
    crackBP.Q.value = 1;

    const crackGain = ctx.createGain();
    crackGain.gain.setValueAtTime(volume * 0.9, now);
    crackGain.gain.exponentialRampToValueAtTime(0.001, now + 0.008);

    // Connect
    body1.connect(bodyGain);
    body2.connect(bodyGain);
    bodyGain.connect(this.masterGain!);

    snareSource.connect(snareBP);
    snareBP.connect(snareHP);
    snareHP.connect(snareGain);
    snareGain.connect(this.masterGain!);

    crackSource.connect(crackBP);
    crackBP.connect(crackGain);
    crackGain.connect(this.masterGain!);

    // Play
    body1.start(now);
    body1.stop(now + 0.1);
    body2.start(now);
    body2.stop(now + 0.1);
    snareSource.start(now);
    snareSource.stop(now + decay);
    crackSource.start(now);
  }

  /**
   * Rock tom: Punchy with more attack.
   */
  private playRockTom(volume: number, decay: number, pitchMod?: number): void {
    const ctx = this.audioContext!;
    const now = ctx.currentTime;

    const basePitch = 140 + (pitchMod || 0) * 80;

    // Main tone
    const osc = ctx.createOscillator();
    osc.type = 'sine';
    osc.frequency.setValueAtTime(basePitch * 1.4, now);
    osc.frequency.exponentialRampToValueAtTime(basePitch, now + 0.04);

    const gain = ctx.createGain();
    gain.gain.setValueAtTime(volume * 0.9, now);
    gain.gain.exponentialRampToValueAtTime(0.001, now + decay);

    // Second harmonic
    const osc2 = ctx.createOscillator();
    osc2.type = 'sine';
    osc2.frequency.setValueAtTime(basePitch * 2.5, now);
    osc2.frequency.exponentialRampToValueAtTime(basePitch * 2, now + 0.03);

    const gain2 = ctx.createGain();
    gain2.gain.setValueAtTime(volume * 0.3, now);
    gain2.gain.exponentialRampToValueAtTime(0.001, now + decay * 0.5);

    // Attack
    const attackNoise = this.createNoiseBuffer(0.015);
    const attackSource = ctx.createBufferSource();
    attackSource.buffer = attackNoise;

    const attackBP = ctx.createBiquadFilter();
    attackBP.type = 'bandpass';
    attackBP.frequency.value = 4000;
    attackBP.Q.value = 1;

    const attackGain = ctx.createGain();
    attackGain.gain.setValueAtTime(volume * 0.5, now);
    attackGain.gain.exponentialRampToValueAtTime(0.001, now + 0.01);

    // Connect
    osc.connect(gain);
    gain.connect(this.masterGain!);
    osc2.connect(gain2);
    gain2.connect(this.masterGain!);

    attackSource.connect(attackBP);
    attackBP.connect(attackGain);
    attackGain.connect(this.masterGain!);

    // Play
    osc.start(now);
    osc.stop(now + decay);
    osc2.start(now);
    osc2.stop(now + decay * 0.5);
    attackSource.start(now);
  }

  // ==================== Utility Functions ====================

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
   * Create a distortion curve for waveshaping.
   */
  // eslint-disable-next-line @typescript-eslint/no-explicit-any
  private createDistortionCurve(amount: number): any {
    const samples = 44100;
    const curve = new Float32Array(samples);
    const deg = Math.PI / 180;

    for (let i = 0; i < samples; i++) {
      const x = (i * 2) / samples - 1;
      curve[i] = ((3 + amount) * x * 20 * deg) / (Math.PI + amount * Math.abs(x));
    }

    return curve;
  }

  /**
   * Create a soft clipping curve for subtle saturation.
   */
  // eslint-disable-next-line @typescript-eslint/no-explicit-any
  private createSoftClipCurve(): any {
    const samples = 44100;
    const curve = new Float32Array(samples);

    for (let i = 0; i < samples; i++) {
      const x = (i * 2) / samples - 1;
      curve[i] = Math.tanh(x * 1.5);
    }

    return curve;
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
   * Set minimum trigger interval (for adjusting responsiveness).
   */
  setTriggerInterval(ms: number): void {
    this.minTriggerInterval = Math.max(50, ms);
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
   * Get the current/last triggered drum.
   */
  getCurrentDrum(): DrumType | null {
    return this.currentDrum;
  }

  /**
   * Clear current drum state.
   */
  clearCurrentDrum(): void {
    this.currentDrum = null;
  }

  /**
   * Dispose of resources.
   */
  dispose(): void {
    this.masterGain?.disconnect();
    this.masterGain = null;
    this.audioContext = null;
    this.currentDrum = null;
  }
}

// Singleton instance
export const drumSynthesizer = new DrumSynthesizer();
