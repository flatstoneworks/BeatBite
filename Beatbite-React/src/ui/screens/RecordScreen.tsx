import { useGuidedFlow } from '../../hooks/useGuidedFlow';
import { RecordIcon } from '../components/Icons';

/**
 * RecordScreen - Main landing page with "Tap to Start" button.
 * Matches Library screen header structure.
 */
export function RecordScreen() {
  const { start: startGuidedFlow } = useGuidedFlow();

  return (
    <div className="h-full w-full bg-[#050505] flex flex-col relative">
      <div className="bg-shader-gradient" />

      {/* Header - same structure as LibraryScreen */}
      <div className="px-6 pt-8 pb-0 relative z-10">
        <div className="flex items-center gap-3 mb-4">
          <RecordIcon size={24} color="#00ffff" />
          <h1 className="text-xl font-bold text-white font-mono uppercase tracking-wider">
            Record
          </h1>
        </div>
      </div>

      {/* Main content - centered big button */}
      <div className="flex-1 flex flex-col items-center justify-center relative z-10 px-6">
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

        <p className="mt-8 text-[#888888] text-sm font-mono uppercase tracking-widest">
          Tap to Start
        </p>
      </div>
    </div>
  );
}
