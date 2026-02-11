/**
 * DrumEventPlayer plays back recorded drum events through a synthesizer.
 *
 * Features:
 * - Accurate timing using Web Audio scheduling
 * - Loop playback with seamless looping
 * - Velocity-sensitive drum triggering
 * - Volume control
 * - Sync with transport/metronome
 */

import type { DrumHitEvent, BeatboxDrumType } from '../types';
import { drumSynthesizer, type DrumType } from './DrumSynthesizer';
import { logger } from './utils/logger';

export interface DrumEventPlayerCallbacks {
  onEventPlayed?: (event: DrumHitEvent) => void;
  onLoopComplete?: () => void;
  onPlaybackStarted?: () => void;
  onPlaybackStopped?: () => void;
}

export class DrumEventPlayer {
  private audioContext: AudioContext | null = null;
  private events: DrumHitEvent[] = [];
  private isPlaying = false;
  private loopLengthMs = 0;
  private callbacks: DrumEventPlayerCallbacks = {};

  // Scheduling
  private scheduledEvents: Map<number, boolean> = new Map();
  private playbackStartTime = 0;
  private scheduleAheadMs = 100; // Schedule events 100ms ahead
  private lookaheadMs = 25; // Check every 25ms
  private schedulerTimerId: number | null = null;
  private currentLoopCount = 0;

  // Volume
  private volume = 1.0;
  private muted = false;

  /**
   * Initialize the player with an audio context.
   */
  initialize(audioContext: AudioContext): void {
    this.audioContext = audioContext;
    logger.info('[DrumEventPlayer] Initialized');
  }

  /**
   * Set callbacks for player events.
   */
  setCallbacks(callbacks: DrumEventPlayerCallbacks): void {
    this.callbacks = callbacks;
  }

  /**
   * Load events to play.
   */
  loadEvents(events: DrumHitEvent[], loopLengthMs: number): void {
    this.events = [...events].sort((a, b) => a.timeInLoop - b.timeInLoop);
    this.loopLengthMs = loopLengthMs;
    this.scheduledEvents.clear();
    logger.info(`[DrumEventPlayer] Loaded ${events.length} events, loop=${loopLengthMs}ms`);
  }

  /**
   * Start playback.
   *
   * @param startTime - Optional start time in audio context time.
   *                    Used for syncing with other players.
   */
  start(startTime?: number): void {
    if (!this.audioContext || this.isPlaying || this.events.length === 0) return;

    this.isPlaying = true;
    this.playbackStartTime = startTime ?? this.audioContext.currentTime;
    this.currentLoopCount = 0;
    this.scheduledEvents.clear();

    // Start the scheduler
    this.scheduler();

    this.callbacks.onPlaybackStarted?.();
    logger.info('[DrumEventPlayer] Started playback');
  }

  /**
   * Stop playback.
   */
  stop(): void {
    this.isPlaying = false;

    if (this.schedulerTimerId !== null) {
      clearTimeout(this.schedulerTimerId);
      this.schedulerTimerId = null;
    }

    this.scheduledEvents.clear();
    this.callbacks.onPlaybackStopped?.();
    logger.info('[DrumEventPlayer] Stopped playback');
  }

  /**
   * Scheduler function - schedules events ahead of time for accurate playback.
   */
  private scheduler(): void {
    if (!this.isPlaying || !this.audioContext) return;

    const now = this.audioContext.currentTime;
    const loopLengthSec = this.loopLengthMs / 1000;
    const scheduleAheadSec = this.scheduleAheadMs / 1000;

    // Calculate current position in the loop
    const elapsed = now - this.playbackStartTime;
    const currentLoop = Math.floor(elapsed / loopLengthSec);

    // Check if we've started a new loop
    if (currentLoop > this.currentLoopCount) {
      this.currentLoopCount = currentLoop;
      this.callbacks.onLoopComplete?.();
    }

    // Schedule events that fall within our look-ahead window
    for (const event of this.events) {
      const eventTimeSec = event.timeInLoop / 1000;

      // Calculate event's absolute time in this loop iteration
      const eventAbsoluteTime = this.playbackStartTime + currentLoop * loopLengthSec + eventTimeSec;

      // Also check next loop for events that might be upcoming
      const eventAbsoluteTimeNextLoop = eventAbsoluteTime + loopLengthSec;

      // Check current loop
      if (eventAbsoluteTime > now && eventAbsoluteTime < now + scheduleAheadSec) {
        this.scheduleEvent(event, eventAbsoluteTime, currentLoop);
      }

      // Check next loop (for wrap-around at end of loop)
      if (eventAbsoluteTimeNextLoop > now && eventAbsoluteTimeNextLoop < now + scheduleAheadSec) {
        this.scheduleEvent(event, eventAbsoluteTimeNextLoop, currentLoop + 1);
      }
    }

    // Schedule next check
    this.schedulerTimerId = window.setTimeout(() => this.scheduler(), this.lookaheadMs);
  }

