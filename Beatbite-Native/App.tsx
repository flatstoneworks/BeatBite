import './global.css';
import { StatusBar } from 'expo-status-bar';
import { View, Text, Pressable, SafeAreaView } from 'react-native';
import { useAppStore, useGuidedFlowStep, useIsGuidedFlowActive } from './src/core/store';
import { AudioBridge } from './src/core/AudioBridge';
import { useEffect, useState } from 'react';

// Screens
import { WelcomeScreen } from './src/ui/screens/WelcomeScreen';
import { TempoSelectorScreen } from './src/ui/screens/TempoSelectorScreen';

/**
 * Beatbite Native - Main App
 *
 * Voice-to-music creation app for mobile.
 */
export default function App() {
  const isGuidedFlowActive = useIsGuidedFlowActive();
  const guidedFlowStep = useGuidedFlowStep();
  const [isAudioReady, setIsAudioReady] = useState(false);
  const [nativeAvailable, setNativeAvailable] = useState(false);

  useEffect(() => {
    // Check if native audio module is available
    setNativeAvailable(AudioBridge.isNativeAvailable());

    // Initialize audio engine
    const initAudio = async () => {
      try {
        const success = await AudioBridge.initialize();
        setIsAudioReady(success);
        console.log('[App] Audio initialized:', success);
      } catch (error) {
        console.error('[App] Audio init failed:', error);
      }
    };

    initAudio();

    return () => {
      AudioBridge.dispose();
    };
  }, []);

  // Render current screen based on guided flow step
  const renderScreen = () => {
    if (!isGuidedFlowActive) {
      return <WelcomeScreen />;
    }

    switch (guidedFlowStep) {
      case 'welcome':
        return <WelcomeScreen />;
      case 'tempo':
        return <TempoSelectorScreen />;
      case 'setup-drums':
      case 'setup-bass':
      case 'setup-guitar':
      case 'setup-voice':
        // TODO: Implement InstrumentSetupScreen
        return (
          <PlaceholderScreen
            title={`Setup: ${guidedFlowStep.replace('setup-', '').toUpperCase()}`}
            subtitle="Instrument setup coming soon"
          />
        );
      case 'drums':
      case 'bass':
      case 'guitar':
      case 'voice':
        // TODO: Implement recording screens
        return (
          <PlaceholderScreen
            title={`Record: ${guidedFlowStep.toUpperCase()}`}
            subtitle="Recording screen coming soon"
          />
        );
      case 'mix':
        return (
          <PlaceholderScreen
            title="MIX"
            subtitle="Mixer coming soon"
          />
        );
      default:
        return <WelcomeScreen />;
    }
  };

  return (
    <SafeAreaView style={{ flex: 1, backgroundColor: '#050505' }}>
      <StatusBar style="light" />

      {/* Debug banner */}
      {!nativeAvailable && (
        <View style={{ backgroundColor: '#ca8a04', paddingHorizontal: 16, paddingVertical: 8 }}>
          <Text style={{ color: 'white', fontSize: 12, textAlign: 'center', fontFamily: 'monospace' }}>
            Native audio module not available - using mock mode
          </Text>
        </View>
      )}

      {renderScreen()}
    </SafeAreaView>
  );
}

/**
 * Placeholder screen for unimplemented features.
 */
function PlaceholderScreen({ title, subtitle }: { title: string; subtitle: string }) {
  const { exitGuidedFlow, advanceGuidedFlowStep, setGuidedFlowStep } = useAppStore();
  const guidedFlowStep = useGuidedFlowStep();

  const handleBack = () => {
    const stepOrder = [
      'welcome', 'tempo', 'setup-drums', 'setup-bass', 'setup-guitar', 'setup-voice',
      'drums', 'bass', 'guitar', 'voice', 'mix'
    ];
    const currentIndex = stepOrder.indexOf(guidedFlowStep);
    if (currentIndex > 0) {
      setGuidedFlowStep(stepOrder[currentIndex - 1] as any);
    }
  };

  return (
    <View style={{ flex: 1, justifyContent: 'center', alignItems: 'center', paddingHorizontal: 24 }}>
      <Text style={{ color: '#00ffff', fontSize: 24, fontWeight: 'bold', fontFamily: 'monospace', marginBottom: 8 }}>
        {title}
      </Text>
      <Text style={{ color: '#666666', fontSize: 14, fontFamily: 'monospace', marginBottom: 32 }}>
        {subtitle}
      </Text>

      <View style={{ flexDirection: 'row', gap: 16 }}>
        <Pressable
          onPress={handleBack}
          style={{ paddingHorizontal: 24, paddingVertical: 12, borderRadius: 9999, borderWidth: 1, borderColor: '#333333' }}
        >
          <Text style={{ color: '#888888', fontFamily: 'monospace' }}>Back</Text>
        </Pressable>

        <Pressable
          onPress={advanceGuidedFlowStep}
          style={{ paddingHorizontal: 24, paddingVertical: 12, borderRadius: 9999, backgroundColor: '#00ffff' }}
        >
          <Text style={{ color: 'black', fontFamily: 'monospace', fontWeight: 'bold' }}>Next</Text>
        </Pressable>
      </View>

      <Pressable
        onPress={exitGuidedFlow}
        style={{ marginTop: 32 }}
      >
        <Text style={{ color: '#666666', fontSize: 14, fontFamily: 'monospace', textDecorationLine: 'underline' }}>
          Exit to Home
        </Text>
      </Pressable>
    </View>
  );
}
