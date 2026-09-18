import React from 'react';
import { Pressable, StyleSheet, Text, View } from 'react-native';
import { SafeAreaView } from 'react-native-safe-area-context';
import * as Clipboard from 'expo-clipboard';
import QRCode from 'react-native-qrcode-svg';
import { useTheme } from '../theme/ThemeContext';
import { spacing, typeScale } from '../theme/tokens';
import { useStore } from '../store/useStore';
import { qrPayloadFor } from '../lib/types';
import { AmbientBackground } from '../components/AmbientBackground';
import { glassEdge } from '../components/GlassView';
import { IconButton } from '../components/icons';
import { TButton } from '../components/TButton';

// Your public card: name, @username, phone + a QR that encodes
// `tangent://add/<username>` for instant adds.
export function ProfileScreen({ navigation }: any) {
  const { palette, mode } = useTheme();
  const dark = mode === 'dark';
  const me = useStore((s) => s.currentUser);
  const logout = useStore((s) => s.logout);


  return (
    <SafeAreaView edges={['top', 'bottom']} style={[styles.safe, { backgroundColor: palette.bgBase }]}>
      <AmbientBackground>
      <View style={styles.root}>
      <View style={styles.topRow}>
        <IconButton
          name="back"
          label="Back"
          size={38}
          iconSize={22}
          color={palette.textPrimary}
          onPress={() => navigation.goBack()}
        />
        <Text style={[styles.title, { color: palette.textPrimary }]}>Profile</Text>
        <View style={{ width: 38 }} />
      </View>
      <View style={[styles.card, { backgroundColor: palette.bgSurface }, glassEdge(palette, dark)]}>
        <View style={[styles.avatar, { backgroundColor: palette.bgRaised }]}>
          <Text style={[styles.letter, { color: palette.textPrimary }]}>
            {me.name.slice(0, 1).toUpperCase()}
          </Text>
        </View>
        <Text style={[styles.name, { color: palette.textPrimary }]}>{me.name}</Text>
        <Text style={[styles.username, { color: palette.ember }]}>@{me.username}</Text>
        {me.phone ? (
          <Text style={[styles.phone, { color: palette.textSecondary }]}>{me.phone}</Text>
        ) : null}
        <Pressable onPress={() => Clipboard.setStringAsync(`@${me.username}`)}>
          <Text style={[styles.copy, { color: palette.textSecondary }]}>Tap @username to copy</Text>
        </Pressable>
      </View>
      <View style={[styles.card, { backgroundColor: palette.bgSurface, alignItems: 'center' }, glassEdge(palette, dark)]}>
        <Text style={[styles.qrTitle, { color: palette.textPrimary }]}>My QR</Text>
        <Text style={[styles.qrSub, { color: palette.textSecondary }]}>
          Friends scan this to send you a message request
        </Text>
        {/* Opaque white tile keeps the code scannable over the mesh background */}
        <View style={{ backgroundColor: '#FFFFFF', borderRadius: 16, padding: 14 }}>
          <QRCode
            value={qrPayloadFor(me.username || 'you')}
            size={200}
            color="#0B1C2E"
            backgroundColor="#FFFFFF"
          />
        </View>
      </View>
      <TButton title="Add people" onPress={() => navigation.navigate('AddContact')} />
      <TButton title="Log out" variant="ghost" onPress={() => void logout()} />
      </View>
      </AmbientBackground>
    </SafeAreaView>
  );
}

const styles = StyleSheet.create({
  safe: { flex: 1 },
  root: { flex: 1, padding: spacing.lg, gap: spacing.md },
  topRow: { flexDirection: 'row', alignItems: 'center', justifyContent: 'space-between' },
  title: { fontSize: typeScale.heading.size, fontWeight: '700' },
  card: { borderRadius: 16, padding: spacing.lg, gap: 6, alignItems: 'center' },
  avatar: { width: 72, height: 72, borderRadius: 36, alignItems: 'center', justifyContent: 'center' },
  letter: { fontSize: 30, fontWeight: '700' },
  name: { fontSize: typeScale.heading.size, fontWeight: '700' },
  username: { fontSize: typeScale.body.size, fontWeight: '600' },
  phone: { fontSize: typeScale.caption.size },
  copy: { fontSize: typeScale.caption.size },
  qrTitle: { fontSize: typeScale.body.size, fontWeight: '700' },
  qrSub: { fontSize: typeScale.caption.size, textAlign: 'center', marginBottom: 8 },
});
