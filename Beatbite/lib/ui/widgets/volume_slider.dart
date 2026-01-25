import 'package:flutter/material.dart';

/// VolumeSlider is a vertical slider for adjusting volume.
///
/// Inspired by Netflix's volume control - slide up/down on the right
/// edge of the screen to adjust volume. This follows the user experience
/// principles outlined in the Beatbite spec.
class VolumeSlider extends StatefulWidget {
  final double value;
  final ValueChanged<double> onChanged;
  final double min;
  final double max;

  const VolumeSlider({
    super.key,
    required this.value,
    required this.onChanged,
    this.min = 0.0,
    this.max = 1.0,
  });

  @override
  State<VolumeSlider> createState() => _VolumeSliderState();
}

class _VolumeSliderState extends State<VolumeSlider> {
  bool _isDragging = false;
  double _dragStartValue = 0.0;
  double _dragStartY = 0.0;

  @override
  Widget build(BuildContext context) {
    return GestureDetector(
      onVerticalDragStart: (details) {
        setState(() {
          _isDragging = true;
          _dragStartValue = widget.value;
          _dragStartY = details.localPosition.dy;
        });
      },
      onVerticalDragUpdate: (details) {
        // Calculate new value based on drag distance
        // Moving up increases volume, moving down decreases
        final dragDistance = _dragStartY - details.localPosition.dy;
        final sensitivity = 0.005; // Adjust for desired sensitivity
        final newValue = (_dragStartValue + dragDistance * sensitivity)
            .clamp(widget.min, widget.max);
        widget.onChanged(newValue);
      },
      onVerticalDragEnd: (_) {
        setState(() {
          _isDragging = false;
        });
      },
      child: AnimatedContainer(
        duration: const Duration(milliseconds: 150),
        width: _isDragging ? 50 : 40,
        decoration: BoxDecoration(
          color: Colors.white.withOpacity(_isDragging ? 0.15 : 0.08),
          borderRadius: BorderRadius.circular(20),
        ),
        child: Column(
          mainAxisAlignment: MainAxisAlignment.center,
          children: [
            // Volume icon
            Icon(
              _getVolumeIcon(),
              color: Colors.white.withOpacity(0.7),
              size: 20,
            ),
            const SizedBox(height: 12),

            // Slider track
            Expanded(
              child: LayoutBuilder(
                builder: (context, constraints) {
                  final trackHeight = constraints.maxHeight - 40;
                  final fillHeight = trackHeight * widget.value;

                  return Stack(
                    alignment: Alignment.bottomCenter,
                    children: [
                      // Track background
                      Container(
                        width: 6,
                        height: trackHeight,
                        decoration: BoxDecoration(
                          color: Colors.white.withOpacity(0.1),
                          borderRadius: BorderRadius.circular(3),
                        ),
                      ),

                      // Fill
                      AnimatedContainer(
                        duration: const Duration(milliseconds: 50),
                        width: 6,
                        height: fillHeight,
                        decoration: BoxDecoration(
                          gradient: LinearGradient(
                            begin: Alignment.bottomCenter,
                            end: Alignment.topCenter,
                            colors: [
                              Colors.deepPurple.shade400,
                              Colors.purple.shade300,
                            ],
                          ),
                          borderRadius: BorderRadius.circular(3),
                        ),
                      ),

                      // Thumb
                      Positioned(
                        bottom: fillHeight - 8,
                        child: AnimatedContainer(
                          duration: const Duration(milliseconds: 50),
                          width: _isDragging ? 18 : 14,
                          height: _isDragging ? 18 : 14,
                          decoration: BoxDecoration(
                            color: Colors.white,
                            shape: BoxShape.circle,
                            boxShadow: [
                              BoxShadow(
                                color: Colors.deepPurple.withOpacity(0.5),
                                blurRadius: 8,
                                spreadRadius: 2,
                              ),
                            ],
                          ),
                        ),
                      ),
                    ],
                  );
                },
              ),
            ),

            const SizedBox(height: 12),

            // Percentage label
            if (_isDragging)
              Container(
                padding: const EdgeInsets.symmetric(horizontal: 8, vertical: 4),
                decoration: BoxDecoration(
                  color: Colors.deepPurple.withOpacity(0.8),
                  borderRadius: BorderRadius.circular(4),
                ),
                child: Text(
                  '${(widget.value * 100).toInt()}%',
                  style: const TextStyle(
                    color: Colors.white,
                    fontSize: 12,
                    fontWeight: FontWeight.w600,
                  ),
                ),
              )
            else
              const SizedBox(height: 24),
          ],
        ),
      ),
    );
  }

  IconData _getVolumeIcon() {
    if (widget.value <= 0) return Icons.volume_off;
    if (widget.value < 0.3) return Icons.volume_mute;
    if (widget.value < 0.7) return Icons.volume_down;
    return Icons.volume_up;
  }
}

/// HorizontalVolumeSlider for use in loop editing.
class HorizontalVolumeSlider extends StatelessWidget {
  final double value;
  final ValueChanged<double> onChanged;
  final String? label;

  const HorizontalVolumeSlider({
    super.key,
    required this.value,
    required this.onChanged,
    this.label,
  });

  @override
  Widget build(BuildContext context) {
    return Column(
      crossAxisAlignment: CrossAxisAlignment.start,
      mainAxisSize: MainAxisSize.min,
      children: [
        if (label != null)
          Padding(
            padding: const EdgeInsets.only(bottom: 8),
            child: Text(
              label!,
              style: TextStyle(
                color: Colors.white.withOpacity(0.6),
                fontSize: 12,
              ),
            ),
          ),
        SliderTheme(
          data: SliderThemeData(
            trackHeight: 4,
            activeTrackColor: Colors.deepPurple.shade400,
            inactiveTrackColor: Colors.white.withOpacity(0.1),
            thumbColor: Colors.white,
            thumbShape: const RoundSliderThumbShape(enabledThumbRadius: 8),
            overlayColor: Colors.deepPurple.withOpacity(0.2),
          ),
          child: Slider(
            value: value,
            onChanged: onChanged,
            min: 0.0,
            max: 1.0,
          ),
        ),
      ],
    );
  }
}
