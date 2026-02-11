/**
 * InstrumentSetupScreen - Pre-recording setup wizard with audio previews.
 *
 * Features:
 * - Drums: Hear demo beat with different kits (electronic, acoustic, lofi, trap)
 * - Bass: Hear demo bass line with different styles (sub, synth, pluck, wobble)
 * - Guitar: Hear demo riff with different styles (clean, distorted, acoustic, muted)
 * - Voice: Sing live and hear effects in real-time
 */

import { useEffect, useCallback, useState, useRef } from 'react';
import { useParams } from 'react-router-dom';
import { useAppStore, useInstrumentSetup, useSelectedBpm } from '../../core/store';
import { useGuidedFlow } from '../../hooks/useGuidedFlow';
import { audioEngine } from '../../core/AudioEngine';
import { drumKitPlayer, DRUM_KIT_CONFIG, type DrumKitType } from '../../core/DrumKitPlayer';
import { bassDemoPlayer } from '../../core/BassDemoPlayer';
import { guitarDemoPlayer } from '../../core/GuitarDemoPlayer';
import { pianoDemoPlayer } from '../../core/PianoDemoPlayer';
import { DrumIcon, BassIcon, GuitarIcon, PianoIcon, VoiceIcon, ChevronRightIcon } from '../components/Icons';
import { FlowHeader } from '../components/FlowHeader';
import { InstrumentOptionCard } from '../components/InstrumentOptionCard';
import { clsx } from 'clsx';
import { logger } from '../../core/utils/logger';
import type { BassStyle, GuitarStyle, PianoStyle, RealisticBassStyle, RealisticGuitarStyle, ElectricGuitarStyle, BassSynthType, GuitarSynthType } from '../../types';
import { PIANO_STYLE_CONFIG, ALL_BASS_OPTIONS, ALL_GUITAR_OPTIONS } from '../../types';
import type { EffectType } from '../../core/VoiceEffects';

const EFFECT_CONFIG: Record<EffectType, { displayName: string; color: string; description: string; sliderLabel: string }> = {
  reverb: { displayName: 'Reverb', color: '#8b5cf6', description: 'Spacious echo', sliderLabel: 'Size' },
  delay: { displayName: 'Delay', color: '#06b6d4', description: 'Rhythmic repeat', sliderLabel: 'Feedback' },
  chorus: { displayName: 'Chorus', color: '#22c55e', description: 'Thick shimmer', sliderLabel: 'Depth' },
  distortion: { displayName: 'Distortion', color: '#ef4444', description: 'Gritty edge', sliderLabel: 'Drive' },
};


type SetupStep = 'setup-drums' | 'setup-bass' | 'setup-guitar' | 'setup-piano' | 'setup-voice';

interface SetupStepConfig {
  icon: React.FC<{ size?: number; className?: string; color?: string }>;
  title: string;
  subtitle: string;
  nextStep: string;
}

const SETUP_STEPS: Record<SetupStep, SetupStepConfig> = {
  'setup-drums': {
    icon: DrumIcon,
    title: 'CHOOSE YOUR DRUMS',
    subtitle: 'Select a kit to hear the beat',
    nextStep: 'setup-bass',
  },
  'setup-bass': {
    icon: BassIcon,
    title: 'CHOOSE YOUR BASS',
    subtitle: 'Select a style to hear the groove',
    nextStep: 'setup-guitar',
  },
  'setup-guitar': {
    icon: GuitarIcon,
    title: 'CHOOSE YOUR GUITAR',
    subtitle: 'Select a tone to hear the riff',
    nextStep: 'setup-piano',
  },
  'setup-piano': {
    icon: PianoIcon,
    title: 'CHOOSE YOUR PIANO',
    subtitle: 'Select a style to hear the keys',
    nextStep: 'setup-voice',
  },
  'setup-voice': {
    icon: VoiceIcon,
    title: 'ADD VOICE EFFECTS',
    subtitle: 'Sing and toggle effects to preview',
    nextStep: 'drums',
  },
};

