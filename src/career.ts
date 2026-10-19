import type { CpuParams } from './game/ai';
import { paddleSkin, tableSkin } from './skins';

// Career: a ladder of CPU rivals, each with their own play style. Beating a
// rival for the first time unlocks the next one and a cosmetic reward.

export type Reward = { kind: 'paddle' | 'table'; id: string };

export type Rival = {
  name: string;
  tagline: string;
  cpu: CpuParams;
  reward: Reward;
};

export const RIVALS: Rival[] = [
  {
    name: 'PIP',
    tagline: 'Just happy to be here',
    cpu: { speed: 0.9, reaction: 0.3, error: 0.16, aggression: 0.35 },
    reward: { kind: 'paddle', id: 'lime' },
  },
  {
    name: 'BRICK',
    tagline: 'Parks the paddle in goal',
    cpu: { speed: 1.4, reaction: 0.16, error: 0.08, aggression: 0.15 },
    reward: { kind: 'table', id: 'emerald' },
  },
  {
    name: 'DRIFT',
    tagline: 'Wild swings, wilder misses',
    cpu: { speed: 2.0, reaction: 0.2, error: 0.2, aggression: 1 },
    reward: { kind: 'paddle', id: 'orange' },
  },
  {
    name: 'NOVA',
    tagline: 'Solid all-rounder',
    cpu: { speed: 1.9, reaction: 0.13, error: 0.07, aggression: 0.75 },
    reward: { kind: 'table', id: 'ice' },
  },
  {
    name: 'VOLT',
    tagline: "Faster than you'd like",
    cpu: { speed: 2.6, reaction: 0.1, error: 0.09, aggression: 0.85 },
    reward: { kind: 'paddle', id: 'violet' },
  },
  {
    name: 'IRON',
    tagline: 'Nothing gets past',
    cpu: { speed: 2.4, reaction: 0.06, error: 0.05, aggression: 0.3 },
    reward: { kind: 'table', id: 'crimson' },
  },
  {
    name: 'RAZOR',
    tagline: 'Every shot is aimed',
    cpu: { speed: 2.8, reaction: 0.07, error: 0.03, aggression: 0.95 },
    reward: { kind: 'paddle', id: 'red' },
  },
  {
    name: 'OMEGA',
    tagline: 'The final boss',
    cpu: { speed: 3.3, reaction: 0.04, error: 0.018, aggression: 1 },
    reward: { kind: 'table', id: 'gold' },
  },
];

export function rewardInfo(r: Reward): { label: string; color: string } {
  if (r.kind === 'paddle') {
    const s = paddleSkin(r.id);
    return { label: `${s.name} paddle`, color: s.color };
  }
  const s = tableSkin(r.id);
  return { label: `${s.name} table`, color: s.edge };
}

// Index of the rival whose defeat unlocks this skin, or -1 for defaults.
export function unlockedBy(kind: Reward['kind'], id: string): number {
  return RIVALS.findIndex((r) => r.reward.kind === kind && r.reward.id === id);
}

// `beaten` is how many rivals the player has defeated so far.
export function isUnlocked(kind: Reward['kind'], id: string, beaten: number): boolean {
  return unlockedBy(kind, id) < beaten;
}
