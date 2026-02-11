# Beatbite-React - CLAUDE.md

Voice-to-music creation app (React version) - making the next billion musicians.

## Project Overview

React/TypeScript implementation of Beatbite, designed for easy conversion to React Native. Uses Web Audio API for browser-based audio processing.

**Vision**: Instagram democratized photography with filters. Beatbite democratizes music creation using voice as the only input.

## Current Status: Prototype v0.2

Multi-instrument voice-to-music creation with loop recording, library management, and band system. All audio via Web Audio API with Tone.js samplers for realistic instrument sounds.

**Target Latency**: < 15ms (imperceptible) to max 100ms (acceptable)

## Development

### Prerequisites

- Node.js 18+
- Modern browser with Web Audio API support
- Headphones connected to device

### Quick Start

```bash
# Install dependencies
npm install

# Start development server (http://spark.local:9020)
npm run dev

# Build for production
npm run build

# Preview production build
npm run preview

# Type checking
npm run typecheck
```

### Port Configuration

| Port | Service |
|------|---------|
| 9020 | Development server |
| 9021 | API server (future) |
| 9022 | WebSocket server (future) |

## Architecture

```
src/
├── main.tsx                           # App entry point
├── App.tsx                            # Router + screen composition
├── index.css                          # Tailwind CSS styles
├── vite-env.d.ts                      # Vite types + __LOG_LEVEL__ declaration
├── types/
│   └── index.ts                       # All TypeScript types (instruments, styles, configs)
├── hooks/
│   └── useGuidedFlow.ts               # Guided recording flow hook
├── core/
│   ├── AudioEngine.ts                 # Web Audio API wrapper (mic, passthrough, effects, detection)
│   ├── store.ts                       # Legacy re-export (→ store/index.ts)
│   ├── store/                         # Zustand state management (split slices)
│   │   ├── index.ts                   # Main store + hooks
│   │   ├── create.ts                  # Store creation with all slices
│   │   ├── types.ts                   # Store type definitions
│   │   ├── selectors.ts              # Memoized selectors
│   │   ├── audioSlice.ts             # Audio state (passthrough, latency, effects)
│   │   ├── bandSlice.ts              # Band management state
│   │   ├── instrumentSlice.ts        # Instrument config state
│   │   ├── librarySlice.ts           # Song library state
│   │   ├── looperSlice.ts            # Loop recording state
│   │   ├── navigationSlice.ts        # Navigation state
│   │   └── playbackSlice.ts          # Playback state
│   ├── utils/
│   │   ├── audioUtils.ts              # Shared DSP utilities (ADSR, type guards)
│   │   └── logger.ts                  # Level-gated logger (debug/info/warn/error)
│   ├── synthesizers/                  # Instrument synthesis (abstract hierarchy)
│   │   ├── AbstractSynthesizer.ts     # Base class (init, gain, audio context)
│   │   ├── MonophonicSynthesizer.ts   # Single-voice (bass, guitar)
│   │   ├── PianoSynthesizer.ts        # Polyphonic piano
│   │   ├── BassSynthesizer.ts         # Bass synthesis (sub, pluck, wobble)
│   │   ├── GuitarSynthesizer.ts       # Guitar synthesis (clean, distorted, acoustic)
│   │   └── index.ts
│   ├── demoPlayers/                   # Instrument demo playback (abstract hierarchy)
│   │   ├── AbstractDemoPlayer.ts      # Base class (init, BPM, beat loop, volume, sampler)
│   │   ├── BassDemoPlayer.ts          # Bass demo (electronic + sampled styles)
│   │   ├── GuitarDemoPlayer.ts        # Guitar demo (electronic + sampled + electric)
│   │   ├── PianoDemoPlayer.ts         # Piano demo (electronic + sampled styles)
│   │   └── index.ts
│   ├── BassDemoPlayer.ts             # Re-export proxy → demoPlayers/
│   ├── GuitarDemoPlayer.ts           # Re-export proxy → demoPlayers/
│   ├── PianoDemoPlayer.ts            # Re-export proxy → demoPlayers/
│   ├── LayerManager.ts               # Multi-track layer management
│   ├── LayerRecorder.ts              # Single layer recording
│   ├── LoopRecorder.ts               # Loop-based recording
│   ├── TransportController.ts        # Playback transport (tempo, loop boundaries)
│   ├── MetronomeAudio.ts             # Click track
│   ├── Quantizer.ts                  # Note quantization
│   ├── LoopQuantizer.ts              # Loop-level quantization
│   ├── DrumSynthesizer.ts            # Electronic drum synthesis
│   ├── SampledDrumKit.ts             # Tone.js sampled drum kit
│   ├── DrumKitPlayer.ts              # Drum playback controller
│   ├── DrumEventPlayer.ts            # Drum event sequence player
│   ├── DrumEventRecorder.ts          # Drum event recorder
│   ├── MelodicEventPlayer.ts         # Melodic event sequence player
│   ├── MelodicEventRecorder.ts       # Melodic event recorder
│   ├── BaseSamplerInstrument.ts      # Base Tone.js sampler (shared by all samplers)
│   ├── RealisticBassSampler.ts       # Tone.js bass sampler
│   ├── RealisticGuitarSampler.ts     # Tone.js guitar sampler
│   ├── RealisticPianoSampler.ts      # Tone.js piano sampler
│   ├── ElectricGuitarSampler.ts      # Tone.js electric guitar sampler
│   ├── BeatboxDetector.ts            # Voice → drum detection (FFT + energy)
│   ├── BpmDetector.ts                # Tempo detection
│   ├── PitchDetector.ts              # Voice pitch detection (autocorrelation)
│   ├── VoiceOnsetDetector.ts         # Voice onset/offset detection
│   ├── VoiceEffects.ts               # Reverb, delay, chorus, distortion
│   ├── RecordingStorage.ts           # IndexedDB storage for recordings
│   ├── LibraryStorage.ts             # IndexedDB storage for song library
│   └── BandStorage.ts                # localStorage band persistence
├── ui/
│   ├── screens/
│   │   ├── BandSelectionScreen.tsx    # Band picker
│   │   ├── BandCreateScreen.tsx       # Band creation with instrument demos
│   │   ├── BandEditScreen.tsx         # Band editing
│   │   ├── BandNameScreen.tsx         # Band naming
│   │   ├── InstrumentSetupScreen.tsx  # Instrument config + style selection
│   │   ├── TempoSelectorScreen.tsx    # Tempo selection
│   │   ├── RecordScreen.tsx           # Main recording screen
│   │   ├── RecordingScreen.tsx        # Active recording session
│   │   ├── GuidedRecordingScreen.tsx  # Step-by-step guided recording
│   │   ├── LooperScreen.tsx           # Loop-based recording
│   │   ├── LibraryScreen.tsx          # Song library browser
│   │   ├── PassthroughScreen.tsx      # Latency test screen
│   │   └── SettingsScreen.tsx         # App settings
│   └── components/
│       ├── index.ts                   # Component barrel exports
│       ├── AudioVisualizer.tsx        # Level visualization
│       ├── LatencyDisplay.tsx         # Latency indicator
│       ├── VolumeSlider.tsx           # Netflix-style slider
│       ├── FlowHeader.tsx             # Screen header with breadcrumbs
│       ├── FooterNav.tsx              # Bottom navigation
│       ├── ActiveBandHeader.tsx       # Current band display
│       ├── MiniPlayer.tsx             # Compact song player
│       ├── FullScreenPlayer.tsx       # Full screen playback
│       ├── RecordingPanel.tsx         # Recording controls
│       ├── EffectsPanel.tsx           # Effects controls
│       ├── InstrumentOptionCard.tsx   # Instrument style card
│       ├── DrumIndicator.tsx          # Drum beat indicator
│       ├── BassIndicator.tsx          # Bass note indicator
│       ├── GuitarIndicator.tsx        # Guitar note indicator
│       ├── PianoIndicator.tsx         # Piano note indicator
│       ├── PitchDisplay.tsx           # Pitch visualization
│       └── Icons.tsx                  # SVG icon components
└── vite.config.ts                     # Vite config (HTTPS, aliases, __LOG_LEVEL__)
```

