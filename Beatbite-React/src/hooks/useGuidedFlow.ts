/**
 * useGuidedFlow - Hook for managing guided recording flow navigation.
 *
 * Makes the URL the single source of truth for flow state.
 * Replaces the bidirectional sync between store and URL.
 */

import { useCallback, useMemo } from 'react';
import { useLocation, useNavigate } from 'react-router-dom';
import { useAppStore } from '../core/store';

export type GuidedFlowStep =
  | 'band-select'
  | 'band-name'
  | 'setup-drums'
  | 'setup-bass'
  | 'setup-guitar'
  | 'setup-piano'
  | 'setup-voice'
  | 'tempo'
  | 'record-drums'
  | 'record-bass'
  | 'record-guitar'
  | 'record-piano'
  | 'record-voice'
  | 'complete';

// Step order for new band creation (includes setup steps)
const NEW_BAND_STEP_ORDER: GuidedFlowStep[] = [
  'band-select',
  'band-name',
  'setup-drums',
  'setup-bass',
  'setup-guitar',
  'setup-piano',
  'setup-voice',
  'tempo',
  'record-drums',
  'record-bass',
  'record-guitar',
  'record-piano',
  'record-voice',
  'complete',
];

// Step order for existing band (skips setup)
const EXISTING_BAND_STEP_ORDER: GuidedFlowStep[] = [
  'band-select',
  'tempo',
  'record-drums',
  'record-bass',
  'record-guitar',
  'record-piano',
  'record-voice',
  'complete',
];

// Valid steps for URL validation
const VALID_STEPS = new Set<string>(NEW_BAND_STEP_ORDER);

export function useGuidedFlow() {
  const location = useLocation();
  const navigate = useNavigate();
  const isCreatingNewBand = useAppStore((state) => state.isCreatingNewBand);

  // Derive flow state from URL
  const isActive = location.pathname.startsWith('/record/flow');

  const currentStep = useMemo((): GuidedFlowStep | null => {
    if (!isActive) return null;
    const step = location.pathname.split('/record/flow/')[1];
    return VALID_STEPS.has(step) ? (step as GuidedFlowStep) : null;
  }, [isActive, location.pathname]);

  // Get the appropriate step order
  const stepOrder = isCreatingNewBand ? NEW_BAND_STEP_ORDER : EXISTING_BAND_STEP_ORDER;

  // Navigate to a specific step
  const goToStep = useCallback(
    (step: GuidedFlowStep, options?: { replace?: boolean }) => {
      navigate(`/record/flow/${step}`, options);
    },
    [navigate]
  );

  // Advance to the next step in the flow
  const advance = useCallback(() => {
    if (!currentStep) return;

    const currentIndex = stepOrder.indexOf(currentStep);
    if (currentIndex === -1) return;

    const nextIndex = Math.min(currentIndex + 1, stepOrder.length - 1);
    const nextStep = stepOrder[nextIndex];

    navigate(`/record/flow/${nextStep}`, { replace: true });
  }, [currentStep, stepOrder, navigate]);

  // Go back to the previous step
  const goBack = useCallback(() => {
    if (!currentStep) return;

    const currentIndex = stepOrder.indexOf(currentStep);
    if (currentIndex <= 0) {
      // At the beginning, exit the flow
      navigate('/record');
      return;
    }

    const prevStep = stepOrder[currentIndex - 1];
    navigate(`/record/flow/${prevStep}`);
  }, [currentStep, stepOrder, navigate]);

  // Exit the guided flow
  const exit = useCallback(() => {
    navigate('/record');
  }, [navigate]);

  // Start the guided flow
  const start = useCallback(() => {
    navigate('/record/flow/band-select');
  }, [navigate]);

  // Check if we're on a setup step
  const isSetupStep = currentStep?.startsWith('setup-') ?? false;

  // Check if we're on the tempo step
  const isTempoStep = currentStep === 'tempo';

  // Check if we're on a recording step
  const isRecordingStep = currentStep?.startsWith('record-') ?? false;

  // Get current instrument from step (for setup and recording steps)
  const currentInstrument = useMemo((): string | null => {
    if (!currentStep) return null;
    if (currentStep.startsWith('setup-')) {
      return currentStep.replace('setup-', '');
    }
    if (currentStep.startsWith('record-')) {
      return currentStep.replace('record-', '');
    }
    return null;
  }, [currentStep]);

  return {
    isActive,
    currentStep,
    currentInstrument,
    isSetupStep,
    isTempoStep,
    isRecordingStep,
    stepOrder,
    goToStep,
    advance,
    goBack,
    exit,
    start,
  };
}
