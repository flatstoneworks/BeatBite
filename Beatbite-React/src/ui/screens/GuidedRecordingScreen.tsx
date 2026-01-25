import { useState, useEffect, useCallback, useRef } from 'react';
import { useParams, useNavigate } from 'react-router-dom';
import { audioEngine } from '../../core/AudioEngine';
import { metronomeAudio } from '../../core/MetronomeAudio';
import { useAppStore, useLayers, useTransport, useLayerRecordingState, useSelectedBpm, usePitch, useCurrentDrum, useBass, useGuitar, usePiano, useInstrumentSetup } from '../../core/store';
import { AudioVisualizer } from '../components/AudioVisualizer';
import { DrumIndicator } from '../components/DrumIndicator';
import { BassIndicator } from '../components/BassIndicator';
import { GuitarIndicator } from '../components/GuitarIndicator';
import { PianoIndicator } from '../components/PianoIndicator';
import { EffectsPanel } from '../components/EffectsPanel';
import { ActiveBandHeader } from '../components/ActiveBandHeader';
import { clsx } from 'clsx';
import type { InstrumentMode } from '../../types';
import type { EffectType, VoiceEffectsState } from '../../core/VoiceEffects';
import { libraryStorage, LibraryStorage } from '../../core/LibraryStorage';

/**
 * GuidedRecordingScreen - New event-based recording flow.
 *
 * Key principles:
 * - ONE vocal sound = ONE instrument hit (no continuous pitch following)
 * - Variable loop length: User decides when drum loop stops, quantized to 4-bar boundary
 * - Recording sequence: DRUMS → BASS → GUITAR → PIANO → VOICE → SAVE
 * - Dual format saving: Raw events AND WAV output
 */

type RecordingStep = 'drums' | 'bass' | 'guitar' | 'piano' | 'voice' | 'complete';

const STEP_CONFIG: Record<RecordingStep, {
  label: string;
  recordingLabel: string;
  instruction: string;
  instrumentMode: InstrumentMode;
}> = {
  drums: {
    label: 'CREATE YOUR BEAT',
    recordingLabel: 'RECORDING BEAT...',
    instruction: 'Beatbox into the mic. Press STOP when your loop is complete.',
    instrumentMode: 'drums',
  },
  bass: {
    label: 'ADD THE BASS',
    recordingLabel: 'RECORDING BASS...',
    instruction: 'Hum low notes. Each sound triggers one bass note.',
    instrumentMode: 'bass',
  },
  guitar: {
    label: 'ADD THE GUITAR',
    recordingLabel: 'RECORDING GUITAR...',
    instruction: 'Sing melodic phrases. Each sound triggers one guitar note.',
    instrumentMode: 'guitar',
  },
  piano: {
    label: 'ADD THE PIANO',
    recordingLabel: 'RECORDING PIANO...',
    instruction: 'Sing melodies. Each sound triggers one piano note.',
    instrumentMode: 'piano',
  },
  voice: {
    label: 'RECORD YOUR VOICE',
    recordingLabel: 'RECORDING VOICE...',
    instruction: 'Sing or rap over your track. This records your actual voice.',
    instrumentMode: 'off',
  },
  complete: {
    label: 'YOUR SONG IS READY!',
    recordingLabel: '',
    instruction: 'Save, share, or keep working on your creation.',
    instrumentMode: 'off',
  },
};

