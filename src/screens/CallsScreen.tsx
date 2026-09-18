import React, { useState } from 'react';
import { Pressable, ScrollView, StyleSheet, Text, View } from 'react-native';
import { SafeAreaView } from 'react-native-safe-area-context';
import { LinearGradient } from 'expo-linear-gradient';
import { useTheme } from '../theme/ThemeContext';
import { gradients, spacing, typeScale } from '../theme/tokens';
import { AmbientBackground } from '../components/AmbientBackground';
import { NetworkWeatherDot } from '../components/NetworkWeatherDot';
import { useNetworkWeather } from '../lib/networkWeather';
import { TButton } from '../components/TButton';
import { haptic } from '../lib/haptics';

// Calls (PRD Module 2 stub): avatar-centric, minimal chrome.
// Network Weather sits quietly near top. Audio-only fallback banner pattern.
export function CallsScreen({ navigation }: any) {
  const { palette, mode } = useTheme();
  const quality = useNetworkWeather();
  const [simulated, setSimulated] = useState<string | null>(null);
  const pg = gradients[mode].primary;

  return (
    <SafeAreaView edges={['top']} style={[styles.root, { backgroundColor: palette.bgBase }]}>
      <AmbientBackground>
      <ScrollView contentContainerStyle={styles.scroll} showsVerticalScrollIndicator={false}>
      <Text style={[styles.title, { color: palette.textPrimary }]}>Calls</Text>
      <NetworkWeatherDot quality={quality} />
      <View style={[styles.card, { backgroundColor: palette.bgSurface }]}>
        <LinearGradient
          colors={[pg[0], pg[1]]}
          start={{ x: 0, y: 0 }}
          end={{ x: 1, y: 1 }}
          style={styles.avatar}
        >
          <Text style={[styles.avatarText, { color: palette.onAccent }]}>A</Text>
        </LinearGradient>
        <Text style={[styles.name, { color: palette.textPrimary }]}>Anya</Text>
        <Text style={[styles.sub, { color: palette.textSecondary }]}>
          Opus + WebRTC adaptive bitrate (LiveKit SFU for groups in Phase 4)
        </Text>
        <TButton
          title="Start audio call"
          onPress={() => {
            haptic.callConnect();
            navigation.navigate('Call', { name: 'Anya', video: false });
          }}
        />
        <TButton
          title="Start video call"
          variant="ghost"
          onPress={() => {
            haptic.callConnect();
            navigation.navigate('Call', { name: 'Anya', video: true });
          }}
        />
      </View>
      <Pressable onPress={() => setSimulated(simulated ? null : 'weak')}>
        <Text style={[styles.sim, { color: palette.textSecondary }]}>
          {simulated ? 'Stop simulating poor network' : 'Simulate poor network (demo fallback banner)'}
        </Text>
      </Pressable>
      {simulated ? (
        <View style={[styles.banner, { backgroundColor: palette.bgRaised }]}>
          <View style={styles.bannerDot}>
            <View style={[styles.bannerHalf, { backgroundColor: palette.weak }]} />
          </View>
          <Text style={[styles.bannerText, { color: palette.textPrimary }]}>
            Low signal — switched to audio only
          </Text>
        </View>
      ) : null}
      </ScrollView>
      </AmbientBackground>
    </SafeAreaView>
  );
}

const styles = StyleSheet.create({
  root: { flex: 1 },
  scroll: { padding: spacing.lg, gap: spacing.md, flexGrow: 1, paddingBottom: 110 },
  title: { fontSize: typeScale.title.size, fontWeight: '600' },
  card: { borderRadius: 16, padding: spacing.lg, gap: spacing.md, alignItems: 'center' },
  avatar: { width: 72, height: 72, borderRadius: 36, alignItems: 'center', justifyContent: 'center' },
  avatarText: { fontSize: 28, fontWeight: '600' },
  name: { fontSize: typeScale.heading.size, fontWeight: '600' },
  sub: { fontSize: typeScale.caption.size, textAlign: 'center' },
  sim: { fontSize: typeScale.caption.size, textAlign: 'center' },
  banner: { borderRadius: 10, padding: spacing.md, flexDirection: 'row', alignItems: 'center', gap: 8 },
  bannerDot: { width: 22, height: 22, alignItems: 'center', justifyContent: 'center' },
  bannerHalf: { width: 10, height: 10, borderRadius: 5 },
  bannerText: { fontSize: typeScale.caption.size, textAlign: 'center' },
});
