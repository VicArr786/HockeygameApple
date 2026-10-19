import type { CpuParams } from './game/ai';
import type { SimMods } from './game/physics';
import { PADDLES, TABLES, paddleSkin, tableSkin } from './skins';

// Career: 12 leagues of 8 stages (7 rivals then a boss), followed by the
// endless Infinity Tower. Stages are numbered globally from 0; anything from
// TOWER_START up is a tower floor. Everything is generated deterministically
// from the stage number, so there's nothing to download or store but progress.

export const STAGES_PER_LEAGUE = 8;

// ---------------------------------------------------------------------------
// Rule modifiers ("twists" on normal stages, stacked on bosses)

export type ModId = 'giant' | 'fortress' | 'wide' | 'tiny' | 'hyper' | 'ice' | 'mini' | 'ghost' | 'down1' | 'down2';

export const MODS: Record<ModId, { label: string; desc: string }> = {
  giant: { label: 'GIANT PADDLE', desc: 'Their paddle is huge' },
  fortress: { label: 'FORTRESS', desc: 'Their goal is narrow' },
  wide: { label: 'WIDE OPEN', desc: 'Your goal is wider' },
  tiny: { label: 'SHRUNK', desc: 'Your paddle is smaller' },
  hyper: { label: 'HYPER PUCK', desc: 'The puck is faster' },
  ice: { label: 'BLACK ICE', desc: 'The puck never slows down' },
  mini: { label: 'MINI PUCK', desc: 'The puck is tiny' },
  ghost: { label: 'GHOST PUCK', desc: 'The puck fades in and out' },
  down1: { label: 'HEAD START', desc: 'They start 1–0 up' },
  down2: { label: 'HEAD START', desc: 'They start 2–0 up' },
};

export function simMods(mods: ModId[]): SimMods {
  const m: SimMods = {};
  const has = (id: ModId) => mods.includes(id);
  m.paddleScale = [has('tiny') ? 0.78 : 1, has('giant') ? 1.4 : 1];
  m.goalScale = [has('wide') ? 1.3 : 1, has('fortress') ? 0.72 : 1];
  if (has('mini')) m.puckScale = 0.72;
  if (has('hyper')) {
    m.speedScale = 1.35;
    m.dragScale = 0.5;
  }
  if (has('ice')) {
    m.dragScale = 0.05;
    m.bounce = 0.97;
  }
  return m;
}

// ---------------------------------------------------------------------------
// Leagues and bosses

export type Archetype = 'balanced' | 'wall' | 'striker' | 'wild' | 'sniper' | 'speedster';

type League = {
  name: string;
  color: string;
  rivals: string[]; // 7 names
  boss: { name: string; title: string; style: Archetype; mods: ModId[] };
};

