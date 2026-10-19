export const colors = {
  bg: '#08051c',
  table: '#0d0a2e',
  tableEdge: '#7a5cff',
  line: 'rgba(122, 92, 255, 0.55)',
  hole: 'rgba(160, 140, 255, 0.10)',
  p0: '#ff2daa', // bottom player (you)
  p1: '#28f0ff', // top player (CPU / player 2)
  puck: '#fff078',
  text: '#f4f1ff',
  dim: '#8f88b8',
  panel: 'rgba(8, 5, 28, 0.88)',
};

export const playerColor = (p: 0 | 1) => (p === 0 ? colors.p0 : colors.p1);

export const glow = (color: string, radius = 16, spread = 2) => `0 0 ${radius}px ${spread}px ${color}`;
