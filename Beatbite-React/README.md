# Beatbite-React 🎵

**Making the next billion musicians**

React/TypeScript implementation of Beatbite - a voice-to-music creation app. Designed for easy migration to React Native.

## The Vision

Instagram started as an app helping people create beautiful photos in seconds with fancy filters. **Beatbite does the same for music.**

A kid with a cheap Android phone in Sri Lanka could be discovered as the next Michael Jackson.

## How It Works

1. **Connect headphones** - Required for real-time feedback
2. **Open the app** - Dark, minimal interface
3. **Touch and hold** - Start listening
4. **Sing or beatbox** - Your voice becomes instruments
5. **Hear instantly** - Real-time audio feedback

## Current Status: Prototype v0.1

Testing audio latency with direct voice passthrough (microphone → headphones).

**Target**: < 15ms latency (imperceptible)

## Getting Started

### Prerequisites

- Node.js 18+
- Modern browser (Chrome recommended)
- Wired headphones (Bluetooth adds latency)

### Installation

```bash
cd Beatbite-React

# Install dependencies
npm install

# Start development server
npm run dev
```

Open [http://spark.local:9020](http://spark.local:9020) in your browser.

### Testing Latency

1. Connect **wired** headphones
2. Open the app in Chrome
3. Touch/click and hold anywhere
4. Speak - you should hear yourself immediately
5. Check the latency display in the top-left

## Tech Stack

| Component | Technology |
|-----------|------------|
| Framework | React 18 + TypeScript |
| Build | Vite |
| State | Zustand |
| Styling | Tailwind CSS |
| Audio | Web Audio API |

## React Native Migration

This codebase is designed for easy conversion to React Native:

- **Zustand store** → Works as-is
- **Types** → Works as-is
- **Components** → Replace HTML with RN primitives
- **AudioEngine** → Replace with native audio modules
- **Tailwind** → Use nativewind

See [CLAUDE.md](./CLAUDE.md) for detailed migration guide.

## Roadmap

- [x] **v0.1** - Audio passthrough test (Web)
- [ ] **v0.2** - Pitch detection
- [ ] **v0.3** - Drum synthesis
- [ ] **v0.4** - Loop recording
- [ ] **v0.5** - React Native port
- [ ] **v1.0** - Full MVP with sharing

## Project Structure

```
src/
├── core/
│   ├── AudioEngine.ts     # Web Audio API wrapper
│   └── store.ts           # Zustand state
├── ui/
│   ├── screens/
│   │   └── PassthroughScreen.tsx
│   └── components/
│       ├── AudioVisualizer.tsx
│       ├── LatencyDisplay.tsx
│       └── VolumeSlider.tsx
└── types/
    └── index.ts
```

## License

Proprietary - All rights reserved
