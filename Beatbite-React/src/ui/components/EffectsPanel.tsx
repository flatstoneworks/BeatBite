import { useCallback } from 'react';
import { clsx } from 'clsx';
import type { VoiceEffectsState, EffectType } from '../../core/VoiceEffects';

/**
 * EffectsPanel shows toggles for voice effects.
 * Compact horizontal layout for quick access.
 */

interface EffectsPanelProps {
  effects: VoiceEffectsState;
  onToggle: (effect: EffectType) => void;
  onParamChange?: (effect: EffectType, param: string, value: number) => void;
}

const EFFECT_CONFIG: Record<EffectType, { label: string; icon: string; color: string }> = {
  reverb: { label: 'Reverb', icon: '🏛️', color: '#8b5cf6' },
  delay: { label: 'Delay', icon: '📢', color: '#3b82f6' },
  chorus: { label: 'Chorus', icon: '🎭', color: '#06b6d4' },
  distortion: { label: 'Distort', icon: '⚡', color: '#ef4444' },
};

export function EffectsPanel({ effects, onToggle }: EffectsPanelProps) {
  const effectTypes: EffectType[] = ['reverb', 'delay', 'chorus', 'distortion'];

  return (
    <div className="flex gap-2">
      {effectTypes.map((effect) => {
        const config = EFFECT_CONFIG[effect];
        const isEnabled = effects[effect].enabled;

        return (
          <button
            key={effect}
            onClick={(e) => {
              e.stopPropagation();
              onToggle(effect);
            }}
            className={clsx(
              "px-3 py-2 rounded-lg text-xs font-medium transition-all pointer-events-auto",
              "flex items-center gap-1"
            )}
            style={{
              backgroundColor: isEnabled ? `${config.color}30` : 'rgba(255, 255, 255, 0.05)',
              borderColor: isEnabled ? config.color : 'transparent',
              borderWidth: 1,
              color: isEnabled ? config.color : 'rgba(255, 255, 255, 0.4)',
              boxShadow: isEnabled ? `0 0 10px ${config.color}30` : 'none',
            }}
          >
            <span>{config.icon}</span>
            <span className="uppercase tracking-wider">{config.label}</span>
          </button>
        );
      })}
    </div>
  );
}

/**
 * Compact effects indicator showing active effects count.
 */
interface CompactEffectsIndicatorProps {
  effects: VoiceEffectsState;
  onClick: () => void;
}

export function CompactEffectsIndicator({ effects, onClick }: CompactEffectsIndicatorProps) {
  const activeCount = [
    effects.reverb.enabled,
    effects.delay.enabled,
    effects.chorus.enabled,
    effects.distortion.enabled,
  ].filter(Boolean).length;

  const handleClick = useCallback((e: React.MouseEvent) => {
    e.stopPropagation();
    onClick();
  }, [onClick]);

  return (
    <button
      onClick={handleClick}
      className={clsx(
        "px-3 py-2 rounded-full text-sm font-medium transition-all pointer-events-auto",
        activeCount > 0
          ? "bg-purple-600/30 text-purple-300 border border-purple-500/50"
          : "bg-white/10 text-white/50 hover:bg-white/20"
      )}
    >
      🎛️ FX {activeCount > 0 && `(${activeCount})`}
    </button>
  );
}

/**
 * Expanded effects panel with sliders for parameters.
 */
interface ExpandedEffectsPanelProps {
  effects: VoiceEffectsState;
  onToggle: (effect: EffectType) => void;
  onParamChange: (effect: EffectType, param: string, value: number) => void;
  onClose: () => void;
}

