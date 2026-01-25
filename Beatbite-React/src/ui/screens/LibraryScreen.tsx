/**
 * LibraryScreen - Library with Songs and Instruments tabs.
 *
 * Features:
 * - Songs tab: List all saved songs from IndexedDB
 * - Instruments tab: Browse all available instruments (drums, bass, guitar, piano, voice effects)
 * - Tech-style Shader Lab design
 * - Premium indicators for future monetization
 */

import { useEffect, useCallback, useState, useRef } from 'react';
import { useParams, Link } from 'react-router-dom';
import { useAppStore, useLibrary, useBands } from '../../core/store';
import { libraryStorage, type SongMetadata } from '../../core/LibraryStorage';
import { LibraryIcon, PlayIcon, TrashIcon, WaveformIcon, DrumIcon, BassIcon, GuitarIcon, PianoIcon, VoiceIcon } from '../components/Icons';
import { InstrumentOptionCard } from '../components/InstrumentOptionCard';
import { audioEngine } from '../../core/AudioEngine';
import { drumKitPlayer, DRUM_KIT_CONFIG, type DrumKitType, type DrumSynthType } from '../../core/DrumKitPlayer';
import { bassDemoPlayer } from '../../core/BassDemoPlayer';
import { guitarDemoPlayer } from '../../core/GuitarDemoPlayer';
import { pianoDemoPlayer } from '../../core/PianoDemoPlayer';
import { BASS_STYLE_CONFIG, REALISTIC_BASS_STYLE_CONFIG, GUITAR_STYLE_CONFIG, REALISTIC_GUITAR_STYLE_CONFIG, ELECTRIC_GUITAR_STYLE_CONFIG, PIANO_STYLE_CONFIG, REALISTIC_PIANO_STYLE_CONFIG, SAMPLED_DRUM_KIT_CONFIG, ALL_BASS_OPTIONS, ALL_GUITAR_OPTIONS, ALL_PIANO_OPTIONS, ALL_DRUM_OPTIONS, type BassStyle, type GuitarStyle, type PianoStyle, type RealisticPianoStyle, type PianoSynthType, type BassSynthType, type RealisticBassStyle, type GuitarSynthType, type RealisticGuitarStyle, type ElectricGuitarStyle, type SampledDrumKitType } from '../../types';
import { clsx } from 'clsx';
import type { Band } from '../../core/BandStorage';

type LibraryTab = 'songs' | 'instruments' | 'bands';

export function LibraryScreen() {
  const { tab } = useParams<{ tab: string }>();
  const { songs, isLoading, selectedSongId } = useLibrary();
  const { setSelectedSongId, removeSongFromLibrary, playSong } = useAppStore();
  const [deletingId, setDeletingId] = useState<string | null>(null);

  // Get active tab from URL, default to 'songs'
  const activeTab: LibraryTab = (tab === 'bands' || tab === 'instruments') ? tab : 'songs';

  // Songs are loaded on app startup in App.tsx via initializeLibrary()

  // Handle song selection
  const handleSelectSong = useCallback((songId: string) => {
    setSelectedSongId(selectedSongId === songId ? null : songId);
  }, [selectedSongId, setSelectedSongId]);

  // Handle delete song
  const handleDeleteSong = useCallback(async (songId: string, e: React.MouseEvent) => {
    e.stopPropagation();
    if (deletingId) return;

    setDeletingId(songId);
    try {
      await libraryStorage.deleteSong(songId);
      removeSongFromLibrary(songId);
      if (selectedSongId === songId) {
        setSelectedSongId(null);
      }
    } catch (error) {
      console.error('[LibraryScreen] Failed to delete song:', error);
    } finally {
      setDeletingId(null);
    }
  }, [deletingId, removeSongFromLibrary, selectedSongId, setSelectedSongId]);

  // Format duration
  const formatDuration = (ms: number) => {
    const totalSeconds = Math.floor(ms / 1000);
    const minutes = Math.floor(totalSeconds / 60);
    const seconds = totalSeconds % 60;
    return `${minutes}:${seconds.toString().padStart(2, '0')}`;
  };

  // Format date
  const formatDate = (timestamp: number) => {
    const date = new Date(timestamp);
    const now = new Date();
    const diffDays = Math.floor((now.getTime() - date.getTime()) / (1000 * 60 * 60 * 24));

    if (diffDays === 0) {
      return 'Today';
    } else if (diffDays === 1) {
      return 'Yesterday';
    } else if (diffDays < 7) {
      return `${diffDays} days ago`;
    } else {
      return date.toLocaleDateString('en-US', { month: 'short', day: 'numeric' });
    }
  };

  return (
    <div className="h-full w-full bg-[#050505] flex flex-col relative">
      <div className="bg-shader-gradient" />

      {/* Header with tabs */}
      <div className="px-6 pt-8 pb-0 relative z-10">
        <div className="flex items-center gap-3 mb-4">
          <LibraryIcon size={24} color="#00ffff" />
          <h1 className="text-xl font-bold text-white font-mono uppercase tracking-wider">
            Library
          </h1>
        </div>

        {/* Tabs */}
        <div className="flex gap-1 border-b border-[#1a1a1a]">
          <Link
            to="/library/songs"
            className={clsx(
              'px-4 py-3 text-sm font-mono uppercase tracking-wider transition-colors relative',
              activeTab === 'songs'
                ? 'text-[#00ffff]'
                : 'text-[#666666] hover:text-white'
            )}
          >
            Songs
            {activeTab === 'songs' && (
              <div className="absolute bottom-0 left-0 right-0 h-0.5 bg-[#00ffff]" />
            )}
          </Link>
          <Link
            to="/library/bands"
            className={clsx(
              'px-4 py-3 text-sm font-mono uppercase tracking-wider transition-colors relative',
              activeTab === 'bands'
                ? 'text-[#00ffff]'
                : 'text-[#666666] hover:text-white'
            )}
          >
            Bands
            {activeTab === 'bands' && (
              <div className="absolute bottom-0 left-0 right-0 h-0.5 bg-[#00ffff]" />
            )}
          </Link>
          <Link
            to="/library/instruments"
            className={clsx(
              'px-4 py-3 text-sm font-mono uppercase tracking-wider transition-colors relative',
              activeTab === 'instruments'
                ? 'text-[#00ffff]'
                : 'text-[#666666] hover:text-white'
            )}
          >
            Instruments
            {activeTab === 'instruments' && (
              <div className="absolute bottom-0 left-0 right-0 h-0.5 bg-[#00ffff]" />
            )}
          </Link>
        </div>
      </div>

      {/* Tab content */}
      <div className="flex-1 overflow-y-auto relative z-10">
        {activeTab === 'songs' && (
          <SongsTabContent
            songs={songs}
            isLoading={isLoading}
            selectedSongId={selectedSongId}
            deletingId={deletingId}
            onSelectSong={handleSelectSong}
            onPlaySong={playSong}
            onDeleteSong={handleDeleteSong}
            formatDuration={formatDuration}
            formatDate={formatDate}
          />
        )}
        {activeTab === 'bands' && <BandsTabContent />}
        {activeTab === 'instruments' && <InstrumentsTabContent />}
      </div>
    </div>
  );
}

