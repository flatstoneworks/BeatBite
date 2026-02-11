/**
 * BandCreateScreen - Multi-step band creation flow.
 *
 * Steps:
 * 1. Name (mandatory)
 * 2. Drums
 * 3. Bass
 * 4. Guitar
 * 5. Piano
 * 6. Voice effects
 *
 * After completion, creates the band and returns to library.
 */

import { useState, useCallback, useEffect } from 'react';
import { useNavigate, useParams } from 'react-router-dom';
import { useAppStore } from '../../core/store';
import { clsx } from 'clsx';
import { logger } from '../../core/utils/logger';
import { DrumIcon, BassIcon, GuitarIcon, PianoIcon, VoiceIcon } from '../components/Icons';
import { InstrumentOptionCard } from '../components/InstrumentOptionCard';
import { audioEngine } from '../../core/AudioEngine';
import { drumKitPlayer, type DrumKitType, type DrumSynthType } from '../../core/DrumKitPlayer';
import { bassDemoPlayer } from '../../core/BassDemoPlayer';
import { guitarDemoPlayer } from '../../core/GuitarDemoPlayer';
import { pianoDemoPlayer } from '../../core/PianoDemoPlayer';
import { ALL_DRUM_OPTIONS, ALL_BASS_OPTIONS, ALL_GUITAR_OPTIONS, ALL_PIANO_OPTIONS, type BassStyle, type GuitarStyle, type PianoStyle, type BassSynthType, type GuitarSynthType, type PianoSynthType, type RealisticBassStyle, type RealisticGuitarStyle, type ElectricGuitarStyle, type RealisticPianoStyle, type SampledDrumKitType } from '../../types';

type CreateStep = 'name' | 'drums' | 'bass' | 'guitar' | 'piano' | 'voice';

const STEPS: CreateStep[] = ['name', 'drums', 'bass', 'guitar', 'piano', 'voice'];

const STEP_CONFIG: Record<CreateStep, { title: string; subtitle: string; icon?: React.ReactNode }> = {
  name: { title: 'Name Your Band', subtitle: 'Give your band a memorable name' },
  drums: { title: 'Choose Drums', subtitle: 'Select your drum kit style', icon: <DrumIcon size={24} color="#00ffff" /> },
  bass: { title: 'Choose Bass', subtitle: 'Select your bass sound', icon: <BassIcon size={24} color="#3b82f6" /> },
  guitar: { title: 'Choose Guitar', subtitle: 'Select your guitar style', icon: <GuitarIcon size={24} color="#22c55e" /> },
  piano: { title: 'Choose Piano', subtitle: 'Select your piano/keys sound', icon: <PianoIcon size={24} color="#f59e0b" /> },
  voice: { title: 'Voice Effects', subtitle: 'Enable effects for your voice', icon: <VoiceIcon size={24} color="#a855f7" /> },
};

