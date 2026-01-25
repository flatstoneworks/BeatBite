import { useEffect } from 'react';
import { Routes, Route, Navigate, useLocation } from 'react-router-dom';
import { useAppStore, usePlayback } from './core/store';
import { FooterNav } from './ui/components/FooterNav';
import { MiniPlayer } from './ui/components/MiniPlayer';
import { FullScreenPlayer } from './ui/components/FullScreenPlayer';
import { RecordScreen } from './ui/screens/RecordScreen';
import { LibraryScreen } from './ui/screens/LibraryScreen';
import { SettingsScreen } from './ui/screens/SettingsScreen';
import { BandSelectionScreen } from './ui/screens/BandSelectionScreen';
import { BandNameScreen } from './ui/screens/BandNameScreen';
import { TempoSelectorScreen } from './ui/screens/TempoSelectorScreen';
import { InstrumentSetupScreen } from './ui/screens/InstrumentSetupScreen';
import { RecordingScreen } from './ui/screens/RecordingScreen';
import { BandEditScreen } from './ui/screens/BandEditScreen';
import { BandCreateScreen } from './ui/screens/BandCreateScreen';

/**
 * Beatbite - Voice-to-music creation app
 *
 * Main app component with URL-based routing.
 * URL is the single source of truth for navigation state.
 *
 * Routes:
 * - /record - Main recording screen
 * - /library - Library (defaults to songs)
 * - /library/:tab - Library with specific tab (songs, bands, instruments)
 * - /settings - Settings screen
 * - /record/flow/:step - Guided recording flow
 */
function App() {
  const playback = usePlayback();
  const initializeLibrary = useAppStore((state) => state.initializeLibrary);
  const location = useLocation();

  // Derive guided flow state from URL
  const isGuidedFlowActive = location.pathname.startsWith('/record/flow');

  // Hide footer nav during band creation flow
  const isBandCreationActive = location.pathname.startsWith('/band/new');

  // Initialize library (songs) from IndexedDB on app startup
  useEffect(() => {
    initializeLibrary();
  }, [initializeLibrary]);

  useEffect(() => {
    // Prevent default touch behaviors on mobile
    const preventDefaults = (e: TouchEvent) => {
      // Allow touch on interactive elements
      const target = e.target as HTMLElement;
      if (target.closest('button, input, select, textarea')) return;

      // Prevent pull-to-refresh and other gestures
      if (e.touches.length > 1) {
        e.preventDefault();
      }
    };

    document.addEventListener('touchmove', preventDefaults, { passive: false });

    // Lock screen orientation on mobile (if supported)
    const orientation = screen.orientation as ScreenOrientation & { lock?: (orientation: string) => Promise<void> };
    if (orientation?.lock) {
      orientation.lock('portrait').catch(() => {
        // Orientation lock not supported or failed
      });
    }

    return () => {
      document.removeEventListener('touchmove', preventDefaults);
    };
  }, []);

  return (
    <div className="h-full w-full bg-black flex flex-col">
      <main className="flex-1 overflow-auto">
        <Routes>
          {/* Main tabs */}
          <Route path="/" element={<Navigate to="/record" replace />} />
          <Route path="/record" element={<RecordScreen />} />
          <Route path="/library" element={<Navigate to="/library/songs" replace />} />
          <Route path="/library/:tab" element={<LibraryScreen />} />
          <Route path="/band/new" element={<BandCreateScreen />} />
          <Route path="/band/new/:step" element={<BandCreateScreen />} />
          <Route path="/band/:id/edit" element={<BandEditScreen />} />
          <Route path="/settings" element={<SettingsScreen />} />

          {/* Guided recording flow - using route params */}
          <Route path="/record/flow/band-select" element={<BandSelectionScreen />} />
          <Route path="/record/flow/band-name" element={<BandNameScreen />} />
          <Route path="/record/flow/tempo" element={<TempoSelectorScreen />} />
          <Route path="/record/flow/setup-:instrument" element={<InstrumentSetupScreen />} />
          <Route path="/record/flow/record-drums" element={<RecordingScreen />} />
          <Route path="/record/flow/record-bass" element={<RecordingScreen />} />
          <Route path="/record/flow/record-guitar" element={<RecordingScreen />} />
          <Route path="/record/flow/record-piano" element={<RecordingScreen />} />
          <Route path="/record/flow/record-voice" element={<RecordingScreen />} />

          {/* Catch-all redirect */}
          <Route path="*" element={<Navigate to="/record" replace />} />
        </Routes>
      </main>

      {/* Mini player - shows when a song is playing */}
      {playback.currentSong && !playback.isFullScreenOpen && <MiniPlayer />}

      {/* Full screen player - shows when expanded */}
      <FullScreenPlayer />

      {/* Footer nav - hidden during guided flow and band creation */}
      {!isGuidedFlowActive && !isBandCreationActive && <FooterNav />}
    </div>
  );
}

export default App;
