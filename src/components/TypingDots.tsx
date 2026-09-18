import React, { useEffect, useRef } from 'react';
import { Platform } from 'react-native';
import { Animated, StyleSheet, View } from 'react-native';
import { useTheme } from '../theme/ThemeContext';

// Typing indicator: three dots, staggered opacity pulse, 1.4s loop. No haptics.
export function TypingDots() {
  const nativeDriver = Platform.OS !== 'web';
  const { palette } = useTheme();
  const a = useRef(new Animated.Value(0.3)).current;
  const b = useRef(new Animated.Value(0.3)).current;
  const c = useRef(new Animated.Value(0.3)).current;

  useEffect(() => {
    const loop = (v: Animated.Value, delay: number) =>
      Animated.loop(
        Animated.sequence([
          Animated.delay(delay),
          Animated.timing(v, { toValue: 1, duration: 350, useNativeDriver: nativeDriver }),
          Animated.timing(v, { toValue: 0.3, duration: 350, useNativeDriver: nativeDriver }),
        ]),
      );
    const l1 = loop(a, 0);
    const l2 = loop(b, 200);
    const l3 = loop(c, 400);
    l1.start();
    l2.start();
    l3.start();
    return () => {
      l1.stop();
      l2.stop();
      l3.stop();
    };
  }, [a, b, c]);

  return (
    <View style={styles.row}>
      {[a, b, c].map((v, i) => (
        <Animated.View
          key={i}
          style={[styles.dot, { backgroundColor: palette.textSecondary, opacity: v }]}
        />
      ))}
    </View>
  );
}

const styles = StyleSheet.create({
  row: { flexDirection: 'row', gap: 4, paddingVertical: 8, paddingHorizontal: 4 },
  dot: { width: 6, height: 6, borderRadius: 3 },
});
