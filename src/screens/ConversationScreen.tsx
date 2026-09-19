import React, { useEffect, useMemo, useRef, useState } from 'react';
import {
  Alert,
  FlatList,
  Keyboard,
  KeyboardAvoidingView,
  Modal,
  Platform,
  Pressable,
  Share,
  StyleSheet,
  Text,
  TextInput,
  View,
} from 'react-native';
import { SafeAreaView } from 'react-native-safe-area-context';
import * as Clipboard from 'expo-clipboard';
import { BlurView } from 'expo-blur';
import { useTheme } from '../theme/ThemeContext';
import { spacing, typeScale } from '../theme/tokens';
import { useStore, visibleMessages } from '../store/useStore';
import { ChatBubble } from '../components/ChatBubble';
import { TypingDots } from '../components/TypingDots';
import { GlassView, glassEdge } from '../components/GlassView';
import { AmbientBackground } from '../components/AmbientBackground';
import { Icon, IconButton, IconName, IconSlot } from '../components/icons';
import { haptic } from '../lib/haptics';

const QUICK_EMOJI = ['❤️', '😂', '😮', '😢', '🙏', '👏'];

// WhatsApp-style conversation, top-down chronological list:
// - SafeArea top+bottom so nothing hides under status bar / system nav
// - KeyboardAvoidingView (padding iOS / height Android + resize mode) lifts composer
// - Non-inverted list anchored at top; empty state starts at top, grows down
export function ConversationScreen({ route, navigation }: any) {
  const { chatId } = route.params as { chatId: string };
  const { palette, mode } = useTheme();
  const dark = mode === 'dark';
  const chats = useStore((s) => s.chats);
  const all = useStore((s) => s.messages);
  const send = useStore((s) => s.sendMessage);
  const editMsg = useStore((s) => s.editMessage);
  const deleteMsg = useStore((s) => s.deleteMessage);
  const deleteEveryone = useStore((s) => s.deleteMessageForEveryone);
  const toggleStar = useStore((s) => s.toggleStarMessage);
  const togglePin = useStore((s) => s.togglePinMessage);
  const toggleReaction = useStore((s) => s.toggleReaction);
  const hide = useStore((s) => s.hideMessage);
  const createThread = useStore((s) => s.createThread);
  const acceptRequest = useStore((s) => s.acceptRequest);
  const declineRequest = useStore((s) => s.declineRequest);
  const markRead = useStore((s) => s.markRead);
  const markMessagesRead = useStore((s) => s.markMessagesRead);
  const whisperOpen = useStore((s) => !!s.whisperUnlocked[chatId]);

  const chat = chats.find((c) => c.id === chatId);
  const msgs = useMemo(
    () => visibleMessages(all.filter((m) => m.chatId === chatId), whisperOpen),
    [all, chatId, whisperOpen],
  );
  const pinned = useMemo(() => msgs.filter((message) => message.pinned).slice(0, 3), [msgs]);
  const byId = useMemo(() => new Map(msgs.map((m) => [m.id, m])), [msgs]);

  const [draft, setDraft] = useState('');
  const [replyTo, setReplyTo] = useState<string | null>(null);
  const [editingId, setEditingId] = useState<string | null>(null);
  const [menuFor, setMenuFor] = useState<string | null>(null);
  const [peerTyping, setPeerTyping] = useState(false);
  const listRef = useRef<FlatList>(null);

  useEffect(() => {
    markRead(chatId);
    markMessagesRead(chatId);
  }, [chatId, msgs.length, markRead, markMessagesRead]);

  const scrollToEnd = () => {
    requestAnimationFrame(() => {
      listRef.current?.scrollToEnd({ animated: true });
    });
  };

  // Stay pinned to latest when new messages arrive or keyboard opens.
  useEffect(() => {
    scrollToEnd();
  }, [msgs.length]);

  useEffect(() => {
    const show = Keyboard.addListener(
      Platform.OS === 'ios' ? 'keyboardWillShow' : 'keyboardDidShow',
      scrollToEnd,
    );
    return () => show.remove();
  }, []);

  const doSend = () => {
    if (editingId) {
      if (!draft.trim()) return;
      editMsg(editingId, draft);
      setEditingId(null);
      setDraft('');
      return;
    }
    if (!draft.trim()) return;
    haptic.messageSent();
    send(chatId, draft, { replyToId: replyTo ?? undefined });
    setDraft('');
    setReplyTo(null);
    markRead(chatId);
    scrollToEnd();
  };

  const showMediaComingSoon = () => {
    Alert.alert('Coming soon', 'Photo, video, and voice sharing will be enabled in a future update.');
  };

  const replyTarget = replyTo ? byId.get(replyTo) : undefined;
  const editingTarget = editingId ? byId.get(editingId) : undefined;
  const menuMsg = menuFor ? byId.get(menuFor) : undefined;
  const requestStatus = chat?.isGroup ? 'active' : (chat?.requestStatus ?? 'active');
  const gated = requestStatus !== 'active';

  const sheetAction = (fn: () => void) => {
    fn();
    setMenuFor(null);
  };

  return (
    <SafeAreaView edges={['top', 'bottom']} style={[styles.safe, { backgroundColor: palette.bgBase }]}>
      <KeyboardAvoidingView
        behavior={Platform.OS === 'ios' ? 'padding' : 'height'}
        keyboardVerticalOffset={Platform.OS === 'ios' ? 0 : 0}
        style={styles.flex}
      >
      <AmbientBackground>
        {/* Frosted header floating over the mesh canvas */}
        <BlurView
          intensity={50}
          tint={dark ? 'dark' : 'light'}
          style={[styles.header, { backgroundColor: palette.glass, borderBottomColor: palette.glassBorder, borderBottomWidth: 1 }]}
        >
          <IconButton
            name="back"
            label="Back"
            size={38}
            iconSize={22}
            color={palette.textPrimary}
            onPress={() => navigation.goBack()}
          />
          <View style={[styles.avatar, { backgroundColor: palette.bgRaised }]}>
            <Text style={{ color: palette.textPrimary, fontWeight: '700' }}>
              {chat?.name.slice(0, 1)}
            </Text>
          </View>
          <Pressable style={{ flex: 1 }} onPress={() => navigation.navigate('Whisper', { chatId })}>
            <Text style={[styles.name, { color: palette.textPrimary }]} numberOfLines={1}>
              {chat?.name}
            </Text>
            <Text style={[styles.sub, { color: peerTyping ? palette.ember : palette.textSecondary }]}>
              {peerTyping ? 'typing…' : chat?.online ? 'online' : chat?.lastSeen ?? ''}
            </Text>
          </Pressable>
          <IconButton
            name="video"
            label="Video call"
            size={38}
            iconSize={22}
            color={palette.textSecondary}
            onPress={() => navigation.navigate('Call', { name: chat?.name ?? '', video: true })}
          />
          <IconButton
            name="phone"
            label="Voice call"
            size={38}
            iconSize={22}
            color={palette.textSecondary}
            onPress={() => navigation.navigate('Call', { name: chat?.name ?? '', video: false })}
          />
          <IconButton
            name="lock"
            label="Whisper"
            size={38}
            iconSize={22}
            color={palette.textSecondary}
            onPress={() => navigation.navigate('Whisper', { chatId })}
          />
        </BlurView>

        {pinned.length > 0 ? (
          <View style={[styles.pinnedBar, { backgroundColor: palette.bgSurface }, glassEdge(palette, dark)]}>
            <Icon name="pin" size={15} color={palette.ember} />
            <View style={{ flex: 1 }}>
              <Text style={[styles.pinnedLabel, { color: palette.ember }]}>Pinned messages</Text>
              <Text style={[styles.pinnedText, { color: palette.textSecondary }]} numberOfLines={1}>
                {pinned[0].text}{pinned.length > 1 ? `  +${pinned.length - 1}` : ''}
              </Text>
            </View>
          </View>
        ) : null}

        {/* Messages — chronological, anchored top, grows down, native scrollbar */}
        <FlatList
          ref={listRef}
          data={msgs}
          keyExtractor={(m) => m.id}
          contentContainerStyle={styles.listContent}
          showsVerticalScrollIndicator
          persistentScrollbar
          keyboardShouldPersistTaps="handled"
          onContentSizeChange={scrollToEnd}
          onLayout={scrollToEnd}
          renderItem={({ item }) => {
            const q = item.replyToId ? byId.get(item.replyToId) : undefined;
            return (
              <ChatBubble
                msg={item}
                replyToText={q?.text}
                replyToSender={q ? (q.mine ? 'You' : q.sender) : undefined}
                showSenderName={!!chat?.isGroup}
                onSwipeReply={() => setReplyTo(item.id)}
                onLongPress={() => setMenuFor(item.id)}
                onTapReaction={(emoji) => toggleReaction(item.id, emoji)}
              />
            );
          }}
          ListHeaderComponent={
            <View style={{ alignItems: 'center', marginBottom: 8, gap: 6 }}>
              <View style={[styles.dayPill, { backgroundColor: palette.bgRaised }, glassEdge(palette, dark)]}>
                <Text style={[styles.dayText, { color: palette.textSecondary }]}>Today</Text>
              </View>
              <View style={styles.e2eRow}>
                <Icon name="shield" size={11} color={palette.textSecondary} />
                <Text style={[styles.e2e, { color: palette.textSecondary }]}>
                  Messages are end-to-end encrypted
                </Text>
              </View>
            </View>
          }
          ListEmptyComponent={
            <Text style={[styles.empty, { color: palette.textSecondary }]}>
              No messages yet — say hi{'\n'}Swipe a message sideways to reply.
            </Text>
          }
        />
        {peerTyping ? (
          <View style={{ paddingHorizontal: spacing.md }}>
            <TypingDots />
          </View>
        ) : null}

        {/* Message-request gate: no messaging until the receiver accepts */}
        {requestStatus === 'pending-received' ? (
          <View style={[styles.requestBar, { backgroundColor: palette.bgSurface }, glassEdge(palette, dark)]}>
            <Text style={[styles.requestText, { color: palette.textPrimary }]}>
              {chat?.name} wants to message you. Accept to start chatting.
            </Text>
            <View style={styles.requestRow}>
              <Pressable
                onPress={() => declineRequest(chatId)}
                style={[styles.requestBtn, { borderWidth: 1, borderColor: palette.textPrimary }]}
              >
                <Text style={[styles.requestBtnText, { color: palette.textPrimary }]}>Decline</Text>
              </Pressable>
              <Pressable
                onPress={() => {
                  acceptRequest(chatId);
                  haptic.messageSent();
                }}
                style={[styles.requestBtn, { backgroundColor: palette.ember }]}
              >
                <Text style={[styles.requestBtnText, { color: palette.onAccent }]}>Accept</Text>
              </Pressable>
            </View>
          </View>
        ) : requestStatus === 'pending-sent' ? (
          <View style={[styles.requestBar, { backgroundColor: palette.bgSurface }, glassEdge(palette, dark)]}>
            <Text style={[styles.requestText, { color: palette.textSecondary }]}>
              Request sent — you can start messaging once {chat?.name} accepts.
            </Text>
          </View>
        ) : null}

        {/* Reply / edit preview */}
        {!gated && replyTarget && !editingId ? (
          <View style={[styles.quoteBar, { backgroundColor: palette.bgSurface }, glassEdge(palette, dark)]}>
            <View style={[styles.quoteStripe, { backgroundColor: palette.ember }]} />
            <View style={{ flex: 1 }}>
              <Text style={[styles.quoteName, { color: palette.ember }]}>
                {replyTarget.mine ? 'You' : replyTarget.sender}
              </Text>
              <Text style={[styles.quoteText, { color: palette.textSecondary }]} numberOfLines={1}>
                {replyTarget.text}
              </Text>
            </View>
            <Pressable
              onPress={() => setReplyTo(null)}
              hitSlop={10}
              style={styles.xBtn}
            >
              <Icon name="close" size={15} color={palette.textSecondary} />
            </Pressable>
          </View>
        ) : null}
        {editingTarget && !gated ? (
          <View style={[styles.quoteBar, { backgroundColor: palette.bgSurface }, glassEdge(palette, dark)]}>
            <View style={[styles.quoteStripe, { backgroundColor: palette.ember }]} />
            <View style={{ flex: 1 }}>
              <Text style={[styles.quoteName, { color: palette.ember }]}>Editing message</Text>
              <Text style={[styles.quoteText, { color: palette.textSecondary }]} numberOfLines={1}>
                {editingTarget.text}
              </Text>
            </View>
            <Pressable
              onPress={() => {
                setEditingId(null);
                setDraft('');
              }}
              hitSlop={10}
              style={styles.xBtn}
            >
              <Icon name="close" size={15} color={palette.textSecondary} />
            </Pressable>
          </View>
        ) : null}

        {/* Composer — frosted bar over the mesh */}
        {!gated ? (
        <BlurView
          intensity={50}
          tint={dark ? 'dark' : 'light'}
          style={[
            styles.composerBar,
            {
              backgroundColor: palette.glass,
              borderTopColor: palette.glassBorder,
            },
          ]}
        >
        <View style={styles.composerRow}>
          <IconButton
            name="plus"
            label="Attach"
            size={44}
            iconSize={22}
            color={palette.textSecondary}
            backgroundColor={palette.bgSurface}
            onPress={showMediaComingSoon}
          />
          <View style={[styles.inputPill, { backgroundColor: palette.bgSurface }]}>
            <TextInput
              value={draft}
              onChangeText={setDraft}
              placeholder="Message"
              placeholderTextColor={palette.textSecondary}
              style={[styles.input, { color: palette.textPrimary }]}
              multiline
              maxLength={2000}
              onSubmitEditing={doSend}
              returnKeyType="send"
            />
          </View>
          {draft.trim() ? (
            <IconButton
              name="send"
              label="Send"
              size={44}
              iconSize={22}
              color={palette.onAccent}
              backgroundColor={palette.ember}
              onPress={doSend}
            />
          ) : (
            <IconButton
              name="mic"
              label="Voice note"
              size={44}
              iconSize={22}
              color={palette.textSecondary}
              backgroundColor={palette.bgRaised}
              onPress={showMediaComingSoon}
            />
          )}
        </View>
        </BlurView>
        ) : null}

        {/* Long-press sheet — one simple list, no inline forms */}
        <Modal visible={!!menuFor} transparent animationType="fade" onRequestClose={() => setMenuFor(null)}>
          <Pressable style={styles.scrim} onPress={() => setMenuFor(null)}>
            <GlassView radius={24} intensity={60} style={styles.sheet}>
              <View style={styles.emojiRow}>
                {QUICK_EMOJI.map((e) => (
                  <Pressable
                    key={e}
                    style={[
                      styles.emoji,
                      {
                        backgroundColor:
                          menuMsg?.reactions.some((r) => r.emoji === e && r.by === 'me')
                            ? palette.bgRaised
                            : 'transparent',
                      },
                    ]}
                    onPress={() =>
                      sheetAction(() => {
                        if (menuFor) toggleReaction(menuFor, e);
                        haptic.reaction();
                      })
                    }
                  >
                    <Text style={{ fontSize: 24 }}>{e}</Text>
                  </Pressable>
                ))}
              </View>
            <SheetRow
              name="reply"
              label="Reply"
              onPress={() => sheetAction(() => menuFor && setReplyTo(menuFor))}
            />
            <SheetRow
              name="copy"
              label="Copy"
              onPress={() =>
                sheetAction(async () => {
                  if (menuMsg) await Clipboard.setStringAsync(menuMsg.text);
                })
              }
            />
            <SheetRow
              name="forward"
              label="Share"
              onPress={() =>
                sheetAction(async () => {
                  if (!menuMsg) return;
                  try {
                    if (menuMsg.mediaUri) {
                      await Share.share({
                        url: menuMsg.mediaUri,
                        message: menuMsg.text,
                      });
                    } else {
                      await Share.share({
                        message: menuMsg.text,
                      });
                    }
                  } catch (err) {
                    console.warn('Share error:', err);
                  }
                })
              }
            />
            <SheetRow
              name="star"
              label={menuMsg?.starred ? 'Remove star' : 'Star message'}
              onPress={() => sheetAction(() => menuFor && toggleStar(menuFor))}
            />
            <SheetRow
              name="pin"
              label={menuMsg?.pinned ? 'Unpin message' : 'Pin message'}
              onPress={() => sheetAction(() => {
                if (!menuFor) return;
                if (!togglePin(menuFor)) Alert.alert('Pin limit reached', 'You can pin up to 3 messages in a chat.');
              })}
            />
            {menuMsg?.mine && menuMsg.kind === 'text' ? (
              <SheetRow
                name="edit"
                label="Edit"
                onPress={() =>
                  sheetAction(() => {
                    if (menuMsg) {
                      setEditingId(menuMsg.id);
                      setDraft(menuMsg.text);
                      setReplyTo(null);
                    }
                  })
                }
              />
            ) : null}
            <SheetRow
              name="thread"
              label="Reply in thread"
                onPress={() =>
                  sheetAction(() => {
                    if (menuFor && menuMsg) {
                      const title =
                        menuMsg.text.length > 32 ? menuMsg.text.slice(0, 32) + '…' : menuMsg.text;
                      const id = createThread(chatId, menuFor, title);
                      navigation.navigate('ThreadDetail', { threadId: id });
                    }
                  })
                }
              />
            <SheetRow
              name="lock"
              label="Hide to Whisper"
                onPress={() =>
                  sheetAction(() => {
                    if (menuFor) hide(menuFor);
                    Alert.alert('Hidden', 'Moved to Whisper — silent on their side.');
                  })
                }
              />
            <SheetRow
              name="trash"
              label="Delete for me"
              danger
              onPress={() => sheetAction(() => menuFor && deleteMsg(menuFor))}
            />
            {menuMsg?.mine ? (
              <SheetRow
                name="trash"
                label="Delete for everyone"
                danger
                onPress={() => sheetAction(() => menuFor && deleteEveryone(menuFor))}
              />
            ) : null}
            </GlassView>
          </Pressable>
        </Modal>
      </AmbientBackground>
      </KeyboardAvoidingView>
    </SafeAreaView>
  );
}

