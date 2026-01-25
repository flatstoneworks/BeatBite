import { useState, useEffect, useCallback } from 'react';
import { audioEngine } from '../../core/AudioEngine';
import { useAppStore, useTempoConfirmed, useSelectedBpm } from '../../core/store';
import { AudioVisualizer } from '../components/AudioVisualizer';
import { TempoSelectorScreen } from './TempoSelectorScreen';
import { clsx } from 'clsx';
import type { LayerType, LayerInfo, TransportState, RecordingState } from '../../types';

/**
 * LooperScreen is the main looper workstation UI.
 *
 * Features:
 * - Visual metronome (beat/bar display)
 * - Record layers: drums, bass, voice
 * - Layer list with volume/mute controls
 * - Transport controls (play/stop)
 * - Export mix
 */
export function LooperScreen() {
  const [hasPermission, setHasPermission] = useState<boolean | null>(null);
  const [isInitializing, setIsInitializing] = useState(false);

  const tempoConfirmed = useTempoConfirmed();
  const selectedBpm = useSelectedBpm();

  const {
    isPassthroughActive,
    inputLevel,
    error,
    transport,
    layers,
    layerRecordingState,
    activeRecordingLayer,
    setPassthroughActive,
    setInputLevel,
    setTransport,
    setLayers,
    setLayerRecordingState,
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
        onLevelChanged: setInputLevel,
        onError: setError,
        onStateChanged: setPassthroughActive,
        onTransportUpdate: setTransport,
        onLayersChanged: setLayers,
        onLayerRecordingStateChanged: setLayerRecordingState,
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
  }, [setInputLevel, setTransport, setLayers, setLayerRecordingState, setError, setPassthroughActive, clearError]);

  // Start audio passthrough
  const handleStart = useCallback(async () => {
    if (!hasPermission || isInitializing) return;
    await audioEngine.startPassthrough();
  }, [hasPermission, isInitializing]);

  // Tempo confirmed - set tempo in audio engine
  const handleTempoConfirmed = useCallback(() => {
    audioEngine.setTempo(selectedBpm, 4, 4);
  }, [selectedBpm]);

  // Layer recording - use new architecture methods
  const handleStartLayerRecording = useCallback((layerType: LayerType) => {
    audioEngine.startLayerRecordingNew(layerType);
  }, []);

  const handleStopLayerRecording = useCallback(() => {
    audioEngine.stopLayerRecordingNew();
  }, []);

  // Transport controls
  const handleTogglePlayback = useCallback(() => {
    audioEngine.toggleLooperPlayback();
  }, []);

  // Layer controls
  const handleLayerVolumeChange = useCallback((layerId: string, volume: number) => {
    audioEngine.setLayerVolume(layerId, volume);
  }, []);

  const handleLayerMuteToggle = useCallback((layerId: string, muted: boolean) => {
    audioEngine.setLayerMuted(layerId, muted);
  }, []);

  const handleRemoveLayer = useCallback((layerId: string) => {
    audioEngine.removeLayer(layerId);
  }, []);

  // Export
  const handleDownloadMix = useCallback(() => {
    audioEngine.downloadLooperMix();
  }, []);

  // Reset
  const handleReset = useCallback(() => {
    audioEngine.resetLooper();
  }, []);

  // Render loading state
  if (isInitializing) {
    return (
      <div className="h-full w-full bg-black flex items-center justify-center">
        <div className="flex flex-col items-center">
          <div className="w-12 h-12 border-2 border-purple-500 border-t-transparent rounded-full animate-spin" />
          <p className="mt-6 text-white/70 text-base">Initializing audio...</p>
        </div>
      </div>
    );
  }

  // Render error state
  if (error) {
    return (
      <div className="h-full w-full bg-black flex items-center justify-center">
        <div className="flex flex-col items-center px-8 text-center">
          <svg className="w-16 h-16 text-red-400" fill="none" viewBox="0 0 24 24" stroke="currentColor">
            <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={1.5}
              d="M12 9v2m0 4h.01m-6.938 4h13.856c1.54 0 2.502-1.667 1.732-3L13.732 4c-.77-1.333-2.694-1.333-3.464 0L3.34 16c-.77 1.333.192 3 1.732 3z" />
          </svg>
          <p className="mt-6 text-red-400">{error}</p>
          <button
            className="mt-6 px-6 py-2 bg-purple-600 hover:bg-purple-700 rounded-lg text-white transition-colors"
            onClick={() => window.location.reload()}
          >
            Retry
          </button>
        </div>
      </div>
    );
  }

  // Render permission denied state
  if (hasPermission === false) {
    return (
      <div className="h-full w-full bg-black flex items-center justify-center">
        <div className="flex flex-col items-center px-8 text-center">
          <svg className="w-16 h-16 text-white/50" fill="none" viewBox="0 0 24 24" stroke="currentColor">
            <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={1.5}
              d="M19 11a7 7 0 01-7 7m0 0a7 7 0 01-7-7m7 7v4m0 0H8m4 0h4m-4-8a3 3 0 01-3-3V5a3 3 0 116 0v6a3 3 0 01-3 3z" />
          </svg>
          <p className="mt-6 text-white/70">Microphone permission required</p>
        </div>
      </div>
    );
  }

  // Render start screen if not active
  if (!isPassthroughActive) {
    return (
      <div className="h-full w-full bg-black flex items-center justify-center">
        <button
          className="flex flex-col items-center"
          onClick={handleStart}
        >
          <div className="w-32 h-32 rounded-full border-2 border-purple-500/30 flex items-center justify-center animate-pulse">
            <svg className="w-12 h-12 text-white/50" fill="none" viewBox="0 0 24 24" stroke="currentColor">
              <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={1.5}
                d="M19 11a7 7 0 01-7 7m0 0a7 7 0 01-7-7m7 7v4m0 0H8m4 0h4m-4-8a3 3 0 01-3-3V5a3 3 0 116 0v6a3 3 0 01-3 3z" />
            </svg>
          </div>
          <p className="mt-8 text-white/50 text-sm tracking-widest">TAP TO START LOOPER</p>
        </button>
      </div>
    );
  }

  // Render tempo selector if passthrough active but tempo not confirmed
  if (!tempoConfirmed) {
    return (
      <TempoSelectorScreen
        audioContext={audioEngine.getAudioContext()}
        onTempoConfirmed={handleTempoConfirmed}
      />
    );
  }

  // Main looper UI
  return (
    <div className="h-full w-full bg-black flex flex-col select-none">
      {/* Header - BPM & Transport */}
      <div className="flex items-center justify-between px-4 py-3 border-b border-white/10">
        <TransportDisplay transport={transport} />
        <div className="flex items-center gap-2">
          <button
            className="p-2 text-white/50 hover:text-white/80 transition-colors"
            onClick={handleReset}
            title="Reset looper"
          >
            <svg className="w-5 h-5" fill="none" viewBox="0 0 24 24" stroke="currentColor">
              <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2}
                d="M4 4v5h.582m15.356 2A8.001 8.001 0 004.582 9m0 0H9m11 11v-5h-.581m0 0a8.003 8.003 0 01-15.357-2m15.357 2H15" />
            </svg>
          </button>
          {layers.length > 0 && (
            <button
              className="p-2 text-green-400 hover:text-green-300 transition-colors"
              onClick={handleDownloadMix}
              title="Download mix"
            >
              <svg className="w-5 h-5" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2}
                  d="M4 16v1a3 3 0 003 3h10a3 3 0 003-3v-1m-4-4l-4 4m0 0l-4-4m4 4V4" />
              </svg>
            </button>
          )}
        </div>
      </div>

      {/* Visual Metronome */}
      <div className="px-4 py-3">
        <Metronome transport={transport} />
      </div>

      {/* Recording Controls */}
      <div className="px-4 py-4">
        <RecordingControls
          recordingState={layerRecordingState}
          activeLayer={activeRecordingLayer}
          hasBaseLoop={layers.length > 0}
          onStartRecording={handleStartLayerRecording}
          onStopRecording={handleStopLayerRecording}
        />
      </div>

      {/* Transport Play/Stop */}
      {layers.length > 0 && (
        <div className="flex justify-center py-4">
          <button
            className={clsx(
              "w-16 h-16 rounded-full flex items-center justify-center transition-all",
              transport.isPlaying
                ? "bg-white/20 hover:bg-white/30"
                : "bg-purple-600 hover:bg-purple-500"
            )}
            onClick={handleTogglePlayback}
          >
            {transport.isPlaying ? (
              <svg className="w-8 h-8 text-white" fill="currentColor" viewBox="0 0 24 24">
                <rect x="6" y="4" width="4" height="16" rx="1" />
                <rect x="14" y="4" width="4" height="16" rx="1" />
              </svg>
            ) : (
              <svg className="w-8 h-8 text-white ml-1" fill="currentColor" viewBox="0 0 24 24">
                <path d="M8 5v14l11-7z" />
              </svg>
            )}
          </button>
        </div>
      )}

      {/* Layer List */}
      <div className="flex-1 overflow-y-auto px-4">
        <LayerList
          layers={layers}
          onVolumeChange={handleLayerVolumeChange}
          onMuteToggle={handleLayerMuteToggle}
          onRemove={handleRemoveLayer}
        />
      </div>

      {/* Audio Level Indicator */}
      <div className="px-4 pb-4 h-16">
        <AudioVisualizer level={inputLevel} isActive={isPassthroughActive} />
      </div>
    </div>
  );
}

