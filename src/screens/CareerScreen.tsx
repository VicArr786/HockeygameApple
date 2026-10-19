import { useState } from 'react';
import { Pressable, ScrollView, StyleSheet, Text, View } from 'react-native';
import { useSafeAreaInsets } from 'react-native-safe-area-context';

import {
  LEAGUES,
  MODS,
  STAGES_PER_LEAGUE,
  TOWER_COLOR,
  TOWER_START,
  bossReward,
  rank,
  rewardInfo,
  stage as getStage,
  totalStars,
  type Reward,
  type Stage,
} from '../career';
import { buzz, playSound } from '../feedback';
import { useSettings } from '../settings';
import { colors, glow } from '../theme';

// Pages: one per league, then the Infinity Tower.
const TOWER_PAGE = LEAGUES.length;

export function CareerScreen({ onPlay, onBack }: { onPlay: (stage: number) => void; onBack: () => void }) {
  const insets = useSafeAreaInsets();
  const { settings } = useSettings();
  const { beaten } = settings;
  const stars = totalStars(settings.stars);
  const r = rank(stars);
  const currentPage = Math.min(TOWER_PAGE, Math.floor(beaten / STAGES_PER_LEAGUE));
  const [page, setPage] = useState(currentPage);

  const tower = page === TOWER_PAGE;
  const color = tower ? TOWER_COLOR : LEAGUES[page].color;
  const pageStart = tower ? TOWER_START : page * STAGES_PER_LEAGUE;
  const cleared = tower ? Math.max(0, beaten - TOWER_START) : Math.min(STAGES_PER_LEAGUE, Math.max(0, beaten - pageStart));
  const locked = beaten < pageStart;

  // Leagues list all 8 stages; the tower shows a window around your floor.
  let indices: number[];
  if (!tower) {
    indices = Array.from({ length: STAGES_PER_LEAGUE }, (_, i) => pageStart + i);
  } else {
    const first = Math.max(TOWER_START, beaten - 3);
    indices = Array.from({ length: 8 }, (_, i) => first + i);
  }

  const turn = (d: number) => {
    playSound('tap', 0.5);
    buzz('select');
    setPage((p) => Math.max(0, Math.min(TOWER_PAGE, p + d)));
  };

  return (
    <ScrollView
      style={styles.root}
      contentContainerStyle={[styles.content, { paddingTop: insets.top + 16, paddingBottom: insets.bottom + 24 }]}
    >
      <Pressable accessibilityRole="button" accessibilityLabel="Back to menu" onPress={onBack} hitSlop={10} style={styles.back}>
        <Text style={styles.backText}>‹ MENU</Text>
      </Pressable>

      <Text style={styles.title}>CAREER</Text>
      <View style={styles.statRow}>
        <Text style={styles.stat}>
          <Text style={{ color: colors.puck }}>★ {stars}</Text>
        </Text>
        <Text style={styles.stat}>{r.name}</Text>
      </View>
      <Text style={styles.subtitle}>
        {r.next !== null ? `${r.next - stars} ★ to the next rank` : 'Top rank reached'}
        {beaten >= TOWER_START ? ` · Best: floor ${beaten - TOWER_START}` : ` · ${beaten}/${TOWER_START} stages`}
      </Text>

      <View style={styles.pager}>
        <PagerArrow label="‹" disabled={page === 0} onPress={() => turn(-1)} />
        <View style={styles.pagerMid}>
          <Text style={styles.pagerKicker}>{tower ? 'ENDLESS' : `LEAGUE ${page + 1} OF ${LEAGUES.length}`}</Text>
          <Text style={[styles.pagerName, { color, textShadowColor: color }]} numberOfLines={1} adjustsFontSizeToFit>
            {tower ? 'INFINITY TOWER' : LEAGUES[page].name}
          </Text>
          <Text style={styles.pagerSub}>
            {locked
              ? tower
                ? 'Beat OMEGA to open the tower'
                : `Beat ${LEAGUES[page - 1].boss.name} to enter`
              : tower
                ? `${cleared} floors climbed`
                : `${cleared}/${STAGES_PER_LEAGUE} cleared · ${leagueStars(settings.stars, pageStart)}/${STAGES_PER_LEAGUE * 3} ★`}
          </Text>
        </View>
        <PagerArrow label="›" disabled={page === TOWER_PAGE} onPress={() => turn(1)} />
      </View>

      <View style={styles.list}>
        {indices.map((i) => (
          <StageCard
            key={i}
            stage={getStage(i)}
            stars={settings.stars[i] ?? 0}
            state={i < beaten ? 'done' : i === beaten ? 'next' : 'locked'}
            onPress={() => {
              playSound('tap', 0.6);
              buzz('select');
              onPlay(i);
            }}
          />
        ))}
      </View>
    </ScrollView>
  );
}

