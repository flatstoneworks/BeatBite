import { useMemo } from 'react';
import { clsx } from 'clsx';

/**
 * AudioVisualizer displays real-time audio levels.
 *
 * Shows a horizontal bar that responds to audio input level,
 * providing visual feedback that the audio is being captured.
 */

interface AudioVisualizerProps {
  level: number;      // 0.0 to 1.0
  isActive: boolean;
  barCount?: number;  // Number of bars to display
}

export function AudioVisualizer({
  level,
  isActive,
  barCount = 20,
}: AudioVisualizerProps) {
  // Generate bar heights based on level and position
  const bars = useMemo(() => {
    if (!isActive) return [];

    // Use a seeded pseudo-random for consistent variation
    const seed = 42;
    const random = (i: number) => {
      const x = Math.sin(seed + i) * 10000;
      return x - Math.floor(x);
    };

    return Array.from({ length: barCount }, (_, i) => {
      // Create varied heights based on level and position
      const centerDistance = Math.abs(i - barCount / 2) / (barCount / 2);
      const baseHeight = (1.0 - centerDistance * 0.5) * level;
      const variation = random(i) * 0.3;
      const height = Math.max(0.05, Math.min(1.0, baseHeight + variation * level));

      return height;
    });
  }, [level, isActive, barCount]);

  if (!isActive) return null;

  return (
    <div className="w-full h-full flex items-center justify-center gap-0.5 bg-white/5 rounded-lg p-2">
      {bars.map((height, index) => (
        <Bar key={index} height={height} />
      ))}
    </div>
  );
}

function Bar({ height }: { height: number }) {
  const color = useMemo(() => {
    if (height < 0.3) return 'bg-purple-600';
    if (height < 0.6) return 'bg-purple-400';
    if (height < 0.85) return 'bg-purple-300';
    return 'bg-pink-400';
  }, [height]);

  return (
    <div className="flex-1 h-full flex items-center justify-center">
      <div
        className={clsx(
          'w-full rounded-sm transition-all duration-50',
          color
        )}
        style={{
          height: `${Math.round(height * 100)}%`,
          minHeight: '4px',
        }}
      />
    </div>
  );
}

/**
 * WaveformVisualizer shows a waveform-style visualization.
 * Alternative to bar visualization.
 */
interface WaveformVisualizerProps {
  level: number;
  isActive: boolean;
}

export function WaveformVisualizer({ level, isActive }: WaveformVisualizerProps) {
  if (!isActive) return null;

  // Generate wave path
  const width = 300;
  const height = 60;
  const points = 50;

  const pathD = useMemo(() => {
    const centerY = height / 2;
    let path = `M 0 ${centerY}`;

    for (let i = 0; i <= points; i++) {
      const x = (i / points) * width;
      const normalizedX = i / points;
      const waveY = Math.sin(normalizedX * 4 * Math.PI) * level * height * 0.4;
      path += ` L ${x} ${centerY + waveY}`;
    }

    return path;
  }, [level, width, height, points]);

  return (
    <svg
      width="100%"
      height="100%"
      viewBox={`0 0 ${width} ${height}`}
      preserveAspectRatio="none"
      className="w-full h-full"
    >
      <path
        d={pathD}
        fill="none"
        stroke="rgb(192 132 252)" // purple-400
        strokeWidth="2"
        className="transition-all duration-75"
      />
    </svg>
  );
}
