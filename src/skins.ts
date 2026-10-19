import { colors } from './theme';

// Cosmetic unlocks. The defaults are always available; the rest are earned
// in Career (see career.ts for which boss or star total unlocks each). Paddle
// rings avoid cyan so your paddle never looks like the opponent's.

export type PaddleSkin = { id: string; name: string; color: string; core: string };

export type TableSkin = {
  id: string;
  name: string;
  table: string; // surface
  edge: string; // rail glow
  line: string; // centre line and rings
  hole: string; // air holes
};

const paddle = (id: string, name: string, color: string, core = color): PaddleSkin => ({ id, name, color, core });

export const PADDLES: PaddleSkin[] = [
  paddle('pink', 'Neon Pink', colors.p0),
  paddle('lime', 'Lime', '#9dff3c'),
  paddle('orange', 'Blaze', '#ff8a1f'),
  paddle('violet', 'Ultraviolet', '#b36bff'),
  paddle('red', 'Red Alert', '#ff3b4d'),
  paddle('gold', 'Gold Rush', '#ffd23f'),
  paddle('white', 'Whiteout', '#f4f1ff'),
  paddle('sunset', 'Sunset', '#ff8a1f', '#ff2daa'),
  paddle('toxic', 'Toxic', '#9dff3c', '#b36bff'),
  paddle('candy', 'Candy', '#ff2daa', '#f4f1ff'),
  paddle('inferno', 'Inferno', '#ff3b4d', '#ffd23f'),
  paddle('royal', 'Royal', '#b36bff', '#ffd23f'),
  paddle('venom', 'Venom', '#39ff88', '#ff2daa'),
  paddle('eclipse', 'Eclipse', '#f4f1ff', '#b36bff'),
  paddle('plasma', 'Plasma', '#ff5cf0', '#9dff3c'),
  paddle('legend', 'Legend', '#ffd23f', '#f4f1ff'),
];

const table = (id: string, name: string, surface: string, edge: string): TableSkin => ({
  id,
  name,
  table: surface,
  edge,
  line: `${edge}8c`,
  hole: `${edge}1a`,
});

export const TABLES: TableSkin[] = [
  { id: 'midnight', name: 'Midnight', table: colors.table, edge: colors.tableEdge, line: colors.line, hole: colors.hole },
  table('emerald', 'Emerald', '#04201a', '#2bd67b'),
  table('ice', 'Ice Rink', '#071a2a', '#5ab8ff'),
  table('crimson', 'Crimson', '#220812', '#ff4f6d'),
  table('synth', 'Synthwave', '#1a0628', '#ff2daa'),
  table('toxic', 'Toxic Waste', '#0b1a04', '#9dff3c'),
  table('abyss', 'Abyss', '#020814', '#2f6bff'),
  table('lava', 'Lava', '#1f0800', '#ff6a00'),
  table('amethyst', 'Amethyst', '#160a26', '#b36bff'),
  table('arctic', 'Arctic', '#0c1b22', '#e8fbff'),
  table('bloodmoon', 'Blood Moon', '#1a0303', '#ff1f3d'),
  table('jungle', 'Jungle', '#06180c', '#39ff88'),
  table('void', 'The Void', '#000000', '#f4f1ff'),
  table('gold', 'Champion Gold', '#1d1606', '#ffbf3c'),
];

export const paddleSkin = (id: string) => PADDLES.find((p) => p.id === id) ?? PADDLES[0];
export const tableSkin = (id: string) => TABLES.find((t) => t.id === id) ?? TABLES[0];