export function BandCreateScreen() {
  const { step } = useParams<{ step?: string }>();
  const navigate = useNavigate();
  const { createBandFromInput } = useAppStore();

  // Current step from URL or default to 'name'
  const currentStep: CreateStep = (step && STEPS.includes(step as CreateStep)) ? step as CreateStep : 'name';
  const currentStepIndex = STEPS.indexOf(currentStep);

  // Form state - use first option from each category as default
  const [bandName, setBandName] = useState('');
  const [selectedDrumKit, setSelectedDrumKit] = useState<DrumKitType | SampledDrumKitType>('acoustic');
  const [selectedDrumSynthType, setSelectedDrumSynthType] = useState<DrumSynthType>('sampled');
  const [selectedBassStyle, setSelectedBassStyle] = useState<BassStyle>('synth');
  const [selectedBassSynthType, setSelectedBassSynthType] = useState<BassSynthType>('electronic');
  const [selectedRealisticBassStyle, setSelectedRealisticBassStyle] = useState<RealisticBassStyle>('finger');
  const [selectedGuitarStyle, setSelectedGuitarStyle] = useState<GuitarStyle>('acoustic');
  const [selectedGuitarSynthType, setSelectedGuitarSynthType] = useState<GuitarSynthType>('electronic');
  const [selectedRealisticGuitarStyle, setSelectedRealisticGuitarStyle] = useState<RealisticGuitarStyle>('acoustic');
  const [selectedElectricGuitarStyle, setSelectedElectricGuitarStyle] = useState<ElectricGuitarStyle>('clean');
  const [selectedPianoStyle, setSelectedPianoStyle] = useState<PianoStyle>('grand');
  const [selectedPianoSynthType, setSelectedPianoSynthType] = useState<PianoSynthType>('electronic');
  const [selectedRealisticPianoStyle, setSelectedRealisticPianoStyle] = useState<RealisticPianoStyle>('acoustic');
  const [voiceEffects, setVoiceEffects] = useState<Record<string, boolean>>({
    reverb: false,
    delay: false,
    chorus: false,
    distortion: false,
  });

  // Audio preview state
  const [audioInitialized, setAudioInitialized] = useState(false);
  const [playingPreview, setPlayingPreview] = useState<string | null>(null);

  // Initialize audio for previews
  const initializeAudio = useCallback(async () => {
    if (audioInitialized) return true;
    const initialized = await audioEngine.initialize();
    if (initialized) {
      const ctx = audioEngine.getAudioContext();
      if (ctx) {
        drumKitPlayer.initialize(ctx);
        drumKitPlayer.setBpm(120);
        bassDemoPlayer.initialize(ctx);
        bassDemoPlayer.setBpm(120);
        guitarDemoPlayer.initialize(ctx);
        guitarDemoPlayer.setBpm(120);
        pianoDemoPlayer.initialize(ctx);
        pianoDemoPlayer.setBpm(120);
        setAudioInitialized(true);
        return true;
      }
    }
    return false;
  }, [audioInitialized]);

  // Stop all previews
  const stopAllPreviews = useCallback(() => {
    drumKitPlayer.stop();
    bassDemoPlayer.stop();
    guitarDemoPlayer.stop();
    pianoDemoPlayer.stop();
    setPlayingPreview(null);
  }, []);

  // Cleanup on unmount
  useEffect(() => {
    return () => {
      stopAllPreviews();
    };
  }, [stopAllPreviews]);

  // Navigate to step
  const goToStep = useCallback((step: CreateStep) => {
    stopAllPreviews();
    if (step === 'name') {
      navigate('/band/new');
    } else {
      navigate(`/band/new/${step}`);
    }
  }, [navigate, stopAllPreviews]);

  // Go back
  const handleBack = useCallback(() => {
    stopAllPreviews();
    if (currentStepIndex === 0) {
      navigate('/library/bands');
    } else {
      goToStep(STEPS[currentStepIndex - 1]);
    }
  }, [currentStepIndex, navigate, goToStep, stopAllPreviews]);

  // Continue to next step
  const handleContinue = useCallback(() => {
    stopAllPreviews();
    if (currentStepIndex === STEPS.length - 1) {
      // Final step - create band and go to library
      logger.debug('[BandCreate] Creating band with name:', bandName.trim() || 'My Band');
      try {
        const newBand = createBandFromInput({
          name: bandName.trim() || 'My Band',
          // Drums - store both electronic and sampled values
          drumSynthType: selectedDrumSynthType,
          drumKit: selectedDrumSynthType === 'electronic' ? selectedDrumKit as DrumKitType : 'acoustic',
          sampledDrumKit: selectedDrumSynthType === 'sampled' ? selectedDrumKit as SampledDrumKitType : 'acoustic',
          // Bass
          bassSynthType: selectedBassSynthType,
          bassStyle: selectedBassStyle,
          realisticBassStyle: selectedRealisticBassStyle,
          // Guitar
          guitarSynthType: selectedGuitarSynthType,
          guitarStyle: selectedGuitarStyle,
          realisticGuitarStyle: selectedRealisticGuitarStyle,
          electricGuitarStyle: selectedElectricGuitarStyle,
          // Piano - store both electronic and sampled values
          pianoSynthType: selectedPianoSynthType,
          pianoStyle: selectedPianoSynthType === 'electronic' ? selectedPianoStyle : 'grand',
          realisticPianoStyle: selectedPianoSynthType === 'sampled' ? selectedRealisticPianoStyle : 'acoustic',
          // Voice
          voiceEffects: voiceEffects as Record<'reverb' | 'delay' | 'chorus' | 'distortion', boolean>,
        });
        logger.info('[BandCreate] Band created successfully:', newBand?.id);
        navigate('/library/bands');
      } catch (error) {
        logger.error('[BandCreate] Error creating band:', error);
        // Still navigate even if there's an error
        navigate('/library/bands');
      }
    } else {
      goToStep(STEPS[currentStepIndex + 1]);
    }
  }, [
    currentStepIndex, bandName, selectedDrumSynthType, selectedDrumKit,
    selectedBassSynthType, selectedBassStyle, selectedRealisticBassStyle,
    selectedGuitarSynthType, selectedGuitarStyle, selectedRealisticGuitarStyle, selectedElectricGuitarStyle,
    selectedPianoSynthType, selectedPianoStyle, selectedRealisticPianoStyle,
    voiceEffects, createBandFromInput, navigate, goToStep, stopAllPreviews
  ]);

  // Check if can continue
  const canContinue = currentStep === 'name' ? bandName.trim().length > 0 : true;

  // Step config
  const config = STEP_CONFIG[currentStep];

  return (
    <div className="h-full w-full bg-[#050505] flex flex-col">
      {/* Header */}
      <div className="px-4 pt-6 pb-4">
        <div className="flex items-center justify-between mb-4">
          <button
            onClick={handleBack}
            className="p-2 -ml-2 text-[#666666] hover:text-white transition-colors"
          >
            <svg className="w-6 h-6" fill="none" viewBox="0 0 24 24" stroke="currentColor">
              <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M15 19l-7-7 7-7" />
            </svg>
          </button>

          {/* Progress dots */}
          <div className="flex items-center gap-2">
            {STEPS.map((s, i) => (
              <div
                key={s}
                className={clsx(
                  'w-2 h-2 rounded-full transition-colors',
                  i === currentStepIndex ? 'bg-[#00ffff]' : i < currentStepIndex ? 'bg-[#00ffff]/50' : 'bg-[#333333]'
                )}
              />
            ))}
          </div>

          <div className="w-10" /> {/* Spacer for alignment */}
        </div>

        {/* Title */}
        <div className="flex items-center gap-3">
          {config.icon}
          <div>
            <h1 className="text-xl font-bold text-white font-mono">{config.title}</h1>
            <p className="text-[#666666] text-sm font-mono">{config.subtitle}</p>
          </div>
        </div>
      </div>

      {/* Content */}
      <div className="flex-1 overflow-y-auto px-4 pb-4">
        {currentStep === 'name' && (
          <NameStep
            value={bandName}
            onChange={setBandName}
            onSubmit={handleContinue}
          />
        )}
        {currentStep === 'drums' && (
          <DrumsStep
            selectedKit={selectedDrumKit}
            selectedSynthType={selectedDrumSynthType}
            onSelect={(synthType, kit) => {
              setSelectedDrumSynthType(synthType);
              setSelectedDrumKit(kit);
            }}
            initializeAudio={initializeAudio}
            playingPreview={playingPreview}
            setPlayingPreview={setPlayingPreview}
            stopAllPreviews={stopAllPreviews}
          />
        )}
        {currentStep === 'bass' && (
          <BassStep
            selectedStyle={selectedBassStyle}
            selectedSynthType={selectedBassSynthType}
            selectedRealisticStyle={selectedRealisticBassStyle}
            onSelect={(synthType, style, realisticStyle) => {
              setSelectedBassSynthType(synthType);
              if (synthType === 'electronic') {
                setSelectedBassStyle(style as BassStyle);
              } else {
                setSelectedRealisticBassStyle(realisticStyle as RealisticBassStyle);
              }
            }}
            initializeAudio={initializeAudio}
            playingPreview={playingPreview}
            setPlayingPreview={setPlayingPreview}
            stopAllPreviews={stopAllPreviews}
          />
        )}
        {currentStep === 'guitar' && (
          <GuitarStep
            selectedStyle={selectedGuitarStyle}
            selectedSynthType={selectedGuitarSynthType}
            selectedRealisticStyle={selectedRealisticGuitarStyle}
            selectedElectricStyle={selectedElectricGuitarStyle}
            onSelect={(synthType, style, realisticStyle, electricStyle) => {
              setSelectedGuitarSynthType(synthType);
              if (synthType === 'electronic') {
                setSelectedGuitarStyle(style as GuitarStyle);
              } else if (synthType === 'sampled') {
                setSelectedRealisticGuitarStyle(realisticStyle as RealisticGuitarStyle);
              } else {
                setSelectedElectricGuitarStyle(electricStyle as ElectricGuitarStyle);
              }
            }}
            initializeAudio={initializeAudio}
            playingPreview={playingPreview}
            setPlayingPreview={setPlayingPreview}
            stopAllPreviews={stopAllPreviews}
          />
        )}
        {currentStep === 'piano' && (
          <PianoStep
            selectedStyle={selectedPianoStyle}
            selectedSynthType={selectedPianoSynthType}
            selectedRealisticStyle={selectedRealisticPianoStyle}
            onSelect={(synthType, style, realisticStyle) => {
              setSelectedPianoSynthType(synthType);
              if (synthType === 'electronic') {
                setSelectedPianoStyle(style as PianoStyle);
              } else {
                setSelectedRealisticPianoStyle(realisticStyle as RealisticPianoStyle);
              }
            }}
            initializeAudio={initializeAudio}
            playingPreview={playingPreview}
            setPlayingPreview={setPlayingPreview}
            stopAllPreviews={stopAllPreviews}
          />
        )}
        {currentStep === 'voice' && (
          <VoiceStep
            effects={voiceEffects}
            onChange={setVoiceEffects}
          />
        )}
      </div>

      {/* Sticky Footer */}
      <div className="sticky bottom-0 left-0 right-0 px-4 pb-6 pt-4 bg-[#050505] border-t border-[#1a1a1a]">
        <button
          onClick={handleContinue}
          disabled={!canContinue}
          className={clsx(
            'w-full py-4 rounded-xl font-mono font-bold text-base transition-all',
            canContinue
              ? 'bg-[#00ffff] text-black hover:bg-[#00cccc]'
              : 'bg-[#222222] text-[#555555] cursor-not-allowed'
          )}
        >
          {currentStepIndex === STEPS.length - 1 ? 'Create Band' : 'Continue'}
        </button>
      </div>
    </div>
  );
}

