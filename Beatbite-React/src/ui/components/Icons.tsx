/**
 * Tech-style SVG icons for Beatbite.
 *
 * Design: Shader Lab aesthetic with cyan/magenta accents,
 * circuit patterns, and glow effects.
 */

import React from 'react';

interface IconProps {
  size?: number;
  className?: string;
  color?: string;
  glowColor?: string;
}

/**
 * Stylized drum icon with circuit pattern accents.
 */
export const DrumIcon: React.FC<IconProps> = ({
  size = 24,
  className = '',
  color = 'currentColor',
}) => (
  <svg
    width={size}
    height={size}
    viewBox="0 0 24 24"
    fill="none"
    className={className}
    xmlns="http://www.w3.org/2000/svg"
  >
    {/* Drum body */}
    <ellipse cx="12" cy="16" rx="9" ry="4" stroke={color} strokeWidth="1.5" fill="none" />
    <ellipse cx="12" cy="8" rx="9" ry="4" stroke={color} strokeWidth="1.5" fill="none" />
    {/* Side lines */}
    <line x1="3" y1="8" x2="3" y2="16" stroke={color} strokeWidth="1.5" />
    <line x1="21" y1="8" x2="21" y2="16" stroke={color} strokeWidth="1.5" />
    {/* Circuit accents */}
    <circle cx="12" cy="8" r="2" fill={color} opacity="0.6" />
    <line x1="12" y1="10" x2="12" y2="12" stroke={color} strokeWidth="1" opacity="0.4" />
    <line x1="6" y1="8" x2="8" y2="8" stroke={color} strokeWidth="1" opacity="0.4" />
    <line x1="16" y1="8" x2="18" y2="8" stroke={color} strokeWidth="1" opacity="0.4" />
  </svg>
);

/**
 * Bass icon with sound wave visualization.
 */
export const BassIcon: React.FC<IconProps> = ({
  size = 24,
  className = '',
  color = 'currentColor',
}) => (
  <svg
    width={size}
    height={size}
    viewBox="0 0 24 24"
    fill="none"
    className={className}
    xmlns="http://www.w3.org/2000/svg"
  >
    {/* Bass body outline */}
    <path
      d="M8 4C5 4 3 6.5 3 9.5C3 12.5 5 15 8 15H9V19C9 20 10 21 11 21H13C14 21 15 20 15 19V15H16C19 15 21 12.5 21 9.5C21 6.5 19 4 16 4H8Z"
      stroke={color}
      strokeWidth="1.5"
      fill="none"
    />
    {/* Sound waves */}
    <path d="M6 9.5C6 8 7 7 8.5 7" stroke={color} strokeWidth="1" opacity="0.6" />
    <path d="M18 9.5C18 8 17 7 15.5 7" stroke={color} strokeWidth="1" opacity="0.6" />
    {/* Frequency line */}
    <path
      d="M8 10L10 8L12 12L14 6L16 10"
      stroke={color}
      strokeWidth="1.5"
      strokeLinecap="round"
      strokeLinejoin="round"
      opacity="0.8"
    />
  </svg>
);

/**
 * Electric guitar silhouette icon.
 */
export const GuitarIcon: React.FC<IconProps> = ({
  size = 24,
  className = '',
  color = 'currentColor',
}) => (
  <svg
    width={size}
    height={size}
    viewBox="0 0 24 24"
    fill="none"
    className={className}
    xmlns="http://www.w3.org/2000/svg"
  >
    {/* Guitar neck */}
    <line x1="18" y1="2" x2="10" y2="10" stroke={color} strokeWidth="2" strokeLinecap="round" />
    {/* Tuning pegs */}
    <circle cx="19" cy="2" r="1" fill={color} opacity="0.6" />
    <circle cx="20" cy="4" r="1" fill={color} opacity="0.6" />
    {/* Guitar body */}
    <path
      d="M10 10C8 10 6 11 5 13C4 15 4 17 5 19C6 21 8 22 10 22C12 22 14 21 15 19C15.5 18 15.5 17 15 16C14.5 15 14 14.5 14 14C14 13.5 14.5 13 15 12.5C15.5 12 16 11 16 10C16 9 15 8 14 8C12 8 11 9 10 10Z"
      stroke={color}
      strokeWidth="1.5"
      fill="none"
    />
    {/* Sound hole */}
    <circle cx="9" cy="16" r="2" stroke={color} strokeWidth="1" opacity="0.6" />
    {/* Strings hint */}
    <line x1="12" y1="8" x2="9" y2="14" stroke={color} strokeWidth="0.5" opacity="0.4" />
  </svg>
);

