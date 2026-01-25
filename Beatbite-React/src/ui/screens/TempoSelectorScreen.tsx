import { useState, useEffect, useCallback, useRef } from 'react';
import { metronomeAudio } from '../../core/MetronomeAudio';
import { audioEngine } from '../../core/AudioEngine';
import { useAppStore, useSelectedBpm } from '../../core/store';
import { useGuidedFlow } from '../../hooks/useGuidedFlow';
import { ActiveBandHeader } from '../components/ActiveBandHeader';
import { clsx } from 'clsx';

/**
 * TempoSelectorScreen allows the user to select a tempo before recording.
 *
 * Features:
 * - Large BPM display
 * - Horizontal drag/swipe to adjust tempo (60-200 BPM)
 * - Visual beat indicator (4 dots)
 * - Audible metronome clicks
 * - Confirm button to proceed
 *
 * Used in both standalone mode (old flow with props) and guided flow mode (no props).
 */

interface TempoSelectorScreenProps {
  audioContext?: AudioContext | null;
  onTempoConfirmed?: () => void;
}

export function TempoSelectorScreen({ audioContext: propAudioContext, onTempoConfirmed }: TempoSelectorScreenProps = {}) {
  const selectedBpm = useSelectedBpm();
  const { setSelectedBpm, confirmTempo, setCurrentMetronomeBeat } = useAppStore();
  const { goToStep, advance, exit } = useGuidedFlow();

  // Use prop audioContext if provided, otherwise get from audioEngine
  const [audioContext, setAudioContext] = useState<AudioContext | null>(propAudioContext || null);

  // Initialize audio context if not provided via props (guided flow mode)
  useEffect(() => {
    if (!propAudioContext) {
      const initAudio = async () => {
        const initialized = await audioEngine.initialize();
        if (initialized) {
          setAudioContext(audioEngine.getAudioContext());
        }
      };
      initAudio();
    }
  }, [propAudioContext]);

  const [currentBeat, setCurrentBeat] = useState(0);
  const [isMetronomePlaying, setIsMetronomePlaying] = useState(false);
  const [isDragging, setIsDragging] = useState(false);
  const dragStartX = useRef(0);
  const dragStartBpm = useRef(selectedBpm);

  // Initialize metronome when audio context is available
  useEffect(() => {
    if (audioContext) {
      metronomeAudio.initialize(audioContext);
      metronomeAudio.setCallbacks({
        onBeat: (beat, _isDownbeat) => {
          setCurrentBeat(beat);
          setCurrentMetronomeBeat(beat);
        },
      });
    }

    return () => {
      metronomeAudio.stop();
    };
  }, [audioContext, setCurrentMetronomeBeat]);

  // Update metronome BPM when selected BPM changes
  useEffect(() => {
    metronomeAudio.setBpm(selectedBpm);
  }, [selectedBpm]);

  // Toggle metronome playback
  const toggleMetronome = useCallback(() => {
    if (isMetronomePlaying) {
      metronomeAudio.stop();
      setIsMetronomePlaying(false);
    } else {
      metronomeAudio.start();
      setIsMetronomePlaying(true);
    }
  }, [isMetronomePlaying]);

  // Handle drag to adjust tempo
  const handleDragStart = useCallback((clientX: number) => {
    setIsDragging(true);
    dragStartX.current = clientX;
    dragStartBpm.current = selectedBpm;
  }, [selectedBpm]);

  const handleDragMove = useCallback((clientX: number) => {
    if (!isDragging) return;

    const delta = clientX - dragStartX.current;
    // 2 pixels per BPM change
    const bpmDelta = Math.round(delta / 2);
    const newBpm = Math.max(60, Math.min(200, dragStartBpm.current + bpmDelta));
    setSelectedBpm(newBpm);
  }, [isDragging, setSelectedBpm]);

  const handleDragEnd = useCallback(() => {
    setIsDragging(false);
  }, []);

  // Mouse event handlers
  const handleMouseDown = useCallback((e: React.MouseEvent) => {
    e.preventDefault();
    handleDragStart(e.clientX);
  }, [handleDragStart]);

  const handleMouseMove = useCallback((e: React.MouseEvent) => {
    handleDragMove(e.clientX);
  }, [handleDragMove]);

  const handleMouseUp = useCallback(() => {
    handleDragEnd();
  }, [handleDragEnd]);

  // Touch event handlers
  const handleTouchStart = useCallback((e: React.TouchEvent) => {
    handleDragStart(e.touches[0].clientX);
  }, [handleDragStart]);

  const handleTouchMove = useCallback((e: React.TouchEvent) => {
    handleDragMove(e.touches[0].clientX);
  }, [handleDragMove]);

  const handleTouchEnd = useCallback(() => {
    handleDragEnd();
  }, [handleDragEnd]);

  // Handle confirm
  const handleConfirm = useCallback(() => {
    metronomeAudio.stop();
    setIsMetronomePlaying(false);
    confirmTempo();

    // Set tempo in audio engine
    audioEngine.setTempo(selectedBpm, 4, 4);

    // If callback provided (standalone mode), call it
    if (onTempoConfirmed) {
      onTempoConfirmed();
    } else {
      // Guided flow mode - advance to next step (drums recording)
      advance();
    }
  }, [confirmTempo, onTempoConfirmed, selectedBpm, advance]);

  // Handle back (for guided flow mode)
  const handleBack = useCallback(() => {
    metronomeAudio.stop();
    setIsMetronomePlaying(false);
    // Go back to band selection
    goToStep('band-select');
  }, [goToStep]);

  // Handle exit (close button)
  const handleExit = useCallback(() => {
    metronomeAudio.stop();
    setIsMetronomePlaying(false);
    exit();
  }, [exit]);

  // Adjust BPM with buttons
  const adjustBpm = useCallback((delta: number) => {
    setSelectedBpm(Math.max(60, Math.min(200, selectedBpm + delta)));
  }, [selectedBpm, setSelectedBpm]);

  // Global mouse/touch handlers for drag
  useEffect(() => {
    if (!isDragging) return;

    const handleGlobalMouseMove = (e: MouseEvent) => {
      handleDragMove(e.clientX);
    };

    const handleGlobalMouseUp = () => {
      handleDragEnd();
    };

    const handleGlobalTouchMove = (e: TouchEvent) => {
      handleDragMove(e.touches[0].clientX);
    };

    const handleGlobalTouchEnd = () => {
      handleDragEnd();
    };

    document.addEventListener('mousemove', handleGlobalMouseMove);
    document.addEventListener('mouseup', handleGlobalMouseUp);
    document.addEventListener('touchmove', handleGlobalTouchMove);
    document.addEventListener('touchend', handleGlobalTouchEnd);

    return () => {
      document.removeEventListener('mousemove', handleGlobalMouseMove);
      document.removeEventListener('mouseup', handleGlobalMouseUp);
      document.removeEventListener('touchmove', handleGlobalTouchMove);
      document.removeEventListener('touchend', handleGlobalTouchEnd);
    };
  }, [isDragging, handleDragMove, handleDragEnd]);

  // Check if in guided flow mode (no callback means guided flow)
  const isGuidedFlowMode = !onTempoConfirmed;

  return (
    <div className="h-full w-full bg-black flex flex-col select-none relative">
      {/* Band header (only in guided flow mode) */}
      {isGuidedFlowMode && <ActiveBandHeader />}

      {/* Main content */}
      <div className="flex-1 flex flex-col items-center justify-center relative">
        {/* Navigation buttons (only in guided flow mode) */}
        {isGuidedFlowMode && (
          <>
            {/* Back button */}
            <button
              className="absolute top-4 left-4 p-2 text-white/50 hover:text-white transition-colors"
              onClick={handleBack}
            >
              <svg className="w-6 h-6" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M15 19l-7-7 7-7" />
              </svg>
            </button>
            {/* Close button */}
            <button
              className="absolute top-4 right-4 p-2 text-white/50 hover:text-white transition-colors"
              onClick={handleExit}
            >
              <svg className="w-6 h-6" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M6 18L18 6M6 6l12 12" />
              </svg>
            </button>
          </>
        )}

        {/* Title */}
        <div className="text-white/50 text-sm uppercase tracking-widest mb-8">
          Set Your Tempo
        </div>

        {/* BPM Display - draggable area */}
        <div
          className={clsx(
            "relative cursor-ew-resize px-16 py-8 rounded-2xl transition-colors",
            isDragging ? "bg-purple-900/30" : "hover:bg-white/5"
          )}
          onMouseDown={handleMouseDown}
          onMouseMove={handleMouseMove}
          onMouseUp={handleMouseUp}
          onTouchStart={handleTouchStart}
          onTouchMove={handleTouchMove}
          onTouchEnd={handleTouchEnd}
        >
          {/* Drag hint arrows */}
          <div className="absolute left-2 top-1/2 -translate-y-1/2 text-white/20">
            <svg className="w-6 h-6" fill="none" viewBox="0 0 24 24" stroke="currentColor">
              <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M15 19l-7-7 7-7" />
            </svg>
          </div>
          <div className="absolute right-2 top-1/2 -translate-y-1/2 text-white/20">
            <svg className="w-6 h-6" fill="none" viewBox="0 0 24 24" stroke="currentColor">
              <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M9 5l7 7-7 7" />
            </svg>
          </div>

          {/* Large BPM number */}
          <div className="text-center">
            <div className="text-8xl font-bold text-white tabular-nums">
              {selectedBpm}
            </div>
            <div className="text-lg text-white/50 mt-2">BPM</div>
          </div>
        </div>

        {/* Fine adjustment buttons */}
        <div className="flex items-center gap-4 mt-6">
          <button
            className="w-12 h-12 rounded-full bg-white/10 hover:bg-white/20 flex items-center justify-center text-white transition-colors"
            onClick={() => adjustBpm(-5)}
          >
            <span className="text-lg font-bold">-5</span>
          </button>
          <button
            className="w-10 h-10 rounded-full bg-white/10 hover:bg-white/20 flex items-center justify-center text-white transition-colors"
            onClick={() => adjustBpm(-1)}
          >
            <span className="text-sm font-bold">-1</span>
          </button>
          <button
            className="w-10 h-10 rounded-full bg-white/10 hover:bg-white/20 flex items-center justify-center text-white transition-colors"
            onClick={() => adjustBpm(1)}
          >
            <span className="text-sm font-bold">+1</span>
          </button>
          <button
            className="w-12 h-12 rounded-full bg-white/10 hover:bg-white/20 flex items-center justify-center text-white transition-colors"
            onClick={() => adjustBpm(5)}
          >
            <span className="text-lg font-bold">+5</span>
          </button>
        </div>

        {/* BPM range indicator */}
        <div className="mt-4 text-white/30 text-xs">
          60 — 200 BPM
        </div>

        {/* Beat indicator */}
        <div className="flex items-center gap-3 mt-10">
          {[0, 1, 2, 3].map((beat) => (
            <div
              key={beat}
              className={clsx(
                "rounded-full transition-all duration-75",
                beat === 0 ? "w-5 h-5" : "w-4 h-4",
                isMetronomePlaying && currentBeat === beat
                  ? beat === 0
                    ? "bg-purple-500 scale-125"
                    : "bg-purple-400 scale-110"
                  : beat === 0
                    ? "bg-white/40"
                    : "bg-white/20"
              )}
            />
          ))}
        </div>

        {/* Metronome toggle */}
        <button
          className={clsx(
            "mt-8 px-8 py-3 rounded-full flex items-center gap-3 transition-all",
            isMetronomePlaying
              ? "bg-purple-600 text-white"
              : "bg-white/10 text-white/70 hover:bg-white/20"
          )}
          onClick={toggleMetronome}
        >
          {isMetronomePlaying ? (
            <>
              <svg className="w-5 h-5" fill="currentColor" viewBox="0 0 24 24">
                <rect x="6" y="4" width="4" height="16" rx="1" />
                <rect x="14" y="4" width="4" height="16" rx="1" />
              </svg>
              <span className="font-medium">Stop</span>
            </>
          ) : (
            <>
              <svg className="w-5 h-5" fill="currentColor" viewBox="0 0 24 24">
                <path d="M8 5v14l11-7z" />
              </svg>
              <span className="font-medium">Listen</span>
            </>
          )}
        </button>

        {/* Confirm button */}
        <button
          className="mt-8 px-12 py-4 bg-green-600 hover:bg-green-500 rounded-full text-white font-semibold text-lg transition-colors"
          onClick={handleConfirm}
        >
          Confirm Tempo
        </button>

        {/* Tip */}
        <div className="mt-8 text-white/30 text-xs text-center px-8">
          Drag left/right to adjust tempo, or use the buttons for fine control.
          <br />
          Tap "Listen" to hear the beat before confirming.
        </div>
      </div>
    </div>
  );
}
