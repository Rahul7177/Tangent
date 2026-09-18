import React, { useEffect, useMemo, useRef } from 'react';
import { Animated, Platform, StyleProp, StyleSheet, View, ViewStyle, useWindowDimensions } from 'react-native';
import { LinearGradient } from 'expo-linear-gradient';
import Svg, { Circle, Defs, Ellipse, Pattern, RadialGradient, Rect, Stop } from 'react-native-svg';
import { useTheme } from '../theme/ThemeContext';
import { gradients } from '../theme/tokens';

// Matte dark-mesh canvas from the reference: deep navy-black base, a
// desaturated teal glow bleeding in off the left edge, faint depth bloom
// bottom-right, visible film grain over all. Static — no motion.

// Dense grain tile (32 dots) so the texture reads like the reference.
const DOTS: [number, number, number, number][] = [
  [8, 12, 0.8, 0.5], [34, 44, 0.6, 0.35], [61, 18, 0.9, 0.55], [88, 66, 0.7, 0.4],
  [112, 30, 0.6, 0.3], [20, 96, 0.8, 0.45], [52, 120, 0.6, 0.35], [96, 108, 0.9, 0.5],
  [130, 132, 0.7, 0.4], [44, 70, 0.6, 0.3], [76, 84, 0.8, 0.45], [120, 52, 0.6, 0.3],
  [140, 100, 0.8, 0.4], [12, 138, 0.7, 0.35], [66, 140, 0.6, 0.3], [104, 8, 0.7, 0.4],
  [22, 30, 0.7, 0.4], [48, 58, 0.5, 0.3], [74, 26, 0.8, 0.45], [100, 80, 0.6, 0.35],
  [126, 44, 0.7, 0.4], [6, 110, 0.6, 0.3], [58, 132, 0.8, 0.45], [84, 122, 0.5, 0.3],
  [118, 118, 0.7, 0.4], [28, 84, 0.6, 0.35], [92, 14, 0.7, 0.4], [136, 74, 0.6, 0.3],
  [40, 6, 0.5, 0.3], [110, 136, 0.7, 0.4], [70, 100, 0.6, 0.35], [16, 58, 0.7, 0.4],
];

export function GrainOverlay({ opacity = 0.12 }: { opacity?: number }) {
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

function Mesh() {
  const { palette, mode } = useTheme();
  const { width: W, height: H } = useWindowDimensions();
  const dark = mode === 'dark';
  const hero = gradients[mode].hero;
  return (
    <View pointerEvents="none" style={StyleSheet.absoluteFill}>
      <LinearGradient
        colors={[hero[0], hero[1]]}
        start={{ x: 0, y: 0 }}
        end={{ x: 1, y: 1 }}
        style={StyleSheet.absoluteFill}
      />
      <Svg width={W} height={H}>
        <Defs>
          <RadialGradient id="mesh-glow" cx="50%" cy="50%" r="50%">
            <Stop offset="0%" stopColor={palette.blobA} stopOpacity={dark ? 0.95 : 0.9} />
            <Stop offset="45%" stopColor={palette.blobA} stopOpacity={dark ? 0.45 : 0.4} />
            <Stop offset="100%" stopColor={palette.blobA} stopOpacity={0} />
          </RadialGradient>
          <RadialGradient id="mesh-depth" cx="50%" cy="50%" r="50%">
            <Stop offset="0%" stopColor={palette.blobB} stopOpacity={dark ? 0.8 : 0.7} />
            <Stop offset="100%" stopColor={palette.blobB} stopOpacity={0} />
          </RadialGradient>
        </Defs>
        {/* Teal glow bleeding in off the left edge, brightest upper-third */}
        <Ellipse cx={-0.18 * W} cy={0.3 * H} rx={0.95 * W} ry={0.55 * H} fill="url(#mesh-glow)" />
        {/* Hot core — the bright patch hugging the left edge */}
        <Ellipse cx={-0.08 * W} cy={0.28 * H} rx={0.45 * W} ry={0.32 * H} fill="url(#mesh-glow)" />
        {/* Faint depth bloom bottom-right keeps the falloff from going flat */}
        <Ellipse cx={0.95 * W} cy={0.92 * H} rx={0.7 * W} ry={0.4 * H} fill="url(#mesh-depth)" />
      </Svg>
    </View>
  );
}

// Drop-in screen background: mesh canvas behind children, grain over all.
export function AmbientBackground({
  children,
  style,
}: {
  children?: React.ReactNode;
  style?: StyleProp<ViewStyle>;
}) {
  const { palette } = useTheme();
  const drift = useRef(new Animated.Value(0)).current;
  const nativeDriver = Platform.OS !== 'web';

  useEffect(() => {
    const loop = Animated.loop(
      Animated.sequence([
        Animated.timing(drift, { toValue: 1, duration: 6500, useNativeDriver: nativeDriver }),
        Animated.timing(drift, { toValue: 0, duration: 6500, useNativeDriver: nativeDriver }),
      ]),
    );
    loop.start();
    return () => loop.stop();
  }, [drift, nativeDriver]);

  const translateX = drift.interpolate({ inputRange: [0, 1], outputRange: [-22, 30] });
  const translateY = drift.interpolate({ inputRange: [0, 1], outputRange: [18, -18] });
  const scale = drift.interpolate({ inputRange: [0, 1], outputRange: [1.04, 1.1] });
  return (
    <View style={[{ flex: 1, backgroundColor: palette.bgBase, overflow: 'hidden' }, style]}>
      <Animated.View
        pointerEvents="none"
        style={[StyleSheet.absoluteFill, { transform: [{ translateX }, { translateY }, { scale }] }]}
      >
        <Mesh />
      </Animated.View>
      {children}
      <GrainOverlay />
    </View>
  );
}
