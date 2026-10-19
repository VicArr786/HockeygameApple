import type { Sim, Vec } from './physics';

export type Difficulty = 'easy' | 'normal' | 'hard';

type Params = {
  speed: number; // paddle speed in table-widths per second
  reaction: number; // seconds between re-planning
  error: number; // aim noise in table-widths
  aggression: number; // 0..1, how readily it leaves defence to attack
};

const PARAMS: Record<Difficulty, Params> = {
  easy: { speed: 1.1, reaction: 0.26, error: 0.14, aggression: 0.45 },
  normal: { speed: 1.9, reaction: 0.13, error: 0.07, aggression: 0.75 },
  hard: { speed: 3.0, reaction: 0.05, error: 0.025, aggression: 1 },
};

// CPU opponent controlling the top paddle (player 1).
export class CpuPlayer {
  private p: Params;
  private plan: Vec;
  private untilReplan = 0;
  private aimX = 0;

  constructor(difficulty: Difficulty, private rand: () => number = Math.random) {
    this.p = PARAMS[difficulty];
    this.plan = { x: 0, y: 0 };
  }

  update(sim: Sim, dt: number): Vec {
    const t = sim.table;
    const me = sim.paddles[1];
    const W = t.W;

    this.untilReplan -= dt;
    if (this.untilReplan <= 0) {
      this.untilReplan = this.p.reaction;
      this.aimX = W / 2 + (this.rand() - 0.5) * t.goalW * 0.7;
      this.plan = this.choose(sim);
      this.plan.x += (this.rand() - 0.5) * this.p.error * W;
    }

    // Move toward the plan at limited speed; the physics clamps to our half.
    const dx = this.plan.x - me.x;
    const dy = this.plan.y - me.y;
    const d = Math.hypot(dx, dy);
    const max = this.p.speed * W * dt;
    if (d <= max || d === 0) return { ...this.plan };
    return { x: me.x + (dx / d) * max, y: me.y + (dy / d) * max };
  }

  private choose(sim: Sim): Vec {
    const { table: t, puck } = sim;
    const me = sim.paddles[1];
    const { W, H } = t;
    const reach = t.paddleR + t.puckR;
    const defendY = H * 0.11 + t.paddleR * 0.5;
    const speed = Math.hypot(puck.vx, puck.vy);

    if (!sim.puckInPlay) return { x: W / 2, y: defendY };

    const inMyHalf = puck.y < H / 2 + t.puckR;
    const threatening = puck.vy < -W * 0.5 * (1.2 - this.p.aggression);
    const attack = inMyHalf && (!threatening || speed < W * 0.6);

    if (attack) {
      if (me.y < puck.y - t.puckR * 0.3) {
        // Behind the puck: drive through it toward the aim point.
        const ax = this.aimX - puck.x;
        const ay = H - puck.y;
        const al = Math.hypot(ax, ay) || 1;
        return { x: puck.x + (ax / al) * reach * 0.6, y: puck.y + (ay / al) * reach * 0.6 };
      }
      // In front of the puck: swing around it without knocking it home.
      const side = me.x < puck.x ? -1 : 1;
      const sx = puck.x + side * reach * 1.15;
      const x = sx < t.paddleR || sx > W - t.paddleR ? puck.x - side * reach * 1.15 : sx;
      return { x, y: puck.y - reach * 1.1 };
    }

    // Defend: intercept where the puck will cross our guard line.
    if (puck.vy < 0) {
      const time = (defendY - puck.y) / puck.vy;
      const x = reflect(puck.x + puck.vx * time, t.puckR, W - t.puckR);
      return { x: W / 2 + (x - W / 2) * 0.85, y: defendY };
    }
    return { x: W / 2 + (puck.x - W / 2) * 0.5, y: defendY };
  }
}

// Fold a coordinate back into [lo, hi] as if bouncing off walls.
function reflect(x: number, lo: number, hi: number): number {
  const span = hi - lo;
  if (span <= 0) return lo;
  let v = (x - lo) % (2 * span);
  if (v < 0) v += 2 * span;
  return lo + (v > span ? 2 * span - v : v);
}