/**
 * Songs tab content component.
 */
function SongsTabContent({
  songs,
  isLoading,
  selectedSongId,
  deletingId,
  onSelectSong,
  onPlaySong,
  onDeleteSong,
  formatDuration,
  formatDate,
}: {
  songs: SongMetadata[];
  isLoading: boolean;
  selectedSongId: string | null;
  deletingId: string | null;
  onSelectSong: (songId: string) => void;
  onPlaySong: (song: SongMetadata) => void;
  onDeleteSong: (songId: string, e: React.MouseEvent) => void;
  formatDuration: (ms: number) => string;
  formatDate: (timestamp: number) => string;
}) {
  // Loading state
  if (isLoading) {
    return (
      <div className="flex-1 flex items-center justify-center py-20">
        <div className="flex flex-col items-center">
          <div className="w-12 h-12 border-2 border-[#00ffff] border-t-transparent rounded-full animate-spin" />
          <p className="mt-6 text-[#888888] text-base font-mono">Loading songs...</p>
        </div>
      </div>
    );
  }

  // Empty state
  if (songs.length === 0) {
    return (
      <div className="flex-1 flex flex-col items-center justify-center px-8 py-20 text-center">
        <div className="w-20 h-20 rounded-full bg-[#0a0a0a] border border-[#222222] flex items-center justify-center mb-6">
          <WaveformIcon size={40} color="#333333" />
        </div>
        <h2 className="text-white text-lg font-mono mb-2">No songs yet</h2>
        <p className="text-[#666666] text-sm font-mono max-w-xs">
          Your saved songs will appear here. Start recording to create your first song.
        </p>
      </div>
    );
  }

  return (
    <div className="px-4 py-2">
      <div className="text-right mb-2">
        <span className="text-[#666666] text-xs font-mono">
          {songs.length} {songs.length === 1 ? 'song' : 'songs'}
        </span>
      </div>
      {songs.map((song) => (
        <SongCard
          key={song.id}
          song={song}
          isSelected={selectedSongId === song.id}
          isDeleting={deletingId === song.id}
          onSelect={() => onSelectSong(song.id)}
          onPlay={() => onPlaySong(song)}
          onDelete={(e) => onDeleteSong(song.id, e)}
          formatDuration={formatDuration}
          formatDate={formatDate}
        />
      ))}
    </div>
  );
}

/**
 * Generate a gradient color based on band name for placeholder avatar.
 */
function getBandAvatarGradient(name: string): string {
  const gradients = [
    'from-[#00ffff] to-[#0066ff]',  // Cyan to blue
    'from-[#ff00ff] to-[#6600ff]',  // Magenta to purple
    'from-[#00ff66] to-[#00ccff]',  // Green to cyan
    'from-[#ffcc00] to-[#ff6600]',  // Gold to orange
    'from-[#ff6699] to-[#ff3366]',  // Pink to red
    'from-[#66ffcc] to-[#33cc99]',  // Mint to teal
    'from-[#9966ff] to-[#6633ff]',  // Light purple to purple
    'from-[#ff9966] to-[#ff6633]',  // Peach to orange
  ];
  const hash = name.split('').reduce((acc, char) => acc + char.charCodeAt(0), 0);
  return gradients[hash % gradients.length];
}