/**
 * Piano/keyboard icon.
 */
export const PianoIcon: React.FC<IconProps> = ({
  size = 24,
  className = '',
  color = 'currentColor',
}) => (
  <svg
    width={size}
    height={size}
    viewBox="0 0 24 24"
    fill="none"
    className={className}
    xmlns="http://www.w3.org/2000/svg"
  >
    {/* Piano body */}
    <rect x="2" y="6" width="20" height="12" rx="1" stroke={color} strokeWidth="1.5" fill="none" />
    {/* White keys divisions */}
    <line x1="5.5" y1="6" x2="5.5" y2="18" stroke={color} strokeWidth="1" opacity="0.4" />
    <line x1="9" y1="6" x2="9" y2="18" stroke={color} strokeWidth="1" opacity="0.4" />
    <line x1="12.5" y1="6" x2="12.5" y2="18" stroke={color} strokeWidth="1" opacity="0.4" />
    <line x1="16" y1="6" x2="16" y2="18" stroke={color} strokeWidth="1" opacity="0.4" />
    <line x1="19.5" y1="6" x2="19.5" y2="18" stroke={color} strokeWidth="1" opacity="0.4" />
    {/* Black keys */}
    <rect x="4" y="6" width="2" height="7" fill={color} opacity="0.7" />
    <rect x="7.5" y="6" width="2" height="7" fill={color} opacity="0.7" />
    <rect x="14.5" y="6" width="2" height="7" fill={color} opacity="0.7" />
    <rect x="18" y="6" width="2" height="7" fill={color} opacity="0.7" />
  </svg>
);

/**
 * Microphone icon with sound waves.
 */
export const VoiceIcon: React.FC<IconProps> = ({
  size = 24,
  className = '',
  color = 'currentColor',
}) => (
  <svg
    width={size}
    height={size}
    viewBox="0 0 24 24"
    fill="none"
    className={className}
    xmlns="http://www.w3.org/2000/svg"
  >
    {/* Microphone body */}
    <rect x="9" y="2" width="6" height="11" rx="3" stroke={color} strokeWidth="1.5" fill="none" />
    {/* Microphone stand */}
    <path d="M12 13V17" stroke={color} strokeWidth="1.5" strokeLinecap="round" />
    <path d="M8 17H16" stroke={color} strokeWidth="1.5" strokeLinecap="round" />
    {/* Sound waves */}
    <path d="M5 8C5 11.5 8 15 12 15C16 15 19 11.5 19 8" stroke={color} strokeWidth="1.5" strokeLinecap="round" fill="none" />
    {/* Wave accents */}
    <path d="M3 7C3 7 4 10 4 11" stroke={color} strokeWidth="1" opacity="0.4" strokeLinecap="round" />
    <path d="M21 7C21 7 20 10 20 11" stroke={color} strokeWidth="1" opacity="0.4" strokeLinecap="round" />
  </svg>
);

/**
 * Play button with tech glow effect.
 */
export const PlayIcon: React.FC<IconProps> = ({
  size = 24,
  className = '',
  color = 'currentColor',
  glowColor = '#22d3ee',
}) => (
  <svg
    width={size}
    height={size}
    viewBox="0 0 24 24"
    fill="none"
    className={className}
    xmlns="http://www.w3.org/2000/svg"
  >
    <defs>
      <filter id="playGlow" x="-50%" y="-50%" width="200%" height="200%">
        <feGaussianBlur stdDeviation="1" result="blur" />
        <feMerge>
          <feMergeNode in="blur" />
          <feMergeNode in="SourceGraphic" />
        </feMerge>
      </filter>
    </defs>
    {/* Outer ring */}
    <circle cx="12" cy="12" r="10" stroke={glowColor} strokeWidth="1" opacity="0.3" />
    {/* Inner ring */}
    <circle cx="12" cy="12" r="8" stroke={color} strokeWidth="1.5" fill="none" />
    {/* Play triangle */}
    <path
      d="M10 8L16 12L10 16V8Z"
      fill={color}
      filter="url(#playGlow)"
    />
  </svg>
);

