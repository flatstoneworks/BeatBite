import { useMemo } from 'react';
import { PIANO_STYLE_CONFIG, type PianoState, type PianoStyle } from '../../types';

/**
 * PianoIndicator shows the current piano note being played.
 *
 * Displays:
 * - Current note name (large)
 * - Frequency in Hz
 * - Visual waveform representation
 * - Piano style selector
 */

interface PianoIndicatorProps {
  piano: PianoState;
  onStyleChange?: (style: PianoStyle) => void;
}

export function PianoIndicator({ piano, onStyleChange }: PianoIndicatorProps) {
  const styleConfig = PIANO_STYLE_CONFIG[piano.style];
  const isPlaying = piano.frequency > 0 && piano.isPlaying;

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
          {isPlaying ? piano.noteName : '--'}
        </div>
      </div>

      {/* Frequency */}
      <div className="mt-2 text-sm text-white/50 tabular-nums">
        {isPlaying ? `${piano.frequency.toFixed(1)} Hz` : '-- Hz'}
      </div>

      {/* Piano waveform visualization */}
      <div className="mt-6 w-64">
        <PianoWaveform isPlaying={isPlaying} style={piano.style} />
      </div>

      {/* Style selector */}
      {onStyleChange && (
        <div className="mt-6">
          <PianoStyleSelector
            currentStyle={piano.style}
            onSelect={onStyleChange}
          />
        </div>
      )}
    </div>
  );
}

/**
 * Visual waveform representation of the piano sound.
 */
interface PianoWaveformProps {
  isPlaying: boolean;
  style: PianoStyle;
}

function PianoWaveform({ isPlaying, style }: PianoWaveformProps) {
  const config = PIANO_STYLE_CONFIG[style];

  // Generate wave shape based on style
  const wavePath = useMemo(() => {
    const width = 256;
    const height = 48;
    const mid = height / 2;

    switch (style) {
      case 'grand':
        // Rich harmonic wave
        return generateGrandWave(width, height, mid, 3);
      case 'upright':
        // Slightly brighter wave
        return generateUprightWave(width, height, mid, 3);
      case 'electric':
        // Bright electric piano wave
        return generateElectricWave(width, height, mid, 4);
      case 'rhodes':
        // Soft pad-like wave
        return generateRhodesWave(width, height, mid, 2);
      case 'synth':
        // Square-ish synth wave
        return generateSynthWave(width, height, mid, 3);
      default:
        return generateGrandWave(width, height, mid, 3);
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

function generateGrandWave(width: number, _height: number, mid: number, cycles: number): string {
  let path = `M 0 ${mid}`;
  for (let x = 0; x <= width; x++) {
    // Rich harmonic content with decay
    const decay = Math.exp(-x / (width * 0.5));
    const fundamental = Math.sin((x / width) * cycles * Math.PI * 2);
    const harmonic2 = 0.3 * Math.sin((x / width) * cycles * 2 * Math.PI * 2);
    const harmonic3 = 0.1 * Math.sin((x / width) * cycles * 3 * Math.PI * 2);
    const y = mid + (fundamental + harmonic2 + harmonic3) * (mid - 4) * 0.7 * decay;
    path += ` L ${x} ${y}`;
  }
  return path;
}

function generateElectricWave(width: number, _height: number, mid: number, cycles: number): string {
  let path = `M 0 ${mid}`;
  for (let x = 0; x <= width; x++) {
    // Bell-like FM synthesis character
    const modulator = Math.sin((x / width) * cycles * 8 * Math.PI * 2) * 0.3;
    const carrier = Math.sin((x / width) * cycles * Math.PI * 2 + modulator);
    const decay = Math.exp(-x / (width * 0.4));
    const y = mid + carrier * (mid - 4) * decay;
    path += ` L ${x} ${y}`;
  }
  return path;
}

function generateSynthWave(width: number, _height: number, mid: number, cycles: number): string {
  let path = `M 0 ${mid}`;
  for (let x = 0; x <= width; x++) {
    // Square-ish wave with some rounding
    const phase = (x / width) * cycles * Math.PI * 2;
    const squareish = Math.tanh(4 * Math.sin(phase));
    const y = mid + squareish * (mid - 4) * 0.8;
    path += ` L ${x} ${y}`;
  }
  return path;
}

function generateUprightWave(width: number, _height: number, mid: number, cycles: number): string {
  let path = `M 0 ${mid}`;
  for (let x = 0; x <= width; x++) {
    // Brighter than grand with faster decay
    const decay = Math.exp(-x / (width * 0.4));
    const fundamental = Math.sin((x / width) * cycles * Math.PI * 2);
    const harmonic2 = 0.4 * Math.sin((x / width) * cycles * 2 * Math.PI * 2);
    const harmonic3 = 0.2 * Math.sin((x / width) * cycles * 3 * Math.PI * 2);
    const y = mid + (fundamental + harmonic2 + harmonic3) * (mid - 4) * 0.7 * decay;
    path += ` L ${x} ${y}`;
  }
  return path;
}

function generateRhodesWave(width: number, _height: number, mid: number, cycles: number): string {
  let path = `M 0 ${mid}`;
  for (let x = 0; x <= width; x++) {
    // Smooth detuned wave for rhodes effect
    const wave1 = Math.sin((x / width) * cycles * Math.PI * 2);
    const wave2 = Math.sin((x / width) * cycles * 1.01 * Math.PI * 2);
    const combined = (wave1 + wave2) * 0.5;
    const y = mid + combined * (mid - 4) * 0.9;
    path += ` L ${x} ${y}`;
  }
  return path;
}

/**
 * Piano style selector buttons.
 */
interface PianoStyleSelectorProps {
  currentStyle: PianoStyle;
  onSelect: (style: PianoStyle) => void;
}

function PianoStyleSelector({ currentStyle, onSelect }: PianoStyleSelectorProps) {
  const styles = Object.keys(PIANO_STYLE_CONFIG) as PianoStyle[];

  return (
    <div className="flex gap-2">
      {styles.map((style) => {
        const config = PIANO_STYLE_CONFIG[style];
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
 * Compact piano indicator for smaller displays.
 */
interface CompactPianoIndicatorProps {
  piano: PianoState;
}

export function CompactPianoIndicator({ piano }: CompactPianoIndicatorProps) {
  const config = PIANO_STYLE_CONFIG[piano.style];
  const isPlaying = piano.frequency > 0 && piano.isPlaying;

  return (
    <div
      className="inline-flex items-center gap-2 px-3 py-2 rounded-lg border"
      style={{
        backgroundColor: isPlaying ? `${config.color}20` : 'rgba(255, 255, 255, 0.05)',
        borderColor: isPlaying ? `${config.color}50` : 'rgba(255, 255, 255, 0.1)',
      }}
    >
      <span className="text-xl">🎹</span>
      <span
        className="text-2xl font-bold"
        style={{ color: isPlaying ? config.color : '#6b7280' }}
      >
        {isPlaying ? piano.noteName : '--'}
      </span>
      <span className="text-sm text-white/50 tabular-nums">
        {isPlaying ? `${piano.frequency.toFixed(0)} Hz` : ''}
      </span>
    </div>
  );
}