/**
 * Bands tab content - list and manage bands.
 */
function BandsTabContent() {
  const bands = useBands();
  const { deleteBand } = useAppStore();
  const [expandedBandId, setExpandedBandId] = useState<string | null>(null);

  // Toggle band details expansion
  const handleToggleExpand = (bandId: string) => {
    setExpandedBandId(expandedBandId === bandId ? null : bandId);
  };

  // Delete a band
  const handleDeleteBand = (bandId: string) => {
    if (confirm('Delete this band? This cannot be undone.')) {
      deleteBand(bandId);
    }
  };

  // Format date
  const formatDate = (timestamp: number) => {
    const date = new Date(timestamp);
    return date.toLocaleDateString('en-US', { month: 'short', day: 'numeric', year: 'numeric' });
  };

  return (
    <div className="px-4 py-4">
      {bands.length > 0 && (
        <div className="text-right mb-3">
          <span className="text-[#666666] text-xs font-mono">
            {bands.length} {bands.length === 1 ? 'band' : 'bands'}
          </span>
        </div>
      )}

      <div className="space-y-3">
        {/* Create New Band card */}
        <CreateNewBandCard />

        {/* Existing bands */}
        {bands.map((band) => (
          <BandDetailCard
            key={band.id}
            band={band}
            isExpanded={expandedBandId === band.id}
            onToggleExpand={() => handleToggleExpand(band.id)}
            onDelete={() => handleDeleteBand(band.id)}
            formatDate={formatDate}
          />
        ))}
      </div>
    </div>
  );
}

/**
 * Create New Band card component.
 */
function CreateNewBandCard() {
  return (
    <Link
      to="/band/new"
      className="block rounded-xl border border-dashed border-[#333333] bg-[#0a0a0a] hover:border-[#00ffff]/50 hover:bg-[#00ffff]/5 transition-all"
    >
      <div className="p-4 flex items-center gap-4">
        {/* Plus icon placeholder */}
        <div className="w-14 h-14 rounded-lg bg-[#111111] border border-[#222222] flex items-center justify-center flex-shrink-0">
          <svg className="w-7 h-7 text-[#00ffff]" fill="none" viewBox="0 0 24 24" stroke="currentColor">
            <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M12 4v16m8-8H4" />
          </svg>
        </div>

        {/* Text */}
        <div className="flex-1 min-w-0">
          <h3 className="text-white font-mono font-bold text-base">Create New Band</h3>
          <p className="text-[#666666] text-xs font-mono mt-1">
            Start with fresh instruments
          </p>
        </div>

        {/* Arrow */}
        <svg className="w-5 h-5 text-[#444444]" fill="none" viewBox="0 0 24 24" stroke="currentColor">
          <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M9 5l7 7-7 7" />
        </svg>
      </div>
    </Link>
  );
}

/**
 * Get display info for drum kit based on synth type.
 */
function getDrumDisplayInfo(band: Band) {
  // Check if band has drumSynthType (new format) or fall back to old format
  if (band.drumSynthType === 'sampled' && band.sampledDrumKit) {
    const config = SAMPLED_DRUM_KIT_CONFIG[band.sampledDrumKit];
    return config || { displayName: band.sampledDrumKit, description: 'Sampled drums' };
  }
  // Default to electronic or legacy format
  const config = DRUM_KIT_CONFIG[band.drumKit];
  return config || { displayName: band.drumKit, description: 'Electronic drums' };
}

/**
 * Get display info for bass based on synth type.
 */
function getBassDisplayInfo(band: Band) {
  if (band.bassSynthType === 'sampled' && band.realisticBassStyle) {
    const config = REALISTIC_BASS_STYLE_CONFIG[band.realisticBassStyle];
    return config || { displayName: band.realisticBassStyle, description: 'Realistic bass' };
  }
  const config = BASS_STYLE_CONFIG[band.bassStyle];
  return config || { displayName: band.bassStyle, description: 'Electronic bass' };
}

/**
 * Get display info for guitar based on synth type.
 */
function getGuitarDisplayInfo(band: Band) {
  if (band.guitarSynthType === 'electric' && band.electricGuitarStyle) {
    const config = ELECTRIC_GUITAR_STYLE_CONFIG[band.electricGuitarStyle];
    return config || { displayName: band.electricGuitarStyle, description: 'Electric guitar' };
  }
  if (band.guitarSynthType === 'sampled' && band.realisticGuitarStyle) {
    const config = REALISTIC_GUITAR_STYLE_CONFIG[band.realisticGuitarStyle];
    return config || { displayName: band.realisticGuitarStyle, description: 'Acoustic guitar' };
  }
  const config = GUITAR_STYLE_CONFIG[band.guitarStyle];
  return config || { displayName: band.guitarStyle, description: 'Electronic guitar' };
}

/**
 * Get display info for piano based on synth type.
 */
