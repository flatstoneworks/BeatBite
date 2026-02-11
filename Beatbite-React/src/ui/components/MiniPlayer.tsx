/**
 * MiniPlayer - Spotify-style mini player for song playback.
 *
 * Shows at the bottom of the screen when a song is playing.
 * Tapping opens the full-screen player.
 *
 * Supports both audio layers and event-based layers:
 * - Audio layers: played via Web Audio API AudioBuffer
 * - Event layers: played via synthesizers (DrumEventPlayer, MelodicEventPlayer)
 */

import { useEffect, useRef, useCallback } from 'react';
import { useAppStore, usePlayback } from '../../core/store';
import { libraryStorage, LibraryStorage, type SerializedLayer } from '../../core/LibraryStorage';
import { drumSynthesizer } from '../../core/DrumSynthesizer';
import { bassSynthesizer, guitarSynthesizer, pianoSynthesizer } from '../../core/synthesizers';
import { drumEventPlayer } from '../../core/DrumEventPlayer';
import { bassEventPlayer, guitarEventPlayer, pianoEventPlayer } from '../../core/MelodicEventPlayer';
import { clsx } from 'clsx';

export function MiniPlayer() {
  const playback = usePlayback();
  const {
    pausePlayback,
    resumePlayback,
    stopPlayback,
    setPlaybackPosition,
    openFullScreenPlayer,
  } = useAppStore();

  const audioContextRef = useRef<AudioContext | null>(null);
  const audioSourceRef = useRef<AudioBufferSourceNode | null>(null);
  const startTimeRef = useRef<number>(0);
  const pausedAtRef = useRef<number>(0);
  const animationFrameRef = useRef<number | null>(null);
  const layersRef = useRef<SerializedLayer[]>([]);
  const loopLengthMsRef = useRef<number>(0);

  // Format time as mm:ss
  const formatTime = (ms: number) => {
    const totalSeconds = Math.floor(ms / 1000);
    const minutes = Math.floor(totalSeconds / 60);
    const seconds = totalSeconds % 60;
    return `${minutes}:${seconds.toString().padStart(2, '0')}`;
  };

  // Progress percentage
  const progress = playback.duration > 0
    ? (playback.currentPosition / playback.duration) * 100
    : 0;

  // Update position during playback
  const updatePosition = useCallback(() => {
    if (!audioContextRef.current || !playback.isPlaying) return;

    const elapsed = (audioContextRef.current.currentTime - startTimeRef.current) * 1000;
    const newPosition = pausedAtRef.current + elapsed;

    if (newPosition >= playback.duration) {
      // Song finished
      stopPlayback();
      return;
    }

    setPlaybackPosition(newPosition);
    animationFrameRef.current = requestAnimationFrame(updatePosition);
  }, [playback.isPlaying, playback.duration, setPlaybackPosition, stopPlayback]);

  // Initialize synthesizers
  const initializeSynthesizers = useCallback((ctx: AudioContext) => {
    // Initialize drum synthesizer
    drumSynthesizer.initialize(ctx);

    // Initialize melodic synthesizers
    bassSynthesizer.initialize(ctx);
    guitarSynthesizer.initialize(ctx);
    pianoSynthesizer.initialize(ctx);

    // Initialize event players
    drumEventPlayer.initialize(ctx);
    bassEventPlayer.initialize(ctx);
    guitarEventPlayer.initialize(ctx);
    pianoEventPlayer.initialize(ctx);
  }, []);

  // Stop all event players
  const stopAllEventPlayers = useCallback(() => {
    drumEventPlayer.stop();
    bassEventPlayer.stop();
    guitarEventPlayer.stop();
    pianoEventPlayer.stop();
  }, []);

  // Start playback of event layers
  const startEventLayers = useCallback((layers: SerializedLayer[], loopLengthMs: number, startTime: number) => {
    for (const layer of layers) {
      if (layer.kind === 'drum_events' && layer.drumEvents && layer.drumEvents.length > 0) {
        drumEventPlayer.loadEvents(layer.drumEvents, loopLengthMs);
        drumEventPlayer.setVolume(layer.muted ? 0 : layer.volume);
        drumEventPlayer.start(startTime);
        console.log(`[MiniPlayer] Started drum events: ${layer.drumEvents.length} events`);
      }

      if (layer.kind === 'bass_events' && layer.bassEvents && layer.bassEvents.length > 0) {
        bassEventPlayer.loadBassEvents(layer.bassEvents, loopLengthMs);
        bassEventPlayer.setVolume(layer.muted ? 0 : layer.volume);
        bassEventPlayer.start(startTime);
        console.log(`[MiniPlayer] Started bass events: ${layer.bassEvents.length} events`);
      }

      if (layer.kind === 'guitar_events' && layer.guitarEvents && layer.guitarEvents.length > 0) {
        guitarEventPlayer.loadGuitarEvents(layer.guitarEvents, loopLengthMs);
        guitarEventPlayer.setVolume(layer.muted ? 0 : layer.volume);
        guitarEventPlayer.start(startTime);
        console.log(`[MiniPlayer] Started guitar events: ${layer.guitarEvents.length} events`);
      }

      if (layer.kind === 'piano_events' && layer.pianoEvents && layer.pianoEvents.length > 0) {
        pianoEventPlayer.loadPianoEvents(layer.pianoEvents, loopLengthMs);
        pianoEventPlayer.setVolume(layer.muted ? 0 : layer.volume);
        pianoEventPlayer.start(startTime);
        console.log(`[MiniPlayer] Started piano events: ${layer.pianoEvents.length} events`);
      }
    }
  }, []);

  // Load and play song when currentSongId changes
  useEffect(() => {
    if (!playback.currentSongId || !playback.isPlaying) return;

    const loadAndPlay = async () => {
      try {
        // Get full song data
        const song = await libraryStorage.getSong(playback.currentSongId!);
        if (!song || song.layers.length === 0) {
          console.warn('[MiniPlayer] No song data found');
          return;
        }

        // Create audio context if needed
        if (!audioContextRef.current) {
          audioContextRef.current = new AudioContext();
          initializeSynthesizers(audioContextRef.current);
        }

        const ctx = audioContextRef.current;

        // Resume context if suspended
        if (ctx.state === 'suspended') {
          await ctx.resume();
        }

        // Store layers and loop length for playback
        layersRef.current = song.layers;
        loopLengthMsRef.current = song.duration;

        // Check if there are any audio layers with actual audio data
        const audioLayerWithData = song.layers.find(l =>
          (l.kind === 'audio' || !l.kind) && l.audioData
        );

        // Check if there are event-based layers
        const hasEventLayers = song.layers.some(l =>
          (l.kind === 'drum_events' && l.drumEvents && l.drumEvents.length > 0) ||
          (l.kind === 'bass_events' && l.bassEvents && l.bassEvents.length > 0) ||
          (l.kind === 'guitar_events' && l.guitarEvents && l.guitarEvents.length > 0) ||
          (l.kind === 'piano_events' && l.pianoEvents && l.pianoEvents.length > 0)
        );

        // Stop any existing playback
        if (audioSourceRef.current) {
          audioSourceRef.current.stop();
          audioSourceRef.current.disconnect();
        }
        stopAllEventPlayers();

        // Start offset (for resuming)
        const offset = pausedAtRef.current / 1000;
        startTimeRef.current = ctx.currentTime;

        // Play audio layers (if any)
        if (audioLayerWithData?.audioData) {
          const audioBuffer = LibraryStorage.deserializeAudioBuffer(
            audioLayerWithData.audioData,
            ctx
          );

          // Create and connect source
          const source = ctx.createBufferSource();
          source.buffer = audioBuffer;
          source.connect(ctx.destination);

          // Start from paused position
          source.start(0, offset);
          audioSourceRef.current = source;

          // Handle song end
          source.onended = () => {
            if (playback.isPlaying) {
              stopPlayback();
            }
          };

          console.log('[MiniPlayer] Started audio layer playback');
        }

        // Play event-based layers
        if (hasEventLayers) {
          const playbackStartTime = ctx.currentTime + 0.05; // Small buffer for sync
          startEventLayers(song.layers, song.duration, playbackStartTime);
        }

        // Start position updates
        animationFrameRef.current = requestAnimationFrame(updatePosition);

        console.log('[MiniPlayer] Song playback started:', {
          hasAudio: !!audioLayerWithData,
          hasEvents: hasEventLayers,
          duration: song.duration,
          layerCount: song.layers.length,
        });

      } catch (error) {
        console.error('[MiniPlayer] Error loading song:', error);
      }
    };

    loadAndPlay();

    return () => {
      if (animationFrameRef.current) {
        cancelAnimationFrame(animationFrameRef.current);
      }
    };
  }, [playback.currentSongId, playback.isPlaying, updatePosition, stopPlayback, initializeSynthesizers, stopAllEventPlayers, startEventLayers]);

  // Handle pause/resume
  useEffect(() => {
    if (!audioContextRef.current) return;

    if (!playback.isPlaying) {
      // Pause: store current position and stop
      pausedAtRef.current = playback.currentPosition;

      // Stop audio source
      if (audioSourceRef.current) {
        audioSourceRef.current.stop();
        audioSourceRef.current.disconnect();
        audioSourceRef.current = null;
      }

      // Stop event players
      stopAllEventPlayers();

      if (animationFrameRef.current) {
        cancelAnimationFrame(animationFrameRef.current);
      }
    }
  }, [playback.isPlaying, playback.currentPosition, stopAllEventPlayers]);

  // Cleanup on unmount
  useEffect(() => {
    return () => {
      if (audioSourceRef.current) {
        audioSourceRef.current.stop();
        audioSourceRef.current.disconnect();
      }
      if (animationFrameRef.current) {
        cancelAnimationFrame(animationFrameRef.current);
      }
      stopAllEventPlayers();
      if (audioContextRef.current) {
        audioContextRef.current.close();
      }
    };
  }, [stopAllEventPlayers]);

  // Reset paused position when song changes
  useEffect(() => {
    pausedAtRef.current = 0;
  }, [playback.currentSongId]);

  // Handle play/pause toggle
  const handlePlayPause = (e: React.MouseEvent) => {
    e.stopPropagation();
    if (playback.isPlaying) {
      pausePlayback();
    } else {
      resumePlayback();
    }
  };

  // Handle close
  const handleClose = (e: React.MouseEvent) => {
    e.stopPropagation();
    stopPlayback();
  };

  // Don't render if no song
  if (!playback.currentSong) {
    return null;
  }

  return (
    <div
      onClick={openFullScreenPlayer}
      className="fixed bottom-16 left-0 right-0 z-40 px-2 cursor-pointer"
    >
      <div className="bg-[#0a0a0a] border border-[#1a1a1a] rounded-xl shadow-2xl overflow-hidden">
        {/* Progress bar */}
        <div className="h-1 bg-[#1a1a1a] relative">
          <div
            className="absolute left-0 top-0 h-full bg-gradient-to-r from-[#00ffff] to-[#ff00ff] transition-all duration-100"
            style={{ width: `${progress}%` }}
          />
        </div>

        <div className="flex items-center gap-3 p-3">
          {/* Album art placeholder */}
          <div className="w-12 h-12 rounded-lg bg-gradient-to-br from-[#00ffff]/20 to-[#ff00ff]/20 flex items-center justify-center flex-shrink-0">
            <svg className="w-6 h-6 text-[#00ffff]" fill="currentColor" viewBox="0 0 24 24">
              <path d="M12 3v10.55c-.59-.34-1.27-.55-2-.55-2.21 0-4 1.79-4 4s1.79 4 4 4 4-1.79 4-4V7h4V3h-6z" />
            </svg>
          </div>

          {/* Song info */}
          <div className="flex-1 min-w-0">
            <h3 className="text-white font-mono text-sm font-bold truncate">
              {playback.currentSong.name}
            </h3>
            <div className="flex items-center gap-2 text-xs text-[#888888] font-mono">
              <span>{playback.currentSong.bpm} BPM</span>
              <span className="text-[#444444]">|</span>
              <span>{formatTime(playback.currentPosition)} / {formatTime(playback.duration)}</span>
            </div>
          </div>

          {/* Controls */}
          <div className="flex items-center gap-2 flex-shrink-0">
            {/* Play/Pause */}
            <button
              onClick={handlePlayPause}
              className={clsx(
                "w-10 h-10 rounded-full flex items-center justify-center transition-all",
                "bg-[#00ffff] hover:bg-[#00e5e5] active:scale-95"
              )}
            >
              {playback.isPlaying ? (
                <svg className="w-5 h-5 text-black" fill="currentColor" viewBox="0 0 24 24">
                  <rect x="6" y="4" width="4" height="16" rx="1" />
                  <rect x="14" y="4" width="4" height="16" rx="1" />
                </svg>
              ) : (
                <svg className="w-5 h-5 text-black ml-0.5" fill="currentColor" viewBox="0 0 24 24">
                  <path d="M8 5v14l11-7z" />
                </svg>
              )}
            </button>

            {/* Close */}
            <button
              onClick={handleClose}
              className="w-8 h-8 rounded-full flex items-center justify-center text-[#666666] hover:text-white hover:bg-[#1a1a1a] transition-colors"
            >
              <svg className="w-4 h-4" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M6 18L18 6M6 6l12 12" />
              </svg>
            </button>
          </div>
        </div>
      </div>
    </div>
  );
}
