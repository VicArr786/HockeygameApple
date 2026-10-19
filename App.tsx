import { StatusBar } from 'expo-status-bar';
import { useEffect, useState } from 'react';
import { SafeAreaProvider } from 'react-native-safe-area-context';

import { newUnlocks, stage as getStage, starsFor, totalStars, type CareerResult } from './src/career';
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

// `best` is the Endless record when the run started, for the "new best" banner.
type Game = { mode: GameMode; stage?: number; best?: number };
type Screen = { name: 'menu' } | { name: 'career' } | { name: 'game'; game: Game };

// Three screens and no back-swipe wanted mid-match, so a plain state switch
// is used instead of a navigator.
function Root() {
  const { settings, recordResult } = useSettings();
  const [screen, setScreen] = useState<Screen>({ name: 'menu' });
  const [result, setResult] = useState<CareerResult | null>(null);

  useEffect(() => {
    configureFeedback({ sound: settings.sound, haptics: settings.haptics });
  }, [settings.sound, settings.haptics]);

  const playStage = (stage: number) => {
    setResult(null);
    setScreen({ name: 'game', game: { mode: '1p', stage } });
  };

  let content;
  if (screen.name === 'game') {
    const { game } = screen;
    const st = game.stage !== undefined ? getStage(game.stage) : undefined;
    content = (
      <GameScreen
        key={`${game.mode}:${game.stage ?? '-'}`}
        mode={game.mode}
        cpu={st?.cpu ?? DIFFICULTY_PARAMS[settings.difficulty]}
        stage={st}
        result={result}
        endlessBest={game.best}
        target={st?.target ?? settings.target}
        paddle={settings.paddle}
        table={settings.table}
        onNext={st ? () => playStage(st.index + 1) : undefined}
        onRestart={() => setResult(null)}
        onExit={() => setScreen(st ? { name: 'career' } : { name: 'menu' })}
        onResult={(won, score) => {
          if (game.mode === '2p') return;
          if (game.mode === 'endless') {
            recordResult({ won: false, endless: score[0] });
            return;
          }
          if (!st) {
            recordResult({ won, difficulty: settings.difficulty });
          } else {
            const stars = won ? starsFor(st.target, score[1] - st.startScore[1]) : 0;
            const before = { beaten: settings.beaten, stars: totalStars(settings.stars) };
            const best = Math.max(settings.stars[st.index] ?? 0, stars);
            const after = {
              beaten: won && st.index === settings.beaten ? settings.beaten + 1 : settings.beaten,
              stars: before.stars - (settings.stars[st.index] ?? 0) + best,
            };
            recordResult({ won, stage: st.index, stars });
            setResult({ stars, unlocks: won ? newUnlocks(before, after) : [] });
          }
          if (won) maybeAskForReview(settings.cpuWins + 1);
        }}
      />
    );
  } else if (screen.name === 'career') {
    content = <CareerScreen onPlay={playStage} onBack={() => setScreen({ name: 'menu' })} />;
  } else {
    content = (
      <MenuScreen
        onPlay={(mode) => setScreen({ name: 'game', game: { mode, best: settings.endlessBest } })}
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