const leagueStars = (stars: number[], start: number) =>
  stars.slice(start, start + STAGES_PER_LEAGUE).reduce((a, b) => a + (b || 0), 0);

function PagerArrow({ label, disabled, onPress }: { label: string; disabled: boolean; onPress: () => void }) {
  return (
    <Pressable
      accessibilityRole="button"
      accessibilityLabel={label === '‹' ? 'Previous league' : 'Next league'}
      accessibilityState={{ disabled }}
      disabled={disabled}
      onPress={onPress}
      hitSlop={8}
      style={[styles.arrow, disabled && { opacity: 0.25 }]}
    >
      <Text style={styles.arrowText}>{label}</Text>
    </Pressable>
  );
}

type CardProps = { stage: Stage; stars: number; state: 'done' | 'next' | 'locked'; onPress: () => void };

function StageCard({ stage: s, stars, state, onPress }: CardProps) {
  const locked = state === 'locked';
  const next = state === 'next';
  const reward = bossReward(s);
  const accent = s.boss ? colors.p0 : colors.puck;
  // Bosses are always shown as a teaser; ordinary rivals stay hidden until reached.
  const hidden = locked && !s.boss;
  const num = s.floor ? String(s.floor) : String((s.index % STAGES_PER_LEAGUE) + 1).padStart(2, '0');

  return (
    <Pressable
      accessibilityRole="button"
      accessibilityLabel={`${hidden ? 'Locked stage' : s.name}${s.boss ? ', boss' : ''}, ${state === 'done' ? `${stars} stars` : next ? 'next' : 'locked'}`}
      accessibilityState={{ disabled: locked }}
      disabled={locked}
      onPress={onPress}
      style={({ pressed }) => [
        styles.card,
        s.boss && styles.bossCard,
        s.boss && { borderColor: `${colors.p0}${locked ? '55' : 'aa'}` },
        next && { borderColor: accent, boxShadow: glow(accent, 14, 0), backgroundColor: `${accent}14` },
        state === 'done' && !s.boss && { borderColor: `${colors.p1}66` },
        locked && styles.lockedCard,
        { transform: [{ scale: pressed ? 0.98 : 1 }] },
      ]}
    >
      <Text style={[styles.num, next && { color: accent }, s.floor > 99 && { fontSize: 15 }]}>{num}</Text>
      <View style={styles.info}>
        {s.boss && <Text style={styles.bossKicker}>BOSS</Text>}
        <Text style={[styles.name, s.boss && styles.bossName, locked && { color: colors.dim }]}>{hidden ? '???' : s.name}</Text>
        <Text style={styles.tagline}>{hidden ? 'Clear the stage above to unlock' : s.tagline}</Text>
        {!hidden && s.mods.length > 0 && (
          <View style={styles.modRow}>
            {s.mods.map((m) => (
              <Text key={m} style={styles.modChip}>
                {MODS[m].label}
              </Text>
            ))}
          </View>
        )}
        {reward && <RewardLine reward={reward} dim={locked} />}
      </View>
      <View style={styles.right}>
        {state === 'done' ? (
          <Text style={styles.cardStars}>
            {[0, 1, 2].map((i) => (
              <Text key={i} style={{ color: i < stars ? colors.puck : 'rgba(143, 136, 184, 0.3)' }}>
                ★
              </Text>
            ))}
          </Text>
        ) : (
          <Text style={[styles.status, next && { color: accent }]}>{next ? 'PLAY ›' : '🔒'}</Text>
        )}
      </View>
    </Pressable>
  );
}

