# Beatbite-Native - CLAUDE.md

React Native implementation of Beatbite voice-to-music app with native audio modules for low-latency performance.

## Project Overview

Native mobile version of Beatbite, designed for Android (iOS later) with native audio processing using AAudio/AudioTrack for low-latency real-time audio.

**Vision**: Voice → Music creation app. Instagram for photography filters, Beatbite for music creation.

## Quick Start

```bash
# Install dependencies
npm install

# Start Expo development server
npm start

# Run on Android (requires device/emulator)
npm run android

# Run on iOS (requires Mac + Xcode)
npm run ios
```

### Development Build (Required for Native Audio)

The native audio module requires a custom development build (not Expo Go):

```bash
# Generate native projects
npx expo prebuild

# Build and run on Android
npx expo run:android

# Build and run on iOS
npx expo run:ios
```

## Architecture

```
Beatbite-Native/
├── App.tsx                        # Main app entry
├── src/
│   ├── core/
│   │   ├── store.ts               # Zustand state management
│   │   └── AudioBridge.ts         # JS ↔ Native bridge
│   ├── types/
│   │   └── index.ts               # TypeScript types
│   └── ui/
│       ├── screens/
│       │   ├── WelcomeScreen.tsx
│       │   └── TempoSelectorScreen.tsx
│       └── components/
├── android/
│   └── app/src/main/java/com/beatbite/audio/
│       ├── BeatbiteAudioModule.kt # React Native bridge
│       ├── BeatbiteAudioPackage.kt
│       └── AudioEngine.kt         # Core audio processing
└── docs/
    └── NATIVE_AUDIO_ARCHITECTURE.md
```

## Native Audio Module

### Registering the Module

Add to `android/app/src/main/java/.../MainApplication.kt`:

```kotlin
import com.beatbite.audio.BeatbiteAudioPackage

// In getPackages():
packages.add(BeatbiteAudioPackage())
```

### JavaScript API

```typescript
import { AudioBridge } from './src/core/AudioBridge';

// Initialize
await AudioBridge.initialize();

// Start voice passthrough with effects
await AudioBridge.startPassthrough();
AudioBridge.toggleEffect('reverb', true);
AudioBridge.setEffectParam('reverb', 'decay', 2.0);

// Synthesizers
AudioBridge.setDrumKit('electronic');
AudioBridge.triggerDrum('kick', 0.8);

// Event listeners
AudioBridge.onLevelChanged((level) => console.log('Level:', level));
AudioBridge.onBeatDetected((data) => console.log('Beat:', data.drum));
```

### Mock Mode

When running in Expo Go (without native module), AudioBridge provides mock implementations for UI testing. The yellow banner indicates mock mode.

## State Management

Uses Zustand (same as web version):

```typescript
import { useAppStore, useSelectedBpm, useGuidedFlowStep } from './src/core/store';

// In component
const bpm = useSelectedBpm();
const { setSelectedBpm, confirmTempo } = useAppStore();
```

## Styling

Using inline styles (React Native StyleSheet). NativeWind/Tailwind is configured but optional.

**Color Palette:**
- Primary: `#00ffff` (cyan)
- Background: `#050505` (near black)
- Card: `#0a0a0a`
- Border: `#222222`, `#333333`
- Text: `#ffffff`, `#888888`, `#666666`

## Native Audio Implementation Phases

See `docs/NATIVE_AUDIO_ARCHITECTURE.md` for detailed implementation plan.

### Phase 1: Basic Passthrough ✅
- [x] AudioTrack/AudioRecord setup
- [x] Mic → speaker passthrough
- [ ] Latency measurement

### Phase 2: Effects Chain 🚧
- [x] Delay effect (basic)
- [x] Chorus effect (basic)
- [x] Distortion effect (basic)
- [ ] Reverb effect (convolution)

### Phase 3: Synthesizers 📋
- [ ] Drum synthesizer
- [ ] Bass synthesizer
- [ ] Guitar synthesizer

### Phase 4: Detection 📋
- [ ] Beatbox detection
- [ ] Pitch detection

### Phase 5: AAudio Migration 📋
- [ ] Replace AudioTrack with AAudio
- [ ] Target <20ms latency

## Testing on Device

1. Enable USB debugging on Android device
2. Connect via USB
3. Run `npx expo run:android`
4. For wireless: `adb tcpip 5555 && adb connect <device-ip>:5555`

## Port Configuration

| Port | Service |
|------|---------|
| 8081 | Metro bundler (Expo) |
| 19000 | Expo dev server |
| 19001 | Expo dev tools |

## Dependencies

- **expo** - Development framework
- **expo-dev-client** - Custom dev builds
- **expo-av** - Backup audio (higher latency)
- **zustand** - State management
- **nativewind** - Tailwind CSS for RN (optional)

## Resources

- [Expo Documentation](https://docs.expo.dev/)
- [React Native Audio API](https://github.com/software-mansion/react-native-audio-api)
- [Android AAudio](https://developer.android.com/ndk/guides/audio/aaudio/aaudio)
- [Google Oboe](https://github.com/google/oboe)

## Related Projects

- **Beatbite-React** - Web version (same repository parent)
- Uses shared types and similar state management
