import { useKeepAwake } from 'expo-keep-awake';
import { StatusBar } from 'expo-status-bar';
import { useEffect, useMemo, useState, type ReactNode } from 'react';
import {
  AppState,
  Platform,
  Pressable,
  StyleSheet,
  Text,
  useWindowDimensions,
  View,
  type GestureResponderEvent,
} from 'react-native';
import { useSafeAreaInsets } from 'react-native-safe-area-context';

import { NeonButton } from '../components/NeonButton';
import { TableArt } from '../components/TableArt';
import { rewardInfo, type Reward } from '../career';
import type { CpuParams } from '../game/ai';
import { COUNTDOWN, Match } from '../game/match';
import { paddleSkin, tableSkin } from '../skins';
import { colors, glow } from '../theme';
import type { GameMode } from './MenuScreen';

const MARGIN = 10;
const PAUSE_BTN = 44;

type Props = {
  mode: GameMode;
  cpu: CpuParams;
  opponent?: string; // Career rival's name
  reward?: Reward; // shown when this win unlocks something
  finalBoss?: boolean;
  target: number;
  paddle: string; // skin ids
  table: string;
  onNext?: () => void; // play the next Career rival
  onExit: () => void;
  onResult: (won: boolean) => void;
};

type Layout = { W: number; H: number; left: number; top: number };

export function GameScreen(props: Props) {
  useKeepAwake();
  const insets = useSafeAreaInsets();
  const { width: sw, height: sh } = useWindowDimensions();

  // Fit a ~2:1 table inside the safe area (wider tables look odd on iPad).
  const layout = useMemo((): Layout => {
    const availW = sw - insets.left - insets.right - MARGIN * 2;
    const availH = sh - insets.top - insets.bottom - MARGIN * 2;
    const W = Math.floor(Math.min(availW, availH / 1.55));
    const H = Math.floor(Math.min(availH, W * 2.1));
    const left = insets.left + MARGIN + (availW - W) / 2;
    const top = insets.top + MARGIN + (availH - H) / 2;
    return { W, H, left, top };
  }, [sw, sh, insets]);

  // A new table size means a new match (only happens on window resizes).
  return <Board key={`${layout.W}x${layout.H}`} layout={layout} {...props} />;
}

