import { useMemo } from 'react';
import { DRUM_CONFIG, type DrumType, type PitchState } from '../../types';

/**
 * DrumIndicator shows which drum is being triggered based on voice pitch.
 *
 * Displays:
 * - Large visual indicator for current drum
 * - All four drums with active highlighting
 * - Current frequency being detected
 */

interface DrumIndicatorProps {
  currentDrum: DrumType | null;
  pitch: PitchState;
}

export function DrumIndicator({ currentDrum, pitch }: DrumIndicatorProps) {
  const hasValidPitch = pitch.frequency > 0 && pitch.confidence > 0.5;

  return (
    <div className="flex flex-col items-center">
      {/* Drum grid */}
      <div className="grid grid-cols-2 gap-4">
        {(Object.keys(DRUM_CONFIG) as DrumType[]).map((drumType) => (
          <DrumPad
            key={drumType}
            type={drumType}
            isActive={currentDrum === drumType}
          />
        ))}
      </div>

      {/* Frequency display */}
      <div className="mt-6 text-center">
        <div className="text-sm text-white/50 tabular-nums">
          {hasValidPitch ? `${pitch.frequency.toFixed(0)} Hz` : '-- Hz'}
        </div>
        {currentDrum && (
          <div className="mt-1 text-xs text-white/30">
            {DRUM_CONFIG[currentDrum].pitchRange}
          </div>
        )}
      </div>
    </div>
  );
}

interface DrumPadProps {
  type: DrumType;
  isActive: boolean;
}

function DrumPad({ type, isActive }: DrumPadProps) {
  const config = DRUM_CONFIG[type];

  const style = useMemo(() => {
    if (!isActive) {
      return {
        backgroundColor: 'rgba(255, 255, 255, 0.05)',
        borderColor: 'rgba(255, 255, 255, 0.1)',
      };
    }
    return {
      backgroundColor: `${config.color}30`,
      borderColor: config.color,
      boxShadow: `0 0 20px ${config.color}50`,
    };
  }, [isActive, config.color]);

  return (
    <div
      className="w-24 h-24 rounded-xl border-2 flex flex-col items-center justify-center transition-all duration-75"
      style={style}
    >
      <span className="text-3xl mb-1">
        {type === 'kick' && '💥'}
        {type === 'snare' && '🔥'}
        {type === 'tom' && '🪘'}
        {type === 'hihat' && '✨'}
      </span>
      <span
        className="text-xs font-medium uppercase tracking-wider"
        style={{ color: isActive ? config.color : 'rgba(255, 255, 255, 0.5)' }}
      >
        {config.displayName}
      </span>
    </div>
  );
}

/**
 * Compact drum indicator for smaller displays.
 */
interface CompactDrumIndicatorProps {
  currentDrum: DrumType | null;
}

export function CompactDrumIndicator({ currentDrum }: CompactDrumIndicatorProps) {
  if (!currentDrum) {
    return (
      <div className="inline-flex items-center gap-2 px-3 py-2 rounded-lg bg-white/5 border border-white/10">
        <span className="text-white/30">--</span>
      </div>
    );
  }

  const config = DRUM_CONFIG[currentDrum];

  return (
    <div
      className="inline-flex items-center gap-2 px-3 py-2 rounded-lg border"
      style={{
        backgroundColor: `${config.color}20`,
        borderColor: `${config.color}50`,
      }}
    >
      <span className="text-xl">
        {currentDrum === 'kick' && '💥'}
        {currentDrum === 'snare' && '🔥'}
        {currentDrum === 'tom' && '🪘'}
        {currentDrum === 'hihat' && '✨'}
      </span>
      <span
        className="text-sm font-medium uppercase"
        style={{ color: config.color }}
      >
        {config.displayName}
      </span>
    </div>
  );
}
