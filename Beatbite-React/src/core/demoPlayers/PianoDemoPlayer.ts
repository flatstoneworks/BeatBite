import type { PianoStyle, PianoSynthType, RealisticPianoStyle } from '../../types';
import { realisticPianoSampler, type RealisticPianoStyle as SamplerStyle } from '../RealisticPianoSampler';
import { AbstractDemoPlayer } from './AbstractDemoPlayer';

export { PIANO_STYLE_CONFIG, REALISTIC_PIANO_STYLE_CONFIG, ALL_PIANO_OPTIONS } from '../../types';

const DEMO_NOTES = [
  { beat: 0, note: 'C4', freq: 261.63 },
  { beat: 1, note: 'E4', freq: 329.63 },
  { beat: 2, note: 'G4', freq: 392.00 },
  { beat: 3, note: 'C5', freq: 523.25 },
];

interface StyleParams {
  attack: number;
  decay: number;
  sustain: number;
  release: number;
  harmonics: number[];
  brightness: number;
  resonance: number;
}

const STYLE_PARAMS: Record<PianoStyle, StyleParams> = {
  grand: {
    attack: 0.005, decay: 0.3, sustain: 0.6, release: 0.8,
    harmonics: [1.0, 0.5, 0.33, 0.25, 0.2, 0.15],
    brightness: 0.8, resonance: 0.3,
  },
  upright: {
    attack: 0.008, decay: 0.25, sustain: 0.5, release: 0.6,
    harmonics: [1.0, 0.4, 0.2, 0.1],
    brightness: 0.5, resonance: 0.2,
  },
  electric: {
    attack: 0.003, decay: 0.4, sustain: 0.3, release: 0.5,
    harmonics: [1.0, 0.8, 0.1, 0.4],
    brightness: 0.9, resonance: 0.4,
  },
  rhodes: {
    attack: 0.002, decay: 0.5, sustain: 0.2, release: 0.7,
    harmonics: [1.0, 0.3, 0.1, 0.05],
    brightness: 0.6, resonance: 0.5,
  },
  synth: {
    attack: 0.001, decay: 0.2, sustain: 0.7, release: 0.3,
    harmonics: [1.0, 0.7, 0.5, 0.3, 0.2],
    brightness: 1.0, resonance: 0.6,
  },
};

class PianoDemoPlayer extends AbstractDemoPlayer {
  private synthType: PianoSynthType = 'sampled';
  private currentStyle: PianoStyle = 'grand';
  private realisticStyle: RealisticPianoStyle = 'acoustic';

  protected get logTag(): string { return 'PianoDemoPlayer'; }
  protected get defaultVolume(): number { return 0.5; }

  protected async loadSamplerImpl(): Promise<void> {
    await realisticPianoSampler.load();
  }

  protected async beforeStart(): Promise<void> {
    if (this.synthType === 'sampled' && !this.samplerLoaded) {
      await this.loadSampler();
    }
  }

  protected onStop(): void {
    if (this.synthType === 'sampled') {
      realisticPianoSampler.releaseAllNotes();
    }
  }

  protected onDispose(): void {
    realisticPianoSampler.dispose();
  }

  protected onVolumeChange(volume: number): void {
    realisticPianoSampler.setVolume(volume);
  }

  // ============ Synth Type & Style ============

  setSynthType(type: PianoSynthType): void {
    this.synthType = type;
  }

  getSynthType(): PianoSynthType {
    return this.synthType;
  }

  setStyle(style: PianoStyle): void {
    this.currentStyle = style;
    this.synthType = 'electronic';
  }

  setRealisticStyle(style: RealisticPianoStyle): void {
    this.realisticStyle = style;
    this.synthType = 'sampled';
    realisticPianoSampler.setStyle(style as SamplerStyle);
  }

  getStyle(): PianoStyle {
    return this.currentStyle;
  }

  getRealisticStyle(): RealisticPianoStyle {
    return this.realisticStyle;
  }

  // ============ Beat Playback ============