/**
 * Name input step.
 */
function NameStep({
  value,
  onChange,
  onSubmit,
}: {
  value: string;
  onChange: (value: string) => void;
  onSubmit: () => void;
}) {
  const suggestions = ['The Rockers', 'Jazz Collective', 'Electronic Vibes', 'Soul Session', 'Funk Masters'];

  return (
    <div className="py-8">
      <input
        type="text"
        value={value}
        onChange={(e) => onChange(e.target.value)}
        onKeyDown={(e) => e.key === 'Enter' && value.trim() && onSubmit()}
        placeholder="Enter band name..."
        maxLength={30}
        autoFocus
        className="w-full px-4 py-4 bg-[#0a0a0a] border border-[#222222] rounded-xl text-white font-mono text-lg text-center focus:outline-none focus:border-[#00ffff] transition-colors"
      />
      <p className="text-[#444444] text-xs font-mono mt-2 text-right">
        {value.length}/30
      </p>

      <div className="mt-8">
        <p className="text-[#666666] text-xs font-mono uppercase tracking-wider mb-3 text-center">
          Or try one of these
        </p>
        <div className="flex flex-wrap gap-2 justify-center">
          {suggestions.map((suggestion) => (
            <button
              key={suggestion}
              onClick={() => onChange(suggestion)}
              className={clsx(
                'px-3 py-1.5 rounded-full text-sm font-mono transition-all',
                value === suggestion
                  ? 'bg-[#00ffff]/20 text-[#00ffff] border border-[#00ffff]/50'
                  : 'bg-[#111111] text-[#888888] border border-[#222222] hover:bg-[#1a1a1a] hover:text-white'
              )}
            >
              {suggestion}
            </button>
          ))}
        </div>
      </div>
    </div>
  );
}