## Core Components

### AudioEngine (`src/core/AudioEngine.ts`)

Central Web Audio API wrapper — handles mic input, passthrough, effects chain, detection dispatch, and synthesis routing.

### State Management (`src/core/store/`)

Zustand store split into domain slices for maintainability:

| Slice | Responsibilities |
|-------|-----------------|
| `audioSlice` | Passthrough, latency, effects, mic permissions |
| `bandSlice` | Band CRUD, active band, instrument config |
| `instrumentSlice` | Instrument types, styles, synth types |
| `librarySlice` | Song library, save/load/delete |
| `looperSlice` | Loop recording state, layers |
| `navigationSlice` | Screen navigation, flow state |
| `playbackSlice` | Transport, BPM, play/stop |

### Logger (`src/core/utils/logger.ts`)

Level-gated logging utility. Replaces all raw `console.*` calls.

```typescript
import { logger } from '@/core/utils/logger';

logger.debug('per-frame data');   // Only in dev (stripped in prod)
logger.info('lifecycle event');    // Only in dev (stripped in prod)
logger.warn('non-critical issue'); // Always shown
logger.error('failure', error);    // Always shown
```

Levels controlled by Vite `define` — `__LOG_LEVEL__` is `"debug"` in dev, `"warn"` in production. **Never use raw `console.log/warn/error`** — always use `logger`.