/**
 * Stop button with tech style.
 */
export const StopIcon: React.FC<IconProps> = ({
  size = 24,
  className = '',
  color = 'currentColor',
  glowColor = '#22d3ee',
}) => (
  <svg
    width={size}
    height={size}
    viewBox="0 0 24 24"
    fill="none"
    className={className}
    xmlns="http://www.w3.org/2000/svg"
  >
    <defs>
      <filter id="stopGlow" x="-50%" y="-50%" width="200%" height="200%">
        <feGaussianBlur stdDeviation="1" result="blur" />
        <feMerge>
          <feMergeNode in="blur" />
          <feMergeNode in="SourceGraphic" />
        </feMerge>
      </filter>
    </defs>
    {/* Outer ring */}
    <circle cx="12" cy="12" r="10" stroke={glowColor} strokeWidth="1" opacity="0.3" />
    {/* Inner ring */}
    <circle cx="12" cy="12" r="8" stroke={color} strokeWidth="1.5" fill="none" />
    {/* Stop square */}
    <rect
      x="8"
      y="8"
      width="8"
      height="8"
      rx="1"
      fill={color}
      filter="url(#stopGlow)"
    />
  </svg>
);

/**
 * Record button with pulsing ring effect.
 */
export const RecordIcon: React.FC<IconProps> = ({
  size = 24,
  className = '',
  color = '#ef4444',
  glowColor = '#f87171',
}) => (
  <svg
    width={size}
    height={size}
    viewBox="0 0 24 24"
    fill="none"
    className={className}
    xmlns="http://www.w3.org/2000/svg"
  >
    <defs>
      <filter id="recordGlow" x="-50%" y="-50%" width="200%" height="200%">
        <feGaussianBlur stdDeviation="2" result="blur" />
        <feMerge>
          <feMergeNode in="blur" />
          <feMergeNode in="SourceGraphic" />
        </feMerge>
      </filter>
      <radialGradient id="recordGradient" cx="50%" cy="50%" r="50%">
        <stop offset="0%" stopColor={glowColor} />
        <stop offset="100%" stopColor={color} />
      </radialGradient>
    </defs>
    {/* Outer pulse ring */}
    <circle cx="12" cy="12" r="10" stroke={glowColor} strokeWidth="1" opacity="0.3" />
    {/* Inner ring */}
    <circle cx="12" cy="12" r="8" stroke={color} strokeWidth="1.5" fill="none" opacity="0.6" />
    {/* Record circle */}
    <circle
      cx="12"
      cy="12"
      r="5"
      fill="url(#recordGradient)"
      filter="url(#recordGlow)"
    />
  </svg>
);

/**
 * Metronome icon for tempo selection.
 */
export const MetronomeIcon: React.FC<IconProps> = ({
  size = 24,
  className = '',
  color = 'currentColor',
}) => (
  <svg
    width={size}
    height={size}
    viewBox="0 0 24 24"
    fill="none"
    className={className}
    xmlns="http://www.w3.org/2000/svg"
  >
    {/* Metronome body */}
    <path
      d="M8 21L6 6H18L16 21H8Z"
      stroke={color}
      strokeWidth="1.5"
      fill="none"
    />
    {/* Pendulum */}
    <line x1="12" y1="18" x2="12" y2="4" stroke={color} strokeWidth="1.5" />
    {/* Weight */}
    <circle cx="12" cy="10" r="2" fill={color} />
    {/* Top */}
    <path d="M10 4L12 2L14 4" stroke={color} strokeWidth="1.5" strokeLinecap="round" strokeLinejoin="round" />
    {/* Tick marks */}
    <line x1="9" y1="15" x2="11" y2="15" stroke={color} strokeWidth="1" opacity="0.5" />
    <line x1="13" y1="15" x2="15" y2="15" stroke={color} strokeWidth="1" opacity="0.5" />
  </svg>
);

/**
 * Settings/gear icon.
 */
