import type { StateCreator } from 'zustand';
import type { AppStore, NavigationSlice, GuidedFlowStep } from './types';
import { initialNavigation, initialTempoSelection } from './types';
import { bandStorage } from '../BandStorage';

export const createNavigationSlice: StateCreator<AppStore, [], [], NavigationSlice> = (set) => ({
  ...initialNavigation,

  setCurrentTab: (tab) => set({ currentTab: tab }),

  startGuidedFlow: () =>
    set({
      isGuidedFlowActive: true,
      guidedFlowStep: 'band-select',
      isRecordArmed: false,
      isCreatingNewBand: false,
      bands: bandStorage.getAllBands(),
      tempoSelection: { ...initialTempoSelection, isTempoSelectionActive: false },
    }),

  exitGuidedFlow: () =>
    set({
      isGuidedFlowActive: false,
      guidedFlowStep: 'band-select',
      isRecordArmed: false,
      isCreatingNewBand: false,
      pendingBandName: '',
      tempoSelection: initialTempoSelection,
    }),

  setGuidedFlowStep: (step) => set({ guidedFlowStep: step }),

  armRecording: () => set({ isRecordArmed: true }),

  disarmRecording: () => set({ isRecordArmed: false }),

  advanceGuidedFlowStep: () =>
    set((state) => {
      const newBandStepOrder: GuidedFlowStep[] = [
        'band-select', 'band-name', 'setup-drums', 'setup-bass', 'setup-guitar',
        'setup-piano', 'setup-voice', 'tempo', 'drums', 'bass', 'guitar', 'piano', 'voice', 'complete',
      ];
      const existingBandStepOrder: GuidedFlowStep[] = [
        'band-select', 'tempo', 'drums', 'bass', 'guitar', 'piano', 'voice', 'complete',
      ];
      const stepOrder = state.isCreatingNewBand ? newBandStepOrder : existingBandStepOrder;
      const currentIndex = stepOrder.indexOf(state.guidedFlowStep);
      const nextStep = stepOrder[Math.min(currentIndex + 1, stepOrder.length - 1)];
      return { guidedFlowStep: nextStep, isRecordArmed: false };
    }),
});