export function GuidedRecordingScreen() {
  // Get current step from URL
  const { step: urlStep } = useParams<{ step: string }>();
  const navigate = useNavigate();

  const [hasPermission, setHasPermission] = useState<boolean | null>(null);
  const [isInitializing, setIsInitializing] = useState(false);
  const [inputLevel, setInputLevel] = useState(0);
  const [currentBeat, setCurrentBeat] = useState(0);
  const [voiceEffects, setVoiceEffects] = useState<VoiceEffectsState | null>(null);
  const [elapsedTime, setElapsedTime] = useState(0);
  const [loopInfo, setLoopInfo] = useState<{ bars: number; bpm: number } | null>(null);
  const [isRecordingDrums, setIsRecordingDrums] = useState(false);
  const [isRecordingMelodic, setIsRecordingMelodic] = useState(false);

  // Derive current step from URL parameter
  const currentStep = (urlStep as RecordingStep) || 'drums';

  const prevLayerCountRef = useRef(0);
  const elapsedIntervalRef = useRef<number | null>(null);

  const transport = useTransport();
  const layers = useLayers();
  const { state: recordingState } = useLayerRecordingState();
  const selectedBpm = useSelectedBpm();
  const pitch = usePitch();
  const currentDrum = useCurrentDrum();
  const bass = useBass();
  const guitar = useGuitar();
  const piano = usePiano();
  const instrumentSetup = useInstrumentSetup();

  const {
    error,
    setPassthroughActive,
    setTransport,
    setLayers,
    setLayerRecordingState,
    setError,
    clearError,
    addSongToLibrary,
  } = useAppStore();

  const stepConfig = STEP_CONFIG[currentStep];
  const isRecording = isRecordingDrums || isRecordingMelodic || recordingState === 'recording';
  const isWaiting = recordingState === 'waiting';
  const isBusy = isRecording || isWaiting;

  // Initialize audio engine
  useEffect(() => {
    const init = async () => {
      setIsInitializing(true);
      clearError();

      audioEngine.setCallbacks({
        onLevelChanged: setInputLevel,
        onError: setError,
        onStateChanged: setPassthroughActive,
        onTransportUpdate: setTransport,
        onLayersChanged: setLayers,
        onLayerRecordingStateChanged: setLayerRecordingState,
      });

      const initialized = await audioEngine.initialize();
      if (!initialized) {
        setError('Failed to initialize audio engine');
        setIsInitializing(false);
        return;
      }

      const permitted = await audioEngine.requestPermission();
      setHasPermission(permitted);

      if (permitted) {
        await audioEngine.startPassthrough();
      }

      setIsInitializing(false);
    };

    init();

    return () => {
      metronomeAudio.stop();
      if (elapsedIntervalRef.current) {
        clearInterval(elapsedIntervalRef.current);
      }
      audioEngine.dispose();
    };
  }, [setPassthroughActive, setTransport, setLayers, setLayerRecordingState, setError, clearError]);

  // Set instrument mode when step changes
  useEffect(() => {
    if (!hasPermission || isInitializing) return;

    const mode = stepConfig.instrumentMode;
    audioEngine.setInstrumentMode(mode);
    console.log(`[GuidedRecording] Set instrument mode to: ${mode}`);

    // Handle effects
    if (currentStep === 'voice') {
      const savedEffects = instrumentSetup.selectedVoiceEffects;
      Object.entries(savedEffects).forEach(([effect, enabled]) => {
        audioEngine.toggleEffect(effect as EffectType, enabled);
      });
    } else {
      audioEngine.disableAllEffects();
    }

    try {
      const effects = audioEngine.getEffectsState();
      setVoiceEffects(effects);
    } catch {
      // Effects not available yet
    }
  }, [currentStep, hasPermission, isInitializing, instrumentSetup.selectedVoiceEffects, stepConfig.instrumentMode]);

  // Metronome for drums step
  useEffect(() => {
    if (!hasPermission || isInitializing) return;

    const audioContext = audioEngine.getAudioContext();
    if (!audioContext) return;

    if (currentStep === 'drums' && !isRecordingDrums) {
      metronomeAudio.initialize(audioContext);
      metronomeAudio.setBpm(selectedBpm);
      metronomeAudio.setCallbacks({
        onBeat: (beat) => setCurrentBeat(beat),
      });
      metronomeAudio.start();
    } else {
      metronomeAudio.stop();
    }

    // Start playback for melodic/voice steps
    if ((currentStep === 'bass' || currentStep === 'guitar' || currentStep === 'piano' || currentStep === 'voice') && !transport.isPlaying && layers.length > 0) {
      audioEngine.toggleLooperPlayback();
    }

    return () => {
      if (currentStep === 'drums') {
        metronomeAudio.stop();
      }
    };
  }, [currentStep, hasPermission, isInitializing, selectedBpm, layers.length, transport.isPlaying, isRecordingDrums]);

  // Track elapsed time during recording
  useEffect(() => {
    if (isRecording) {
      const startTime = Date.now();
      elapsedIntervalRef.current = window.setInterval(() => {
        setElapsedTime(Date.now() - startTime);
      }, 100);
    } else {
      if (elapsedIntervalRef.current) {
        clearInterval(elapsedIntervalRef.current);
        elapsedIntervalRef.current = null;
      }
      setElapsedTime(0);
    }

    return () => {
      if (elapsedIntervalRef.current) {
        clearInterval(elapsedIntervalRef.current);
      }
    };
  }, [isRecording]);

  // Auto-advance when layer count increases
  useEffect(() => {
    if (layers.length > prevLayerCountRef.current && currentStep !== 'complete') {
      const steps: RecordingStep[] = ['drums', 'bass', 'guitar', 'piano', 'voice', 'complete'];
      const currentIndex = steps.indexOf(currentStep);
      if (currentIndex >= 0 && currentIndex < steps.length - 1) {
        navigate(`/record/flow/${steps[currentIndex + 1]}`, { replace: true });
      }
    }
    prevLayerCountRef.current = layers.length;
  }, [layers.length, currentStep, navigate]);

  // Handle drum recording (variable length)
  const handleDrumRecordToggle = useCallback(() => {
    if (isRecordingDrums) {
      // Stop variable-length drum recording
      const result = audioEngine.stopVariableDrumRecording();
      setLoopInfo({ bars: result.bars, bpm: selectedBpm });
      setIsRecordingDrums(false);
      // Advance to bass
      navigate('/record/flow/bass', { replace: true });
    } else {
      // Start variable-length drum recording
      metronomeAudio.stop();
      audioEngine.startVariableDrumRecording(selectedBpm);
      setIsRecordingDrums(true);
    }
  }, [isRecordingDrums, selectedBpm, navigate]);

  // Handle melodic instrument recording (bass, guitar, piano)
  const handleMelodicRecordToggle = useCallback(() => {
    const instrumentType = currentStep as 'bass' | 'guitar' | 'piano';

    if (isRecordingMelodic) {
      audioEngine.stopMelodicEventRecording();
      setIsRecordingMelodic(false);
    } else {
      audioEngine.startMelodicEventRecording(instrumentType);
      setIsRecordingMelodic(true);
    }
  }, [currentStep, isRecordingMelodic]);

  // Handle voice recording (actual audio)
  const handleVoiceRecordToggle = useCallback(() => {
    if (isBusy) {
      audioEngine.stopLayerRecordingNew();
    } else {
      audioEngine.startLayerRecordingNew('voice');
    }
  }, [isBusy]);

  // Main record button handler
  const handleRecordToggle = useCallback(() => {
    if (currentStep === 'drums') {
      handleDrumRecordToggle();
    } else if (currentStep === 'bass' || currentStep === 'guitar' || currentStep === 'piano') {
      handleMelodicRecordToggle();
    } else if (currentStep === 'voice') {
      handleVoiceRecordToggle();
    }
  }, [currentStep, handleDrumRecordToggle, handleMelodicRecordToggle, handleVoiceRecordToggle]);

  // Skip current instrument
  const handleSkip = useCallback(() => {
    const steps: RecordingStep[] = ['drums', 'bass', 'guitar', 'piano', 'voice', 'complete'];
    const currentIndex = steps.indexOf(currentStep);
    if (currentIndex >= 0 && currentIndex < steps.length - 1) {
      navigate(`/record/flow/${steps[currentIndex + 1]}`, { replace: true });
    }
  }, [currentStep, navigate]);

  // Handle save to library
  const handleSave = useCallback(async () => {
    audioEngine.disableAllEffects();

    // Get layer info for saving
    const layerInfos = audioEngine.getLayerInfos();
    const songCount = await libraryStorage.getSongCount();
    const songName = `Song ${songCount + 1}`;

    // Serialize layers for storage
    const serializedLayers = LibraryStorage.serializeLayers(layerInfos);

    // Calculate total duration
    const duration = loopInfo?.bars
      ? (loopInfo.bars * 4 * 60000) / selectedBpm
      : layerInfos.reduce((max, l) => Math.max(max, l.duration), 0);

    // Save to library
    try {
      const songId = await libraryStorage.saveSong({
        name: songName,
        bpm: selectedBpm,
        duration,
        layers: serializedLayers,
      });

      // Update store with new song
      addSongToLibrary({
        id: songId,
        name: songName,
        createdAt: Date.now(),
        updatedAt: Date.now(),
        bpm: selectedBpm,
        duration,
        layerCount: layerInfos.length,
      });

      console.log('[GuidedRecording] Song saved to library:', songId);
    } catch (err) {
      console.error('[GuidedRecording] Failed to save song:', err);
    }

    // Navigate to library after saving
    navigate('/library/songs');
  }, [navigate, selectedBpm, loopInfo, addSongToLibrary]);

  // Handle keep working
  const handleKeepWorking = useCallback(() => {
    audioEngine.disableAllEffects();
    navigate('/record/flow/drums', { replace: true });
  }, [navigate]);

  const handleEffectToggle = useCallback((effect: EffectType) => {
    audioEngine.toggleEffect(effect);
    try {
      const effects = audioEngine.getEffectsState();
      setVoiceEffects(effects);
    } catch {
      // Effects not available
    }
  }, []);

  // Format elapsed time
  const formatElapsed = (ms: number) => {
    const totalSeconds = Math.floor(ms / 1000);
    const minutes = Math.floor(totalSeconds / 60);
    const seconds = totalSeconds % 60;
    const millis = Math.floor((ms % 1000) / 10);
    return `${minutes.toString().padStart(2, '0')}:${seconds.toString().padStart(2, '0')}.${millis.toString().padStart(2, '0')}`;
  };

  // Loading state
  if (isInitializing) {
    return (
      <div className="h-full w-full bg-[#050505] flex items-center justify-center relative">
        <div className="bg-shader-gradient" />
        <div className="flex flex-col items-center relative z-10">
          <div className="w-16 h-16 border-2 border-[#00ffff] border-t-transparent rounded-full animate-spin" />
          <p className="mt-6 text-[#888888] text-sm font-mono tracking-wider">INITIALIZING AUDIO...</p>
        </div>
      </div>
    );
  }

  // Error state
  if (error) {
    return (
      <div className="h-full w-full bg-[#050505] flex items-center justify-center relative">
        <div className="bg-shader-gradient" />
        <div className="flex flex-col items-center px-8 text-center relative z-10">
          <div className="w-16 h-16 rounded-full border-2 border-[#ff00ff] flex items-center justify-center mb-6">
            <span className="text-[#ff00ff] text-2xl">!</span>
          </div>
          <p className="text-[#ff00ff] font-mono text-sm mb-6">{error}</p>
          <button
            className="btn-shader-primary px-8 py-3 rounded-full font-mono uppercase tracking-wider text-sm"
            onClick={() => window.location.reload()}
          >
            Retry
          </button>
        </div>
      </div>
    );
  }

  // Permission denied
  if (hasPermission === false) {
    return (
      <div className="h-full w-full bg-[#050505] flex items-center justify-center relative">
        <div className="bg-shader-gradient" />
        <div className="flex flex-col items-center px-8 text-center relative z-10">
          <div className="w-16 h-16 rounded-full border-2 border-[#ffff00] flex items-center justify-center mb-6">
            <span className="text-[#ffff00] text-2xl">🎤</span>
          </div>
          <p className="text-white font-mono text-sm mb-2">MICROPHONE ACCESS REQUIRED</p>
          <p className="text-[#888888] font-mono text-xs">Please allow microphone access to create music</p>
        </div>
      </div>
    );
  }

  // Complete screen
  if (currentStep === 'complete') {
    return (
      <div className="h-full w-full bg-[#050505] flex flex-col relative">
        <div className="bg-shader-gradient" />
        <ProgressHeader currentStep="complete" />

        <div className="flex-1 flex flex-col items-center justify-center px-6 relative z-10">
          {/* Success icon */}
          <div className="w-24 h-24 rounded-full mb-8 flex items-center justify-center animate-pulse-glow"
            style={{ background: 'linear-gradient(135deg, #00ffff 0%, #ff00ff 100%)' }}>
            <svg className="w-12 h-12 text-black" fill="currentColor" viewBox="0 0 24 24">
              <path d="M9 16.17L4.83 12l-1.42 1.41L9 19 21 7l-1.41-1.41z" />
            </svg>
          </div>

          <h1 className="text-gradient text-2xl font-bold mb-2 uppercase tracking-wider font-mono">
            {stepConfig.label}
          </h1>
          <p className="text-[#888888] text-sm font-mono text-center mb-10 max-w-xs">
            {stepConfig.instruction}
          </p>

          {/* Loop info */}
          {loopInfo && (
            <div className="badge-shader text-[#00ffff] mb-8">
              {loopInfo.bars} BARS @ {loopInfo.bpm} BPM
            </div>
          )}

          {/* Action buttons */}
          <div className="w-full max-w-xs space-y-3">
            <button
              onClick={handleSave}
              className="btn-shader-primary w-full py-4 rounded-full font-mono uppercase tracking-wider text-sm"
            >
              Save Song
            </button>
            <button
              onClick={handleKeepWorking}
              className="btn-shader w-full py-4 text-white font-mono uppercase tracking-wider text-sm hover:border-[#00ffff]/50"
            >
              Keep Editing
            </button>
          </div>
        </div>
      </div>
    );
  }

  return (
    <div className="h-full w-full bg-[#050505] flex flex-col relative">
      <div className="bg-shader-gradient" />

      {/* Band header */}
      <ActiveBandHeader />

      {/* Progress header */}
      <ProgressHeader currentStep={currentStep} />

      {/* Main content */}
      <div className="flex-1 flex flex-col items-center justify-center px-6 relative z-10 overflow-hidden">
        {/* Step label */}
        <h1 className={clsx(
          "text-xl font-bold mb-2 text-center font-mono uppercase tracking-wider",
          isBusy ? "text-[#ff00ff] animate-pulse" : "text-white"
        )}>
          {isBusy ? stepConfig.recordingLabel : stepConfig.label}
        </h1>

        {/* Instruction text */}
        <p className="text-[#888888] text-xs font-mono text-center mb-6 max-w-xs">
          {stepConfig.instruction}
        </p>

        {/* Instrument visualization */}
        <div className="w-full max-w-sm mb-6">
          {currentStep === 'drums' && (
            <div className="flex flex-col items-center">
              <DrumIndicator currentDrum={currentDrum} pitch={pitch} />
              {!isRecordingDrums && (
                <div className="mt-6">
                  <MetronomeDisplay currentBeat={currentBeat} />
                </div>
              )}
              {isRecordingDrums && (
                <div className="mt-4 h-16 w-full rounded-lg card-shader overflow-hidden">
                  <AudioVisualizer level={inputLevel} isActive={true} />
                </div>
              )}
            </div>
          )}

          {currentStep === 'bass' && (
            <div className="flex flex-col items-center">
              <BassIndicator bass={bass} />
              {isRecording && (
                <div className="mt-4 h-16 w-full rounded-lg card-shader overflow-hidden">
                  <AudioVisualizer level={inputLevel} isActive={true} />
                </div>
              )}
            </div>
          )}

          {currentStep === 'guitar' && (
            <div className="flex flex-col items-center">
              <GuitarIndicator guitar={guitar} />
              {isRecording && (
                <div className="mt-4 h-16 w-full rounded-lg card-shader overflow-hidden">
                  <AudioVisualizer level={inputLevel} isActive={true} />
                </div>
              )}
            </div>
          )}

          {currentStep === 'piano' && (
            <div className="flex flex-col items-center">
              <PianoIndicator piano={piano} />
              {isRecording && (
                <div className="mt-4 h-16 w-full rounded-lg card-shader overflow-hidden">
                  <AudioVisualizer level={inputLevel} isActive={true} />
                </div>
              )}
            </div>
          )}

          {currentStep === 'voice' && (
            <div className="flex flex-col items-center">
              {voiceEffects && (
                <EffectsPanel effects={voiceEffects} onToggle={handleEffectToggle} />
              )}
              <div className="mt-6 h-20 w-full rounded-lg card-shader overflow-hidden flex items-center justify-center">
                {isRecording ? (
                  <AudioVisualizer level={inputLevel} isActive={true} />
                ) : (
                  <p className="text-[#444444] text-xs font-mono">TAP RECORD TO ADD YOUR VOICE</p>
                )}
              </div>
            </div>
          )}
        </div>

        {/* Record button */}
        <RecordButton
          isRecording={isBusy}
          onClick={handleRecordToggle}
        />

        {/* Skip button - only show if not recording and not drums (can't skip drums) */}
        {!isBusy && currentStep !== 'drums' && (
          <button
            onClick={handleSkip}
            className="mt-4 text-[#444444] hover:text-[#888888] text-xs font-mono uppercase tracking-wider transition-colors"
          >
            Skip {currentStep}
          </button>
        )}
      </div>

      {/* Bottom info bar */}
      <div className="px-4 py-3 border-t border-[#1a1a1a] relative z-10">
        <div className="flex justify-between items-center">
          <div className="flex items-center gap-3">
            <span className="badge-shader text-[#00ffff]">{selectedBpm} BPM</span>
            {loopInfo && (
              <span className="badge-shader text-[#ff00ff]">{loopInfo.bars} BARS</span>
            )}
          </div>
          <span className={clsx(
            "font-mono text-sm tabular-nums",
            isBusy ? "text-[#ff00ff]" : "text-[#444444]"
          )}>
            {formatElapsed(elapsedTime)}
          </span>
        </div>
      </div>
    </div>
  );
}

