// The table is neon; everything around it is an arcade cabinet: flat plum
// panels, chunky marquee type, push-button plates and LED scoreboards.
export const colors = {
  bg: '#17132b', // cabinet
  plate: '#241e40', // raised panels and idle buttons
  plateEdge: '#0e0b1c', // the hard shadow under a plate
  plateHi: '#332b5c', // secondary buttons sitting on a plate
  table: '#0d0a2e',
  tableEdge: '#7a5cff',
  line: 'rgba(122, 92, 255, 0.55)',
  hole: 'rgba(160, 140, 255, 0.10)',
  p0: '#ff2daa', // bottom player (you)
  p1: '#28f0ff', // top player (CPU / player 2)
  puck: '#fff078',
  marquee: '#ffd23f', // the one action colour off the table
  text: '#f2efff',
  dim: '#9a93c4',
  ink: '#17132b', // text on bright plates
  panel: 'rgba(23, 19, 43, 0.82)', // scrim behind overlays
};

export const fonts = {
  logo: 'BungeeInline_400Regular', // the neon-tube sign; logo only
  display: 'Bungee_400Regular', // titles and button faces
  body: 'BarlowSemiCondensed_500Medium',
  bold: 'BarlowSemiCondensed_700Bold',
};

export const playerColor = (p: 0 | 1) => (p === 0 ? colors.p0 : colors.p1);

export const glow = (color: string, radius = 16, spread = 2) => `0 0 ${radius}px ${spread}px ${color}`;

// A plate's hard, unblurred drop edge.
export const plateShadow = (depth = 5) => `0 ${depth}px 0 0 ${colors.plateEdge}`;