// Transport display component
function TransportDisplay({ transport }: { transport: TransportState }) {
  return (
    <div className="flex items-center gap-4">
      <div className="text-2xl font-bold text-white tabular-nums">
        {transport.bpm} <span className="text-sm text-white/50">BPM</span>
      </div>
      {transport.loopLengthMs > 0 && (
        <div className="text-sm text-white/50">
          {transport.bars} bars
        </div>
      )}
    </div>
  );
}

// Visual metronome component
function Metronome({ transport }: { transport: TransportState }) {
  const totalBeats = transport.bars * transport.beatsPerBar;
  const beats = Array.from({ length: totalBeats }, (_, i) => i);

  if (totalBeats === 0) {
    return (
      <div className="text-center text-white/30 text-sm py-2">
        Record a layer to set the loop
      </div>
    );
  }

  return (
    <div className="flex items-center justify-center gap-1 flex-wrap">
      {beats.map((beat) => {
        const isCurrentBeat = transport.isPlaying && beat === transport.currentBeat;
        const isDownbeat = beat % transport.beatsPerBar === 0;

        return (
          <div
            key={beat}
            className={clsx(
              "rounded-full transition-all duration-75",
              isDownbeat ? "w-4 h-4" : "w-3 h-3",
              isCurrentBeat
                ? isDownbeat
                  ? "bg-purple-500"
                  : "bg-purple-400"
                : isDownbeat
                  ? "bg-white/30"
                  : "bg-white/15"
            )}
          />
        );
      })}
    </div>
  );
}

