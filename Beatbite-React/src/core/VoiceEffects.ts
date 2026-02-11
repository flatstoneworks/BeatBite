/**
 * VoiceEffects applies real-time audio effects to the voice passthrough.
 *
 * Available effects:
 * - Reverb: Adds space/room ambience
 * - Delay: Echo effect with feedback
 * - Chorus: Thickens the sound with modulated copies
 * - Distortion: Adds grit and edge
 */

import { createDistortionCurve } from './utils/audioUtils';

export type EffectType = 'reverb' | 'delay' | 'chorus' | 'distortion';

export interface EffectState {
  enabled: boolean;
  mix: number; // 0.0 to 1.0 (dry/wet)
}

export interface VoiceEffectsState {
  reverb: EffectState & { decay: number; };
  delay: EffectState & { time: number; feedback: number; };
  chorus: EffectState & { rate: number; depth: number; };
  distortion: EffectState & { amount: number; };
}

const DEFAULT_STATE: VoiceEffectsState = {
  reverb: { enabled: false, mix: 0.3, decay: 2.0 },
  delay: { enabled: false, mix: 0.3, time: 0.3, feedback: 0.4 },
  chorus: { enabled: false, mix: 0.3, rate: 1.5, depth: 0.002 },
  distortion: { enabled: false, mix: 0.5, amount: 10 },
};

export class VoiceEffects {
  private audioContext: AudioContext | null = null;
  private state: VoiceEffectsState = { ...DEFAULT_STATE };

  // Input/Output nodes
  private inputNode: GainNode | null = null;
  private outputNode: GainNode | null = null;
  private dryGain: GainNode | null = null;
  private wetGain: GainNode | null = null;

  // Effect nodes
  private reverbConvolver: ConvolverNode | null = null;
  private reverbGain: GainNode | null = null;

  private delayNode: DelayNode | null = null;
  private delayFeedback: GainNode | null = null;
  private delayGain: GainNode | null = null;

  private chorusDelay: DelayNode | null = null;
  private chorusLfo: OscillatorNode | null = null;
  private chorusLfoGain: GainNode | null = null;
  private chorusGain: GainNode | null = null;

  private distortionNode: WaveShaperNode | null = null;
  private distortionGain: GainNode | null = null;

  // Callbacks
  private onStateChanged?: (state: VoiceEffectsState) => void;

  /**
   * Initialize the voice effects chain.
   */
  initialize(audioContext: AudioContext): { input: GainNode; output: GainNode } {
    this.audioContext = audioContext;

    // Create input/output nodes
    this.inputNode = audioContext.createGain();
    this.outputNode = audioContext.createGain();
    this.dryGain = audioContext.createGain();
    this.wetGain = audioContext.createGain();

    // Dry signal path
    this.inputNode.connect(this.dryGain);
    this.dryGain.connect(this.outputNode);

    // Initialize all effects
    this.initReverb();
    this.initDelay();
    this.initChorus();
    this.initDistortion();

    // Update mix levels
    this.updateMix();

    console.log('[VoiceEffects] Initialized');

    return { input: this.inputNode, output: this.outputNode };
  }

  /**
   * Initialize reverb effect using convolution.
   */
  private initReverb(): void {
    const ctx = this.audioContext!;

    this.reverbConvolver = ctx.createConvolver();
    this.reverbGain = ctx.createGain();
    this.reverbGain.gain.value = 0;

    // Generate impulse response for reverb
    this.reverbConvolver.buffer = this.createReverbImpulse(this.state.reverb.decay);

    this.inputNode!.connect(this.reverbConvolver);
    this.reverbConvolver.connect(this.reverbGain);
    this.reverbGain.connect(this.wetGain!);
    this.wetGain!.connect(this.outputNode!);
  }