// Progress header showing current step
function ProgressHeader({ currentStep }: { currentStep: string }) {
  const steps = ['drums', 'bass', 'guitar', 'piano', 'voice'];
  const stepIcons: Record<string, string> = {
    drums: '🥁',
    bass: '🎸',
    guitar: '🎵',
    piano: '🎹',
    voice: '🎤',
  };

  const currentIndex = steps.indexOf(currentStep);
  const isComplete = currentStep === 'complete';

  return (
    <div className="flex items-center justify-between px-4 py-3 border-b border-[#1a1a1a] relative z-10">
      {steps.map((step, index) => {
        const isActive = step === currentStep;
        const isDone = isComplete || index < currentIndex;

        return (
          <div
            key={step}
            className={clsx(
              "flex flex-col items-center gap-1 transition-all",
              isActive && "scale-110"
            )}
          >
            <div className={clsx(
              "w-8 h-8 rounded-full flex items-center justify-center text-sm transition-all",
              isActive && "ring-2 ring-[#00ffff] ring-offset-2 ring-offset-[#050505]",
              isDone && "bg-[#00ff00]/20",
              !isActive && !isDone && "opacity-30"
            )}
            style={isActive ? {
              background: 'linear-gradient(135deg, #00ffff 0%, #ff00ff 100%)',
            } : isDone ? undefined : {
              background: '#1a1a1a',
            }}>
              {isDone ? (
                <svg className="w-4 h-4 text-[#00ff00]" fill="currentColor" viewBox="0 0 24 24">
                  <path d="M9 16.17L4.83 12l-1.42 1.41L9 19 21 7l-1.41-1.41z" />
                </svg>
              ) : (
                <span>{stepIcons[step]}</span>
              )}
            </div>
            <span className={clsx(
              "text-[10px] font-mono uppercase tracking-wider",
              isActive && "text-[#00ffff]",
              isDone && "text-[#00ff00]",
              !isActive && !isDone && "text-[#444444]"
            )}>
              {step}
            </span>
          </div>
        );
      })}
    </div>
  );
}

