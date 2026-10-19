import { Pressable, ScrollView, StyleSheet, Text, View } from 'react-native';
import { useSafeAreaInsets } from 'react-native-safe-area-context';

import { RIVALS, rewardInfo } from '../career';
import { buzz, playSound } from '../feedback';
import { useSettings } from '../settings';
import { colors, glow } from '../theme';

export function CareerScreen({ onPlay, onBack }: { onPlay: (rival: number) => void; onBack: () => void }) {
  const insets = useSafeAreaInsets();
  const { settings } = useSettings();
  const { beaten } = settings;

  return (
    <ScrollView
      style={styles.root}
      contentContainerStyle={[styles.content, { paddingTop: insets.top + 16, paddingBottom: insets.bottom + 24 }]}
    >
      <Pressable accessibilityRole="button" accessibilityLabel="Back to menu" onPress={onBack} hitSlop={10} style={styles.back}>
        <Text style={styles.backText}>‹ MENU</Text>
      </Pressable>

      <Text style={styles.title}>CAREER</Text>
      <Text style={styles.subtitle}>
        {beaten >= RIVALS.length ? 'Champion! Every rival beaten.' : `Beat all ${RIVALS.length} rivals · ${beaten} down`}
      </Text>

      <View style={styles.list}>
        {RIVALS.map((r, i) => {
          const done = i < beaten;
          const next = i === beaten;
          const locked = i > beaten;
          const reward = rewardInfo(r.reward);
          return (
            <Pressable
              key={r.name}
              accessibilityRole="button"
              accessibilityLabel={`${r.name}, ${done ? 'beaten' : next ? 'next rival' : 'locked'}`}
              accessibilityState={{ disabled: locked }}
              disabled={locked}
              onPress={() => {
                playSound('tap', 0.6);
                buzz('select');
                onPlay(i);
              }}
              style={({ pressed }) => [
                styles.card,
                next && { borderColor: colors.puck, boxShadow: glow(colors.puck, 14, 0), backgroundColor: `${colors.puck}14` },
                done && { borderColor: `${colors.p1}88` },
                locked && styles.lockedCard,
                { transform: [{ scale: pressed ? 0.98 : 1 }] },
              ]}
            >
              <Text style={[styles.num, next && { color: colors.puck }]}>{String(i + 1).padStart(2, '0')}</Text>
              <View style={styles.info}>
                <Text style={[styles.name, locked && { color: colors.dim }]}>{locked ? '???' : r.name}</Text>
                <Text style={styles.tagline}>{locked ? 'Beat the rival above to unlock' : r.tagline}</Text>
                <View style={styles.rewardRow}>
                  <View style={[styles.swatch, { backgroundColor: reward.color }, locked && { opacity: 0.35 }]} />
                  <Text style={styles.reward}>{reward.label}</Text>
                </View>
              </View>
              <Text style={[styles.status, done && { color: colors.p1 }, next && { color: colors.puck }]}>
                {done ? '✓' : next ? 'PLAY ›' : '🔒'}
              </Text>
            </Pressable>
          );
        })}
      </View>
    </ScrollView>
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
    marginTop: 8,
    textShadowColor: colors.puck,
    textShadowRadius: 16,
    textShadowOffset: { width: 0, height: 0 },
  },
  subtitle: { color: colors.dim, fontSize: 14, textAlign: 'center', marginTop: 6, marginBottom: 20 },
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
  lockedCard: { opacity: 0.6 },
  num: { color: colors.dim, fontSize: 20, fontWeight: '900', fontVariant: ['tabular-nums'], width: 30 },
  info: { flex: 1, gap: 3 },
  name: { color: colors.text, fontSize: 20, fontWeight: '900', letterSpacing: 2 },
  tagline: { color: colors.dim, fontSize: 13 },
  rewardRow: { flexDirection: 'row', alignItems: 'center', gap: 6, marginTop: 3 },
  swatch: { width: 10, height: 10, borderRadius: 5 },
  reward: { color: colors.dim, fontSize: 12, fontWeight: '700' },
  status: { color: colors.dim, fontSize: 15, fontWeight: '900', letterSpacing: 1 },
});
