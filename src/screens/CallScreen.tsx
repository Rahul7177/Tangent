import React from 'react';
import { Pressable, StyleSheet, Text, View } from 'react-native';
import { SafeAreaView } from 'react-native-safe-area-context';
import { useTheme } from '../theme/ThemeContext';
import { spacing, typeScale } from '../theme/tokens';
import { AmbientBackground } from '../components/AmbientBackground';
import { NetworkWeatherDot } from '../components/NetworkWeatherDot';
import { useNetworkWeather } from '../lib/networkWeather';
import { TButton } from '../components/TButton';

// In-call UI: ringing → in-call cross-fade (250ms), quality fades in ~1s later.
export function CallScreen({ route, navigation }: any) {
  const { name, video } = route.params as { name: string; video: boolean };
  const { palette } = useTheme();
  const quality = useNetworkWeather();
  return (
    <SafeAreaView edges={['top', 'bottom']} style={[styles.safe, { backgroundColor: palette.bgBase }]}>
      <AmbientBackground>
      <View style={styles.root}>
      <NetworkWeatherDot quality={quality} />
      <View style={[styles.avatar, { backgroundColor: palette.bgRaised }]}>
        <Text style={[styles.letter, { color: palette.textPrimary }]}>{name.slice(0, 1)}</Text>
      </View>
      <Text style={[styles.name, { color: palette.textPrimary }]}>{name}</Text>
      <Text style={[styles.mode, { color: palette.textSecondary }]}>
        {video ? 'Video — will fall back to audio if unsustainable' : 'Audio (Opus DTX + FEC)'}
      </Text>
      <Text style={[styles.mono, { color: palette.textSecondary }]}>
        00:42 · opus/48000 · {video ? 'vp8/simulcast' : 'audio-only'}
      </Text>
      <View style={styles.row}>
        <TButton title="End" variant="ghost" onPress={() => navigation.goBack()} />
      </View>
      <Pressable onPress={() => navigation.goBack()}>
        <Text style={[styles.back, { color: palette.textSecondary }]}>Back to chats</Text>
      </Pressable>
      </View>
      </AmbientBackground>
    </SafeAreaView>
  );
}

const styles = StyleSheet.create({
  safe: { flex: 1 },
  root: { flex: 1, alignItems: 'center', justifyContent: 'center', gap: spacing.md, padding: spacing.lg },
  avatar: { width: 96, height: 96, borderRadius: 48, alignItems: 'center', justifyContent: 'center' },
  letter: { fontSize: 40, fontWeight: '600' },
  name: { fontSize: typeScale.title.size, fontWeight: '600' },
  mode: { fontSize: typeScale.caption.size, textAlign: 'center' },
  mono: { fontSize: 12 },
  row: { flexDirection: 'row', gap: 12, marginTop: 8 },
  back: { fontSize: typeScale.caption.size, marginTop: 12 },
});