function Board(props: Props & { layout: Layout }) {
  const { mode, cpu, opponent, reward, finalBoss, target, onNext, onExit, onResult, layout } = props;
  const twoP = mode === '2p';
  const skin = tableSkin(props.table);
  // Your paddle wears the chosen skin; the top paddle is always cyan.
  const p0 = paddleSkin(props.paddle).color;
  const pc = (p: 0 | 1) => (p === 0 ? p0 : colors.p1);
  const newMatch = () =>
    new Match({
      W: layout.W,
      H: layout.H,
      twoPlayer: twoP,
      cpu,
      target,
      deadZone: { x: 0, y: layout.H / 2 - PAUSE_BTN, w: PAUSE_BTN + 12, h: PAUSE_BTN * 2 },
    });

  const [match, setMatch] = useState(newMatch);
  const [, setFrame] = useState(0);

  useEffect(() => {
    let raf = 0;
    let last = 0;
    const loop = (now: number) => {
      raf = requestAnimationFrame(loop);
      const dt = last ? Math.min((now - last) / 1000, 1 / 30) : 1 / 60;
      last = now;
      match.tick(dt);
      setFrame((f) => (f + 1) % 1_000_000);
    };
    raf = requestAnimationFrame(loop);
    return () => cancelAnimationFrame(raf);
  }, [match]);

  // Auto-pause when the app is backgrounded or a call comes in.
  useEffect(() => {
    const sub = AppState.addEventListener('change', (s) => s !== 'active' && match.pause());
    return () => sub.remove();
  }, [match]);

  // Record wins/losses against the CPU once per finished match.
  const winner = match.winner;
  useEffect(() => {
    if (winner !== null && !twoP) onResult(winner === 0);
    // eslint-disable-next-line react-hooks/exhaustive-deps -- fire once per match result
  }, [match, winner]);

  const restart = () => setMatch(newMatch());

  const onTouches = (e: GestureResponderEvent) =>
    match.handleTouches(
      Array.from(e.nativeEvent.touches, (t) => ({
        id: Number(t.identifier),
        x: t.pageX - layout.left,
        y: t.pageY - layout.top,
      })),
    );

  // Desktop browsers send mouse events, never touches, so the mouse acts as
  // one more finger: holding the button down drags a paddle.
  useEffect(() => {
    if (Platform.OS !== 'web') return;
    const onPointer = (e: PointerEvent) => {
      if (e.pointerType !== 'mouse') return;
      const held = (e.buttons & 1) === 1;
      match.handleTouches(held ? [{ id: -1, x: e.pageX - layout.left, y: e.pageY - layout.top }] : []);
    };
    const events = ['pointerdown', 'pointermove', 'pointerup'] as const;
    for (const ev of events) window.addEventListener(ev, onPointer);
    return () => {
      for (const ev of events) window.removeEventListener(ev, onPointer);
    };
  }, [match, layout]);

  const g = match;
  const { sim } = g;
  const { W, H, goalW } = sim.table;
  const showPuck = g.phase !== 'goal' && g.phase !== 'over';

  return (
    <View
      style={styles.root}
      onTouchStart={onTouches}
      onTouchMove={onTouches}
      onTouchEnd={onTouches}
      onTouchCancel={onTouches}
    >
      <StatusBar hidden />
      <View style={[styles.table, { left: layout.left, top: layout.top, width: W, height: H, backgroundColor: skin.table }]}>
        <TableArt W={W} H={H} goalW={goalW} skin={skin} p0={p0} />

        {g.phase === 'goal' && (
          <View
            pointerEvents="none"
            style={[
              StyleSheet.absoluteFill,
              { backgroundColor: pc(g.lastScorer), opacity: Math.max(0, 0.25 - g.phaseT * 0.3) },
            ]}
          />
        )}

        <Scoreboard score={g.score} W={W} H={H} twoP={twoP} p0={p0} />

        {showPuck &&
          g.trail.map((p, i) => {
            const k = (i + 1) / (g.trail.length + 1);
            const pr = sim.puck.r * (0.4 + 0.5 * k);
            return (
              <View
                key={i}
                pointerEvents="none"
                style={[styles.circle, { left: p.x - pr, top: p.y - pr, width: pr * 2, height: pr * 2, borderRadius: pr, backgroundColor: colors.puck, opacity: k * 0.25 }]}
              />
            );
          })}

        {showPuck && <Puck x={sim.puck.x} y={sim.puck.y} r={sim.puck.r} />}
        <Paddle x={sim.paddles[1].x} y={sim.paddles[1].y} r={sim.paddles[1].r} color={colors.p1} />
        <Paddle x={sim.paddles[0].x} y={sim.paddles[0].y} r={sim.paddles[0].r} color={p0} />

        <Pressable
          accessibilityRole="button"
          accessibilityLabel="Pause"
          onPress={() => match.pause()}
          hitSlop={6}
          style={[styles.pauseBtn, { top: H / 2 - PAUSE_BTN / 2 }]}
        >
          <View style={styles.pauseBar} />
          <View style={styles.pauseBar} />
        </Pressable>

        <Banners g={g} W={W} H={H} twoP={twoP} pc={pc} opponent={opponent} />
      </View>

      {g.phase === 'paused' && (
        <Overlay>
          <Text style={styles.overlayTitle}>PAUSED</Text>
          <NeonButton label="RESUME" color={colors.p1} onPress={() => match.resume()} style={styles.overlayBtn} />
          <NeonButton label="RESTART" color={colors.puck} onPress={restart} style={styles.overlayBtn} />
          <NeonButton label={opponent ? 'CAREER' : 'MENU'} color={colors.p0} onPress={onExit} style={styles.overlayBtn} />
        </Overlay>
      )}

      {g.phase === 'over' && g.winner !== null && (
        <Overlay>
          {twoP && (
            <Text style={[styles.overlayTitle, styles.flipped, { color: pc(1) }]}>
              {g.winner === 1 ? 'YOU WIN!' : 'YOU LOSE'}
            </Text>
          )}
          <Text style={[styles.overlayTitle, { color: twoP ? pc(0) : pc(g.winner) }]}>
            {g.winner === 0 ? (finalBoss ? 'CHAMPION!' : 'YOU WIN!') : twoP ? 'YOU LOSE' : `${opponent ?? 'CPU'} WINS`}
          </Text>
          <Text style={styles.finalScore}>
            {g.score[0]} – {g.score[1]}
          </Text>
          {g.winner === 0 && reward && <Unlocked reward={reward} />}
          {g.winner === 0 && onNext ? (
            <NeonButton label="NEXT RIVAL" color={colors.puck} onPress={onNext} style={styles.overlayBtn} />
          ) : (
            <NeonButton label="REMATCH" color={colors.p1} onPress={restart} style={styles.overlayBtn} />
          )}
          <NeonButton label={opponent ? 'CAREER' : 'MENU'} color={colors.p0} onPress={onExit} style={styles.overlayBtn} />
        </Overlay>
      )}
    </View>
  );
}

