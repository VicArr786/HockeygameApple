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

import { Hazard } from '../components/Hazard';
import { PlateButton } from '../components/PlateButton';
import { SevenSeg } from '../components/SevenSeg';
import { TableArt } from '../components/TableArt';
import { MODS, TOWER_START, rewardInfo, stageLabel, titleCase, type CareerResult, type Reward, type Stage } from '../career';
import type { CpuParams } from '../game/ai';
import { LIVES, WAVE, endlessRules } from '../endless';
import { COUNTDOWN, Match } from '../game/match';
import { BARRIER_Y, barrierThickness, windDir } from '../game/physics';
import { paddleSkin, tableSkin } from '../skins';
import { colors, fonts, glow, plateShadow } from '../theme';
import type { GameMode } from './MenuScreen';

const MARGIN = 10;
const PAUSE_BTN = 44;

type Props = {
  mode: GameMode;
  cpu: CpuParams;
  stage?: Stage; // set for Career matches
  result?: CareerResult | null; // stars and unlocks, once a Career match ends
  endlessBest?: number; // Endless record before this run
  target: number;
  paddle: string; // skin ids
  table: string;
  onNext?: () => void; // play the next Career stage
  onRestart?: () => void;
  onExit: () => void;
  onResult: (won: boolean, score: [number, number]) => void;
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
  const { mode, cpu, stage, result, endlessBest, target, onNext, onRestart, onExit, onResult, layout } = props;
  const twoP = mode === '2p';
  const endless = mode === 'endless';
  const opponent = stage?.name;
  const skin = tableSkin(props.table);
  // Your paddle wears the chosen skin; the top paddle is always cyan.
  const { color: p0, core: p0Core } = paddleSkin(props.paddle);
  const pc = (p: 0 | 1) => (p === 0 ? p0 : colors.p1);
  const newMatch = () =>
    new Match({
      W: layout.W,
      H: layout.H,
      twoPlayer: twoP,
      cpu,
      target,
      mods: stage?.sim,
      endless: endless ? endlessRules() : undefined,
      startScore: stage?.startScore,
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
    if (winner !== null && !twoP) onResult(winner === 0, match.score);
    // eslint-disable-next-line react-hooks/exhaustive-deps -- fire once per match result
  }, [match, winner]);

  const restart = () => {
    onRestart?.();
    setMatch(newMatch());
  };

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
  const { W, H, goalWs } = sim.table;
  const showPuck = g.phase !== 'goal' && g.phase !== 'over';
  const newBest = endless && g.score[0] > (endlessBest ?? 0);
  const ghost = stage ? stage.mods.includes('ghost') : (g.level?.labels.includes(MODS.ghost.label) ?? false);
  // The ghost puck fades out for a moment every couple of seconds.
  const puckOpacity = ghost && g.phase === 'play' ? 0.06 + 0.94 * Math.pow(0.5 + 0.5 * Math.cos(g.elapsed * 3.4), 0.5) : 1;

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
        <TableArt W={W} H={H} goalWs={goalWs} skin={skin} p0={p0} topGoalMoves={sim.table.goalSwing > 0} />
        <Gimmicks g={g} W={W} H={H} skin={skin} />

        {g.phase === 'goal' && (
          <View
            pointerEvents="none"
            style={[
              StyleSheet.absoluteFill,
              { backgroundColor: pc(g.lastScorer), opacity: Math.max(0, 0.25 - g.phaseT * 0.3) },
            ]}
          />
        )}

        {endless ? <EndlessHud g={g} W={W} H={H} p0={p0} /> : <Scoreboard score={g.score} W={W} H={H} twoP={twoP} p0={p0} />}

        {showPuck &&
          !ghost &&
          g.trail.map((p, i) => {
            const k = (i + 1) / (g.trail.length + 1);
            const pr = sim.puck.r * (0.4 + 0.5 * k);
            return (
              <View
                key={i}
                pointerEvents="none"
                style={[styles.circle, { left: p.x - pr, top: p.y - pr, width: pr * 2, height: pr * 2, borderRadius: pr, backgroundColor: sim.spin ? colors.p1 : colors.puck, opacity: k * (sim.spin ? 0.45 : 0.25) }]}
              />
            );
          })}

        {showPuck && <Puck x={sim.puck.x} y={sim.puck.y} r={sim.puck.r} opacity={puckOpacity} />}
        <Paddle
          x={sim.paddles[1].x}
          y={sim.paddles[1].y}
          r={sim.paddles[1].r}
          color={colors.p1}
          opacity={sim.table.flags.phantom ? 0.05 + 0.95 * Math.pow(0.5 + 0.5 * Math.cos(g.elapsed * 2.6), 0.6) : 1}
        />
        <Paddle x={sim.paddles[0].x} y={sim.paddles[0].y} r={sim.paddles[0].r} color={p0} core={p0Core} />

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

        <Banners g={g} W={W} H={H} twoP={twoP} pc={pc} />
        {stage && g.phase === 'countdown' && <Intro stage={stage} W={W} H={H} />}
        {endless && g.phase === 'countdown' && (
          <Announce
            kicker="Endless"
            title="Survive"
            boss={false}
            chips={[`${LIVES} lives`, `New rules every ${WAVE} points`]}
            W={W}
            H={H}
          />
        )}
        {endless && g.level && g.elapsed < g.announceUntil && g.phase !== 'over' && (
          <Announce
            kicker={g.level.boss ? 'Boss wave' : 'New rules'}
            title={`Wave ${g.level.wave + 1}`}
            boss={g.level.boss}
            chips={g.level.labels}
            W={W}
            H={H}
          />
        )}
      </View>

      {g.phase === 'paused' && (
        <Overlay>
          <Text style={styles.overlayTitle}>Paused</Text>
          <PlateButton label="Resume" onPress={() => match.resume()} />
          <PlateButton label="Restart" quiet onPress={restart} />
          <PlateButton label={opponent ? 'Career' : 'Menu'} quiet onPress={onExit} />
        </Overlay>
      )}

      {g.phase === 'over' && endless && (
        <Overlay>
          <Text style={styles.overlayTitle}>Game over</Text>
          <View style={styles.ledRow}>
            <SevenSeg value={g.score[0]} height={64} color={p0} />
          </View>
          <Text style={[styles.overlayLine, newBest && styles.newBest]}>
            {newBest
              ? 'New best!'
              : `You reached wave ${(g.level?.wave ?? 0) + 1}. Your best is ${endlessBest ?? 0}.`}
          </Text>
          <PlateButton label="Play again" onPress={restart} />
          <PlateButton label="Menu" quiet onPress={onExit} />
        </Overlay>
      )}

      {g.phase === 'over' && g.winner !== null && !endless && (
        <Overlay>
          {twoP && (
            <Text style={[styles.overlayTitle, styles.flipped, { color: pc(1) }]}>
              {g.winner === 1 ? 'You win!' : 'You lose'}
            </Text>
          )}
          <Text style={[styles.overlayTitle, { color: twoP ? pc(0) : g.winner === 0 ? colors.marquee : colors.text }]}>
            {g.winner === 0
              ? stage?.index === TOWER_START - 1
                ? 'Champion!'
                : stage?.boss
                  ? 'Boss down!'
                  : 'You win!'
              : twoP
                ? 'You lose'
                : `${opponent ? titleCase(opponent) : 'CPU'} wins`}
          </Text>
          <View accessible accessibilityLabel={`${g.score[0]} to ${g.score[1]}`} style={styles.ledRow}>
            <SevenSeg value={g.score[0]} height={40} color={p0} />
            <View style={styles.ledDash} />
            <SevenSeg value={g.score[1]} height={40} color={colors.p1} />
          </View>
          {g.winner === 0 && result && <Stars n={result.stars} />}
          {g.winner === 0 && stage?.index === TOWER_START - 1 && (
            <Text style={styles.overlayLine}>The Infinity Tower is open. See how high you can climb.</Text>
          )}
          {g.winner === 0 && result?.unlocks.map((r) => <Unlocked key={`${r.kind}:${r.id}`} reward={r} />)}
          {g.winner === 0 && onNext ? (
            <>
              <PlateButton label="Next stage" onPress={onNext} />
              {result && result.stars < 3 && <PlateButton label="Replay for 3 stars" quiet onPress={restart} />}
            </>
          ) : (
            <PlateButton label={stage ? 'Retry' : 'Rematch'} onPress={restart} />
          )}
          <PlateButton label={stage ? 'Career' : 'Menu'} quiet onPress={onExit} />
        </Overlay>
      )}
    </View>
  );
}

