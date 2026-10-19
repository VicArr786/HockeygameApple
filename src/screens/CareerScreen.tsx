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
  titleCase,
  totalStars,
  type Reward,
  type Stage,
} from '../career';
import { Hazard } from '../components/Hazard';
import { SevenSeg } from '../components/SevenSeg';
import { buzz, playSound } from '../feedback';
import { useSettings } from '../settings';
import { colors, fonts, plateShadow } from '../theme';

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
  const first = tower ? Math.max(TOWER_START, beaten - 3) : pageStart;
  const indices = Array.from({ length: STAGES_PER_LEAGUE }, (_, i) => first + i);

  const turn = (d: number) => {
    playSound('tap', 0.5);
    buzz('select');
    setPage((p) => Math.max(0, Math.min(TOWER_PAGE, p + d)));
  };

  let status: string;
  if (locked) status = tower ? 'Beat Omega to open the tower.' : `Beat ${titleCase(LEAGUES[page - 1].boss.name)} to get in.`;
  else if (tower) status = cleared === 0 ? 'No floors climbed yet.' : `${cleared} ${cleared === 1 ? 'floor' : 'floors'} climbed.`;
  else status = `${cleared} of ${STAGES_PER_LEAGUE} cleared, ${leagueStars(settings.stars, pageStart)} of ${STAGES_PER_LEAGUE * 3} stars.`;

  return (
    <ScrollView
      style={styles.root}
      contentContainerStyle={[styles.content, { paddingTop: insets.top + 12, paddingBottom: insets.bottom + 28 }]}
    >
      <Pressable accessibilityRole="button" accessibilityLabel="Back to menu" onPress={onBack} hitSlop={10} style={styles.back}>
        <Text style={styles.backText}>‹ Menu</Text>
      </Pressable>

      <Text accessibilityRole="header" style={styles.title}>
        Career
      </Text>

      <View style={styles.scoreboard}>
        <View style={styles.scoreCell}>
          <SevenSeg value={String(stars).padStart(3, '0')} height={34} color={colors.marquee} />
          <Text style={styles.scoreLabel}>stars</Text>
        </View>
        <View style={styles.rankCell}>
          <Text style={styles.rank}>{r.name}</Text>
          <Text style={styles.scoreLabel}>
            {r.next !== null ? `${r.next - stars} more for the next rank` : 'Highest rank'}
          </Text>
        </View>
      </View>

      <View style={styles.pager}>
        <PagerArrow dir={-1} disabled={page === 0} onPress={() => turn(-1)} />
        <View style={styles.pagerMid}>
          <Text style={styles.pagerSmall}>{tower ? 'After the Career' : `League ${page + 1} of ${LEAGUES.length}`}</Text>
          <Text style={[styles.pagerName, { color }]} numberOfLines={1} adjustsFontSizeToFit>
            {tower ? 'Infinity Tower' : LEAGUES[page].name}
          </Text>
          <Text style={styles.pagerSmall}>{status}</Text>
        </View>
        <PagerArrow dir={1} disabled={page === TOWER_PAGE} onPress={() => turn(1)} />
      </View>

      <View>
        {/* The ladder rail behind the stage markers. */}
        <View style={[styles.rail, { backgroundColor: `${color}55` }]} />
        {indices.map((i) => (
          <StageRow
            key={i}
            stage={getStage(i)}
            color={color}
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

function PagerArrow({ dir, disabled, onPress }: { dir: -1 | 1; disabled: boolean; onPress: () => void }) {
  return (
    <Pressable
      accessibilityRole="button"
      accessibilityLabel={dir < 0 ? 'Previous league' : 'Next league'}
      accessibilityState={{ disabled }}
      disabled={disabled}
      onPress={onPress}
      hitSlop={8}
      style={({ pressed }) => [
        styles.arrow,
        { boxShadow: plateShadow(pressed ? 1 : 3), transform: [{ translateY: pressed ? 2 : 0 }] },
        disabled && { opacity: 0.3 },
      ]}
    >
      <Text style={styles.arrowText}>{dir < 0 ? '‹' : '›'}</Text>
    </Pressable>
  );
}

type RowProps = { stage: Stage; color: string; stars: number; state: 'done' | 'next' | 'locked'; onPress: () => void };

function StageRow({ stage: s, color, stars, state, onPress }: RowProps) {
  const locked = state === 'locked';
  const next = state === 'next';
  const reward = bossReward(s);
  // Bosses are always shown as a teaser; ordinary rivals stay hidden until reached.
  const hidden = locked && !s.boss;
  const num = s.floor ? s.floor : (s.index % STAGES_PER_LEAGUE) + 1;

  return (
    <Pressable
      accessibilityRole="button"
      accessibilityLabel={`${hidden ? 'Locked stage' : titleCase(s.name)}${s.boss ? ', boss' : ''}, ${
        state === 'done' ? `${stars} of 3 stars` : next ? 'play next' : 'locked'
      }`}
      accessibilityState={{ disabled: locked }}
      disabled={locked}
      onPress={onPress}
      style={({ pressed }) => [styles.row, next && styles.rowNext, pressed && { opacity: 0.85 }]}
    >
      <View
        style={[
          styles.marker,
          state === 'done' && { backgroundColor: color, borderColor: color },
          next && { borderColor: colors.marquee, backgroundColor: colors.bg },
        ]}
      >
        <Text style={[styles.markerText, state === 'done' && { color: colors.ink }, next && { color: colors.marquee }]}>
          {num}
        </Text>
      </View>

      <View style={[styles.body, s.boss && styles.bossBody, locked && { opacity: 0.55 }]}>
        {s.boss && <Hazard width={640} height={10} style={styles.hazard} />}
        <View style={styles.bodyTop}>
          <View style={styles.flex}>
            <Text style={[styles.name, s.boss && styles.bossName]}>{hidden ? '? ? ?' : s.name}</Text>
            <Text style={styles.tagline}>{hidden ? 'Clear the stage before this one.' : s.tagline}</Text>
          </View>
          {state === 'done' && <StarRow n={stars} />}
          {next && <Text style={styles.play}>Play</Text>}
        </View>
        {!hidden && s.mods.length > 0 && (
          <View style={styles.tags}>
            {s.mods.map((m) => (
              <Text key={m} style={styles.tag}>
                {MODS[m].label}
              </Text>
            ))}
          </View>
        )}
        {reward && <RewardLine reward={reward} />}
      </View>
    </Pressable>
  );
}

function StarRow({ n }: { n: number }) {
  return (
    <Text style={styles.stars}>
      {[0, 1, 2].map((i) => (
        <Text key={i} style={{ color: i < n ? colors.marquee : 'rgba(154, 147, 196, 0.3)' }}>
          ★
        </Text>
      ))}
    </Text>
  );
}

function RewardLine({ reward }: { reward: Reward }) {
  const info = rewardInfo(reward);
  return (
    <View style={styles.rewardRow}>
      <View style={[styles.swatch, { backgroundColor: info.color }]} />
      <Text style={styles.reward}>Beat to win the {info.label}</Text>
    </View>
  );
}

const MARKER = 34;

const styles = StyleSheet.create({
  root: { flex: 1, backgroundColor: colors.bg },
  content: { paddingHorizontal: 18, maxWidth: 560, width: '100%', alignSelf: 'center' },
  back: { alignSelf: 'flex-start', paddingVertical: 8 },
  backText: { fontFamily: fonts.bold, color: colors.dim, fontSize: 17 },
  title: { fontFamily: fonts.display, color: colors.text, fontSize: 40, marginTop: 2 },
  scoreboard: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 18,
    backgroundColor: colors.plateEdge,
    borderRadius: 14,
    paddingVertical: 14,
    paddingHorizontal: 16,
    marginTop: 12,
  },
  scoreCell: { gap: 6 },
  rankCell: { flex: 1, gap: 4 },
  scoreLabel: { fontFamily: fonts.body, color: colors.dim, fontSize: 14 },
  rank: { fontFamily: fonts.display, color: colors.text, fontSize: 22 },
  pager: { flexDirection: 'row', alignItems: 'center', gap: 12, marginTop: 22, marginBottom: 18 },
  pagerMid: { flex: 1, gap: 2 },
  pagerSmall: { fontFamily: fonts.body, color: colors.dim, fontSize: 14 },
  pagerName: { fontFamily: fonts.display, fontSize: 24 },
  arrow: { width: 42, height: 42, borderRadius: 10, backgroundColor: colors.plate, alignItems: 'center', justifyContent: 'center' },
  arrowText: { fontFamily: fonts.bold, color: colors.text, fontSize: 28, marginTop: -4 },
  rail: { position: 'absolute', left: MARKER / 2 - 1, top: MARKER / 2, bottom: MARKER, width: 2 },
  row: { flexDirection: 'row', alignItems: 'flex-start', gap: 14, paddingVertical: 10 },
  rowNext: {},
  flex: { flex: 1 },
  marker: {
    width: MARKER,
    height: MARKER,
    borderRadius: MARKER / 2,
    borderWidth: 2,
    borderColor: 'rgba(154, 147, 196, 0.4)',
    backgroundColor: colors.bg,
    alignItems: 'center',
    justifyContent: 'center',
    marginTop: 2,
  },
  markerText: { fontFamily: fonts.display, color: colors.dim, fontSize: 14 },
  body: { flex: 1, gap: 6 },
  bossBody: { backgroundColor: colors.plate, borderRadius: 12, padding: 12, paddingTop: 20, overflow: 'hidden' },
  hazard: { position: 'absolute', top: 0, left: 0, right: 0 },
  bodyTop: { flexDirection: 'row', alignItems: 'center', gap: 10 },
  name: { fontFamily: fonts.display, color: colors.text, fontSize: 19 },
  bossName: { fontSize: 24 },
  tagline: { fontFamily: fonts.body, color: colors.dim, fontSize: 15 },
  play: {
    fontFamily: fonts.display,
    fontSize: 15,
    color: colors.ink,
    backgroundColor: colors.marquee,
    paddingHorizontal: 12,
    paddingVertical: 7,
    borderRadius: 8,
    overflow: 'hidden',
    boxShadow: plateShadow(3),
  },
  tags: { flexDirection: 'row', flexWrap: 'wrap', gap: 6 },
  tag: {
    fontFamily: fonts.bold,
    fontSize: 13,
    color: colors.marquee,
    backgroundColor: 'rgba(255, 210, 63, 0.12)',
    borderRadius: 6,
    paddingHorizontal: 8,
    paddingVertical: 2,
    overflow: 'hidden',
  },
  rewardRow: { flexDirection: 'row', alignItems: 'center', gap: 8 },
  swatch: { width: 12, height: 12, borderRadius: 6 },
  reward: { fontFamily: fonts.body, color: colors.dim, fontSize: 14 },
  stars: { fontSize: 18, letterSpacing: 1 },
});
