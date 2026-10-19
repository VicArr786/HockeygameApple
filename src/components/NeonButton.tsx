import { Pressable, StyleSheet, Text, type StyleProp, type ViewStyle } from 'react-native';

import { buzz, playSound } from '../feedback';
import { colors, glow } from '../theme';

type Props = {
  label: string;
  onPress: () => void;
  color?: string;
  small?: boolean;
  selected?: boolean;
  style?: StyleProp<ViewStyle>;
};

export function NeonButton({ label, onPress, color = colors.p1, small, selected = true, style }: Props) {
  return (
    <Pressable
      accessibilityRole="button"
      accessibilityLabel={label}
      accessibilityState={{ selected }}
      onPress={() => {
        playSound('tap', 0.6);
        buzz('select');
        onPress();
      }}
      style={({ pressed }) => [
        styles.base,
        small && styles.small,
        {
          borderColor: selected ? color : 'rgba(143, 136, 184, 0.35)',
          boxShadow: selected ? glow(color, small ? 8 : 14, 0) : undefined,
          backgroundColor: selected ? `${color}22` : 'transparent',
          transform: [{ scale: pressed ? 0.96 : 1 }],
        },
        style,
      ]}
    >
      <Text style={[styles.label, small && styles.smallLabel, { color: selected ? colors.text : colors.dim }]}>
        {label}
      </Text>
    </Pressable>
  );
}

const styles = StyleSheet.create({
  base: {
    borderWidth: 2,
    borderRadius: 16,
    paddingVertical: 16,
    paddingHorizontal: 22,
    alignItems: 'center',
    justifyContent: 'center',
  },
  small: { borderRadius: 12, paddingVertical: 9, paddingHorizontal: 12, borderWidth: 1.5 },
  label: { fontSize: 20, fontWeight: '900', letterSpacing: 2 },
  smallLabel: { fontSize: 13, letterSpacing: 1.2, fontWeight: '800' },
});
