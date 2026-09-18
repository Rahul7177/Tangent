import React, { useMemo, useState } from 'react';
import { FlatList, Pressable, StyleSheet, Text, TextInput, View } from 'react-native';
import { SafeAreaView } from 'react-native-safe-area-context';
import { useTheme } from '../theme/ThemeContext';
import { radius, spacing, typeScale } from '../theme/tokens';
import { useStore, visibleMessages } from '../store/useStore';
import { NetworkWeatherDot } from '../components/NetworkWeatherDot';
import { AmbientBackground } from '../components/AmbientBackground';
import { Ticks, formatTime } from '../components/Ticks';
import { IconButton } from '../components/icons';
import { useNetworkWeather } from '../lib/networkWeather';

// Chat list: static rows use background-color step only (no border/shadow).
// Unread badge is Ember — the one accent per screen.
export function ChatListScreen({ navigation }: any) {
  const { palette, mode } = useTheme();
  const chats = useStore((s) => s.chats);
  const messages = useStore((s) => s.messages);
  const whisperUnlocked = useStore((s) => s.whisperUnlocked);
  const [q, setQ] = useState('');
  const quality = useNetworkWeather();

  const previews = useMemo(() => {
    return chats
      .map((c) => {
        const msgs = visibleMessages(
          messages.filter((m) => m.chatId === c.id),
          !!whisperUnlocked[c.id],
        );
        const last = msgs[msgs.length - 1];
        return { chat: c, last };
      })
      .filter(({ chat, last }) => {
        if (!q.trim()) return true;
        const needle = q.toLowerCase();
        return (
          chat.name.toLowerCase().includes(needle) ||
          (last?.text.toLowerCase().includes(needle) ?? false)
        );
      });
  }, [chats, messages, whisperUnlocked, q]);

  const requests = previews.filter((p) => !p.chat.isGroup && p.chat.requestStatus === 'pending-received');
  const conversations = previews.filter(
    (p) => p.chat.isGroup || (p.chat.requestStatus ?? 'active') !== 'pending-received',
  );
  const me = useStore((s) => s.currentUser);

  return (
    <SafeAreaView edges={['top']} style={[styles.root, { backgroundColor: palette.bgBase }]}>
      <AmbientBackground>
      <View style={styles.header}>
        <View style={styles.titleRow}>
          <Text style={[styles.title, { color: palette.textPrimary }]}>Chats</Text>
          <View style={styles.headerActions}>
            <IconButton
              name="plus"
              label="Add people"
              size={38}
              iconSize={22}
              color={palette.textPrimary}
              backgroundColor={palette.bgSurface}
              onPress={() => navigation.navigate('AddContact')}
            />
            <Pressable
              onPress={() => navigation.navigate('Profile')}
              accessibilityLabel="My profile"
              style={[styles.meAvatar, { backgroundColor: palette.ember }]}
            >
              <Text style={[styles.meLetter, { color: palette.onAccent }]}>
                {me.name.slice(0, 1).toUpperCase()}
              </Text>
            </Pressable>
          </View>
        </View>
        <NetworkWeatherDot quality={quality} />
      </View>
      <TextInput
        value={q}
        onChangeText={setQ}
        placeholder="Search chats"
        placeholderTextColor={palette.textSecondary}
        style={[
          styles.search,
          {
            backgroundColor: palette.bgSurface,
            color: palette.textPrimary,
            borderColor: mode === 'dark' ? 'transparent' : palette.hairline ?? 'transparent',
          },
        ]}
      />
      <FlatList
        data={conversations}
        keyExtractor={(x) => x.chat.id}
        contentContainerStyle={{ padding: spacing.md, gap: spacing.sm, paddingBottom: 100 }}
        ListHeaderComponent={
          requests.length > 0 ? (
            <View style={{ gap: 8, marginBottom: 8 }}>
              <Text style={[styles.section, { color: palette.textSecondary }]}>
                Message requests ({requests.length})
              </Text>
              {requests.map(({ chat, last }) => (
                <Pressable
                  key={chat.id}
                  onPress={() => navigation.navigate('Conversation', { chatId: chat.id })}
                  style={[styles.row, { backgroundColor: palette.bgSurface }]}
                >
                  <View style={[styles.avatar, { backgroundColor: palette.bgRaised }]}>
                    <Text style={{ color: palette.textPrimary, fontWeight: '600' }}>
                      {chat.name.slice(0, 1)}
                    </Text>
                  </View>
                  <View style={styles.mid}>
                    <Text style={[styles.name, { color: palette.textPrimary }]}>{chat.name}</Text>
                    <Text style={[styles.preview, { color: palette.textSecondary }]} numberOfLines={1}>
                      {last ? last.text : 'Wants to message you'}
                    </Text>
                  </View>
                  <View style={[styles.reqBadge, { backgroundColor: palette.ember }]}>
                    <Text style={[styles.badgeText, { color: palette.onAccent }]}>New</Text>
                  </View>
                </Pressable>
              ))}
            </View>
          ) : null
        }
        renderItem={({ item }) => (
            <Pressable
              onPress={() => navigation.navigate('Conversation', { chatId: item.chat.id })}
              style={[styles.row, { backgroundColor: palette.bgSurface }]}
            >
            <View style={[styles.avatar, { backgroundColor: palette.bgRaised }]}>
              <Text style={{ color: palette.textPrimary, fontWeight: '600' }}>
                {item.chat.name.slice(0, 1)}
              </Text>
            </View>
            <View style={styles.mid}>
              <Text style={[styles.name, { color: palette.textPrimary }]}>{item.chat.name}</Text>
              <View style={styles.previewRow}>
                {item.last?.mine ? <Ticks receipt={item.last.receipt} /> : null}
                <Text
                  style={[styles.preview, { color: palette.textSecondary }]}
                  numberOfLines={1}
                >
                  {item.last ? item.last.text : 'No messages yet'}
                </Text>
              </View>
            </View>
            <View style={styles.right}>
              {item.chat.requestStatus === 'pending-sent' ? (
                <Text style={[styles.time, { color: palette.textSecondary }]}>Pending</Text>
              ) : (
                <>
                  {item.last ? (
                    <Text style={[styles.time, { color: item.chat.unread > 0 ? palette.ember : palette.textSecondary }]}>
                      {formatTime(item.last.createdAt)}
                    </Text>
                  ) : null}
                  {item.chat.unread > 0 ? (
                    <View style={[styles.badge, { backgroundColor: palette.ember }]}>
                      <Text style={[styles.badgeText, { color: palette.onAccent }]}>{item.chat.unread}</Text>
                    </View>
                  ) : null}
                </>
              )}
            </View>
          </Pressable>
        )}
        showsVerticalScrollIndicator
        persistentScrollbar
        keyboardShouldPersistTaps="handled"
      />
      </AmbientBackground>
    </SafeAreaView>
  );
}

