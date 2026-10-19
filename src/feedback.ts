import { createAudioPlayer, setAudioModeAsync, type AudioPlayer } from 'expo-audio';
import * as Haptics from 'expo-haptics';
import { Platform } from 'react-native';

// Sound effects and haptics. Kept as module state so the game loop can fire
// them without re-rendering anything.

const SOURCES = {
  hit: require('../assets/sounds/hit.wav'),
  wall: require('../assets/sounds/wall.wav'),
  goal: require('../assets/sounds/goal.wav'),
  concede: require('../assets/sounds/concede.wav'),
  win: require('../assets/sounds/win.wav'),
  beep: require('../assets/sounds/beep.wav'),
  go: require('../assets/sounds/go.wav'),
  tap: require('../assets/sounds/tap.wav'),
};

export type Sound = keyof typeof SOURCES;

// Rapid-fire sounds get several players so they can overlap.
const POOL_SIZE: Partial<Record<Sound, number>> = { hit: 4, wall: 4 };

const pools = new Map<Sound, { players: AudioPlayer[]; next: number }>();
let soundOn = true;
let hapticsOn = true;
let lastHaptic = 0;

export function initFeedback() {
  // Respect the silent switch and let the player's music keep playing.
  setAudioModeAsync({ playsInSilentMode: false, interruptionMode: 'mixWithOthers' }).catch(() => {});
  for (const name of Object.keys(SOURCES) as Sound[]) {
    const players = Array.from({ length: POOL_SIZE[name] ?? 1 }, () => createAudioPlayer(SOURCES[name]));
    pools.set(name, { players, next: 0 });
  }
}

export function configureFeedback(opts: { sound: boolean; haptics: boolean }) {
  soundOn = opts.sound;
  hapticsOn = opts.haptics;
}

export function playSound(name: Sound, volume = 1) {
  if (!soundOn) return;
  const pool = pools.get(name);
  if (!pool) return;
  const player = pool.players[pool.next];
  pool.next = (pool.next + 1) % pool.players.length;
  try {
    player.volume = Math.max(0.05, Math.min(1, volume));
    player.seekTo(0).catch(() => {});
    player.play();
  } catch {
    // Audio is cosmetic; never let it break the game.
  }
}

export function buzz(kind: 'light' | 'medium' | 'heavy' | 'success' | 'error' | 'select') {
  if (!hapticsOn || Platform.OS === 'web') return;
  const now = Date.now();
  // The Taptic Engine can't keep up with per-frame calls.
  if (now - lastHaptic < 45) return;
  lastHaptic = now;
  const run = () => {
    switch (kind) {
      case 'light':
        return Haptics.impactAsync(Haptics.ImpactFeedbackStyle.Light);
      case 'medium':
        return Haptics.impactAsync(Haptics.ImpactFeedbackStyle.Medium);
      case 'heavy':
        return Haptics.impactAsync(Haptics.ImpactFeedbackStyle.Heavy);
      case 'success':
        return Haptics.notificationAsync(Haptics.NotificationFeedbackType.Success);
      case 'error':
        return Haptics.notificationAsync(Haptics.NotificationFeedbackType.Error);
      case 'select':
        return Haptics.selectionAsync();
    }
  };
  run().catch(() => {});
}