### Synthesizer Hierarchy (`src/core/synthesizers/`)

```
AbstractSynthesizer          — init, gain, audio context management
  ├── MonophonicSynthesizer  — single-voice (bass, guitar)
  │   ├── BassSynthesizer    — sub, pluck, wobble synthesis
  │   └── GuitarSynthesizer  — clean, distorted, acoustic synthesis
  └── PianoSynthesizer       — polyphonic with harmonic table
```

### DemoPlayer Hierarchy (`src/core/demoPlayers/`)

Instrument demo playback for setup/preview screens. Singletons exported from `index.ts`.

```
AbstractDemoPlayer           — init, BPM loop, volume, sampler loading
  ├── BassDemoPlayer         — 2 synth types (electronic/sampled), 4 electronic styles
  ├── GuitarDemoPlayer       — 3 synth types (+electric sampler), 4 electronic styles
  └── PianoDemoPlayer        — 2 synth types, 5 electronic styles with harmonic table
```

**Backward-compatible proxies**: `src/core/BassDemoPlayer.ts`, `GuitarDemoPlayer.ts`, `PianoDemoPlayer.ts` re-export from `demoPlayers/`. Consumer files import from these proxies — no need to update imports.

### Samplers (Tone.js)

| Sampler | File | Purpose |
|---------|------|---------|
| `RealisticBassSampler` | `RealisticBassSampler.ts` | Sampled bass with multiple styles |
| `RealisticGuitarSampler` | `RealisticGuitarSampler.ts` | Sampled acoustic guitar |
| `ElectricGuitarSampler` | `ElectricGuitarSampler.ts` | Sampled electric guitar |
| `RealisticPianoSampler` | `RealisticPianoSampler.ts` | Sampled piano with multiple styles |
| `SampledDrumKit` | `SampledDrumKit.ts` | Sampled drum kit |
| `BaseSamplerInstrument` | `BaseSamplerInstrument.ts` | Shared base for all Tone.js samplers |

### Detection

| Detector | Purpose |
|----------|---------|
| `BeatboxDetector` | Voice → drum mapping (FFT + energy analysis) |
| `PitchDetector` | Voice frequency detection (autocorrelation) |
| `VoiceOnsetDetector` | Voice onset/offset events |
| `BpmDetector` | Tempo detection from audio |

### Recording & Playback

| Module | Purpose |
|--------|---------|
| `LayerManager` | Multi-track layer management (add, remove, play all) |
| `LayerRecorder` | Single layer recording with loop-boundary sync |
| `LoopRecorder` | Loop-based recording and playback |
| `TransportController` | Tempo, loop boundaries, play/stop |
| `MetronomeAudio` | Click track |
| `Quantizer` / `LoopQuantizer` | Note and loop quantization |
| `DrumEventRecorder/Player` | Drum event sequence record/playback |
| `MelodicEventRecorder/Player` | Melodic event sequence record/playback |

