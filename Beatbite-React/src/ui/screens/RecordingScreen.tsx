/**
 * RecordingScreen - Record instruments one by one.
 *
 * Flow:
 * 1. Countdown synced to tempo (4-3-2-1-0)
 * 2. At "0", recording starts
 * 3. For drums: beatbox detection triggers drum sounds + records events
 *    OR tap the 4 drum pads for manual input
 * 4. For other instruments: previous tracks play back, user sings
 * 5. One stop button to end recording
 * 6. Recording saved, advance to next instrument
 */

import { useState, useEffect, useCallback, useRef } from 'react';
import { useSelectedBpm, useActiveBand, useAppStore } from '../../core/store';
import { useGuidedFlow } from '../../hooks/useGuidedFlow';
import { FlowHeader } from '../components/FlowHeader';
import { audioEngine } from '../../core/AudioEngine';
import { metronomeAudio } from '../../core/MetronomeAudio';
import { clsx } from 'clsx';
import { logger } from '../../core/utils/logger';

type RecordingPhase = 'ready' | 'countdown' | 'recording' | 'stopped';

// Instrument display names
const INSTRUMENT_CONFIG: Record<string, { name: string; color: string }> = {
  drums: { name: 'Drums', color: '#00ffff' },
  bass: { name: 'Bass', color: '#3b82f6' },
  guitar: { name: 'Guitar', color: '#22c55e' },
  piano: { name: 'Piano', color: '#f59e0b' },
  voice: { name: 'Voice', color: '#a855f7' },
};

// Drum pad configuration - 4 buttons in 2x2 grid
// Top row: Hi-Hat (closed), Open Hi-Hat
// Bottom row: Snare, Kick
const DRUM_PADS = [
  { id: 'hihat', name: 'Hi-Hat', color: '#f59e0b', bgColor: 'rgba(245, 158, 11, 0.15)' },
  { id: 'openhat', name: 'Open Hat', color: '#22c55e', bgColor: 'rgba(34, 197, 94, 0.15)' },
  { id: 'snare', name: 'Snare', color: '#3b82f6', bgColor: 'rgba(59, 130, 246, 0.15)' },
  { id: 'kick', name: 'Kick', color: '#ef4444', bgColor: 'rgba(239, 68, 68, 0.15)' },
] as const;