export function InstrumentSetupScreen() {
  // Get current instrument from URL params
  const { instrument } = useParams<{ instrument: string }>();
  const { goToStep } = useGuidedFlow();
  const instrumentSetup = useInstrumentSetup();
  const selectedBpm = useSelectedBpm();
  const [isPlaying, setIsPlaying] = useState(false);
  const [currentBeat, setCurrentBeat] = useState(0);
  const [audioInitialized, setAudioInitialized] = useState(false);
  // Use store for effect selections (persists across screens)
  const activeEffects = instrumentSetup.selectedVoiceEffects;
  const [effectParams, setEffectParams] = useState<Record<EffectType, number>>({
    reverb: 0.5,
    delay: 0.4,
    chorus: 0.5,
    distortion: 0.5,
  });
  const [drumIntensity, setDrumIntensity] = useState(0.7);
  const [bassIntensity, setBassIntensity] = useState(0.6);
  const [guitarIntensity, setGuitarIntensity] = useState(0.5);
  const [pianoIntensity, setPianoIntensity] = useState(0.5);
  const audioContextRef = useRef<AudioContext | null>(null);

  const {
    setSelectedDrumKit,
    setSelectedBassSynthType,
    setSelectedBassStyle,
    setSelectedRealisticBassStyle,
    setSelectedGuitarSynthType,
    setSelectedGuitarStyle,
    setSelectedRealisticGuitarStyle,
    setSelectedElectricGuitarStyle,
    setSelectedPianoStyle,
    toggleSelectedVoiceEffect,
    isCreatingNewBand,
    saveNewBand,
  } = useAppStore();

  // Derive current step from URL parameter
  const currentStep = `setup-${instrument}` as SetupStep;
  const stepConfig = SETUP_STEPS[currentStep];

  // Initialize audio context
  useEffect(() => {
    const initAudio = async () => {
      const initialized = await audioEngine.initialize();
      if (initialized) {
        const ctx = audioEngine.getAudioContext();
        if (ctx) {
          audioContextRef.current = ctx;
          drumKitPlayer.initialize(ctx);
          drumKitPlayer.setBpm(selectedBpm);
          bassDemoPlayer.initialize(ctx);
          bassDemoPlayer.setBpm(selectedBpm);
          guitarDemoPlayer.initialize(ctx);
          guitarDemoPlayer.setBpm(selectedBpm);
          pianoDemoPlayer.initialize(ctx);
          pianoDemoPlayer.setBpm(selectedBpm);
          setAudioInitialized(true);
        }
      }
    };
    initAudio();

    return () => {
      drumKitPlayer.stop();
      bassDemoPlayer.stop();
      guitarDemoPlayer.stop();
      pianoDemoPlayer.stop();
    };
  }, [selectedBpm]);

  // Handle step-specific audio setup (only runs when step changes)
  useEffect(() => {
    if (!audioInitialized) return;

    // Stop all players when entering a new step
    drumKitPlayer.stop();
    bassDemoPlayer.stop();
    guitarDemoPlayer.stop();
    pianoDemoPlayer.stop();
    setIsPlaying(false);

    // Set up beat callback
    const beatCallback = (beat: number) => setCurrentBeat(beat);

    if (currentStep === 'setup-drums') {
      drumKitPlayer.setOnBeat(beatCallback);
    } else if (currentStep === 'setup-bass') {
      bassDemoPlayer.setOnBeat(beatCallback);
    } else if (currentStep === 'setup-guitar') {
      guitarDemoPlayer.setOnBeat(beatCallback);
    } else if (currentStep === 'setup-piano') {
      pianoDemoPlayer.setOnBeat(beatCallback);
    } else if (currentStep === 'setup-voice') {
      // Disable all instrument detection during voice setup
      audioEngine.setBeatboxEnabled(false);
      audioEngine.setPitchEnabled(false);
      audioEngine.setInstrumentMode('off');
      // Start voice passthrough
      audioEngine.requestPermission().then((granted) => {
        if (granted) {
          audioEngine.startPassthrough();
        }
      });
    }

    return () => {
      if (currentStep === 'setup-voice') {
        audioEngine.stopPassthrough();
        // Re-enable detection and disable effects when leaving voice setup
        audioEngine.setBeatboxEnabled(true);
        audioEngine.setPitchEnabled(true);
        audioEngine.disableAllEffects();
      }
    };
  }, [currentStep, audioInitialized]);

  // Handle drum kit selection
  const handleDrumKitSelect = useCallback((kit: DrumKitType) => {
    setSelectedDrumKit(kit);
    drumKitPlayer.setKit(kit);
    // Auto-start playback if not playing
    if (!drumKitPlayer.getIsPlaying()) {
      drumKitPlayer.start();
      setIsPlaying(true);
    }
  }, [setSelectedDrumKit]);

  // Handle bass style selection (combined electronic and realistic)
  const handleBassSelect = useCallback((synthType: BassSynthType, style: string) => {
    setSelectedBassSynthType(synthType);
    if (synthType === 'electronic') {
      setSelectedBassStyle(style as BassStyle);
      bassDemoPlayer.setStyle(style as BassStyle);
    } else {
      setSelectedRealisticBassStyle(style as RealisticBassStyle);
      // TODO: Use realistic bass demo player when implemented
      // For now, map to closest electronic style for preview
      const styleMap: Record<RealisticBassStyle, BassStyle> = {
        finger: 'synth',
        pick: 'pluck',
        slap: 'pluck',
        muted: 'sub',
      };
      bassDemoPlayer.setStyle(styleMap[style as RealisticBassStyle]);
    }
    if (!bassDemoPlayer.getIsPlaying()) {
      bassDemoPlayer.start();
      setIsPlaying(true);
    }
  }, [setSelectedBassSynthType, setSelectedBassStyle, setSelectedRealisticBassStyle]);

  // Handle guitar style selection (combined electronic, acoustic sampled, and electric sampled)
  const handleGuitarSelect = useCallback((synthType: GuitarSynthType, style: string) => {
    setSelectedGuitarSynthType(synthType);
    if (synthType === 'electronic') {
      setSelectedGuitarStyle(style as GuitarStyle);
      guitarDemoPlayer.setStyle(style as GuitarStyle);
    } else if (synthType === 'electric') {
      setSelectedElectricGuitarStyle(style as ElectricGuitarStyle);
      // Also set on AudioEngine for real-time preview
      audioEngine.setGuitarSynthType('electric');
      audioEngine.setElectricGuitarStyle(style as ElectricGuitarStyle);
      // Use the actual electric guitar sampler for demo preview
      guitarDemoPlayer.setElectricStyle(style as ElectricGuitarStyle);
    } else {
      // sampled (acoustic)
      setSelectedRealisticGuitarStyle(style as RealisticGuitarStyle);
      // Use the actual sampled guitar for demo preview
      guitarDemoPlayer.setRealisticStyle(style as RealisticGuitarStyle);
    }
    if (!guitarDemoPlayer.getIsPlaying()) {
      guitarDemoPlayer.start();
      setIsPlaying(true);
    }
  }, [setSelectedGuitarSynthType, setSelectedGuitarStyle, setSelectedRealisticGuitarStyle, setSelectedElectricGuitarStyle]);

  // Handle piano style selection
  const handlePianoStyleSelect = useCallback((style: PianoStyle) => {
    setSelectedPianoStyle(style);
    pianoDemoPlayer.setStyle(style);
    if (!pianoDemoPlayer.getIsPlaying()) {
      pianoDemoPlayer.start();
      setIsPlaying(true);
    }
  }, [setSelectedPianoStyle]);

  // Handle voice effect toggle
  const handleEffectToggle = useCallback((effect: EffectType) => {
    const newState = !activeEffects[effect];
    // Update store (persists selection for recording phase)
    toggleSelectedVoiceEffect(effect);
    // Apply to audio engine for live preview
    audioEngine.toggleEffect(effect, newState);
  }, [activeEffects, toggleSelectedVoiceEffect]);

  // Handle effect parameter change
  const handleEffectParamChange = useCallback((effect: EffectType, value: number) => {
    setEffectParams(prev => ({ ...prev, [effect]: value }));

    // Map slider (0-1) to appropriate parameter ranges for each effect
    // Also set mix level based on slider position for more noticeable effect
    const mixLevel = 0.3 + value * 0.5; // 30% to 80% wet

    switch (effect) {
      case 'reverb':
        // Decay: 0.5 to 5 seconds
        audioEngine.setEffectParam('reverb', 'decay', 0.5 + value * 4.5);
        audioEngine.setEffectParam('reverb', 'mix', mixLevel);
        break;
      case 'delay':
        // Feedback: 0.2 to 0.85
        audioEngine.setEffectParam('delay', 'feedback', 0.2 + value * 0.65);
        audioEngine.setEffectParam('delay', 'mix', mixLevel);
        break;
      case 'chorus':
        // Depth: 0.003 to 0.02 (more noticeable modulation)
        audioEngine.setEffectParam('chorus', 'depth', 0.003 + value * 0.017);
        // Rate: 0.5 to 4 Hz (slower to faster warble)
        audioEngine.setEffectParam('chorus', 'rate', 0.5 + value * 3.5);
        audioEngine.setEffectParam('chorus', 'mix', mixLevel);
        break;
      case 'distortion':
        // Amount: 10 to 100 (much more aggressive)
        audioEngine.setEffectParam('distortion', 'amount', 10 + value * 90);
        audioEngine.setEffectParam('distortion', 'mix', 0.4 + value * 0.5); // 40% to 90%
        break;
    }
  }, []);

  // Handle instrument intensity changes
  const handleDrumIntensityChange = useCallback((value: number) => {
    setDrumIntensity(value);
    drumKitPlayer.setVolume(value);
  }, []);

  const handleBassIntensityChange = useCallback((value: number) => {
    setBassIntensity(value);
    bassDemoPlayer.setVolume(value);
  }, []);

  const handleGuitarIntensityChange = useCallback((value: number) => {
    setGuitarIntensity(value);
    guitarDemoPlayer.setVolume(value);
  }, []);

  const handlePianoIntensityChange = useCallback((value: number) => {
    setPianoIntensity(value);
    pianoDemoPlayer.setVolume(value);
  }, []);

  const handleNext = useCallback(() => {
    // Stop all playback
    drumKitPlayer.stop();
    bassDemoPlayer.stop();
    guitarDemoPlayer.stop();
    pianoDemoPlayer.stop();
    audioEngine.stopPassthrough();
    // Re-enable detection and disable effects if leaving voice setup
    if (currentStep === 'setup-voice') {
      audioEngine.setBeatboxEnabled(true);
      audioEngine.setPitchEnabled(true);
      audioEngine.disableAllEffects();

      // Save the new band and return to band selection
      if (isCreatingNewBand) {
        saveNewBand();
        logger.debug('[InstrumentSetupScreen] New band saved, returning to band selection');
        goToStep('band-select');
        return;
      }
    }
    goToStep(stepConfig.nextStep as any);
  }, [currentStep, goToStep, stepConfig?.nextStep, isCreatingNewBand, saveNewBand]);

  const handleBack = useCallback(() => {
    drumKitPlayer.stop();
    bassDemoPlayer.stop();
    guitarDemoPlayer.stop();
    pianoDemoPlayer.stop();
    audioEngine.stopPassthrough();
    // Re-enable detection and disable effects if leaving voice setup
    if (currentStep === 'setup-voice') {
      audioEngine.setBeatboxEnabled(true);
      audioEngine.setPitchEnabled(true);
      audioEngine.disableAllEffects();
    }

    const stepOrder: SetupStep[] = ['setup-drums', 'setup-bass', 'setup-guitar', 'setup-piano', 'setup-voice'];
    const currentIndex = stepOrder.indexOf(currentStep);
    if (currentIndex > 0) {
      goToStep(stepOrder[currentIndex - 1]);
    } else {
      // Go back to band-name if creating new band, otherwise band-select
      goToStep(isCreatingNewBand ? 'band-name' : 'band-select');
    }
  }, [currentStep, goToStep, isCreatingNewBand]);

  if (!stepConfig) {
    return null;
  }

  return (
    <div className="h-full w-full bg-[#050505] flex flex-col relative">
      <div className="bg-shader-gradient" />

      <FlowHeader />

      {/* Main content */}
      <div className="flex-1 flex flex-col px-6 py-4 relative z-10 overflow-y-auto">
        {/* Subtitle */}
        <p className="text-xs text-[#666666] font-mono mb-4 text-center">{stepConfig.subtitle}</p>

        {/* Beat indicator for instruments */}
        {currentStep !== 'setup-voice' && isPlaying && (
          <div className="flex justify-center gap-2 mb-4">
            {[0, 1, 2, 3].map((beat) => (
              <div
                key={beat}
                className={clsx(
                  'w-3 h-3 rounded-full transition-all',
                  currentBeat === beat
                    ? 'bg-[#00ffff] scale-125 shadow-[0_0_10px_#00ffff]'
                    : 'bg-[#333333]'
                )}
              />
            ))}
          </div>
        )}

        {/* Options based on current step */}
        <div className="flex-1">
          {currentStep === 'setup-drums' && (
            <DrumKitOptions
              selected={instrumentSetup.selectedDrumKit}
              onSelect={handleDrumKitSelect}
              intensity={drumIntensity}
              onIntensityChange={handleDrumIntensityChange}
            />
          )}
          {currentStep === 'setup-bass' && (
            <BassOptions
              selectedSynthType={instrumentSetup.selectedBassSynthType}
              selectedStyle={instrumentSetup.selectedBassStyle}
              selectedRealisticStyle={instrumentSetup.selectedRealisticBassStyle}
              onSelect={handleBassSelect}
              intensity={bassIntensity}
              onIntensityChange={handleBassIntensityChange}
            />
          )}
          {currentStep === 'setup-guitar' && (
            <GuitarOptions
              selectedSynthType={instrumentSetup.selectedGuitarSynthType}
              selectedStyle={instrumentSetup.selectedGuitarStyle}
              selectedRealisticStyle={instrumentSetup.selectedRealisticGuitarStyle}
              selectedElectricStyle={instrumentSetup.selectedElectricGuitarStyle}
              onSelect={handleGuitarSelect}
              intensity={guitarIntensity}
              onIntensityChange={handleGuitarIntensityChange}
            />
          )}
          {currentStep === 'setup-piano' && (
            <PianoOptions
              selected={instrumentSetup.selectedPianoStyle}
              onSelect={handlePianoStyleSelect}
              intensity={pianoIntensity}
              onIntensityChange={handlePianoIntensityChange}
            />
          )}
          {currentStep === 'setup-voice' && (
            <VoiceOptions
              activeEffects={activeEffects}
              onToggle={handleEffectToggle}
              effectParams={effectParams}
              onParamChange={handleEffectParamChange}
            />
          )}
        </div>
      </div>

      {/* Navigation buttons */}
      <div className="px-6 py-4 border-t border-[#1a1a1a] relative z-10 flex gap-4">
        <button
          onClick={handleBack}
          className="flex-1 py-3 rounded-full border border-[#333333] text-[#888888] font-mono uppercase tracking-wider hover:border-[#00ffff]/50 hover:text-white transition-colors"
        >
          Back
        </button>
        <button
          onClick={handleNext}
          className="flex-[2] py-3 px-6 rounded-full btn-shader-primary font-mono uppercase tracking-wider flex items-center justify-center gap-2"
        >
          {currentStep === 'setup-voice' ? 'Start Recording' : 'Next'}
          <ChevronRightIcon size={18} />
        </button>
      </div>
    </div>
  );
}

