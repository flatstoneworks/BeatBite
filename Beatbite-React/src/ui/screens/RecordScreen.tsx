import { useGuidedFlow } from '../../hooks/useGuidedFlow';
import { DrumIcon, BassIcon, GuitarIcon, VoiceIcon, RecordIcon } from '../components/Icons';

/**
 * RecordScreen - Main landing page with "Start your new Song" button.
 * Shader Lab design style with tech icons.
 */
export function RecordScreen() {
  const { start: startGuidedFlow } = useGuidedFlow();

  return (
    <div className="flex flex-col min-h-full px-6 pb-20 relative">
      {/* Animated background gradient */}
      <div className="bg-shader-gradient" />

      {/* Header */}
      <div className="pt-8 pb-4 relative z-10">
        <span className="badge-shader text-[#00ffff]">BEATBITE</span>
      </div>

      {/* Main content - centered */}
      <div className="flex-1 flex flex-col items-center justify-center relative z-10">
        {/* Tagline */}
        <h1 className="text-gradient text-4xl font-bold mb-4 text-center">
          Create Music
        </h1>
        <p className="text-[#888888] text-base mb-12 text-center max-w-xs">
          Transform your voice into drums, bass, guitar, and melodies
        </p>

        {/* Big circular button with record icon */}
        <button
          onClick={startGuidedFlow}
          className="
            relative
            w-36 h-36
            rounded-full
            flex items-center justify-center
            transition-all duration-300
            active:scale-95
            group
          "
          style={{
            background: 'linear-gradient(135deg, rgba(0, 255, 255, 0.2) 0%, rgba(255, 0, 255, 0.2) 100%)',
            border: '2px solid rgba(0, 255, 255, 0.5)',
            boxShadow: '0 0 40px rgba(0, 255, 255, 0.2), inset 0 0 30px rgba(0, 255, 255, 0.1)',
          }}
        >
          {/* Pulsing ring */}
          <div
            className="absolute inset-0 rounded-full animate-pulse-glow"
            style={{
              border: '1px solid rgba(0, 255, 255, 0.3)',
            }}
          />

          {/* Inner circle with record icon */}
          <div
            className="w-20 h-20 rounded-full flex items-center justify-center transition-all duration-300 group-hover:scale-110"
            style={{
              background: 'linear-gradient(135deg, #00ffff 0%, #ff00ff 100%)',
              boxShadow: '0 0 30px rgba(0, 255, 255, 0.5)',
            }}
          >
            <RecordIcon size={48} color="#000000" glowColor="#000000" />
          </div>
        </button>

        {/* Start label */}
        <p className="mt-8 text-[#888888] text-sm font-mono uppercase tracking-widest">
          Tap to Start
        </p>
      </div>

      {/* Bottom card with features */}
      <div className="card-shader p-5 mb-4 relative z-10">
        <div className="flex items-center justify-around">
          <FeatureItem icon={<DrumIcon size={28} color="#00ffff" />} label="Drums" color="#00ffff" />
          <FeatureItem icon={<BassIcon size={28} color="#3b82f6" />} label="Bass" color="#3b82f6" />
          <FeatureItem icon={<GuitarIcon size={28} color="#22c55e" />} label="Guitar" color="#22c55e" />
          <FeatureItem icon={<VoiceIcon size={28} color="#a855f7" />} label="Voice" color="#a855f7" />
        </div>
      </div>
    </div>
  );
}

function FeatureItem({ icon, label, color }: { icon: React.ReactNode; label: string; color: string }) {
  return (
    <div className="flex flex-col items-center gap-2">
      <div className="w-12 h-12 rounded-xl bg-[#0a0a0a] border border-[#222222] flex items-center justify-center">
        {icon}
      </div>
      <span
        className="text-xs font-mono uppercase tracking-wider"
        style={{ color }}
      >
        {label}
      </span>
    </div>
  );
}
