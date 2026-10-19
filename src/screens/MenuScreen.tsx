import { useState } from 'react';
import { Pressable, ScrollView, StyleSheet, Switch, Text, View } from 'react-native';
import { useSafeAreaInsets } from 'react-native-safe-area-context';

import { isUnlocked, rank, stage, stageLabel, totalStars, unlockHint, type Reward } from '../career';
import { NeonButton } from '../components/NeonButton';
import { buzz, playSound } from '../feedback';
import type { Difficulty } from '../game/ai';
import { useSettings } from '../settings';
import { PADDLES, TABLES } from '../skins';
import { colors, glow } from '../theme';

export type GameMode = '1p' | '2p' | 'endless';

const DIFFICULTIES: { key: Difficulty; label: string }[] = [
  { key: 'easy', label: 'EASY' },
  { key: 'normal', label: 'NORMAL' },
  { key: 'hard', label: 'HARD' },
];
const TARGETS = [5, 7, 11];
const ENDLESS_COLOR = '#b36bff';

type MenuProps = { onPlay: (mode: GameMode) => void; onCareer: () => void };

export function MenuScreen({ onPlay, onCareer }: MenuProps) {
  const insets = useSafeAreaInsets();
  const { settings, update } = useSettings();
  const rec = settings.record[settings.difficulty];
  const { beaten } = settings;
  const stars = totalStars(settings.stars);
  const progress = { beaten, stars };
  const nextStage = stage(beaten);
  const unlocked = (kind: Reward['kind'], id: string) => isUnlocked({ kind, id }, progress);
  const owned = PADDLES.filter((p) => unlocked('paddle', p.id)).length + TABLES.filter((t) => unlocked('table', t.id)).length;
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
      contentContainerStyle={[styles.content, { paddingTop: insets.top + 32, paddingBottom: insets.bottom + 24 }]}
    >
      <View style={styles.titleBlock}>
        <Text style={[styles.titleSmall, { textShadowColor: colors.p1 }]}>NEON</Text>
        <Text style={[styles.title, { textShadowColor: colors.p0 }]} adjustsFontSizeToFit numberOfLines={1}>
          AIR HOCKEY
        </Text>
      </View>

      <View style={styles.section}>
        <NeonButton label="CAREER" color={colors.puck} onPress={onCareer} />
        <Text style={styles.caption}>
          {`${rank(stars).name} · ★ ${stars} · Next: ${nextStage.boss ? 'BOSS ' : ''}${nextStage.name} (${stageLabel(nextStage)})`}
        </Text>
      </View>

      <View style={styles.section}>
        <NeonButton label="ENDLESS" color={ENDLESS_COLOR} onPress={() => onPlay('endless')} />
        <Text style={styles.caption}>
          {settings.endlessBest > 0
            ? `Best: ${settings.endlessBest} · how long can you survive?`
            : '3 lives, new rules every 5 points · how long can you survive?'}
        </Text>
      </View>

      <View style={styles.section}>
        <NeonButton label="QUICK MATCH" color={colors.p0} onPress={() => onPlay('1p')} />
        <View style={styles.row}>
          {DIFFICULTIES.map((d) => (
            <NeonButton
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
          Record on {settings.difficulty}: {rec.w}W – {rec.l}L
        </Text>
      </View>

      <View style={styles.section}>
        <NeonButton label="2 PLAYERS" color={colors.p1} onPress={() => onPlay('2p')} />
        <Text style={styles.caption}>Same device — one player at each end</Text>
      </View>

      <View style={styles.section}>
        <Text style={styles.heading}>FIRST TO</Text>
        <View style={styles.row}>
          {TARGETS.map((t) => (
            <NeonButton
              key={t}
              small
              label={String(t)}
              color={colors.puck}
              selected={settings.target === t}
              onPress={() => update({ target: t })}
              style={styles.flex}
            />
          ))}
        </View>
      </View>

      <View style={styles.section}>
        <Text style={styles.heading}>
          STYLE · {owned}/{PADDLES.length + TABLES.length}
        </Text>
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
        {hint && <Text style={styles.caption}>{hint}</Text>}
      </View>

      <View style={[styles.section, styles.toggles]}>
        <Toggle label="Sound" value={settings.sound} onChange={(sound) => update({ sound })} />
        <Toggle label="Vibration" value={settings.haptics} onChange={(haptics) => update({ haptics })} />
      </View>
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

function Swatch({ label, color, fill, dot, selected, locked, onPress }: SwatchProps) {
  return (
    <Pressable
      accessibilityRole="button"
      accessibilityLabel={locked ? `${label}, locked` : label}
      accessibilityState={{ selected }}
      onPress={onPress}
      hitSlop={4}
      style={[
        styles.swatch,
        { borderColor: locked ? 'rgba(143, 136, 184, 0.35)' : color, backgroundColor: locked ? 'transparent' : fill },
        selected && { boxShadow: glow(color, 10, 2) },
      ]}
    >
      {locked ? <Text style={styles.lock}>🔒</Text> : <View style={[styles.swatchDot, { backgroundColor: dot }, selected && styles.swatchDotOn]} />}
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
        trackColor={{ true: colors.p1, false: '#2a2550' }}
        thumbColor="#fff"
      />
    </View>
  );
}

const styles = StyleSheet.create({
  root: { flex: 1, backgroundColor: colors.bg },
  content: { flexGrow: 1, justifyContent: 'center', paddingHorizontal: 24, gap: 28, maxWidth: 520, width: '100%', alignSelf: 'center' },
  titleBlock: { alignItems: 'center', marginBottom: 8 },
  titleSmall: {
    color: colors.text,
    fontSize: 28,
    fontWeight: '900',
    letterSpacing: 14,
    textShadowRadius: 14,
    textShadowOffset: { width: 0, height: 0 },
  },
  title: {
    color: colors.text,
    fontSize: 46,
    fontWeight: '900',
    fontStyle: 'italic',
    letterSpacing: 3,
    textShadowRadius: 18,
    textShadowOffset: { width: 0, height: 0 },
  },
  section: { gap: 12 },
  row: { flexDirection: 'row', gap: 10 },
  flex: { flex: 1 },
  caption: { color: colors.dim, textAlign: 'center', fontSize: 13 },
  heading: { color: colors.dim, fontWeight: '800', letterSpacing: 3, fontSize: 13, textAlign: 'center' },
  swatches: { flexDirection: 'row', flexWrap: 'wrap', justifyContent: 'center', gap: 12 },
  swatch: { width: 44, height: 44, borderRadius: 22, borderWidth: 3, alignItems: 'center', justifyContent: 'center' },
  swatchDot: { width: 10, height: 10, borderRadius: 5, opacity: 0.8 },
  swatchDotOn: { width: 16, height: 16, borderRadius: 8, opacity: 1 },
  lock: { fontSize: 15, opacity: 0.7 },
  toggles: { flexDirection: 'row', justifyContent: 'space-around' },
  toggle: { flexDirection: 'row', alignItems: 'center', gap: 10 },
  toggleLabel: { color: colors.text, fontSize: 16, fontWeight: '700' },
});
