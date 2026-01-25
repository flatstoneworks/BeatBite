# Beatbite - CLAUDE.md

Voice-to-music creation app - making the next billion musicians.

## Project Overview

Beatbite transforms voice input into full musical compositions with drums, bass, keyboards, and vocals. Users sing into their phone's microphone and hear the virtual instrument output in real-time through their headphones.

**Vision**: Instagram democratized photography with filters. Beatbite democratizes music creation using voice as the only input.

## Current Status: Prototype v0.1

Testing audio latency with voice passthrough (microphone → headphones).

**Target Latency**: < 15ms (imperceptible) to max 100ms (acceptable)

## Development

### Prerequisites

1. Flutter SDK 3.0+
2. Android Studio with Kotlin support
3. Xcode for iOS development
4. Physical device with headphones (emulators don't support low-latency audio well)

### Quick Start

```bash
# Get dependencies
flutter pub get

# Run on connected device (with headphones)
flutter run

# Build Android APK
flutter build apk

# Build iOS
flutter build ios
```

### Port Configuration

| Port | Service |
|------|---------|
| 9010 | Main development server |
| 9011 | API server (future) |
| 9012 | WebSocket server (future) |

## Architecture

```
lib/
├── main.dart                 # App entry point
├── core/
│   ├── audio_engine.dart     # Flutter-side audio interface
│   └── app_state.dart        # State management
├── features/
│   ├── recording/            # Loop recording (future)
│   ├── playback/             # Loop playback (future)
│   └── mixer/                # Track mixing (future)
├── ui/
│   ├── screens/
│   │   └── passthrough_screen.dart  # Latency test screen
│   └── widgets/
│       ├── audio_visualizer.dart    # Level visualization
│       ├── latency_display.dart     # Latency indicator
│       └── volume_slider.dart       # Netflix-style volume
└── utils/

android/app/src/main/kotlin/com/beatbite/app/
├── MainActivity.kt           # Flutter method channel
└── AudioEngine.kt            # Native Android audio

ios/Runner/
├── AppDelegate.swift         # Flutter method channel
└── AudioEngine.swift         # Native iOS audio
```

## Native Audio Bridge

The app uses platform channels to communicate with native audio code:

**Channel**: `com.beatbite/audio`

**Methods**:
- `initialize(sampleRate, bufferSize, channels)` → `bool`
- `startPassthrough()` → `bool`
- `stopPassthrough()` → `void`
- `measureLatency()` → `double` (milliseconds)
- `setInputGain(gain)` → `void`
- `setOutputVolume(volume)` → `void`
- `dispose()` → `void`

## Testing Latency

1. Connect wired headphones (Bluetooth adds latency)
2. Launch the app
3. Tap and hold anywhere on screen
4. Speak into the headset microphone
5. Observe the latency display
6. Tap the speed icon to measure latency

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
- [x] Audio passthrough test
- [ ] Pitch detection (TarsosDSP)
- [ ] Basic drum synthesis
- [ ] Loop recording

### Phase 2: Instruments
- [ ] Bass synthesizer
- [ ] Keyboard/piano
- [ ] Additional drums
- [ ] Voice effects (reverb)

### Phase 3: Structuring
- [ ] Visual track editor
- [ ] Loop arrangement
- [ ] Song structure (verse/chorus)

### Phase 4: Sharing
- [ ] MP3 export
- [ ] TikTok/Instagram integration
- [ ] MIDI export

## Key Libraries

### Pitch Detection
- [TarsosDSP](https://github.com/JorenSix/TarsosDSP) - Java pitch detection
- [Tartini](https://www.cs.otago.ac.nz/tartini/) - Research reference

### Sound Generation (Demoscene)
- [4klang](http://4klang.untergrund.net/) - 4KB synth
- [64klang](https://github.com/hzdgopher/64klang) - Larger synth
- [Bytebeat](http://canonical.org/~kragen/bytebeat/) - Single-line music

### Flutter Audio
- [flutter_sound](https://pub.dev/packages/flutter_sound) - Recording/playback
- [audio_session](https://pub.dev/packages/audio_session) - Session management

## Performance Notes

### Android
- Use `AudioRecord.AudioSource.VOICE_COMMUNICATION` for low latency
- Request `PROPERTY_SUPPORT_AUDIO_SOURCE_UNPROCESSED`
- Consider [Oboe](https://github.com/google/oboe) for production

### iOS
- Configure `AVAudioSession` with `.measurement` mode
- Set `preferredIOBufferDuration` as low as possible (~5ms)
- Use `AVAudioEngine` for processing

## Monetization (Future)

1. Premium sounds (teaser → purchase)
2. Download limits ($0.99 after 3 free)
3. MIDI export ($0.99)
4. Subscription for all premium sounds

## Resources

- [Latency in Audio](https://en.wikipedia.org/wiki/Latency_(audio))
- [Bytebeat](http://viznut.fi/en/)
- [Demoscene](https://www.pouet.net/)
- [Chiptune Software](https://soundsrightusa.com/the-best-chiptune-software/)
