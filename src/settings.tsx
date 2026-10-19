import AsyncStorage from '@react-native-async-storage/async-storage';
import { createContext, useCallback, useContext, useEffect, useState, type ReactNode } from 'react';

import type { Difficulty } from './game/ai';

export type Settings = {
  sound: boolean;
  haptics: boolean;
  difficulty: Difficulty;
  target: number;
  // Wins and losses against the CPU, per difficulty.
  record: Record<Difficulty, { w: number; l: number }>;
};

const KEY = 'neon-air-hockey/settings/v1';

const DEFAULTS: Settings = {
  sound: true,
  haptics: true,
  difficulty: 'normal',
  target: 7,
  record: { easy: { w: 0, l: 0 }, normal: { w: 0, l: 0 }, hard: { w: 0, l: 0 } },
};

type Ctx = {
  settings: Settings;
  update: (patch: Partial<Settings>) => void;
  recordResult: (difficulty: Difficulty, won: boolean) => void;
};

const SettingsContext = createContext<Ctx | null>(null);

export function SettingsProvider({ children }: { children: ReactNode }) {
  const [settings, setSettings] = useState<Settings>(DEFAULTS);

  useEffect(() => {
    AsyncStorage.getItem(KEY)
      .then((raw) => {
        if (!raw) return;
        const saved = JSON.parse(raw) as Partial<Settings>;
        setSettings((s) => ({ ...s, ...saved, record: { ...s.record, ...saved.record } }));
      })
      .catch(() => {});
  }, []);

  const save = useCallback((fn: (s: Settings) => Settings) => {
    setSettings((s) => {
      const next = fn(s);
      AsyncStorage.setItem(KEY, JSON.stringify(next)).catch(() => {});
      return next;
    });
  }, []);

  const update = useCallback((patch: Partial<Settings>) => save((s) => ({ ...s, ...patch })), [save]);

  const recordResult = useCallback(
    (difficulty: Difficulty, won: boolean) =>
      save((s) => {
        const r = s.record[difficulty];
        return { ...s, record: { ...s.record, [difficulty]: won ? { ...r, w: r.w + 1 } : { ...r, l: r.l + 1 } } };
      }),
    [save],
  );

  return <SettingsContext.Provider value={{ settings, update, recordResult }}>{children}</SettingsContext.Provider>;
}

export function useSettings() {
  const ctx = useContext(SettingsContext);
  if (!ctx) throw new Error('useSettings must be used inside SettingsProvider');
  return ctx;
}
