import 'package:flutter/material.dart';

/// LatencyDisplay shows the measured audio latency.
///
/// Colors indicate latency quality:
/// - Green: < 15ms (imperceptible)
/// - Yellow: 15-50ms (acceptable)
/// - Orange: 50-100ms (noticeable but usable)
/// - Red: > 100ms (problematic)
class LatencyDisplay extends StatelessWidget {
  final double latencyMs;

  const LatencyDisplay({
    super.key,
    required this.latencyMs,
  });

  Color get _latencyColor {
    if (latencyMs <= 0) return Colors.white.withOpacity(0.3);
    if (latencyMs < 15) return Colors.green.shade400;
    if (latencyMs < 50) return Colors.yellow.shade600;
    if (latencyMs < 100) return Colors.orange.shade400;
    return Colors.red.shade400;
  }

  String get _latencyLabel {
    if (latencyMs <= 0) return '-- ms';
    return '${latencyMs.toStringAsFixed(1)} ms';
  }

  String get _qualityLabel {
    if (latencyMs <= 0) return 'Tap speed icon to measure';
    if (latencyMs < 15) return 'Excellent';
    if (latencyMs < 50) return 'Good';
    if (latencyMs < 100) return 'Acceptable';
    return 'High latency';
  }

  @override
  Widget build(BuildContext context) {
    return Container(
      padding: const EdgeInsets.symmetric(horizontal: 16, vertical: 12),
      decoration: BoxDecoration(
        color: Colors.white.withOpacity(0.05),
        borderRadius: BorderRadius.circular(12),
        border: Border.all(
          color: _latencyColor.withOpacity(0.3),
          width: 1,
        ),
      ),
      child: Column(
        crossAxisAlignment: CrossAxisAlignment.start,
        mainAxisSize: MainAxisSize.min,
        children: [
          Row(
            mainAxisSize: MainAxisSize.min,
            children: [
              Icon(
                Icons.timer_outlined,
                color: _latencyColor,
                size: 16,
              ),
              const SizedBox(width: 8),
              Text(
                'LATENCY',
                style: TextStyle(
                  color: Colors.white.withOpacity(0.5),
                  fontSize: 10,
                  letterSpacing: 1,
                  fontWeight: FontWeight.w500,
                ),
              ),
            ],
          ),
          const SizedBox(height: 4),
          Row(
            mainAxisSize: MainAxisSize.min,
            crossAxisAlignment: CrossAxisAlignment.baseline,
            textBaseline: TextBaseline.alphabetic,
            children: [
              Text(
                _latencyLabel,
                style: TextStyle(
                  color: _latencyColor,
                  fontSize: 24,
                  fontWeight: FontWeight.w600,
                  fontFeatures: const [FontFeature.tabularFigures()],
                ),
              ),
              const SizedBox(width: 8),
              Text(
                _qualityLabel,
                style: TextStyle(
                  color: _latencyColor.withOpacity(0.7),
                  fontSize: 12,
                ),
              ),
            ],
          ),
        ],
      ),
    );
  }
}

/// Compact latency indicator for use in headers.
class LatencyIndicator extends StatelessWidget {
  final double latencyMs;

  const LatencyIndicator({
    super.key,
    required this.latencyMs,
  });

  Color get _color {
    if (latencyMs <= 0) return Colors.grey;
    if (latencyMs < 15) return Colors.green;
    if (latencyMs < 50) return Colors.yellow.shade700;
    if (latencyMs < 100) return Colors.orange;
    return Colors.red;
  }

  @override
  Widget build(BuildContext context) {
    return Container(
      padding: const EdgeInsets.symmetric(horizontal: 8, vertical: 4),
      decoration: BoxDecoration(
        color: _color.withOpacity(0.2),
        borderRadius: BorderRadius.circular(4),
      ),
      child: Row(
        mainAxisSize: MainAxisSize.min,
        children: [
          Container(
            width: 8,
            height: 8,
            decoration: BoxDecoration(
              color: _color,
              shape: BoxShape.circle,
            ),
          ),
          const SizedBox(width: 6),
          Text(
            latencyMs <= 0 ? '--' : '${latencyMs.toStringAsFixed(0)}ms',
            style: TextStyle(
              color: _color,
              fontSize: 12,
              fontWeight: FontWeight.w600,
            ),
          ),
        ],
      ),
    );
  }
}