export const LEAGUES: League[] = [
  {
    name: 'NEON ROOKIES',
    color: '#9dff3c',
    rivals: ['PIP', 'DOT', 'ZIG', 'FIZZ', 'MOJO', 'NIX', 'BEEP'],
    boss: { name: 'GATEKEEPER', title: 'Nobody gets in without a fight', style: 'wall', mods: ['giant'] },
  },
  {
    name: 'BACKSTREET',
    color: '#2bd67b',
    rivals: ['GRIT', 'SLAB', 'RUST', 'DUKE', 'KNOX', 'TANK', 'MACE'],
    boss: { name: 'BRICKHOUSE', title: 'Built a wall across the goal', style: 'wall', mods: ['fortress'] },
  },
  {
    name: 'CHROME CIRCUIT',
    color: '#ff8a1f',
    rivals: ['DRIFT', 'REV', 'NITRO', 'PISTON', 'CLUTCH', 'GEARS', 'TORQUE'],
    boss: { name: 'TURBO', title: 'Redlines every rally', style: 'speedster', mods: ['hyper'] },
  },
  {
    name: 'FROST LEAGUE',
    color: '#5ab8ff',
    rivals: ['FROST', 'SLEET', 'YETI', 'ICICLE', 'BLIZZ', 'HAIL', 'POLAR'],
    boss: { name: 'GLACIER', title: 'The table is pure ice', style: 'sniper', mods: ['ice'] },
  },
  {
    name: 'PHANTOM LEAGUE',
    color: '#b36bff',
    rivals: ['SHADE', 'WISP', 'HAUNT', 'MIRAGE', 'SPOOK', 'VEIL', 'ECHO'],
    boss: { name: 'SPECTRE', title: 'Now you see it…', style: 'striker', mods: ['ghost'] },
  },
  {
    name: 'RED ZONE',
    color: '#ff4f6d',
    rivals: ['BLAZE', 'FURY', 'RUCKUS', 'BRAWL', 'HAVOC', 'RAGE', 'SCAR'],
    boss: { name: 'WARDEN', title: 'Starts ahead, stays ahead', style: 'wall', mods: ['down2', 'fortress'] },
  },
  {
    name: 'STORM DIVISION',
    color: '#ff3b4d',
    rivals: ['VOLT', 'ZAP', 'THUNDER', 'GALE', 'CYCLONE', 'SURGE', 'FLASH'],
    boss: { name: 'TEMPEST', title: 'A tiny puck at lightning speed', style: 'speedster', mods: ['mini', 'hyper'] },
  },
  {
    name: 'SYNTH CITY',
    color: '#ff2daa',
    rivals: ['NOVA', 'LASER', 'PIXEL', 'RETRO', 'SYNTH', 'NEON', 'VAPOR'],
    boss: { name: 'HYDRA', title: 'Huge paddle, and your goal is wide open', style: 'striker', mods: ['giant', 'wide'] },
  },
  {
    name: 'GOLD COAST',
    color: '#ffd23f',
    rivals: ['COIN', 'BULLION', 'JACKPOT', 'BLING', 'KARAT', 'MINT', 'TYCOON'],
    boss: { name: 'MIDAS', title: 'Shrinks you down to size', style: 'sniper', mods: ['tiny', 'fortress'] },
  },
  {
    name: 'VOLCANO',
    color: '#ff6a00',
    rivals: ['CINDER', 'ASH', 'EMBER', 'SCORCH', 'PYRO', 'CRATER', 'FLARE'],
    boss: { name: 'MAGMA', title: 'A blazing puck you can barely see', style: 'wild', mods: ['hyper', 'ghost'] },
  },
  {
    name: 'ROYAL COURT',
    color: '#e8fbff',
    rivals: ['KNIGHT', 'BISHOP', 'ROOK', 'DUCHESS', 'BARON', 'PRINCE', 'QUEEN'],
    boss: { name: 'THE KING', title: 'Plays by his own rules', style: 'balanced', mods: ['giant', 'fortress', 'down1'] },
  },
  {
    name: 'OMEGA LEAGUE',
    color: '#ffbf3c',
    rivals: ['RAZOR', 'IRON', 'APEX', 'TITAN', 'ZENITH', 'NEMESIS', 'ORACLE'],
    boss: { name: 'OMEGA', title: 'The final boss', style: 'striker', mods: ['giant', 'fortress', 'hyper', 'down2'] },
  },
];

export const TOWER_START = LEAGUES.length * STAGES_PER_LEAGUE; // 96
export const TOWER_COLOR = '#ff5cf0';

// ---------------------------------------------------------------------------
// Stages

export type Stage = {
  index: number;
  league: number; // LEAGUES index, or -1 for the tower
  floor: number; // 1-based tower floor, 0 outside the tower
  name: string;
  tagline: string;
  boss: boolean;
  mods: ModId[];
  cpu: CpuParams;
  target: number;
  startScore: [number, number]; // [you, them]
  sim: SimMods;
};

