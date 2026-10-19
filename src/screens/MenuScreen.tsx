import { useState } from 'react';
import { Pressable, ScrollView, StyleSheet, Switch, Text, useWindowDimensions, View } from 'react-native';
import { useSafeAreaInsets } from 'react-native-safe-area-context';

import { TOWER_START, isUnlocked, rank, stage, stageLabel, titleCase, totalStars, unlockHint, type Reward } from '../career';
import { PlateButton } from '../components/PlateButton';
import { buzz, playSound } from '../feedback';
import type { Difficulty } from '../game/ai';
import { useSettings } from '../settings';
import { PADDLES, TABLES } from '../skins';
import { colors, fonts, glow } from '../theme';

export type GameMode = '1p' | '2p' | 'endless';

const DIFFICULTIES: { key: Difficulty; label: string }[] = [
  { key: 'easy', label: 'Easy' },
  { key: 'normal', label: 'Normal' },
  { key: 'hard', label: 'Hard' },
];
const TARGETS = [5, 7, 11];
const ENDLESS_COLOR = '#b36bff';

type MenuProps = { onPlay: (mode: GameMode) => void; onCareer: () => void };

export function MenuScreen({ onPlay, onCareer }: MenuProps) {
  const insets = useSafeAreaInsets();
  const { width } = useWindowDimensions();
  const { settings, update } = useSettings();
  // Fit "Air Hockey" to the column without clipping the tube glow.
  const logoSize = Math.min(52, (Math.min(width, 520) - 40) / 6.6);
  const rec = settings.record[settings.difficulty];
  const { beaten } = settings;
  const stars = totalStars(settings.stars);
  const progress = { beaten, stars };
  const next = stage(beaten);
  const unlocked = (kind: Reward['kind'], id: string) => isUnlocked({ kind, id }, progress);
  // Shown under the swatches after tapping a locked one.
  const [hint, setHint] = useState<string | null>(null);

  const pick = (kind: Reward['kind'], id: string) => {
    if (!unlocked(kind, id)) {
      setHint(unlockHint({ kind, id }));
      return;
    }
    setHint(null);
    playSound('tap', 0.6);
    buzz('select');
    update(kind === 'paddle' ? { paddle: id } : { table: id });
  };

  return (
    <ScrollView
      style={styles.root}
      contentContainerStyle={[styles.content, { paddingTop: insets.top + 28, paddingBottom: insets.bottom + 28 }]}
    >
      <View accessible accessibilityRole="header" accessibilityLabel="Neon Air Hockey" style={styles.logo}>
        <Text style={styles.logoNeon}>Neon</Text>
        <Text style={[styles.logoMain, { fontSize: logoSize, lineHeight: logoSize * 1.12 }]}>Air Hockey</Text>
      </View>

      <View style={styles.block}>
        <PlateButton label="Career" color={colors.marquee} onPress={onCareer} />
        <Text style={styles.caption}>
          {next.boss ? 'Boss next: ' : 'Next up: '}
          <Text style={styles.captionStrong}>{titleCase(next.name)}</Text>, {stageLabel(next)}.{'\n'}
          {rank(stars).name}, {stars} {stars === 1 ? 'star' : 'stars'}.
        </Text>
      </View>

      <View style={styles.pair}>
        <View style={styles.half}>
          <PlateButton label="Endless" color={ENDLESS_COLOR} onPress={() => onPlay('endless')} />
          <Text style={styles.caption}>
            {settings.endlessBest > 0 ? `Best run: ${settings.endlessBest}` : 'Three lives. Survive.'}
          </Text>
        </View>
        <View style={styles.half}>
          <PlateButton label="2 Players" color={colors.p1} onPress={() => onPlay('2p')} />
          <Text style={styles.caption}>One device, one end each.</Text>
        </View>
      </View>

      <View style={styles.block}>
        <PlateButton label="Quick match" color={colors.p0} onPress={() => onPlay('1p')} />
        <View style={styles.row}>
          {DIFFICULTIES.map((d) => (
            <PlateButton
              key={d.key}
              small
              label={d.label}
              color={colors.p0}
              selected={settings.difficulty === d.key}
              onPress={() => update({ difficulty: d.key })}
              style={styles.flex}
            />
          ))}
        </View>
        <Text style={styles.caption}>
          {rec.w} won, {rec.l} lost on {settings.difficulty}.
        </Text>
      </View>

      <View style={styles.panel}>
        <View style={styles.settingRow}>
          <Text style={styles.settingLabel}>First to</Text>
          <View style={[styles.row, styles.flex]}>
            {TARGETS.map((t) => (
              <PlateButton
                key={t}
                small
                label={String(t)}
                color={colors.marquee}
                selected={settings.target === t}
                onPress={() => update({ target: t })}
                style={styles.flex}
              />
            ))}
          </View>
        </View>

        <Text style={styles.settingLabel}>Your paddle</Text>
        <View style={styles.swatches}>
          {PADDLES.map((p) => (
            <Swatch
              key={p.id}
              label={`${p.name} paddle`}
              color={p.color}
              fill={`${p.color}33`}
              dot={p.core}
              selected={settings.paddle === p.id}
              locked={!unlocked('paddle', p.id)}
              onPress={() => pick('paddle', p.id)}
            />
          ))}
        </View>

        <Text style={styles.settingLabel}>Table</Text>
        <View style={styles.swatches}>
          {TABLES.map((t) => (
            <Swatch
              key={t.id}
              label={`${t.name} table`}
              color={t.edge}
              fill={t.table}
              dot={t.edge}
              selected={settings.table === t.id}
              locked={!unlocked('table', t.id)}
              onPress={() => pick('table', t.id)}
            />
          ))}
        </View>
        {hint && <Text style={styles.hint}>{hint}</Text>}

        <View style={styles.toggles}>
          <Toggle label="Sound" value={settings.sound} onChange={(sound) => update({ sound })} />
          <Toggle label="Vibration" value={settings.haptics} onChange={(haptics) => update({ haptics })} />
        </View>
      </View>

      {/* Local testing only: __DEV__ is false in App Store builds, so none of this ships. */}
      {__DEV__ && (
        <View style={styles.row}>
          <PlateButton
            small
            selected={false}
            label="Dev: unlock all"
            onPress={() => {
              // Every league 3-starred and 30 tower floors climbed: all skins, ranks and pages open.
              const cleared = TOWER_START + 30;
              update({ beaten: cleared, stars: Array(cleared).fill(3), endlessBest: Math.max(settings.endlessBest, 50) });
            }}
            style={styles.flex}
          />
          <PlateButton
            small
            selected={false}
            label="Dev: reset"
            onPress={() => update({ beaten: 0, stars: [], endlessBest: 0, paddle: 'pink', table: 'midnight' })}
            style={styles.flex}
          />
        </View>
      )}
    </ScrollView>
  );
}

