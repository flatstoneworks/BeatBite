import { useState, useCallback, useRef, useEffect } from 'react';
import { clsx } from 'clsx';

/**
 * VolumeSlider is a vertical slider for adjusting volume.
 *
 * Inspired by Netflix's volume control - slide up/down on the right
 * edge of the screen to adjust volume. This follows the user experience
 * principles outlined in the Beatbite spec.
 */

interface VolumeSliderProps {
  value: number;           // 0.0 to 1.0
  onChange: (value: number) => void;
  min?: number;
  max?: number;
}

export function VolumeSlider({
  value,
  onChange,
  min = 0,
  max = 1,
}: VolumeSliderProps) {
  const [isDragging, setIsDragging] = useState(false);
  const [dragStartValue, setDragStartValue] = useState(0);
  const [dragStartY, setDragStartY] = useState(0);
  const containerRef = useRef<HTMLDivElement>(null);

  // Get volume icon based on level
  const VolumeIcon = useCallback(() => {
    if (value <= 0) {
      return (
        <svg className="w-5 h-5" fill="none" viewBox="0 0 24 24" stroke="currentColor">
          <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2}
            d="M5.586 15H4a1 1 0 01-1-1v-4a1 1 0 011-1h1.586l4.707-4.707C10.923 3.663 12 4.109 12 5v14c0 .891-1.077 1.337-1.707.707L5.586 15z"
          />
          <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2}
            d="M17 14l2-2m0 0l2-2m-2 2l-2-2m2 2l2 2"
          />
        </svg>
      );
    }
    if (value < 0.3) {
      return (
        <svg className="w-5 h-5" fill="none" viewBox="0 0 24 24" stroke="currentColor">
          <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2}
            d="M5.586 15H4a1 1 0 01-1-1v-4a1 1 0 011-1h1.586l4.707-4.707C10.923 3.663 12 4.109 12 5v14c0 .891-1.077 1.337-1.707.707L5.586 15z"
          />
        </svg>
      );
    }
    if (value < 0.7) {
      return (
        <svg className="w-5 h-5" fill="none" viewBox="0 0 24 24" stroke="currentColor">
          <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2}
            d="M5.586 15H4a1 1 0 01-1-1v-4a1 1 0 011-1h1.586l4.707-4.707C10.923 3.663 12 4.109 12 5v14c0 .891-1.077 1.337-1.707.707L5.586 15z"
          />
          <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2}
            d="M15.536 8.464a5 5 0 010 7.072"
          />
        </svg>
      );
    }
    return (
      <svg className="w-5 h-5" fill="none" viewBox="0 0 24 24" stroke="currentColor">
        <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2}
          d="M5.586 15H4a1 1 0 01-1-1v-4a1 1 0 011-1h1.586l4.707-4.707C10.923 3.663 12 4.109 12 5v14c0 .891-1.077 1.337-1.707.707L5.586 15z"
        />
        <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2}
          d="M15.536 8.464a5 5 0 010 7.072M18.364 5.636a9 9 0 010 12.728"
        />
      </svg>
    );
  }, [value]);

  // Handle pointer down
  const handlePointerDown = useCallback((e: React.PointerEvent) => {
    e.preventDefault();
    e.stopPropagation();
    setIsDragging(true);
    setDragStartValue(value);
    setDragStartY(e.clientY);

    // Capture pointer for out-of-bounds tracking
    (e.target as HTMLElement).setPointerCapture(e.pointerId);
  }, [value]);

  // Handle pointer move
  const handlePointerMove = useCallback((e: React.PointerEvent) => {
    if (!isDragging) return;

    e.preventDefault();
    e.stopPropagation();

    // Calculate new value based on drag distance
    // Moving up increases volume, moving down decreases
    const dragDistance = dragStartY - e.clientY;
    const sensitivity = 0.003; // Adjust for desired sensitivity
    const newValue = Math.max(min, Math.min(max, dragStartValue + dragDistance * sensitivity));
    onChange(newValue);
  }, [isDragging, dragStartY, dragStartValue, onChange, min, max]);

  // Handle pointer up
  const handlePointerUp = useCallback((e: React.PointerEvent) => {
    setIsDragging(false);
    (e.target as HTMLElement).releasePointerCapture(e.pointerId);
  }, []);

  // Also handle global mouse up in case pointer leaves the element
  useEffect(() => {
    const handleGlobalUp = () => {
      if (isDragging) {
        setIsDragging(false);
      }
    };

    window.addEventListener('pointerup', handleGlobalUp);
    return () => window.removeEventListener('pointerup', handleGlobalUp);
  }, [isDragging]);

  const fillPercentage = ((value - min) / (max - min)) * 100;

  return (
    <div
      ref={containerRef}
      className={clsx(
        'h-full flex flex-col items-center justify-center py-3 rounded-2xl transition-all',
        isDragging ? 'w-12 bg-white/15' : 'w-10 bg-white/8'
      )}
      onPointerDown={handlePointerDown}
      onPointerMove={handlePointerMove}
      onPointerUp={handlePointerUp}
      onPointerCancel={handlePointerUp}
      style={{ touchAction: 'none' }}
    >
      {/* Volume icon */}
      <div className="text-white/70">
        <VolumeIcon />
      </div>

      {/* Slider track */}
      <div className="flex-1 w-full flex items-center justify-center py-3">
        <div className="relative h-full w-1.5">
          {/* Track background */}
          <div className="absolute inset-0 bg-white/10 rounded-full" />

          {/* Fill */}
          <div
            className="absolute bottom-0 left-0 right-0 bg-gradient-to-t from-purple-500 to-purple-400 rounded-full transition-all duration-50"
            style={{ height: `${fillPercentage}%` }}
          />

          {/* Thumb */}
          <div
            className={clsx(
              'absolute left-1/2 -translate-x-1/2 rounded-full bg-white shadow-lg transition-all duration-50',
              isDragging ? 'w-4 h-4 shadow-purple-500/50' : 'w-3.5 h-3.5'
            )}
            style={{
              bottom: `calc(${fillPercentage}% - ${isDragging ? 8 : 7}px)`,
              boxShadow: isDragging
                ? '0 0 12px rgba(139, 92, 246, 0.5)'
                : '0 2px 4px rgba(0, 0, 0, 0.3)',
            }}
          />
        </div>
      </div>

      {/* Percentage label when dragging */}
      {isDragging ? (
        <div className="px-2 py-1 bg-purple-600/80 rounded text-white text-xs font-semibold">
          {Math.round(value * 100)}%
        </div>
      ) : (
        <div className="h-6" /> // Spacer to maintain layout
      )}
    </div>
  );
}

