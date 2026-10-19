import type { Sim, Vec } from './physics';

export type Difficulty = 'easy' | 'normal' | 'hard';

export type CpuParams = {
  speed: number; // paddle speed in table-widths per second
  reaction: number; // seconds between re-planning
  error: number; // aim noise in table-widths
  aggression: number; // 0..1, how readily it leaves defence to attack
};

export const DIFFICULTY_PARAMS: Record<Difficulty, CpuParams> = {
  easy: { speed: 1.1, reaction: 0.26, error: 0.14, aggression: 0.45 },
  normal: { speed: 1.9, reaction: 0.13, error: 0.07, aggression: 0.75 },
  hard: { speed: 3.0, reaction: 0.05, error: 0.025, aggression: 1 },
};

// How long the puck may sit still in our half before we stop lining up a
// clean shot and just hit it.
const STALL_SECONDS = 1.1;

// CPU opponent controlling the top paddle (player 1). It attacks toward
// larger y (the bottom goal) and defends the goal at y = 0.
export class CpuPlayer {
  private p: CpuParams;
  private plan: Vec;
  private untilReplan = 0;
  private stalled = 0; // seconds the puck has been slow in our half
  private target: Vec | null = null; // shot target for the current attack

  constructor(params: CpuParams, private rand: () => number = Math.random) {
    this.p = params;
    this.plan = { x: 0, y: 0 };
  }

  setParams(params: CpuParams) {
    this.p = params;
  }

  // 0 for the clumsiest rival, 1 at OMEGA level. Drives the smarter shot
  // choices so the early Career stays forgiving.
  private get skill() {
    return Math.min(1, Math.max(0, (0.17 - this.p.error) / 0.155));
  }

