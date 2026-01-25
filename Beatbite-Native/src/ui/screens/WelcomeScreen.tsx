import { View, Text, Pressable } from 'react-native';
import { useAppStore } from '../../core/store';

/**
 * WelcomeScreen - Landing screen for Beatbite.
 *
 * Shows the app branding and "Start Creating" button to begin the guided flow.
 */
export function WelcomeScreen() {
  const { startGuidedFlow } = useAppStore();

  return (
    <View style={{
      flex: 1,
      backgroundColor: '#050505',
      justifyContent: 'center',
      alignItems: 'center',
      paddingHorizontal: 24,
    }}>
      {/* Logo area */}
      <View style={{
        width: 120,
        height: 120,
        borderRadius: 60,
        backgroundColor: '#0a0a0a',
        borderWidth: 2,
        borderColor: 'rgba(0, 255, 255, 0.3)',
        justifyContent: 'center',
        alignItems: 'center',
        marginBottom: 32,
      }}>
        <Text style={{ fontSize: 48 }}>🎵</Text>
      </View>

      {/* App name */}
      <Text style={{
        color: '#ffffff',
        fontSize: 32,
        fontWeight: 'bold',
        fontFamily: 'monospace',
        letterSpacing: 4,
        marginBottom: 8,
      }}>
        BEATBITE
      </Text>

      {/* Tagline */}
      <Text style={{
        color: '#666666',
        fontSize: 14,
        fontFamily: 'monospace',
        textAlign: 'center',
        marginBottom: 48,
      }}>
        Voice → Music in seconds
      </Text>

      {/* Start button */}
      <Pressable
        onPress={startGuidedFlow}
        style={({ pressed }) => ({
          paddingHorizontal: 48,
          paddingVertical: 16,
          borderRadius: 9999,
          backgroundColor: pressed ? '#00cccc' : '#00ffff',
          shadowColor: '#00ffff',
          shadowOffset: { width: 0, height: 0 },
          shadowOpacity: 0.5,
          shadowRadius: 20,
          elevation: 5,
        })}
      >
        <Text style={{
          color: '#000000',
          fontSize: 16,
          fontWeight: 'bold',
          fontFamily: 'monospace',
          letterSpacing: 2,
        }}>
          START CREATING
        </Text>
      </Pressable>

      {/* Version info */}
      <Text style={{
        color: '#333333',
        fontSize: 10,
        fontFamily: 'monospace',
        position: 'absolute',
        bottom: 24,
      }}>
        v0.1.0 • React Native
      </Text>
    </View>
  );
}