### Storage

| Module | Backend | Purpose |
|--------|---------|---------|
| `RecordingStorage` | IndexedDB | Recording sessions, voice audio, mixes |
| `LibraryStorage` | IndexedDB | Song library (save, load, delete, rename) |
| `BandStorage` | localStorage | Band config persistence |

## React Native Migration

This codebase is designed for easy conversion to React Native:

### What Changes

1. **AudioEngine.ts** → Replace Web Audio API with:
   - `react-native-audio-api` (experimental)
   - `expo-av` for basic audio
   - Native modules for low-latency (recommended)

2. **UI Components** → Replace HTML elements with:
   - `View` instead of `div`
   - `Text` instead of `span`/`p`
   - `Pressable` instead of pointer events
   - React Native SVG for icons

3. **Styling** → Replace Tailwind with:
   - `nativewind` (Tailwind for RN)
   - StyleSheet objects
   - Keep same color values

### What Stays the Same

- Zustand store (`src/core/store.ts`)
- Types (`src/types/index.ts`)
- Component logic and state
- File structure

### Native Audio Bridge

For React Native with low-latency audio, you'll need native modules:

**Android (Kotlin)**:
- Use `AudioRecord` + `AudioTrack`
- Or [Oboe](https://github.com/google/oboe) for better performance

**iOS (Swift)**:
- Use `AVAudioEngine`
- Configure `AVAudioSession` for low latency

## Testing Latency

1. Open `http://spark.local:9020` in a modern browser
2. Connect wired headphones (Bluetooth adds latency)
3. Click/touch and hold anywhere on screen
4. Speak into the microphone
5. Observe the latency display

**Latency Quality**:
- 🟢 < 15ms: Excellent (imperceptible)
- 🟡 15-50ms: Good
- 🟠 50-100ms: Acceptable
- 🔴 > 100ms: Problematic

## User Experience Principles

1. **Instant Feedback**: Real-time audio response while singing
2. **Touch-Based**: Hold to record, slide for volume (Netflix-style)
3. **Loop Recording**: WhatsApp-style press-to-record
4. **Auto-Save**: Google Docs-style automatic saving
5. **Dark UI**: Minimalist dark interface

## Development Progress

### Phase 1: Web Prototype (Complete)
- [x] Audio passthrough with latency testing
- [x] Pitch detection (autocorrelation)
- [x] Beatbox detection (FFT + energy)
- [x] Voice onset/offset detection
- [x] BPM detection
- [x] Drum synthesis (electronic + sampled kit)
- [x] Bass synthesis (electronic + sampled, 4 styles)
- [x] Guitar synthesis (electronic + sampled + electric, 4 styles)
- [x] Piano synthesis (electronic + sampled, 5 styles)
- [x] Voice effects (reverb, delay, chorus, distortion)
- [x] Loop recording and playback
- [x] Multi-layer recording with loop-boundary sync
- [x] Quantization
- [x] Band system (create, edit, instrument config)
- [x] Song library with IndexedDB storage
- [x] Guided recording flow

### Phase 2: Structural Refactoring (Complete)
- [x] LayerManager extraction
- [x] Synthesizer abstract hierarchy
- [x] Zustand store split into domain slices
- [x] DemoPlayer deduplication (AbstractDemoPlayer)
- [x] Logger utility with production stripping

### Next: React Native Migration
- [ ] Port to React Native (see Migration Guide below)
- [ ] Native audio modules (Kotlin/Swift)
- [ ] iOS/Android builds

## Key Dependencies

- **React 18** + **React Router DOM** — UI framework + routing
- **Zustand** — State management (RN compatible)
- **Tone.js** — Sampled instrument playback (piano, bass, guitar, drums)
- **Tailwind CSS** — Styling (nativewind for RN)
- **Vite** — Build tool with `define` for compile-time constants
- **TypeScript** — Type safety
- **Web Audio API** — Browser audio (native modules for RN)
- **Playwright** — E2E testing (dev dependency)
- **clsx** — Conditional className utility

## Conventions

### Logging
- **Never** use raw `console.log/warn/error` — use `logger.debug/info/warn/error` from `@/core/utils/logger`
- **Hot paths** (per-frame, per-note, per-beat): `logger.debug` — stripped in production
- **Lifecycle events** (init, start, stop, loaded): `logger.info` — stripped in production
- **Warnings** (non-critical): `logger.warn` — always shown
- **Errors** (failures, catch blocks): `logger.error` — always shown

### Class Hierarchies
- Synthesizers extend `AbstractSynthesizer` (in `synthesizers/`)
- DemoPlayers extend `AbstractDemoPlayer` (in `demoPlayers/`)
- Both use template method pattern with abstract hooks

### Backward Compatibility
- Old file locations (`src/core/BassDemoPlayer.ts`, etc.) are 1-line re-export proxies
- Consumer files import from these proxies — **do not delete proxy files**
- `src/core/store.ts` is a re-export proxy for `src/core/store/index.ts`

### Commit Convention
`[type][Domain] Description` — e.g., `[refactor][Core] Add logger utility`

## Performance Notes

### Web Audio API
- Use `latencyHint: 'interactive'` for lowest latency
- Disable echo cancellation/noise suppression
- Use small buffer sizes (256 samples)
- Check `baseLatency` and `outputLatency` properties

### Browser Compatibility
- Chrome: Best Web Audio API support
- Firefox: Good support
- Safari: May have higher latency
- Mobile browsers: Variable support

## Resources

- [Web Audio API](https://developer.mozilla.org/en-US/docs/Web/API/Web_Audio_API)
- [Zustand](https://github.com/pmndrs/zustand)
- [Tailwind CSS](https://tailwindcss.com/)
- [React Native Audio API](https://github.com/software-mansion/react-native-audio-api)

---

## React Native Migration Guide

This section documents the approach for migrating Beatbite-React to React Native when ready.

### Overview

The React codebase is designed for straightforward migration to React Native. The key insight: **audio processing must be native** for acceptable latency (<25ms), but **state management, types, and component logic can remain largely unchanged**.

### Migration Layers

| Layer | React (Web) | React Native | Migration Effort |
|-------|-------------|--------------|------------------|
| **Audio Engine** | Web Audio API | Native modules (Kotlin/Swift) | **High** - Complete rewrite |
| **State Management** | Zustand | Zustand (identical) | **None** |
| **Types** | TypeScript | TypeScript (identical) | **None** |
| **UI Components** | JSX + Tailwind | RN components + NativeWind | **Medium** - Syntax changes |
| **Storage** | IndexedDB | AsyncStorage/SQLite | **Low** |

### What Stays the Same

These files can be copied with minimal or no changes:

```
src/
├── core/
│   └── store.ts              # Zustand store - identical API
├── types/
│   └── index.ts              # TypeScript types - identical
└── [component logic]         # State, hooks, business logic
```

### What Changes

#### 1. Audio Engine → Native Bridge

The Web Audio API (`AudioEngine.ts`) must be replaced with native modules.

**Create an AudioBridge abstraction:**

```typescript
// src/core/AudioBridge.ts
import { NativeModules, NativeEventEmitter } from 'react-native';

const { BeatbiteAudio } = NativeModules;
const audioEmitter = BeatbiteAudio ? new NativeEventEmitter(BeatbiteAudio) : null;

export const AudioBridge = {
  isNativeAvailable: (): boolean => BeatbiteAudio != null,

  initialize: async (): Promise<boolean> => {
    if (BeatbiteAudio) return BeatbiteAudio.initialize();
    console.log('[Mock] initialize');
    return true;
  },

  startPassthrough: async (): Promise<void> => {
    if (BeatbiteAudio) return BeatbiteAudio.startPassthrough();
  },

  stopPassthrough: async (): Promise<void> => {
    if (BeatbiteAudio) return BeatbiteAudio.stopPassthrough();
  },

  // Effects
  toggleEffect: (effect: EffectType, enabled: boolean): void => {
    BeatbiteAudio?.toggleEffect(effect, enabled);
  },

  setEffectParam: (effect: EffectType, param: string, value: number): void => {
    BeatbiteAudio?.setEffectParam(effect, param, value);
  },

  // Synthesizers
  setDrumKit: (kit: DrumKitType): void => BeatbiteAudio?.setDrumKit(kit),
  triggerDrum: (drum: string, velocity: number): void => BeatbiteAudio?.triggerDrum(drum, velocity),
  setBassStyle: (style: BassStyle): void => BeatbiteAudio?.setBassStyle(style),
  triggerBassNote: (freq: number, velocity: number): void => BeatbiteAudio?.triggerBassNote(freq, velocity),
  setGuitarStyle: (style: GuitarStyle): void => BeatbiteAudio?.setGuitarStyle(style),
  triggerGuitarNote: (freq: number, velocity: number): void => BeatbiteAudio?.triggerGuitarNote(freq, velocity),

  // Detection
  setBeatboxEnabled: (enabled: boolean): void => BeatbiteAudio?.setBeatboxEnabled(enabled),
  setPitchEnabled: (enabled: boolean): void => BeatbiteAudio?.setPitchEnabled(enabled),

  // Event listeners
  onLevelChanged: (callback: (level: number) => void) => {
    return audioEmitter?.addListener('onLevelChanged', callback);
  },
  onBeatDetected: (callback: (data: { drum: string; velocity: number }) => void) => {
    return audioEmitter?.addListener('onBeatDetected', callback);
  },
  onPitchDetected: (callback: (data: { frequency: number; confidence: number }) => void) => {
    return audioEmitter?.addListener('onPitchDetected', callback);
  },
  onLatencyMeasured: (callback: (latency: number) => void) => {
    return audioEmitter?.addListener('onLatencyMeasured', callback);
  },
};
```

#### 2. Native Module Structure (Android)

```
android/app/src/main/java/com/beatbite/audio/
├── BeatbiteAudioModule.kt      # React Native bridge (exposes methods to JS)
├── BeatbiteAudioPackage.kt     # Module registration
├── AudioEngine.kt              # Core AAudio stream management
├── AudioGraph.kt               # Audio routing/mixing
├── processors/
│   ├── VoiceProcessor.kt       # Mic → effects → output
│   ├── ReverbProcessor.kt      # Convolution/algorithmic reverb
│   ├── DelayProcessor.kt       # Delay/echo effect
│   ├── ChorusProcessor.kt      # Chorus/modulation
│   └── DistortionProcessor.kt  # Waveshaper distortion
├── synthesizers/
│   ├── DrumSynthesizer.kt      # Kick, snare, hihat synthesis
│   ├── BassSynthesizer.kt      # Bass synthesis
│   └── GuitarSynthesizer.kt    # Guitar (Karplus-Strong)
├── detectors/
│   ├── BeatboxDetector.kt      # FFT + energy analysis
│   └── PitchDetector.kt        # Autocorrelation/YIN
└── utils/
    ├── AudioBuffer.kt          # Ring buffer
    └── AudioUtils.kt           # DSP utilities
```

#### 3. AAudio Implementation (Android)

Target: **<25ms round-trip latency**

```kotlin
// AudioEngine.kt
class AudioEngine {
    private var inputStream: AAudioStream? = null
    private var outputStream: AAudioStream? = null

    fun initialize(): Boolean {
        // Input stream (microphone)
        val inputBuilder = AAudioStreamBuilder()
            .setDirection(AAUDIO_DIRECTION_INPUT)
            .setSharingMode(AAUDIO_SHARING_MODE_EXCLUSIVE)  // Low latency
            .setPerformanceMode(AAUDIO_PERFORMANCE_MODE_LOW_LATENCY)
            .setSampleRate(48000)
            .setChannelCount(1)  // Mono input
            .setFormat(AAUDIO_FORMAT_PCM_FLOAT)
            .setBufferCapacityInFrames(256)  // ~5ms buffer
            .setDataCallback(inputCallback)

        // Output stream (speakers/headphones)
        val outputBuilder = AAudioStreamBuilder()
            .setDirection(AAUDIO_DIRECTION_OUTPUT)
            .setSharingMode(AAUDIO_SHARING_MODE_EXCLUSIVE)
            .setPerformanceMode(AAUDIO_PERFORMANCE_MODE_LOW_LATENCY)
            .setSampleRate(48000)
            .setChannelCount(2)  // Stereo output
            .setFormat(AAUDIO_FORMAT_PCM_FLOAT)
            .setBufferCapacityInFrames(256)

        inputStream = inputBuilder.build()
        outputStream = outputBuilder.build()
        return inputStream != null && outputStream != null
    }
}

// Audio processing callback
private val outputCallback = object : AAudioStreamDataCallback {
    override fun onAudioReady(stream: AAudioStream, audioData: FloatArray, numFrames: Int): Int {
        // 1. Read input from ring buffer
        val input = inputBuffer.read(numFrames)

        // 2. Process effects chain
        var processed = input
        if (reverbEnabled) processed = reverbProcessor.process(processed)
        if (delayEnabled) processed = delayProcessor.process(processed)
        if (chorusEnabled) processed = chorusProcessor.process(processed)

        // 3. Mix synthesizers
        val drums = drumSynthesizer.render(numFrames)
        val bass = bassSynthesizer.render(numFrames)
        val guitar = guitarSynthesizer.render(numFrames)

        // 4. Output stereo mix
        for (i in 0 until numFrames) {
            val mixed = processed[i] + drums[i] + bass[i] + guitar[i]
            audioData[i * 2] = mixed      // Left
            audioData[i * 2 + 1] = mixed  // Right
        }
        return AAUDIO_CALLBACK_RESULT_CONTINUE
    }
}
```

#### 4. Native Module Structure (iOS)

```
ios/BeatbiteAudio/
├── BeatbiteAudioModule.swift   # React Native bridge
├── BeatbiteAudioModule.m       # Objective-C bridge header
├── AudioEngine.swift           # AVAudioEngine wrapper
├── Processors/
│   ├── ReverbProcessor.swift
│   ├── DelayProcessor.swift
│   └── ChorusProcessor.swift
└── Synthesizers/
    ├── DrumSynthesizer.swift
    ├── BassSynthesizer.swift
    └── GuitarSynthesizer.swift
```

```swift
// AudioEngine.swift
import AVFoundation

class AudioEngine {
    private let engine = AVAudioEngine()
    private let inputNode: AVAudioInputNode
    private let outputNode: AVAudioOutputNode

    func initialize() throws {
        // Configure session for low latency
        let session = AVAudioSession.sharedInstance()
        try session.setCategory(.playAndRecord, options: [.defaultToSpeaker, .allowBluetooth])
        try session.setPreferredIOBufferDuration(0.005)  // 5ms buffer
        try session.setPreferredSampleRate(48000)
        try session.setActive(true)

        inputNode = engine.inputNode
        outputNode = engine.outputNode

        // Install tap on input
        let format = inputNode.outputFormat(forBus: 0)
        inputNode.installTap(onBus: 0, bufferSize: 256, format: format) { buffer, time in
            self.processAudio(buffer: buffer)
        }

        try engine.start()
    }
}
```

#### 5. UI Components Mapping

| React (Web) | React Native | Notes |
|-------------|--------------|-------|
| `<div>` | `<View>` | |
| `<span>`, `<p>` | `<Text>` | All text must be in Text |
| `onClick` | `onPress` | Use Pressable |
| `className="..."` | `style={styles.x}` or NativeWind | |
| `<input>` | `<TextInput>` | |
| SVG | react-native-svg | |
| CSS transitions | Reanimated | |

**Example conversion:**

```tsx
// React (Web)
<div className="flex items-center gap-2 p-4 bg-gray-900 rounded-lg" onClick={handleClick}>
  <span className="text-white text-lg">{title}</span>
</div>

// React Native
<Pressable style={styles.container} onPress={handleClick}>
  <Text style={styles.title}>{title}</Text>
</Pressable>

const styles = StyleSheet.create({
  container: { flexDirection: 'row', alignItems: 'center', gap: 8, padding: 16, backgroundColor: '#111', borderRadius: 8 },
  title: { color: '#fff', fontSize: 18 },
});

// Or with NativeWind (Tailwind for RN)
<Pressable className="flex-row items-center gap-2 p-4 bg-gray-900 rounded-lg" onPress={handleClick}>
  <Text className="text-white text-lg">{title}</Text>
</Pressable>
```

#### 6. Storage Migration

```typescript
// React (Web) - IndexedDB
import { RecordingStorage } from './RecordingStorage';

// React Native - AsyncStorage or SQLite
import AsyncStorage from '@react-native-async-storage/async-storage';

// Simple adapter pattern
export const Storage = {
  save: async (key: string, data: any) => {
    await AsyncStorage.setItem(key, JSON.stringify(data));
  },
  load: async (key: string) => {
    const data = await AsyncStorage.getItem(key);
    return data ? JSON.parse(data) : null;
  },
};
```

### Migration Phases

#### Phase 1: Project Setup
- [ ] Initialize React Native project with Expo (managed workflow initially)
- [ ] Copy `store.ts` and `types/index.ts` unchanged
- [ ] Set up NativeWind for Tailwind CSS support
- [ ] Create AudioBridge with mock implementations

#### Phase 2: UI Migration
- [ ] Convert screens one by one (start with simplest)
- [ ] Use Pressable + StyleSheet or NativeWind
- [ ] Test UI in Expo Go (mock audio mode)

#### Phase 3: Native Audio (Android)
- [ ] Eject to bare workflow or use development build
- [ ] Implement BeatbiteAudioModule.kt bridge
- [ ] Implement AudioEngine.kt with AAudio
- [ ] Add basic passthrough
- [ ] Measure and optimize latency

#### Phase 4: Effects & Synthesizers (Android)
- [ ] Port effects (reverb, delay, chorus, distortion)
- [ ] Port drum synthesizer
- [ ] Port bass/guitar synthesizers
- [ ] Port detection (beatbox, pitch)

#### Phase 5: iOS Implementation
- [ ] Implement BeatbiteAudioModule.swift
- [ ] Port AudioEngine with AVAudioEngine
- [ ] Port effects and synthesizers
- [ ] Test and optimize latency

#### Phase 6: Recording & Playback
- [ ] Port layer recording system
- [ ] Port quantization
- [ ] Port transport controller
- [ ] Implement storage with AsyncStorage/SQLite

### Performance Guidelines

1. **Avoid allocations in audio callback** - Pre-allocate all buffers
2. **Keep callback fast** - Target <1ms processing time
3. **Use small buffers** - 256 frames at 48kHz = 5.3ms per buffer
4. **Use exclusive mode** - `AAUDIO_SHARING_MODE_EXCLUSIVE` for lowest latency
5. **Test with wired headphones** - Bluetooth adds 100-300ms latency

### Latency Targets

| Quality | Latency | User Experience |
|---------|---------|-----------------|
| Excellent | <15ms | Imperceptible |
| Good | 15-30ms | Slight delay, acceptable |
| Acceptable | 30-50ms | Noticeable but usable |
| Poor | >50ms | Distracting |

### Development Approach

**Recommended: Develop audio on native first**

1. Build native audio modules separately (pure Kotlin/Swift)
2. Test with simple native test app
3. Once latency is acceptable, integrate with React Native
4. Use mock mode for UI development (Expo Go compatible)

### Alternative: react-native-audio-api

[react-native-audio-api](https://github.com/software-mansion/react-native-audio-api) provides Web Audio API-like interface for React Native. This could simplify migration but may have higher latency than custom native modules. Consider for:
- Rapid prototyping
- Non-latency-critical features
- Fallback on devices where native fails

### Files to Migrate (Priority Order)

**Core (copy unchanged):**
1. `src/types/index.ts`
2. `src/core/store.ts`

**Create new:**
3. `src/core/AudioBridge.ts` (native interface)

**Convert UI:**
4. `src/ui/screens/` (one at a time)
5. `src/ui/components/` (as needed by screens)

**Port audio (native modules):**
6. Detection: PitchDetector, BeatboxDetector
7. Synthesizers: DrumSynthesizer, BassSynthesizer, GuitarSynthesizer
8. Effects: VoiceEffects
9. Recording: LayerRecorder, LoopRecorder, TransportController
10. Storage: RecordingStorage, LibraryStorage, BandStorage
