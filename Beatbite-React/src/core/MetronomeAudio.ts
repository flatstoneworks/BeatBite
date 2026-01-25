/**
 * MetronomeAudio generates audible click sounds for tempo selection.
 *
 * Features:
 * - Adjustable BPM (60-200)
 * - Distinct downbeat (beat 1) sound
 * - Web Audio scheduling for accurate timing
 * - Volume control
 */

export interface MetronomeCallbacks {
  onBeat?: (beat: number, isDownbeat: boolean) => void;
}

export class MetronomeAudio {
  private audioContext: AudioContext | null = null;
  private masterGain: GainNode | null = null;
  private callbacks: MetronomeCallbacks = {};

  // Timing state
  private bpm = 120;
  private beatsPerBar = 4;
  private isPlaying = false;

  // Scheduling
  private nextClickTime = 0;
  private currentBeat = 0;
  private scheduleAheadTime = 0.1; // Schedule 100ms ahead
  private lookahead = 25; // Check every 25ms
  private schedulerTimerId: number | null = null;

  /**
   * Initialize the metronome with an audio context.
   */
  initialize(audioContext: AudioContext): void {
    this.audioContext = audioContext;

    // Create master gain for volume control
    this.masterGain = audioContext.createGain();
    this.masterGain.gain.value = 0.5;
    this.masterGain.connect(audioContext.destination);

    console.log('[MetronomeAudio] Initialized');
  }

  /**
   * Set callbacks for metronome events.
   */
  setCallbacks(callbacks: MetronomeCallbacks): void {
    this.callbacks = callbacks;
  }

  /**
   * Set BPM (beats per minute).
   */
  setBpm(bpm: number): void {
    this.bpm = Math.max(60, Math.min(200, bpm));
  }

  /**
   * Get current BPM.
   */
  getBpm(): number {
    return this.bpm;
  }

  /**
   * Set beats per bar (default 4).
   */
  setBeatsPerBar(beats: number): void {
    this.beatsPerBar = Math.max(2, Math.min(8, beats));
  }

  /**
   * Set volume (0-1).
   */
  setVolume(volume: number): void {
    if (this.masterGain) {
      this.masterGain.gain.value = Math.max(0, Math.min(1, volume));
    }
  }

  /**
   * Start the metronome.
   */
  start(): void {
    if (!this.audioContext || this.isPlaying) return;

    // Resume audio context if suspended
    if (this.audioContext.state === 'suspended') {
      this.audioContext.resume();
    }

    this.isPlaying = true;
    this.currentBeat = 0;
    this.nextClickTime = this.audioContext.currentTime + 0.05; // Small initial delay

    // Start the scheduler
    this.scheduler();

    console.log(`[MetronomeAudio] Started at ${this.bpm} BPM`);
  }

  /**
   * Stop the metronome.
   */
  stop(): void {
    this.isPlaying = false;

    if (this.schedulerTimerId !== null) {
      clearTimeout(this.schedulerTimerId);
      this.schedulerTimerId = null;
    }

    this.currentBeat = 0;
    console.log('[MetronomeAudio] Stopped');
  }

  /**
   * Check if metronome is playing.
   */
  getIsPlaying(): boolean {
    return this.isPlaying;
  }

  /**
   * Get current beat (0-based).
   */
  getCurrentBeat(): number {
    return this.currentBeat;
  }

  /**
   * Scheduler function - schedules clicks ahead of time.
   */
  private scheduler(): void {
    if (!this.isPlaying || !this.audioContext) return;

    // Schedule all clicks that need to play before the next interval
    while (this.nextClickTime < this.audioContext.currentTime + this.scheduleAheadTime) {
      this.scheduleClick(this.nextClickTime, this.currentBeat);
      this.advanceBeat();
    }

    // Schedule next check
    this.schedulerTimerId = window.setTimeout(() => this.scheduler(), this.lookahead);
  }

  /**
   * Schedule a single click at the specified time.
   */
  private scheduleClick(time: number, beat: number): void {
    if (!this.audioContext || !this.masterGain) return;

    const isDownbeat = beat === 0;

    // Create click sound
    this.playClick(time, isDownbeat);

    // Notify callback (schedule for the actual time)
    const delay = Math.max(0, (time - this.audioContext.currentTime) * 1000);
    setTimeout(() => {
      this.callbacks.onBeat?.(beat, isDownbeat);
    }, delay);
  }

  /**
   * Generate and play a click sound.
   */
  private playClick(time: number, isDownbeat: boolean): void {
    if (!this.audioContext || !this.masterGain) return;

    // Create oscillator for click
    const osc = this.audioContext.createOscillator();
    osc.type = 'sine';

    // Higher pitch for downbeat
    osc.frequency.value = isDownbeat ? 1000 : 800;

    // Create gain envelope for click
    const clickGain = this.audioContext.createGain();
    clickGain.gain.setValueAtTime(isDownbeat ? 0.6 : 0.4, time);
    clickGain.gain.exponentialRampToValueAtTime(0.001, time + 0.05);

    // Connect and play
    osc.connect(clickGain);
    clickGain.connect(this.masterGain);

    osc.start(time);
    osc.stop(time + 0.05);
  }

  /**
   * Advance to the next beat.
   */
  private advanceBeat(): void {
    // Calculate time for next beat
    const secondsPerBeat = 60 / this.bpm;
    this.nextClickTime += secondsPerBeat;

    // Advance beat counter
    this.currentBeat = (this.currentBeat + 1) % this.beatsPerBar;
  }

  /**
   * Get time until next downbeat (in ms).
   */
  getTimeToNextDownbeat(): number {
    if (!this.audioContext || !this.isPlaying) return 0;

    const secondsPerBeat = 60 / this.bpm;
    const beatsUntilDownbeat = this.currentBeat === 0
      ? this.beatsPerBar
      : this.beatsPerBar - this.currentBeat;

    const timeToNextDownbeat = (this.nextClickTime - this.audioContext.currentTime) +
      (beatsUntilDownbeat - 1) * secondsPerBeat;

    return timeToNextDownbeat * 1000;
  }

  /**
   * Dispose resources.
   */
  dispose(): void {
    this.stop();
    this.masterGain?.disconnect();
    this.masterGain = null;
    this.audioContext = null;
  }
}

// Singleton instance
export const metronomeAudio = new MetronomeAudio();
