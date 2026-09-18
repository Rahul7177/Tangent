import React from 'react';
import { Pressable, StyleSheet, Text } from 'react-native';
import { LinearGradient } from 'expo-linear-gradient';
import { useTheme } from '../theme/ThemeContext';
import { gradients, radius, typeScale } from '../theme/tokens';

// One gradient-primary CTA per screen; everything else ghost/text.
// Gradient is single-hue lagoon mint — minimal, never purple/blue, never animated.
export function TButton({
  title,
  onPress,
  variant = 'primary',
}: {
  title: string;
  onPress: () => void;
  variant?: 'primary' | 'ghost';
}) {
  const { palette, mode } = useTheme();
  const primary = variant === 'primary';
  if (!primary) {
    return (
      <Pressable
        accessibilityRole="button"
        onPress={onPress}
        style={[styles.base, { borderWidth: 1, borderColor: palette.textPrimary }]}
      >
        <Text style={{ fontSize: typeScale.body.size, fontWeight: '600', color: palette.textPrimary }}>
          {title}
        </Text>
      </Pressable>
    );
  }
  const g = gradients[mode].primary;
  return (
    <Pressable accessibilityRole="button" onPress={onPress} style={styles.wrap}>
      {({ pressed }) => (
        <LinearGradient
          colors={pressed ? [palette.emberPressed, palette.emberPressed] : [g[0], g[1]]}
          start={{ x: 0, y: 0 }}
          end={{ x: 1, y: 1 }}
          style={styles.base}
        >
          <Text style={{ fontSize: typeScale.body.size, fontWeight: '600', color: palette.onAccent }}>
            {title}
          </Text>
        </LinearGradient>
      )}
    </Pressable>
  );
}

const styles = StyleSheet.create({
  wrap: { borderRadius: radius.button },
  base: {
    borderRadius: radius.button,
    paddingVertical: 12,
    paddingHorizontal: 16,
    alignItems: 'center',
    justifyContent: 'center',
    minHeight: 48,
  },
});
