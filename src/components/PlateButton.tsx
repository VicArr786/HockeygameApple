import { Pressable, StyleSheet, Text, type StyleProp, type ViewStyle } from 'react-native';

import { buzz, playSound } from '../feedback';
import { colors, fonts, plateShadow } from '../theme';

type Props = {
  label: string;
  onPress: () => void;
  color?: string;
  small?: boolean; // segmented options and secondary actions
  selected?: boolean; // small only: unselected plates stay dark
  quiet?: boolean; // secondary action: dark plate, light text
  style?: StyleProp<ViewStyle>;
};

// A cabinet push-button: a solid plate with a hard edge underneath that
// sinks when pressed.
export function PlateButton({ label, onPress, color = colors.marquee, small, selected = true, quiet, style }: Props) {
  const lit = !quiet && (!small || selected);
  const depth = small ? 3 : 5;
  return (
    <Pressable
      accessibilityRole="button"
      accessibilityLabel={label}
      accessibilityState={small ? { selected } : undefined}
      onPress={() => {
        playSound('tap', 0.6);
        buzz('select');
        onPress();
      }}
      style={({ pressed }) => [
        styles.base,
        small && styles.small,
        {
          backgroundColor: lit ? color : quiet ? colors.plateHi : colors.plate,
          boxShadow: plateShadow(pressed ? 1 : depth),
          transform: [{ translateY: pressed ? depth - 1 : 0 }],
        },
        style,
      ]}
    >
      <Text style={[small ? styles.smallLabel : styles.label, { color: lit ? colors.ink : quiet ? colors.text : colors.dim }]}>{label}</Text>
    </Pressable>
  );
}

const styles = StyleSheet.create({
  base: { borderRadius: 12, paddingVertical: 15, paddingHorizontal: 18, justifyContent: 'center' },
  small: { borderRadius: 9, paddingVertical: 9, paddingHorizontal: 10, alignItems: 'center' },
  label: { fontFamily: fonts.display, fontSize: 21 },
  smallLabel: { fontFamily: fonts.bold, fontSize: 16 },
});
