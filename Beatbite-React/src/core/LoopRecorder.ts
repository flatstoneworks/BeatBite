/**
 * LoopRecorder captures audio output for recording loops.
 *
 * Features:
 * - Records mixed audio output (voice + effects + instruments)
 * - Supports loop-based recording with fixed durations
 * - Stores recordings as audio buffers for playback
 * - Exports to WAV format
 */

export interface Recording {
  id: string;
  name: string;
  duration: number;      // seconds
  createdAt: Date;
  audioBuffer: AudioBuffer;
  isPlaying: boolean;
}

export interface RecorderState {
  isRecording: boolean;
  isPaused: boolean;
  recordingDuration: number;  // current recording length in seconds
  recordings: Recording[];
}

export class LoopRecorder {
  private audioContext: AudioContext | null = null;
  private mediaRecorder: MediaRecorder | null = null;
  private recordedChunks: Blob[] = [];
  private mediaStreamDest: MediaStreamAudioDestinationNode | null = null;

  // Recording state
  private isRecording = false;
  private recordingStartTime = 0;
  private recordingDuration = 0;
  private animationFrameId: number | null = null;

  // Stored recordings
  private recordings: Recording[] = [];

  // Playback
  private playbackSources: Map<string, AudioBufferSourceNode> = new Map();

  // Callbacks
  private onStateChanged?: (state: RecorderState) => void;
  private onRecordingComplete?: (recording: Recording) => void;

  /**
   * Initialize the recorder with an audio context.
   * Returns a destination node to connect audio sources to.
   */
  initialize(audioContext: AudioContext): MediaStreamAudioDestinationNode {
    this.audioContext = audioContext;

    // Create a destination node that captures audio as a media stream
    this.mediaStreamDest = audioContext.createMediaStreamDestination();

    console.log('[LoopRecorder] Initialized');

    return this.mediaStreamDest;
  }

  /**
   * Set callback for state changes.
   */
  setOnStateChanged(callback: (state: RecorderState) => void): void {
    this.onStateChanged = callback;
  }

  /**
   * Set callback for when recording completes.
   */
  setOnRecordingComplete(callback: (recording: Recording) => void): void {
    this.onRecordingComplete = callback;
  }