// Recording controls component
interface RecordingControlsProps {
  recordingState: RecordingState;
  activeLayer: LayerType | null;
  hasBaseLoop: boolean;
  onStartRecording: (type: LayerType) => void;
  onStopRecording: () => void;
}

function RecordingControls({
  recordingState,
  activeLayer,
  hasBaseLoop,
  onStartRecording,
  onStopRecording,
}: RecordingControlsProps) {
  const isRecording = recordingState === 'recording';
  const isWaiting = recordingState === 'waiting';
  const isProcessing = recordingState === 'processing';
  const isBusy = isRecording || isWaiting || isProcessing;

  const layerTypes: LayerType[] = ['drums', 'bass', 'voice'];

  const getLayerConfig = (type: LayerType) => {
    switch (type) {
      case 'drums':
        return { icon: '🥁', label: 'Drums', color: 'bg-red-600 hover:bg-red-500', activeColor: 'bg-red-500' };
      case 'bass':
        return { icon: '🎸', label: 'Bass', color: 'bg-blue-600 hover:bg-blue-500', activeColor: 'bg-blue-500' };
      case 'guitar':
        return { icon: '🎸', label: 'Guitar', color: 'bg-green-600 hover:bg-green-500', activeColor: 'bg-green-500' };
      case 'piano':
        return { icon: '🎹', label: 'Piano', color: 'bg-amber-600 hover:bg-amber-500', activeColor: 'bg-amber-500' };
      case 'voice':
        return { icon: '🎤', label: 'Voice', color: 'bg-green-600 hover:bg-green-500', activeColor: 'bg-green-500' };
    }
  };

  return (
    <div className="space-y-3">
      <div className="text-center text-white/50 text-xs uppercase tracking-wider">
        {!hasBaseLoop
          ? 'Record your first layer'
          : isWaiting
            ? 'Waiting for loop start...'
            : isRecording
              ? `Recording ${activeLayer}...`
              : isProcessing
                ? 'Processing...'
                : 'Add another layer'}
      </div>

      <div className="flex justify-center gap-3">
        {layerTypes.map((type) => {
          const config = getLayerConfig(type);
          const isActive = activeLayer === type;

          return (
            <button
              key={type}
              className={clsx(
                "flex flex-col items-center gap-1 px-4 py-3 rounded-xl transition-all",
                isBusy && !isActive && "opacity-30 pointer-events-none",
                isActive && (isRecording || isWaiting)
                  ? `${config.activeColor} animate-pulse`
                  : config.color
              )}
              onClick={() => {
                if (isActive && (isRecording || isWaiting)) {
                  onStopRecording();
                } else if (!isBusy) {
                  onStartRecording(type);
                }
              }}
              disabled={isBusy && !isActive}
            >
              <span className="text-2xl">{config.icon}</span>
              <span className="text-white text-xs font-medium">{config.label}</span>
            </button>
          );
        })}
      </div>
    </div>
  );
}

