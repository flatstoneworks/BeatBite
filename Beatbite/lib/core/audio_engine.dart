import 'dart:async';
import 'package:flutter/services.dart';
import 'package:audio_session/audio_session.dart';

/// AudioEngine handles low-latency audio passthrough and processing.
///
/// Prototype v0.1: Tests audio latency by passing microphone input
/// directly to headphone output with minimal processing.
///
/// Target latency: < 15ms (imperceptible to most users)
/// Maximum acceptable: < 100ms (per spec)
class AudioEngine {
  static const MethodChannel _channel = MethodChannel('com.beatbite/audio');

  bool _isInitialized = false;
  bool _isPassthroughActive = false;
  double _currentLatency = 0.0;

  // Callbacks for UI updates
  Function(double)? onLatencyMeasured;
  Function(double)? onLevelChanged;
  Function(String)? onError;

  bool get isInitialized => _isInitialized;
  bool get isPassthroughActive => _isPassthroughActive;
  double get currentLatency => _currentLatency;

  /// Initialize the audio engine with optimal settings for low latency.
  Future<bool> initialize() async {
    if (_isInitialized) return true;

    try {
      // Configure audio session for low-latency playback and recording
      final session = await AudioSession.instance;
      await session.configure(AudioSessionConfiguration(
        avAudioSessionCategory: AVAudioSessionCategory.playAndRecord,
        avAudioSessionCategoryOptions:
            AVAudioSessionCategoryOptions.defaultToSpeaker |
            AVAudioSessionCategoryOptions.allowBluetooth |
            AVAudioSessionCategoryOptions.allowBluetoothA2DP,
        avAudioSessionMode: AVAudioSessionMode.measurement,
        avAudioSessionRouteSharingPolicy:
            AVAudioSessionRouteSharingPolicy.defaultPolicy,
        avAudioSessionSetActiveOptions: AVAudioSessionSetActiveOptions.none,
        androidAudioAttributes: const AndroidAudioAttributes(
          contentType: AndroidAudioContentType.music,
          usage: AndroidAudioUsage.media,
          flags: AndroidAudioFlags.audibilityEnforced,
        ),
        androidAudioFocusGainType: AndroidAudioFocusGainType.gain,
        androidWillPauseWhenDucked: true,
      ));

      // Initialize native audio engine
      final result = await _channel.invokeMethod<bool>('initialize', {
        'sampleRate': 48000,
        'bufferSize': 256, // Low buffer for minimal latency
        'channels': 1,     // Mono for voice input
      });

      _isInitialized = result ?? false;

      // Set up method call handler for callbacks from native code
      _channel.setMethodCallHandler(_handleMethodCall);

      return _isInitialized;
    } catch (e) {
      onError?.call('Failed to initialize audio engine: $e');
      return false;
    }
  }

  /// Handle callbacks from native audio code.
  Future<dynamic> _handleMethodCall(MethodCall call) async {
    switch (call.method) {
      case 'onLatencyMeasured':
        _currentLatency = call.arguments as double;
        onLatencyMeasured?.call(_currentLatency);
        break;
      case 'onLevelChanged':
        onLevelChanged?.call(call.arguments as double);
        break;
      case 'onError':
        onError?.call(call.arguments as String);
        break;
    }
  }

  /// Start audio passthrough (microphone → headphones).
  /// This is the core test for Prototype v0.1.
  Future<bool> startPassthrough() async {
    if (!_isInitialized) {
      final initialized = await initialize();
      if (!initialized) return false;
    }

    try {
      final result = await _channel.invokeMethod<bool>('startPassthrough');
      _isPassthroughActive = result ?? false;
      return _isPassthroughActive;
    } catch (e) {
      onError?.call('Failed to start passthrough: $e');
      return false;
    }
  }

  /// Stop audio passthrough.
  Future<void> stopPassthrough() async {
    try {
      await _channel.invokeMethod('stopPassthrough');
      _isPassthroughActive = false;
    } catch (e) {
      onError?.call('Failed to stop passthrough: $e');
    }
  }

  /// Measure round-trip latency using a test tone.
  Future<double> measureLatency() async {
    try {
      final latency = await _channel.invokeMethod<double>('measureLatency');
      _currentLatency = latency ?? 0.0;
      return _currentLatency;
    } catch (e) {
      onError?.call('Failed to measure latency: $e');
      return -1.0;
    }
  }

  /// Set the audio input gain (0.0 to 1.0).
  Future<void> setInputGain(double gain) async {
    await _channel.invokeMethod('setInputGain', {'gain': gain.clamp(0.0, 1.0)});
  }

  /// Set the output volume (0.0 to 1.0).
  Future<void> setOutputVolume(double volume) async {
    await _channel.invokeMethod('setOutputVolume', {'volume': volume.clamp(0.0, 1.0)});
  }

  /// Release all audio resources.
  Future<void> dispose() async {
    await stopPassthrough();
    await _channel.invokeMethod('dispose');
    _isInitialized = false;
  }
}