function SheetRow({
  name,
  label,
  danger,
  onPress,
}: {
  name: IconName;
  label: string;
  danger?: boolean;
  onPress: () => void;
}) {
  const { palette } = useTheme();
  return (
    <Pressable style={sheetStyles.row} onPress={onPress}>
      <IconSlot
        name={name}
        size={32}
        iconSize={19}
        color={danger ? palette.bad : palette.textPrimary}
      />
      <Text style={[sheetStyles.label, { color: danger ? palette.bad : palette.textPrimary }]}>
        {label}
      </Text>
    </Pressable>
  );
}

const styles = StyleSheet.create({
  safe: { flex: 1 },
  flex: { flex: 1 },
  header: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 8,
    paddingHorizontal: 8,
    paddingVertical: 8,
  },
  pinnedBar: { flexDirection: 'row', alignItems: 'center', gap: 8, marginHorizontal: 12, marginTop: 8, padding: 10, borderRadius: 12, borderWidth: 1 },
  pinnedLabel: { fontSize: 11, fontWeight: '700' },
  pinnedText: { fontSize: 12, marginTop: 2 },
  back: { fontSize: 28, paddingHorizontal: 4 },
  avatar: { width: 38, height: 38, borderRadius: 19, alignItems: 'center', justifyContent: 'center' },
  name: { fontSize: typeScale.body.size, fontWeight: '700' },
  sub: { fontSize: typeScale.caption.size },
  listContent: {
    flexGrow: 1,
    justifyContent: 'flex-start',
    padding: spacing.md,
    paddingBottom: spacing.xl,
    gap: 2,
  },
  dayPill: { borderRadius: 12, paddingHorizontal: 12, paddingVertical: 4 },
  dayText: { fontSize: typeScale.caption.size },
  e2eRow: { flexDirection: 'row', alignItems: 'center', gap: 4 },
  e2e: { fontSize: typeScale.micro.size },
  empty: { fontSize: typeScale.body.size, lineHeight: 24, marginTop: 12 },
  quoteBar: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 8,
    marginHorizontal: 12,
    marginBottom: 6,
    borderRadius: 10,
    padding: 8,
  },
  quoteStripe: { width: 4, alignSelf: 'stretch', borderRadius: 2 },
  quoteName: { fontSize: 13, fontWeight: '700' },
  quoteText: { fontSize: 13 },
  xBtn: { width: 28, height: 28, alignItems: 'center', justifyContent: 'center' },
  requestBar: {
    marginHorizontal: 12,
    marginBottom: 8,
    borderRadius: 12,
    padding: 12,
    gap: 10,
  },
  requestText: { fontSize: typeScale.body.size, lineHeight: 22 },
  requestRow: { flexDirection: 'row', gap: 8 },
  requestBtn: {
    flex: 1,
    borderRadius: 12,
    minHeight: 44,
    alignItems: 'center',
    justifyContent: 'center',
  },
  requestBtnText: { fontSize: 15, fontWeight: '700' },
  composerBar: {
    borderTopWidth: 1,
    paddingHorizontal: 8,
    paddingTop: 8,
    paddingBottom: 8,
  },
  composerRow: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 8,
  },
  recDot: { width: 10, height: 10, borderRadius: 5, marginLeft: 8 },
  recTime: { fontSize: 16, fontWeight: '700', fontVariant: ['tabular-nums'] },
  recHint: { flex: 1, fontSize: 13 },
  inputPill: {
    flex: 1,
    minHeight: 44,
    maxHeight: 130,
    borderRadius: 22,
    paddingHorizontal: 14,
    justifyContent: 'center',
  },
  input: { fontSize: typeScale.body.size, paddingVertical: 8, textAlignVertical: 'center' },
  scrim: { flex: 1, backgroundColor: 'rgba(0,0,0,0.35)', justifyContent: 'flex-end' },
  sheet: {
    borderTopLeftRadius: 24,
    borderTopRightRadius: 24,
    padding: 16,
    paddingBottom: 32,
    gap: 2,
  },
  emojiRow: { flexDirection: 'row', justifyContent: 'space-between', marginBottom: 8 },
  emoji: { padding: 8, borderRadius: 20 },
});

const sheetStyles = StyleSheet.create({
  row: { flexDirection: 'row', alignItems: 'center', gap: 12, paddingVertical: 8 },
  label: { fontSize: 16 },
});