export function ExpandedEffectsPanel({
  effects,
  onToggle,
  onParamChange,
  onClose,
}: ExpandedEffectsPanelProps) {
  return (
    <div
      className="absolute inset-x-4 bottom-28 bg-black/90 backdrop-blur-lg rounded-2xl p-4 border border-white/10 pointer-events-auto"
      onClick={(e) => e.stopPropagation()}
    >
      <div className="flex justify-between items-center mb-4">
        <h3 className="text-white/70 text-sm font-medium uppercase tracking-wider">Voice Effects</h3>
        <button
          onClick={onClose}
          className="text-white/50 hover:text-white/80 transition-colors"
        >
          <svg className="w-5 h-5" fill="none" viewBox="0 0 24 24" stroke="currentColor">
            <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M6 18L18 6M6 6l12 12" />
          </svg>
        </button>
      </div>

      <div className="space-y-4">
        {/* Reverb */}
        <EffectRow
          effect="reverb"
          config={EFFECT_CONFIG.reverb}
          enabled={effects.reverb.enabled}
          onToggle={() => onToggle('reverb')}
        >
          <EffectSlider
            label="Mix"
            value={effects.reverb.mix}
            onChange={(v) => onParamChange('reverb', 'mix', v)}
            disabled={!effects.reverb.enabled}
          />
          <EffectSlider
            label="Decay"
            value={effects.reverb.decay / 4}
            onChange={(v) => onParamChange('reverb', 'decay', v * 4)}
            disabled={!effects.reverb.enabled}
          />
        </EffectRow>

        {/* Delay */}
        <EffectRow
          effect="delay"
          config={EFFECT_CONFIG.delay}
          enabled={effects.delay.enabled}
          onToggle={() => onToggle('delay')}
        >
          <EffectSlider
            label="Mix"
            value={effects.delay.mix}
            onChange={(v) => onParamChange('delay', 'mix', v)}
            disabled={!effects.delay.enabled}
          />
          <EffectSlider
            label="Time"
            value={effects.delay.time / 1}
            onChange={(v) => onParamChange('delay', 'time', v * 1)}
            disabled={!effects.delay.enabled}
          />
          <EffectSlider
            label="Feedback"
            value={effects.delay.feedback}
            onChange={(v) => onParamChange('delay', 'feedback', v)}
            disabled={!effects.delay.enabled}
          />
        </EffectRow>

        {/* Chorus */}
        <EffectRow
          effect="chorus"
          config={EFFECT_CONFIG.chorus}
          enabled={effects.chorus.enabled}
          onToggle={() => onToggle('chorus')}
        >
          <EffectSlider
            label="Mix"
            value={effects.chorus.mix}
            onChange={(v) => onParamChange('chorus', 'mix', v)}
            disabled={!effects.chorus.enabled}
          />
          <EffectSlider
            label="Rate"
            value={effects.chorus.rate / 5}
            onChange={(v) => onParamChange('chorus', 'rate', v * 5)}
            disabled={!effects.chorus.enabled}
          />
        </EffectRow>

        {/* Distortion */}
        <EffectRow
          effect="distortion"
          config={EFFECT_CONFIG.distortion}
          enabled={effects.distortion.enabled}
          onToggle={() => onToggle('distortion')}
        >
          <EffectSlider
            label="Mix"
            value={effects.distortion.mix}
            onChange={(v) => onParamChange('distortion', 'mix', v)}
            disabled={!effects.distortion.enabled}
          />
          <EffectSlider
            label="Amount"
            value={effects.distortion.amount / 50}
            onChange={(v) => onParamChange('distortion', 'amount', v * 50)}
            disabled={!effects.distortion.enabled}
          />
        </EffectRow>
      </div>
    </div>
  );
}

interface EffectRowProps {
  effect: EffectType;
  config: { label: string; icon: string; color: string };
  enabled: boolean;
  onToggle: () => void;
  children: React.ReactNode;
}

function EffectRow({ config, enabled, onToggle, children }: EffectRowProps) {
  return (
    <div className="flex items-start gap-3">
      <button
        onClick={onToggle}
        className={clsx(
          "w-20 py-2 rounded-lg text-xs font-medium transition-all flex items-center justify-center gap-1"
        )}
        style={{
          backgroundColor: enabled ? `${config.color}30` : 'rgba(255, 255, 255, 0.05)',
          color: enabled ? config.color : 'rgba(255, 255, 255, 0.4)',
        }}
      >
        <span>{config.icon}</span>
        <span>{config.label}</span>
      </button>
      <div className="flex-1 flex gap-2">
        {children}
      </div>
    </div>
  );
}

interface EffectSliderProps {
  label: string;
  value: number;
  onChange: (value: number) => void;
  disabled?: boolean;
}

function EffectSlider({ label, value, onChange, disabled }: EffectSliderProps) {
  return (
    <div className={clsx("flex-1", disabled && "opacity-40")}>
      <div className="text-[10px] text-white/40 uppercase mb-1">{label}</div>
      <input
        type="range"
        min="0"
        max="1"
        step="0.01"
        value={value}
        onChange={(e) => onChange(parseFloat(e.target.value))}
        disabled={disabled}
        className="w-full h-1 bg-white/10 rounded-full appearance-none cursor-pointer
          [&::-webkit-slider-thumb]:appearance-none
          [&::-webkit-slider-thumb]:w-3
          [&::-webkit-slider-thumb]:h-3
          [&::-webkit-slider-thumb]:rounded-full
          [&::-webkit-slider-thumb]:bg-purple-500
          disabled:[&::-webkit-slider-thumb]:bg-white/20"
      />
    </div>
  );
}
