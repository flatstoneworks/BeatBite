package com.beatbite.app

import android.content.Context
import android.media.AudioAttributes
import android.media.AudioFormat
import android.media.AudioManager
import android.media.AudioRecord
import android.media.AudioTrack
import android.media.MediaRecorder
import android.util.Log
import java.util.concurrent.atomic.AtomicBoolean
import kotlin.concurrent.thread

/**
 * AudioEngine handles low-latency audio passthrough for Beatbite.
 *
 * Prototype v0.1: Tests audio latency by passing microphone input
 * directly to headphone output with minimal processing.
 *
 * Uses Android's AudioRecord and AudioTrack with the smallest possible
 * buffer sizes to minimize latency.
 *
 * For production, consider using Oboe library for even lower latency:
 * https://github.com/google/oboe
 */
class AudioEngine(private val context: Context) {

    companion object {
        private const val TAG = "BeatbiteAudioEngine"
    }

    // Audio configuration
    private var sampleRate = 48000
    private var bufferSize = 256
    private var channels = 1

    // Audio objects
    private var audioRecord: AudioRecord? = null
    private var audioTrack: AudioTrack? = null

    // State
    private val isRunning = AtomicBoolean(false)
    private var passthroughThread: Thread? = null

    // Volume controls
    private var inputGain = 1.0f
    private var outputVolume = 0.8f

    // Latency measurement
    private var measuredLatency = 0.0

    /**
     * Initialize the audio engine with specified parameters.
     */
    fun initialize(sampleRate: Int, bufferSize: Int, channels: Int): Boolean {
        this.sampleRate = sampleRate
        this.bufferSize = bufferSize
        this.channels = channels

        return try {
            // Set up low-latency audio mode
            val audioManager = context.getSystemService(Context.AUDIO_SERVICE) as AudioManager

            // Check if low-latency audio is supported
            val hasLowLatency = audioManager.getProperty(AudioManager.PROPERTY_SUPPORT_AUDIO_SOURCE_UNPROCESSED) != null
            Log.d(TAG, "Low-latency audio supported: $hasLowLatency")

            // Get device's native sample rate for optimal performance
            val nativeSampleRate = audioManager.getProperty(AudioManager.PROPERTY_OUTPUT_SAMPLE_RATE)?.toIntOrNull()
            if (nativeSampleRate != null) {
                this.sampleRate = nativeSampleRate
                Log.d(TAG, "Using native sample rate: $nativeSampleRate")
            }

            // Get optimal buffer size
            val framesPerBuffer = audioManager.getProperty(AudioManager.PROPERTY_OUTPUT_FRAMES_PER_BUFFER)?.toIntOrNull()
            if (framesPerBuffer != null) {
                this.bufferSize = framesPerBuffer
                Log.d(TAG, "Using frames per buffer: $framesPerBuffer")
            }

            true
        } catch (e: Exception) {
            Log.e(TAG, "Failed to initialize: ${e.message}")
            false
        }
    }

