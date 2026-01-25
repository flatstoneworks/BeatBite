# Beatbite-React - CLAUDE.md

Voice-to-music creation app (React version) - making the next billion musicians.

## Project Overview

React/TypeScript implementation of Beatbite, designed for easy conversion to React Native. Uses Web Audio API for browser-based audio processing.

**Vision**: Instagram democratized photography with filters. Beatbite democratizes music creation using voice as the only input.

## Current Status: Prototype v0.1

Testing audio latency with voice passthrough (microphone → headphones).

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
├── main.tsx                    # App entry point
├── App.tsx                     # Main app component
├── index.css                   # Tailwind CSS styles
├── core/
│   ├── AudioEngine.ts          # Web Audio API wrapper
│   └── store.ts                # Zustand state management
├── features/
│   ├── recording/              # Loop recording (future)
│   ├── playback/               # Loop playback (future)
│   └── mixer/                  # Track mixing (future)
├── ui/
│   ├── screens/
│   │   └── PassthroughScreen.tsx  # Latency test screen
│   └── components/
│       ├── AudioVisualizer.tsx    # Level visualization
│       ├── LatencyDisplay.tsx     # Latency indicator
│       └── VolumeSlider.tsx       # Netflix-style slider
├── hooks/                      # Custom React hooks
├── types/
│   └── index.ts               # TypeScript types
└── utils/                     # Utility functions
```

## Core Components

### AudioEngine (`src/core/AudioEngine.ts`)

Web Audio API wrapper for low-latency audio processing.

```typescript
import { audioEngine } from '@/core/AudioEngine';

// Set callbacks
audioEngine.setCallbacks({
  onLatencyMeasured: (ms) => console.log(`Latency: ${ms}ms`),
  onLevelChanged: (level) => console.log(`Level: ${level}`),
  onError: (error) => console.error(error),
});

// Initialize
await audioEngine.initialize({ sampleRate: 48000, bufferSize: 256 });

// Start passthrough
await audioEngine.startPassthrough();

// Stop passthrough
audioEngine.stopPassthrough();

// Cleanup
audioEngine.dispose();
```

### State Management (`src/core/store.ts`)

Zustand store for global state:

```typescript
import { useAppStore } from '@/core/store';

// In component
const isActive = useAppStore((state) => state.isPassthroughActive);
const setVolume = useAppStore((state) => state.setOutputVolume);

// Or use selector hooks
import { useIsPassthroughActive, useOutputVolume } from '@/core/store';
```

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

## Future Development

### Phase 1: MVP (Current)
- [x] Audio passthrough test (Web)
- [ ] Pitch detection
- [ ] Basic drum synthesis
- [ ] Loop recording

### Phase 2: React Native
- [ ] Port to React Native
- [ ] Native audio modules
- [ ] iOS/Android builds

### Phase 3: Instruments
- [ ] Bass synthesizer
- [ ] Keyboard/piano
- [ ] Additional drums
- [ ] Voice effects (reverb)

### Phase 4: Sharing
- [ ] MP3 export
- [ ] TikTok/Instagram integration
- [ ] MIDI export

## Key Dependencies

- **React 18** - UI framework
- **Zustand** - State management (RN compatible)
- **Tailwind CSS** - Styling (nativewind for RN)
- **Vite** - Build tool (Metro for RN)
- **TypeScript** - Type safety
- **Web Audio API** - Browser audio (native modules for RN)

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
