import { useState, useEffect, useCallback } from 'react';
import { audioEngine } from '../../core/AudioEngine';
import { useAppStore } from '../../core/store';
import { AudioVisualizer } from '../components/AudioVisualizer';
import { LatencyDisplay } from '../components/LatencyDisplay';
import { PitchDisplay } from '../components/PitchDisplay';
import { VolumeSlider } from '../components/VolumeSlider';
import { DrumIndicator } from '../components/DrumIndicator';
import { BassIndicator } from '../components/BassIndicator';
import { EffectsPanel, ExpandedEffectsPanel } from '../components/EffectsPanel';
import { RecordingPanel, CompactRecordButton } from '../components/RecordingPanel';
import { clsx } from 'clsx';
import type { DrumType, InstrumentMode, BassStyle, BassState } from '../../types';
import type { VoiceEffectsState, EffectType } from '../../core/VoiceEffects';
import type { RecorderState } from '../../core/LoopRecorder';

/**
 * PassthroughScreen is the main screen for Prototype v0.2.
 *
 * Features:
 * 1. Audio passthrough (microphone → headphones)
 * 2. Real-time pitch detection
 * 3. Latency measurement
 *
 * User interaction:
 * - Tap screen to toggle passthrough
 * - Slide up/down on right edge to adjust volume
 */