function Stars({ n }: { n: number }) {
  return (
    <Text accessibilityLabel={`${n} of 3 stars`} style={styles.stars}>
      {[0, 1, 2].map((i) => (
        <Text key={i} style={{ color: i < n ? colors.marquee : 'rgba(154, 147, 196, 0.3)' }}>
          ★
        </Text>
      ))}
    </Text>
  );
}

// Who you're playing and any rule changes, shown during the countdown.
function Intro({ stage, W, H }: { stage: Stage; W: number; H: number }) {
  return (
    <Announce
      kicker={stageLabel(stage)}
      title={`vs ${stage.name}`}
      boss={stage.boss}
      chips={stage.mods.map((m) => MODS[m].label)}
      W={W}
      H={H}
    />
  );
}

type AnnounceProps = { kicker: string; title: string; boss: boolean; chips: string[]; W: number; H: number };

// A card pinned above the centre line. Bosses get the hazard-stripe decal.
function Announce({ kicker, title, boss, chips, W, H }: AnnounceProps) {
  return (
    <View pointerEvents="none" style={[styles.announce, { top: H * 0.21, left: W * 0.08, width: W * 0.84 }]}>
      {boss && <Hazard width={W} height={12} style={styles.announceHazard} />}
      <Text style={styles.announceKicker}>{kicker}</Text>
      <Text style={[styles.announceTitle, { fontSize: W * (boss ? 0.08 : 0.066) }]} numberOfLines={1} adjustsFontSizeToFit>
        {title}
      </Text>
      {chips.length > 0 && (
        <View style={styles.tags}>
          {chips.map((c) => (
            <Text key={c} style={styles.tag}>
              {c}
            </Text>
          ))}
        </View>
      )}
    </View>
  );
}