// Visual metronome display
function MetronomeDisplay({ currentBeat }: { currentBeat: number }) {
  const beats = [0, 1, 2, 3];

  return (
    <div className="flex items-center justify-center gap-4">
      {beats.map((beat) => {
        const isActive = currentBeat === beat;
        const isDownbeat = beat === 0;

        return (
          <div
            key={beat}
            className={clsx(
              "rounded-full transition-all duration-75",
              isDownbeat ? "w-6 h-6" : "w-5 h-5",
              isActive && "scale-125",
              !isActive && "bg-[#1a1a1a]"
            )}
            style={isActive ? {
              background: isDownbeat
                ? 'linear-gradient(135deg, #00ffff 0%, #ff00ff 100%)'
                : '#00ffff',
              boxShadow: isDownbeat
                ? '0 0 20px rgba(0, 255, 255, 0.5)'
                : '0 0 15px rgba(0, 255, 255, 0.3)',
            } : undefined}
          />
        );
      })}
    </div>
  );
}

// Record button component
function RecordButton({ isRecording, onClick }: { isRecording: boolean; onClick: () => void }) {
  return (
    <button
      onClick={onClick}
      className={clsx(
        "w-24 h-24 rounded-full flex items-center justify-center transition-all duration-300",
        "bg-[#0a0a0a] border-2",
        isRecording
          ? "border-[#ff00ff] shadow-[0_0_40px_rgba(255,0,255,0.5)]"
          : "border-[#00ffff]/50 shadow-[0_0_20px_rgba(0,255,255,0.2)] hover:border-[#00ffff] hover:shadow-[0_0_40px_rgba(0,255,255,0.4)]"
      )}
    >
      {isRecording ? (
        // Stop button
        <div className="w-8 h-8 bg-[#ff00ff] rounded-sm shadow-[0_0_20px_rgba(255,0,255,0.5)]" />
      ) : (
        // Record button
        <div
          className="w-14 h-14 rounded-full animate-pulse-glow"
          style={{
            background: 'linear-gradient(135deg, #00ffff 0%, #ff00ff 100%)',
          }}
        />
      )}
    </button>
  );
}
