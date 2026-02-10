/**
 * FlowHeader - Consistent header for recording flow screens.
 *
 * Shows "Record" title and an interactive breadcrumb trail:
 *   Band Name > 120 > Drums > Bass > Guitar > Piano > Voice
 *
 * Past steps are clickable (navigate back). Current step is highlighted.
 * Future steps are dimmed.
 */

import { RecordIcon } from './Icons';
import { useActiveBand, usePendingBandName, useSelectedBpm } from '../../core/store';
import { useGuidedFlow, type GuidedFlowStep } from '../../hooks/useGuidedFlow';

interface FlowHeaderProps {
  /** Disable breadcrumb clicks and close button (e.g., during active recording) */
  disableNavigation?: boolean;
}

/** Map a URL step to its high-level breadcrumb stage */
function getStage(step: GuidedFlowStep): string {
  if (step === 'band-select' || step === 'band-name') return 'band';
  if (step === 'tempo') return 'bpm';
  if (step === 'complete') return 'complete';
  return step.replace('setup-', '').replace('record-', '');
}

const INSTRUMENTS = ['drums', 'bass', 'guitar', 'piano', 'voice'] as const;

export function FlowHeader({ disableNavigation = false }: FlowHeaderProps = {}) {
  const { currentStep, goToStep, exit, stepOrder } = useGuidedFlow();
  const activeBand = useActiveBand();
  const pendingBandName = usePendingBandName();
  const selectedBpm = useSelectedBpm();

  const bandName = activeBand?.name || pendingBandName;

  if (!currentStep) return null;

  const currentStage = getStage(currentStep);
  const currentStepIndex = stepOrder.indexOf(currentStep);

  // Check if tempo has been reached (appears before current step in the flow)
  const tempoIndex = stepOrder.indexOf('tempo');
  const tempoReached = tempoIndex >= 0 && tempoIndex < currentStepIndex;

  // Find the first step for an instrument in the current step order
  const firstStepFor = (instrument: string): GuidedFlowStep | undefined => {
    const setup = `setup-${instrument}` as GuidedFlowStep;
    const record = `record-${instrument}` as GuidedFlowStep;
    if (stepOrder.includes(setup)) return setup;
    if (stepOrder.includes(record)) return record;
    return undefined;
  };

  type Item = {
    label: string;
    isCurrent: boolean;
    isPast: boolean;
    onClick?: () => void;
  };

  const items: Item[] = [];

  // 1. Band name (show once available; clickable if we're past band stage)
  if (bandName) {
    const isCurrent = currentStage === 'band';
    items.push({
      label: bandName,
      isCurrent,
      isPast: !isCurrent,
      onClick: !isCurrent && !disableNavigation ? () => goToStep('band-select') : undefined,
    });
  }

  // 2. BPM (show once tempo step has been reached or is current)
  if (tempoReached || currentStage === 'bpm') {
    const isCurrent = currentStage === 'bpm';
    items.push({
      label: `${selectedBpm}`,
      isCurrent,
      isPast: !isCurrent,
      onClick: !isCurrent && !disableNavigation ? () => goToStep('tempo') : undefined,
    });
  }

  // 3. Instruments
  for (const instrument of INSTRUMENTS) {
    const firstStep = firstStepFor(instrument);
    if (!firstStep) continue;

    const pos = stepOrder.indexOf(firstStep);
    const isCurrent = currentStage === instrument;
    const isPast = !isCurrent && pos >= 0 && pos < currentStepIndex;
    const isFuture = !isCurrent && !isPast;

    items.push({
      label: instrument.charAt(0).toUpperCase() + instrument.slice(1),
      isCurrent,
      isPast,
      onClick: isPast && !disableNavigation ? () => goToStep(firstStep) : undefined,
    });

    // Don't render instruments beyond the current one if we haven't reached them
    // (show one future item for context, then stop)
    if (isFuture) break;
  }

  return (
    <div className="px-6 pt-8 pb-4 relative z-10">
      {/* Title row */}
      <div className="flex items-center justify-between mb-3">
        <div className="flex items-center gap-3">
          <RecordIcon size={24} color="#00ffff" />
          <h1 className="text-xl font-bold text-white font-mono uppercase tracking-wider">
            Record
          </h1>
        </div>

        {!disableNavigation && (
          <button
            onClick={exit}
            className="p-1 text-[#666666] hover:text-white transition-colors"
          >
            <svg className="w-5 h-5" fill="none" viewBox="0 0 24 24" stroke="currentColor">
              <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M6 18L18 6M6 6l12 12" />
            </svg>
          </button>
        )}
      </div>

      {/* Breadcrumb trail */}
      <div className="flex items-center gap-1.5 text-sm font-mono flex-wrap">
        {items.map((item, index) => (
          <span key={index} className="flex items-center gap-1.5">
            {index > 0 && (
              <svg className="w-3 h-3 text-[#333333] flex-shrink-0" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M9 5l7 7-7 7" />
              </svg>
            )}
            {item.onClick ? (
              <button
                onClick={item.onClick}
                className="text-[#666666] hover:text-[#00ffff] transition-colors"
              >
                {item.label}
              </button>
            ) : (
              <span
                className={
                  item.isCurrent
                    ? 'text-[#00ffff]'
                    : item.isPast
                      ? 'text-[#666666]'
                      : 'text-[#333333]'
                }
              >
                {item.label}
              </span>
            )}
          </span>
        ))}
      </div>
    </div>
  );
}
