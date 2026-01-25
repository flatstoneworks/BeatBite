/**
 * RecordingPanel provides UI for recording and playback.
 *
 * Features:
 * - Record button with duration indicator
 * - List of recordings with playback controls
 * - Download recordings as WAV
 */

import { clsx } from 'clsx';
import type { RecorderState, Recording } from '../../core/LoopRecorder';

interface RecordingPanelProps {
  recorderState: RecorderState;
  onStartRecording: () => void;
  onStopRecording: () => void;
  onPlayRecording: (id: string) => void;
  onStopPlayback: (id: string) => void;
  onDeleteRecording: (id: string) => void;
  onDownloadRecording: (id: string) => void;
}

export function RecordingPanel({
  recorderState,
  onStartRecording,
  onStopRecording,
  onPlayRecording,
  onStopPlayback,
  onDeleteRecording,
  onDownloadRecording,
}: RecordingPanelProps) {
  const { isRecording, recordingDuration, recordings } = recorderState;

  return (
    <div className="flex flex-col gap-3">
      {/* Record button */}
      <div className="flex items-center gap-3">
        <button
          className={clsx(
            "w-14 h-14 rounded-full flex items-center justify-center transition-all",
            isRecording
              ? "bg-red-600 animate-pulse"
              : "bg-red-600/30 hover:bg-red-600/50"
          )}
          onClick={isRecording ? onStopRecording : onStartRecording}
        >
          {isRecording ? (
            <div className="w-5 h-5 bg-white rounded-sm" />
          ) : (
            <div className="w-6 h-6 bg-red-500 rounded-full" />
          )}
        </button>

        {isRecording && (
          <div className="flex items-center gap-2">
            <div className="w-2 h-2 bg-red-500 rounded-full animate-pulse" />
            <span className="text-red-400 font-mono text-lg">
              {formatDuration(recordingDuration)}
            </span>
          </div>
        )}

        {!isRecording && recordings.length === 0 && (
          <span className="text-white/40 text-sm">Tap to record</span>
        )}
      </div>

      {/* Recordings list */}
      {recordings.length > 0 && (
        <div className="flex flex-col gap-2 max-h-48 overflow-y-auto">
          {recordings.map((recording) => (
            <RecordingItem
              key={recording.id}
              recording={recording}
              onPlay={() => onPlayRecording(recording.id)}
              onStop={() => onStopPlayback(recording.id)}
              onDelete={() => onDeleteRecording(recording.id)}
              onDownload={() => onDownloadRecording(recording.id)}
            />
          ))}
        </div>
      )}
    </div>
  );
}

interface RecordingItemProps {
  recording: Recording;
  onPlay: () => void;
  onStop: () => void;
  onDelete: () => void;
  onDownload: () => void;
}

function RecordingItem({ recording, onPlay, onStop, onDelete, onDownload }: RecordingItemProps) {
  return (
    <div className={clsx(
      "flex items-center gap-2 p-2 rounded-lg transition-colors",
      recording.isPlaying ? "bg-purple-900/40" : "bg-white/5 hover:bg-white/10"
    )}>
      {/* Play/Stop button */}
      <button
        className={clsx(
          "w-8 h-8 rounded-full flex items-center justify-center transition-colors",
          recording.isPlaying
            ? "bg-purple-500 hover:bg-purple-400"
            : "bg-white/10 hover:bg-white/20"
        )}
        onClick={recording.isPlaying ? onStop : onPlay}
      >
        {recording.isPlaying ? (
          <svg className="w-4 h-4 text-white" fill="currentColor" viewBox="0 0 24 24">
            <rect x="6" y="4" width="4" height="16" rx="1" />
            <rect x="14" y="4" width="4" height="16" rx="1" />
          </svg>
        ) : (
          <svg className="w-4 h-4 text-white ml-0.5" fill="currentColor" viewBox="0 0 24 24">
            <path d="M8 5v14l11-7z" />
          </svg>
        )}
      </button>

      {/* Name and duration */}
      <div className="flex-1 min-w-0">
        <p className="text-white/90 text-sm truncate">{recording.name}</p>
        <p className="text-white/40 text-xs">{formatDuration(recording.duration)}</p>
      </div>

      {/* Download button */}
      <button
        className="w-8 h-8 rounded-full flex items-center justify-center bg-white/5 hover:bg-white/15 transition-colors"
        onClick={onDownload}
        title="Download WAV"
      >
        <svg className="w-4 h-4 text-white/70" fill="none" viewBox="0 0 24 24" stroke="currentColor">
          <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2}
            d="M4 16v1a3 3 0 003 3h10a3 3 0 003-3v-1m-4-4l-4 4m0 0l-4-4m4 4V4" />
        </svg>
      </button>

      {/* Delete button */}
      <button
        className="w-8 h-8 rounded-full flex items-center justify-center bg-white/5 hover:bg-red-500/30 transition-colors"
        onClick={onDelete}
        title="Delete"
      >
        <svg className="w-4 h-4 text-white/70" fill="none" viewBox="0 0 24 24" stroke="currentColor">
          <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2}
            d="M19 7l-.867 12.142A2 2 0 0116.138 21H7.862a2 2 0 01-1.995-1.858L5 7m5 4v6m4-6v6m1-10V4a1 1 0 00-1-1h-4a1 1 0 00-1 1v3M4 7h16" />
        </svg>
      </button>
    </div>
  );
}

/**
 * Compact recording button for header bar.
 */
export function CompactRecordButton({
  isRecording,
  duration,
  onToggle,
}: {
  isRecording: boolean;
  duration: number;
  onToggle: () => void;
}) {
  return (
    <button
      className={clsx(
        "flex items-center gap-2 px-3 py-1.5 rounded-full transition-all",
        isRecording
          ? "bg-red-600"
          : "bg-white/10 hover:bg-white/20"
      )}
      onClick={onToggle}
    >
      <div className={clsx(
        "w-3 h-3 rounded-full",
        isRecording ? "bg-white animate-pulse" : "bg-red-500"
      )} />
      {isRecording && (
        <span className="text-white text-sm font-mono">
          {formatDuration(duration)}
        </span>
      )}
    </button>
  );
}

function formatDuration(seconds: number): string {
  const mins = Math.floor(seconds / 60);
  const secs = Math.floor(seconds % 60);
  return `${mins}:${secs.toString().padStart(2, '0')}`;
}