/**
 * Drum kit selection options.
 */
function DrumKitOptions({
  selected,
  onSelect,
  intensity,
  onIntensityChange,
}: {
  selected: DrumKitType;
  onSelect: (kit: DrumKitType) => void;
  intensity: number;
  onIntensityChange: (value: number) => void;
}) {
  const options: DrumKitType[] = ['electronic', 'acoustic', 'lofi', 'trap', 'jazz', 'vintage', 'rock'];

  return (
    <div className="grid grid-cols-2 gap-3 max-h-[400px] overflow-y-auto pr-1">
      {options.map((kit) => {
        const config = DRUM_KIT_CONFIG[kit];
        const isSelected = selected === kit;

        return (
          <InstrumentOptionCard
            key={kit}
            color={config.color}
            name={config.displayName}
            description={config.description}
            isSelected={isSelected}
            onClick={() => onSelect(kit)}
            sliderLabel="Punch"
            sliderValue={intensity}
            onSliderChange={onIntensityChange}
          />
        );
      })}
    </div>
  );
}

/**
 * Bass style selection options with combined electronic and realistic.
 */
function BassOptions({
  selectedSynthType,
  selectedStyle,
  selectedRealisticStyle,
  onSelect,
  intensity,
  onIntensityChange,
}: {
  selectedSynthType: BassSynthType;
  selectedStyle: BassStyle;
  selectedRealisticStyle: RealisticBassStyle;
  onSelect: (synthType: BassSynthType, style: string) => void;
  intensity: number;
  onIntensityChange: (value: number) => void;
}) {
  return (
    <div className="grid grid-cols-2 gap-3 max-h-[400px] overflow-y-auto pr-1">
      {ALL_BASS_OPTIONS.map((option) => {
        const isSelected =
          option.synthType === selectedSynthType &&
          (option.synthType === 'electronic'
            ? option.style === selectedStyle
            : option.style === selectedRealisticStyle);

        return (
          <InstrumentOptionCard
            key={`${option.synthType}-${option.style}`}
            color={option.color}
            name={option.displayName}
            description={option.description}
            isSelected={isSelected}
            onClick={() => onSelect(option.synthType, option.style)}
            sliderLabel="Depth"
            sliderValue={intensity}
            onSliderChange={onIntensityChange}
            tag={option.tag}
            tagColor={option.tagColor}
          />
        );
      })}
    </div>
  );
}

