import { buzz, playSound } from '../feedback';
import { CpuPlayer, type Difficulty } from './ai';
import { createSim, servePuck, step, type Sim, type Vec } from './physics';

export type Phase = 'countdown' | 'play' | 'goal' | 'paused' | 'over';
export type TouchPoint = { id: number; x: number; y: number };

export const COUNTDOWN = 3;
const GOAL_PAUSE = 1.4;

type Options = {
  W: number;
  H: number;
  twoPlayer: boolean;
  difficulty: Difficulty;
  target: number;
  // Rectangle (table coords) where touches are ignored, e.g. the pause button.
  deadZone: { x: number; y: number; w: number; h: number };
};

// One game of air hockey: the phase machine, scoring, input routing and
// sound/haptic feedback around the pure physics simulation. Mutable on
// purpose; the screen re-renders from it every animation frame.
export class Match {
  readonly sim: Sim;
  readonly twoPlayer: boolean;
  phase: Phase = 'countdown';
  phaseT = 0;
  score: [number, number] = [0, 0];
  lastScorer: 0 | 1 = 0;
  winner: 0 | 1 | null = null;
  trail: Vec[] = [];

  private cpu: CpuPlayer | null;
  private resumeTo: Phase = 'countdown';
  private owners = new Map<number, 0 | 1 | -1>();

  constructor(private opts: Options) {
    this.sim = createSim(opts.W, opts.H);
    this.sim.puckInPlay = false;
    this.twoPlayer = opts.twoPlayer;
    this.cpu = opts.twoPlayer ? null : new CpuPlayer(opts.difficulty);
  }

  pause() {
    if (this.phase === 'paused' || this.phase === 'over') return;
    this.resumeTo = this.phase;
    this.phase = 'paused';
  }

  resume() {
    if (this.phase === 'paused') this.phase = this.resumeTo;
  }

  // Every finger is assigned to the paddle on the half where it landed and
  // keeps driving that paddle until lifted, so two players can play at once.
  handleTouches(touches: TouchPoint[]) {
    const { W, H, paddleR } = this.sim.table;
    const dz = this.opts.deadZone;
    const active = new Set<number>();
    for (const t of touches) {
      active.add(t.id);
      let owner = this.owners.get(t.id);
      if (owner === undefined) {
        const inDeadZone = t.x >= dz.x && t.x <= dz.x + dz.w && t.y >= dz.y && t.y <= dz.y + dz.h;
        if (inDeadZone) owner = -1;
        else if (!this.twoPlayer) owner = 0;
        else {
          const half: 0 | 1 = t.y > H / 2 ? 0 : 1;
          owner = [...this.owners.values()].includes(half) ? -1 : half;
        }
        this.owners.set(t.id, owner);
      }
      if (owner === -1) continue;
      // Offset the paddle slightly ahead of the finger so it stays visible.
      const offset = owner === 0 ? -paddleR * 0.35 : paddleR * 0.35;
      this.sim.targets[owner] = { x: Math.max(0, Math.min(W, t.x)), y: t.y + offset };
    }
    for (const id of [...this.owners.keys()]) if (!active.has(id)) this.owners.delete(id);
  }

  // Advances one frame.
  tick(dt: number) {
    const { sim } = this;
    if (this.phase === 'paused' || this.phase === 'over') return;

    if (this.cpu) sim.targets[1] = this.cpu.update(sim, dt);

    if (this.phase === 'countdown') {
      const before = this.phaseT === 0 ? -1 : Math.floor(this.phaseT);
      this.phaseT += dt;
      if (this.phaseT < COUNTDOWN && Math.floor(this.phaseT) !== before) playSound('beep', 0.7);
      if (this.phaseT >= COUNTDOWN) {
        this.phase = 'play';
        this.phaseT = 0;
        sim.puckInPlay = true;
        playSound('go', 0.8);
        buzz('medium');
      }
    } else if (this.phase === 'goal') {
      this.phaseT += dt;
      if (this.phaseT >= GOAL_PAUSE) {
        if (this.winner !== null) {
          this.phase = 'over';
          return;
        }
        this.phase = 'play';
        this.phaseT = 0;
        servePuck(sim, this.lastScorer === 0 ? 1 : 0);
        this.trail = [];
      }
    } else {
      this.phaseT += dt;
    }

    for (const e of step(sim, dt)) {
      if (e.type === 'hit' && e.strength > 0.02) {
        playSound('hit', 0.3 + 0.7 * e.strength);
        buzz(e.strength > 0.6 ? 'heavy' : e.strength > 0.25 ? 'medium' : 'light');
      } else if (e.type === 'wall' && e.strength > 0.04) {
        playSound('wall', 0.2 + 0.8 * e.strength);
      } else if (e.type === 'goal') {
        this.onGoal(e.scorer);
      }
    }

    if (this.phase === 'play') {
      this.trail.push({ x: sim.puck.x, y: sim.puck.y });
      if (this.trail.length > 7) this.trail.shift();
    }
  }

  private onGoal(scorer: 0 | 1) {
    this.score[scorer]++;
    this.lastScorer = scorer;
    this.phase = 'goal';
    this.phaseT = 0;
    const good = this.twoPlayer || scorer === 0;
    buzz(good ? 'success' : 'error');
    if (this.score[scorer] >= this.opts.target) {
      this.winner = scorer;
      playSound(good ? 'win' : 'concede');
    } else {
      playSound(good ? 'goal' : 'concede');
    }
  }
}
