import { StatusBar } from 'expo-status-bar';
import { useEffect, useState } from 'react';
import { SafeAreaProvider } from 'react-native-safe-area-context';

import { RIVALS } from './src/career';
import { configureFeedback, initFeedback } from './src/feedback';
import { DIFFICULTY_PARAMS } from './src/game/ai';
import { maybeAskForReview } from './src/review';
import { CareerScreen } from './src/screens/CareerScreen';
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

// `firstTry` is captured when the match starts, so the reward banner still
// shows after the win has already moved the ladder on.
type Game = { mode: GameMode; rival?: number; firstTry?: boolean };
type Screen = { name: 'menu' } | { name: 'career' } | { name: 'game'; game: Game };

// Three screens and no back-swipe wanted mid-match, so a plain state switch
// is used instead of a navigator.
function Root() {
  const { settings, recordResult } = useSettings();
  const [screen, setScreen] = useState<Screen>({ name: 'menu' });

  useEffect(() => {
    configureFeedback({ sound: settings.sound, haptics: settings.haptics });
  }, [settings.sound, settings.haptics]);

  const playRival = (rival: number) =>
    setScreen({ name: 'game', game: { mode: '1p', rival, firstTry: rival >= settings.beaten } });

  let content;
  if (screen.name === 'game') {
    const { game } = screen;
    const rival = game.rival !== undefined ? RIVALS[game.rival] : undefined;
    const nextRival = game.rival !== undefined && game.rival + 1 < RIVALS.length ? game.rival + 1 : undefined;
    content = (
      <GameScreen
        key={`${game.mode}:${game.rival ?? '-'}`}
        mode={game.mode}
        cpu={rival?.cpu ?? DIFFICULTY_PARAMS[settings.difficulty]}
        opponent={rival?.name}
        reward={game.firstTry ? rival?.reward : undefined}
        finalBoss={game.rival === RIVALS.length - 1}
        target={settings.target}
        paddle={settings.paddle}
        table={settings.table}
        onNext={nextRival !== undefined ? () => playRival(nextRival) : undefined}
        onExit={() => setScreen(game.rival !== undefined ? { name: 'career' } : { name: 'menu' })}
        onResult={(won) => {
          if (game.mode === '2p') return;
          recordResult({ won, rival: game.rival, difficulty: rival ? undefined : settings.difficulty });
          if (won) maybeAskForReview(settings.cpuWins + 1);
        }}
      />
    );
  } else if (screen.name === 'career') {
    content = <CareerScreen onPlay={playRival} onBack={() => setScreen({ name: 'menu' })} />;
  } else {
    content = (
      <MenuScreen
        onPlay={(mode) => setScreen({ name: 'game', game: { mode } })}
        onCareer={() => setScreen({ name: 'career' })}
      />
    );
  }

  return (
    <>
      <StatusBar style="light" />
      {content}
    </>
  );
}