function RewardLine({ reward, dim }: { reward: Reward; dim: boolean }) {
  const info = rewardInfo(reward);
  return (
    <View style={styles.rewardRow}>
      <View style={[styles.swatch, { backgroundColor: info.color }, dim && { opacity: 0.4 }]} />
      <Text style={styles.reward}>Drops: {info.label}</Text>
    </View>
  );
}

const styles = StyleSheet.create({
  root: { flex: 1, backgroundColor: colors.bg },
  content: { paddingHorizontal: 20, maxWidth: 560, width: '100%', alignSelf: 'center' },
  back: { alignSelf: 'flex-start', paddingVertical: 8 },
  backText: { color: colors.dim, fontSize: 15, fontWeight: '800', letterSpacing: 2 },
  title: {
    color: colors.text,
    fontSize: 40,
    fontWeight: '900',
    fontStyle: 'italic',
    letterSpacing: 4,
    textAlign: 'center',
    marginTop: 4,
    textShadowColor: colors.puck,
    textShadowRadius: 16,
    textShadowOffset: { width: 0, height: 0 },
  },
  statRow: { flexDirection: 'row', justifyContent: 'center', gap: 18, marginTop: 6 },
  stat: { color: colors.text, fontSize: 18, fontWeight: '900', letterSpacing: 2 },
  subtitle: { color: colors.dim, fontSize: 13, textAlign: 'center', marginTop: 4, marginBottom: 18 },
  pager: { flexDirection: 'row', alignItems: 'center', gap: 8, marginBottom: 16 },
  pagerMid: { flex: 1, alignItems: 'center', gap: 2 },
  pagerKicker: { color: colors.dim, fontSize: 11, fontWeight: '800', letterSpacing: 3 },
  pagerName: {
    fontSize: 24,
    fontWeight: '900',
    fontStyle: 'italic',
    letterSpacing: 2,
    textShadowRadius: 12,
    textShadowOffset: { width: 0, height: 0 },
  },
  pagerSub: { color: colors.dim, fontSize: 13 },
  arrow: {
    width: 44,
    height: 44,
    borderRadius: 22,
    borderWidth: 1.5,
    borderColor: 'rgba(143, 136, 184, 0.45)',
    alignItems: 'center',
    justifyContent: 'center',
  },
  arrowText: { color: colors.text, fontSize: 26, fontWeight: '900', marginTop: -3 },
  list: { gap: 12 },
  card: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 14,
    borderWidth: 1.5,
    borderColor: 'rgba(143, 136, 184, 0.35)',
    borderRadius: 16,
    paddingVertical: 14,
    paddingHorizontal: 16,
  },
  bossCard: { borderWidth: 2, paddingVertical: 18, backgroundColor: 'rgba(255, 45, 170, 0.06)' },
  lockedCard: { opacity: 0.6 },
  num: { color: colors.dim, fontSize: 20, fontWeight: '900', fontVariant: ['tabular-nums'], width: 36 },
  info: { flex: 1, gap: 3 },
  bossKicker: { color: colors.p0, fontSize: 11, fontWeight: '900', letterSpacing: 4 },
  name: { color: colors.text, fontSize: 20, fontWeight: '900', letterSpacing: 2 },
  bossName: { fontSize: 24, fontStyle: 'italic' },
  tagline: { color: colors.dim, fontSize: 13 },
  modRow: { flexDirection: 'row', flexWrap: 'wrap', gap: 6, marginTop: 4 },
  modChip: {
    color: colors.puck,
    fontSize: 10,
    fontWeight: '900',
    letterSpacing: 1.2,
    borderWidth: 1,
    borderColor: `${colors.puck}77`,
    borderRadius: 7,
    paddingHorizontal: 6,
    paddingVertical: 2,
    overflow: 'hidden',
  },
  rewardRow: { flexDirection: 'row', alignItems: 'center', gap: 6, marginTop: 4 },
  swatch: { width: 10, height: 10, borderRadius: 5 },
  reward: { color: colors.dim, fontSize: 12, fontWeight: '700' },
  right: { alignItems: 'flex-end' },
  cardStars: { fontSize: 16, letterSpacing: 1 },
  status: { color: colors.dim, fontSize: 15, fontWeight: '900', letterSpacing: 1 },
});