function Puck({ x, y, r }: { x: number; y: number; r: number }) {
  return (
    <View
      pointerEvents="none"
      style={[
        styles.circle,
        { left: x - r, top: y - r, width: r * 2, height: r * 2, borderRadius: r, backgroundColor: colors.puck, boxShadow: glow(colors.puck, 16, 2) },
      ]}
    >
      <View style={{ width: r * 1.2, height: r * 1.2, borderRadius: r * 0.6, borderWidth: 2, borderColor: 'rgba(120, 90, 0, 0.35)' }} />
    </View>
  );
}

function Paddle({ x, y, r, color }: { x: number; y: number; r: number; color: string }) {
  return (
    <View
      pointerEvents="none"
      style={[
        styles.circle,
        {
          left: x - r,
          top: y - r,
          width: r * 2,
          height: r * 2,
          borderRadius: r,
          borderWidth: r * 0.18,
          borderColor: color,
          backgroundColor: `${color}33`,
          boxShadow: glow(color, 18, 3),
        },
      ]}
    >
      <View style={{ width: r * 0.8, height: r * 0.8, borderRadius: r * 0.4, backgroundColor: color, boxShadow: glow(color, 8, 1) }} />
    </View>
  );
}

function Unlocked({ reward }: { reward: Reward }) {
  const { label, color } = rewardInfo(reward);
  return (
    <View style={[styles.unlocked, { borderColor: color, boxShadow: glow(color, 12, 0) }]}>
      <Text style={styles.unlockedKicker}>UNLOCKED</Text>
      <View style={styles.unlockedRow}>
        <View style={[styles.unlockedSwatch, { backgroundColor: color, boxShadow: glow(color, 8, 1) }]} />
        <Text style={styles.unlockedLabel}>{label}</Text>
      </View>
    </View>
  );
}

function Scoreboard({ score, W, H, twoP, p0 }: { score: [number, number]; W: number; H: number; twoP: boolean; p0: string }) {
  const size = Math.round(W * 0.11);
  return (
    <View pointerEvents="none" style={[styles.scoreboard, { top: H / 2 - size * 1.45, right: W * 0.05, height: size * 2.9 }]}>
      <Text style={[styles.score, { fontSize: size, color: colors.p1, textShadowColor: colors.p1 }, twoP && styles.flipped]}>
        {score[1]}
      </Text>
      <Text style={[styles.score, { fontSize: size, color: p0, textShadowColor: p0 }]}>{score[0]}</Text>
    </View>
  );
}

type BannerProps = { g: Match; W: number; H: number; twoP: boolean; pc: (p: 0 | 1) => string; opponent?: string };