export function PassthroughScreen() {
  const [hasPermission, setHasPermission] = useState<boolean | null>(null);
  const [isInitializing, setIsInitializing] = useState(false);
  const [showInstructions, setShowInstructions] = useState(true);
  const [showEffectsPanel, setShowEffectsPanel] = useState(false);
  const [showRecordingPanel, setShowRecordingPanel] = useState(false);
  const [effects, setEffects] = useState<VoiceEffectsState>(() => audioEngine.getEffectsState());
  const [recorderState, setRecorderState] = useState<RecorderState>(() => audioEngine.getRecorderState());

  const {
    isPassthroughActive,
    inputLevel,
    latencyMs,
    outputVolume,
    pitch,
    error,
    instrumentMode,
    currentDrum,
    bass,
    setPassthroughActive,
    setInputLevel,
    setLatency,
    setPitch,
    setOutputVolume,
    setInstrumentMode,
    setCurrentDrum,
    setBass,
    setBassStyle,
    setError,
    clearError,
  } = useAppStore();

  // Initialize audio engine
  useEffect(() => {
    const init = async () => {
      setIsInitializing(true);
      clearError();

      // Set up callbacks
      audioEngine.setCallbacks({
        onLatencyMeasured: setLatency,
        onLevelChanged: setInputLevel,
        onPitchDetected: setPitch,
        onDrumTriggered: setCurrentDrum,
        onBassNoteChanged: (frequency, noteName) => {
          setBass({ frequency, noteName, isPlaying: frequency > 0 });
        },
        onEffectsChanged: setEffects,
        onRecorderStateChanged: setRecorderState,
        onError: setError,
        onStateChanged: setPassthroughActive,
      });

      // Initialize engine
      const initialized = await audioEngine.initialize();
      if (!initialized) {
        setError('Failed to initialize audio engine');
        setIsInitializing(false);
        return;
      }

      // Check/request permission
      const permitted = await audioEngine.requestPermission();
      setHasPermission(permitted);
      setIsInitializing(false);
    };

    init();

    return () => {
      audioEngine.dispose();
    };
  }, [setLatency, setInputLevel, setPitch, setCurrentDrum, setBass, setError, setPassthroughActive, clearError]);

  // Start passthrough
  const handleStart = useCallback(async () => {
    if (!hasPermission || isInitializing) return;

    setShowInstructions(false);
    await audioEngine.startPassthrough();
  }, [hasPermission, isInitializing]);

  // Stop passthrough
  const handleStop = useCallback(() => {
    audioEngine.stopPassthrough();
  }, []);

  // Measure latency
  const handleMeasureLatency = useCallback(() => {
    const latency = audioEngine.measureLatency();
    setLatency(latency);
  }, [setLatency]);

  // Update volume
  const handleVolumeChange = useCallback((volume: number) => {
    setOutputVolume(volume);
    audioEngine.setOutputVolume(volume);
  }, [setOutputVolume]);

  // Cycle through instrument modes
  const handleCycleInstrumentMode = useCallback(() => {
    const modes: InstrumentMode[] = ['drums', 'bass', 'off'];
    const currentIndex = modes.indexOf(instrumentMode);
    const nextMode = modes[(currentIndex + 1) % modes.length];
    setInstrumentMode(nextMode);
    audioEngine.setInstrumentMode(nextMode);
    if (nextMode !== 'drums') {
      setCurrentDrum(null);
    }
    if (nextMode !== 'bass') {
      setBass({ frequency: 0, noteName: '--', isPlaying: false });
    }
  }, [instrumentMode, setInstrumentMode, setCurrentDrum, setBass]);

  // Handle bass style change
  const handleBassStyleChange = useCallback((style: BassStyle) => {
    setBassStyle(style);
    audioEngine.setBassStyle(style);
  }, [setBassStyle]);

  // Handle effect toggle
  const handleToggleEffect = useCallback((effect: EffectType) => {
    audioEngine.toggleEffect(effect);
  }, []);

  // Handle effect param change
  const handleEffectParamChange = useCallback((effect: EffectType, param: string, value: number) => {
    audioEngine.setEffectParam(effect, param, value);
  }, []);

  // Recording controls
  const handleStartRecording = useCallback(() => {
    audioEngine.startRecording();
  }, []);

  const handleStopRecording = useCallback(() => {
    audioEngine.stopRecording();
  }, []);

  const handlePlayRecording = useCallback((id: string) => {
    audioEngine.playRecording(id);
  }, []);

  const handleStopPlayback = useCallback((id: string) => {
    audioEngine.stopPlayback(id);
  }, []);

  const handleDeleteRecording = useCallback((id: string) => {
    audioEngine.deleteRecording(id);
  }, []);

  const handleDownloadRecording = useCallback((id: string) => {
    audioEngine.downloadRecording(id);
  }, []);

  const handleToggleRecording = useCallback(() => {
    if (recorderState.isRecording) {
      audioEngine.stopRecording();
    } else {
      audioEngine.startRecording();
    }
  }, [recorderState.isRecording]);

  // Toggle passthrough on tap
  const handleToggle = useCallback(() => {
    if (isPassthroughActive) {
      handleStop();
    } else {
      handleStart();
    }
  }, [isPassthroughActive, handleStart, handleStop]);

  return (
    <div className="relative h-full w-full bg-black select-none touch-none">
      {/* Main touch area */}
      <div
        className="absolute inset-0 flex items-center justify-center cursor-pointer"
        onClick={handleToggle}
      >
        <MainContent
          isInitializing={isInitializing}
          error={error}
          hasPermission={hasPermission}
          isPassthroughActive={isPassthroughActive}
          showInstructions={showInstructions}
          pitch={pitch}
          instrumentMode={instrumentMode}
          currentDrum={currentDrum}
          bass={bass}
          onRetry={() => window.location.reload()}
          onBassStyleChange={handleBassStyleChange}
        />
      </div>

      {/* Volume slider on right edge */}
      <div className="absolute right-4 top-24 bottom-24 w-12 pointer-events-auto">
        <VolumeSlider
          value={outputVolume}
          onChange={handleVolumeChange}
        />
      </div>

      {/* Latency display at top */}
      <div className="absolute top-5 left-5 pointer-events-none">
        <LatencyDisplay latencyMs={latencyMs} />
      </div>

      {/* Measure latency button */}
      <button
        className="absolute top-5 right-20 p-2 text-white/50 hover:text-white/80 transition-colors pointer-events-auto"
        onClick={handleMeasureLatency}
        title="Measure latency"
      >
        <svg className="w-5 h-5" fill="none" viewBox="0 0 24 24" stroke="currentColor">
          <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2}
            d="M12 8v4l3 3m6-3a9 9 0 11-18 0 9 9 0 0118 0z" />
        </svg>
      </button>

      {/* Instrument mode toggle */}
      <button
        className={clsx(
          "absolute top-5 left-1/2 -translate-x-1/2 px-4 py-2 rounded-full text-sm font-medium transition-all pointer-events-auto",
          instrumentMode === 'drums' && "bg-red-600 text-white",
          instrumentMode === 'bass' && "bg-blue-600 text-white",
          instrumentMode === 'off' && "bg-white/10 text-white/50 hover:bg-white/20"
        )}
        onClick={handleCycleInstrumentMode}
        title={`Instrument: ${instrumentMode.toUpperCase()}`}
      >
        {instrumentMode === 'drums' && '🥁 DRUMS'}
        {instrumentMode === 'bass' && '🎸 BASS'}
        {instrumentMode === 'off' && '🎤 VOICE ONLY'}
      </button>

      {/* Effects panel toggle - show when passthrough is active */}
      {isPassthroughActive && (
        <div className="absolute top-16 left-1/2 -translate-x-1/2 pointer-events-auto">
          <EffectsPanel effects={effects} onToggle={handleToggleEffect} />
        </div>
      )}

      {/* Expanded effects panel */}
      {showEffectsPanel && (
        <ExpandedEffectsPanel
          effects={effects}
          onToggle={handleToggleEffect}
          onParamChange={handleEffectParamChange}
          onClose={() => setShowEffectsPanel(false)}
        />
      )}

      {/* Recording button - show when passthrough is active */}
      {isPassthroughActive && (
        <div className="absolute bottom-32 left-1/2 -translate-x-1/2 pointer-events-auto">
          <CompactRecordButton
            isRecording={recorderState.isRecording}
            duration={recorderState.recordingDuration}
            onToggle={handleToggleRecording}
          />
        </div>
      )}

      {/* Recording panel toggle button */}
      {isPassthroughActive && recorderState.recordings.length > 0 && !recorderState.isRecording && (
        <button
          className="absolute bottom-32 right-4 p-3 bg-white/10 hover:bg-white/20 rounded-full transition-colors pointer-events-auto"
          onClick={() => setShowRecordingPanel(!showRecordingPanel)}
          title="View recordings"
        >
          <svg className="w-5 h-5 text-white/70" fill="none" viewBox="0 0 24 24" stroke="currentColor">
            <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2}
              d="M19 11H5m14 0a2 2 0 012 2v6a2 2 0 01-2 2H5a2 2 0 01-2-2v-6a2 2 0 012-2m14 0V9a2 2 0 00-2-2M5 11V9a2 2 0 012-2m0 0V5a2 2 0 012-2h6a2 2 0 012 2v2M7 7h10" />
          </svg>
          <span className="absolute -top-1 -right-1 w-5 h-5 bg-purple-500 rounded-full text-xs flex items-center justify-center text-white">
            {recorderState.recordings.length}
          </span>
        </button>
      )}

      {/* Expanded recording panel */}
      {showRecordingPanel && (
        <div className="absolute inset-0 bg-black/90 flex items-center justify-center z-50 pointer-events-auto">
          <div className="bg-white/5 rounded-2xl p-6 w-80 max-w-[90vw]">
            <div className="flex items-center justify-between mb-4">
              <h2 className="text-white text-lg font-medium">Recordings</h2>
              <button
                className="p-2 text-white/50 hover:text-white/80 transition-colors"
                onClick={() => setShowRecordingPanel(false)}
              >
                <svg className="w-5 h-5" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                  <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M6 18L18 6M6 6l12 12" />
                </svg>
              </button>
            </div>
            <RecordingPanel
              recorderState={recorderState}
              onStartRecording={handleStartRecording}
              onStopRecording={handleStopRecording}
              onPlayRecording={handlePlayRecording}
              onStopPlayback={handleStopPlayback}
              onDeleteRecording={handleDeleteRecording}
              onDownloadRecording={handleDownloadRecording}
            />
          </div>
        </div>
      )}

      {/* Audio level indicator at bottom */}
      {isPassthroughActive && (
        <div className="absolute bottom-10 left-10 right-10 h-16 pointer-events-none">
          <AudioVisualizer level={inputLevel} isActive={isPassthroughActive} />
        </div>
      )}
    </div>
  );
}