type SwatchProps = {
  label: string;
  color: string;
  fill: string;
  dot: string;
  selected: boolean;
  locked: boolean;
  onPress: () => void;
};

// Locked swatches are an empty dashed socket; tap one to see how to earn it.
function Swatch({ label, color, fill, dot, selected, locked, onPress }: SwatchProps) {
  return (
    <Pressable
      accessibilityRole="button"
      accessibilityLabel={locked ? `${label}, locked` : label}
      accessibilityState={{ selected }}
      onPress={onPress}
      hitSlop={3}
      style={[
        styles.swatch,
        locked
          ? styles.swatchLocked
          : { borderColor: color, backgroundColor: fill, boxShadow: selected ? glow(color, 8, 1) : undefined },
        selected && styles.swatchSelected,
      ]}
    >
      {!locked && <View style={[styles.swatchDot, { backgroundColor: dot }]} />}
    </Pressable>
  );
}

function Toggle({ label, value, onChange }: { label: string; value: boolean; onChange: (v: boolean) => void }) {
  return (
    <View style={styles.toggle}>
      <Text style={styles.toggleLabel}>{label}</Text>
      <Switch
        accessibilityLabel={label}
        value={value}
        onValueChange={onChange}
        trackColor={{ true: colors.marquee, false: colors.plateEdge }}
        thumbColor={colors.text}
      />
    </View>
  );
}

const styles = StyleSheet.create({
  root: { flex: 1, backgroundColor: colors.bg },
  content: { paddingHorizontal: 20, gap: 22, maxWidth: 520, width: '100%', alignSelf: 'center' },
  logo: { marginBottom: 6 },
  logoNeon: {
    fontFamily: fonts.logo,
    fontSize: 34,
    color: colors.p0,
    textShadowColor: colors.p0,
    textShadowRadius: 14,
    textShadowOffset: { width: 0, height: 0 },
  },
  logoMain: {
    fontFamily: fonts.logo,
    color: colors.p1,
    textShadowColor: colors.p1,
    textShadowRadius: 18,
    textShadowOffset: { width: 0, height: 0 },
  },
  block: { gap: 10 },
  pair: { flexDirection: 'row', gap: 12 },
  half: { flex: 1, gap: 10 },
  row: { flexDirection: 'row', gap: 8 },
  flex: { flex: 1 },
  caption: { fontFamily: fonts.body, color: colors.dim, fontSize: 15, lineHeight: 20 },
  captionStrong: { fontFamily: fonts.bold, color: colors.text },
  panel: { backgroundColor: colors.plate, borderRadius: 16, padding: 16, gap: 12, marginTop: 4 },
  settingRow: { flexDirection: 'row', alignItems: 'center', gap: 14 },
  settingLabel: { fontFamily: fonts.bold, color: colors.text, fontSize: 16 },
  swatches: { flexDirection: 'row', flexWrap: 'wrap', gap: 10 },
  swatch: { width: 40, height: 40, borderRadius: 20, borderWidth: 3, alignItems: 'center', justifyContent: 'center' },
  swatchLocked: { borderColor: 'rgba(154, 147, 196, 0.4)', borderStyle: 'dashed', borderWidth: 2 },
  swatchSelected: { transform: [{ scale: 1.08 }] },
  swatchDot: { width: 12, height: 12, borderRadius: 6 },
  hint: { fontFamily: fonts.body, color: colors.marquee, fontSize: 15 },
  toggles: { flexDirection: 'row', gap: 24, marginTop: 4 },
  toggle: { flexDirection: 'row', alignItems: 'center', gap: 10 },
  toggleLabel: { fontFamily: fonts.bold, color: colors.text, fontSize: 16 },
});
