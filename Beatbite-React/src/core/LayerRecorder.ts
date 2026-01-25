/**
 * LayerRecorder records individual layers for the looper workstation.
 *
 * Features:
 * - First layer: records until user stops (free length)
 * - Subsequent layers: waits for next loop boundary, then records exactly one loop length
 * - Separate capture nodes for drums, bass, and voice
 * - Auto-stops at loop boundary
 */

import type { LayerType, RecordingState } from '../types';
import { transportController } from './TransportController';

export interface LayerRecorderCallbacks {
  onStateChanged?: (state: RecordingState, layerType: LayerType | null) => void;
  onRecordingComplete?: (layerType: LayerType, audioBuffer: AudioBuffer) => void;
  onDurationUpdate?: (durationMs: number) => void;
}

export class LayerRecorder {
  private audioContext: AudioContext | null = null;
  private callbacks: LayerRecorderCallbacks = {};

  // Recording state
  private recordingState: RecordingState = 'idle';
  private activeLayerType: LayerType | null = null;
  private isFirstLayer = true;

  // Capture nodes for each layer type
  private drumsCapture: GainNode | null = null;
  private bassCapture: GainNode | null = null;
  private guitarCapture: GainNode | null = null;
  private voiceCapture: GainNode | null = null;

  // Recording destination
  private recorderDest: MediaStreamAudioDestinationNode | null = null;
  private mediaRecorder: MediaRecorder | null = null;
  private recordedChunks: Blob[] = [];

  // Timing
  private recordingStartTime = 0;
  private recordingDuration = 0;
  private maxRecordingLength = 0; // 0 = unlimited (first layer)
  private animationFrameId: number | null = null;
  private boundaryTimeoutId: number | null = null;

  /**
   * Initialize the layer recorder.
   * Returns capture nodes to connect audio sources.
   */
  initialize(audioContext: AudioContext): {
    drumsCapture: GainNode;
    bassCapture: GainNode;
    guitarCapture: GainNode;
    voiceCapture: GainNode;
  } {
    this.audioContext = audioContext;

    // Create capture nodes for each layer type
    this.drumsCapture = audioContext.createGain();
    this.drumsCapture.gain.value = 1.0;

    this.bassCapture = audioContext.createGain();
    this.bassCapture.gain.value = 1.0;

    this.guitarCapture = audioContext.createGain();
    this.guitarCapture.gain.value = 1.0;

    this.voiceCapture = audioContext.createGain();
    this.voiceCapture.gain.value = 1.0;

    // Create recorder destination
    this.recorderDest = audioContext.createMediaStreamDestination();

    console.log('[LayerRecorder] Initialized');

    return {
      drumsCapture: this.drumsCapture,
      bassCapture: this.bassCapture,
      guitarCapture: this.guitarCapture,
      voiceCapture: this.voiceCapture,
    };
  }

  /**
   * Set callbacks for recording events.
   */
  setCallbacks(callbacks: LayerRecorderCallbacks): void {
    this.callbacks = callbacks;
  }

  /**
   * Set whether this is the first layer (determines if we wait for loop boundary).
   */
  setIsFirstLayer(isFirst: boolean): void {
    this.isFirstLayer = isFirst;
  }

  /**
   * Start recording a layer.
   * - First layer: starts immediately, records until manually stopped
   * - Subsequent layers: waits for loop boundary, records exactly one loop
   */
  startRecording(layerType: LayerType): void {
    if (!this.audioContext || !this.recorderDest) {
      console.error('[LayerRecorder] Not initialized');
      return;
    }

    if (this.recordingState !== 'idle') {
      console.warn('[LayerRecorder] Already recording or waiting');
      return;
    }

    this.activeLayerType = layerType;

    // Connect the appropriate capture node to recorder
    this.disconnectAllCaptures();
    const captureNode = this.getCaptureNode(layerType);
    if (captureNode) {
      captureNode.connect(this.recorderDest);
    }

    if (this.isFirstLayer) {
      // First layer: start immediately
      this.maxRecordingLength = 0; // Unlimited
      this.beginRecording();
    } else {
      // Subsequent layers: wait for next loop boundary
      this.recordingState = 'waiting';
      this.notifyStateChanged();

      // Set up loop boundary listener
      const timeToNextBoundary = transportController.getTimeToNextLoopBoundary();
      this.maxRecordingLength = transportController.getLoopLengthMs();

      console.log(`[LayerRecorder] Waiting ${timeToNextBoundary.toFixed(0)}ms for loop boundary`);

      this.boundaryTimeoutId = window.setTimeout(() => {
        this.beginRecording();

        // Schedule auto-stop at next boundary
        this.boundaryTimeoutId = window.setTimeout(() => {
          this.stopRecording();
        }, this.maxRecordingLength);
      }, timeToNextBoundary);
    }
  }

  /**
   * Begin the actual recording (called after waiting if needed).
   */
  private beginRecording(): void {
    if (!this.recorderDest) return;

    try {
      // Create MediaRecorder
      this.mediaRecorder = new MediaRecorder(this.recorderDest.stream, {
        mimeType: 'audio/webm;codecs=opus',
      });

      this.recordedChunks = [];

      this.mediaRecorder.ondataavailable = (event) => {
        if (event.data.size > 0) {
          this.recordedChunks.push(event.data);
        }
      };

      this.mediaRecorder.onstop = () => {
        this.processRecording();
      };

      // Start recording
      this.mediaRecorder.start(100); // Collect data every 100ms
      this.recordingState = 'recording';
      this.recordingStartTime = performance.now();
      this.recordingDuration = 0;

      // Start duration tracking
      this.startDurationTracking();

      this.notifyStateChanged();
      console.log(`[LayerRecorder] Recording ${this.activeLayerType}`);
    } catch (error) {
      console.error('[LayerRecorder] Failed to start recording:', error);
      this.reset();
    }
  }

