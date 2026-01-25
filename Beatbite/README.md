# Beatbite 🎵

**Making the next billion musicians**

Beatbite is a mobile app that transforms voice input into full musical compositions. Sing into your phone, hear drums, bass, keyboards, and more - instantly.

## The Vision

Instagram started as an app helping people create beautiful photos in seconds with fancy filters. **Beatbite does the same for music.**

A kid with a cheap Android phone in Sri Lanka could be discovered as the next Michael Jackson.

## How It Works

1. **Plug in headphones** - Required for real-time feedback
2. **Touch and hold the screen** - Start listening
3. **Sing or beatbox** - Your voice becomes instruments
4. **Hear instantly** - Real-time audio feedback

## Current Status: Prototype v0.1

Testing audio latency with direct voice passthrough (microphone → headphones).

**Target**: < 15ms latency (imperceptible)

## Getting Started

### Prerequisites

- Flutter SDK 3.0+
- Android Studio / Xcode
- Physical device with wired headphones

### Installation

```bash
# Clone and enter directory
cd Beatbite

# Install dependencies
flutter pub get

# Run on device
flutter run
```

### Testing Latency

1. Connect **wired** headphones (Bluetooth adds latency)
2. Launch the app
3. Touch and hold anywhere
4. Speak - you should hear yourself immediately
5. Check the latency display in the top-left

## Roadmap

- [x] **v0.1** - Audio passthrough test
- [ ] **v0.2** - Pitch detection
- [ ] **v0.3** - Drum synthesis
- [ ] **v0.4** - Loop recording
- [ ] **v0.5** - Bass & keyboard
- [ ] **v1.0** - Full MVP with sharing

## Technology

| Component | Technology |
|-----------|------------|
| UI | Flutter |
| Audio (Android) | Kotlin + AudioRecord/AudioTrack |
| Audio (iOS) | Swift + AVAudioEngine |
| Pitch Detection | TarsosDSP (planned) |
| Sound Generation | Demoscene synths (planned) |

## Resources

- [TarsosDSP](https://github.com/JorenSix/TarsosDSP) - Pitch detection
- [Bytebeat](http://canonical.org/~kragen/bytebeat/) - Algorithmic music
- [Demoscene](https://www.pouet.net/) - Sound synthesis

## License

Proprietary - All rights reserved