function getPianoDisplayInfo(band: Band) {
  if (band.pianoSynthType === 'sampled' && band.realisticPianoStyle) {
    const config = REALISTIC_PIANO_STYLE_CONFIG[band.realisticPianoStyle];
    return config || { displayName: band.realisticPianoStyle, description: 'Sampled piano' };
  }
  const config = PIANO_STYLE_CONFIG[band.pianoStyle];
  return config || { displayName: band.pianoStyle, description: 'Electronic piano' };
}

/**
 * Band detail card with expandable configuration view.
 */
function BandDetailCard({
  band,
  isExpanded,
  onToggleExpand,
  onDelete,
  formatDate,
}: {
  band: Band;
  isExpanded: boolean;
  onToggleExpand: () => void;
  onDelete: () => void;
  formatDate: (timestamp: number) => string;
}) {
  const activeEffectsCount = Object.values(band.voiceEffects || {}).filter(Boolean).length;
  const bandInitial = band.name.charAt(0).toUpperCase();
  const avatarGradient = getBandAvatarGradient(band.name);

  // Get display info for each instrument
  const drumInfo = getDrumDisplayInfo(band);
  const bassInfo = getBassDisplayInfo(band);
  const guitarInfo = getGuitarDisplayInfo(band);
  const pianoInfo = getPianoDisplayInfo(band);

  return (
    <div className={clsx(
      'rounded-xl border transition-all',
      isExpanded
        ? 'border-[#00ffff]/50 bg-[#00ffff]/5'
        : 'border-[#1a1a1a] bg-[#0a0a0a]'
    )}>
      {/* Header */}
      <div
        className="p-4 cursor-pointer"
        onClick={onToggleExpand}
      >
        <div className="flex items-start gap-4">
          {/* Band avatar/image */}
          <div className="w-14 h-14 rounded-lg overflow-hidden flex-shrink-0">
            {band.avatar ? (
              <img src={band.avatar} alt={band.name} className="w-full h-full object-cover" />
            ) : (
              <div className={clsx(
                'w-full h-full flex items-center justify-center bg-gradient-to-br',
                avatarGradient
              )}>
                <span className="text-xl font-bold text-white/90 font-mono">{bandInitial}</span>
              </div>
            )}
          </div>

          {/* Band info */}
          <div className="flex-1 min-w-0">
            <div className="flex items-center gap-2">
              <h3 className="text-white font-mono font-bold text-base truncate">{band.name}</h3>
              <Link
                to={`/band/${band.id}/edit`}
                onClick={(e) => e.stopPropagation()}
                className="p-1 text-[#666666] hover:text-[#00ffff] transition-colors"
              >
                <svg className="w-4 h-4" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                  <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M15.232 5.232l3.536 3.536m-2.036-5.036a2.5 2.5 0 113.536 3.536L6.5 21.036H3v-3.572L16.732 3.732z" />
                </svg>
              </Link>
            </div>
            <p className="text-[#666666] text-xs font-mono mt-0.5">
              Created {formatDate(band.createdAt)}
            </p>

            {/* Backstory preview (when not expanded) */}
            {!isExpanded && band.backstory && (
              <p className="text-[#888888] text-xs font-mono mt-1 line-clamp-1">
                {band.backstory}
              </p>
            )}

            {/* Quick preview of instruments (when not expanded) */}
            {!isExpanded && (
              <div className="flex items-center gap-2 mt-2 flex-wrap">
                <span className="text-xs font-mono text-[#00ffff]">{drumInfo.displayName}</span>
                <span className="text-[#333333]">•</span>
                <span className="text-xs font-mono text-[#3b82f6]">{bassInfo.displayName}</span>
                <span className="text-[#333333]">•</span>
                <span className="text-xs font-mono text-[#22c55e]">{guitarInfo.displayName}</span>
                <span className="text-[#333333]">•</span>
                <span className="text-xs font-mono text-[#f59e0b]">{pianoInfo.displayName}</span>
              </div>
            )}
          </div>

          {/* Expand/collapse arrow */}
          <div className="flex items-center flex-shrink-0 pt-1">
            <svg
              className={clsx(
                'w-5 h-5 text-[#666666] transition-transform',
                isExpanded && 'rotate-180'
              )}
              fill="none"
              viewBox="0 0 24 24"
              stroke="currentColor"
            >
              <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M19 9l-7 7-7-7" />
            </svg>
          </div>
        </div>
      </div>

      {/* Expanded details */}
      {isExpanded && (
        <div className="px-4 pb-4 border-t border-[#1a1a1a]">
          {/* Backstory */}
          {band.backstory && (
            <div className="mt-4 p-3 rounded-lg bg-[#0a0a0a] border border-[#1a1a1a]">
              <p className="text-xs font-mono text-[#666666] uppercase mb-2">Backstory</p>
              <p className="text-sm font-mono text-[#cccccc] leading-relaxed">{band.backstory}</p>
            </div>
          )}

          <div className="grid grid-cols-2 gap-3 mt-4">
            {/* Drums */}
            <div className="p-3 rounded-lg bg-[#0a0a0a] border border-[#1a1a1a]">
              <div className="flex items-center gap-2 mb-1">
                <DrumIcon size={14} color="#00ffff" />
                <span className="text-xs font-mono text-[#666666] uppercase">Drums</span>
              </div>
              <p className="text-sm font-mono text-white">{drumInfo.displayName}</p>
              <p className="text-xs font-mono text-[#555555]">{drumInfo.description}</p>
            </div>

            {/* Bass */}
            <div className="p-3 rounded-lg bg-[#0a0a0a] border border-[#1a1a1a]">
              <div className="flex items-center gap-2 mb-1">
                <BassIcon size={14} color="#3b82f6" />
                <span className="text-xs font-mono text-[#666666] uppercase">Bass</span>
              </div>
              <p className="text-sm font-mono text-white">{bassInfo.displayName}</p>
              <p className="text-xs font-mono text-[#555555]">{bassInfo.description}</p>
            </div>

            {/* Guitar */}
            <div className="p-3 rounded-lg bg-[#0a0a0a] border border-[#1a1a1a]">
              <div className="flex items-center gap-2 mb-1">
                <GuitarIcon size={14} color="#22c55e" />
                <span className="text-xs font-mono text-[#666666] uppercase">Guitar</span>
              </div>
              <p className="text-sm font-mono text-white">{guitarInfo.displayName}</p>
              <p className="text-xs font-mono text-[#555555]">{guitarInfo.description}</p>
            </div>

            {/* Piano */}
            <div className="p-3 rounded-lg bg-[#0a0a0a] border border-[#1a1a1a]">
              <div className="flex items-center gap-2 mb-1">
                <PianoIcon size={14} color="#f59e0b" />
                <span className="text-xs font-mono text-[#666666] uppercase">Piano</span>
              </div>
              <p className="text-sm font-mono text-white">{pianoInfo.displayName}</p>
              <p className="text-xs font-mono text-[#555555]">{pianoInfo.description}</p>
            </div>
          </div>

          {/* Voice Effects */}
          <div className="mt-3 p-3 rounded-lg bg-[#0a0a0a] border border-[#1a1a1a]">
            <div className="flex items-center gap-2 mb-2">
              <VoiceIcon size={14} color="#a855f7" />
              <span className="text-xs font-mono text-[#666666] uppercase">Voice Effects</span>
              <span className="text-xs font-mono text-[#a855f7]">({activeEffectsCount} active)</span>
            </div>
            <div className="flex flex-wrap gap-2">
              {Object.entries(band.voiceEffects).map(([effect, enabled]) => (
                <span
                  key={effect}
                  className={clsx(
                    'px-2 py-1 rounded text-xs font-mono',
                    enabled
                      ? 'bg-[#a855f7]/20 text-[#a855f7] border border-[#a855f7]/30'
                      : 'bg-[#111111] text-[#444444] border border-[#222222]'
                  )}
                >
                  {effect.charAt(0).toUpperCase() + effect.slice(1)}
                </span>
              ))}
            </div>
          </div>

          {/* Delete button */}
          <div className="mt-4 flex justify-end">
            <button
              onClick={(e) => {
                e.stopPropagation();
                onDelete();
              }}
              className="px-3 py-1.5 rounded-lg bg-red-500/10 text-red-500 text-xs font-mono hover:bg-red-500/20 transition-colors flex items-center gap-2"
            >
              <TrashIcon size={14} color="#ef4444" />
              Delete Band
            </button>
          </div>
        </div>
      )}
    </div>
  );
}

