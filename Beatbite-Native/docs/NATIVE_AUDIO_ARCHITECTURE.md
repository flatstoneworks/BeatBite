# Beatbite Native Audio Architecture

This document outlines the native audio implementation strategy for achieving low-latency real-time audio processing on Android.

## Overview

Web Audio API doesn't exist in React Native. For professional-grade audio performance (<20ms latency), we need native modules that interface directly with Android's audio system.

## Target Latency

| Quality | Latency | User Experience |
|---------|---------|-----------------|
| Excellent | <15ms | Imperceptible, feels instant |
| Good | 15-30ms | Slight delay, acceptable for monitoring |
| Acceptable | 30-50ms | Noticeable but usable |
| Poor | >50ms | Distracting, affects performance |

**Target: <25ms round-trip latency**

## Android Audio APIs

### AAudio (Recommended)
- **Available:** Android 8.1+ (API 27+)
- **Language:** Kotlin/Java or C++ via NDK
- **Latency:** 10-25ms achievable
- **Features:** Exclusive mode, low-latency streams, callback-based

### Oboe (Alternative)
- **Available:** Android 4.1+ (wraps AAudio on 8.1+, OpenSL ES on older)
- **Language:** C++ (NDK required)
- **Latency:** 10-15ms achievable
- **Features:** Automatic fallback, Google-maintained

### AudioTrack/AudioRecord (Legacy)
- **Available:** All Android versions
- **Language:** Kotlin/Java
- **Latency:** 30-100ms typical
- **Use case:** Fallback for older devices

## Architecture

```
┌─────────────────────────────────────────────────────────────┐
│                    React Native (TypeScript)                │
├─────────────────────────────────────────────────────────────┤
│  App.tsx │ Screens │ Components │ store.ts (Zustand)        │
│                         │                                   │
│                   AudioBridge.ts                            │
│              (NativeModules interface)                      │
└─────────────────────────────────────────────────────────────┘
                          │
                          │ React Native Bridge
                          ▼
┌─────────────────────────────────────────────────────────────┐
│                    Native Module (Kotlin)                   │
├─────────────────────────────────────────────────────────────┤
│                    BeatbiteAudioModule.kt                   │
│              (React Native ↔ Native bridge)                 │
│                          │                                  │
│     ┌────────────────────┼────────────────────┐             │
│     ▼                    ▼                    ▼             │
│ AudioEngine.kt    VoiceProcessor.kt    Synthesizers.kt      │
│ (AAudio setup)    (Effects chain)      (Drums/Bass/Guitar)  │
│     │                    │                    │             │
│     └────────────────────┴────────────────────┘             │
│                          │                                  │
│                    AudioGraph.kt                            │
│              (Node-based audio routing)                     │
└─────────────────────────────────────────────────────────────┘
                          │
                          │ AAudio API
                          ▼
┌─────────────────────────────────────────────────────────────┐
│                   Android Audio HAL                         │
│              (Hardware Abstraction Layer)                   │
└─────────────────────────────────────────────────────────────┘
```

## Native Module Structure

```
android/app/src/main/java/com/beatbite/audio/
├── BeatbiteAudioModule.kt      # React Native bridge
├── BeatbiteAudioPackage.kt     # Module registration
├── AudioEngine.kt              # Core AAudio management
├── AudioGraph.kt               # Audio routing/mixing
├── processors/
│   ├── VoiceProcessor.kt       # Microphone → effects → output
│   ├── ReverbProcessor.kt      # Convolution/algorithmic reverb
│   ├── DelayProcessor.kt       # Delay/echo effect
│   ├── ChorusProcessor.kt      # Chorus/modulation
│   └── DistortionProcessor.kt  # Waveshaper distortion
├── synthesizers/
│   ├── DrumSynthesizer.kt      # Kick, snare, hihat synthesis
│   ├── BassSynthesizer.kt      # Bass synthesis
│   └── GuitarSynthesizer.kt    # Guitar synthesis (Karplus-Strong)
└── utils/
    ├── AudioBuffer.kt          # Ring buffer for audio
    └── AudioUtils.kt           # DSP utilities
```

## JavaScript Bridge Interface

The native module exposes methods that mirror the web AudioEngine API:

```typescript
// AudioBridge.ts
import { NativeModules, NativeEventEmitter } from 'react-native';

const { BeatbiteAudio } = NativeModules;
const audioEmitter = new NativeEventEmitter(BeatbiteAudio);

export const AudioBridge = {
  // Initialization
  initialize: (): Promise<boolean> => BeatbiteAudio.initialize(),
  dispose: (): Promise<void> => BeatbiteAudio.dispose(),

  // Permissions
  requestPermission: (): Promise<boolean> => BeatbiteAudio.requestPermission(),

  // Voice passthrough
  startPassthrough: (): Promise<void> => BeatbiteAudio.startPassthrough(),
  stopPassthrough: (): Promise<void> => BeatbiteAudio.stopPassthrough(),

  // Effects
  toggleEffect: (effect: string, enabled: boolean): void =>
    BeatbiteAudio.toggleEffect(effect, enabled),
  setEffectParam: (effect: string, param: string, value: number): void =>
    BeatbiteAudio.setEffectParam(effect, param, value),

  // Synthesizers
  setDrumKit: (kit: string): void => BeatbiteAudio.setDrumKit(kit),
  triggerDrum: (drum: string, velocity: number): void =>
    BeatbiteAudio.triggerDrum(drum, velocity),

  setBassStyle: (style: string): void => BeatbiteAudio.setBassStyle(style),
  triggerBassNote: (frequency: number, velocity: number): void =>
    BeatbiteAudio.triggerBassNote(frequency, velocity),

  setGuitarStyle: (style: string): void => BeatbiteAudio.setGuitarStyle(style),
  triggerGuitarNote: (frequency: number, velocity: number): void =>
    BeatbiteAudio.triggerGuitarNote(frequency, velocity),

  // Detection modes
  setInstrumentMode: (mode: string): void => BeatbiteAudio.setInstrumentMode(mode),
  setBeatboxEnabled: (enabled: boolean): void => BeatbiteAudio.setBeatboxEnabled(enabled),
  setPitchEnabled: (enabled: boolean): void => BeatbiteAudio.setPitchEnabled(enabled),

  // Event listeners
  onLevelChanged: (callback: (level: number) => void) => {
    return audioEmitter.addListener('onLevelChanged', callback);
  },
  onBeatDetected: (callback: (data: { drum: string; velocity: number }) => void) => {
    return audioEmitter.addListener('onBeatDetected', callback);
  },
  onPitchDetected: (callback: (data: { frequency: number; confidence: number }) => void) => {
    return audioEmitter.addListener('onPitchDetected', callback);
  },
  onLatencyMeasured: (callback: (latency: number) => void) => {
    return audioEmitter.addListener('onLatencyMeasured', callback);
  },
};
```

## AAudio Implementation Details

### Stream Configuration

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
            .setBufferCapacityInFrames(256)  // Small buffer = low latency
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
            .setDataCallback(outputCallback)

        inputStream = inputBuilder.build()
        outputStream = outputBuilder.build()

        return inputStream != null && outputStream != null
    }
}
```

### Audio Processing Callback

```kotlin
// Called by AAudio when it needs audio data
private val outputCallback = object : AAudioStreamDataCallback {
    override fun onAudioReady(
        stream: AAudioStream,
        audioData: FloatArray,
        numFrames: Int
    ): Int {
        // 1. Get input samples from ring buffer
        val inputSamples = inputBuffer.read(numFrames)

        // 2. Process through effects chain
        var processed = inputSamples
        if (reverbEnabled) processed = reverbProcessor.process(processed)
        if (delayEnabled) processed = delayProcessor.process(processed)
        if (chorusEnabled) processed = chorusProcessor.process(processed)
        if (distortionEnabled) processed = distortionProcessor.process(processed)

        // 3. Mix with synthesizers
        val drums = drumSynthesizer.render(numFrames)
        val bass = bassSynthesizer.render(numFrames)
        val guitar = guitarSynthesizer.render(numFrames)

        // 4. Final mix to stereo output
        for (i in 0 until numFrames) {
            val mixed = processed[i] + drums[i] + bass[i] + guitar[i]
            audioData[i * 2] = mixed      // Left
            audioData[i * 2 + 1] = mixed  // Right
        }

        return AAUDIO_CALLBACK_RESULT_CONTINUE
    }
}
```

## Effects Implementation

### Reverb (Convolution)

```kotlin
class ReverbProcessor {
    private var impulseResponse: FloatArray = loadImpulseResponse()
    private var convolutionBuffer: FloatArray = FloatArray(impulseResponse.size)

