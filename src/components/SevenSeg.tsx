import { StyleSheet, View } from 'react-native';

import { glow } from '../theme';

// Scoreboard digits drawn like a real 7-segment LED: unlit segments stay
// faintly visible, the way they do behind the smoked plastic of a cabinet.

//            a
//          f   b
//            g
//          e   c
//            d
const DIGITS: Record<string, string> = {
  '0': 'abcdef',
  '1': 'bc',
  '2': 'abged',
  '3': 'abgcd',
  '4': 'fgbc',
  '5': 'afgcd',
  '6': 'afgedc',
  '7': 'abc',
  '8': 'abcdefg',
  '9': 'abcdfg',
  '-': 'g',
};

type Props = { value: string | number; height: number; color: string; dim?: boolean };

export function SevenSeg({ value, height, color, dim }: Props) {
  const chars = String(value).split('');
  const w = height * 0.52;
  return (
    <View accessible accessibilityLabel={String(value)} style={[styles.row, { gap: w * 0.28 }]}>
      {chars.map((c, i) => (
        <Digit key={i} on={DIGITS[c] ?? ''} w={w} h={height} color={color} dim={dim} />
      ))}
    </View>
  );
}

function Digit({ on, w, h, color, dim }: { on: string; w: number; h: number; color: string; dim?: boolean }) {
  const t = Math.max(2, w * 0.17); // segment thickness
  const gap = t * 0.18;
  const half = h / 2;
  const seg = (id: string, style: object) => {
    const lit = on.includes(id);
    return (
      <View
        key={id}
        style={[
          styles.seg,
          { borderRadius: t / 2, backgroundColor: color, opacity: lit ? (dim ? 0.55 : 1) : 0.1 },
          lit && !dim && { boxShadow: glow(color, t * 1.2, 0) },
          style,
        ]}
      />
    );
  };
  const horiz = { left: t * 0.5 + gap, width: w - t - gap * 2, height: t };
  const vert = { width: t, height: half - t * 0.5 - gap * 2 };
  return (
    <View style={{ width: w, height: h }}>
      {seg('a', { ...horiz, top: 0 })}
      {seg('g', { ...horiz, top: half - t / 2 })}
      {seg('d', { ...horiz, top: h - t })}
      {seg('f', { ...vert, left: 0, top: t * 0.5 + gap })}
      {seg('b', { ...vert, right: 0, top: t * 0.5 + gap })}
      {seg('e', { ...vert, left: 0, top: half + gap })}
      {seg('c', { ...vert, right: 0, top: half + gap })}
    </View>
  );
}

const styles = StyleSheet.create({
  row: { flexDirection: 'row' },
  seg: { position: 'absolute' },
});
