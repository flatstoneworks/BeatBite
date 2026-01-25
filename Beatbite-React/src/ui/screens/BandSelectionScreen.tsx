import { useCallback } from 'react';
import { useAppStore } from '../../core/store';
import { useGuidedFlow } from '../../hooks/useGuidedFlow';
import { DrumIcon, BassIcon, GuitarIcon, PianoIcon, VoiceIcon } from '../components/Icons';
import type { Band } from '../../core/BandStorage';

/**
 * BandSelectionScreen - Select an existing band or create a new one.
 *
 * This is the first screen in the guided recording flow.
 * Users can:
 * - Select a previously created band to use its instrument configuration
 * - Create a new band (goes through the setup flow)
 */
export function BandSelectionScreen() {
  const bands = useAppStore((state) => state.bands);
  const selectBandAction = useAppStore((state) => state.selectBand);
  const startNewBandCreationAction = useAppStore((state) => state.startNewBandCreation);
  const { exit, goToStep } = useGuidedFlow();

  const hasBands = bands.length > 0;

  // Select an existing band and navigate to tempo selection
  const handleSelectBand = useCallback((bandId: string) => {
    selectBandAction(bandId);
    goToStep('tempo');
  }, [selectBandAction, goToStep]);

  // Start creating a new band and navigate to name input
  const handleStartNewBand = useCallback(() => {
    startNewBandCreationAction();
    goToStep('band-name');
  }, [startNewBandCreationAction, goToStep]);

  return (
    <div className="h-full w-full bg-black flex flex-col select-none relative">
      {/* Back/Exit button */}
      <button
        className="absolute top-4 left-4 p-2 text-white/50 hover:text-white transition-colors z-10"
        onClick={exit}
      >
        <svg className="w-6 h-6" fill="none" viewBox="0 0 24 24" stroke="currentColor">
          <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M6 18L18 6M6 6l12 12" />
        </svg>
      </button>

      {/* Content */}
      <div className="flex-1 flex flex-col px-6 pt-16 pb-8 overflow-auto">
        {/* Header */}
        <div className="text-center mb-8">
          <h1 className="text-2xl font-bold text-white mb-2">Select Your Band</h1>
          <p className="text-white/50 text-sm">
            {hasBands
              ? 'Choose a band or create a new one'
              : 'Create your first band to get started'}
          </p>
        </div>

        {/* Band list */}
        {hasBands && (
          <div className="flex flex-col gap-3 mb-6">
            {bands.map((band) => (
              <BandCard
                key={band.id}
                band={band}
                onSelect={() => handleSelectBand(band.id)}
              />
            ))}
          </div>
        )}

        {/* Create new band button */}
        <button
          onClick={handleStartNewBand}
          className="
            w-full p-4 rounded-xl
            border-2 border-dashed border-white/20
            hover:border-cyan-500/50 hover:bg-cyan-500/5
            transition-all duration-200
            flex items-center justify-center gap-3
            text-white/70 hover:text-cyan-400
          "
        >
          <svg className="w-6 h-6" fill="none" viewBox="0 0 24 24" stroke="currentColor">
            <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M12 4v16m8-8H4" />
          </svg>
          <span className="font-medium">Create New Band</span>
        </button>

        {/* Empty state message */}
        {!hasBands && (
          <div className="flex-1 flex flex-col items-center justify-center text-center px-8 mt-8">
            <div className="w-24 h-24 rounded-full bg-white/5 flex items-center justify-center mb-6">
              <svg className="w-12 h-12 text-white/20" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                <path
                  strokeLinecap="round"
                  strokeLinejoin="round"
                  strokeWidth={1.5}
                  d="M9 19V6l12-3v13M9 19c0 1.105-1.343 2-3 2s-3-.895-3-2 1.343-2 3-2 3 .895 3 2zm12-3c0 1.105-1.343 2-3 2s-3-.895-3-2 1.343-2 3-2 3 .895 3 2zM9 10l12-3"
                />
              </svg>
            </div>
            <h2 className="text-white/60 text-lg font-medium mb-2">No Bands Yet</h2>
            <p className="text-white/40 text-sm">
              A band is your personal instrument configuration.
              <br />
              Create one to save your drum kit, bass, guitar,
              <br />
              piano styles, and voice effects.
            </p>
          </div>
        )}
      </div>
    </div>
  );
}

/**
 * Card component for displaying a band in the list.
 */
function BandCard({ band, onSelect }: { band: Band; onSelect: () => void }) {
  // Format the date
  const formatDate = (timestamp: number) => {
    const date = new Date(timestamp);
    return date.toLocaleDateString('en-US', { month: 'short', day: 'numeric' });
  };

  return (
    <button
      onClick={onSelect}
      className="
        w-full p-4 rounded-xl
        bg-white/5 hover:bg-white/10
        border border-white/10 hover:border-cyan-500/30
        transition-all duration-200
        text-left
      "
    >
      {/* Band name and date */}
      <div className="flex items-center justify-between mb-3">
        <h3 className="text-white font-semibold text-lg">{band.name}</h3>
        <span className="text-white/30 text-xs">{formatDate(band.updatedAt)}</span>
      </div>

      {/* Instrument preview */}
      <div className="flex items-center gap-4">
        <InstrumentBadge
          icon={<DrumIcon size={14} color="#00ffff" />}
          label={formatDrumKit(band.drumKit)}
          color="#00ffff"
        />
        <InstrumentBadge
          icon={<BassIcon size={14} color="#3b82f6" />}
          label={band.bassStyle}
          color="#3b82f6"
        />
        <InstrumentBadge
          icon={<GuitarIcon size={14} color="#22c55e" />}
          label={band.guitarStyle}
          color="#22c55e"
        />
        <InstrumentBadge
          icon={<PianoIcon size={14} color="#f59e0b" />}
          label={band.pianoStyle}
          color="#f59e0b"
        />
        <InstrumentBadge
          icon={<VoiceIcon size={14} color="#a855f7" />}
          label={countActiveEffects(band.voiceEffects)}
          color="#a855f7"
        />
      </div>
    </button>
  );
}

/**
 * Small badge showing an instrument's configuration.
 */
function InstrumentBadge({
  icon,
  label,
  color,
}: {
  icon: React.ReactNode;
  label: string;
  color: string;
}) {
  return (
    <div className="flex items-center gap-1.5">
      {icon}
      <span className="text-xs capitalize" style={{ color: `${color}99` }}>
        {label}
      </span>
    </div>
  );
}

/**
 * Format drum kit name for display.
 */
function formatDrumKit(kit: string): string {
  // Capitalize first letter
  return kit.charAt(0).toUpperCase() + kit.slice(1);
}

/**
 * Count active voice effects.
 */
function countActiveEffects(effects: Record<string, boolean>): string {
  const count = Object.values(effects).filter(Boolean).length;
  if (count === 0) return 'None';
  if (count === 1) return '1 FX';
  return `${count} FX`;
}
