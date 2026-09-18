import React, { useMemo } from 'react';
import { StyleProp, StyleSheet, View, ViewStyle } from 'react-native';
import { LinearGradient } from 'expo-linear-gradient';
import Svg, { Circle, Defs, Pattern, Rect } from 'react-native-svg';
import { useTheme } from '../theme/ThemeContext';

// Ambient background: literal black/white canvas with restrained blue blooms and grain.

// Fixed pseudo-random grain dots (stable across renders, no churn).
const DOTS: [number, number, number, number][] = [
  [8, 12, 0.8, 0.5], [34, 44, 0.6, 0.35], [61, 18, 0.9, 0.55], [88, 66, 0.7, 0.4],
  [112, 30, 0.6, 0.3], [20, 96, 0.8, 0.45], [52, 120, 0.6, 0.35], [96, 108, 0.9, 0.5],
  [130, 132, 0.7, 0.4], [44, 70, 0.6, 0.3], [76, 84, 0.8, 0.45], [120, 52, 0.6, 0.3],
  [140, 100, 0.8, 0.4], [12, 138, 0.7, 0.35], [66, 140, 0.6, 0.3], [104, 8, 0.7, 0.4],
];

export function GrainOverlay({ opacity = 0.05 }: { opacity?: number }) {
  const { mode } = useTheme();
  const dark = mode === 'dark';
  const dots = useMemo(() => DOTS, []);
  return (
    <Svg
      pointerEvents="none"
      style={StyleSheet.absoluteFill}
      width="100%"
      height="100%"
      opacity={opacity}
    >
      <Defs>
        <Pattern id="tangent-grain" width="150" height="150" patternUnits="userSpaceOnUse">
          {dots.map(([x, y, r, o], i) => (
            <Circle key={i} cx={x} cy={y} r={r} fill={dark ? '#FFFFFF' : '#000000'} opacity={o} />
          ))}
        </Pattern>
      </Defs>
      <Rect x="0" y="0" width="100%" height="100%" fill="url(#tangent-grain)" />
    </Svg>
  );
}

function AmbientWashes() {
  const { mode } = useTheme();
  const dark = mode === 'dark';
  const top = dark ? 'rgba(36,105,236,0.16)' : 'rgba(111,184,255,0.18)';
  const bottom = dark ? 'rgba(20,57,125,0.12)' : 'rgba(159,211,255,0.14)';
  const side = dark ? 'rgba(34,88,190,0.10)' : 'rgba(132,201,255,0.12)';
  return (
    <View pointerEvents="none" style={StyleSheet.absoluteFill}>
      <LinearGradient
        colors={[top, 'transparent']}
        style={styles.washTop}
      />
      <LinearGradient
        colors={['transparent', bottom]}
        style={styles.washBottom}
      />
      <LinearGradient
        colors={[side, 'transparent', side]}
        start={{ x: 0, y: 0 }}
        end={{ x: 1, y: 0 }}
        style={styles.washSides}
      />
    </View>
  );
}

// Drop-in screen background: ambient washes behind children, grain over all.
export function AmbientBackground({
  children,
  style,
}: {
  children?: React.ReactNode;
  style?: StyleProp<ViewStyle>;
}) {
  const { palette } = useTheme();
  return (
    <View style={[{ flex: 1, backgroundColor: palette.bgBase }, style]}>
      <AmbientWashes />
      {children}
      <GrainOverlay />
    </View>
  );
}

const styles = StyleSheet.create({
  washTop: { position: 'absolute', top: 0, left: 0, right: 0, height: 340 },
  washBottom: { position: 'absolute', bottom: 0, left: 0, right: 0, height: 280 },
  washSides: { position: 'absolute', top: 0, bottom: 0, left: 0, right: 0 },
});
