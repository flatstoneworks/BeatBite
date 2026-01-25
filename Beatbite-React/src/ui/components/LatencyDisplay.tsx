import { useMemo } from 'react';
import { getLatencyQuality, LATENCY_COLORS } from '../../types';

/**
 * LatencyDisplay shows the measured audio latency.
 *
 * Colors indicate latency quality:
 * - Green: < 15ms (imperceptible)
 * - Yellow: 15-50ms (acceptable)
 * - Orange: 50-100ms (noticeable but usable)
 * - Red: > 100ms (problematic)
 */

interface LatencyDisplayProps {
  latencyMs: number;
}

export function LatencyDisplay({ latencyMs }: LatencyDisplayProps) {
  const quality = useMemo(() => getLatencyQuality(latencyMs), [latencyMs]);
  const color = LATENCY_COLORS[quality];

  const latencyLabel = latencyMs <= 0 ? '-- ms' : `${latencyMs.toFixed(1)} ms`;

  const qualityLabel = useMemo(() => {
    switch (quality) {
      case 'unknown': return 'Tap speed icon to measure';
      case 'excellent': return 'Excellent';
      case 'good': return 'Good';
      case 'acceptable': return 'Acceptable';
      case 'poor': return 'High latency';
    }
  }, [quality]);

  return (
    <div
      className="px-4 py-3 rounded-xl bg-white/5 border transition-colors"
      style={{ borderColor: `${color}30` }}
    >
      <div className="flex items-center gap-2">
        <svg
          className="w-4 h-4"
          fill="none"
          viewBox="0 0 24 24"
          stroke={color}
        >
          <path
            strokeLinecap="round"
            strokeLinejoin="round"
            strokeWidth={2}
            d="M12 8v4l3 3m6-3a9 9 0 11-18 0 9 9 0 0118 0z"
          />
        </svg>
        <span className="text-white/50 text-xs tracking-wider font-medium">
          LATENCY
        </span>
      </div>

      <div className="mt-1 flex items-baseline gap-2">
        <span
          className="text-2xl font-semibold tabular-nums"
          style={{ color }}
        >
          {latencyLabel}
        </span>
        <span
          className="text-sm opacity-70"
          style={{ color }}
        >
          {qualityLabel}
        </span>
      </div>
    </div>
  );
}

/**
 * Compact latency indicator for use in headers.
 */
interface LatencyIndicatorProps {
  latencyMs: number;
}

export function LatencyIndicator({ latencyMs }: LatencyIndicatorProps) {
  const quality = useMemo(() => getLatencyQuality(latencyMs), [latencyMs]);
  const color = LATENCY_COLORS[quality];

  return (
    <div
      className="inline-flex items-center gap-1.5 px-2 py-1 rounded"
      style={{ backgroundColor: `${color}20` }}
    >
      <div
        className="w-2 h-2 rounded-full"
        style={{ backgroundColor: color }}
      />
      <span
        className="text-xs font-semibold"
        style={{ color }}
      >
        {latencyMs <= 0 ? '--' : `${latencyMs.toFixed(0)}ms`}
      </span>
    </div>
  );
}