// Sub-components for different states
interface MainContentProps {
  isInitializing: boolean;
  error: string | null;
  hasPermission: boolean | null;
  isPassthroughActive: boolean;
  showInstructions: boolean;
  pitch: { frequency: number; note: string; noteName: string; octave: number; cents: number; confidence: number };
  instrumentMode: InstrumentMode;
  currentDrum: DrumType | null;
  bass: BassState;
  onRetry: () => void;
  onBassStyleChange: (style: BassStyle) => void;
}

function MainContent({
  isInitializing,
  error,
  hasPermission,
  isPassthroughActive,
  showInstructions,
  pitch,
  instrumentMode,
  currentDrum,
  bass,
  onRetry,
  onBassStyleChange,
}: MainContentProps) {
  if (isInitializing) {
    return <InitializingState />;
  }

  if (error) {
    return <ErrorState error={error} onRetry={onRetry} />;
  }

  if (hasPermission === false) {
    return <PermissionDeniedState />;
  }

  if (isPassthroughActive) {
    return (
      <ActiveState
        pitch={pitch}
        instrumentMode={instrumentMode}
        currentDrum={currentDrum}
        bass={bass}
        onBassStyleChange={onBassStyleChange}
      />
    );
  }

  return <InactiveState showInstructions={showInstructions} />;
}

