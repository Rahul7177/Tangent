import React from 'react';
import { Pressable, ScrollView, StyleSheet, Switch, Text, View } from 'react-native';
import { SafeAreaView } from 'react-native-safe-area-context';
import { useTheme } from '../theme/ThemeContext';
import { spacing, typeScale } from '../theme/tokens';
import { useStore } from '../store/useStore';
import { AmbientBackground } from '../components/AmbientBackground';
import { glassEdge } from '../components/GlassView';
import { Icon } from '../components/icons';

// Settings: theme toggle (200ms cross-fade, no haptic), Lite Mode (PRD 8.7),
// privacy note, anti-slop lint reminder.
export function SettingsScreen({ navigation }: any) {
  const { palette, mode, toggle } = useTheme();
  const dark = mode === 'dark';
  const lite = useStore((s) => s.liteMode);
  const setLite = useStore((s) => s.setLiteMode);
  const me = useStore((s) => s.currentUser);
  const logout = useStore((s) => s.logout);


  return (
    <SafeAreaView edges={['top']} style={[styles.root, { backgroundColor: palette.bgBase }]}>
      <AmbientBackground>
      <ScrollView contentContainerStyle={styles.scroll} showsVerticalScrollIndicator={false}>
      <Text style={[styles.title, { color: palette.textPrimary }]}>Settings</Text>

      <Pressable
        onPress={() => navigation.navigate('Profile')}
        style={[styles.card, styles.profileRow, { backgroundColor: palette.bgSurface }, glassEdge(palette, dark)]}
      >
        <View style={[styles.avatar, { backgroundColor: palette.ember }]}>
          <Text style={[styles.avatarLetter, { color: palette.onAccent }]}>{me.name.slice(0, 1).toUpperCase()}</Text>
        </View>
        <View style={{ flex: 1 }}>
          <Text style={[styles.label, { color: palette.textPrimary }]}>{me.name}</Text>
          <Text style={[styles.desc, { color: palette.ember }]}>@{me.username}</Text>
        </View>
        <Icon name="forward" size={18} color={palette.textSecondary} />
      </Pressable>

      <View style={[styles.card, { backgroundColor: palette.bgSurface }, glassEdge(palette, dark)]}>
        <View style={styles.row}>
          <Text style={[styles.label, { color: palette.textPrimary }]}>Dark mode</Text>
          <Switch value={mode === 'dark'} onValueChange={toggle} />
        </View>
        <View style={styles.row}>
          <View style={{ flex: 1 }}>
            <Text style={[styles.label, { color: palette.textPrimary }]}>Lite Mode</Text>
            <Text style={[styles.desc, { color: palette.textSecondary }]}>
              Disables autoplay, caps media resolution, prioritizes text.
            </Text>
          </View>
          <Switch value={lite} onValueChange={setLite} />
        </View>
      </View>

      <Pressable
        onPress={() => void logout()}
        style={[styles.card, styles.logoutCard, { backgroundColor: palette.bgSurface }, glassEdge(palette, dark)]}
      >
        <Text style={[styles.logoutText, { color: palette.bad }]}>Log out</Text>
      </Pressable>

      <View style={[styles.card, { backgroundColor: palette.bgSurface }, glassEdge(palette, dark)]}>
        <Text style={[styles.label, { color: palette.textPrimary }]}>Privacy</Text>
        <Text style={[styles.desc, { color: palette.textSecondary }]}>
          Whisper items stay encrypted on-device (SQLCipher in Phase 2) and never alter the other
          side. No third-party analytics SDKs.
        </Text>
      </View>

      <Pressable>
        <Text style={[styles.lint, { color: palette.textSecondary }]}>
          Design lint: neutrals ≥90% · accent ≤10% · radius ≤24 · status
          never color-alone.
        </Text>
      </Pressable>
      </ScrollView>
      </AmbientBackground>
    </SafeAreaView>
  );
}

const styles = StyleSheet.create({
  root: { flex: 1 },
  scroll: { padding: spacing.lg, gap: spacing.md, flexGrow: 1, paddingBottom: 110 },
  profileRow: { flexDirection: 'row', alignItems: 'center' },
  avatar: { width: 48, height: 48, borderRadius: 24, alignItems: 'center', justifyContent: 'center' },
  avatarLetter: { fontWeight: '700', fontSize: 20 },
  title: { fontSize: 28, lineHeight: 34, fontWeight: '700', letterSpacing: -0.3 },
  sub: { fontSize: typeScale.caption.size },
  card: { borderRadius: 16, padding: spacing.lg, gap: spacing.md },
  row: { flexDirection: 'row', alignItems: 'center', justifyContent: 'space-between', gap: 12 },
  label: { fontSize: typeScale.body.size, fontWeight: '600' },
  desc: { fontSize: typeScale.caption.size, marginTop: 2 },
  lint: { fontSize: 11, lineHeight: 16 },
  logoutCard: { alignItems: 'center' },
  logoutText: { fontSize: typeScale.body.size, fontWeight: '700' },
});