/**
 * Guitar style selection options with combined electronic and realistic.
 */
function GuitarOptions({
  selectedSynthType,
  selectedStyle,
  selectedRealisticStyle,
  selectedElectricStyle,
  onSelect,
  intensity,
  onIntensityChange,
}: {
  selectedSynthType: GuitarSynthType;
  selectedStyle: GuitarStyle;
  selectedRealisticStyle: RealisticGuitarStyle;
  selectedElectricStyle: ElectricGuitarStyle;
  onSelect: (synthType: GuitarSynthType, style: string) => void;
  intensity: number;
  onIntensityChange: (value: number) => void;
}) {
  return (
    <div className="grid grid-cols-2 gap-3 max-h-[400px] overflow-y-auto pr-1">
      {ALL_GUITAR_OPTIONS.map((option) => {
        // Determine if this option is selected based on synth type
        let isSelected = false;
        if (option.synthType === selectedSynthType) {
          if (option.synthType === 'electronic') {
            isSelected = option.style === selectedStyle;
          } else if (option.synthType === 'electric') {
            isSelected = option.style === selectedElectricStyle;
          } else {
            // sampled (acoustic)
            isSelected = option.style === selectedRealisticStyle;
          }
        }

        return (
          <InstrumentOptionCard
            key={`${option.synthType}-${option.style}`}
            color={option.color}
            name={option.displayName}
            description={option.description}
            isSelected={isSelected}
            onClick={() => onSelect(option.synthType, option.style)}
            sliderLabel="Tone"
            sliderValue={intensity}
            onSliderChange={onIntensityChange}
            tag={option.tag}
            tagColor={option.tagColor}
          />
        );
      })}
    </div>
  );
}

