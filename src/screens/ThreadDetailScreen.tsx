import React, { useState } from 'react';
import {
  FlatList,
  KeyboardAvoidingView,
  Platform,
  StyleSheet,
  Text,
  TextInput,
  View,
} from 'react-native';
import { SafeAreaView } from 'react-native-safe-area-context';
import { useTheme } from '../theme/ThemeContext';
import { spacing, typeScale } from '../theme/tokens';
import { useStore } from '../store/useStore';
import { ChatBubble } from '../components/ChatBubble';
import { AmbientBackground } from '../components/AmbientBackground';
import { IconButton } from '../components/icons';

// Tangent Threads (PRD Module 8.1): side conversation branching off a message.
export function ThreadDetailScreen({ route, navigation }: any) {
  const { threadId } = route.params as { threadId: string };
  const { palette } = useTheme();
  const threads = useStore((s) => s.threads);
  const messages = useStore((s) => s.messages);
  const replyInThread = useStore((s) => s.replyInThread);
  const toggleReaction = useStore((s) => s.toggleReaction);
  const [draft, setDraft] = useState('');

  const thread = threads.find((t) => t.id === threadId);
  const root = messages.find((m) => m.id === thread?.rootMessageId);
  const replies = messages.filter((m) => thread?.messageIds.includes(m.id));

  if (!thread) {
    return (
      <SafeAreaView edges={['top', 'bottom']} style={[styles.root, { backgroundColor: palette.bgBase }]}>
        <Text style={{ color: palette.textPrimary }}>Thread not found.</Text>
      </SafeAreaView>
    );
  }

  return (
    <SafeAreaView edges={['top', 'bottom']} style={[styles.root, { backgroundColor: palette.bgBase }]}>
      <KeyboardAvoidingView
        behavior={Platform.OS === 'ios' ? 'padding' : 'height'}
        style={{ flex: 1, gap: 8 }}
      >
      <AmbientBackground>
      <View style={{ flex: 1, gap: 8, padding: spacing.lg }}>
      <View style={styles.topRow}>
        <IconButton
          name="back"
          label="Back"
          size={38}
          iconSize={22}
          color={palette.textPrimary}
          onPress={() => navigation.goBack()}
        />
        <View style={{ flex: 1 }}>
          <Text style={[styles.title, { color: palette.textPrimary }]}>{thread.title}</Text>
          <Text style={[styles.sub, { color: palette.textSecondary }]}>
            Branched off: “{root?.text?.slice(0, 80)}”
          </Text>
        </View>
      </View>
      <FlatList
        data={replies}
        keyExtractor={(m) => m.id}
        contentContainerStyle={{ gap: 4, paddingVertical: 12, flexGrow: 1 }}
        showsVerticalScrollIndicator
        persistentScrollbar
        keyboardShouldPersistTaps="handled"
        renderItem={({ item }) => (
          <ChatBubble
            msg={item}
            onSwipeReply={() => {}}
            onLongPress={() => {}}
            onTapReaction={(e: string) => toggleReaction(item.id, e)}
          />
        )}
        ListEmptyComponent={
          <Text style={{ color: palette.textSecondary }}>
            No replies yet — the main chat stays uncluttered.
          </Text>
        }
      />
      <View style={[styles.composer, { backgroundColor: palette.bgSurface }]}>
        <TextInput
          value={draft}
          onChangeText={setDraft}
          placeholder="Reply in thread"
          placeholderTextColor={palette.textSecondary}
          style={[styles.input, { color: palette.textPrimary }]}
          onSubmitEditing={() => {
            if (draft.trim()) replyInThread(threadId, draft);
            setDraft('');
          }}
        />
        <IconButton
          name="send"
          label="Send"
          size={40}
          iconSize={20}
          color={palette.onAccent}
          backgroundColor={palette.ember}
          onPress={() => {
            if (draft.trim()) replyInThread(threadId, draft);
            setDraft('');
          }}
        />
      </View>
      </View>
      </AmbientBackground>
      </KeyboardAvoidingView>
    </SafeAreaView>
  );
}

const styles = StyleSheet.create({
  root: { flex: 1 },
  topRow: { flexDirection: 'row', alignItems: 'center', gap: 4 },
  title: { fontSize: typeScale.heading.size, fontWeight: '600' },
  sub: { fontSize: typeScale.caption.size },
  composer: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 8,
    padding: 8,
    borderRadius: 10,
    minHeight: 56,
  },
  input: { flex: 1, fontSize: 16, paddingVertical: 8, textAlignVertical: 'center' },
});
