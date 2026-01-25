import { useMemo } from 'react';
import type { PitchState } from '../../types';

/**
 * PitchDisplay shows the detected pitch in real-time.
 *
 * Displays:
 * - Note name (e.g., "A4")
 * - Frequency in Hz
 * - Cents deviation from perfect pitch (tuner-style)
 * - Confidence indicator
 */

interface PitchDisplayProps {
  pitch: PitchState;
}

export function PitchDisplay({ pitch }: PitchDisplayProps) {
  const hasValidPitch = pitch.frequency > 0 && pitch.confidence > 0.5;

  // Color based on how in-tune the note is
  const tuningColor = useMemo(() => {
    if (!hasValidPitch) return '#6b7280'; // gray
    const absCents = Math.abs(pitch.cents);
    if (absCents < 5) return '#22c55e';   // green - very in tune
    if (absCents < 15) return '#84cc16';  // lime - good
    if (absCents < 25) return '#eab308';  // yellow - okay
    if (absCents < 40) return '#f97316';  // orange - off
    return '#ef4444';                      // red - very off
  }, [hasValidPitch, pitch.cents]);

  return (
    <div className="flex flex-col items-center">
      {/* Note name - large display */}
      <div className="text-6xl font-bold tracking-tight" style={{ color: tuningColor }}>
        {hasValidPitch ? pitch.noteName : '--'}
      </div>

      {/* Octave indicator */}
      {hasValidPitch && (
        <div className="text-2xl font-medium text-white/60 -mt-2">
          {pitch.octave}
        </div>
      )}

      {/* Frequency */}
      <div className="mt-2 text-sm text-white/50 tabular-nums">
        {hasValidPitch ? `${pitch.frequency.toFixed(1)} Hz` : '-- Hz'}
      </div>

      {/* Cents deviation bar (tuner style) */}
      <div className="mt-4 w-48">
        <CentsBar cents={pitch.cents} isActive={hasValidPitch} />
      </div>

      {/* Confidence indicator */}
      {hasValidPitch && (
        <div className="mt-2 text-xs text-white/40">
          {Math.round(pitch.confidence * 100)}% confidence
        </div>
      )}
    </div>
  );
}

/**
 * CentsBar shows pitch deviation like a guitar tuner.
 * Center = perfect pitch, left = flat, right = sharp
 */
interface CentsBarProps {
  cents: number;
  isActive: boolean;
}

function CentsBar({ cents, isActive }: CentsBarProps) {
  // Clamp cents to -50 to +50 range
  const clampedCents = Math.max(-50, Math.min(50, cents));
  // Convert to percentage (0% = -50 cents, 50% = 0 cents, 100% = +50 cents)
  const position = ((clampedCents + 50) / 100) * 100;

  const indicatorColor = useMemo(() => {
    if (!isActive) return '#6b7280';
    const absCents = Math.abs(cents);
    if (absCents < 5) return '#22c55e';
    if (absCents < 15) return '#84cc16';
    if (absCents < 25) return '#eab308';
    return '#f97316';
  }, [isActive, cents]);

  return (
    <div className="relative">
      {/* Labels */}
      <div className="flex justify-between text-xs text-white/30 mb-1">
        <span>Flat</span>
        <span>Sharp</span>
      </div>

      {/* Bar background */}
      <div className="relative h-3 bg-white/10 rounded-full overflow-hidden">
        {/* Center marker */}
        <div className="absolute left-1/2 top-0 bottom-0 w-0.5 bg-white/30 -translate-x-1/2" />

        {/* Tick marks */}
        <div className="absolute left-1/4 top-0 bottom-0 w-px bg-white/10" />
        <div className="absolute left-3/4 top-0 bottom-0 w-px bg-white/10" />

        {/* Position indicator */}
        {isActive && (
          <div
            className="absolute top-0 bottom-0 w-3 rounded-full transition-all duration-75"
            style={{
              left: `calc(${position}% - 6px)`,
              backgroundColor: indicatorColor,
              boxShadow: `0 0 8px ${indicatorColor}`,
            }}
          />
        )}
      </div>

      {/* Cents value */}
      <div className="text-center mt-1 text-xs tabular-nums" style={{ color: indicatorColor }}>
        {isActive ? (
          <>
            {cents > 0 ? '+' : ''}{cents.toFixed(0)} cents
          </>
        ) : (
          <span className="text-white/30">-- cents</span>
        )}
      </div>
    </div>
  );
}

/**
 * Compact pitch display for use alongside other elements.
 */
interface CompactPitchDisplayProps {
  pitch: PitchState;
}

export function CompactPitchDisplay({ pitch }: CompactPitchDisplayProps) {
  const hasValidPitch = pitch.frequency > 0 && pitch.confidence > 0.5;

  const color = useMemo(() => {
    if (!hasValidPitch) return '#6b7280';
    const absCents = Math.abs(pitch.cents);
    if (absCents < 10) return '#22c55e';
    if (absCents < 25) return '#eab308';
    return '#f97316';
  }, [hasValidPitch, pitch.cents]);

  return (
    <div
      className="inline-flex items-center gap-2 px-3 py-2 rounded-lg bg-white/5 border"
      style={{ borderColor: `${color}30` }}
    >
      <span className="text-2xl font-bold" style={{ color }}>
        {hasValidPitch ? pitch.note : '--'}
      </span>
      <span className="text-sm text-white/50 tabular-nums">
        {hasValidPitch ? `${pitch.frequency.toFixed(0)} Hz` : ''}
      </span>
    </div>
  );
}