function Banners({ g, W, H, twoP, pc, opponent }: BannerProps) {
  let text: string | null = null;
  let color = colors.text;
  if (g.phase === 'countdown') {
    text = String(Math.max(1, COUNTDOWN - Math.floor(g.phaseT)));
  } else if (g.phase === 'play' && g.phaseT < 0.6 && g.score[0] + g.score[1] === 0) {
    text = 'GO!';
    color = colors.puck;
  } else if (g.phase === 'goal') {
    text = 'GOAL!';
    color = pc(g.lastScorer);
  }
  if (!text) return null;
  const size = W * (text.length > 1 ? 0.16 : 0.22);
  const banner = (flip: boolean, top: number) => (
    <Text
      style={[styles.banner, { top, width: W, fontSize: size, color, textShadowColor: color }, flip && styles.flipped]}
    >
      {text}
    </Text>
  );
  // In 2P each player sees the banner the right way up on their own half.
  return (
    <View pointerEvents="none" style={StyleSheet.absoluteFill}>
      {twoP && banner(true, H * 0.25 - size * 0.7)}
      {banner(false, twoP ? H * 0.75 - size * 0.7 : H / 2 - size * 1.6)}
      {opponent && g.phase === 'countdown' && (
        <Text style={[styles.versus, { top: H * 0.27, width: W, fontSize: W * 0.07 }]}>VS {opponent}</Text>
      )}
    </View>
  );
}

function Overlay({ children }: { children: ReactNode }) {
  return (
    <View style={styles.overlay}>
      <View style={styles.overlayCard}>{children}</View>
    </View>
  );
}

const styles = StyleSheet.create({
  root: { flex: 1, backgroundColor: colors.bg, userSelect: 'none' },
  table: { position: 'absolute', backgroundColor: colors.table, borderRadius: 14, overflow: 'hidden' },
  circle: { position: 'absolute', alignItems: 'center', justifyContent: 'center' },
  scoreboard: { position: 'absolute', justifyContent: 'space-between', alignItems: 'center' },
  score: { fontWeight: '900', fontVariant: ['tabular-nums'], textShadowRadius: 12, textShadowOffset: { width: 0, height: 0 }, opacity: 0.9 },
  flipped: { transform: [{ rotate: '180deg' }] },
  pauseBtn: {
    position: 'absolute',
    left: 8,
    width: PAUSE_BTN,
    height: PAUSE_BTN,
    borderRadius: PAUSE_BTN / 2,
    borderWidth: 2,
    borderColor: colors.line,
    backgroundColor: colors.bg,
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'center',
    gap: 5,
  },
  pauseBar: { width: 4, height: 14, borderRadius: 2, backgroundColor: colors.text },
  banner: {
    position: 'absolute',
    left: 0,
    textAlign: 'center',
    fontWeight: '900',
    fontStyle: 'italic',
    textShadowRadius: 20,
    textShadowOffset: { width: 0, height: 0 },
  },
  overlay: { position: 'absolute', top: 0, left: 0, right: 0, bottom: 0, backgroundColor: 'rgba(4, 2, 16, 0.7)', alignItems: 'center', justifyContent: 'center' },
  overlayCard: {
    backgroundColor: colors.panel,
    borderRadius: 24,
    borderWidth: 2,
    borderColor: colors.tableEdge,
    padding: 28,
    gap: 14,
    width: '80%',
    maxWidth: 360,
    alignItems: 'stretch',
  },
  overlayTitle: { color: colors.text, fontSize: 34, fontWeight: '900', fontStyle: 'italic', textAlign: 'center', letterSpacing: 2 },
  finalScore: { color: colors.dim, fontSize: 22, fontWeight: '800', textAlign: 'center', marginBottom: 6 },
  overlayBtn: { alignSelf: 'stretch' },
  versus: {
    position: 'absolute',
    left: 0,
    textAlign: 'center',
    color: colors.p1,
    fontWeight: '900',
    letterSpacing: 4,
    textShadowColor: colors.p1,
    textShadowRadius: 12,
    textShadowOffset: { width: 0, height: 0 },
  },
  unlocked: { alignSelf: 'stretch', borderWidth: 1.5, borderRadius: 14, padding: 12, gap: 8, marginBottom: 4 },
  unlockedKicker: { color: colors.dim, fontSize: 12, fontWeight: '800', letterSpacing: 3, textAlign: 'center' },
  unlockedRow: { flexDirection: 'row', alignItems: 'center', justifyContent: 'center', gap: 10 },
  unlockedSwatch: { width: 18, height: 18, borderRadius: 9 },
  unlockedLabel: { color: colors.text, fontSize: 17, fontWeight: '800' },
});