/**
 * Piano style selection options.
 */
function PianoOptions({
  selected,
  onSelect,
  intensity,
  onIntensityChange,
}: {
  selected: PianoStyle;
  onSelect: (style: PianoStyle) => void;
  intensity: number;
  onIntensityChange: (value: number) => void;
}) {
  // Show first 4 piano styles in the grid
  const options: PianoStyle[] = ['grand', 'upright', 'electric', 'rhodes'];

  return (
    <div className="grid grid-cols-2 gap-3">
      {options.map((style) => {
        const config = PIANO_STYLE_CONFIG[style];
        const isSelected = selected === style;

        return (
          <InstrumentOptionCard
            key={style}
            color={config.color}
            name={config.displayName}
            description={config.description}
            isSelected={isSelected}
            onClick={() => onSelect(style)}
            sliderLabel="Brightness"
            sliderValue={intensity}
            onSliderChange={onIntensityChange}
          />
        );
      })}
    </div>
  );
}

/**
 * Voice effect selection with live preview.
 */
function VoiceOptions({
  activeEffects,
  onToggle,
  effectParams,
  onParamChange,
}: {
  activeEffects: Record<EffectType, boolean>;
  onToggle: (effect: EffectType) => void;
  effectParams: Record<EffectType, number>;
  onParamChange: (effect: EffectType, value: number) => void;
}) {
  const effects: EffectType[] = ['reverb', 'delay', 'chorus', 'distortion'];

  return (
    <div className="space-y-4">
      {/* Effect toggles */}
      <div className="grid grid-cols-2 gap-3">
        {effects.map((effect) => {
          const config = EFFECT_CONFIG[effect];
          const isActive = activeEffects[effect];

          return (
            <InstrumentOptionCard
              key={effect}
              color={config.color}
              name={config.displayName}
              description={config.description}
              isSelected={isActive}
              onClick={() => onToggle(effect)}
              sliderLabel={config.sliderLabel}
              sliderValue={effectParams[effect]}
              onSliderChange={(value) => onParamChange(effect, value)}
            />
          );
        })}
      </div>
    </div>
  );
}
