import 'dart:math' as math;
import 'package:flutter/material.dart';

/// AudioVisualizer displays real-time audio levels.
///
/// Shows a horizontal bar that responds to audio input level,
/// providing visual feedback that the audio is being captured.
class AudioVisualizer extends StatelessWidget {
  final double level;
  final bool isActive;
  final int barCount;

  const AudioVisualizer({
    super.key,
    required this.level,
    required this.isActive,
    this.barCount = 20,
  });

  @override
  Widget build(BuildContext context) {
    return Container(
      height: 60,
      decoration: BoxDecoration(
        borderRadius: BorderRadius.circular(8),
        color: Colors.white.withOpacity(0.05),
      ),
      child: ClipRRect(
        borderRadius: BorderRadius.circular(8),
        child: CustomPaint(
          painter: _VisualizerPainter(
            level: level,
            barCount: barCount,
            isActive: isActive,
          ),
          size: Size.infinite,
        ),
      ),
    );
  }
}

class _VisualizerPainter extends CustomPainter {
  final double level;
  final int barCount;
  final bool isActive;

  _VisualizerPainter({
    required this.level,
    required this.barCount,
    required this.isActive,
  });

  @override
  void paint(Canvas canvas, Size size) {
    if (!isActive) return;

    final barWidth = size.width / barCount;
    final gap = 2.0;
    final effectiveBarWidth = barWidth - gap;

    final random = math.Random(42); // Fixed seed for consistent pattern

    for (int i = 0; i < barCount; i++) {
      // Create varied heights based on level and position
      final centerDistance = (i - barCount / 2).abs() / (barCount / 2);
      final baseHeight = (1.0 - centerDistance * 0.5) * level;
      final variation = random.nextDouble() * 0.3;
      final height = (baseHeight + variation * level).clamp(0.05, 1.0);

      final barHeight = height * size.height * 0.8;
      final x = i * barWidth + gap / 2;
      final y = (size.height - barHeight) / 2;

      // Color gradient based on level
      final color = _getBarColor(height);

      final paint = Paint()
        ..color = color
        ..style = PaintingStyle.fill;

      final rect = RRect.fromRectAndRadius(
        Rect.fromLTWH(x, y, effectiveBarWidth, barHeight),
        const Radius.circular(2),
      );

      canvas.drawRRect(rect, paint);
    }
  }

  Color _getBarColor(double height) {
    if (height < 0.3) {
      return Colors.deepPurple.shade400;
    } else if (height < 0.6) {
      return Colors.purple.shade300;
    } else if (height < 0.85) {
      return Colors.purpleAccent;
    } else {
      return Colors.pinkAccent;
    }
  }

  @override
  bool shouldRepaint(_VisualizerPainter oldDelegate) {
    return oldDelegate.level != level || oldDelegate.isActive != isActive;
  }
}

/// WaveformVisualizer shows a waveform-style visualization.
class WaveformVisualizer extends StatefulWidget {
  final double level;
  final bool isActive;

  const WaveformVisualizer({
    super.key,
    required this.level,
    required this.isActive,
  });

  @override
  State<WaveformVisualizer> createState() => _WaveformVisualizerState();
}

class _WaveformVisualizerState extends State<WaveformVisualizer>
    with SingleTickerProviderStateMixin {
  late AnimationController _animationController;

  @override
  void initState() {
    super.initState();
    _animationController = AnimationController(
      vsync: this,
      duration: const Duration(seconds: 2),
    )..repeat();
  }

  @override
  void dispose() {
    _animationController.dispose();
    super.dispose();
  }

  @override
  Widget build(BuildContext context) {
    return AnimatedBuilder(
      animation: _animationController,
      builder: (context, child) {
        return CustomPaint(
          painter: _WaveformPainter(
            level: widget.level,
            isActive: widget.isActive,
            phase: _animationController.value,
          ),
          size: const Size(double.infinity, 60),
        );
      },
    );
  }
}

class _WaveformPainter extends CustomPainter {
  final double level;
  final bool isActive;
  final double phase;

  _WaveformPainter({
    required this.level,
    required this.isActive,
    required this.phase,
  });

  @override
  void paint(Canvas canvas, Size size) {
    if (!isActive) return;

    final paint = Paint()
      ..color = Colors.deepPurple.shade300
      ..style = PaintingStyle.stroke
      ..strokeWidth = 2;

    final path = Path();
    final centerY = size.height / 2;

    path.moveTo(0, centerY);

    for (double x = 0; x < size.width; x++) {
      final normalizedX = x / size.width;
      final waveY = math.sin((normalizedX + phase) * 4 * math.pi) *
                    level * size.height * 0.4;
      path.lineTo(x, centerY + waveY);
    }

    canvas.drawPath(path, paint);
  }

  @override
  bool shouldRepaint(_WaveformPainter oldDelegate) {
    return oldDelegate.level != level ||
           oldDelegate.isActive != isActive ||
           oldDelegate.phase != phase;
  }
}