// Endless: your score and the wave on the right, lives under the pause button.
function EndlessHud({ g, W, H, p0 }: { g: Match; W: number; H: number; p0: string }) {
  const size = Math.round(W * 0.1);
  return (
    <>
      <View pointerEvents="none" style={[styles.scoreboard, { top: H / 2 - size * 1.6, right: W * 0.05, height: size * 3.2 }]}>
        <Text style={[styles.waveLabel, { fontSize: size * 0.34 }]}>
          {g.level?.boss ? 'Boss\n' : ''}wave {(g.level?.wave ?? 0) + 1}
        </Text>
        <SevenSeg value={g.score[0]} height={size} color={p0} />
      </View>
      <Text
        accessibilityLabel={`${g.lives} lives`}
        pointerEvents="none"
        style={[styles.hearts, { top: H / 2 + PAUSE_BTN / 2 + 10, fontSize: W * 0.045 }]}
      >
        {'♥'.repeat(g.lives)}
      </Text>
    </>
  );
}

// Everything the boss rules add to the table, drawn under the puck and paddles.
function Gimmicks({ g, W, H, skin }: { g: Match; W: number; H: number; skin: ReturnType<typeof tableSkin> }) {
  const { sim } = g;
  const t = sim.table;
  // Blackout: dark, with a lightning flash every few seconds.
  const flash = t.flags.blackout && g.elapsed % 3.4 < 0.14;
  const barrierH = barrierThickness(t);
  return (
    <View pointerEvents="none" style={StyleSheet.absoluteFill}>
      {t.magnet > 0 &&
        [1, 1.45, 1.9].map((k) => (
          <View
            key={k}
            style={[
              styles.ring,
              { left: sim.goalX[0] - t.goalWs[0] * 0.5 * k, top: H - t.goalWs[0] * 0.5 * k, width: t.goalWs[0] * k, height: t.goalWs[0] * k, borderRadius: t.goalWs[0] * 0.5 * k, opacity: 0.32 / k },
            ]}
          />
        ))}
      {t.wind > 0 && (
        <Text style={[styles.wind, { top: H * 0.3, width: W, fontSize: W * 0.09 }]}>{windDir(sim) > 0 ? '›››' : '‹‹‹'}</Text>
      )}
      {t.wind > 0 && (
        <Text style={[styles.wind, { top: H * 0.62, width: W, fontSize: W * 0.09 }]}>{windDir(sim) > 0 ? '›››' : '‹‹‹'}</Text>
      )}
      {t.bumpers.map((b, i) => (
        <View
          key={i}
          style={[
            styles.bumper,
            { left: b.x - b.r, top: b.y - b.r, width: b.r * 2, height: b.r * 2, borderRadius: b.r, borderColor: colors.marquee, boxShadow: glow(colors.marquee, 10, 1) },
          ]}
        >
          <View style={{ width: b.r * 0.7, height: b.r * 0.7, borderRadius: b.r * 0.35, backgroundColor: colors.marquee }} />
        </View>
      ))}
      {t.barrierW > 0 && (
        <View
          style={[
            styles.barrier,
            { left: sim.barrierX - t.barrierW / 2, top: H * BARRIER_Y - barrierH / 2, width: t.barrierW, height: barrierH, borderRadius: barrierH / 2 },
          ]}
        />
      )}
      {t.goalSwing > 0 && (
        <View
          style={[
            styles.ring,
            {
              left: sim.goalX[1] - t.goalWs[1] * 0.62,
              top: -t.goalWs[1] * 0.62,
              width: t.goalWs[1] * 1.24,
              height: t.goalWs[1] * 1.24,
              borderRadius: t.goalWs[1] * 0.62,
              borderWidth: 3,
              borderColor: colors.p1,
              opacity: 0.45,
            },
          ]}
        />
      )}
      {t.goalSwing > 0 && (
        <View
          style={[styles.goalBar, { left: sim.goalX[1] - t.goalWs[1] / 2, width: t.goalWs[1], backgroundColor: colors.p1, boxShadow: glow(colors.p1, 14, 2) }]}
        />
      )}
      {t.flags.blackout && <View style={[StyleSheet.absoluteFill, { backgroundColor: skin.table, opacity: flash ? 0 : 0.88 }]} />}
    </View>
  );
}