  update(sim: Sim, dt: number): Vec {
    const t = sim.table;
    const me = sim.paddles[1];
    const W = t.W;

    const slow = Math.hypot(sim.puck.vx, sim.puck.vy) < W * 0.2;
    this.stalled = sim.puckInPlay && slow && sim.puck.y < t.H / 2 + t.puckR ? this.stalled + dt : 0;

    this.untilReplan -= dt;
    if (this.stalled > STALL_SECONDS) {
      // Stuck puck: re-plan every frame so jabs and retreats are crisp.
      this.plan = this.unstick(sim);
    } else if (this.untilReplan <= 0) {
      this.untilReplan = this.p.reaction;
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
    const defendY = H * 0.11 + me.r * 0.5;
    const speed = Math.hypot(puck.vx, puck.vy);

    if (!sim.puckInPlay) {
      this.target = null;
      return { x: W / 2, y: defendY };
    }

    const inMyHalf = puck.y < H / 2 + t.puckR;
    const threatening = puck.vy < -W * 0.5 * (1.2 - this.p.aggression);
    const attack = inMyHalf && (!threatening || speed < W * 0.6);

    if (attack) return this.strike(sim);
    this.target = null;

    // Defend: intercept where the puck will cross our guard line.
    if (puck.vy < 0) {
      const time = (defendY - puck.y) / puck.vy;
      const x = reflect(puck.x + puck.vx * time, t.puckR, W - t.puckR);
      return { x: W / 2 + (x - W / 2) * 0.85, y: defendY };
    }
    return { x: W / 2 + (puck.x - W / 2) * 0.5, y: defendY };
  }

  // Where to put the paddle to hit the puck toward a target.
  private strike(sim: Sim): Vec {
    const { puck } = sim;

    // Keep the same target for the whole attack so the approach is steady.
    if (!this.target) this.target = this.pickTarget(sim);
    const ax = this.target.x - puck.x;
    const ay = this.target.y - puck.y;
    const al = Math.hypot(ax, ay) || 1;
    const dir = this.bestDirection(sim, { x: ax / al, y: ay / al });
    return dir ? this.strikeAlong(sim, dir) : this.jab(sim);
  }

  // The puck has sat in our half too long: forget the aim and get it out,
  // along any reachable line, or by jabbing it off the walls.
  private unstick(sim: Sim): Vec {
    const dir = this.bestDirection(sim, { x: 0, y: 1 });
    return dir ? this.strikeAlong(sim, dir) : this.jab(sim);
  }

  // For a puck jammed in a corner, where every push only drives it deeper:
  // hit it, then pull back so it can bounce out off the walls.
  private jab(sim: Sim): Vec {
    const { table: t, puck } = sim;
    const me = sim.paddles[1];
    const reach = me.r + t.puckR;
    const ox = t.W / 2 - puck.x;
    const oy = t.H * 0.3 - puck.y;
    const ol = Math.hypot(ox, oy) || 1;
    const close = Math.hypot(me.x - puck.x, me.y - puck.y) < reach * 1.2;
    return close
      ? { x: puck.x + (ox / ol) * reach * 2.4, y: puck.y + (oy / ol) * reach * 2.4 }
      : { x: puck.x - (ox / ol) * reach * 0.3, y: puck.y - (oy / ol) * reach * 0.3 };
  }

  // Line up behind the puck along `dir` and hit it through.
  private strikeAlong(sim: Sim, dir: Vec): Vec {
    const { table: t, puck } = sim;
    const me = sim.paddles[1];
    const { W, H } = t;
    const reach = me.r + t.puckR;

    // Strike point: just behind the puck along the shot line.
    const sx = puck.x - dir.x * reach * 1.05;
    const sy = puck.y - dir.y * reach * 1.05;
    // How far "behind" the puck we are along the shot line (positive = ready).
    const behind = (puck.x - me.x) * dir.x + (puck.y - me.y) * dir.y;
    const offLine = Math.abs((me.x - puck.x) * dir.y - (me.y - puck.y) * dir.x);

    // Better players wait until they're squarely on the line before striking.
    const tolerance = reach * (0.55 - 0.4 * this.skill);
    if (behind > reach * 0.6 && offLine < tolerance) {
      // Lined up: follow through the puck.
      return { x: puck.x + dir.x * reach * 0.9, y: puck.y + dir.y * reach * 0.9 };
    }
    if (behind > -reach * 0.2) {
      // Roughly behind it: slide onto the strike point.
      return { x: sx, y: sy };
    }
    // On the wrong side: go around, passing beside the puck rather than
    // through it, on whichever side has room.
    const px = -dir.y;
    const py = dir.x;
    const side = (me.x - puck.x) * px + (me.y - puck.y) * py >= 0 ? 1 : -1;
    for (const s of [side, -side]) {
      const wx = puck.x + px * s * reach * 1.35 - dir.x * reach * 0.4;
      const wy = puck.y + py * s * reach * 1.35 - dir.y * reach * 0.4;
      if (wx > me.r && wx < W - me.r && wy > me.r && wy < H / 2 - me.r * 0.25) return { x: wx, y: wy };
    }
    return { x: sx, y: sy };
  }

  // A shot direction close to `want` whose strike point we can reach, never
  // sending the puck back toward our own goal. Null if nothing fits.
  private bestDirection(sim: Sim, want: Vec): Vec | null {
    const { table: t, puck } = sim;
    const me = sim.paddles[1];
    const { W, H } = t;
    const reach = me.r + t.puckR;
    const base = Math.atan2(want.y, want.x);
    for (let k = 0; k <= 12; k++) {
      // Try the wanted angle first, then fan out either side of it.
      for (const sgn of k === 0 ? [1] : [1, -1]) {
        const a = base + sgn * k * (Math.PI / 24);
        const dir = { x: Math.cos(a), y: Math.sin(a) };
        if (dir.y < -0.05) continue; // toward our own goal
        const sx = puck.x - dir.x * reach * 1.05;
        const sy = puck.y - dir.y * reach * 1.05;
        if (sx >= me.r && sx <= W - me.r && sy >= me.r * 0.9 && sy <= H / 2 - me.r * 0.25) return dir;
      }
    }
    return null;
  }

  // Where to shoot. Clumsy rivals pick a random spot in the goal; better
  // ones aim away from your paddle, and the best bank it off a wall when the
  // straight line is covered.
  private pickTarget(sim: Sim): Vec {
    const { table: t, puck } = sim;
    const you = sim.paddles[0];
    const { W, H } = t;
    const half = t.goalWs[0] / 2;
    let x = W / 2 + (this.rand() - 0.5) * half * 1.4;
    if (this.rand() < this.skill * 0.85) {
      // The open side of the goal, away from the defender. Only accurate
      // players dare aim close to the post.
      const open = you.x > W / 2 ? -1 : 1;
      x = W / 2 + open * half * (0.2 + 0.5 * this.skill * (0.6 + this.rand() * 0.4));
    }
    const target = { x, y: H };
    if (this.rand() < (this.skill - 0.5) * 0.9 && blocked(puck, target, you, t.puckR)) {
      // Bank shot: aim at the goal's mirror image behind a side wall.
      const wall = puck.x < W / 2 ? 0 : W;
      const mirrorX = 2 * (wall === 0 ? t.puckR : W - t.puckR) - x;
      return { x: mirrorX, y: H };
    }
    return target;
  }
}

// Whether the defender's paddle sits across the straight line from the puck
// to the target.
function blocked(from: Vec, to: Vec, by: { x: number; y: number; r: number }, puckR: number): boolean {
  const dx = to.x - from.x;
  const dy = to.y - from.y;
  const len2 = dx * dx + dy * dy || 1;
  const u = Math.max(0, Math.min(1, ((by.x - from.x) * dx + (by.y - from.y) * dy) / len2));
  const cx = from.x + dx * u;
  const cy = from.y + dy * u;
  return Math.hypot(by.x - cx, by.y - cy) < by.r + puckR;
}

// Fold a coordinate back into [lo, hi] as if bouncing off walls.
function reflect(x: number, lo: number, hi: number): number {
  const span = hi - lo;
  if (span <= 0) return lo;
  let v = (x - lo) % (2 * span);
  if (v < 0) v += 2 * span;
  return lo + (v > span ? 2 * span - v : v);
}
