import React, { useEffect, useState } from 'react';
import {
  Alert,
  FlatList,
  Pressable,
  StyleSheet,
  Text,
  TextInput,
  View,
} from 'react-native';
import { SafeAreaView } from 'react-native-safe-area-context';
import { CameraView, useCameraPermissions } from 'expo-camera';
import * as Contacts from 'expo-contacts';
import { useTheme } from '../theme/ThemeContext';
import { radius, spacing, typeScale } from '../theme/tokens';
import { useStore } from '../store/useStore';
import { DirectoryUser, normalizePhone, usernameFromQrPayload } from '../lib/types';
import { AmbientBackground } from '../components/AmbientBackground';
import { IconButton } from '../components/icons';
import { TButton } from '../components/TButton';
import { glassEdge } from '../components/GlassView';

type Tab = 'phone' | 'username' | 'scan';

// Add people three ways: phone number (/ device contacts), unique username
// search, or scanning a profile QR. Every path creates a message *request* —
// nobody lands straight in your chats.
export function AddContactScreen({ navigation }: any) {
  const { palette, mode } = useTheme();
  const dark = mode === 'dark';
  const [tab, setTab] = useState<Tab>('username');

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
        <Text style={[styles.title, { color: palette.textPrimary }]}>Add people</Text>
        <View style={{ width: 38 }} />
      </View>
      <View style={[styles.tabs, { backgroundColor: palette.bgRaised }, glassEdge(palette, dark)]}>
        {(['phone', 'username', 'scan'] as Tab[]).map((t) => (
          <Pressable
            key={t}
            onPress={() => setTab(t)}
            style={[
              styles.tab,
              t === tab && { backgroundColor: palette.bgSurface },
            ]}
          >
            <Text
              style={[
                styles.tabText,
                { color: t === tab ? palette.textPrimary : palette.textSecondary },
              ]}
            >
              {t === 'phone' ? 'Phone' : t === 'username' ? 'Username' : 'Scan QR'}
            </Text>
          </Pressable>
        ))}
      </View>
      <Text style={[styles.intro, { color: palette.textSecondary }]}>Find someone you know. They will receive a request before either of you can start chatting.</Text>
      {tab === 'phone' ? (
        <PhonePane onOpenChat={(id) => navigation.navigate('Conversation', { chatId: id })} />
      ) : tab === 'username' ? (
        <UsernamePane onOpenChat={(id) => navigation.navigate('Conversation', { chatId: id })} />
      ) : (
        <ScanPane onOpenChat={(id) => navigation.navigate('Conversation', { chatId: id })} />
      )}
      </View>
      </AmbientBackground>
    </SafeAreaView>
  );
}

function inputStyle(palette: any, mode: string) {
  return {
    backgroundColor: palette.bgSurface,
    color: palette.textPrimary,
    borderColor: mode === 'dark' ? 'transparent' : palette.hairline ?? 'transparent',
  };
}

function UserRow({
  user,
  status,
  onAction,
}: {
  user: DirectoryUser;
  status: 'open' | 'pending' | 'new';
  onAction: () => void;
}) {
  const { palette, mode } = useTheme();
  const dark = mode === 'dark';
  return (
    <View style={[styles.row, { backgroundColor: palette.bgSurface }, glassEdge(palette, dark)]}>
      <View style={[styles.avatar, { backgroundColor: palette.bgRaised }]}>
        <Text style={{ color: palette.textPrimary, fontWeight: '700' }}>
          {user.name.slice(0, 1)}
        </Text>
      </View>
      <View style={{ flex: 1 }}>
        <Text style={[styles.name, { color: palette.textPrimary }]}>{user.name}</Text>
        <Text style={[styles.sub, { color: palette.ember }]}>@{user.username}</Text>
      </View>
      <Pressable
        onPress={onAction}
        style={[
          styles.action,
          status === 'new' && { backgroundColor: palette.ember },
          status !== 'new' && { borderWidth: 1, borderColor: palette.textPrimary },
        ]}
      >
        <Text
          style={[
            styles.actionText,
            { color: status === 'new' ? palette.onAccent : palette.textPrimary },
          ]}
        >
          {status === 'open' ? 'Open' : status === 'pending' ? 'Pending' : 'Request'}
        </Text>
      </Pressable>
    </View>
  );
}

function useChatStatus() {
  const chats = useStore((s) => s.chats);
  const requestChat = useStore((s) => s.requestChatWithUser);
  return {
    statusFor: (user: DirectoryUser): 'open' | 'pending' | 'new' => {
      const c = chats.find((x) => !x.isGroup && x.username === user.username);
      if (!c) return 'new';
      if (c.requestStatus === 'active' || !c.requestStatus) return 'open';
      return 'pending';
    },
    openOrRequest: (user: DirectoryUser, onOpenChat: (id: string) => void) => {
      const c = chats.find((x) => !x.isGroup && x.username === user.username);
      if (c) {
        onOpenChat(c.id);
        return;
      }
      const id = requestChat(user.id);
      if (id) onOpenChat(id);
    },
  };
}

