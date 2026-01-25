/**
 * FullScreenPlayer - Spotify-style full screen player.
 *
 * Shows when mini player is tapped. Features:
 * - Large album art / visualization
 * - Song info
 * - Progress bar with seeking
 * - Play/pause, skip controls
 * - Close button to return to mini player
 */

import { useCallback, useState } from 'react';
import { useAppStore, usePlayback } from '../../core/store';
import { clsx } from 'clsx';

export function FullScreenPlayer() {
  const playback = usePlayback();
  const {
    pausePlayback,
    resumePlayback,
    stopPlayback,
    setPlaybackPosition,
    closeFullScreenPlayer,
  } = useAppStore();

  const [isDragging, setIsDragging] = useState(false);
  const [dragPosition, setDragPosition] = useState(0);

  // Format time as mm:ss
  const formatTime = (ms: number) => {
    const totalSeconds = Math.floor(ms / 1000);
    const minutes = Math.floor(totalSeconds / 60);
    const seconds = totalSeconds % 60;
    return `${minutes}:${seconds.toString().padStart(2, '0')}`;
  };

  // Progress percentage
  const displayPosition = isDragging ? dragPosition : playback.currentPosition;
  const progress = playback.duration > 0
    ? (displayPosition / playback.duration) * 100
    : 0;

  // Handle play/pause toggle
  const handlePlayPause = () => {
    if (playback.isPlaying) {
      pausePlayback();
    } else {
      resumePlayback();
    }
  };

  // Handle progress bar interaction
  const handleProgressBarClick = useCallback((e: React.MouseEvent<HTMLDivElement>) => {
    const rect = e.currentTarget.getBoundingClientRect();
    const clickX = e.clientX - rect.left;
    const percentage = clickX / rect.width;
    const newPosition = percentage * playback.duration;
    setPlaybackPosition(Math.max(0, Math.min(newPosition, playback.duration)));
  }, [playback.duration, setPlaybackPosition]);

  // Handle drag start
  const handleDragStart = useCallback((e: React.MouseEvent<HTMLDivElement> | React.TouchEvent<HTMLDivElement>) => {
    setIsDragging(true);
    const clientX = 'touches' in e ? e.touches[0].clientX : e.clientX;
    const rect = e.currentTarget.getBoundingClientRect();
    const percentage = (clientX - rect.left) / rect.width;
    setDragPosition(percentage * playback.duration);
  }, [playback.duration]);

  // Handle drag move
  const handleDragMove = useCallback((e: React.MouseEvent<HTMLDivElement> | React.TouchEvent<HTMLDivElement>) => {
    if (!isDragging) return;
    const clientX = 'touches' in e ? e.touches[0].clientX : e.clientX;
    const rect = e.currentTarget.getBoundingClientRect();
    const percentage = Math.max(0, Math.min(1, (clientX - rect.left) / rect.width));
    setDragPosition(percentage * playback.duration);
  }, [isDragging, playback.duration]);

  // Handle drag end
  const handleDragEnd = useCallback(() => {
    if (isDragging) {
      setPlaybackPosition(dragPosition);
      setIsDragging(false);
    }
  }, [isDragging, dragPosition, setPlaybackPosition]);

  // Don't render if not open or no song
  if (!playback.isFullScreenOpen || !playback.currentSong) {
    return null;
  }

  return (
    <div className="fixed inset-0 z-50 bg-[#050505] flex flex-col">
      {/* Background gradient */}
      <div className="absolute inset-0 bg-gradient-to-b from-[#00ffff]/10 via-transparent to-[#ff00ff]/10 pointer-events-none" />

      {/* Header */}
      <div className="relative z-10 flex items-center justify-between px-4 py-4">
        <button
          onClick={closeFullScreenPlayer}
          className="w-10 h-10 rounded-full flex items-center justify-center text-white hover:bg-white/10 transition-colors"
        >
          <svg className="w-6 h-6" fill="none" viewBox="0 0 24 24" stroke="currentColor">
            <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M19 9l-7 7-7-7" />
          </svg>
        </button>

        <div className="text-center">
          <p className="text-[#888888] text-xs font-mono uppercase tracking-wider">Now Playing</p>
        </div>

        <button
          onClick={stopPlayback}
          className="w-10 h-10 rounded-full flex items-center justify-center text-[#666666] hover:text-white hover:bg-white/10 transition-colors"
        >
          <svg className="w-5 h-5" fill="none" viewBox="0 0 24 24" stroke="currentColor">
            <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M6 18L18 6M6 6l12 12" />
          </svg>
        </button>
      </div>

      {/* Main content */}
      <div className="flex-1 flex flex-col items-center justify-center px-8 relative z-10">
        {/* Album art / Visualization */}
        <div className="w-64 h-64 rounded-2xl bg-gradient-to-br from-[#00ffff]/30 to-[#ff00ff]/30 flex items-center justify-center mb-10 shadow-2xl relative overflow-hidden">
          {/* Animated background */}
          <div className={clsx(
            "absolute inset-0 bg-gradient-to-br from-[#00ffff]/20 to-[#ff00ff]/20",
            playback.isPlaying && "animate-pulse"
          )} />

          {/* Waveform visualization placeholder */}
          <div className="relative flex items-center gap-1">
            {[...Array(12)].map((_, i) => (
              <div
                key={i}
                className={clsx(
                  "w-2 bg-gradient-to-t from-[#00ffff] to-[#ff00ff] rounded-full transition-all",
                  playback.isPlaying ? "animate-pulse" : "opacity-50"
                )}
                style={{
                  height: `${20 + Math.sin(i * 0.5) * 40 + (playback.isPlaying ? Math.random() * 20 : 0)}px`,
                  animationDelay: `${i * 0.1}s`,
                }}
              />
            ))}
          </div>

          {/* Music note overlay */}
          <svg className="absolute w-16 h-16 text-white/20" fill="currentColor" viewBox="0 0 24 24">
            <path d="M12 3v10.55c-.59-.34-1.27-.55-2-.55-2.21 0-4 1.79-4 4s1.79 4 4 4 4-1.79 4-4V7h4V3h-6z" />
          </svg>
        </div>

        {/* Song info */}
        <div className="text-center mb-8 w-full max-w-sm">
          <h1 className="text-white text-2xl font-bold font-mono mb-2 truncate">
            {playback.currentSong.name}
          </h1>
          <div className="flex items-center justify-center gap-3 text-[#888888] font-mono text-sm">
            <span className="badge-shader text-[#00ffff]">{playback.currentSong.bpm} BPM</span>
            <span className="badge-shader text-[#ff00ff]">{playback.currentSong.layerCount} layers</span>
          </div>
        </div>

        {/* Progress bar */}
        <div className="w-full max-w-sm mb-6">
          <div
            className="h-2 bg-[#1a1a1a] rounded-full cursor-pointer relative overflow-hidden"
            onClick={handleProgressBarClick}
            onMouseDown={handleDragStart}
            onMouseMove={handleDragMove}
            onMouseUp={handleDragEnd}
            onMouseLeave={handleDragEnd}
            onTouchStart={handleDragStart}
            onTouchMove={handleDragMove}
            onTouchEnd={handleDragEnd}
          >
            {/* Progress fill */}
            <div
              className="absolute left-0 top-0 h-full bg-gradient-to-r from-[#00ffff] to-[#ff00ff] rounded-full transition-all"
              style={{ width: `${progress}%`, transitionDuration: isDragging ? '0ms' : '100ms' }}
            />

            {/* Drag handle */}
            <div
              className={clsx(
                "absolute top-1/2 -translate-y-1/2 w-4 h-4 rounded-full bg-white shadow-lg transition-transform",
                isDragging && "scale-125"
              )}
              style={{ left: `calc(${progress}% - 8px)` }}
            />
          </div>

          {/* Time labels */}
          <div className="flex justify-between mt-2 text-xs font-mono text-[#888888]">
            <span>{formatTime(displayPosition)}</span>
            <span>{formatTime(playback.duration)}</span>
          </div>
        </div>

        {/* Playback controls */}
        <div className="flex items-center justify-center gap-8">
          {/* Rewind 10s */}
          <button
            onClick={() => setPlaybackPosition(Math.max(0, playback.currentPosition - 10000))}
            className="w-12 h-12 rounded-full flex items-center justify-center text-white hover:bg-white/10 transition-colors"
          >
            <svg className="w-6 h-6" fill="none" viewBox="0 0 24 24" stroke="currentColor">
              <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M12.066 11.2a1 1 0 000 1.6l5.334 4A1 1 0 0019 16V8a1 1 0 00-1.6-.8l-5.333 4zM4.066 11.2a1 1 0 000 1.6l5.334 4A1 1 0 0011 16V8a1 1 0 00-1.6-.8l-5.334 4z" />
            </svg>
          </button>

          {/* Play/Pause */}
          <button
            onClick={handlePlayPause}
            className={clsx(
              "w-16 h-16 rounded-full flex items-center justify-center transition-all",
              "bg-gradient-to-r from-[#00ffff] to-[#ff00ff]",
              "hover:shadow-[0_0_30px_rgba(0,255,255,0.5)] active:scale-95"
            )}
          >
            {playback.isPlaying ? (
              <svg className="w-8 h-8 text-black" fill="currentColor" viewBox="0 0 24 24">
                <rect x="6" y="4" width="4" height="16" rx="1" />
                <rect x="14" y="4" width="4" height="16" rx="1" />
              </svg>
            ) : (
              <svg className="w-8 h-8 text-black ml-1" fill="currentColor" viewBox="0 0 24 24">
                <path d="M8 5v14l11-7z" />
              </svg>
            )}
          </button>

          {/* Forward 10s */}
          <button
            onClick={() => setPlaybackPosition(Math.min(playback.duration, playback.currentPosition + 10000))}
            className="w-12 h-12 rounded-full flex items-center justify-center text-white hover:bg-white/10 transition-colors"
          >
            <svg className="w-6 h-6" fill="none" viewBox="0 0 24 24" stroke="currentColor">
              <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M11.933 12.8a1 1 0 000-1.6L6.6 7.2A1 1 0 005 8v8a1 1 0 001.6.8l5.333-4zM19.933 12.8a1 1 0 000-1.6l-5.333-4A1 1 0 0013 8v8a1 1 0 001.6.8l5.333-4z" />
            </svg>
          </button>
        </div>
      </div>

      {/* Bottom safe area */}
      <div className="h-8 relative z-10" />
    </div>
  );
}