/**
 * HorizontalVolumeSlider for use in loop editing.
 */
interface HorizontalVolumeSliderProps {
  value: number;
  onChange: (value: number) => void;
  label?: string;
}

export function HorizontalVolumeSlider({
  value,
  onChange,
  label,
}: HorizontalVolumeSliderProps) {
  return (
    <div className="flex flex-col gap-2">
      {label && (
        <label className="text-white/60 text-sm">{label}</label>
      )}
      <input
        type="range"
        min="0"
        max="1"
        step="0.01"
        value={value}
        onChange={(e) => onChange(parseFloat(e.target.value))}
        className="w-full h-1 bg-white/10 rounded-full appearance-none cursor-pointer
          [&::-webkit-slider-thumb]:appearance-none
          [&::-webkit-slider-thumb]:w-4
          [&::-webkit-slider-thumb]:h-4
          [&::-webkit-slider-thumb]:rounded-full
          [&::-webkit-slider-thumb]:bg-white
          [&::-webkit-slider-thumb]:cursor-pointer
          [&::-webkit-slider-thumb]:shadow-md
          [&::-moz-range-thumb]:w-4
          [&::-moz-range-thumb]:h-4
          [&::-moz-range-thumb]:rounded-full
          [&::-moz-range-thumb]:bg-white
          [&::-moz-range-thumb]:border-0
          [&::-moz-range-thumb]:cursor-pointer"
      />
    </div>
  );
}