/**
 * Drums selection step.
 */
function DrumsStep({
  selectedKit,
  selectedSynthType,
  onSelect,
  initializeAudio,
  playingPreview,
  setPlayingPreview,
  stopAllPreviews,
}: {
  selectedKit: DrumKitType | SampledDrumKitType;
  selectedSynthType: DrumSynthType;
  onSelect: (synthType: DrumSynthType, kit: DrumKitType | SampledDrumKitType) => void;
  initializeAudio: () => Promise<boolean>;
  playingPreview: string | null;
  setPlayingPreview: (id: string | null) => void;
  stopAllPreviews: () => void;
}) {
  const playPreview = async (option: typeof ALL_DRUM_OPTIONS[0]) => {
    const ready = await initializeAudio();
    if (!ready) return;

    const previewId = `drum-${option.synthType}-${option.kit}`;
    if (playingPreview === previewId) {
      stopAllPreviews();
      return;
    }

    stopAllPreviews();
    setPlayingPreview(previewId);

    if (option.synthType === 'sampled') {
      await drumKitPlayer.setSampledKit(option.kit as SampledDrumKitType);
    } else {
      drumKitPlayer.setKit(option.kit as DrumKitType);
    }
    drumKitPlayer.start();

    setTimeout(() => {
      drumKitPlayer.stop();
      setPlayingPreview(null);
    }, 2000);
  };

  return (
    <div className="grid grid-cols-2 gap-3 py-4">
      {ALL_DRUM_OPTIONS.map((option) => {
        const previewId = `drum-${option.synthType}-${option.kit}`;
        const isSelected = option.synthType === selectedSynthType && option.kit === selectedKit;
        const isPlaying = playingPreview === previewId;

        return (
          <InstrumentOptionCard
            key={previewId}
            name={option.displayName}
            description={option.description}
            color={option.color}
            isPremium={false}
            isSelected={isSelected}
            isPlaying={isPlaying}
            onClick={() => {
              onSelect(option.synthType, option.kit as DrumKitType);
              playPreview(option);
            }}
            tag={option.tag}
            tagColor={option.tagColor}
          />
        );
      })}
    </div>
  );
}

