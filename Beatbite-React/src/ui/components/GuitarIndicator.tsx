import { useMemo } from 'react';
import { GUITAR_STYLE_CONFIG, type GuitarState, type GuitarStyle } from '../../types';

/**
 * GuitarIndicator shows the current guitar note being played.
 *
 * Displays:
 * - Current note name (large)
 * - Frequency in Hz
 * - Visual waveform representation
 * - Guitar style selector
 */

interface GuitarIndicatorProps {
  guitar: GuitarState;
  onStyleChange?: (style: GuitarStyle) => void;
}

export function GuitarIndicator({ guitar, onStyleChange }: GuitarIndicatorProps) {
  const styleConfig = GUITAR_STYLE_CONFIG[guitar.style];
  const isPlaying = guitar.frequency > 0 && guitar.isPlaying;

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
          {isPlaying ? guitar.noteName : '--'}
        </div>
      </div>

      {/* Frequency */}
      <div className="mt-2 text-sm text-white/50 tabular-nums">
        {isPlaying ? `${guitar.frequency.toFixed(1)} Hz` : '-- Hz'}
      </div>

      {/* Guitar waveform visualization */}
      <div className="mt-6 w-64">
        <GuitarWaveform isPlaying={isPlaying} style={guitar.style} />
      </div>

      {/* Style selector */}
      {onStyleChange && (
        <div className="mt-6">
          <GuitarStyleSelector
            currentStyle={guitar.style}
            onSelect={onStyleChange}
          />
        </div>
      )}
    </div>
  );
}

/**
 * Visual waveform representation of the guitar sound.
 */
interface GuitarWaveformProps {
  isPlaying: boolean;
  style: GuitarStyle;
}

function GuitarWaveform({ isPlaying, style }: GuitarWaveformProps) {
  const config = GUITAR_STYLE_CONFIG[style];

  // Generate wave shape based on style
  const wavePath = useMemo(() => {
    const width = 256;
    const height = 48;
    const mid = height / 2;

    switch (style) {
      case 'clean':
        // Pure sine-like clean tone
        return generateCleanWave(width, height, mid, 4);
      case 'distorted':
        // Clipped distorted wave
        return generateDistortedWave(width, height, mid, 3);
      case 'acoustic':
        // Complex harmonic wave
        return generateAcousticWave(width, height, mid, 3);
      case 'muted':
        // Short percussive bursts
        return generateMutedWave(width, height, mid, 6);
      default:
        return generateCleanWave(width, height, mid, 4);
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

function generateCleanWave(width: number, _height: number, mid: number, cycles: number): string {
  let path = `M 0 ${mid}`;
  for (let x = 0; x <= width; x++) {
    // Clean sine wave
    const y = mid + Math.sin((x / width) * cycles * Math.PI * 2) * (mid - 4);
    path += ` L ${x} ${y}`;
  }
  return path;
}

function generateDistortedWave(width: number, _height: number, mid: number, cycles: number): string {
  let path = `M 0 ${mid}`;
  const amplitude = mid - 4;
  for (let x = 0; x <= width; x++) {
    // Clipped/distorted wave (soft clipping)
    let y = Math.sin((x / width) * cycles * Math.PI * 2) * 1.5;
    y = Math.tanh(y) * amplitude; // Soft clipping
    path += ` L ${x} ${mid + y}`;
  }
  return path;
}

function generateAcousticWave(width: number, _height: number, mid: number, cycles: number): string {
  let path = `M 0 ${mid}`;
  const amplitude = mid - 4;
  for (let x = 0; x <= width; x++) {
    // Complex waveform with harmonics (like a real string)
    const fundamental = Math.sin((x / width) * cycles * Math.PI * 2);
    const harmonic2 = Math.sin((x / width) * cycles * 2 * Math.PI * 2) * 0.5;
    const harmonic3 = Math.sin((x / width) * cycles * 3 * Math.PI * 2) * 0.25;
    // Add slight decay envelope
    const decay = Math.exp(-x / (width * 0.7));
    const y = (fundamental + harmonic2 + harmonic3) * amplitude * 0.5 * decay;
    path += ` L ${x} ${mid + y}`;
  }
  return path;
}

function generateMutedWave(width: number, _height: number, mid: number, cycles: number): string {
  let path = `M 0 ${mid}`;
  const amplitude = mid - 4;
  const segmentWidth = width / cycles;

  for (let i = 0; i < cycles; i++) {
    const startX = i * segmentWidth;
    // Short attack and quick decay - palm muted sound
    for (let x = 0; x < segmentWidth; x++) {
      const attack = Math.min(1, x / 10);
      const decay = Math.exp(-(x / segmentWidth) * 4);
      const wave = Math.sin((x / segmentWidth) * 3 * Math.PI * 2);
      const y = wave * amplitude * attack * decay;
      path += ` L ${startX + x} ${mid + y}`;
    }
  }
  return path;
}

/**
 * Guitar style selector buttons.
 */
interface GuitarStyleSelectorProps {
  currentStyle: GuitarStyle;
  onSelect: (style: GuitarStyle) => void;
}

function GuitarStyleSelector({ currentStyle, onSelect }: GuitarStyleSelectorProps) {
  const styles = Object.keys(GUITAR_STYLE_CONFIG) as GuitarStyle[];

  return (
    <div className="flex gap-2">
      {styles.map((style) => {
        const config = GUITAR_STYLE_CONFIG[style];
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
 * Compact guitar indicator for smaller displays.
 */
interface CompactGuitarIndicatorProps {
  guitar: GuitarState;
}

export function CompactGuitarIndicator({ guitar }: CompactGuitarIndicatorProps) {
  const config = GUITAR_STYLE_CONFIG[guitar.style];
  const isPlaying = guitar.frequency > 0 && guitar.isPlaying;

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
        {isPlaying ? guitar.noteName : '--'}
      </span>
      <span className="text-sm text-white/50 tabular-nums">
        {isPlaying ? `${guitar.frequency.toFixed(0)} Hz` : ''}
      </span>
    </div>
  );
}