function Puck({ x, y, r, opacity }: { x: number; y: number; r: number; opacity: number }) {
  return (
    <View
      pointerEvents="none"
      style={[
        styles.circle,
        { left: x - r, top: y - r, width: r * 2, height: r * 2, borderRadius: r, backgroundColor: colors.puck, boxShadow: glow(colors.puck, 16, 2), opacity },
      ]}
    >
      <View style={{ width: r * 1.2, height: r * 1.2, borderRadius: r * 0.6, borderWidth: 2, borderColor: 'rgba(120, 90, 0, 0.35)' }} />
    </View>
  );
}

type PaddleProps = { x: number; y: number; r: number; color: string; core?: string; opacity?: number };

function Paddle({ x, y, r, color, core = color, opacity = 1 }: PaddleProps) {
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
          opacity,
        },
      ]}
    >
      <View style={{ width: r * 0.8, height: r * 0.8, borderRadius: r * 0.4, backgroundColor: core, boxShadow: glow(core, 8, 1) }} />
    </View>
  );
}

function Unlocked({ reward }: { reward: Reward }) {
  const { label, color, core } = rewardInfo(reward);
  return (
    <View style={styles.unlocked}>
      <View style={[styles.unlockedSwatch, { borderColor: color, backgroundColor: core }]} />
      <Text style={styles.unlockedLabel}>
        Unlocked the <Text style={styles.unlockedName}>{label}</Text>
      </Text>
    </View>
  );
}

// Scoreboard digits beside the centre line: theirs above, yours below.
function Scoreboard({ score, W, H, twoP, p0 }: { score: [number, number]; W: number; H: number; twoP: boolean; p0: string }) {
  const size = Math.round(W * 0.1);
  return (
    <View pointerEvents="none" style={[styles.scoreboard, { top: H / 2 - size * 1.6, right: W * 0.05, height: size * 3.2 }]}>
      <View style={twoP && styles.flipped}>
        <SevenSeg value={score[1]} height={size} color={colors.p1} />
      </View>
      <SevenSeg value={score[0]} height={size} color={p0} />
    </View>
  );
}

type BannerProps = { g: Match; W: number; H: number; twoP: boolean; pc: (p: 0 | 1) => string };