  /**
   * Create impulse response for reverb.
   */
  private createReverbImpulse(decay: number): AudioBuffer {
    const ctx = this.audioContext!;
    const sampleRate = ctx.sampleRate;
    const length = Math.ceil(sampleRate * decay);
    const buffer = ctx.createBuffer(2, length, sampleRate);

    for (let channel = 0; channel < 2; channel++) {
      const data = buffer.getChannelData(channel);
      for (let i = 0; i < length; i++) {
        // Exponential decay with noise
        data[i] = (Math.random() * 2 - 1) * Math.exp(-3 * i / length);
      }
    }

    return buffer;
  }

  /**
   * Initialize delay effect.
   */
  private initDelay(): void {
    const ctx = this.audioContext!;

    this.delayNode = ctx.createDelay(2.0);
    this.delayNode.delayTime.value = this.state.delay.time;

    this.delayFeedback = ctx.createGain();
    this.delayFeedback.gain.value = this.state.delay.feedback;

    this.delayGain = ctx.createGain();
    this.delayGain.gain.value = 0;

    // Delay with feedback loop
    this.inputNode!.connect(this.delayNode);
    this.delayNode.connect(this.delayFeedback);
    this.delayFeedback.connect(this.delayNode); // Feedback loop
    this.delayNode.connect(this.delayGain);
    this.delayGain.connect(this.wetGain!);
  }

  /**
   * Initialize chorus effect.
   */
  private initChorus(): void {
    const ctx = this.audioContext!;

    this.chorusDelay = ctx.createDelay(0.1);
    this.chorusDelay.delayTime.value = 0.025; // Base delay

    this.chorusLfo = ctx.createOscillator();
    this.chorusLfo.type = 'sine';
    this.chorusLfo.frequency.value = this.state.chorus.rate;

    this.chorusLfoGain = ctx.createGain();
    this.chorusLfoGain.gain.value = this.state.chorus.depth;

    this.chorusGain = ctx.createGain();
    this.chorusGain.gain.value = 0;

    // LFO modulates delay time
    this.chorusLfo.connect(this.chorusLfoGain);
    this.chorusLfoGain.connect(this.chorusDelay.delayTime);

    this.inputNode!.connect(this.chorusDelay);
    this.chorusDelay.connect(this.chorusGain);
    this.chorusGain.connect(this.wetGain!);

    this.chorusLfo.start();
  }

  /**
   * Initialize distortion effect.
   */
  private initDistortion(): void {
    const ctx = this.audioContext!;

    this.distortionNode = ctx.createWaveShaper();
    this.distortionNode.curve = createDistortionCurve(this.state.distortion.amount);
    this.distortionNode.oversample = '2x';

    this.distortionGain = ctx.createGain();
    this.distortionGain.gain.value = 0;

    this.inputNode!.connect(this.distortionNode);
    this.distortionNode.connect(this.distortionGain);
    this.distortionGain.connect(this.wetGain!);
  }

  /**
   * Update dry/wet mix based on enabled effects.
   */
  private updateMix(): void {
    if (!this.audioContext) return;

    const now = this.audioContext.currentTime;

    // Calculate total wet mix from enabled effects
    let totalWet = 0;

    if (this.state.reverb.enabled) {
      this.reverbGain!.gain.setTargetAtTime(this.state.reverb.mix, now, 0.02);
      totalWet = Math.max(totalWet, this.state.reverb.mix);
    } else {
      this.reverbGain!.gain.setTargetAtTime(0, now, 0.02);
    }

    if (this.state.delay.enabled) {
      this.delayGain!.gain.setTargetAtTime(this.state.delay.mix, now, 0.02);
      totalWet = Math.max(totalWet, this.state.delay.mix);
    } else {
      this.delayGain!.gain.setTargetAtTime(0, now, 0.02);
    }

    if (this.state.chorus.enabled) {
      this.chorusGain!.gain.setTargetAtTime(this.state.chorus.mix, now, 0.02);
      totalWet = Math.max(totalWet, this.state.chorus.mix);
    } else {
      this.chorusGain!.gain.setTargetAtTime(0, now, 0.02);
    }

    if (this.state.distortion.enabled) {
      this.distortionGain!.gain.setTargetAtTime(this.state.distortion.mix, now, 0.02);
      totalWet = Math.max(totalWet, this.state.distortion.mix);
    } else {
      this.distortionGain!.gain.setTargetAtTime(0, now, 0.02);
    }

    // Adjust dry signal to compensate for wet
    this.dryGain!.gain.setTargetAtTime(1 - totalWet * 0.5, now, 0.02);
  }

