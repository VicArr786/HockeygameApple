import { StyleSheet, View, type StyleProp, type ViewStyle } from 'react-native';

import { colors } from '../theme';

// Yellow-and-black warning stripes, the decal arcade cabinets put on anything
// dangerous. Used to mark bosses.
export function Hazard({ width, height, style }: { width: number; height: number; style?: StyleProp<ViewStyle> }) {
  const band = Math.max(6, height * 0.5);
  const count = Math.ceil((width + height) / (band * 2)) + 1;
  return (
    <View style={[styles.box, { width, height }, style]}>
      {Array.from({ length: count }, (_, i) => (
        <View
          key={i}
          style={[styles.stripe, { left: i * band * 2 - height, width: band, height: height * 2, top: -height / 2 }]}
        />
      ))}
    </View>
  );
}

const styles = StyleSheet.create({
  box: { overflow: 'hidden', backgroundColor: colors.ink },
  stripe: { position: 'absolute', backgroundColor: colors.marquee, transform: [{ skewX: '-40deg' }] },
});