/**
 * Bass selection step.
 */
function BassStep({
  selectedStyle,
  selectedSynthType,
  selectedRealisticStyle,
  onSelect,
  initializeAudio,
  playingPreview,
  setPlayingPreview,
  stopAllPreviews,
}: {
  selectedStyle: BassStyle;
  selectedSynthType: BassSynthType;
  selectedRealisticStyle: RealisticBassStyle;
  onSelect: (synthType: BassSynthType, style: BassStyle, realisticStyle: RealisticBassStyle) => void;
  initializeAudio: () => Promise<boolean>;
  playingPreview: string | null;
  setPlayingPreview: (id: string | null) => void;
  stopAllPreviews: () => void;
}) {
  const playPreview = async (option: typeof ALL_BASS_OPTIONS[0]) => {
    const ready = await initializeAudio();
    if (!ready) return;

    const previewId = `bass-${option.synthType}-${option.style}`;
    if (playingPreview === previewId) {
      stopAllPreviews();
      return;
    }

    stopAllPreviews();
    setPlayingPreview(previewId);

    if (option.synthType === 'sampled') {
      bassDemoPlayer.setRealisticStyle(option.style as RealisticBassStyle);
    } else {
      bassDemoPlayer.setStyle(option.style as BassStyle);
    }
    bassDemoPlayer.start();

    setTimeout(() => {
      bassDemoPlayer.stop();
      setPlayingPreview(null);
    }, 2000);
  };

  return (
    <div className="grid grid-cols-2 gap-3 py-4">
      {ALL_BASS_OPTIONS.map((option) => {
        const previewId = `bass-${option.synthType}-${option.style}`;
        const isSelected = option.synthType === selectedSynthType &&
          (option.synthType === 'electronic' ? option.style === selectedStyle : option.style === selectedRealisticStyle);
        const isPlaying = playingPreview === previewId;

        return (
          <InstrumentOptionCard
            key={previewId}
            name={option.displayName}
            description={option.description}
            color={option.color}
            isPremium={false}
            isSelected={isSelected}
            isPlaying={isPlaying}
            onClick={() => {
              onSelect(option.synthType, option.style as BassStyle, option.style as RealisticBassStyle);
              playPreview(option);
            }}
            tag={option.tag}
            tagColor={option.tagColor}
          />
        );
      })}
    </div>
  );
}