export const SettingsIcon: React.FC<IconProps> = ({
  size = 24,
  className = '',
  color = 'currentColor',
}) => (
  <svg
    width={size}
    height={size}
    viewBox="0 0 24 24"
    fill="none"
    className={className}
    xmlns="http://www.w3.org/2000/svg"
  >
    {/* Gear teeth */}
    <path
      d="M12 15C13.6569 15 15 13.6569 15 12C15 10.3431 13.6569 9 12 9C10.3431 9 9 10.3431 9 12C9 13.6569 10.3431 15 12 15Z"
      stroke={color}
      strokeWidth="1.5"
      fill="none"
    />
    <path
      d="M19.4 15C19.1 15.6 19.2 16.3 19.6 16.8L19.7 16.9C20 17.2 20.2 17.7 20.2 18.2C20.2 18.7 20 19.2 19.7 19.5C19.4 19.8 19 20 18.5 20C18 20 17.5 19.8 17.2 19.5L17.1 19.4C16.6 19 15.9 18.9 15.3 19.2C14.7 19.5 14.3 20.1 14.3 20.8V21C14.3 22.1 13.4 23 12.3 23H11.7C10.6 23 9.7 22.1 9.7 21V20.9C9.7 20.2 9.2 19.5 8.5 19.2C7.9 18.9 7.2 19 6.7 19.4L6.6 19.5C6.3 19.8 5.8 20 5.3 20C4.8 20 4.3 19.8 4 19.5C3.7 19.2 3.5 18.7 3.5 18.2C3.5 17.7 3.7 17.2 4 16.9L4.1 16.8C4.5 16.3 4.6 15.6 4.3 15C4 14.4 3.4 14 2.7 14H2.5C1.4 14 0.5 13.1 0.5 12V11C0.5 9.9 1.4 9 2.5 9H2.6C3.3 9 4 8.5 4.3 7.8C4.6 7.2 4.5 6.5 4.1 6L4 5.9C3.7 5.6 3.5 5.1 3.5 4.6C3.5 4.1 3.7 3.6 4 3.3C4.3 3 4.8 2.8 5.3 2.8C5.8 2.8 6.3 3 6.6 3.3L6.7 3.4C7.2 3.8 7.9 3.9 8.5 3.6H8.6C9.2 3.3 9.7 2.7 9.7 2V1.8C9.7 0.7 10.6 0 11.7 0H12.3C13.4 0 14.3 0.7 14.3 1.8V2C14.3 2.7 14.7 3.3 15.3 3.6C15.9 3.9 16.6 3.8 17.1 3.4L17.2 3.3C17.5 3 18 2.8 18.5 2.8C19 2.8 19.5 3 19.8 3.3C20.1 3.6 20.3 4.1 20.3 4.6C20.3 5.1 20.1 5.6 19.8 5.9L19.7 6C19.3 6.5 19.2 7.2 19.5 7.8V7.9C19.8 8.5 20.4 9 21.1 9H21.3C22.4 9 23.3 9.9 23.3 11V12C23.3 13.1 22.4 14 21.3 14H21.1C20.4 14 19.7 14.5 19.4 15Z"
      stroke={color}
      strokeWidth="1.5"
      fill="none"
    />
  </svg>
);

/**
 * Library/folder icon.
 */
export const LibraryIcon: React.FC<IconProps> = ({
  size = 24,
  className = '',
  color = 'currentColor',
}) => (
  <svg
    width={size}
    height={size}
    viewBox="0 0 24 24"
    fill="none"
    className={className}
    xmlns="http://www.w3.org/2000/svg"
  >
    {/* Folder back */}
    <path
      d="M3 6C3 4.9 3.9 4 5 4H9L11 6H19C20.1 6 21 6.9 21 8V18C21 19.1 20.1 20 19 20H5C3.9 20 3 19.1 3 18V6Z"
      stroke={color}
      strokeWidth="1.5"
      fill="none"
    />
    {/* Music note inside */}
    <circle cx="10" cy="15" r="2" stroke={color} strokeWidth="1" />
    <line x1="12" y1="15" x2="12" y2="10" stroke={color} strokeWidth="1" />
    <path d="M12 10C12 10 14 9 15 10" stroke={color} strokeWidth="1" strokeLinecap="round" />
  </svg>
);

/**
 * Waveform icon for audio visualization.
 */
