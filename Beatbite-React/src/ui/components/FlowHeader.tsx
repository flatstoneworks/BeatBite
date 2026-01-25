/**
 * FlowHeader - Consistent header for recording flow screens.
 *
 * Shows "Record" title and breadcrumb trail indicating current position in flow.
 */

import { RecordIcon } from './Icons';
import { useActiveBand, usePendingBandName, useSelectedBpm } from '../../core/store';
import { useGuidedFlow } from '../../hooks/useGuidedFlow';

interface FlowHeaderProps {
  /** Current step label to show in breadcrumb */
  currentStep: string;
  /** Whether to show back button */
  showBack?: boolean;
  /** Whether to show close button */
  showClose?: boolean;
  /** Custom back handler */
  onBack?: () => void;
  /** Custom close handler */
  onClose?: () => void;
  /** Whether we're in recording phase (to show BPM in breadcrumb) */
  isRecording?: boolean;
}

export function FlowHeader({
  currentStep,
  showBack = true,
  showClose = true,
  onBack,
  onClose,
  isRecording = false,
}: FlowHeaderProps) {
  const { goBack, exit } = useGuidedFlow();
  const activeBand = useActiveBand();
  const pendingBandName = usePendingBandName();
  const selectedBpm = useSelectedBpm();

  // Get the band name to display (active band or pending name)
  const bandName = activeBand?.name || pendingBandName;

  // Steps where we should NOT show band name (we're selecting/naming it)
  const earlySteps = ['Select Band', 'Name Your Band'];
  const isEarlyStep = earlySteps.includes(currentStep);

  // Build breadcrumb parts based on current step
  const breadcrumbParts: string[] = [];

  // Only show band name after it's been selected/named
  if (bandName && !isEarlyStep) {
    breadcrumbParts.push(bandName);
  }

  // Add BPM when in recording phase
  if (isRecording && selectedBpm) {
    breadcrumbParts.push(`${selectedBpm} BPM`);
  }

  // Add current step
  breadcrumbParts.push(currentStep);

  const handleBack = () => {
    if (onBack) {
      onBack();
    } else {
      goBack();
    }
  };

  const handleClose = () => {
    if (onClose) {
      onClose();
    } else {
      exit();
    }
  };

  return (
    <div className="px-6 pt-8 pb-4 relative z-10">
      {/* Main header row */}
      <div className="flex items-center justify-between mb-3">
        <div className="flex items-center gap-3">
          {showBack && (
            <button
              onClick={handleBack}
              className="p-1 -ml-1 text-[#666666] hover:text-white transition-colors"
            >
              <svg className="w-5 h-5" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M15 19l-7-7 7-7" />
              </svg>
            </button>
          )}
          <RecordIcon size={24} color="#00ffff" />
          <h1 className="text-xl font-bold text-white font-mono uppercase tracking-wider">
            Record
          </h1>
        </div>

        {showClose && (
          <button
            onClick={handleClose}
            className="p-1 text-[#666666] hover:text-white transition-colors"
          >
            <svg className="w-5 h-5" fill="none" viewBox="0 0 24 24" stroke="currentColor">
              <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M6 18L18 6M6 6l12 12" />
            </svg>
          </button>
        )}
      </div>

      {/* Breadcrumb */}
      <div className="flex items-center gap-2 text-sm font-mono">
        {breadcrumbParts.map((part, index) => (
          <span key={index} className="flex items-center gap-2">
            {index > 0 && (
              <svg className="w-3 h-3 text-[#444444]" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M9 5l7 7-7 7" />
              </svg>
            )}
            <span className={index === breadcrumbParts.length - 1 ? 'text-[#00ffff]' : 'text-[#666666]'}>
              {part}
            </span>
          </span>
        ))}
      </div>
    </div>
  );
}
