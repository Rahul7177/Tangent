import React from 'react';
import { StyleSheet, Text, View } from 'react-native';
import { NetQuality, qualityLabel } from '../lib/networkWeather';
import { useTheme } from '../theme/ThemeContext';
import { typeScale } from '../theme/tokens';

// Network Weather: small, checkable, not naggy. Shape+label, never color alone
// (filled dot = good, half = weak via split view, ring = offline).
export function NetworkWeatherDot({ quality }: { quality: NetQuality }) {
  const { palette, mode } = useTheme();
  const color =
    quality === 'good' ? palette.good : quality === 'weak' ? palette.weak : palette.bad;
  if (quality === 'unknown') return null;
  return (
    <View
      accessibilityLabel={`Connection: ${qualityLabel[quality]}`}
      style={[
        styles.wrap,
        {
          backgroundColor: palette.bgSurface,
          borderColor: mode === 'dark' ? 'transparent' : palette.hairline ?? 'transparent',
        },
      ]}
    >
      {quality === 'weak' ? (
        <View style={styles.halfWrap}>
          <View style={[styles.halfLeft, { backgroundColor: color }]} />
          <View style={[styles.halfRight, { borderColor: color }]} />
        </View>
      ) : (
        <View
          style={[
            styles.dot,
            quality === 'good'
              ? { backgroundColor: color }
              : { borderWidth: 1.5, borderColor: color },
          ]}
        />
      )}
      <Text style={[styles.label, { color: palette.textSecondary }]} numberOfLines={1}>
        {qualityLabel[quality]}
      </Text>
    </View>
  );
}

const styles = StyleSheet.create({
  wrap: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 6,
    paddingHorizontal: 10,
    paddingVertical: 6,
    borderRadius: 20,
    borderWidth: 1,
    alignSelf: 'center',
  },
  dot: { width: 10, height: 10, borderRadius: 5 },
  halfWrap: { width: 10, height: 10, flexDirection: 'row' },
  halfLeft: { width: 5, height: 10, borderTopLeftRadius: 5, borderBottomLeftRadius: 5 },
  halfRight: {
    width: 5,
    height: 10,
    borderTopRightRadius: 5,
    borderBottomRightRadius: 5,
    borderWidth: 1.5,
    borderLeftWidth: 0,
  },
  label: { fontSize: typeScale.micro.size },
});