export const WaveformIcon: React.FC<IconProps> = ({
  size = 24,
  className = '',
  color = 'currentColor',
}) => (
  <svg
    width={size}
    height={size}
    viewBox="0 0 24 24"
    fill="none"
    className={className}
    xmlns="http://www.w3.org/2000/svg"
  >
    <line x1="2" y1="12" x2="2" y2="12" stroke={color} strokeWidth="2" strokeLinecap="round" />
    <line x1="5" y1="9" x2="5" y2="15" stroke={color} strokeWidth="2" strokeLinecap="round" />
    <line x1="8" y1="6" x2="8" y2="18" stroke={color} strokeWidth="2" strokeLinecap="round" />
    <line x1="11" y1="4" x2="11" y2="20" stroke={color} strokeWidth="2" strokeLinecap="round" />
    <line x1="14" y1="7" x2="14" y2="17" stroke={color} strokeWidth="2" strokeLinecap="round" />
    <line x1="17" y1="9" x2="17" y2="15" stroke={color} strokeWidth="2" strokeLinecap="round" />
    <line x1="20" y1="11" x2="20" y2="13" stroke={color} strokeWidth="2" strokeLinecap="round" />
    <line x1="23" y1="12" x2="23" y2="12" stroke={color} strokeWidth="2" strokeLinecap="round" />
  </svg>
);

/**
 * Check/complete icon.
 */
export const CheckIcon: React.FC<IconProps> = ({
  size = 24,
  className = '',
  color = 'currentColor',
  glowColor = '#22c55e',
}) => (
  <svg
    width={size}
    height={size}
    viewBox="0 0 24 24"
    fill="none"
    className={className}
    xmlns="http://www.w3.org/2000/svg"
  >
    <defs>
      <filter id="checkGlow" x="-50%" y="-50%" width="200%" height="200%">
        <feGaussianBlur stdDeviation="1" result="blur" />
        <feMerge>
          <feMergeNode in="blur" />
          <feMergeNode in="SourceGraphic" />
        </feMerge>
      </filter>
    </defs>
    {/* Circle */}
    <circle cx="12" cy="12" r="10" stroke={glowColor} strokeWidth="1.5" fill="none" opacity="0.5" />
    {/* Check mark */}
    <path
      d="M7 12L10 15L17 8"
      stroke={color}
      strokeWidth="2"
      strokeLinecap="round"
      strokeLinejoin="round"
      filter="url(#checkGlow)"
    />
  </svg>
);

/**
 * Arrow/chevron icon for navigation.
 */
export const ChevronRightIcon: React.FC<IconProps> = ({
  size = 24,
  className = '',
  color = 'currentColor',
}) => (
  <svg
    width={size}
    height={size}
    viewBox="0 0 24 24"
    fill="none"
    className={className}
    xmlns="http://www.w3.org/2000/svg"
  >
    <path
      d="M9 6L15 12L9 18"
      stroke={color}
      strokeWidth="2"
      strokeLinecap="round"
      strokeLinejoin="round"
    />
  </svg>
);

/**
 * Trash/delete icon.
 */
export const TrashIcon: React.FC<IconProps> = ({
  size = 24,
  className = '',
  color = 'currentColor',
}) => (
  <svg
    width={size}
    height={size}
    viewBox="0 0 24 24"
    fill="none"
    className={className}
    xmlns="http://www.w3.org/2000/svg"
  >
    <path
      d="M3 6H5H21"
      stroke={color}
      strokeWidth="1.5"
      strokeLinecap="round"
      strokeLinejoin="round"
    />
    <path
      d="M8 6V4C8 3.46957 8.21071 2.96086 8.58579 2.58579C8.96086 2.21071 9.46957 2 10 2H14C14.5304 2 15.0391 2.21071 15.4142 2.58579C15.7893 2.96086 16 3.46957 16 4V6M19 6V20C19 20.5304 18.7893 21.0391 18.4142 21.4142C18.0391 21.7893 17.5304 22 17 22H7C6.46957 22 5.96086 21.7893 5.58579 21.4142C5.21071 21.0391 5 20.5304 5 20V6H19Z"
      stroke={color}
      strokeWidth="1.5"
      strokeLinecap="round"
      strokeLinejoin="round"
    />
    <path d="M10 11V17" stroke={color} strokeWidth="1.5" strokeLinecap="round" strokeLinejoin="round" />
    <path d="M14 11V17" stroke={color} strokeWidth="1.5" strokeLinecap="round" strokeLinejoin="round" />
  </svg>
);
