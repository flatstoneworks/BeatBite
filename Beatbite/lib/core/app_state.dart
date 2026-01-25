import 'package:flutter/foundation.dart';

/// Application state management for Beatbite.
///
/// Tracks the current mode, recording state, and audio configuration.
class AppState extends ChangeNotifier {
  // Audio state
  bool _isPassthroughActive = false;
  bool _isRecording = false;
  double _inputLevel = 0.0;
  double _latencyMs = 0.0;

  // Volume controls (0.0 to 1.0)
  double _inputGain = 1.0;
  double _outputVolume = 0.8;

  // Current instrument being recorded
  InstrumentType _currentInstrument = InstrumentType.drums;

  // Recorded loops
  final List<RecordedLoop> _loops = [];

  // Getters
  bool get isPassthroughActive => _isPassthroughActive;
  bool get isRecording => _isRecording;
  double get inputLevel => _inputLevel;
  double get latencyMs => _latencyMs;
  double get inputGain => _inputGain;
  double get outputVolume => _outputVolume;
  InstrumentType get currentInstrument => _currentInstrument;
  List<RecordedLoop> get loops => List.unmodifiable(_loops);

  /// Update passthrough state.
  void setPassthroughActive(bool active) {
    if (_isPassthroughActive != active) {
      _isPassthroughActive = active;
      notifyListeners();
    }
  }

  /// Update recording state.
  void setRecording(bool recording) {
    if (_isRecording != recording) {
      _isRecording = recording;
      notifyListeners();
    }
  }

  /// Update input level (for visualization).
  void setInputLevel(double level) {
    _inputLevel = level.clamp(0.0, 1.0);
    notifyListeners();
  }

  /// Update measured latency.
  void setLatency(double latency) {
    _latencyMs = latency;
    notifyListeners();
  }

  /// Set input gain.
  void setInputGain(double gain) {
    _inputGain = gain.clamp(0.0, 1.0);
    notifyListeners();
  }

  /// Set output volume.
  void setOutputVolume(double volume) {
    _outputVolume = volume.clamp(0.0, 1.0);
    notifyListeners();
  }

  /// Set current instrument for recording.
  void setCurrentInstrument(InstrumentType instrument) {
    if (_currentInstrument != instrument) {
      _currentInstrument = instrument;
      notifyListeners();
    }
  }

  /// Add a recorded loop.
  void addLoop(RecordedLoop loop) {
    _loops.add(loop);
    notifyListeners();
  }

  /// Remove a loop by index.
  void removeLoop(int index) {
    if (index >= 0 && index < _loops.length) {
      _loops.removeAt(index);
      notifyListeners();
    }
  }

  /// Clear all loops.
  void clearLoops() {
    _loops.clear();
    notifyListeners();
  }
}

/// Types of virtual instruments available.
enum InstrumentType {
  drums,
  bass,
  keyboard,
  violin,
  synth,
  vocals,
}

extension InstrumentTypeExtension on InstrumentType {
  String get displayName {
    switch (this) {
      case InstrumentType.drums:
        return 'Drums';
      case InstrumentType.bass:
        return 'Bass';
      case InstrumentType.keyboard:
        return 'Keyboard';
      case InstrumentType.violin:
        return 'Violin';
      case InstrumentType.synth:
        return 'Synth';
      case InstrumentType.vocals:
        return 'Vocals';
    }
  }

  String get icon {
    switch (this) {
      case InstrumentType.drums:
        return '🥁';
      case InstrumentType.bass:
        return '🎸';
      case InstrumentType.keyboard:
        return '🎹';
      case InstrumentType.violin:
        return '🎻';
      case InstrumentType.synth:
        return '🎛️';
      case InstrumentType.vocals:
        return '🎤';
    }
  }
}

/// Represents a recorded loop.
class RecordedLoop {
  final String id;
  final InstrumentType instrument;
  final Duration duration;
  final String filePath;
  final DateTime createdAt;
  double volume;
  double speed;

  RecordedLoop({
    required this.id,
    required this.instrument,
    required this.duration,
    required this.filePath,
    DateTime? createdAt,
    this.volume = 1.0,
    this.speed = 1.0,
  }) : createdAt = createdAt ?? DateTime.now();
}
