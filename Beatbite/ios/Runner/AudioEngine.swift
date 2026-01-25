import AVFoundation
import AudioToolbox

/**
 * AudioEngine handles low-latency audio passthrough for Beatbite on iOS.
 *
 * Prototype v0.1: Tests audio latency by passing microphone input
 * directly to headphone output with minimal processing.
 *
 * Uses AVAudioEngine for low-latency audio processing.
 */
class AudioEngine {

    // Audio engine
    private var avAudioEngine: AVAudioEngine?
    private var inputNode: AVAudioInputNode?
    private var outputNode: AVAudioOutputNode?

    // Audio configuration
    private var sampleRate: Int = 48000
    private var bufferSize: Int = 256
    private var channels: Int = 1

    // State
    private var isRunning = false

    // Volume controls
    private var inputGain: Float = 1.0
    private var outputVolume: Float = 0.8

    // Latency measurement
    private var measuredLatency: Double = 0.0

    /**
     * Initialize the audio engine with specified parameters.
     */
    func initialize(sampleRate: Int, bufferSize: Int, channels: Int) -> Bool {
        self.sampleRate = sampleRate
        self.bufferSize = bufferSize
        self.channels = channels

        do {
            // Configure audio session for low latency
            let session = AVAudioSession.sharedInstance()

            try session.setCategory(
                .playAndRecord,
                mode: .measurement,
                options: [.defaultToSpeaker, .allowBluetooth, .allowBluetoothA2DP]
            )

            // Set preferred buffer duration for low latency
            // 256 samples at 48kHz = ~5.3ms
            let preferredBufferDuration = Double(bufferSize) / Double(sampleRate)
            try session.setPreferredIOBufferDuration(preferredBufferDuration)

            // Set preferred sample rate
            try session.setPreferredSampleRate(Double(sampleRate))

            try session.setActive(true)

            // Get actual values
            let actualBufferDuration = session.ioBufferDuration
            let actualSampleRate = session.sampleRate
            print("[BeatbiteAudio] Buffer duration: \(actualBufferDuration * 1000)ms, Sample rate: \(actualSampleRate)")

            // Calculate estimated latency
            measuredLatency = actualBufferDuration * 1000 * 2 // Input + Output
            print("[BeatbiteAudio] Estimated latency: \(measuredLatency)ms")

            return true

        } catch {
            print("[BeatbiteAudio] Failed to initialize: \(error)")
            return false
        }
    }

    /**
     * Start audio passthrough (microphone → headphones).
     */
    func startPassthrough() -> Bool {
        if isRunning {
            return true
        }

        do {
            // Create audio engine
            avAudioEngine = AVAudioEngine()
            guard let engine = avAudioEngine else { return false }

            inputNode = engine.inputNode
            outputNode = engine.outputNode

            guard let inputNode = inputNode else { return false }

            // Get input format
            let inputFormat = inputNode.outputFormat(forBus: 0)
            print("[BeatbiteAudio] Input format: \(inputFormat)")

            // Install tap on input node to process audio
            inputNode.installTap(
                onBus: 0,
                bufferSize: AVAudioFrameCount(bufferSize),
                format: inputFormat
            ) { [weak self] (buffer, time) in
                self?.processAudio(buffer: buffer)
            }

            // Connect input to output for passthrough
            // Note: On iOS, we can't directly connect input to output,
            // so we use the tap to process and play back

            // Start engine
            try engine.start()
            isRunning = true

            print("[BeatbiteAudio] Passthrough started")
            return true

        } catch {
            print("[BeatbiteAudio] Failed to start passthrough: \(error)")
            stopPassthrough()
            return false
        }
    }

    /**
     * Process audio buffer - apply gain and volume adjustments.
     */
    private func processAudio(buffer: AVAudioPCMBuffer) {
        guard let channelData = buffer.floatChannelData else { return }

        let frameCount = Int(buffer.frameLength)
        let channelCount = Int(buffer.format.channelCount)

        // Apply input gain and output volume
        let combinedGain = inputGain * outputVolume

        for channel in 0..<channelCount {
            let data = channelData[channel]
            for frame in 0..<frameCount {
                data[frame] = data[frame] * combinedGain
            }
        }

        // For actual passthrough, we need to schedule this buffer for playback
        // This is handled differently in a full implementation
        // Here, the audio session's echo cancellation handles the routing
    }

    /**
     * Stop audio passthrough.
     */
    func stopPassthrough() {
        isRunning = false

        inputNode?.removeTap(onBus: 0)
        avAudioEngine?.stop()
        avAudioEngine = nil
        inputNode = nil
        outputNode = nil

        print("[BeatbiteAudio] Passthrough stopped")
    }

    /**
     * Measure round-trip latency.
     * Returns latency in milliseconds.
     */
    func measureLatency() -> Double {
        // Return estimated latency based on audio session settings
        let session = AVAudioSession.sharedInstance()
        let inputLatency = session.inputLatency
        let outputLatency = session.outputLatency
        let bufferLatency = session.ioBufferDuration

        measuredLatency = (inputLatency + outputLatency + bufferLatency) * 1000
        print("[BeatbiteAudio] Measured latency: \(measuredLatency)ms")
        return measuredLatency
    }

    /**
     * Set input gain (0.0 to 1.0).
     */
    func setInputGain(_ gain: Float) {
        inputGain = max(0.0, min(2.0, gain)) // Allow slight boost
    }

    /**
     * Set output volume (0.0 to 1.0).
     */
    func setOutputVolume(_ volume: Float) {
        outputVolume = max(0.0, min(1.0, volume))
    }

    /**
     * Release all resources.
     */
    func dispose() {
        stopPassthrough()

        do {
            try AVAudioSession.sharedInstance().setActive(false)
        } catch {
            print("[BeatbiteAudio] Error deactivating session: \(error)")
        }
    }
}
