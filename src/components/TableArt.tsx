import { memo } from 'react';
import { StyleSheet, View } from 'react-native';

import type { TableSkin } from '../skins';
import { colors, glow } from '../theme';

type Props = { W: number; H: number; goalW: number; skin: TableSkin; p0: string };

// Static table markings. Memoised so the 60fps game loop never re-renders it.
export const TableArt = memo(function TableArt({ W, H, goalW, skin, p0 }: Props) {
  const spacing = W / 11;
  const holes = [];
  for (let y = spacing / 2; y < H; y += spacing) {
    for (let x = spacing / 2; x < W; x += spacing) {
      holes.push(<View key={`${x}:${y}`} style={[styles.hole, { left: x - 1.5, top: y - 1.5, backgroundColor: skin.hole }]} />);
    }
  }
  const centreR = W * 0.17;
  const creaseR = goalW * 0.62;
  const gl = (W - goalW) / 2;

  return (
    <View pointerEvents="none" style={StyleSheet.absoluteFill}>
      {holes}
      <View style={[styles.line, { top: H / 2 - 1.5, width: W, backgroundColor: skin.line }]} />
      <Ring cx={W / 2} cy={H / 2} r={centreR} color={skin.line} />
      <View style={[styles.dot, { left: W / 2 - 6, top: H / 2 - 6, backgroundColor: skin.line }]} />
      <Ring cx={W / 2} cy={0} r={creaseR} color={colors.p1} faint />
      <Ring cx={W / 2} cy={H} r={creaseR} color={p0} faint />
      <View style={[styles.border, { width: W, height: H, borderColor: skin.edge, boxShadow: glow(skin.edge, 18, 1) }]} />
      <View style={[styles.goal, { left: gl, width: goalW, top: -2, backgroundColor: colors.p1, boxShadow: glow(colors.p1, 14, 2) }]} />
      <View style={[styles.goal, { left: gl, width: goalW, top: H - 4, backgroundColor: p0, boxShadow: glow(p0, 14, 2) }]} />
    </View>
  );
});

function Ring({ cx, cy, r, color, faint }: { cx: number; cy: number; r: number; color: string; faint?: boolean }) {
  return (
    <View
      style={{
        position: 'absolute',
        left: cx - r,
        top: cy - r,
        width: r * 2,
        height: r * 2,
        borderRadius: r,
        borderWidth: 3,
        borderColor: color,
        opacity: faint ? 0.45 : 1,
      }}
    />
  );
}

const styles = StyleSheet.create({
  hole: { position: 'absolute', width: 3, height: 3, borderRadius: 1.5 },
  line: { position: 'absolute', left: 0, height: 3 },
  dot: { position: 'absolute', width: 12, height: 12, borderRadius: 6 },
  border: { position: 'absolute', left: 0, top: 0, borderWidth: 3, borderRadius: 14 },
  goal: { position: 'absolute', height: 6, borderRadius: 3 },
});