  /**
   * Toggle an effect on/off.
   */
  toggleEffect(effect: EffectType, enabled?: boolean): void {
    const newEnabled = enabled ?? !this.state[effect].enabled;
    this.state[effect].enabled = newEnabled;
    this.updateMix();
    this.onStateChanged?.(this.state);
  }

  /**
   * Set effect parameter.
   */
  setEffectParam(effect: EffectType, param: string, value: number): void {
    // Update state
    (this.state[effect] as unknown as Record<string, number>)[param] = value;

    const now = this.audioContext?.currentTime ?? 0;

    // Apply parameter changes
    switch (effect) {
      case 'reverb':
        if (param === 'mix') this.updateMix();
        if (param === 'decay' && this.reverbConvolver) {
          this.reverbConvolver.buffer = this.createReverbImpulse(value);
        }
        break;

      case 'delay':
        if (param === 'mix') this.updateMix();
        if (param === 'time' && this.delayNode) {
          this.delayNode.delayTime.setTargetAtTime(value, now, 0.02);
        }
        if (param === 'feedback' && this.delayFeedback) {
          this.delayFeedback.gain.setTargetAtTime(value, now, 0.02);
        }
        break;

      case 'chorus':
        if (param === 'mix') this.updateMix();
        if (param === 'rate' && this.chorusLfo) {
          this.chorusLfo.frequency.setTargetAtTime(value, now, 0.02);
        }
        if (param === 'depth' && this.chorusLfoGain) {
          this.chorusLfoGain.gain.setTargetAtTime(value, now, 0.02);
        }
        break;

      case 'distortion':
        if (param === 'mix') this.updateMix();
        if (param === 'amount' && this.distortionNode) {
          this.distortionNode.curve = createDistortionCurve(value);
        }
        break;
    }

    this.onStateChanged?.(this.state);
  }

  /**
   * Get current state.
   */
  getState(): VoiceEffectsState {
    return { ...this.state };
  }

  /**
   * Set state change callback.
   */
  setOnStateChanged(callback: (state: VoiceEffectsState) => void): void {
    this.onStateChanged = callback;
  }

  /**
   * Check if any effect is enabled.
   */
  hasActiveEffects(): boolean {
    return (
      this.state.reverb.enabled ||
      this.state.delay.enabled ||
      this.state.chorus.enabled ||
      this.state.distortion.enabled
    );
  }

  /**
   * Disable all effects.
   */
  disableAllEffects(): void {
    this.state.reverb.enabled = false;
    this.state.delay.enabled = false;
    this.state.chorus.enabled = false;
    this.state.distortion.enabled = false;
    this.updateMix();
    this.onStateChanged?.(this.state);
  }

  /**
   * Dispose of resources.
   */
  dispose(): void {
    try {
      this.chorusLfo?.stop();
    } catch {
      // Ignore
    }

    this.inputNode?.disconnect();
    this.outputNode?.disconnect();
    this.dryGain?.disconnect();
    this.wetGain?.disconnect();
    this.reverbConvolver?.disconnect();
    this.reverbGain?.disconnect();
    this.delayNode?.disconnect();
    this.delayFeedback?.disconnect();
    this.delayGain?.disconnect();
    this.chorusDelay?.disconnect();
    this.chorusLfo?.disconnect();
    this.chorusLfoGain?.disconnect();
    this.chorusGain?.disconnect();
    this.distortionNode?.disconnect();
    this.distortionGain?.disconnect();

    this.audioContext = null;
  }
}

// Singleton instance
export const voiceEffects = new VoiceEffects();