export function RecordingScreen() {
  const selectedBpm = useSelectedBpm();
  const activeBand = useActiveBand();
  const { advance, currentInstrument } = useGuidedFlow();
  const setRecordedDrumEvents = useAppStore((state) => state.setRecordedDrumEvents);

  // Get instrument from flow (derived from URL like record-drums -> drums)
  const instrument = currentInstrument;

  const [phase, setPhase] = useState<RecordingPhase>('ready');
  const [countdown, setCountdown] = useState<number | null>(null);
  const [currentBeat, setCurrentBeat] = useState(0);
  const [elapsedTime, setElapsedTime] = useState(0);
  const [isAudioReady, setIsAudioReady] = useState(false);
  const [activePad, setActivePad] = useState<string | null>(null);
  const [loopLengthMs, setLoopLengthMs] = useState(0);
  const [loopPosition, setLoopPosition] = useState(0); // 0-1 progress through loop

  // Valid drum kits for the synthesizer
  const validDrumKits = ['electronic', 'acoustic', 'jazz', 'vintage', 'rock'] as const;
  type ValidDrumKit = (typeof validDrumKits)[number];

  // Refs for timing
  const countdownRef = useRef<number | null>(null);
  const recordingStartTime = useRef<number>(0);
  const elapsedIntervalRef = useRef<ReturnType<typeof setInterval> | null>(null);
  const beatCallbackRef = useRef<((beat: number) => void) | null>(null);

  const config = instrument ? INSTRUMENT_CONFIG[instrument] : null;

  // Reset state when instrument changes (navigating between recording steps)
  useEffect(() => {
    setPhase('ready');
    setCountdown(null);
    setCurrentBeat(0);
    setElapsedTime(0);
    setActivePad(null);
    setLoopPosition(0);
    countdownRef.current = null;
    recordingStartTime.current = 0;
    if (elapsedIntervalRef.current) {
      clearInterval(elapsedIntervalRef.current);
      elapsedIntervalRef.current = null;
    }
    // Get loop length for melodic instruments (set after drum recording)
    if (instrument !== 'drums') {
      const length = audioEngine.getLoopLengthMs();
      setLoopLengthMs(length);
    }
  }, [instrument]);

  // Initialize audio - use audioEngine.startPassthrough() to set up full audio graph
  useEffect(() => {
    const initAudio = async () => {
      // Start passthrough to initialize mic, detectors, and synthesizers
      const started = await audioEngine.startPassthrough();
      if (started) {
        const ctx = audioEngine.getAudioContext();
        if (ctx) {
          // Initialize metronome for countdown
          metronomeAudio.initialize(ctx);
          metronomeAudio.setBpm(selectedBpm);

          // Set drum kit from band settings (filter to valid synth kits)
          if (activeBand && validDrumKits.includes(activeBand.drumKit as ValidDrumKit)) {
            audioEngine.setDrumKit(activeBand.drumKit as ValidDrumKit);
          }

          // Set callback for drum triggers (visual feedback for beatbox detection)
          audioEngine.setCallbacks({
            onDrumTriggered: (drum) => {
              setActivePad(drum);
              // Clear after a short delay
              setTimeout(() => setActivePad(null), 100);
            },
          });

          setIsAudioReady(true);
        }
      }
    };
    initAudio();

    return () => {
      metronomeAudio.stop();
      if (elapsedIntervalRef.current) {
        clearInterval(elapsedIntervalRef.current);
      }
      audioEngine.stopPassthrough();
    };
  }, [selectedBpm, activeBand]);

  // Handle beat callback for countdown and recording
  const handleBeat = useCallback(
    (beat: number) => {
      setCurrentBeat(beat);

      if (phase === 'countdown' && countdownRef.current !== null) {
        // Countdown: 4, 3, 2, 1, 0
        // We count down on each beat
        if (countdownRef.current > 0) {
          countdownRef.current -= 1;
          setCountdown(countdownRef.current);
        } else {
          // Countdown finished, start recording
          setCountdown(null);
          setPhase('recording');
          recordingStartTime.current = performance.now();

          // Start elapsed time counter
          elapsedIntervalRef.current = setInterval(() => {
            const elapsedMs = performance.now() - recordingStartTime.current;
            setElapsedTime(Math.floor(elapsedMs / 1000));

            // For melodic instruments, track loop position (0-1 progress)
            if (instrument !== 'drums') {
              const loopLen = audioEngine.getLoopLengthMs();
              if (loopLen > 0) {
                const positionInLoop = elapsedMs % loopLen;
                setLoopPosition(positionInLoop / loopLen);
              }
            }
          }, 50); // Update more frequently for smoother progress bar

          // Start recording based on instrument type
          // IMPORTANT: Set instrumentMode to 'off' to disable continuous pitch-to-instrument
          // triggering from startLevelMonitoring(). Recording uses dedicated detectors instead.
          audioEngine.setInstrumentMode('off');

          if (instrument === 'drums') {
            // For drums: enable beatbox detection recording
            audioEngine.setBeatboxEnabled(true);
            audioEngine.startVariableDrumRecording(selectedBpm);
          } else if (instrument === 'bass' || instrument === 'guitar' || instrument === 'piano') {
            // For melodic instruments: disable beatbox, play back layers, start pitch detection
            audioEngine.setBeatboxEnabled(false);
            audioEngine.startLooperPlayback();
            audioEngine.startMelodicEventRecording(instrument);
          } else if (instrument === 'voice') {
            // For voice: disable beatbox, play back layers, start audio recording
            audioEngine.setBeatboxEnabled(false);
            audioEngine.startLooperPlayback();
            audioEngine.startLayerRecording('voice');
          }
        }
      }
    },
    [phase, instrument, selectedBpm]
  );

  // Setup beat callback
  useEffect(() => {
    beatCallbackRef.current = handleBeat;
    metronomeAudio.setCallbacks({
      onBeat: (beat) => {
        if (beatCallbackRef.current) {
          beatCallbackRef.current(beat);
        }
      },
    });
  }, [handleBeat]);

  // Start recording flow
  const handleStart = useCallback(() => {
    if (!isAudioReady) return;

    // Initialize countdown
    countdownRef.current = 4;
    setCountdown(4);
    setPhase('countdown');
    setCurrentBeat(0);

    // Start metronome for countdown and recording
    metronomeAudio.start();
  }, [isAudioReady]);

  // Stop recording
  const handleStop = useCallback(() => {
    metronomeAudio.stop();

    if (elapsedIntervalRef.current) {
      clearInterval(elapsedIntervalRef.current);
      elapsedIntervalRef.current = null;
    }

    // Stop recording based on instrument type
    if (instrument === 'drums') {
      // For drums: stop beatbox recording and get events
      const result = audioEngine.stopVariableDrumRecording();
      logger.info(`[RecordingScreen] Drum recording stopped: ${result.events.length} events, ${result.bars} bars`);

      // Store the recorded events in app state
      setRecordedDrumEvents(result.events);
    } else if (instrument === 'bass' || instrument === 'guitar' || instrument === 'piano') {
      // For melodic instruments: stop pitch detection recording
      audioEngine.stopMelodicEventRecording();
      audioEngine.stopLooperPlayback();
      logger.info(`[RecordingScreen] ${instrument} melodic recording stopped`);
    } else if (instrument === 'voice') {
      // For voice: stop audio recording
      audioEngine.stopLayerRecording();
      audioEngine.stopLooperPlayback();
      logger.info('[RecordingScreen] Voice recording stopped');
    }

    // Advance to next instrument immediately
    advance();
  }, [advance, instrument, setRecordedDrumEvents]);

  // Handle drum pad tap (manual triggering)
  const handleDrumPadTap = useCallback(
    (drumId: string) => {
      if (phase !== 'recording' || instrument !== 'drums') return;

      // Visual feedback
      setActivePad(drumId);
      setTimeout(() => setActivePad(null), 100);

      // Trigger the drum sound through the audio engine's drum synthesizer
      const drumSynth = audioEngine.getDrumSynthesizer();
      if (drumSynth) {
        // Map pad IDs to drum types
        const drumTypeMap: Record<string, string> = {
          kick: 'kick',
          snare: 'snare',
          hihat: 'hihat',
          openhat: 'openhat',
        };
        const drumType = drumTypeMap[drumId] || drumId;
        drumSynth.trigger(drumType as import('../../core/DrumSynthesizer').DrumType, { volume: 0.9 });
      }
    },
    [phase, instrument]
  );

  // Format elapsed time
  const formatTime = (seconds: number) => {
    const mins = Math.floor(seconds / 60);
    const secs = seconds % 60;
    return `${mins}:${secs.toString().padStart(2, '0')}`;
  };

  if (!config || !instrument) {
    return null;
  }

  return (
    <div className="h-full w-full bg-[#050505] flex flex-col relative">
      <div className="bg-shader-gradient" />

      {/* Header */}
      <FlowHeader disableNavigation={phase === 'recording' || phase === 'countdown'} />

      {/* Main content */}
      <div className="flex-1 flex flex-col items-center justify-center relative z-10 px-6">
        {/* Ready phase - show start button */}
        {phase === 'ready' && (
          <>
            <div className="text-center mb-8">
              <div
                className="w-20 h-20 rounded-full mx-auto mb-4 flex items-center justify-center"
                style={{ backgroundColor: `${config.color}20`, border: `2px solid ${config.color}` }}
              >
                <span className="text-4xl font-bold" style={{ color: config.color }}>
                  {config.name.charAt(0)}
                </span>
              </div>
              <h2 className="text-2xl font-bold text-white font-mono mb-2">Record {config.name}</h2>
              <p className="text-[#666666] text-sm">
                {instrument === 'drums'
                  ? 'Beatbox or tap the pads to create your drum pattern'
                  : `Sing over your ${instrument === 'bass' ? 'drum' : 'recorded'} track`}
              </p>
            </div>

            <button
              onClick={handleStart}
              disabled={!isAudioReady}
              className={clsx(
                'w-32 h-32 rounded-full flex items-center justify-center transition-all',
                isAudioReady ? 'bg-[#00ffff] hover:bg-[#00cccc] active:scale-95' : 'bg-[#333333]'
              )}
            >
              <svg className="w-16 h-16 text-black" fill="currentColor" viewBox="0 0 24 24">
                <path d="M8 5v14l11-7z" />
              </svg>
            </button>

            <p className="mt-6 text-[#666666] text-sm font-mono">
              {isAudioReady ? 'Tap to start' : 'Initializing audio...'}
            </p>
          </>
        )}

        {/* Countdown phase */}
        {phase === 'countdown' && countdown !== null && (
          <div className="text-center">
            <div
              className={clsx(
                'text-[200px] font-bold font-mono leading-none transition-transform',
                countdown === 0 ? 'scale-125' : ''
              )}
              style={{ color: countdown === 0 ? config.color : '#ffffff' }}
            >
              {countdown}
            </div>
            <p className="text-[#666666] text-sm font-mono mt-4">Get ready...</p>
          </div>
        )}

        {/* Recording phase */}
        {phase === 'recording' && (
          <div className="flex-1 flex flex-col w-full">
            {/* Top section: Beat indicators + REC timer */}
            <div className="pt-2 pb-4">
              {/* Beat indicator */}
              <div className="flex justify-center gap-4 mb-3">
                {[0, 1, 2, 3].map((beat) => (
                  <div
                    key={beat}
                    className={clsx(
                      'w-5 h-5 rounded-full transition-all',
                      currentBeat === beat ? 'scale-125' : 'bg-[#333333]'
                    )}
                    style={{
                      backgroundColor: currentBeat === beat ? config.color : '#333333',
                      boxShadow: currentBeat === beat ? `0 0 20px ${config.color}` : 'none',
                    }}
                  />
                ))}
              </div>

              {/* Recording indicator */}
              <div className="flex items-center justify-center gap-3">
                <div className="w-3 h-3 rounded-full bg-red-500 animate-pulse" />
                <span className="text-white font-mono text-base">REC</span>
                {instrument === 'drums' ? (
                  <span className="text-[#666666] font-mono text-base">{formatTime(elapsedTime)}</span>
                ) : (
                  <span className="text-[#666666] font-mono text-base">
                    {formatTime(Math.floor((loopPosition * loopLengthMs) / 1000))} / {formatTime(Math.floor(loopLengthMs / 1000))}
                  </span>
                )}
              </div>

              {/* Progress bar for melodic instruments */}
              {instrument !== 'drums' && loopLengthMs > 0 && (
                <div className="mt-3 mx-8">
                  <div className="h-2 bg-[#222222] rounded-full overflow-hidden">
                    <div
                      className="h-full rounded-full transition-all duration-100"
                      style={{
                        width: `${loopPosition * 100}%`,
                        backgroundColor: config.color,
                        boxShadow: `0 0 10px ${config.color}`,
                      }}
                    />
                  </div>
                </div>
              )}
            </div>

            {/* Middle section: Drum pads (for drums) or other content */}
            <div className="flex-1 flex items-center justify-center px-4">
              {instrument === 'drums' ? (
                /* 2x2 Drum pad grid */
                <div className="grid grid-cols-2 gap-4 w-full max-w-md aspect-square">
                  {DRUM_PADS.map((pad) => (
                    <button
                      key={pad.id}
                      onPointerDown={() => handleDrumPadTap(pad.id)}
                      className={clsx(
                        'rounded-2xl flex flex-col items-center justify-center transition-all',
                        'active:scale-95 touch-none select-none',
                        activePad === pad.id ? 'scale-95' : ''
                      )}
                      style={{
                        backgroundColor: activePad === pad.id ? pad.color : pad.bgColor,
                        border: `2px solid ${pad.color}`,
                        boxShadow: activePad === pad.id ? `0 0 30px ${pad.color}` : 'none',
                      }}
                    >
                      <span className="text-lg font-bold font-mono uppercase" style={{ color: pad.color }}>
                        {pad.name}
                      </span>
                    </button>
                  ))}
                </div>
              ) : (
                /* For other instruments: show waveform/level indicator */
                <div className="text-center">
                  <div
                    className="w-32 h-32 rounded-full mx-auto mb-4 flex items-center justify-center animate-pulse"
                    style={{ backgroundColor: `${config.color}20`, border: `2px solid ${config.color}` }}
                  >
                    <span className="text-4xl font-bold" style={{ color: config.color }}>
                      {config.name.charAt(0)}
                    </span>
                  </div>
                  <p className="text-[#666666] text-sm font-mono">
                    {instrument === 'voice' ? 'Sing now...' : 'Play now...'}
                  </p>
                </div>
              )}
            </div>

            {/* Bottom section: Stop button (pill-shaped) */}
            <div className="pb-8 pt-4 px-6">
              <button
                onClick={handleStop}
                className="w-full h-16 rounded-full bg-red-600 hover:bg-red-500 active:scale-[0.98] transition-all flex items-center justify-center gap-3"
              >
                <div className="w-5 h-5 rounded-sm bg-white" />
                <span className="text-white font-mono font-bold text-lg">STOP</span>
              </button>
            </div>
          </div>
        )}

      </div>
    </div>
  );
}