/**
 * Individual song card component.
 */
interface SongCardProps {
  song: SongMetadata;
  isSelected: boolean;
  isDeleting: boolean;
  onSelect: () => void;
  onPlay: () => void;
  onDelete: (e: React.MouseEvent) => void;
  formatDuration: (ms: number) => string;
  formatDate: (timestamp: number) => string;
}

function SongCard({
  song,
  isSelected,
  isDeleting,
  onSelect,
  onPlay,
  onDelete,
  formatDuration,
  formatDate,
}: SongCardProps) {
  return (
    <button
      onClick={onSelect}
      className={clsx(
        'w-full p-4 mb-2 rounded-xl border transition-all text-left',
        isSelected
          ? 'border-[#00ffff] bg-[#00ffff]/10'
          : 'border-[#1a1a1a] bg-[#0a0a0a] hover:border-[#333333]',
        isDeleting && 'opacity-50 pointer-events-none'
      )}
    >
      <div className="flex items-start gap-4">
        {/* Thumbnail / Waveform placeholder */}
        <div className="w-14 h-14 rounded-lg bg-[#111111] flex items-center justify-center flex-shrink-0 overflow-hidden">
          {song.thumbnail ? (
            <img src={song.thumbnail} alt="" className="w-full h-full object-cover" />
          ) : (
            <WaveformIcon size={28} color={isSelected ? '#00ffff' : '#333333'} />
          )}
        </div>

        {/* Song info */}
        <div className="flex-1 min-w-0">
          <h3 className={clsx(
            'text-base font-bold font-mono truncate',
            isSelected ? 'text-[#00ffff]' : 'text-white'
          )}>
            {song.name}
          </h3>
          <div className="flex items-center gap-3 mt-1 text-xs font-mono text-[#666666]">
            <span>{song.bpm} BPM</span>
            <span>{formatDuration(song.duration)}</span>
            <span>{song.layerCount} layers</span>
          </div>
          <div className="mt-1 text-xs font-mono text-[#444444]">
            {formatDate(song.createdAt)}
          </div>
        </div>

        {/* Actions */}
        <div className="flex items-center gap-2 flex-shrink-0">
          {isSelected && (
            <>
              <button
                onClick={(e) => {
                  e.stopPropagation();
                  onPlay();
                }}
                className="w-10 h-10 rounded-full bg-[#00ffff]/20 flex items-center justify-center hover:bg-[#00ffff]/30 transition-colors"
              >
                <PlayIcon size={20} color="#00ffff" glowColor="#00ffff" />
              </button>
              <button
                onClick={onDelete}
                className="w-10 h-10 rounded-full bg-[#ff0000]/10 flex items-center justify-center hover:bg-[#ff0000]/20 transition-colors"
              >
                {isDeleting ? (
                  <div className="w-4 h-4 border-2 border-[#ff4444] border-t-transparent rounded-full animate-spin" />
                ) : (
                  <TrashIcon size={18} color="#ff4444" />
                )}
              </button>
            </>
          )}
        </div>
      </div>
    </button>
  );
}