const STYLE: Record<Archetype, { speed: number; reaction: number; error: number; aggression: number }> = {
  balanced: { speed: 1, reaction: 1, error: 1, aggression: 0.7 },
  wall: { speed: 1.05, reaction: 0.9, error: 0.9, aggression: 0.2 },
  striker: { speed: 1, reaction: 1, error: 1.2, aggression: 1 },
  wild: { speed: 1.15, reaction: 1.1, error: 1.8, aggression: 0.95 },
  sniper: { speed: 0.92, reaction: 0.95, error: 0.6, aggression: 0.8 },
  speedster: { speed: 1.2, reaction: 1.3, error: 1.1, aggression: 0.75 },
};
export const STYLES = Object.keys(STYLE) as Archetype[];

const TAGLINES: Record<Archetype, string[]> = {
  balanced: ['Solid all-rounder', 'No obvious weakness', 'Textbook technique', 'Steady as they come'],
  wall: ['Parks the paddle in goal', 'Defence first, always', 'Hard to break down', 'Waits for your mistake'],
  striker: ['Shoots on sight', 'All attack, all the time', 'Loves a bank shot', 'Goes for the throat'],
  wild: ['Wild swings, wilder misses', 'Pure chaos', 'Unpredictable', 'Swings for the fences'],
  sniper: ['Every shot is aimed', 'Pinpoint accurate', 'Finds the corners', 'Never wastes a shot'],
  speedster: ['Faster than you would like', 'All gas, no brakes', 'Quickest hands around', 'Blink and you miss it'],
};

// Skill curve: x is 0 for the first stage and 1 for OMEGA, and keeps rising
// slowly in the tower. Stats are capped at what a CPU can still lose to.
export function cpuFor(x: number, style: Archetype): CpuParams {
  const s = STYLE[style];
  const k = Math.pow(Math.min(x, 1), 0.85);
  const over = Math.max(0, x - 1);
  return {
    speed: Math.min(4.2, (0.85 + 2.65 * k + over * 0.6) * s.speed),
    reaction: Math.max(0.025, (0.32 - 0.285 * k - over * 0.01) * s.reaction),
    error: Math.max(0.008, (0.17 - 0.155 * k - over * 0.004) * s.error),
    aggression: s.aggression,
  };
}

// Small deterministic PRNG so tower floors are the same for everyone.
function rng(seed: number) {
  let a = seed * 2654435761 + 0x9e3779b9;
  return () => {
    a |= 0;
    a = (a + 0x6d2b79f5) | 0;
    let t = Math.imul(a ^ (a >>> 15), 1 | a);
    t = (t + Math.imul(t ^ (t >>> 7), 61 | t)) ^ t;
    return ((t ^ (t >>> 14)) >>> 0) / 4294967296;
  };
}

const TWISTS: ModId[] = ['mini', 'hyper', 'giant', 'ghost', 'ice', 'fortress'];
const TOWER_MODS: ModId[] = ['giant', 'fortress', 'wide', 'tiny', 'hyper', 'ice', 'mini', 'ghost', 'down1'];
const SYLLABLES_A = ['KRA', 'ZO', 'VEX', 'NYX', 'OR', 'QUA', 'XE', 'DRA', 'MOR', 'SKY', 'VAL', 'GRY'];
const SYLLABLES_B = ['TH', 'X', 'ON', 'RA', 'LIS', 'ZAR', 'KOR', 'VEN', 'ROS', 'NUS', 'DOR', 'GAX'];

function build(index: number, fields: Omit<Stage, 'index' | 'sim' | 'startScore'>): Stage {
  const down = fields.mods.includes('down2') ? 2 : fields.mods.includes('down1') ? 1 : 0;
  return { ...fields, index, startScore: [0, down], sim: simMods(fields.mods) };
}