/**
 * Guitar selection step.
 */
function GuitarStep({
  selectedStyle,
  selectedSynthType,
  selectedRealisticStyle,
  selectedElectricStyle,
  onSelect,
  initializeAudio,
  playingPreview,
  setPlayingPreview,
  stopAllPreviews,
}: {
  selectedStyle: GuitarStyle;
  selectedSynthType: GuitarSynthType;
  selectedRealisticStyle: RealisticGuitarStyle;
  selectedElectricStyle: ElectricGuitarStyle;
  onSelect: (synthType: GuitarSynthType, style: GuitarStyle, realisticStyle: RealisticGuitarStyle, electricStyle: ElectricGuitarStyle) => void;
  initializeAudio: () => Promise<boolean>;
  playingPreview: string | null;
  setPlayingPreview: (id: string | null) => void;
  stopAllPreviews: () => void;
}) {
  const playPreview = async (option: typeof ALL_GUITAR_OPTIONS[0]) => {
    const ready = await initializeAudio();
    if (!ready) return;

    const previewId = `guitar-${option.synthType}-${option.style}`;
    if (playingPreview === previewId) {
      stopAllPreviews();
      return;
    }

    stopAllPreviews();
    setPlayingPreview(previewId);

    if (option.synthType === 'sampled') {
      guitarDemoPlayer.setRealisticStyle(option.style as RealisticGuitarStyle);
    } else if (option.synthType === 'electric') {
      guitarDemoPlayer.setElectricStyle(option.style as ElectricGuitarStyle);
    } else {
      guitarDemoPlayer.setStyle(option.style as GuitarStyle);
    }
    guitarDemoPlayer.start();

    setTimeout(() => {
      guitarDemoPlayer.stop();
      setPlayingPreview(null);
    }, 2000);
  };

  return (
    <div className="grid grid-cols-2 gap-3 py-4">
      {ALL_GUITAR_OPTIONS.map((option) => {
        const previewId = `guitar-${option.synthType}-${option.style}`;
        const isSelected = option.synthType === selectedSynthType &&
          (option.synthType === 'electronic' ? option.style === selectedStyle :
           option.synthType === 'sampled' ? option.style === selectedRealisticStyle :
           option.style === selectedElectricStyle);
        const isPlaying = playingPreview === previewId;

        return (
          <InstrumentOptionCard
            key={previewId}
            name={option.displayName}
            description={option.description}
            color={option.color}
            isPremium={false}
            isSelected={isSelected}
            isPlaying={isPlaying}
            onClick={() => {
              onSelect(
                option.synthType,
                option.style as GuitarStyle,
                option.style as RealisticGuitarStyle,
                option.style as ElectricGuitarStyle
              );
              playPreview(option);
            }}
            tag={option.tag}
            tagColor={option.tagColor}
          />
        );
      })}
    </div>
  );
}

/**
 * Piano selection step.
 */
