// Pure air-hockey simulation. All units are pixels of the table rect; every
// size and speed is derived from the table width so play feels identical on
// every device. Player 0 defends the bottom goal, player 1 the top goal.

export type Vec = { x: number; y: number };
export type Body = { x: number; y: number; vx: number; vy: number; r: number };

export type GameEvent =
  | { type: 'hit'; strength: number }
  | { type: 'wall'; strength: number }
  | { type: 'goal'; scorer: 0 | 1 };

export type Table = {
  W: number;
  H: number;
  puckR: number;
  paddleR: number; // standard size; see paddleRs for the actual per-player size
  goalW: number; // standard width; see goalWs
  // Per player: index 0 is the bottom player, 1 the top. goalWs[i] is the
  // width of the goal player i defends.
  paddleRs: [number, number];
  goalWs: [number, number];
  maxPuckSpeed: number;
  maxPaddleSpeed: number;
  drag: number;
  wallRestitution: number;
};

// Rule changes used by Career bosses. Scales are relative to a standard table.
export type SimMods = {
  paddleScale?: [number, number];
  goalScale?: [number, number];
  puckScale?: number;
  speedScale?: number;
  dragScale?: number;
  bounce?: number; // wall restitution
};

export type Sim = {
  table: Table;
  puck: Body;
  paddles: [Body, Body];
  // Where each paddle wants to be this frame (finger or AI position).
  targets: [Vec, Vec];
  puckInPlay: boolean;
};

const WALL_RESTITUTION = 0.88;
const PADDLE_RESTITUTION = 0.9;
// Exponential drag per second; air tables are nearly frictionless.
const DRAG = 0.22;

export function makeTable(W: number, H: number, mods: SimMods = {}): Table {
  const paddleR = W * 0.085;
  const goalW = W * 0.38;
  const ps = mods.paddleScale ?? [1, 1];
  const gs = mods.goalScale ?? [1, 1];
  return {
    W,
    H,
    puckR: W * 0.055 * (mods.puckScale ?? 1),
    paddleR,
    goalW,
    paddleRs: [paddleR * ps[0], paddleR * ps[1]],
    // Never wider than the table minus room for the posts.
    goalWs: [Math.min(W * 0.8, goalW * gs[0]), Math.min(W * 0.8, goalW * gs[1])],
    maxPuckSpeed: W * 3.2 * (mods.speedScale ?? 1),
    maxPaddleSpeed: W * 7,
    drag: DRAG * (mods.dragScale ?? 1),
    wallRestitution: mods.bounce ?? WALL_RESTITUTION,
  };
}

export function createSim(W: number, H: number, mods?: SimMods): Sim {
  const table = makeTable(W, H, mods);
  const sim: Sim = {
    table,
    puck: { x: W / 2, y: H / 2, vx: 0, vy: 0, r: table.puckR },
    paddles: [
      { x: W / 2, y: H * 0.85, vx: 0, vy: 0, r: table.paddleRs[0] },
      { x: W / 2, y: H * 0.15, vx: 0, vy: 0, r: table.paddleRs[1] },
    ],
    targets: [
      { x: W / 2, y: H * 0.85 },
      { x: W / 2, y: H * 0.15 },
    ],
    puckInPlay: true,
  };
  return sim;
}

// Puck is served stationary in the half of the player who just conceded.
export function servePuck(sim: Sim, toPlayer: 0 | 1) {
  const { W, H } = sim.table;
  sim.puck.x = W / 2;
  sim.puck.y = toPlayer === 0 ? H * 0.68 : H * 0.32;
  sim.puck.vx = 0;
  sim.puck.vy = 0;
  sim.puckInPlay = true;
}

export function clampPaddle(t: Table, player: 0 | 1, p: Vec): Vec {
  const r = t.paddleRs[player];
  // Paddles may reach slightly past their own side of the centre line so a
  // puck resting on the line can always be played.
  const reach = r * 0.25;
  const x = Math.min(t.W - r, Math.max(r, p.x));
  const y =
    player === 0
      ? Math.min(t.H - r, Math.max(t.H / 2 + reach, p.y))
      : Math.max(r, Math.min(t.H / 2 - reach, p.y));
  return { x, y };
}

const clampSpeed = (b: { vx: number; vy: number }, max: number) => {
  const s = Math.hypot(b.vx, b.vy);
  if (s > max) {
    b.vx *= max / s;
    b.vy *= max / s;
  }
};