// Layer list component
interface LayerListProps {
  layers: LayerInfo[];
  onVolumeChange: (id: string, volume: number) => void;
  onMuteToggle: (id: string, muted: boolean) => void;
  onRemove: (id: string) => void;
}

function LayerList({ layers, onVolumeChange, onMuteToggle, onRemove }: LayerListProps) {
  if (layers.length === 0) {
    return null;
  }

  return (
    <div className="space-y-2">
      <div className="text-xs text-white/40 uppercase tracking-wider">Layers</div>
      {layers.map((layer) => (
        <LayerRow
          key={layer.id}
          layer={layer}
          onVolumeChange={(volume) => onVolumeChange(layer.id, volume)}
          onMuteToggle={() => onMuteToggle(layer.id, !layer.muted)}
          onRemove={() => onRemove(layer.id)}
        />
      ))}
    </div>
  );
}

// Individual layer row
interface LayerRowProps {
  layer: LayerInfo;
  onVolumeChange: (volume: number) => void;
  onMuteToggle: () => void;
  onRemove: () => void;
}

function LayerRow({ layer, onVolumeChange, onMuteToggle, onRemove }: LayerRowProps) {
  const getLayerIcon = (type: LayerInfo['type']) => {
    switch (type) {
      case 'drums': return '🥁';
      case 'bass': return '🎸';
      case 'voice': return '🎤';
    }
  };

  const getLayerColor = (type: LayerInfo['type']) => {
    switch (type) {
      case 'drums': return 'bg-red-600/20 border-red-600/50';
      case 'bass': return 'bg-blue-600/20 border-blue-600/50';
      case 'voice': return 'bg-green-600/20 border-green-600/50';
    }
  };

  return (
    <div className={clsx(
      "flex items-center gap-3 p-3 rounded-lg border",
      getLayerColor(layer.type),
      layer.muted && "opacity-50"
    )}>
      <span className="text-lg">{getLayerIcon(layer.type)}</span>

      <div className="flex-1 min-w-0">
        <div className="text-white text-sm font-medium truncate">{layer.name}</div>
        <div className="text-white/40 text-xs">{(layer.duration / 1000).toFixed(1)}s</div>
      </div>

      {/* Volume slider */}
      <input
        type="range"
        min="0"
        max="1"
        step="0.01"
        value={layer.volume}
        onChange={(e) => onVolumeChange(parseFloat(e.target.value))}
        className="w-20 h-1 bg-white/20 rounded-full appearance-none cursor-pointer"
        style={{
          background: `linear-gradient(to right, white ${layer.volume * 100}%, rgba(255,255,255,0.2) ${layer.volume * 100}%)`
        }}
      />

      {/* Mute button */}
      <button
        className={clsx(
          "p-1.5 rounded transition-colors",
          layer.muted ? "bg-white/10 text-white/50" : "text-white/70 hover:text-white"
        )}
        onClick={onMuteToggle}
        title={layer.muted ? "Unmute" : "Mute"}
      >
        {layer.muted ? (
          <svg className="w-4 h-4" fill="none" viewBox="0 0 24 24" stroke="currentColor">
            <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2}
              d="M5.586 15H4a1 1 0 01-1-1v-4a1 1 0 011-1h1.586l4.707-4.707C10.923 3.663 12 4.109 12 5v14c0 .891-1.077 1.337-1.707.707L5.586 15z"
            />
            <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2}
              d="M17 14l2-2m0 0l2-2m-2 2l-2-2m2 2l2 2"
            />
          </svg>
        ) : (
          <svg className="w-4 h-4" fill="none" viewBox="0 0 24 24" stroke="currentColor">
            <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2}
              d="M15.536 8.464a5 5 0 010 7.072m2.828-9.9a9 9 0 010 12.728M5.586 15H4a1 1 0 01-1-1v-4a1 1 0 011-1h1.586l4.707-4.707C10.923 3.663 12 4.109 12 5v14c0 .891-1.077 1.337-1.707.707L5.586 15z"
            />
          </svg>
        )}
      </button>

      {/* Delete button */}
      <button
        className="p-1.5 text-red-400/70 hover:text-red-400 transition-colors"
        onClick={onRemove}
        title="Remove layer"
      >
        <svg className="w-4 h-4" fill="none" viewBox="0 0 24 24" stroke="currentColor">
          <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2}
            d="M19 7l-.867 12.142A2 2 0 0116.138 21H7.862a2 2 0 01-1.995-1.858L5 7m5 4v6m4-6v6m1-10V4a1 1 0 00-1-1h-4a1 1 0 00-1 1v3M4 7h16"
          />
        </svg>
      </button>
    </div>
  );
}