/**
 * Voice effects configuration for display.
 */
const VOICE_EFFECT_CONFIG = {
  reverb: { displayName: 'Reverb', description: 'Spacious echo', color: '#8b5cf6' },
  delay: { displayName: 'Delay', description: 'Rhythmic repeat', color: '#06b6d4' },
  chorus: { displayName: 'Chorus', description: 'Thick shimmer', color: '#22c55e' },
  distortion: { displayName: 'Distortion', description: 'Gritty edge', color: '#ef4444' },
};

/**
 * Instruments tab content - shows all available instruments with audio preview.
 */
type EffectType = 'reverb' | 'delay' | 'chorus' | 'distortion';

function InstrumentsTabContent() {
  const [audioInitialized, setAudioInitialized] = useState(false);
  const [playingInstrument, setPlayingInstrument] = useState<string | null>(null);
  const [activeVoiceEffect, setActiveVoiceEffect] = useState<EffectType | null>(null);
  const stopTimeoutRef = useRef<ReturnType<typeof setTimeout> | null>(null);

  // Initialize audio on first interaction
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

  // Stop voice effect preview
  const stopVoiceEffect = useCallback(() => {
    audioEngine.stopPassthrough();
    audioEngine.disableAllEffects();
    setActiveVoiceEffect(null);
  }, []);

  // Stop all players (including voice)
  const stopAllPlayers = useCallback(() => {
    drumKitPlayer.stop();
    bassDemoPlayer.stop();
    guitarDemoPlayer.stop();
    pianoDemoPlayer.stop();
    stopVoiceEffect();
    if (stopTimeoutRef.current) {
      clearTimeout(stopTimeoutRef.current);
      stopTimeoutRef.current = null;
    }
    setPlayingInstrument(null);
  }, [stopVoiceEffect]);

  // Cleanup on unmount
  useEffect(() => {
    return () => {
      stopAllPlayers();
      // Re-enable detection when leaving
      audioEngine.setBeatboxEnabled(true);
      audioEngine.setPitchEnabled(true);
    };
  }, [stopAllPlayers]);

  // Play drum kit preview (one bar = 4 beats, supports both electronic and sampled)
  const playDrumPreview = useCallback(async (synthType: DrumSynthType, kit: DrumKitType | SampledDrumKitType) => {
    const ready = await initializeAudio();
    if (!ready) return;

    stopAllPlayers();
    setPlayingInstrument(`drum-${synthType}-${kit}`);

    if (synthType === 'sampled') {
      await drumKitPlayer.setSampledKit(kit as SampledDrumKitType);
    } else {
      drumKitPlayer.setKit(kit as DrumKitType);
    }
    drumKitPlayer.start();

    // Stop after one bar (4 beats at 120 BPM = 2 seconds)
    stopTimeoutRef.current = setTimeout(() => {
      drumKitPlayer.stop();
      setPlayingInstrument(null);
    }, 2000);
  }, [initializeAudio, stopAllPlayers]);

  // Play bass preview (supports both electronic and sampled)
  const playBassPreview = useCallback(async (synthType: BassSynthType, style: BassStyle | RealisticBassStyle) => {
    const ready = await initializeAudio();
    if (!ready) return;

    stopAllPlayers();
    setPlayingInstrument(`bass-${synthType}-${style}`);

    if (synthType === 'sampled') {
      bassDemoPlayer.setRealisticStyle(style as RealisticBassStyle);
    } else {
      bassDemoPlayer.setStyle(style as BassStyle);
    }
    bassDemoPlayer.start();

    stopTimeoutRef.current = setTimeout(() => {
      bassDemoPlayer.stop();
      setPlayingInstrument(null);
    }, 2000);
  }, [initializeAudio, stopAllPlayers]);

  // Play guitar preview (supports electronic, sampled, and electric)
  const playGuitarPreview = useCallback(async (synthType: GuitarSynthType, style: GuitarStyle | RealisticGuitarStyle | ElectricGuitarStyle) => {
    const ready = await initializeAudio();
    if (!ready) return;

    stopAllPlayers();
    setPlayingInstrument(`guitar-${synthType}-${style}`);

    if (synthType === 'sampled') {
      guitarDemoPlayer.setRealisticStyle(style as RealisticGuitarStyle);
    } else if (synthType === 'electric') {
      guitarDemoPlayer.setElectricStyle(style as ElectricGuitarStyle);
    } else {
      guitarDemoPlayer.setStyle(style as GuitarStyle);
    }
    guitarDemoPlayer.start();

    stopTimeoutRef.current = setTimeout(() => {
      guitarDemoPlayer.stop();
      setPlayingInstrument(null);
    }, 2000);
  }, [initializeAudio, stopAllPlayers]);

  // Play piano preview (supports both electronic and sampled)
  const playPianoPreview = useCallback(async (synthType: PianoSynthType, style: PianoStyle | RealisticPianoStyle) => {
    const ready = await initializeAudio();
    if (!ready) return;

    stopAllPlayers();
    setPlayingInstrument(`piano-${synthType}-${style}`);

    if (synthType === 'sampled') {
      pianoDemoPlayer.setRealisticStyle(style as RealisticPianoStyle);
    } else {
      pianoDemoPlayer.setStyle(style as PianoStyle);
    }
    pianoDemoPlayer.start();

    stopTimeoutRef.current = setTimeout(() => {
      pianoDemoPlayer.stop();
      setPlayingInstrument(null);
    }, 2000);
  }, [initializeAudio, stopAllPlayers]);

  // Toggle voice effect preview (sing with effect applied)
  const toggleVoiceEffect = useCallback(async (effect: EffectType) => {
    const ready = await initializeAudio();
    if (!ready) return;

    // If this effect is already active, stop it
    if (activeVoiceEffect === effect) {
      stopVoiceEffect();
      return;
    }

    // Stop any playing instruments
    drumKitPlayer.stop();
    bassDemoPlayer.stop();
    guitarDemoPlayer.stop();
    pianoDemoPlayer.stop();
    if (stopTimeoutRef.current) {
      clearTimeout(stopTimeoutRef.current);
      stopTimeoutRef.current = null;
    }
    setPlayingInstrument(null);

    // Disable all effects first, then enable only the selected one
    audioEngine.disableAllEffects();

    // Request mic permission and start passthrough
    const granted = await audioEngine.requestPermission();
    if (!granted) {
      console.error('[LibraryScreen] Microphone permission denied');
      return;
    }

    // Disable pitch/beatbox detection for clean voice preview
    audioEngine.setBeatboxEnabled(false);
    audioEngine.setPitchEnabled(false);
    audioEngine.setInstrumentMode('off');

    // Start voice passthrough
    await audioEngine.startPassthrough();

    // Enable the selected effect
    audioEngine.toggleEffect(effect, true);
    setActiveVoiceEffect(effect);
  }, [initializeAudio, activeVoiceEffect, stopVoiceEffect]);

  return (
    <div className="px-4 py-4 space-y-6">
      {/* Drum Kits */}
      <InstrumentSection
        icon={<DrumIcon size={20} color="#00ffff" />}
        title="Drum Kits"
        color="#00ffff"
      >
        <div className="grid grid-cols-2 gap-2">
          {ALL_DRUM_OPTIONS.map((option) => {
            const isPlaying = playingInstrument === `drum-${option.synthType}-${option.kit}`;
            return (
              <InstrumentOptionCard
                key={`${option.synthType}-${option.kit}`}
                name={option.displayName}
                description={option.description}
                color={option.color}
                isPremium={false}
                showFreeLabel={true}
                isPlaying={isPlaying}
                onClick={() => {
                  if (isPlaying) {
                    stopAllPlayers();
                  } else {
                    playDrumPreview(option.synthType, option.kit as DrumKitType | SampledDrumKitType);
                  }
                }}
                tag={option.tag}
                tagColor={option.tagColor}
              />
            );
          })}
        </div>
      </InstrumentSection>

      {/* Bass Styles */}
      <InstrumentSection
        icon={<BassIcon size={20} color="#3b82f6" />}
        title="Bass Styles"
        color="#3b82f6"
      >
        <div className="grid grid-cols-2 gap-2">
          {ALL_BASS_OPTIONS.map((option) => {
            const isPlaying = playingInstrument === `bass-${option.synthType}-${option.style}`;
            return (
              <InstrumentOptionCard
                key={`${option.synthType}-${option.style}`}
                name={option.displayName}
                description={option.description}
                color={option.color}
                isPremium={false}
                showFreeLabel={true}
                isPlaying={isPlaying}
                onClick={() => {
                  if (isPlaying) {
                    stopAllPlayers();
                  } else {
                    playBassPreview(option.synthType, option.style as BassStyle | RealisticBassStyle);
                  }
                }}
                tag={option.tag}
                tagColor={option.tagColor}
              />
            );
          })}
        </div>
      </InstrumentSection>

      {/* Guitar Styles */}
      <InstrumentSection
        icon={<GuitarIcon size={20} color="#22c55e" />}
        title="Guitar Styles"
        color="#22c55e"
      >
        <div className="grid grid-cols-2 gap-2">
          {ALL_GUITAR_OPTIONS.map((option) => {
            const isPlaying = playingInstrument === `guitar-${option.synthType}-${option.style}`;
            return (
              <InstrumentOptionCard
                key={`${option.synthType}-${option.style}`}
                name={option.displayName}
                description={option.description}
                color={option.color}
                isPremium={false}
                showFreeLabel={true}
                isPlaying={isPlaying}
                onClick={() => {
                  if (isPlaying) {
                    stopAllPlayers();
                  } else {
                    playGuitarPreview(option.synthType, option.style as GuitarStyle | RealisticGuitarStyle);
                  }
                }}
                tag={option.tag}
                tagColor={option.tagColor}
              />
            );
          })}
        </div>
      </InstrumentSection>

      {/* Piano Styles */}
      <InstrumentSection
        icon={<PianoIcon size={20} color="#f59e0b" />}
        title="Piano Styles"
        color="#f59e0b"
      >
        <div className="grid grid-cols-2 gap-2">
          {ALL_PIANO_OPTIONS.map((option) => {
            const isPlaying = playingInstrument === `piano-${option.synthType}-${option.style}`;
            return (
              <InstrumentOptionCard
                key={`${option.synthType}-${option.style}`}
                name={option.displayName}
                description={option.description}
                color={option.color}
                isPremium={false}
                showFreeLabel={true}
                isPlaying={isPlaying}
                onClick={() => {
                  if (isPlaying) {
                    stopAllPlayers();
                  } else {
                    playPianoPreview(option.synthType, option.style);
                  }
                }}
                tag={option.tag}
                tagColor={option.tagColor}
              />
            );
          })}
        </div>
      </InstrumentSection>

      {/* Voice Effects - click to test with your voice */}
      <InstrumentSection
        icon={<VoiceIcon size={20} color="#a855f7" />}
        title="Voice Effects"
        color="#a855f7"
      >
        <p className="text-xs text-[#666666] font-mono mb-3">
          Tap an effect, then sing to hear it applied to your voice
        </p>
        <div className="grid grid-cols-2 gap-2">
          {(Object.keys(VOICE_EFFECT_CONFIG) as Array<keyof typeof VOICE_EFFECT_CONFIG>).map((effect) => {
            const config = VOICE_EFFECT_CONFIG[effect];
            const isActive = activeVoiceEffect === effect;
            return (
              <InstrumentOptionCard
                key={effect}
                name={config.displayName}
                description={config.description}
                color={config.color}
                isPremium={false}
                showFreeLabel={true}
                isPlaying={isActive}
                onClick={() => toggleVoiceEffect(effect as EffectType)}
              />
            );
          })}
        </div>
      </InstrumentSection>

      {/* Coming Soon - Premium teaser */}
      <div className="mt-8 p-4 rounded-xl border border-dashed border-[#333333] bg-[#0a0a0a]/50">
        <div className="flex items-center gap-3 mb-2">
          <div className="w-8 h-8 rounded-full bg-gradient-to-r from-[#ffd700] to-[#ff8c00] flex items-center justify-center">
            <svg className="w-4 h-4 text-black" fill="currentColor" viewBox="0 0 20 20">
              <path d="M9.049 2.927c.3-.921 1.603-.921 1.902 0l1.07 3.292a1 1 0 00.95.69h3.462c.969 0 1.371 1.24.588 1.81l-2.8 2.034a1 1 0 00-.364 1.118l1.07 3.292c.3.921-.755 1.688-1.54 1.118l-2.8-2.034a1 1 0 00-1.175 0l-2.8 2.034c-.784.57-1.838-.197-1.539-1.118l1.07-3.292a1 1 0 00-.364-1.118L2.98 8.72c-.783-.57-.38-1.81.588-1.81h3.461a1 1 0 00.951-.69l1.07-3.292z" />
            </svg>
          </div>
          <div>
            <h3 className="text-white font-mono text-sm font-bold">Premium Instruments</h3>
            <p className="text-[#666666] font-mono text-xs">Coming soon</p>
          </div>
        </div>
        <p className="text-[#555555] font-mono text-xs">
          Unlock exclusive drum kits, synth presets, and advanced effects.
        </p>
      </div>
    </div>
  );
}

/**
 * Section wrapper for instrument categories.
 */
function InstrumentSection({
  icon,
  title,
  color,
  children,
}: {
  icon: React.ReactNode;
  title: string;
  color: string;
  children: React.ReactNode;
}) {
  return (
    <div>
      <div className="flex items-center gap-2 mb-3">
        {icon}
        <h2 className="text-sm font-mono font-bold uppercase tracking-wider" style={{ color }}>
          {title}
        </h2>
      </div>
      {children}
    </div>
  );
}

