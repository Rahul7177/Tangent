import React from 'react';
import { StyleProp, StyleSheet, View, ViewStyle } from 'react-native';
import { LinearGradient } from 'expo-linear-gradient';
import { useTheme } from '../theme/ThemeContext';
import { gradients } from '../theme/tokens';

type Kind = keyof (typeof gradients)['light'];

// Theme-aware glass atmosphere. The base wash, side bloom, and lower haze create
// the reference's depth while keeping content readable above the layers.
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
      <LinearGradient colors={mode === 'dark' ? ['rgba(89,157,235,0.22)', 'transparent'] : ['rgba(126,198,239,0.30)', 'transparent']} start={{ x: 0, y: 0 }} end={{ x: 0.9, y: 0.7 }} style={styles.topBloom} />
      <LinearGradient colors={mode === 'dark' ? ['transparent', 'rgba(4,12,22,0.46)'] : ['transparent', 'rgba(190,222,233,0.38)']} style={styles.bottomHaze} />
      {children}
    </View>
  );
}

const styles = StyleSheet.create({
  root: { flex: 1, overflow: 'hidden' },
  topBloom: { position: 'absolute', top: 0, left: 0, right: 0, height: '62%' },
  bottomHaze: { position: 'absolute', bottom: 0, left: 0, right: 0, height: '46%' },
});
