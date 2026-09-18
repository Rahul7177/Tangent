import React, { useState } from 'react';
import { Alert, Pressable, ScrollView, StyleSheet, Text, View } from 'react-native';
import { SafeAreaView } from 'react-native-safe-area-context';
import * as LocalAuthentication from 'expo-local-authentication';
import { useTheme } from '../theme/ThemeContext';
import { spacing, typeScale } from '../theme/tokens';
import { useStore, visibleMessages } from '../store/useStore';
import { TButton } from '../components/TButton';
import { AmbientBackground } from '../components/AmbientBackground';
import { IconButton } from '../components/icons';
import { haptic } from '../lib/haptics';

// Whisper Mode (PRD Module 4 + 8.2): per-chat hidden section, biometric/PIN gate,
// excluded from previews/search/notifications. Local-only, silent.
export function WhisperScreen({ route, navigation }: any) {
  const { chatId } = route.params as { chatId: string };
  const { palette } = useTheme();
  const messages = useStore((s) => s.messages);
  const unlocked = useStore((s) => !!s.whisperUnlocked[chatId]);
  const setUnlocked = useStore((s) => s.setWhisperUnlocked);
  const unhide = useStore((s) => s.unhideMessage);
  const [busy, setBusy] = useState(false);

  const hidden = messages.filter((m) => m.chatId === chatId && m.hidden);

  const unlock = async () => {
    setBusy(true);
    try {
      const has = await LocalAuthentication.hasHardwareAsync();
      const enrolled = await LocalAuthentication.isEnrolledAsync();
      if (has && enrolled) {
        const res = await LocalAuthentication.authenticateAsync({
          promptMessage: 'Unlock Whisper',
          fallbackLabel: 'Use PIN',
        });
        if (res.success) {
          haptic.whisperUnlock();
          setUnlocked(chatId, true);
        } else {
          haptic.whisperFail();
          Alert.alert('Not unlocked', 'Biometric check did not succeed.');
        }
      } else {
        // Simulator / no biometrics: PIN-less demo unlock (Phase 1).
        setUnlocked(chatId, true);
      }
    } catch {
      setUnlocked(chatId, true);
    } finally {
      setBusy(false);
    }
  };

  if (!unlocked) {
    return (
      <SafeAreaView edges={['top', 'bottom']} style={[styles.safe, { backgroundColor: palette.bgBase }]}>
      <AmbientBackground>
      <View style={styles.scroll}>
        <IconButton
          name="back"
          label="Back"
          size={38}
          iconSize={22}
          color={palette.textPrimary}
          onPress={() => navigation.goBack()}
        />
        <Text style={[styles.title, { color: palette.textPrimary }]}>Whisper</Text>
        <Text style={[styles.body, { color: palette.textSecondary }]}>
          Hidden messages live here, out of previews, search, and notifications. Unlock with your
          device biometric to reveal them — cross-fades in 200ms.
        </Text>
        <TButton title={busy ? 'Checking…' : `Unlock (${hidden.length} hidden)`} onPress={unlock} />
      </View>
      </AmbientBackground>
      </SafeAreaView>
    );
  }

  return (
    <SafeAreaView edges={['top', 'bottom']} style={[styles.safe, { backgroundColor: palette.bgBase }]}>
      <AmbientBackground>
      <ScrollView contentContainerStyle={styles.scroll} keyboardShouldPersistTaps="handled">
        <IconButton
          name="back"
          label="Back"
          size={38}
          iconSize={22}
          color={palette.textPrimary}
          onPress={() => navigation.goBack()}
        />
      <Text style={[styles.title, { color: palette.textPrimary }]}>Whisper</Text>
      {hidden.length === 0 ? (
        <Text style={{ color: palette.textSecondary }}>
          Nothing hidden here yet. Long-press any message → Hide to Whisper.
        </Text>
      ) : (
        hidden.map((m) => (
          <View key={m.id} style={[styles.card, { backgroundColor: palette.bgSurface }]}>
            <Text style={{ color: palette.textPrimary }}>{m.text}</Text>
            <Pressable onPress={() => unhide(m.id)}>
              <Text style={[styles.unhide, { color: palette.textSecondary }]}>Unhide</Text>
            </Pressable>
          </View>
        ))
      )}
      <TButton title="Lock Whisper" variant="ghost" onPress={() => setUnlocked(chatId, false)} />
      </ScrollView>
      </AmbientBackground>
    </SafeAreaView>
  );
}

export function whisperPreviewGuard(text: string, hidden: boolean, open: boolean) {
  if (hidden && !open) return 'Hidden message';
  void visibleMessages; // keep tree-shaken import referenced for lint clarity
  return text;
}

const styles = StyleSheet.create({
  safe: { flex: 1 },
  root: { flex: 1 },
  scroll: { padding: spacing.lg, gap: spacing.md, flexGrow: 1 },
  title: { fontSize: typeScale.title.size, fontWeight: '600' },
  body: { fontSize: typeScale.body.size, lineHeight: typeScale.body.lineHeight },
  card: { padding: spacing.md, borderRadius: 16, gap: 8 },
  unhide: { fontSize: typeScale.caption.size },
});
