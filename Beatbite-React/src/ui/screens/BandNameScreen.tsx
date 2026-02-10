import { useState, useCallback } from 'react';
import { useAppStore } from '../../core/store';
import { useGuidedFlow } from '../../hooks/useGuidedFlow';
import { FlowHeader } from '../components/FlowHeader';

/**
 * BandNameScreen - Enter a name for the new band.
 *
 * This screen appears after clicking "Create New Band" in BandSelectionScreen.
 * After entering a name, the user proceeds to the instrument setup flow.
 */
export function BandNameScreen() {
  const pendingBandName = useAppStore((state) => state.pendingBandName);
  const setPendingBandName = useAppStore((state) => state.setPendingBandName);
  const { advance } = useGuidedFlow();

  const [localName, setLocalName] = useState(pendingBandName || '');
  const [isFocused, setIsFocused] = useState(false);

  // Continue to setup
  const handleContinue = useCallback(() => {
    const name = localName.trim() || `My Band`;
    setPendingBandName(name);
    advance(); // Goes to setup-drums
  }, [localName, setPendingBandName, advance]);

  // Handle input change
  const handleChange = (e: React.ChangeEvent<HTMLInputElement>) => {
    setLocalName(e.target.value);
  };

  // Handle keyboard
  const handleKeyDown = (e: React.KeyboardEvent) => {
    if (e.key === 'Enter') {
      handleContinue();
    }
  };

  // Suggested names
  const suggestions = [
    'The Rockers',
    'Jazz Collective',
    'Electronic Vibes',
    'Soul Session',
    'Acoustic Dreams',
    'Funk Masters',
  ];

  const handleSuggestionClick = (suggestion: string) => {
    setLocalName(suggestion);
  };

  return (
    <div className="h-full w-full bg-[#050505] flex flex-col relative">
      <div className="bg-shader-gradient" />

      <FlowHeader />

      {/* Content */}
      <div className="flex-1 flex flex-col items-center justify-center px-6 relative z-10">
        {/* Input */}
        <div className="w-full max-w-sm mb-6">
          <div
            className={`
              relative rounded-xl overflow-hidden transition-all duration-200
              ${isFocused ? 'ring-2 ring-[#00ffff]' : ''}
            `}
          >
            <input
              type="text"
              value={localName}
              onChange={handleChange}
              onKeyDown={handleKeyDown}
              onFocus={() => setIsFocused(true)}
              onBlur={() => setIsFocused(false)}
              placeholder="Enter band name..."
              className="
                w-full px-4 py-4
                bg-[#0a0a0a] border border-[#222222]
                text-white text-lg text-center font-mono
                placeholder:text-[#444444]
                focus:outline-none focus:border-[#00ffff]/50
                rounded-xl
              "
              maxLength={30}
              autoFocus
            />
          </div>
          <div className="flex justify-between mt-2 px-1">
            <span className="text-[#444444] text-xs font-mono">
              {localName.length}/30 characters
            </span>
            {localName.length === 0 && (
              <span className="text-[#444444] text-xs font-mono">
                Press enter to use default
              </span>
            )}
          </div>
        </div>

        {/* Suggestions */}
        <div className="w-full max-w-sm mb-8">
          <p className="text-[#666666] text-xs font-mono uppercase tracking-wider mb-3 text-center">
            Or try one of these
          </p>
          <div className="flex flex-wrap gap-2 justify-center">
            {suggestions.map((suggestion) => (
              <button
                key={suggestion}
                onClick={() => handleSuggestionClick(suggestion)}
                className={`
                  px-3 py-1.5 rounded-full text-sm font-mono
                  transition-all duration-200
                  ${localName === suggestion
                    ? 'bg-[#00ffff]/20 text-[#00ffff] border border-[#00ffff]/50'
                    : 'bg-[#0a0a0a] text-[#666666] border border-[#222222] hover:bg-[#00ffff]/5 hover:text-[#888888]'
                  }
                `}
              >
                {suggestion}
              </button>
            ))}
          </div>
        </div>

        {/* Continue button */}
        <button
          onClick={handleContinue}
          className="btn-shader-primary px-12 py-4 rounded-full font-mono uppercase tracking-wider text-sm"
        >
          Continue to Setup
        </button>

        {/* Helper text */}
        <p className="text-[#444444] text-xs font-mono mt-6 text-center">
          You'll configure drums, bass, guitar, piano
          <br />
          and voice effects in the next steps
        </p>
      </div>
    </div>
  );
}
