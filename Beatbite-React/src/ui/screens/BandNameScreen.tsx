import { useState, useCallback } from 'react';
import { useAppStore } from '../../core/store';
import { useGuidedFlow } from '../../hooks/useGuidedFlow';

/**
 * BandNameScreen - Enter a name for the new band.
 *
 * This screen appears after clicking "Create New Band" in BandSelectionScreen.
 * After entering a name, the user proceeds to the instrument setup flow.
 */
export function BandNameScreen() {
  const pendingBandName = useAppStore((state) => state.pendingBandName);
  const setPendingBandName = useAppStore((state) => state.setPendingBandName);
  const { goToStep, advance } = useGuidedFlow();

  const [localName, setLocalName] = useState(pendingBandName || '');
  const [isFocused, setIsFocused] = useState(false);

  // Go back to band selection
  const handleBack = useCallback(() => {
    goToStep('band-select');
  }, [goToStep]);

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
    <div className="h-full w-full bg-black flex flex-col select-none relative">
      {/* Back button */}
      <button
        className="absolute top-4 left-4 p-2 text-white/50 hover:text-white transition-colors z-10"
        onClick={handleBack}
      >
        <svg className="w-6 h-6" fill="none" viewBox="0 0 24 24" stroke="currentColor">
          <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M15 19l-7-7 7-7" />
        </svg>
      </button>

      {/* Content */}
      <div className="flex-1 flex flex-col items-center justify-center px-6">
        {/* Header */}
        <div className="text-center mb-8">
          <h1 className="text-2xl font-bold text-white mb-2">Name Your Band</h1>
          <p className="text-white/50 text-sm">
            Give your band a memorable name
          </p>
        </div>

        {/* Input */}
        <div className="w-full max-w-sm mb-6">
          <div
            className={`
              relative rounded-xl overflow-hidden transition-all duration-200
              ${isFocused ? 'ring-2 ring-cyan-500' : ''}
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
                bg-white/10 border border-white/20
                text-white text-lg text-center
                placeholder:text-white/30
                focus:outline-none focus:border-cyan-500/50
                rounded-xl
              "
              maxLength={30}
              autoFocus
            />
          </div>
          <div className="flex justify-between mt-2 px-1">
            <span className="text-white/30 text-xs">
              {localName.length}/30 characters
            </span>
            {localName.length === 0 && (
              <span className="text-white/30 text-xs">
                Press enter to use default
              </span>
            )}
          </div>
        </div>

        {/* Suggestions */}
        <div className="w-full max-w-sm mb-8">
          <p className="text-white/40 text-xs uppercase tracking-wider mb-3 text-center">
            Or try one of these
          </p>
          <div className="flex flex-wrap gap-2 justify-center">
            {suggestions.map((suggestion) => (
              <button
                key={suggestion}
                onClick={() => handleSuggestionClick(suggestion)}
                className={`
                  px-3 py-1.5 rounded-full text-sm
                  transition-all duration-200
                  ${localName === suggestion
                    ? 'bg-cyan-500/30 text-cyan-400 border border-cyan-500/50'
                    : 'bg-white/5 text-white/50 border border-white/10 hover:bg-white/10 hover:text-white/70'
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
          className="
            px-12 py-4
            bg-gradient-to-r from-cyan-500 to-purple-500
            hover:from-cyan-400 hover:to-purple-400
            rounded-full
            text-white font-semibold text-lg
            transition-all duration-200
            shadow-lg shadow-cyan-500/20
          "
        >
          Continue to Setup
        </button>

        {/* Helper text */}
        <p className="text-white/30 text-xs mt-6 text-center">
          You'll configure drums, bass, guitar, piano
          <br />
          and voice effects in the next steps
        </p>
      </div>
    </div>
  );
}