  /**
   * Stop recording.
   */
  stopRecording(): void {
    // Clear any pending timeouts
    if (this.boundaryTimeoutId !== null) {
      clearTimeout(this.boundaryTimeoutId);
      this.boundaryTimeoutId = null;
    }

    if (this.recordingState === 'waiting') {
      // Cancel waiting
      this.reset();
      return;
    }

    if (this.recordingState !== 'recording' || !this.mediaRecorder) {
      return;
    }

    this.stopDurationTracking();
    this.mediaRecorder.stop();
    this.recordingState = 'processing';
    this.notifyStateChanged();

    console.log('[LayerRecorder] Recording stopped');
  }

  /**
   * Process the recorded audio.
   */
  private async processRecording(): Promise<void> {
    if (this.recordedChunks.length === 0 || !this.audioContext || !this.activeLayerType) {
      this.reset();
      return;
    }

    try {
      // Combine chunks into a single blob
      const blob = new Blob(this.recordedChunks, { type: 'audio/webm' });

      // Convert to ArrayBuffer
      const arrayBuffer = await blob.arrayBuffer();

      // Decode to AudioBuffer
      const audioBuffer = await this.audioContext.decodeAudioData(arrayBuffer);

      console.log(`[LayerRecorder] Processed: ${audioBuffer.duration.toFixed(2)}s`);

      // Notify completion
      const layerType = this.activeLayerType;
      this.callbacks.onRecordingComplete?.(layerType, audioBuffer);

      // Reset state
      this.reset();
    } catch (error) {
      console.error('[LayerRecorder] Failed to process recording:', error);
      this.reset();
    }
  }

  /**
   * Track recording duration.
   */
  private startDurationTracking(): void {
    const updateDuration = () => {
      if (this.recordingState !== 'recording') return;

      this.recordingDuration = performance.now() - this.recordingStartTime;
      this.callbacks.onDurationUpdate?.(this.recordingDuration);

      // Check if we should auto-stop (for fixed-length recordings)
      if (this.maxRecordingLength > 0 && this.recordingDuration >= this.maxRecordingLength) {
        this.stopRecording();
        return;
      }

      this.animationFrameId = requestAnimationFrame(updateDuration);
    };

    this.animationFrameId = requestAnimationFrame(updateDuration);
  }

  /**
   * Stop duration tracking.
   */
  private stopDurationTracking(): void {
    if (this.animationFrameId !== null) {
      cancelAnimationFrame(this.animationFrameId);
      this.animationFrameId = null;
    }
  }

  /**
   * Get the capture node for a layer type.
   */
  private getCaptureNode(layerType: LayerType): GainNode | null {
    switch (layerType) {
      case 'drums':
        return this.drumsCapture;
      case 'bass':
        return this.bassCapture;
      case 'guitar':
        return this.guitarCapture;
      case 'voice':
        return this.voiceCapture;
      default:
        return null;
    }
  }

  /**
   * Disconnect all capture nodes from recorder.
   */
  private disconnectAllCaptures(): void {
    try {
      this.drumsCapture?.disconnect(this.recorderDest!);
    } catch { /* ignore */ }
    try {
      this.bassCapture?.disconnect(this.recorderDest!);
    } catch { /* ignore */ }
    try {
      this.voiceCapture?.disconnect(this.recorderDest!);
    } catch { /* ignore */ }
  }

  /**
   * Reset to idle state.
   */
  private reset(): void {
    this.stopDurationTracking();

    if (this.boundaryTimeoutId !== null) {
      clearTimeout(this.boundaryTimeoutId);
      this.boundaryTimeoutId = null;
    }

    this.disconnectAllCaptures();
    this.mediaRecorder = null;
    this.recordedChunks = [];
    this.recordingState = 'idle';
    this.activeLayerType = null;
    this.recordingDuration = 0;

    this.notifyStateChanged();
  }

  /**
   * Get current recording state.
   */
  getState(): RecordingState {
    return this.recordingState;
  }

  /**
   * Get active layer type being recorded.
   */
  getActiveLayerType(): LayerType | null {
    return this.activeLayerType;
  }

  /**
   * Get current recording duration.
   */
  getRecordingDuration(): number {
    return this.recordingDuration;
  }

  /**
   * Check if recording is active.
   */
  isRecording(): boolean {
    return this.recordingState === 'recording';
  }

  /**
   * Check if waiting for loop boundary.
   */
  isWaiting(): boolean {
    return this.recordingState === 'waiting';
  }

  /**
   * Notify state changed callback.
   */
  private notifyStateChanged(): void {
    this.callbacks.onStateChanged?.(this.recordingState, this.activeLayerType);
  }

  /**
   * Dispose resources.
   */
  dispose(): void {
    this.reset();

    this.drumsCapture?.disconnect();
    this.bassCapture?.disconnect();
    this.voiceCapture?.disconnect();
    this.recorderDest?.disconnect();

    this.drumsCapture = null;
    this.bassCapture = null;
    this.voiceCapture = null;
    this.recorderDest = null;
    this.audioContext = null;
  }
}

// Singleton instance
export const layerRecorder = new LayerRecorder();