const styles = StyleSheet.create({
  root: { flex: 1 },
  header: { padding: spacing.lg, paddingBottom: spacing.sm, gap: spacing.sm },
  titleRow: { flexDirection: 'row', alignItems: 'center', justifyContent: 'space-between' },
  headerActions: { flexDirection: 'row', alignItems: 'center', gap: 8 },
  meAvatar: { width: 38, height: 38, borderRadius: 19, alignItems: 'center', justifyContent: 'center' },
  meLetter: { fontWeight: '700', fontSize: 16 },
  section: { fontSize: typeScale.caption.size, fontWeight: '700' },
  reqBadge: { borderRadius: 11, paddingHorizontal: 10, height: 22, alignItems: 'center', justifyContent: 'center' },
  title: { fontSize: typeScale.title.size, lineHeight: typeScale.title.lineHeight, fontWeight: '600' },
  search: {
    marginHorizontal: spacing.lg,
    borderRadius: radius.button,
    borderWidth: 1,
    paddingHorizontal: spacing.md,
    paddingVertical: 10,
    fontSize: typeScale.body.size,
  },
  row: { borderRadius: radius.bubble, padding: spacing.md, flexDirection: 'row', gap: spacing.md, alignItems: 'center' },
  avatar: { width: 44, height: 44, borderRadius: 22, alignItems: 'center', justifyContent: 'center' },
  mid: { flex: 1, gap: 2 },
  name: { fontSize: typeScale.body.size, fontWeight: '600' },
  previewRow: { flexDirection: 'row', alignItems: 'center', gap: 4 },
  preview: { fontSize: typeScale.caption.size, flex: 1 },
  right: { alignItems: 'flex-end', gap: 4 },
  time: { fontSize: 11 },
  badge: { minWidth: 22, height: 22, borderRadius: 11, alignItems: 'center', justifyContent: 'center', paddingHorizontal: 6 },
  badgeText: { fontSize: 12, fontWeight: '700' },
});