    /**
     * Start audio passthrough (microphone → headphones).
     */
    fun startPassthrough(): Boolean {
        if (isRunning.get()) {
            return true
        }

        try {
            // Calculate buffer sizes
            val channelConfig = if (channels == 1)
                AudioFormat.CHANNEL_IN_MONO
            else
                AudioFormat.CHANNEL_IN_STEREO

            val channelOutConfig = if (channels == 1)
                AudioFormat.CHANNEL_OUT_MONO
            else
                AudioFormat.CHANNEL_OUT_STEREO

            // Get minimum buffer sizes
            val minRecordBufferSize = AudioRecord.getMinBufferSize(
                sampleRate,
                channelConfig,
                AudioFormat.ENCODING_PCM_16BIT
            )

            val minPlayBufferSize = AudioTrack.getMinBufferSize(
                sampleRate,
                channelOutConfig,
                AudioFormat.ENCODING_PCM_16BIT
            )

            // Use small multiples of minimum for low latency
            val recordBufferSize = minRecordBufferSize
            val playBufferSize = minPlayBufferSize

            Log.d(TAG, "Record buffer: $recordBufferSize, Play buffer: $playBufferSize")

            // Create AudioRecord
            audioRecord = AudioRecord(
                MediaRecorder.AudioSource.VOICE_COMMUNICATION, // Low latency source
                sampleRate,
                channelConfig,
                AudioFormat.ENCODING_PCM_16BIT,
                recordBufferSize
            )

            if (audioRecord?.state != AudioRecord.STATE_INITIALIZED) {
                Log.e(TAG, "Failed to initialize AudioRecord")
                return false
            }

            // Create AudioTrack with low-latency attributes
            val audioAttributes = AudioAttributes.Builder()
                .setUsage(AudioAttributes.USAGE_MEDIA)
                .setContentType(AudioAttributes.CONTENT_TYPE_MUSIC)
                .setFlags(AudioAttributes.FLAG_LOW_LATENCY)
                .build()

            val audioFormat = AudioFormat.Builder()
                .setSampleRate(sampleRate)
                .setChannelMask(channelOutConfig)
                .setEncoding(AudioFormat.ENCODING_PCM_16BIT)
                .build()

            audioTrack = AudioTrack(
                audioAttributes,
                audioFormat,
                playBufferSize,
                AudioTrack.MODE_STREAM,
                AudioManager.AUDIO_SESSION_ID_GENERATE
            )

            if (audioTrack?.state != AudioTrack.STATE_INITIALIZED) {
                Log.e(TAG, "Failed to initialize AudioTrack")
                audioRecord?.release()
                return false
            }

            // Calculate expected latency
            val recordLatency = (recordBufferSize.toDouble() / sampleRate) * 1000
            val playLatency = (playBufferSize.toDouble() / sampleRate) * 1000
            measuredLatency = recordLatency + playLatency
            Log.d(TAG, "Estimated latency: $measuredLatency ms")

            // Start audio
            isRunning.set(true)
            audioRecord?.startRecording()
            audioTrack?.play()

            // Start passthrough thread
            passthroughThread = thread(name = "BeatbitePassthrough") {
                runPassthrough(minOf(recordBufferSize, playBufferSize) / 2)
            }

            return true

        } catch (e: Exception) {
            Log.e(TAG, "Failed to start passthrough: ${e.message}")
            e.printStackTrace()
            stopPassthrough()
            return false
        }
    }

    /**
     * Main passthrough loop - reads from mic and writes to speaker.
     */
    private fun runPassthrough(bufferSize: Int) {
        val buffer = ShortArray(bufferSize)

        Log.d(TAG, "Passthrough started with buffer size: $bufferSize")

        while (isRunning.get()) {
            try {
                // Read from microphone
                val readResult = audioRecord?.read(buffer, 0, bufferSize) ?: -1

                if (readResult > 0) {
                    // Apply input gain
                    if (inputGain != 1.0f) {
                        for (i in 0 until readResult) {
                            buffer[i] = (buffer[i] * inputGain).toInt().coerceIn(-32768, 32767).toShort()
                        }
                    }

                    // Apply output volume
                    if (outputVolume != 1.0f) {
                        for (i in 0 until readResult) {
                            buffer[i] = (buffer[i] * outputVolume).toInt().coerceIn(-32768, 32767).toShort()
                        }
                    }

                    // Write to speaker
                    audioTrack?.write(buffer, 0, readResult)
                }
            } catch (e: Exception) {
                Log.e(TAG, "Passthrough error: ${e.message}")
                break
            }
        }

        Log.d(TAG, "Passthrough stopped")
    }

    /**
     * Stop audio passthrough.
     */
    fun stopPassthrough() {
        isRunning.set(false)

        passthroughThread?.join(1000)
        passthroughThread = null

        audioRecord?.stop()
        audioRecord?.release()
        audioRecord = null

        audioTrack?.stop()
        audioTrack?.release()
        audioTrack = null
    }

    /**
     * Measure round-trip latency using a test tone.
     * Returns latency in milliseconds.
     */
    fun measureLatency(): Double {
        // For now, return estimated latency based on buffer sizes
        // A more accurate measurement would use a test tone and detect it
        return measuredLatency
    }

    /**
     * Set input gain (0.0 to 1.0).
     */
    fun setInputGain(gain: Float) {
        inputGain = gain.coerceIn(0.0f, 2.0f) // Allow slight boost
    }

    /**
     * Set output volume (0.0 to 1.0).
     */
    fun setOutputVolume(volume: Float) {
        outputVolume = volume.coerceIn(0.0f, 1.0f)
    }

    /**
     * Release all resources.
     */
    fun dispose() {
        stopPassthrough()
    }
}