function PianoStep({
  selectedStyle,
  selectedSynthType,
  selectedRealisticStyle,
  onSelect,
  initializeAudio,
  playingPreview,
  setPlayingPreview,
  stopAllPreviews,
}: {
  selectedStyle: PianoStyle;
  selectedSynthType: PianoSynthType;
  selectedRealisticStyle: RealisticPianoStyle;
  onSelect: (synthType: PianoSynthType, style: PianoStyle, realisticStyle: RealisticPianoStyle) => void;
  initializeAudio: () => Promise<boolean>;
  playingPreview: string | null;
  setPlayingPreview: (id: string | null) => void;
  stopAllPreviews: () => void;
}) {
  const playPreview = async (option: typeof ALL_PIANO_OPTIONS[0]) => {
    const ready = await initializeAudio();
    if (!ready) return;

    const previewId = `piano-${option.synthType}-${option.style}`;
    if (playingPreview === previewId) {
      stopAllPreviews();
      return;
    }

    stopAllPreviews();
    setPlayingPreview(previewId);

    if (option.synthType === 'sampled') {
      pianoDemoPlayer.setRealisticStyle(option.style as RealisticPianoStyle);
    } else {
      pianoDemoPlayer.setStyle(option.style as PianoStyle);
    }
    pianoDemoPlayer.start();

    setTimeout(() => {
      pianoDemoPlayer.stop();
      setPlayingPreview(null);
    }, 2000);
  };

  return (
    <div className="grid grid-cols-2 gap-3 py-4">
      {ALL_PIANO_OPTIONS.map((option) => {
        const previewId = `piano-${option.synthType}-${option.style}`;
        const isSelected = option.synthType === selectedSynthType &&
          (option.synthType === 'electronic' ? option.style === selectedStyle : option.style === selectedRealisticStyle);
        const isPlaying = playingPreview === previewId;

        return (
          <InstrumentOptionCard
            key={previewId}
            name={option.displayName}
            description={option.description}
            color={option.color}
            isPremium={false}
            isSelected={isSelected}
            isPlaying={isPlaying}
            onClick={() => {
              onSelect(option.synthType, option.style as PianoStyle, option.style as RealisticPianoStyle);
              playPreview(option);
            }}
            tag={option.tag}
            tagColor={option.tagColor}
          />
        );
      })}
    </div>
  );
}

/**
 * Voice effects step.
 */
function VoiceStep({
  effects,
  onChange,
}: {
  effects: Record<string, boolean>;
  onChange: (effects: Record<string, boolean>) => void;
}) {
  const VOICE_EFFECTS = [
    { key: 'reverb', name: 'Reverb', description: 'Spacious echo', color: '#8b5cf6' },
    { key: 'delay', name: 'Delay', description: 'Rhythmic repeat', color: '#06b6d4' },
    { key: 'chorus', name: 'Chorus', description: 'Thick shimmer', color: '#22c55e' },
    { key: 'distortion', name: 'Distortion', description: 'Gritty edge', color: '#ef4444' },
  ];

  const toggleEffect = (key: string) => {
    onChange({ ...effects, [key]: !effects[key] });
  };

  return (
    <div className="py-4">
      <p className="text-[#888888] text-sm font-mono mb-4 text-center">
        Select effects to apply to your voice while recording
      </p>
      <div className="grid grid-cols-2 gap-3">
        {VOICE_EFFECTS.map((effect) => (
          <button
            key={effect.key}
            onClick={() => toggleEffect(effect.key)}
            className={clsx(
              'p-4 rounded-xl border transition-all text-left',
              effects[effect.key]
                ? 'border-[#00ffff]/50 bg-[#00ffff]/10'
                : 'border-[#222222] bg-[#0a0a0a] hover:border-[#333333]'
            )}
          >
            <div className="flex items-center justify-between mb-2">
              <span className="font-mono font-bold text-white">{effect.name}</span>
              <div
                className={clsx(
                  'w-5 h-5 rounded-full border-2 flex items-center justify-center transition-all',
                  effects[effect.key]
                    ? 'border-[#00ffff] bg-[#00ffff]'
                    : 'border-[#444444]'
                )}
              >
                {effects[effect.key] && (
                  <svg className="w-3 h-3 text-black" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                    <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={3} d="M5 13l4 4L19 7" />
                  </svg>
                )}
              </div>
            </div>
            <p className="text-[#666666] text-xs font-mono">{effect.description}</p>
          </button>
        ))}
      </div>
    </div>
  );
}
