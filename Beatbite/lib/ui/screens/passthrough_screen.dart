import 'dart:async';
import 'package:flutter/material.dart';
import 'package:provider/provider.dart';
import 'package:permission_handler/permission_handler.dart';

import '../../core/audio_engine.dart';
import '../../core/app_state.dart';
import '../widgets/audio_visualizer.dart';
import '../widgets/latency_display.dart';
import '../widgets/volume_slider.dart';

/// PassthroughScreen is the main screen for Prototype v0.1.
///
/// Tests audio latency by:
/// 1. Capturing microphone input
/// 2. Passing it directly to headphone output
/// 3. Measuring and displaying the latency
///
/// User interaction:
/// - Touch screen to start passthrough
/// - Release to stop
/// - Slide up/down on right edge to adjust volume
class PassthroughScreen extends StatefulWidget {
  const PassthroughScreen({super.key});

  @override
  State<PassthroughScreen> createState() => _PassthroughScreenState();
}

class _PassthroughScreenState extends State<PassthroughScreen>
    with TickerProviderStateMixin {
  late AudioEngine _audioEngine;
  late AppState _appState;

  bool _hasPermission = false;
  bool _isInitializing = false;
  String? _errorMessage;
  bool _showInstructions = true;

  late AnimationController _pulseController;
  late Animation<double> _pulseAnimation;

  @override
  void initState() {
    super.initState();

    _pulseController = AnimationController(
      vsync: this,
      duration: const Duration(milliseconds: 1500),
    )..repeat(reverse: true);

    _pulseAnimation = Tween<double>(begin: 0.5, end: 1.0).animate(
      CurvedAnimation(parent: _pulseController, curve: Curves.easeInOut),
    );

    _initializeAudio();
  }

  @override
  void didChangeDependencies() {
    super.didChangeDependencies();
    _audioEngine = context.read<AudioEngine>();
    _appState = context.watch<AppState>();
  }

  @override
  void dispose() {
    _pulseController.dispose();
    _audioEngine.dispose();
    super.dispose();
  }

  Future<void> _initializeAudio() async {
    setState(() {
      _isInitializing = true;
      _errorMessage = null;
    });

    // Request microphone permission
    final status = await Permission.microphone.request();
    if (status != PermissionStatus.granted) {
      setState(() {
        _errorMessage = 'Microphone permission is required';
        _isInitializing = false;
      });
      return;
    }

    _hasPermission = true;

    // Initialize audio engine
    _audioEngine.onLatencyMeasured = (latency) {
      _appState.setLatency(latency);
    };

    _audioEngine.onLevelChanged = (level) {
      _appState.setInputLevel(level);
    };

    _audioEngine.onError = (error) {
      setState(() {
        _errorMessage = error;
      });
    };

    final initialized = await _audioEngine.initialize();
    if (!initialized) {
      setState(() {
        _errorMessage = 'Failed to initialize audio engine';
      });
    }

    setState(() {
      _isInitializing = false;
    });
  }

  Future<void> _startPassthrough() async {
    if (!_hasPermission || _isInitializing) return;

    setState(() {
      _showInstructions = false;
    });

    final success = await _audioEngine.startPassthrough();
    _appState.setPassthroughActive(success);
  }

  Future<void> _stopPassthrough() async {
    await _audioEngine.stopPassthrough();
    _appState.setPassthroughActive(false);
  }

  Future<void> _measureLatency() async {
    final latency = await _audioEngine.measureLatency();
    if (latency >= 0) {
      _appState.setLatency(latency);
    }
  }

  @override
  Widget build(BuildContext context) {
    return Scaffold(
      backgroundColor: Colors.black,
      body: SafeArea(
        child: Stack(
          children: [
            // Main touch area
            GestureDetector(
              onTapDown: (_) => _startPassthrough(),
              onTapUp: (_) => _stopPassthrough(),
              onTapCancel: _stopPassthrough,
              onLongPressStart: (_) => _startPassthrough(),
              onLongPressEnd: (_) => _stopPassthrough(),
              child: Container(
                color: Colors.black,
                child: Center(
                  child: _buildMainContent(),
                ),
              ),
            ),

            // Volume slider on right edge
            Positioned(
              right: 16,
              top: 100,
              bottom: 100,
              child: VolumeSlider(
                value: _appState.outputVolume,
                onChanged: (value) {
                  _appState.setOutputVolume(value);
                  _audioEngine.setOutputVolume(value);
                },
              ),
            ),

            // Latency display at top
            Positioned(
              top: 20,
              left: 20,
              child: LatencyDisplay(latencyMs: _appState.latencyMs),
            ),

            // Measure latency button
            Positioned(
              top: 20,
              right: 80,
              child: IconButton(
                icon: const Icon(Icons.speed, color: Colors.white54),
                onPressed: _measureLatency,
                tooltip: 'Measure latency',
              ),
            ),

            // Audio level indicator at bottom
            if (_appState.isPassthroughActive)
              Positioned(
                bottom: 40,
                left: 40,
                right: 40,
                child: AudioVisualizer(
                  level: _appState.inputLevel,
                  isActive: _appState.isPassthroughActive,
                ),
              ),
          ],
        ),
      ),
    );
  }

  Widget _buildMainContent() {
    if (_isInitializing) {
      return Column(
        mainAxisAlignment: MainAxisAlignment.center,
        children: [
          const CircularProgressIndicator(
            color: Colors.deepPurple,
          ),
          const SizedBox(height: 24),
          Text(
            'Initializing audio...',
            style: TextStyle(
              color: Colors.white.withOpacity(0.7),
              fontSize: 16,
            ),
          ),
        ],
      );
    }

    if (_errorMessage != null) {
      return Column(
        mainAxisAlignment: MainAxisAlignment.center,
        children: [
          Icon(
            Icons.error_outline,
            color: Colors.red.shade400,
            size: 64,
          ),
          const SizedBox(height: 24),
          Text(
            _errorMessage!,
            style: TextStyle(
              color: Colors.red.shade400,
              fontSize: 16,
            ),
            textAlign: TextAlign.center,
          ),
          const SizedBox(height: 24),
          TextButton(
            onPressed: _initializeAudio,
            child: const Text(
              'Retry',
              style: TextStyle(color: Colors.deepPurple),
            ),
          ),
        ],
      );
    }

    if (!_hasPermission) {
      return Column(
        mainAxisAlignment: MainAxisAlignment.center,
        children: [
          Icon(
            Icons.mic_off,
            color: Colors.white.withOpacity(0.5),
            size: 64,
          ),
          const SizedBox(height: 24),
          Text(
            'Microphone permission required',
            style: TextStyle(
              color: Colors.white.withOpacity(0.7),
              fontSize: 16,
            ),
          ),
          const SizedBox(height: 24),
          ElevatedButton(
            onPressed: () => openAppSettings(),
            style: ElevatedButton.styleFrom(
              backgroundColor: Colors.deepPurple,
            ),
            child: const Text('Open Settings'),
          ),
        ],
      );
    }

    if (_appState.isPassthroughActive) {
      return _buildActiveState();
    }

    return _buildInactiveState();
  }

  Widget _buildInactiveState() {
    return AnimatedBuilder(
      animation: _pulseAnimation,
      builder: (context, child) {
        return Column(
          mainAxisAlignment: MainAxisAlignment.center,
          children: [
            Container(
              width: 120 * _pulseAnimation.value,
              height: 120 * _pulseAnimation.value,
              decoration: BoxDecoration(
                shape: BoxShape.circle,
                border: Border.all(
                  color: Colors.deepPurple.withOpacity(0.3),
                  width: 2,
                ),
              ),
              child: Center(
                child: Icon(
                  Icons.mic,
                  color: Colors.white.withOpacity(0.5),
                  size: 48,
                ),
              ),
            ),
            const SizedBox(height: 48),
            if (_showInstructions)
              Column(
                children: [
                  Text(
                    'TOUCH & HOLD TO LISTEN',
                    style: TextStyle(
                      color: Colors.white.withOpacity(0.5),
                      fontSize: 14,
                      letterSpacing: 2,
                      fontWeight: FontWeight.w300,
                    ),
                  ),
                  const SizedBox(height: 16),
                  Text(
                    'Plug in your headset first',
                    style: TextStyle(
                      color: Colors.white.withOpacity(0.3),
                      fontSize: 12,
                    ),
                  ),
                ],
              ),
          ],
        );
      },
    );
  }

  Widget _buildActiveState() {
    return Column(
      mainAxisAlignment: MainAxisAlignment.center,
      children: [
        Container(
          width: 160,
          height: 160,
          decoration: BoxDecoration(
            shape: BoxShape.circle,
            color: Colors.deepPurple.withOpacity(0.3),
            boxShadow: [
              BoxShadow(
                color: Colors.deepPurple.withOpacity(0.5),
                blurRadius: 30,
                spreadRadius: 10,
              ),
            ],
          ),
          child: const Center(
            child: Icon(
              Icons.mic,
              color: Colors.white,
              size: 64,
            ),
          ),
        ),
        const SizedBox(height: 48),
        Text(
          'LISTENING',
          style: TextStyle(
            color: Colors.deepPurple.shade200,
            fontSize: 18,
            letterSpacing: 4,
            fontWeight: FontWeight.w500,
          ),
        ),
        const SizedBox(height: 8),
        Text(
          'Your voice → Headphones',
          style: TextStyle(
            color: Colors.white.withOpacity(0.4),
            fontSize: 12,
          ),
        ),
      ],
    );
  }
}