export function stage(index: number): Stage {
  if (index >= TOWER_START) return towerFloor(index);
  const league = Math.floor(index / STAGES_PER_LEAGUE);
  const pos = index % STAGES_PER_LEAGUE;
  const L = LEAGUES[league];
  const x = index / (TOWER_START - 1);

  if (pos === STAGES_PER_LEAGUE - 1) {
    return build(index, {
      league,
      floor: 0,
      name: L.boss.name,
      tagline: L.boss.title,
      boss: true,
      mods: L.boss.mods,
      cpu: cpuFor(x + 0.06, L.boss.style),
      target: 7,
    });
  }

  const style = STYLES[(index * 5 + league) % STYLES.length];
  // From the third league on, a couple of stages per league get a twist.
  const mods: ModId[] = league >= 2 && (pos === 3 || pos === 5) ? [TWISTS[(league + pos) % TWISTS.length]] : [];
  return build(index, {
    league,
    floor: 0,
    name: L.rivals[pos],
    tagline: TAGLINES[style][index % TAGLINES[style].length],
    boss: false,
    mods,
    cpu: cpuFor(x, style),
    target: 5,
  });
}

function towerFloor(index: number): Stage {
  const floor = index - TOWER_START + 1;
  const r = rng(floor);
  const boss = floor % 10 === 0;
  // More rule changes the higher you climb, and always 3 on boss floors.
  const count = boss ? 3 : Math.min(3, (floor % 3 === 0 ? 1 : 0) + Math.floor(floor / 25));
  const pool = [...TOWER_MODS];
  const mods: ModId[] = [];
  while (mods.length < count && pool.length) mods.push(pool.splice(Math.floor(r() * pool.length), 1)[0]);
  const style = STYLES[Math.floor(r() * STYLES.length)];
  const name = SYLLABLES_A[Math.floor(r() * SYLLABLES_A.length)] + SYLLABLES_B[Math.floor(r() * SYLLABLES_B.length)];
  return build(index, {
    league: -1,
    floor,
    name: boss ? `${name} PRIME` : name,
    tagline: boss ? `Guardian of floor ${floor}` : TAGLINES[style][floor % TAGLINES[style].length],
    boss,
    mods,
    cpu: cpuFor(1 + floor * 0.02 + (boss ? 0.06 : 0), style),
    target: boss ? 7 : 5,
  });
}

export const leagueName = (s: Stage) => (s.league < 0 ? 'INFINITY TOWER' : LEAGUES[s.league].name);
export const stageColor = (s: Stage) => (s.league < 0 ? TOWER_COLOR : LEAGUES[s.league].color);
export const stageLabel = (s: Stage) =>
  s.league < 0 ? `Floor ${s.floor}` : `${LEAGUES[s.league].name} · ${(s.index % STAGES_PER_LEAGUE) + 1}/${STAGES_PER_LEAGUE}`;

// ---------------------------------------------------------------------------
// Stars and ranks

// 3 stars for conceding at most a fifth of the target, 2 for at most half.
export function starsFor(target: number, conceded: number): number {
  if (conceded <= Math.floor(target * 0.2)) return 3;
  if (conceded <= Math.floor(target * 0.5)) return 2;
  return 1;
}

export const totalStars = (stars: number[]) => stars.reduce((a, b) => a + (b || 0), 0);

const RANKS: [number, string][] = [
  [0, 'ROOKIE'],
  [10, 'AMATEUR'],
  [30, 'CONTENDER'],
  [60, 'PRO'],
  [100, 'ALL-STAR'],
  [150, 'ELITE'],
  [200, 'MASTER'],
  [250, 'GRANDMASTER'],
  [288, 'LEGEND'],
  [400, 'MYTHIC'],
  [600, 'IMMORTAL'],
];

export function rank(stars: number): { name: string; next: number | null } {
  let i = 0;
  while (i + 1 < RANKS.length && stars >= RANKS[i + 1][0]) i++;
  return { name: RANKS[i][1], next: RANKS[i + 1]?.[0] ?? null };
}

// ---------------------------------------------------------------------------
// Unlocks: each league boss drops a cosmetic; star totals unlock the rest.