function PhonePane({ onOpenChat }: { onOpenChat: (id: string) => void }) {
  const { palette, mode } = useTheme();
  const dark = mode === 'dark';
  const findByPhone = useStore((s) => s.findUserByPhone);
  const [phone, setPhone] = useState('');
  interface DeviceContact {
    id?: string;
    name?: string;
    phoneNumbers?: { number?: string }[];
  }
  const [deviceContacts, setDeviceContacts] = useState<DeviceContact[]>([]);
  const [denied, setDenied] = useState(false);
  const { statusFor, openOrRequest } = useChatStatus();

  const loadDeviceContacts = async () => {
    try {
      const { status } = await Contacts.requestPermissionsAsync();
      if (status !== 'granted') {
        setDenied(true);
        return;
      }
      const { data } = await Contacts.getContactsAsync({
        fields: [Contacts.Fields.Name, Contacts.Fields.PhoneNumbers],
        pageSize: 200,
      });
      const list = (data as unknown as DeviceContact[])
        .filter((c) => (c.phoneNumbers?.length ?? 0) > 0)
        .slice(0, 50);
      setDeviceContacts(list);
    } catch {
      setDenied(true);
    }
  };

  const lookup = () => {
    const found = findByPhone(normalizePhone(phone));
    if (!found) {
      Alert.alert('Not on Tangent', 'No account matches that number yet. Invite them instead.');
      return;
    }
    openOrRequest(found, onOpenChat);
  };

  return (
    <View style={{ flex: 1, gap: spacing.md }}>
      <TextInput
        value={phone}
        onChangeText={setPhone}
        placeholder="Phone number, e.g. +91…"
        keyboardType="phone-pad"
        placeholderTextColor={palette.textSecondary}
        style={[styles.input, inputStyle(palette, mode)]}
      />
      <TButton title="Look up number" onPress={lookup} />
      <Pressable onPress={loadDeviceContacts}>
        <Text style={[styles.link, { color: palette.ember }]}>Or pick from my contacts</Text>
      </Pressable>
      {denied ? (
        <Text style={[styles.sub, { color: palette.textSecondary }]}>
          Contacts permission denied — type the number instead.
        </Text>
      ) : null}
      <FlatList
        data={deviceContacts}
        keyExtractor={(c) => c.id ?? c.name ?? Math.random().toString()}
        contentContainerStyle={{ gap: 8 }}
        showsVerticalScrollIndicator
        renderItem={({ item }) => {
          const num = item.phoneNumbers?.[0]?.number ?? '';
          const match = findByPhone(normalizePhone(num));
          return (
            <View style={[styles.row, { backgroundColor: palette.bgSurface }, glassEdge(palette, dark)]}>
              <View style={{ flex: 1 }}>
                <Text style={[styles.name, { color: palette.textPrimary }]}>{item.name}</Text>
                <Text style={[styles.sub, { color: palette.textSecondary }]}>{num}</Text>
              </View>
              {match ? (
                <Pressable
                  onPress={() => openOrRequest(match, onOpenChat)}
                  style={[styles.action, { backgroundColor: palette.ember }]}
                >
                  <Text style={[styles.actionText, { color: palette.onAccent }]}>
                    {statusFor(match) === 'open'
                      ? 'Open'
                      : statusFor(match) === 'pending'
                        ? 'Pending'
                        : 'Request'}
                  </Text>
                </Pressable>
              ) : (
                <Text style={[styles.sub, { color: palette.textSecondary }]}>Not on Tangent</Text>
              )}
            </View>
          );
        }}
      />
    </View>
  );
}

function UsernamePane({ onOpenChat }: { onOpenChat: (id: string) => void }) {
  const { palette, mode } = useTheme();
  const search = useStore((s) => s.searchDirectory);
  const me = useStore((s) => s.currentUser);
  const [q, setQ] = useState('');
  const results = search(q);
  const { statusFor, openOrRequest } = useChatStatus();

  return (
    <View style={{ flex: 1, gap: spacing.md }}>
      <TextInput
        value={q}
        onChangeText={setQ}
        placeholder="Search username or name…"
        autoCapitalize="none"
        autoCorrect={false}
        placeholderTextColor={palette.textSecondary}
        style={[styles.input, inputStyle(palette, mode)]}
      />
      <Text style={[styles.sub, { color: palette.textSecondary }]}>
        Your username is @{me.username} — share it or your QR so people find you.
      </Text>
      <FlatList
        data={results}
        keyExtractor={(u) => u.id}
        contentContainerStyle={{ gap: 8 }}
        showsVerticalScrollIndicator
        ListEmptyComponent={
          q.trim().length >= 2 ? (
            <Text style={[styles.sub, { color: palette.textSecondary }]}>
              No one matches “{q.trim()}”.
            </Text>
          ) : null
        }
        renderItem={({ item }) => (
          <UserRow
            user={item}
            status={statusFor(item)}
            onAction={() => openOrRequest(item, onOpenChat)}
          />
        )}
      />
    </View>
  );
}

