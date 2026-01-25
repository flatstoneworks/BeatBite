import { useActiveBand } from '../../core/store';

/**
 * ActiveBandHeader - Shows the currently selected band name during recording.
 *
 * Displays "Recording with [Band Name]" to indicate which band configuration
 * is being used for the current song.
 */
export function ActiveBandHeader() {
  const activeBand = useActiveBand();

  if (!activeBand) {
    return null;
  }

  return (
    <div className="flex items-center justify-center gap-2 py-2 px-4 bg-gradient-to-r from-cyan-500/10 to-purple-500/10 border-b border-white/10">
      <svg
        className="w-4 h-4 text-cyan-400"
        fill="none"
        viewBox="0 0 24 24"
        stroke="currentColor"
      >
        <path
          strokeLinecap="round"
          strokeLinejoin="round"
          strokeWidth={2}
          d="M9 19V6l12-3v13M9 19c0 1.105-1.343 2-3 2s-3-.895-3-2 1.343-2 3-2 3 .895 3 2zm12-3c0 1.105-1.343 2-3 2s-3-.895-3-2 1.343-2 3-2 3 .895 3 2zM9 10l12-3"
        />
      </svg>
      <span className="text-sm text-white/70">
        Recording with{' '}
        <span className="text-cyan-400 font-medium">{activeBand.name}</span>
      </span>
    </div>
  );
}
