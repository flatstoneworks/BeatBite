package com.beatbite.app

import io.flutter.embedding.android.FlutterActivity
import io.flutter.embedding.engine.FlutterEngine
import io.flutter.plugin.common.MethodChannel

class MainActivity: FlutterActivity() {
    private val CHANNEL = "com.beatbite/audio"
    private var audioEngine: AudioEngine? = null

    override fun configureFlutterEngine(flutterEngine: FlutterEngine) {
        super.configureFlutterEngine(flutterEngine)

        audioEngine = AudioEngine(this)

        MethodChannel(flutterEngine.dartExecutor.binaryMessenger, CHANNEL).setMethodCallHandler { call, result ->
            when (call.method) {
                "initialize" -> {
                    val sampleRate = call.argument<Int>("sampleRate") ?: 48000
                    val bufferSize = call.argument<Int>("bufferSize") ?: 256
                    val channels = call.argument<Int>("channels") ?: 1

                    val success = audioEngine?.initialize(sampleRate, bufferSize, channels) ?: false
                    result.success(success)
                }

                "startPassthrough" -> {
                    val success = audioEngine?.startPassthrough() ?: false
                    result.success(success)
                }

                "stopPassthrough" -> {
                    audioEngine?.stopPassthrough()
                    result.success(null)
                }

                "measureLatency" -> {
                    val latency = audioEngine?.measureLatency() ?: -1.0
                    result.success(latency)
                }

                "setInputGain" -> {
                    val gain = call.argument<Double>("gain") ?: 1.0
                    audioEngine?.setInputGain(gain.toFloat())
                    result.success(null)
                }

                "setOutputVolume" -> {
                    val volume = call.argument<Double>("volume") ?: 1.0
                    audioEngine?.setOutputVolume(volume.toFloat())
                    result.success(null)
                }

                "dispose" -> {
                    audioEngine?.dispose()
                    result.success(null)
                }

                else -> {
                    result.notImplemented()
                }
            }
        }
    }

    override fun onDestroy() {
        audioEngine?.dispose()
        super.onDestroy()
    }
}