function ScanPane({ onOpenChat }: { onOpenChat: (id: string) => void }) {
  const { palette } = useTheme();
  const findByUsername = useStore((s) => s.findUserByUsername);
  const [permission, requestPermission] = useCameraPermissions();
  const [scanned, setScanned] = useState<DirectoryUser | null>(null);
  const [unknown, setUnknown] = useState('');
  const { statusFor, openOrRequest } = useChatStatus();

  useEffect(() => {
    if (!permission?.granted) requestPermission();
  }, [permission?.granted, requestPermission]);

  if (!permission?.granted) {
    return (
      <View style={{ gap: spacing.md }}>
        <Text style={[styles.sub, { color: palette.textSecondary }]}>
          Camera access is needed to scan a profile QR.
        </Text>
        <TButton title="Allow camera" onPress={requestPermission} />
      </View>
    );
  }

  return (
    <View style={{ flex: 1, gap: spacing.md }}>
      <View style={styles.scanner}>
        <CameraView
          style={StyleSheet.absoluteFill}
          facing="back"
          barcodeScannerSettings={{ barcodeTypes: ['qr'] }}
          onBarcodeScanned={({ data }) => {
            const uname = usernameFromQrPayload(data);
            if (!uname) {
              setUnknown('That QR is not a Tangent profile code.');
              return;
            }
            const found = findByUsername(uname);
            if (!found) {
              setUnknown(`@${uname} is not on Tangent yet.`);
              return;
            }
            setUnknown('');
            setScanned(found);
          }}
        />
        <View style={styles.scanFrame} />
      </View>
      {unknown ? <Text style={[styles.sub, { color: palette.bad }]}>{unknown}</Text> : null}
      {scanned ? (
        <UserRow
          user={scanned}
          status={statusFor(scanned)}
          onAction={() => openOrRequest(scanned, onOpenChat)}
        />
      ) : (
        <Text style={[styles.sub, { color: palette.textSecondary }]}>
          Point the camera at a profile QR to add them.
        </Text>
      )}
    </View>
  );
}

const styles = StyleSheet.create({
  safe: { flex: 1 },
  root: { flex: 1, padding: spacing.lg, gap: spacing.md },
  topRow: { flexDirection: 'row', alignItems: 'center', justifyContent: 'space-between' },
  title: { fontSize: typeScale.heading.size, fontWeight: '700' },
  intro: { fontSize: typeScale.caption.size, lineHeight: 20, marginHorizontal: spacing.lg, marginBottom: spacing.sm },
  tabs: { flexDirection: 'row', borderRadius: radius.button, padding: 4, gap: 4 },
  tab: { flex: 1, borderRadius: 8, paddingVertical: 10, alignItems: 'center' },
  tabText: { fontSize: typeScale.caption.size, fontWeight: '700' },
  input: {
    borderRadius: radius.button,
    borderWidth: 1,
    paddingHorizontal: spacing.md,
    paddingVertical: spacing.md,
    fontSize: typeScale.body.size,
  },
  link: { fontSize: typeScale.body.size, fontWeight: '600' },
  row: { borderRadius: 16, padding: spacing.md, flexDirection: 'row', gap: spacing.md, alignItems: 'center' },
  avatar: { width: 44, height: 44, borderRadius: 22, alignItems: 'center', justifyContent: 'center' },
  name: { fontSize: typeScale.body.size, fontWeight: '700' },
  sub: { fontSize: typeScale.caption.size },
  action: { borderRadius: 18, paddingHorizontal: 16, height: 36, alignItems: 'center', justifyContent: 'center' },
  actionText: { fontSize: 14, fontWeight: '700' },
  scanner: { height: 280, borderRadius: 16, overflow: 'hidden', position: 'relative' },
  scanFrame: {
    position: 'absolute',
    top: 40,
    left: 40,
    right: 40,
    bottom: 40,
    borderWidth: 2,
    borderColor: '#fff',
    borderRadius: 12,
    opacity: 0.9,
  },
});