    fun process(input: FloatArray): FloatArray {
        // Simple convolution (for production, use FFT-based)
        val output = FloatArray(input.size)
        for (i in input.indices) {
            convolutionBuffer[i % convolutionBuffer.size] = input[i]
            var sum = 0f
            for (j in impulseResponse.indices) {
                val bufferIndex = (i - j + convolutionBuffer.size) % convolutionBuffer.size
                sum += convolutionBuffer[bufferIndex] * impulseResponse[j]
            }
            output[i] = input[i] * (1 - mix) + sum * mix
        }
        return output
    }
}
```

### Delay

```kotlin
class DelayProcessor {
    private val maxDelaySamples = 48000  // 1 second at 48kHz
    private val delayBuffer = FloatArray(maxDelaySamples)
    private var writeIndex = 0

    var delayTime = 0.3f  // seconds
    var feedback = 0.4f
    var mix = 0.5f

    fun process(input: FloatArray): FloatArray {
        val output = FloatArray(input.size)
        val delaySamples = (delayTime * 48000).toInt()

        for (i in input.indices) {
            val readIndex = (writeIndex - delaySamples + maxDelaySamples) % maxDelaySamples
            val delayed = delayBuffer[readIndex]

            output[i] = input[i] * (1 - mix) + delayed * mix
            delayBuffer[writeIndex] = input[i] + delayed * feedback

            writeIndex = (writeIndex + 1) % maxDelaySamples
        }
        return output
    }
}
```

## Synthesizer Implementation

### Drum Synthesizer (808-style Kick)

```kotlin
class DrumSynthesizer {
    fun triggerKick(velocity: Float) {
        // Pitch envelope: start high, sweep down
        val startFreq = 150f
        val endFreq = 55f
        val pitchDecay = 0.05f  // 50ms

        // Amplitude envelope
        val attack = 0.005f
        val decay = 0.3f

        // Queue the drum hit
        activeKicks.add(KickVoice(startFreq, endFreq, pitchDecay, attack, decay, velocity))
    }

    fun render(numFrames: Int): FloatArray {
        val output = FloatArray(numFrames)

        for (kick in activeKicks) {
            for (i in 0 until numFrames) {
                // Calculate current frequency (exponential sweep)
                val freq = kick.startFreq * exp(-kick.time / kick.pitchDecay) + kick.endFreq

                // Generate sine wave
                val sample = sin(kick.phase * 2 * PI).toFloat()
                kick.phase += freq / 48000f

                // Apply envelope
                val envelope = if (kick.time < kick.attack) {
                    kick.time / kick.attack
                } else {
                    exp(-(kick.time - kick.attack) / kick.decay)
                }

                output[i] += sample * envelope * kick.velocity
                kick.time += 1f / 48000f
            }
        }

        // Remove finished kicks
        activeKicks.removeAll { it.time > 1f }

        return output
    }
}
```

## Performance Optimization Tips

1. **Avoid allocations in audio callback**
   - Pre-allocate all buffers
   - Use object pools for voice allocation

2. **Use SIMD where possible**
   - Android NDK provides NEON intrinsics
   - Process samples in batches of 4

3. **Keep callback fast**
   - Target < 1ms processing time
   - Move heavy work to separate thread

4. **Buffer sizing**
   - 256 frames at 48kHz = 5.3ms
   - Total round-trip ≈ 2 × buffer + hardware latency

5. **Exclusive mode**
   - Use `AAUDIO_SHARING_MODE_EXCLUSIVE` for lowest latency
   - Fall back to shared mode if exclusive fails

## Testing Latency

```kotlin
// Measure round-trip latency with a click test
fun measureLatency() {
    // 1. Play a click through output
    // 2. Record through input
    // 3. Cross-correlate to find delay
    // 4. Report to JS via event
}
```

## Resources

- [AAudio Documentation](https://developer.android.com/ndk/guides/audio/aaudio/aaudio)
- [Oboe GitHub](https://github.com/google/oboe)
- [Android High-Performance Audio](https://developer.android.com/games/sdk/oboe)
- [Audio Latency Guidelines](https://source.android.com/docs/core/audio/latency)

## Implementation Phases

### Phase 1: Basic Passthrough
- [ ] Set up AAudio streams
- [ ] Implement basic mic → speaker passthrough
- [ ] Measure and display latency

### Phase 2: Effects Chain
- [ ] Implement gain control
- [ ] Add reverb effect
- [ ] Add delay effect
- [ ] Add chorus effect
- [ ] Add distortion effect

### Phase 3: Synthesizers
- [ ] Drum synthesizer (kick, snare, hihat)
- [ ] Bass synthesizer
- [ ] Guitar synthesizer

### Phase 4: Detection
- [ ] Beatbox detection (FFT + energy analysis)
- [ ] Pitch detection (autocorrelation or YIN)

### Phase 5: Recording
- [ ] Loop recording with quantization
- [ ] Multi-track mixing
- [ ] Export to audio file
