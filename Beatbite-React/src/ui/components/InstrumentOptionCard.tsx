/**
 * InstrumentOptionCard - Unified card component for instrument selection.
 *
 * Used in both InstrumentSetupScreen and LibraryScreen for consistent UI.
 */

import { clsx } from 'clsx';
import { CheckIcon } from './Icons';

export interface InstrumentOptionCardProps {
  // Required
  name: string;
  description: string;
  color: string;

  // Selection state
  isSelected?: boolean;
  isPlaying?: boolean;
  onClick?: () => void;

  // Tag (e.g., "Electronic", "Realistic")
  tag?: string;
  tagColor?: string;

  // Optional slider (for setup screen)
  sliderLabel?: string;
  sliderValue?: number;
  onSliderChange?: (value: number) => void;


  // Optional badges
  isPremium?: boolean;
  showFreeLabel?: boolean;
}

export function InstrumentOptionCard({
  name,
  description,
  color: _color, // Reserved for future use (e.g., accent color)
  isSelected = false,
  isPlaying = false,
  onClick,
  tag,
  tagColor,
  sliderLabel,
  sliderValue,
  onSliderChange,
  isPremium = false,
  showFreeLabel = false,
}: InstrumentOptionCardProps) {
  const isActive = isSelected || isPlaying;
  const isClickable = !!onClick;

  return (
    <div
      onClick={isClickable ? onClick : undefined}
      className={clsx(
        'p-3 rounded-xl border transition-all',
        isActive
          ? 'border-[#00ffff] bg-[#00ffff]/10'
          : 'border-[#222222] bg-[#0a0a0a] hover:border-[#333333]',
        isClickable && 'cursor-pointer active:scale-[0.98]',
        !isClickable && 'cursor-default'
      )}
    >
      <div className="flex items-start justify-between gap-2">
        <div className="flex-1 min-w-0">
          {/* Title row with tag */}
          <div className="flex items-center gap-2 flex-wrap">
            <h3
              className={clsx(
                'text-sm font-bold font-mono leading-tight',
                isActive ? 'text-[#00ffff]' : 'text-white'
              )}
            >
              {name}
            </h3>
            {tag && (
              <span
                className="text-[9px] font-mono px-1.5 py-0.5 rounded-full uppercase tracking-wider"
                style={{
                  backgroundColor: `${tagColor || '#666666'}20`,
                  color: tagColor || '#666666',
                  border: `1px solid ${tagColor || '#666666'}40`,
                }}
              >
                {tag}
              </span>
            )}
          </div>

          {/* Description */}
          <p className="text-xs text-[#666666] font-mono mt-1">{description}</p>
        </div>

        {/* Right side: badges and icons */}
        <div className="flex flex-col items-end gap-1 flex-shrink-0">
          {/* Premium/Free badge */}
          {isPremium ? (
            <span className="px-1.5 py-0.5 rounded text-[10px] font-mono font-bold bg-gradient-to-r from-[#ffd700] to-[#ff8c00] text-black">
              PRO
            </span>
          ) : showFreeLabel ? (
            <span className="px-1.5 py-0.5 rounded text-[10px] font-mono text-[#00ffff] border border-[#00ffff]/30">
              FREE
            </span>
          ) : null}

          {/* Check icon for selected state (setup screen) */}
          {isSelected && !isPlaying && (
            <CheckIcon size={16} color="#00ffff" className="flex-shrink-0" />
          )}

          {/* Play/Stop indicator for playable instruments (library) */}
          {isClickable && !isPlaying && showFreeLabel && (
            <svg className="w-4 h-4 text-[#666666]" fill="currentColor" viewBox="0 0 24 24">
              <path d="M8 5v14l11-7z" />
            </svg>
          )}
          {isPlaying && (
            <svg className="w-4 h-4 text-[#00ffff]" fill="currentColor" viewBox="0 0 24 24">
              <rect x="6" y="4" width="4" height="16" rx="1" />
              <rect x="14" y="4" width="4" height="16" rx="1" />
            </svg>
          )}
        </div>
      </div>

      {/* Slider (only shown when selected, for setup screen) */}
      {isSelected && sliderLabel && onSliderChange && (
        <div className="mt-3 pt-3 border-t border-[#222222]" onClick={(e) => e.stopPropagation()}>
          <div className="flex items-center justify-between mb-1">
            <span className="text-xs text-[#888888] font-mono">{sliderLabel}</span>
            <span className="text-xs text-[#00ffff] font-mono">{Math.round((sliderValue ?? 0.5) * 100)}%</span>
          </div>
          <input
            type="range"
            min="0"
            max="1"
            step="0.01"
            value={sliderValue ?? 0.5}
            onChange={(e) => onSliderChange(parseFloat(e.target.value))}
            className="w-full h-1 bg-[#333333] rounded-full appearance-none cursor-pointer
              [&::-webkit-slider-thumb]:appearance-none
              [&::-webkit-slider-thumb]:w-4
              [&::-webkit-slider-thumb]:h-4
              [&::-webkit-slider-thumb]:rounded-full
              [&::-webkit-slider-thumb]:bg-[#00ffff]
              [&::-webkit-slider-thumb]:shadow-[0_0_8px_#00ffff]
              [&::-webkit-slider-thumb]:cursor-pointer"
          />
        </div>
      )}
    </div>
  );
}