function Banners({ g, W, H, twoP, pc }: BannerProps) {
  let text: string | null = null;
  let color = colors.text;
  if (g.phase === 'countdown') {
    text = String(Math.max(1, COUNTDOWN - Math.floor(g.phaseT)));
  } else if (g.phase === 'play' && g.phaseT < 0.6 && g.score[0] + g.score[1] === 0) {
    text = 'Go!';
    color = colors.puck;
  } else if (g.phase === 'goal') {
    text = 'Goal!';
    color = pc(g.lastScorer);
  }
  if (!text) return null;
  const size = W * (text.length > 1 ? 0.15 : 0.2);
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
      {banner(false, twoP ? H * 0.75 - size * 0.7 : H / 2 - size * 1.5)}
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
    fontFamily: fonts.display,
    textShadowRadius: 14,
    textShadowOffset: { width: 0, height: 0 },
  },
  overlay: { position: 'absolute', top: 0, left: 0, right: 0, bottom: 0, backgroundColor: colors.panel, alignItems: 'center', justifyContent: 'center' },
  overlayCard: {
    backgroundColor: colors.plate,
    borderRadius: 18,
    padding: 22,
    gap: 14,
    width: '84%',
    maxWidth: 360,
    alignItems: 'stretch',
    boxShadow: plateShadow(8),
  },
  overlayTitle: { fontFamily: fonts.display, color: colors.text, fontSize: 32 },
  overlayLine: { fontFamily: fonts.body, color: colors.dim, fontSize: 16, lineHeight: 21 },
  newBest: { fontFamily: fonts.display, color: colors.marquee, fontSize: 20 },
  ledRow: {
    flexDirection: 'row',
    alignItems: 'center',
    alignSelf: 'flex-start',
    gap: 14,
    backgroundColor: colors.plateEdge,
    borderRadius: 10,
    paddingVertical: 10,
    paddingHorizontal: 14,
  },
  ledDash: { width: 14, height: 5, borderRadius: 3, backgroundColor: colors.dim, opacity: 0.6 },
  announce: {
    position: 'absolute',
    backgroundColor: 'rgba(23, 19, 43, 0.86)',
    borderRadius: 12,
    paddingHorizontal: 14,
    paddingTop: 10,
    paddingBottom: 12,
    gap: 4,
    overflow: 'hidden',
  },
  announceHazard: { marginHorizontal: -14, marginTop: -10, marginBottom: 6 },
  announceKicker: { fontFamily: fonts.body, color: colors.dim, fontSize: 14 },
  announceTitle: { fontFamily: fonts.display, color: colors.text },
  tags: { flexDirection: 'row', flexWrap: 'wrap', gap: 6, marginTop: 4 },
  tag: {
    fontFamily: fonts.bold,
    fontSize: 13,
    color: colors.marquee,
    backgroundColor: 'rgba(255, 210, 63, 0.14)',
    borderRadius: 6,
    paddingHorizontal: 8,
    paddingVertical: 2,
    overflow: 'hidden',
  },
  ring: { position: 'absolute', borderWidth: 2, borderColor: colors.marquee },
  wind: { position: 'absolute', left: 0, textAlign: 'center', fontFamily: fonts.display, color: colors.text, opacity: 0.3 },
  bumper: { position: 'absolute', borderWidth: 3, backgroundColor: colors.bg, alignItems: 'center', justifyContent: 'center' },
  barrier: { position: 'absolute', backgroundColor: colors.p1, boxShadow: glow(colors.p1, 12, 1), opacity: 0.85 },
  goalBar: { position: 'absolute', top: -2, height: 6, borderRadius: 3 },
  waveLabel: { fontFamily: fonts.bold, color: colors.p1, textAlign: 'center', opacity: 0.85 },
  hearts: { position: 'absolute', left: 10, color: colors.p0, letterSpacing: 2 },
  stars: { fontSize: 32, letterSpacing: 4 },
  unlocked: { flexDirection: 'row', alignItems: 'center', gap: 10, backgroundColor: colors.plateEdge, borderRadius: 10, padding: 10 },
  unlockedSwatch: { width: 22, height: 22, borderRadius: 11, borderWidth: 4 },
  unlockedLabel: { fontFamily: fonts.body, color: colors.dim, fontSize: 16, flex: 1 },
  unlockedName: { fontFamily: fonts.bold, color: colors.text },
});
