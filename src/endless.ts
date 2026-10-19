import { MODS, STYLES, cpuFor, simMods, type ModId } from './career';
import type { EndlessLevel, EndlessRules } from './game/match';

// Endless survival: one long game against a CPU that gets better with every
// point you score. Every WAVE points the rules change at random, and every
// other wave is a boss wave with an extra twist. The run ends when the CPU
// has scored LIVES times (bonus lives are handled by the match).

export const LIVES = 3;
export const WAVE = 5;

// Mirror is left out: random flipped controls mid-run feel unfair rather than hard.
const POOL: ModId[] = [
  'giant', 'fortress', 'wide', 'tiny', 'hyper', 'ice', 'mini', 'ghost',
  'bumpers', 'barrier', 'moving', 'wind', 'magnet', 'curve', 'enrage', 'phantom', 'blackout',
];

export function endlessRules(rand: () => number = Math.random): EndlessRules {
  // Waves are rolled once per run, so restarting gives a new run.
  const waves = new Map<number, ModId[]>();
  const modsFor = (wave: number) => {
    let mods = waves.get(wave);
    if (!mods) {
      const boss = wave > 0 && wave % 2 === 0;
      const count = wave === 0 ? 0 : Math.min(3, Math.ceil(wave / 3) + (boss ? 1 : 0));
      const pool = [...POOL];
      mods = [];
      while (mods.length < count) mods.push(pool.splice(Math.floor(rand() * pool.length), 1)[0]);
      waves.set(wave, mods);
    }
    return mods;
  };

  return {
    lives: LIVES,
    level: (points: number): EndlessLevel => {
      const wave = Math.floor(points / WAVE);
      const boss = wave > 0 && wave % 2 === 0;
      const mods = modsFor(wave);
      return {
        // Starts gentle, passes OMEGA's skill at about 18 points, keeps going.
        cpu: cpuFor(0.1 + points * 0.05 + (boss ? 0.05 : 0), STYLES[wave % STYLES.length]),
        sim: simMods(mods),
        wave,
        boss,
        labels: mods.map((m) => MODS[m].label),
      };
    },
  };
}
