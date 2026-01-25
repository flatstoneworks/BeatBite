import { View, Text, Pressable } from 'react-native';
import { useAppStore, useSelectedBpm } from '../../core/store';
import { useState, useCallback } from 'react';

// Preset BPM values
const BPM_PRESETS = [
  { label: 'Slow', bpm: 80 },
  { label: 'Medium', bpm: 100 },
  { label: 'Normal', bpm: 120 },
  { label: 'Fast', bpm: 140 },
];

/**
 * TempoSelectorScreen - Select BPM before recording.
 */
export function TempoSelectorScreen() {
  const selectedBpm = useSelectedBpm();
  const { setSelectedBpm, confirmTempo, setGuidedFlowStep, exitGuidedFlow } = useAppStore();
  const [customBpm, setCustomBpm] = useState(selectedBpm);

  const handlePresetSelect = useCallback((bpm: number) => {
    setSelectedBpm(bpm);
    setCustomBpm(bpm);
  }, [setSelectedBpm]);

  const handleIncrement = useCallback(() => {
    const newBpm = Math.min(200, customBpm + 5);
    setCustomBpm(newBpm);
    setSelectedBpm(newBpm);
  }, [customBpm, setSelectedBpm]);

  const handleDecrement = useCallback(() => {
    const newBpm = Math.max(60, customBpm - 5);
    setCustomBpm(newBpm);
    setSelectedBpm(newBpm);
  }, [customBpm, setSelectedBpm]);

  const handleConfirm = useCallback(() => {
    confirmTempo();
    setGuidedFlowStep('setup-drums');
  }, [confirmTempo, setGuidedFlowStep]);

  return (
    <View style={{
      flex: 1,
      backgroundColor: '#050505',
      paddingHorizontal: 24,
    }}>
      {/* Header */}
      <View style={{ alignItems: 'center', marginTop: 48, marginBottom: 32 }}>
        <View style={{
          width: 56,
          height: 56,
          borderRadius: 28,
          backgroundColor: '#0a0a0a',
          borderWidth: 1,
          borderColor: 'rgba(0, 255, 255, 0.3)',
          justifyContent: 'center',
          alignItems: 'center',
          marginBottom: 16,
        }}>
          <Text style={{ fontSize: 24 }}>🎚️</Text>
        </View>
        <Text style={{
          color: '#ffffff',
          fontSize: 18,
          fontWeight: 'bold',
          fontFamily: 'monospace',
          letterSpacing: 2,
        }}>
          SET YOUR TEMPO
        </Text>
        <Text style={{
          color: '#666666',
          fontSize: 12,
          fontFamily: 'monospace',
          marginTop: 4,
        }}>
          Choose the speed for your track
        </Text>
      </View>

      {/* BPM Display */}
      <View style={{
        alignItems: 'center',
        marginBottom: 32,
      }}>
        <View style={{
          flexDirection: 'row',
          alignItems: 'center',
          gap: 24,
        }}>
          {/* Decrement button */}
          <Pressable
            onPress={handleDecrement}
            style={({ pressed }) => ({
              width: 48,
              height: 48,
              borderRadius: 24,
              backgroundColor: pressed ? '#222222' : '#1a1a1a',
              borderWidth: 1,
              borderColor: '#333333',
              justifyContent: 'center',
              alignItems: 'center',
            })}
          >
            <Text style={{ color: '#00ffff', fontSize: 24, fontWeight: 'bold' }}>−</Text>
          </Pressable>

          {/* BPM value */}
          <View style={{ alignItems: 'center' }}>
            <Text style={{
              color: '#00ffff',
              fontSize: 64,
              fontWeight: 'bold',
              fontFamily: 'monospace',
            }}>
              {customBpm}
            </Text>
            <Text style={{
              color: '#666666',
              fontSize: 12,
              fontFamily: 'monospace',
              letterSpacing: 2,
            }}>
              BPM
            </Text>
          </View>

          {/* Increment button */}
          <Pressable
            onPress={handleIncrement}
            style={({ pressed }) => ({
              width: 48,
              height: 48,
              borderRadius: 24,
              backgroundColor: pressed ? '#222222' : '#1a1a1a',
              borderWidth: 1,
              borderColor: '#333333',
              justifyContent: 'center',
              alignItems: 'center',
            })}
          >
            <Text style={{ color: '#00ffff', fontSize: 24, fontWeight: 'bold' }}>+</Text>
          </Pressable>
        </View>
      </View>

      {/* Presets */}
      <View style={{
        flexDirection: 'row',
        flexWrap: 'wrap',
        gap: 12,
        justifyContent: 'center',
        marginBottom: 48,
      }}>
        {BPM_PRESETS.map((preset) => {
          const isSelected = customBpm === preset.bpm;
          return (
            <Pressable
              key={preset.bpm}
              onPress={() => handlePresetSelect(preset.bpm)}
              style={{
                paddingHorizontal: 20,
                paddingVertical: 12,
                borderRadius: 12,
                backgroundColor: isSelected ? 'rgba(0, 255, 255, 0.1)' : '#0a0a0a',
                borderWidth: 1,
                borderColor: isSelected ? '#00ffff' : '#222222',
              }}
            >
              <Text style={{
                color: isSelected ? '#00ffff' : '#888888',
                fontSize: 14,
                fontWeight: 'bold',
                fontFamily: 'monospace',
              }}>
                {preset.label}
              </Text>
              <Text style={{
                color: isSelected ? '#00ffff' : '#666666',
                fontSize: 12,
                fontFamily: 'monospace',
              }}>
                {preset.bpm} BPM
              </Text>
            </Pressable>
          );
        })}
      </View>

      {/* Navigation buttons */}
      <View style={{
        position: 'absolute',
        bottom: 24,
        left: 24,
        right: 24,
        flexDirection: 'row',
        gap: 16,
      }}>
        <Pressable
          onPress={exitGuidedFlow}
          style={{
            flex: 1,
            paddingVertical: 16,
            borderRadius: 9999,
            borderWidth: 1,
            borderColor: '#333333',
            alignItems: 'center',
          }}
        >
          <Text style={{
            color: '#888888',
            fontSize: 14,
            fontFamily: 'monospace',
            letterSpacing: 1,
          }}>
            BACK
          </Text>
        </Pressable>

        <Pressable
          onPress={handleConfirm}
          style={({ pressed }) => ({
            flex: 2,
            paddingVertical: 16,
            borderRadius: 9999,
            backgroundColor: pressed ? '#00cccc' : '#00ffff',
            alignItems: 'center',
            flexDirection: 'row',
            justifyContent: 'center',
            gap: 8,
          })}
        >
          <Text style={{
            color: '#000000',
            fontSize: 14,
            fontWeight: 'bold',
            fontFamily: 'monospace',
            letterSpacing: 1,
          }}>
            NEXT
          </Text>
          <Text style={{ color: '#000000', fontSize: 16 }}>→</Text>
        </Pressable>
      </View>
    </View>
  );
}