  /**
   * Start recording.
   */
  startRecording(): boolean {
    if (!this.mediaStreamDest || this.isRecording) return false;

    try {
      // Create MediaRecorder
      this.mediaRecorder = new MediaRecorder(this.mediaStreamDest.stream, {
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
      this.isRecording = true;
      this.recordingStartTime = performance.now();
      this.recordingDuration = 0;

      // Start duration tracking
      this.startDurationTracking();

      this.notifyStateChange();
      console.log('[LoopRecorder] Recording started');

      return true;
    } catch (error) {
      console.error('[LoopRecorder] Failed to start recording:', error);
      return false;
    }
  }

  /**
   * Stop recording.
   */
  stopRecording(): void {
    if (!this.isRecording || !this.mediaRecorder) return;

    this.mediaRecorder.stop();
    this.isRecording = false;
    this.stopDurationTracking();

    this.notifyStateChange();
    console.log('[LoopRecorder] Recording stopped');
  }

  /**
   * Track recording duration.
   */
  private startDurationTracking(): void {
    const updateDuration = () => {
      if (!this.isRecording) return;

      this.recordingDuration = (performance.now() - this.recordingStartTime) / 1000;
      this.notifyStateChange();

      this.animationFrameId = requestAnimationFrame(updateDuration);
    };

    this.animationFrameId = requestAnimationFrame(updateDuration);
  }

  private stopDurationTracking(): void {
    if (this.animationFrameId !== null) {
      cancelAnimationFrame(this.animationFrameId);
      this.animationFrameId = null;
    }
  }

  /**
   * Process the recorded audio data.
   */
  private async processRecording(): Promise<void> {
    if (this.recordedChunks.length === 0 || !this.audioContext) return;

    try {
      // Combine chunks into a single blob
      const blob = new Blob(this.recordedChunks, { type: 'audio/webm' });

      // Convert to ArrayBuffer
      const arrayBuffer = await blob.arrayBuffer();

      // Decode to AudioBuffer
      const audioBuffer = await this.audioContext.decodeAudioData(arrayBuffer);

      // Create recording entry
      const recording: Recording = {
        id: crypto.randomUUID(),
        name: `Loop ${this.recordings.length + 1}`,
        duration: audioBuffer.duration,
        createdAt: new Date(),
        audioBuffer,
        isPlaying: false,
      };

      this.recordings.push(recording);
      this.onRecordingComplete?.(recording);
      this.notifyStateChange();

      console.log('[LoopRecorder] Recording processed:', recording.name, `${recording.duration.toFixed(1)}s`);
    } catch (error) {
      console.error('[LoopRecorder] Failed to process recording:', error);
    }
  }

  /**
   * Play a recording.
   */
  playRecording(id: string, loop = false): void {
    if (!this.audioContext) return;

    const recording = this.recordings.find(r => r.id === id);
    if (!recording) return;

    // Stop if already playing
    this.stopRecording();

    // Create buffer source
    const source = this.audioContext.createBufferSource();
    source.buffer = recording.audioBuffer;
    source.loop = loop;
    source.connect(this.audioContext.destination);

    source.onended = () => {
      this.playbackSources.delete(id);
      recording.isPlaying = false;
      this.notifyStateChange();
    };

    source.start();
    this.playbackSources.set(id, source);
    recording.isPlaying = true;

    this.notifyStateChange();
    console.log('[LoopRecorder] Playing:', recording.name);
  }

  /**
   * Stop playing a recording.
   */
  stopPlayback(id: string): void {
    const source = this.playbackSources.get(id);
    if (source) {
      try {
        source.stop();
      } catch {
        // Ignore if already stopped
      }
      this.playbackSources.delete(id);
    }

    const recording = this.recordings.find(r => r.id === id);
    if (recording) {
      recording.isPlaying = false;
    }

    this.notifyStateChange();
  }

  /**
   * Stop all playback.
   */
  stopAllPlayback(): void {
    for (const [id] of this.playbackSources) {
      this.stopPlayback(id);
    }
  }

  /**
   * Delete a recording.
   */
  deleteRecording(id: string): void {
    this.stopPlayback(id);
    this.recordings = this.recordings.filter(r => r.id !== id);
    this.notifyStateChange();
  }

  /**
   * Rename a recording.
   */
  renameRecording(id: string, name: string): void {
    const recording = this.recordings.find(r => r.id === id);
    if (recording) {
      recording.name = name;
      this.notifyStateChange();
    }
  }

  /**
   * Export a recording as WAV.
   */
  async exportAsWav(id: string): Promise<Blob | null> {
    const recording = this.recordings.find(r => r.id === id);
    if (!recording) return null;

    return this.audioBufferToWav(recording.audioBuffer);
  }

  /**
   * Convert AudioBuffer to WAV blob.
   */
  private audioBufferToWav(buffer: AudioBuffer): Blob {
    const numChannels = buffer.numberOfChannels;
    const sampleRate = buffer.sampleRate;
    const format = 1; // PCM
    const bitDepth = 16;

    const bytesPerSample = bitDepth / 8;
    const blockAlign = numChannels * bytesPerSample;
    const byteRate = sampleRate * blockAlign;
    const dataSize = buffer.length * blockAlign;
    const headerSize = 44;
    const totalSize = headerSize + dataSize;

    const arrayBuffer = new ArrayBuffer(totalSize);
    const view = new DataView(arrayBuffer);

    // WAV header
    this.writeString(view, 0, 'RIFF');
    view.setUint32(4, totalSize - 8, true);
    this.writeString(view, 8, 'WAVE');
    this.writeString(view, 12, 'fmt ');
    view.setUint32(16, 16, true); // fmt chunk size
    view.setUint16(20, format, true);
    view.setUint16(22, numChannels, true);
    view.setUint32(24, sampleRate, true);
    view.setUint32(28, byteRate, true);
    view.setUint16(32, blockAlign, true);
    view.setUint16(34, bitDepth, true);
    this.writeString(view, 36, 'data');
    view.setUint32(40, dataSize, true);

    // Interleave channels and write samples
    const channels: Float32Array[] = [];
    for (let i = 0; i < numChannels; i++) {
      channels.push(buffer.getChannelData(i));
    }

    let offset = 44;
    for (let i = 0; i < buffer.length; i++) {
      for (let ch = 0; ch < numChannels; ch++) {
        const sample = Math.max(-1, Math.min(1, channels[ch][i]));
        const intSample = sample < 0 ? sample * 0x8000 : sample * 0x7FFF;
        view.setInt16(offset, intSample, true);
        offset += 2;
      }
    }

    return new Blob([arrayBuffer], { type: 'audio/wav' });
  }

  private writeString(view: DataView, offset: number, string: string): void {
    for (let i = 0; i < string.length; i++) {
      view.setUint8(offset + i, string.charCodeAt(i));
    }
  }

  /**
   * Download a recording as WAV file.
   */
  async downloadRecording(id: string): Promise<void> {
    const recording = this.recordings.find(r => r.id === id);
    if (!recording) return;

    const wavBlob = await this.exportAsWav(id);
    if (!wavBlob) return;

    const url = URL.createObjectURL(wavBlob);
    const a = document.createElement('a');
    a.href = url;
    a.download = `${recording.name.replace(/\s+/g, '_')}.wav`;
    document.body.appendChild(a);
    a.click();
    document.body.removeChild(a);
    URL.revokeObjectURL(url);
  }

  /**
   * Get current state.
   */
  getState(): RecorderState {
    return {
      isRecording: this.isRecording,
      isPaused: false,
      recordingDuration: this.recordingDuration,
      recordings: this.recordings.map(r => ({ ...r })),
    };
  }

  /**
   * Get all recordings.
   */
  getRecordings(): Recording[] {
    return [...this.recordings];
  }

  /**
   * Notify state change.
   */
  private notifyStateChange(): void {
    this.onStateChanged?.(this.getState());
  }

  /**
   * Dispose resources.
   */
  dispose(): void {
    this.stopRecording();
    this.stopAllPlayback();
    this.stopDurationTracking();

    this.mediaStreamDest?.disconnect();
    this.mediaStreamDest = null;
    this.audioContext = null;
    this.recordings = [];
  }
}

// Singleton instance
export const loopRecorder = new LoopRecorder();
