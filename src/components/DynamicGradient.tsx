import React from 'react';
import { StyleProp, ViewStyle } from 'react-native';
import { LinearGradient } from 'expo-linear-gradient';
import { useTheme } from '../theme/ThemeContext';
import { gradients } from '../theme/tokens';

type Kind = keyof (typeof gradients)['light'];

// Theme-aware gradient surface. Dynamic = colors swap on light/dark toggle
// (200ms cross-fade handled by parent theme switch). Diagonal 135deg, subtle.
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
    <LinearGradient
      colors={[colors[0], colors[1]]}
      start={{ x: 0, y: 0 }}
      end={{ x: 1, y: 1 }}
      style={style}
    >
      {children}
    </LinearGradient>
  );
}