function InitializingState() {
  return (
    <div className="flex flex-col items-center">
      <div className="w-12 h-12 border-2 border-purple-500 border-t-transparent rounded-full animate-spin" />
      <p className="mt-6 text-white/70 text-base">Initializing audio...</p>
    </div>
  );
}

function ErrorState({ error, onRetry }: { error: string; onRetry: () => void }) {
  return (
    <div className="flex flex-col items-center px-8 text-center">
      <svg className="w-16 h-16 text-red-400" fill="none" viewBox="0 0 24 24" stroke="currentColor">
        <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={1.5}
          d="M12 9v2m0 4h.01m-6.938 4h13.856c1.54 0 2.502-1.667 1.732-3L13.732 4c-.77-1.333-2.694-1.333-3.464 0L3.34 16c-.77 1.333.192 3 1.732 3z" />
      </svg>
      <p className="mt-6 text-red-400">{error}</p>
      <button
        className="mt-6 px-6 py-2 bg-purple-600 hover:bg-purple-700 rounded-lg text-white transition-colors pointer-events-auto"
        onClick={onRetry}
      >
        Retry
      </button>
    </div>
  );
}

function PermissionDeniedState() {
  return (
    <div className="flex flex-col items-center px-8 text-center">
      <svg className="w-16 h-16 text-white/50" fill="none" viewBox="0 0 24 24" stroke="currentColor">
        <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={1.5}
          d="M19 11a7 7 0 01-7 7m0 0a7 7 0 01-7-7m7 7v4m0 0H8m4 0h4m-4-8a3 3 0 01-3-3V5a3 3 0 116 0v6a3 3 0 01-3 3z" />
      </svg>
      <p className="mt-6 text-white/70">Microphone permission required</p>
      <p className="mt-2 text-white/40 text-sm">
        Please allow microphone access in your browser settings
      </p>
    </div>
  );
}

function InactiveState({ showInstructions }: { showInstructions: boolean }) {
  return (
    <div className="flex flex-col items-center">
      {/* Pulsing circle */}
      <div className={clsx(
        "w-32 h-32 rounded-full border-2 border-purple-500/30",
        "flex items-center justify-center",
        "animate-pulse-slow"
      )}>
        <svg className="w-12 h-12 text-white/50" fill="none" viewBox="0 0 24 24" stroke="currentColor">
          <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={1.5}
            d="M19 11a7 7 0 01-7 7m0 0a7 7 0 01-7-7m7 7v4m0 0H8m4 0h4m-4-8a3 3 0 01-3-3V5a3 3 0 116 0v6a3 3 0 01-3 3z" />
        </svg>
      </div>

      {showInstructions && (
        <div className="mt-12 text-center">
          <p className="text-white/50 text-sm tracking-widest">
            TAP TO START LISTENING
          </p>
          <p className="mt-4 text-white/30 text-xs">
            Plug in your headset first
          </p>
        </div>
      )}
    </div>
  );
}

interface ActiveStateProps {
  pitch: { frequency: number; note: string; noteName: string; octave: number; cents: number; confidence: number };
  instrumentMode: InstrumentMode;
  currentDrum: DrumType | null;
  bass: BassState;
  onBassStyleChange: (style: BassStyle) => void;
}

function ActiveState({ pitch, instrumentMode, currentDrum, bass, onBassStyleChange }: ActiveStateProps) {
  const getModeLabel = () => {
    switch (instrumentMode) {
      case 'drums': return 'PLAYING DRUMS';
      case 'bass': return 'PLAYING BASS';
      case 'off': return 'LISTENING';
    }
  };

  const getModeColor = () => {
    switch (instrumentMode) {
      case 'drums': return 'text-red-300';
      case 'bass': return 'text-blue-300';
      case 'off': return 'text-purple-300';
    }
  };

  return (
    <div className="flex flex-col items-center">
      {/* Show appropriate indicator based on mode */}
      {instrumentMode === 'drums' && (
        <DrumIndicator currentDrum={currentDrum} pitch={pitch} />
      )}
      {instrumentMode === 'bass' && (
        <BassIndicator bass={bass} onStyleChange={onBassStyleChange} />
      )}
      {instrumentMode === 'off' && (
        <PitchDisplay pitch={pitch} />
      )}

      <div className="mt-8 text-center">
        <p className={clsx("text-sm tracking-widest font-medium", getModeColor())}>
          {getModeLabel()}
        </p>
        <p className="mt-2 text-white/30 text-xs">
          Tap to stop
        </p>
      </div>
    </div>
  );
}