export function step(sim: Sim, dt: number): GameEvent[] {
  const events: GameEvent[] = [];
  const t = sim.table;
  const { puck, paddles } = sim;

  const starts = paddles.map((p) => ({ x: p.x, y: p.y }));
  const ends = ([0, 1] as const).map((i) => clampPaddle(t, i, sim.targets[i]));

  // Limit how far a paddle can jump in one frame (finger teleports).
  const maxMove = t.maxPaddleSpeed * dt;
  for (let i = 0; i < 2; i++) {
    const dx = ends[i].x - starts[i].x;
    const dy = ends[i].y - starts[i].y;
    const d = Math.hypot(dx, dy);
    if (d > maxMove) {
      ends[i] = { x: starts[i].x + (dx / d) * maxMove, y: starts[i].y + (dy / d) * maxMove };
    }
    paddles[i].vx = (ends[i].x - starts[i].x) / dt;
    paddles[i].vy = (ends[i].y - starts[i].y) / dt;
  }

  // Sub-step so fast paddles and pucks never tunnel through each other.
  const travel = Math.max(
    Math.hypot(ends[0].x - starts[0].x, ends[0].y - starts[0].y),
    Math.hypot(ends[1].x - starts[1].x, ends[1].y - starts[1].y),
    Math.hypot(puck.vx, puck.vy) * dt,
  );
  const n = Math.min(24, Math.max(1, Math.ceil(travel / (t.puckR * 0.5))));
  const h = dt / n;
  let hitStrength = 0;
  let wallStrength = 0;

  for (let s = 1; s <= n; s++) {
    for (let i = 0; i < 2; i++) {
      paddles[i].x = starts[i].x + ((ends[i].x - starts[i].x) * s) / n;
      paddles[i].y = starts[i].y + ((ends[i].y - starts[i].y) * s) / n;
    }
    if (!sim.puckInPlay) continue;

    puck.x += puck.vx * h;
    puck.y += puck.vy * h;

    for (let i = 0; i < 2; i++) {
      hitStrength = Math.max(hitStrength, collidePaddle(puck, paddles[i]));
    }
    clampSpeed(puck, t.maxPuckSpeed);

    wallStrength = Math.max(wallStrength, collideWalls(sim));

    // A puck pinned against a wall pushes the paddle back instead of
    // overlapping it.
    for (let i = 0 as 0 | 1; i < 2; i = (i + 1) as 0 | 1) {
      const p = paddles[i];
      const dx = p.x - puck.x;
      const dy = p.y - puck.y;
      const d = Math.hypot(dx, dy);
      const min = p.r + puck.r;
      if (d < min && d > 0.0001) {
        const c = clampPaddle(t, i, { x: puck.x + (dx / d) * min, y: puck.y + (dy / d) * min });
        p.x = c.x;
        p.y = c.y;
      }
    }

    const scorer = checkGoal(sim);
    if (scorer !== null) {
      sim.puckInPlay = false;
      events.push({ type: 'goal', scorer });
      break;
    }
  }

  if (sim.puckInPlay) {
    const k = Math.exp(-t.drag * dt);
    puck.vx *= k;
    puck.vy *= k;
  }

  if (hitStrength > 0) events.push({ type: 'hit', strength: hitStrength });
  if (wallStrength > 0) events.push({ type: 'wall', strength: wallStrength });
  return events;
}

// Returns impact strength in 0..1 (0 = no collision).
function collidePaddle(puck: Body, p: Body): number {
  const dx = puck.x - p.x;
  const dy = puck.y - p.y;
  const d = Math.hypot(dx, dy);
  const min = puck.r + p.r;
  if (d >= min) return 0;
  // Degenerate exact overlap: shove the puck straight up/down.
  const nx = d > 0.0001 ? dx / d : 0;
  const ny = d > 0.0001 ? dy / d : 1;
  puck.x = p.x + nx * min;
  puck.y = p.y + ny * min;
  // Paddle is effectively infinite mass.
  const rvx = puck.vx - p.vx;
  const rvy = puck.vy - p.vy;
  const along = rvx * nx + rvy * ny;
  if (along >= 0) return 0;
  puck.vx -= (1 + PADDLE_RESTITUTION) * along * nx;
  puck.vy -= (1 + PADDLE_RESTITUTION) * along * ny;
  return Math.min(1, -along / (p.r * 40));
}

function collideWalls(sim: Sim): number {
  const { puck, table: t } = sim;
  const r = puck.r;
  let strength = 0;
  const bounce = (v: number) => {
    strength = Math.max(strength, Math.min(1, Math.abs(v) / t.maxPuckSpeed));
    return -v * t.wallRestitution;
  };

  if (puck.x < r) {
    puck.x = r;
    if (puck.vx < 0) puck.vx = bounce(puck.vx);
  } else if (puck.x > t.W - r) {
    puck.x = t.W - r;
    if (puck.vx > 0) puck.vx = bounce(puck.vx);
  }

  // The goal at the end the puck is nearest: top is player 1's, bottom player 0's.
  const goalW = puck.y < t.H / 2 ? t.goalWs[1] : t.goalWs[0];
  const gl = t.W / 2 - goalW / 2;
  const gr = t.W / 2 + goalW / 2;
  // Once past the goal line the puck is inside the goal box.
  if (puck.y < 0 || puck.y > t.H) puck.x = Math.min(gr, Math.max(gl, puck.x));
  const inMouth = puck.x > gl && puck.x < gr;

  if (!inMouth) {
    if (puck.y < r) {
      puck.y = r;
      if (puck.vy < 0) puck.vy = bounce(puck.vy);
    } else if (puck.y > t.H - r) {
      puck.y = t.H - r;
      if (puck.vy > 0) puck.vy = bounce(puck.vy);
    }
  }

  // Goal posts behave like round bumpers at the mouth edges.
  const py = puck.y < t.H / 2 ? 0 : t.H;
  for (const px of [gl, gr]) {
    const dx = puck.x - px;
    const dy = puck.y - py;
    const d = Math.hypot(dx, dy);
    if (d < r && d > 0.0001) {
      const nx = dx / d;
      const ny = dy / d;
      puck.x = px + nx * r;
      puck.y = py + ny * r;
      const along = puck.vx * nx + puck.vy * ny;
      if (along < 0) {
        strength = Math.max(strength, Math.min(1, -along / t.maxPuckSpeed));
        puck.vx -= (1 + t.wallRestitution) * along * nx;
        puck.vy -= (1 + t.wallRestitution) * along * ny;
      }
    }
  }
  return strength;
}

function checkGoal(sim: Sim): 0 | 1 | null {
  const { puck, table: t } = sim;
  if (puck.y > t.H + puck.r * 0.6) return 1;
  if (puck.y < -puck.r * 0.6) return 0;
  return null;
}