  /**
   * Schedule a single event for playback.
   */
  private scheduleEvent(event: DrumHitEvent, time: number, loopIndex: number): void {
    // Create unique key for this event instance
    const key = loopIndex * 1000000 + event.timeInLoop;

    // Don't schedule if already scheduled
    if (this.scheduledEvents.has(key)) return;
    this.scheduledEvents.set(key, true);

    // Schedule the drum trigger
    const delay = Math.max(0, (time - (this.audioContext?.currentTime ?? 0)) * 1000);

    setTimeout(() => {
      if (!this.isPlaying) return;

      // Trigger drum sound
      this.triggerDrum(event);

      // Notify callback
      this.callbacks.onEventPlayed?.(event);

      // Clean up scheduled event after a reasonable time
      setTimeout(() => this.scheduledEvents.delete(key), 1000);
    }, delay);
  }

  /**
   * Trigger a drum sound with velocity.
   */
  private triggerDrum(event: DrumHitEvent): void {
    if (this.muted) return;

    // Map BeatboxDrumType to DrumSynthesizer's DrumType
    const drumType = this.mapDrumType(event.drumType);

    // Apply volume and velocity
    const volume = event.velocity * this.volume;

    drumSynthesizer.trigger(drumType, { volume });
  }

  /**
   * Map BeatboxDrumType to DrumSynthesizer DrumType.
   */
  private mapDrumType(beatboxType: BeatboxDrumType): DrumType {
    switch (beatboxType) {
      case 'kick':
        return 'kick';
      case 'snare':
        return 'snare';
      case 'hihat_closed':
        return 'hihat';
      case 'hihat_open':
        return 'hihat_open';
      default:
        return 'kick';
    }
  }

  /**
   * Set volume (0-1).
   */
  setVolume(volume: number): void {
    this.volume = Math.max(0, Math.min(1, volume));
  }

  /**
   * Get current volume.
   */
  getVolume(): number {
    return this.volume;
  }

  /**
   * Set muted state.
   */
  setMuted(muted: boolean): void {
    this.muted = muted;
  }

  /**
   * Get muted state.
   */
  getMuted(): boolean {
    return this.muted;
  }

  /**
   * Check if playing.
   */
  getIsPlaying(): boolean {
    return this.isPlaying;
  }

  /**
   * Get current position in loop (0-1).
   */
  getCurrentPosition(): number {
    if (!this.isPlaying || !this.audioContext || this.loopLengthMs === 0) {
      return 0;
    }

    const elapsed = this.audioContext.currentTime - this.playbackStartTime;
    const loopLengthSec = this.loopLengthMs / 1000;
    const position = (elapsed % loopLengthSec) / loopLengthSec;

    return Math.max(0, Math.min(1, position));
  }

  /**
   * Get elapsed time in current loop (ms).
   */
  getElapsedInLoop(): number {
    if (!this.isPlaying || !this.audioContext) return 0;

    const elapsed = (this.audioContext.currentTime - this.playbackStartTime) * 1000;
    return elapsed % this.loopLengthMs;
  }

  /**
   * Get total loop count since playback started.
   */
  getLoopCount(): number {
    return this.currentLoopCount;
  }

  /**
   * Get loaded events.
   */
  getEvents(): DrumHitEvent[] {
    return [...this.events];
  }

  /**
   * Get playback start time (audio context time).
   */
  getPlaybackStartTime(): number {
    return this.playbackStartTime;
  }

  /**
   * Get loop length in ms.
   */
  getLoopLengthMs(): number {
    return this.loopLengthMs;
  }

  /**
   * Dispose of resources.
   */
  dispose(): void {
    this.stop();
    this.events = [];
    this.scheduledEvents.clear();
    this.audioContext = null;
  }
}

// Singleton instance
export const drumEventPlayer = new DrumEventPlayer();
