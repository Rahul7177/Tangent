import React from 'react';
import { StyleProp, StyleSheet, View, ViewStyle } from 'react-native';
import { LinearGradient } from 'expo-linear-gradient';
import { useTheme } from '../theme/ThemeContext';
import { gradients } from '../theme/tokens';

type Kind = keyof (typeof gradients)['light'];

// Neutral canvas with soft blue blooms. The reference uses black/white as the
// actual background and lets blue arrive as blurred atmosphere.
export function DynamicGradient({
  kind = 'hero',
  style,
  children,
}: {
  kind?: Kind;
  style?: StyleProp<ViewStyle>;
  children?: React.ReactNode;
}) {
  const { mode } = useTheme();
  const colors = gradients[mode][kind];
  return (
    <View style={[styles.root, style]}>
      <LinearGradient colors={[colors[0], colors[1]]} start={{ x: 0, y: 0 }} end={{ x: 1, y: 1 }} style={StyleSheet.absoluteFill} />
      <LinearGradient colors={mode === 'dark' ? ['rgba(37,111,255,0.22)', 'transparent'] : ['rgba(122,190,255,0.28)', 'transparent']} start={{ x: 0.12, y: 0 }} end={{ x: 0.86, y: 0.72 }} style={styles.topBloom} />
      <LinearGradient colors={mode === 'dark' ? ['transparent', 'rgba(16,61,142,0.18)'] : ['transparent', 'rgba(166,216,255,0.22)']} style={styles.bottomHaze} />
      {children}
    </View>
  );
}

const styles = StyleSheet.create({
  root: { flex: 1, overflow: 'hidden' },
  topBloom: { position: 'absolute', top: 0, left: 0, right: 0, height: '62%' },
  bottomHaze: { position: 'absolute', bottom: 0, left: 0, right: 0, height: '46%' },
});
