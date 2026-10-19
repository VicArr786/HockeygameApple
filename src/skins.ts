import { colors } from './theme';

// Cosmetic unlocks. The defaults are always available; the rest are earned
// by beating rivals in Career (see career.ts). Paddle colours avoid cyan so
// your paddle never looks like the opponent's.

export type PaddleSkin = { id: string; name: string; color: string };

export type TableSkin = {
  id: string;
  name: string;
  table: string; // surface
  edge: string; // rail glow
  line: string; // centre line and rings
  hole: string; // air holes
};

export const PADDLES: PaddleSkin[] = [
  { id: 'pink', name: 'Neon Pink', color: colors.p0 },
  { id: 'lime', name: 'Lime', color: '#9dff3c' },
  { id: 'orange', name: 'Blaze', color: '#ff8a1f' },
  { id: 'violet', name: 'Ultraviolet', color: '#b36bff' },
  { id: 'red', name: 'Red Alert', color: '#ff3b4d' },
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
  table('gold', 'Champion Gold', '#1d1606', '#ffbf3c'),
];

export const paddleSkin = (id: string) => PADDLES.find((p) => p.id === id) ?? PADDLES[0];
export const tableSkin = (id: string) => TABLES.find((t) => t.id === id) ?? TABLES[0];
