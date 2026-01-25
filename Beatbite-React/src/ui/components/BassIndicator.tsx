import { useMemo } from 'react';
import { BASS_STYLE_CONFIG, type BassState, type BassStyle } from '../../types';

/**
 * BassIndicator shows the current bass note being played.
 *
 * Displays:
 * - Current note name (large)
 * - Frequency in Hz
 * - Visual waveform representation
 * - Bass style selector
 */

interface BassIndicatorProps {
  bass: BassState;
  onStyleChange?: (style: BassStyle) => void;
}

export function BassIndicator({ bass, onStyleChange }: BassIndicatorProps) {
  const styleConfig = BASS_STYLE_CONFIG[bass.style];
  const isPlaying = bass.frequency > 0 && bass.isPlaying;

  return (
    <div className="flex flex-col items-center">
      {/* Note display */}
      <div className="relative">
        {/* Glow effect when playing */}
        {isPlaying && (
          <div
            className="absolute inset-0 blur-2xl opacity-30 rounded-full"
            style={{ backgroundColor: styleConfig.color }}
          />
        )}

        {/* Note name */}
        <div
          className="text-7xl font-bold tracking-tight transition-colors duration-100"
          style={{ color: isPlaying ? styleConfig.color : '#6b7280' }}
        >
          {isPlaying ? bass.noteName : '--'}
        </div>
      </div>

      {/* Frequency */}
      <div className="mt-2 text-sm text-white/50 tabular-nums">
        {isPlaying ? `${bass.frequency.toFixed(1)} Hz` : '-- Hz'}
      </div>

      {/* Bass waveform visualization */}
      <div className="mt-6 w-64">
        <BassWaveform isPlaying={isPlaying} style={bass.style} />
      </div>

      {/* Style selector */}
      {onStyleChange && (
        <div className="mt-6">
          <BassStyleSelector
            currentStyle={bass.style}
            onSelect={onStyleChange}
          />
        </div>
      )}
    </div>
  );
}

/**
 * Visual waveform representation of the bass sound.
 */
interface BassWaveformProps {
  isPlaying: boolean;
  style: BassStyle;
}

function BassWaveform({ isPlaying, style }: BassWaveformProps) {
  const config = BASS_STYLE_CONFIG[style];

  // Generate wave shape based on style
  const wavePath = useMemo(() => {
    const width = 256;
    const height = 48;
    const mid = height / 2;

    switch (style) {
      case 'sub':
        // Smooth sine wave
        return generateSineWave(width, height, mid, 2);
      case 'synth':
        // Saw wave
        return generateSawWave(width, height, mid, 3);
      case 'pluck':
        // Decaying wave
        return generatePluckWave(width, height, mid, 4);
      case 'wobble':
        // Modulated wave
        return generateWobbleWave(width, height, mid, 2);
      default:
        return generateSineWave(width, height, mid, 2);
    }
  }, [style]);

  return (
    <div className="relative h-12 rounded-lg overflow-hidden bg-white/5">
      <svg
        className="w-full h-full"
        viewBox="0 0 256 48"
        preserveAspectRatio="none"
      >
        <path
          d={wavePath}
          fill="none"
          stroke={isPlaying ? config.color : '#374151'}
          strokeWidth="2"
          className="transition-all duration-150"
          style={{
            opacity: isPlaying ? 1 : 0.3,
            filter: isPlaying ? `drop-shadow(0 0 4px ${config.color})` : 'none',
          }}
        />
      </svg>

      {/* Animated scan line when playing */}
      {isPlaying && (
        <div
          className="absolute top-0 bottom-0 w-1 animate-scan"
          style={{ backgroundColor: config.color, opacity: 0.5 }}
        />
      )}
    </div>
  );
}

function generateSineWave(width: number, _height: number, mid: number, cycles: number): string {
  let path = `M 0 ${mid}`;
  for (let x = 0; x <= width; x++) {
    const y = mid + Math.sin((x / width) * cycles * Math.PI * 2) * (mid - 4);
    path += ` L ${x} ${y}`;
  }
  return path;
}

function generateSawWave(width: number, _height: number, mid: number, cycles: number): string {
  let path = `M 0 ${mid}`;
  const segmentWidth = width / cycles;
  const amplitude = mid - 4;
  for (let i = 0; i < cycles; i++) {
    const startX = i * segmentWidth;
    path += ` L ${startX} ${mid + amplitude}`;
    path += ` L ${startX + segmentWidth} ${mid - amplitude}`;
  }
  return path;
}

function generatePluckWave(width: number, _height: number, mid: number, cycles: number): string {
  let path = `M 0 ${mid}`;
  for (let x = 0; x <= width; x++) {
    const decay = Math.exp(-x / (width * 0.3));
    const y = mid + Math.sin((x / width) * cycles * Math.PI * 2) * (mid - 4) * decay;
    path += ` L ${x} ${y}`;
  }
  return path;
}

function generateWobbleWave(width: number, _height: number, mid: number, cycles: number): string {
  let path = `M 0 ${mid}`;
  for (let x = 0; x <= width; x++) {
    const modulation = 0.5 + 0.5 * Math.sin((x / width) * 4 * Math.PI);
    const y = mid + Math.sin((x / width) * cycles * Math.PI * 2) * (mid - 4) * modulation;
    path += ` L ${x} ${y}`;
  }
  return path;
}

/**
 * Bass style selector buttons.
 */
interface BassStyleSelectorProps {
  currentStyle: BassStyle;
  onSelect: (style: BassStyle) => void;
}

function BassStyleSelector({ currentStyle, onSelect }: BassStyleSelectorProps) {
  const styles = Object.keys(BASS_STYLE_CONFIG) as BassStyle[];

  return (
    <div className="flex gap-2">
      {styles.map((style) => {
        const config = BASS_STYLE_CONFIG[style];
        const isSelected = style === currentStyle;

        return (
          <button
            key={style}
            onClick={(e) => {
              e.stopPropagation();
              onSelect(style);
            }}
            className="px-3 py-2 rounded-lg text-xs font-medium uppercase tracking-wider transition-all pointer-events-auto"
            style={{
              backgroundColor: isSelected ? `${config.color}30` : 'rgba(255, 255, 255, 0.05)',
              borderColor: isSelected ? config.color : 'transparent',
              borderWidth: 1,
              color: isSelected ? config.color : 'rgba(255, 255, 255, 0.5)',
            }}
            title={config.description}
          >
            {config.displayName}
          </button>
        );
      })}
    </div>
  );
}

/**
 * Compact bass indicator for smaller displays.
 */
interface CompactBassIndicatorProps {
  bass: BassState;
}

export function CompactBassIndicator({ bass }: CompactBassIndicatorProps) {
  const config = BASS_STYLE_CONFIG[bass.style];
  const isPlaying = bass.frequency > 0 && bass.isPlaying;

  return (
    <div
      className="inline-flex items-center gap-2 px-3 py-2 rounded-lg border"
      style={{
        backgroundColor: isPlaying ? `${config.color}20` : 'rgba(255, 255, 255, 0.05)',
        borderColor: isPlaying ? `${config.color}50` : 'rgba(255, 255, 255, 0.1)',
      }}
    >
      <span className="text-xl">🎸</span>
      <span
        className="text-2xl font-bold"
        style={{ color: isPlaying ? config.color : '#6b7280' }}
      >
        {isPlaying ? bass.noteName : '--'}
      </span>
      <span className="text-sm text-white/50 tabular-nums">
        {isPlaying ? `${bass.frequency.toFixed(0)} Hz` : ''}
      </span>
    </div>
  );
}
