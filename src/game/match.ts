import { buzz, playSound } from '../feedback';
import { CpuPlayer, type CpuParams } from './ai';
import { createSim, makeTable, servePuck, step, type Sim, type SimMods, type Vec } from './physics';

export type Phase = 'countdown' | 'play' | 'goal' | 'paused' | 'over';
export type TouchPoint = { id: number; x: number; y: number };

export const COUNTDOWN = 3;
const MAX_LIVES = 5;

// Endless survival: the CPU and rules for the run so far, given your points.
export type EndlessLevel = { cpu: CpuParams; sim: SimMods; wave: number; boss: boolean; labels: string[] };
export type EndlessRules = { lives: number; level: (points: number) => EndlessLevel };
const GOAL_PAUSE = 1.4;

type Options = {
  W: number;
  H: number;
  twoPlayer: boolean;
  cpu: CpuParams; // ignored in two-player games
  mods?: SimMods;
  startScore?: [number, number]; // a boss can start with goals in the bank
  endless?: EndlessRules; // no target: play until out of lives
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
  elapsed = 0; // seconds of unpaused play, for animations
  score: [number, number] = [0, 0];
  lastScorer: 0 | 1 = 0;
  winner: 0 | 1 | null = null;
  trail: Vec[] = [];
  // Endless only.
  lives = 0;
  level: EndlessLevel | null = null;
  announceUntil = 0; // `elapsed` time until which the new wave is shown

  private cpu: CpuPlayer | null;
  private resumeTo: Phase = 'countdown';
  private owners = new Map<number, 0 | 1 | -1>();

  constructor(private opts: Options) {
    this.sim = createSim(opts.W, opts.H, opts.mods);
    if (opts.startScore) this.score = [opts.startScore[0], opts.startScore[1]];
    this.sim.puckInPlay = false;
    this.twoPlayer = opts.twoPlayer;
    this.cpu = opts.twoPlayer ? null : new CpuPlayer(opts.cpu);
    if (opts.endless) {
      this.lives = opts.endless.lives;
      this.applyLevel(opts.endless.level(0));
    }
  }

  private applyLevel(level: EndlessLevel) {
    const changed = level.wave !== this.level?.wave;
    this.level = level;
    this.cpu?.setParams(level.cpu);
    if (!changed) return;
    // New wave, new rules. Only called while the puck is out of play.
    const { sim } = this;
    sim.table = makeTable(sim.table.W, sim.table.H, level.sim);
    sim.puck.r = sim.table.puckR;
    sim.paddles[0].r = sim.table.paddleRs[0];
    sim.paddles[1].r = sim.table.paddleRs[1];
    if (level.wave > 0) this.announceUntil = this.elapsed + 2.6;
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
    this.elapsed += dt;

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
    const { endless } = this.opts;
    if (endless) {
      if (scorer === 0) {
        // A bonus life every 10 points.
        if (this.score[0] % 10 === 0) this.lives = Math.min(MAX_LIVES, this.lives + 1);
        this.applyLevel(endless.level(this.score[0]));
        playSound('goal');
      } else if (--this.lives <= 0) {
        this.winner = 1;
        playSound('concede');
      } else {
        playSound('concede');
      }
      return;
    }
    if (this.score[scorer] >= this.opts.target) {
      this.winner = scorer;
      playSound(good ? 'win' : 'concede');
    } else {
      playSound(good ? 'goal' : 'concede');
    }
  }
}