  protected playBeat(beat: number): void {
    const noteEvent = DEMO_NOTES.find(n => n.beat === beat);
    if (noteEvent) {
      if (this.synthType === 'sampled') {
        this.playSampledNote(noteEvent.freq);
      } else {
        this.playElectronicNote(noteEvent.freq);
      }
    }
  }

  private playSampledNote(frequency: number, velocity: number = 0.7): void {
    if (!this.samplerLoaded) return;
    realisticPianoSampler.playNote(frequency, velocity);
  }

  private playElectronicNote(frequency: number, velocity: number = 0.7): void {
    if (!this.audioContext || !this.masterGain) return;

    const params = STYLE_PARAMS[this.currentStyle];
    const now = this.audioContext.currentTime;
    const noteDuration = 0.5;

    params.harmonics.forEach((amp, index) => {
      const osc = this.audioContext!.createOscillator();
      const gain = this.audioContext!.createGain();

      osc.type = index === 0 ? 'sine' : 'triangle';
      osc.frequency.value = frequency * (index + 1);

      const harmonicAmp = amp * Math.pow(params.brightness, index) * velocity;
      gain.gain.setValueAtTime(0, now);
      gain.gain.linearRampToValueAtTime(harmonicAmp * 0.5, now + params.attack);
      gain.gain.exponentialRampToValueAtTime(
        harmonicAmp * params.sustain * 0.5 + 0.001,
        now + params.attack + params.decay
      );
      gain.gain.exponentialRampToValueAtTime(
        0.001,
        now + noteDuration + params.release
      );

      osc.connect(gain);
      gain.connect(this.masterGain!);

      osc.start(now);
      osc.stop(now + noteDuration + params.release + 0.1);
    });

    if (this.currentStyle === 'rhodes') {
      this.addBellTone(frequency, now, noteDuration, velocity);
    }

    if (this.currentStyle === 'electric') {
      this.addDetuned(frequency, now, noteDuration, velocity);
    }
  }

  private addBellTone(frequency: number, time: number, duration: number, velocity: number): void {
    if (!this.audioContext || !this.masterGain) return;

    const osc = this.audioContext.createOscillator();
    const gain = this.audioContext.createGain();

    osc.type = 'sine';
    osc.frequency.value = frequency * 3.1;

    gain.gain.setValueAtTime(0, time);
    gain.gain.linearRampToValueAtTime(velocity * 0.15, time + 0.002);
    gain.gain.exponentialRampToValueAtTime(0.001, time + duration * 0.5);

    osc.connect(gain);
    gain.connect(this.masterGain);

    osc.start(time);
    osc.stop(time + duration);
  }

  private addDetuned(frequency: number, time: number, duration: number, velocity: number): void {
    if (!this.audioContext || !this.masterGain) return;

    const osc = this.audioContext.createOscillator();
    const gain = this.audioContext.createGain();

    osc.type = 'sine';
    osc.frequency.value = frequency * 1.003;

    gain.gain.setValueAtTime(0, time);
    gain.gain.linearRampToValueAtTime(velocity * 0.2, time + 0.003);
    gain.gain.exponentialRampToValueAtTime(0.001, time + duration);

    osc.connect(gain);
    gain.connect(this.masterGain);

    osc.start(time);
    osc.stop(time + duration + 0.1);
  }

  // ============ Preview ============

  async playPreview(): Promise<void> {
    if (!this.audioContext) return;

    if (this.synthType === 'sampled') {
      if (!this.samplerLoaded) {
        await this.loadSampler();
      }
      this.playSampledNote(261.63, 0.6);
      setTimeout(() => this.playSampledNote(329.63, 0.5), 50);
      setTimeout(() => this.playSampledNote(392.00, 0.5), 100);
    } else {
      this.playElectronicNote(261.63, 0.6);
      setTimeout(() => this.playElectronicNote(329.63, 0.5), 50);
      setTimeout(() => this.playElectronicNote(392.00, 0.5), 100);
    }
  }
}

export const pianoDemoPlayer = new PianoDemoPlayer();
