import { StatusBar } from 'expo-status-bar';
import { useEffect, useState } from 'react';
import { SafeAreaProvider } from 'react-native-safe-area-context';

import { configureFeedback, initFeedback } from './src/feedback';
import { GameScreen } from './src/screens/GameScreen';
import { MenuScreen, type GameMode } from './src/screens/MenuScreen';
import { SettingsProvider, useSettings } from './src/settings';

initFeedback();

export default function App() {
  return (
    <SafeAreaProvider>
      <SettingsProvider>
        <Root />
      </SettingsProvider>
    </SafeAreaProvider>
  );
}

// Two screens and no back-swipe wanted mid-match, so a plain state switch
// is used instead of a navigator.
function Root() {
  const { settings, recordResult } = useSettings();
  const [mode, setMode] = useState<GameMode | null>(null);

  useEffect(() => {
    configureFeedback({ sound: settings.sound, haptics: settings.haptics });
  }, [settings.sound, settings.haptics]);

  return (
    <>
      <StatusBar style="light" />
      {mode ? (
        <GameScreen
          mode={mode}
          difficulty={settings.difficulty}
          target={settings.target}
          onExit={() => setMode(null)}
          onResult={(won) => recordResult(settings.difficulty, won)}
        />
      ) : (
        <MenuScreen onPlay={setMode} />
      )}
    </>
  );
}