export type Reward = { kind: 'paddle' | 'table'; id: string };
// What the win screen shows after a Career match.
export type CareerResult = { stars: number; unlocks: Reward[] };
export type Progress = { beaten: number; stars: number };

const BOSS_REWARDS: Reward[] = [
  { kind: 'paddle', id: 'lime' },
  { kind: 'table', id: 'emerald' },
  { kind: 'paddle', id: 'orange' },
  { kind: 'table', id: 'ice' },
  { kind: 'paddle', id: 'violet' },
  { kind: 'table', id: 'crimson' },
  { kind: 'paddle', id: 'red' },
  { kind: 'table', id: 'synth' },
  { kind: 'paddle', id: 'gold' },
  { kind: 'table', id: 'lava' },
  { kind: 'paddle', id: 'royal' },
  { kind: 'table', id: 'gold' },
];

const STAR_REWARDS: [number, Reward][] = [
  [5, { kind: 'paddle', id: 'white' }],
  [12, { kind: 'table', id: 'abyss' }],
  [20, { kind: 'paddle', id: 'sunset' }],
  [30, { kind: 'table', id: 'toxic' }],
  [45, { kind: 'paddle', id: 'toxic' }],
  [60, { kind: 'table', id: 'amethyst' }],
  [80, { kind: 'paddle', id: 'candy' }],
  [100, { kind: 'table', id: 'arctic' }],
  [125, { kind: 'paddle', id: 'inferno' }],
  [150, { kind: 'table', id: 'jungle' }],
  [180, { kind: 'paddle', id: 'venom' }],
  [210, { kind: 'table', id: 'bloodmoon' }],
  [240, { kind: 'paddle', id: 'eclipse' }],
  [265, { kind: 'table', id: 'void' }],
  [288, { kind: 'paddle', id: 'legend' }],
  [320, { kind: 'paddle', id: 'plasma' }],
];

const same = (a: Reward, b: Reward) => a.kind === b.kind && a.id === b.id;
const bossStage = (league: number) => league * STAGES_PER_LEAGUE + STAGES_PER_LEAGUE - 1;

export type UnlockSource = { boss: number } | { stars: number } | null;

export function unlockSource(r: Reward): UnlockSource {
  const league = BOSS_REWARDS.findIndex((b) => same(b, r));
  if (league >= 0) return { boss: league };
  const star = STAR_REWARDS.find(([, b]) => same(b, r));
  return star ? { stars: star[0] } : null;
}

export function isUnlocked(r: Reward, p: Progress): boolean {
  const src = unlockSource(r);
  if (!src) return true;
  return 'boss' in src ? p.beaten > bossStage(src.boss) : p.stars >= src.stars;
}

export function unlockHint(r: Reward): string {
  const src = unlockSource(r);
  if (!src) return '';
  if ('boss' in src) return `Beat ${LEAGUES[src.boss].boss.name}, the ${LEAGUES[src.boss].name} boss, to unlock`;
  return `Collect ${src.stars} ★ in Career to unlock`;
}

export function bossReward(s: Stage): Reward | undefined {
  return s.boss && s.league >= 0 ? BOSS_REWARDS[s.league] : undefined;
}

// Everything that became unlocked going from `before` to `after`.
export function newUnlocks(before: Progress, after: Progress): Reward[] {
  const all: Reward[] = [
    ...PADDLES.map((p) => ({ kind: 'paddle' as const, id: p.id })),
    ...TABLES.map((t) => ({ kind: 'table' as const, id: t.id })),
  ];
  return all.filter((r) => unlockSource(r) && !isUnlocked(r, before) && isUnlocked(r, after));
}

export function rewardInfo(r: Reward): { label: string; color: string; core: string } {
  if (r.kind === 'paddle') {
    const s = paddleSkin(r.id);
    return { label: `${s.name} paddle`, color: s.color, core: s.core };
  }
  const s = tableSkin(r.id);
  return { label: `${s.name} table`, color: s.edge, core: s.table };
}
