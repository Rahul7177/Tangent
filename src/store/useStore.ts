import { create } from 'zustand';
import { Chat, ChatMessage, DirectoryUser, TangentThread, formatDuration, isValidUsername } from '../lib/types';
import {
  connectRealtime,
  publishMediaMessage,
  publishRealtime,
  publishRequest,
  publishRequestAccepted,
  signOutRealtime,
  subscribeRealtime,
} from '../lib/realtime';
import AsyncStorage from '@react-native-async-storage/async-storage';
import { createJSONStorage, persist } from 'zustand/middleware';

export interface CurrentUser {
  name: string;
  username: string;
  phone: string;
}

export interface AuthDraft {
  name: string;
  username: string;
  email: string;
  password: string;
}

export interface WhisperSession {
  id: string;
  startedAt: number;
  expiresAt?: number;
}

const emptyDraft: AuthDraft = { name: '', username: '', email: '', password: '' };

interface TangentState {
  onboarded: boolean;
  userName: string;
  currentUser: CurrentUser;
  directory: DirectoryUser[];
  chats: Chat[];
  messages: ChatMessage[];
  threads: TangentThread[];
  liteMode: boolean;
  whisperUnlocked: Record<string, boolean>; // chatId -> unlocked
  whisperSessions: Record<string, WhisperSession>;
  completeOnboarding: (name: string, username: string, phone: string) => void;
  authDraft: AuthDraft;
  setAuthDraft: (patch: Partial<AuthDraft>) => void;
  clearAuthDraft: () => void;
  usernameTaken: (username: string) => boolean;
  searchDirectory: (query: string) => DirectoryUser[];
  findUserByUsername: (username: string) => DirectoryUser | undefined;
  findUserByPhone: (phone: string) => DirectoryUser | undefined;
  // Returns existing chat id or creates a pending-sent request chat.
  requestChatWithUser: (userId: string) => string;
  acceptRequest: (chatId: string) => void;
  declineRequest: (chatId: string) => void;
  sendMessage: (chatId: string, text: string, opts?: { replyToId?: string }) => void;
  sendMedia: (
    chatId: string,
    kind: 'image' | 'voice',
    mediaUri: string,
    opts?: { caption?: string; durationMs?: number; mimeType?: string; replyToId?: string },
  ) => Promise<void>;
  receiveMessage: (chatId: string, text: string, sender?: string) => void;
  editMessage: (messageId: string, text: string) => void;
  deleteMessage: (messageId: string) => void;
  deleteMessageForEveryone: (messageId: string) => void;
  toggleStarMessage: (messageId: string) => void;
  togglePinMessage: (messageId: string) => boolean;
  markMessagesRead: (chatId: string) => void;
  toggleReaction: (messageId: string, emoji: string) => void;
  hideMessage: (messageId: string) => void;
  unhideMessage: (messageId: string) => void;
  setWhisperUnlocked: (chatId: string, v: boolean) => void;
  startWhisperSession: (chatId: string, durationMinutes?: number) => void;
  expireWhisperSession: (chatId: string) => void;
  finishWhisperSession: (chatId: string, choice: 'keep' | 'hide' | 'delete') => void;
  createThread: (chatId: string, rootMessageId: string, title: string) => string;
  replyInThread: (threadId: string, text: string) => void;
  setLiteMode: (v: boolean) => void;
  markRead: (chatId: string) => void;
  logout: () => Promise<void>;
}

// Offline-first stub (PRD Module 1 + 5):
// - text sends instantly with `sent` receipt, then upgrades to delivered/read
// - media would be queued by priority text > voice > image > video (stubbed)
// - delta-sync hook point: `syncQueue` would flush on reconnect (Matrix later).
function uid(prefix: string) {
  return `${prefix}-${Math.random().toString(36).slice(2, 8)}`;
}

function directChatId(a: string, b: string) {
  return `dm:${[a, b].sort().join(':')}`;
}

let realtimeBound = false;

export const useStore = create<TangentState>()(persist((set, get) => ({
  onboarded: false,
  userName: '',
  currentUser: { name: 'You', username: 'you', phone: '' },
  directory: [],
  chats: [],
  messages: [],
  threads: [],
  liteMode: false,
  whisperUnlocked: {},
  whisperSessions: {},

  completeOnboarding: (name, username, phone) => {
    const cleanName = name.trim() || 'You';
    const uname = username.trim().toLowerCase();
    set({
      onboarded: true,
      userName: cleanName,
      currentUser: { name: cleanName, username: uname, phone: phone.trim() },
      authDraft: { ...emptyDraft },
    });
    if (!realtimeBound) {
      realtimeBound = true;
      subscribeRealtime((event) => {
        if (event.type === 'directory') {
          set(() => ({ directory: event.users }));
          return;
        }
        if (event.type === 'presence') {
          set((s) => ({
            chats: s.chats.map((chat) =>
              chat.username === event.username ? { ...chat, online: event.online } : chat,
            ),
          }));
          return;
        }
        if (event.type === 'message') {
          const incoming = event.message;
          const current = get().currentUser;
          if (incoming.sender === current.username) return;
          const sender = get().directory.find((user) => user.username === incoming.sender);
          const chatId = directChatId(current.username, incoming.sender);
          set((s) => {
            const exists = s.messages.some((message) => message.id === incoming.id);
            const nextMessages = exists
              ? s.messages
              : [...s.messages, { ...incoming, chatId, mine: false, sender: sender?.name ?? incoming.sender }];
            const hasChat = s.chats.some((chat) => chat.id === chatId);
            const nextChat: Chat = {
              id: chatId,
              name: sender?.name ?? incoming.sender,
              isGroup: false,
              online: true,
              unread: 1,
              requestStatus: 'active',
              username: incoming.sender,
              phone: sender?.phone,
            };
            return {
              messages: nextMessages,
              chats: hasChat
                ? s.chats.map((chat) => chat.id === chatId ? { ...chat, unread: exists ? chat.unread : chat.unread + 1, online: true } : chat)
                : [...s.chats, nextChat],
            };
          });
        }
        if (event.type === 'request') {
          const sender = get().directory.find((user) => user.username === event.from);
          const current = get().currentUser;
          const chatId = directChatId(current.username, event.from);
          set((s) =>
            s.chats.some((chat) => chat.id === chatId)
              ? s
              : {
                  chats: [
                    ...s.chats,
                    {
                      id: chatId,
                      name: sender?.name ?? event.from,
                      isGroup: false,
                      online: true,
                      unread: 1,
                      requestStatus: 'pending-received',
                      username: event.from,
                      phone: sender?.phone,
                    },
                  ],
                },
          );
          return;
        }
        if (event.type === 'requestAccepted') {
          const current = get().currentUser;
          const chatId = directChatId(current.username, event.from);
          set((s) => ({
            chats: s.chats.map((chat) =>
              chat.id === chatId
                ? { ...chat, requestStatus: 'active' }
                : chat,
            ),
          }));
          return;
        }
      });
    }
    void connectRealtime(cleanName, uname, phone.trim()).catch((error: unknown) => {
      console.warn('Firebase realtime is unavailable:', error);
    });
  },

  authDraft: { ...emptyDraft },
  setAuthDraft: (patch) => set((s) => ({ authDraft: { ...s.authDraft, ...patch } })),
  clearAuthDraft: () => set({ authDraft: { ...emptyDraft } }),

  usernameTaken: (username) => {    const u = username.trim().toLowerCase();
    if (!isValidUsername(u)) return true;
    if (get().currentUser.username === u) return true;
    return get().directory.some((d) => d.username === u);
  },

  searchDirectory: (query) => {
    const q = query.trim().toLowerCase();
    if (q.length < 2) return [];
    const me = get().currentUser.username;
    return get()
      .directory.filter(
        (d) =>
          d.username !== me &&
          (d.username.includes(q) || d.name.toLowerCase().includes(q)),
      )
      .slice(0, 20);
  },

  findUserByUsername: (username) => {
    const u = username.trim().toLowerCase();
    return get().directory.find((d) => d.username === u);
  },

  findUserByPhone: (phone) => {
    const digits = phone.replace(/\D/g, '');
    if (!digits) return undefined;
    return get().directory.find((d) => d.phone.replace(/\D/g, '').endsWith(digits.slice(-8)));
  },

  requestChatWithUser: (userId) => {
    const existing = get().chats.find(
      (c) => !c.isGroup && get().directory.find((d) => d.id === userId)?.username === c.username,
    );
    if (existing) return existing.id;
    const user = get().directory.find((d) => d.id === userId);
    if (!user) return '';
    const current = get().currentUser;
    const id = directChatId(current.username, user.username);
    const chat: Chat = {
      id,
      name: user.name,
      isGroup: false,
      online: false,
      unread: 0,
      requestStatus: 'pending-sent',
      username: user.username,
      phone: user.phone,
    };
    set((s) => ({ chats: [...s.chats, chat] }));
    publishRequest({ type: 'request', id, to: user.username });
    return id;
  },

  acceptRequest: (chatId) => {
    const chat = get().chats.find((item) => item.id === chatId);
    if (!chat?.username) return;
    set((s) => ({
      chats: s.chats.map((c) =>
        c.id === chatId
          ? { ...c, requestStatus: 'active', unread: 0 }
          : c,
      ),
    }));
    publishRequestAccepted({ id: chatId, to: chat.username });
  },

  declineRequest: (chatId) =>
    set((s) => ({
      chats: s.chats.filter((c) => c.id !== chatId),
      messages: s.messages.filter((m) => m.chatId !== chatId),
    })),

  sendMessage: (chatId, text, opts) => {
    const clean = text.trim();
    if (!clean) return;
    // Requests must be accepted before messaging (UI also disables the composer).
    const chat = get().chats.find((c) => c.id === chatId);
    if (chat && !chat.isGroup && chat.requestStatus && chat.requestStatus !== 'active') return;
    const msg: ChatMessage = {
      id: uid('msg'),
      chatId,
      sender: get().currentUser.username,
      mine: true,
      kind: 'text',
      text: clean.slice(0, 2000),
      createdAt: Date.now(),
      receipt: 'sending',
      replyToId: opts?.replyToId,
      whisperSessionId: get().whisperSessions[chatId]?.id,
      reactions: [],
    };
    set((s) => ({ messages: [...s.messages, msg] }));
    if (chat?.username) {
      publishRealtime({
        type: 'message',
        to: chat.username,
        text: msg.text,
        replyToId: msg.replyToId,
        clientId: msg.id,
      });
    }
    // WhatsApp-style ack ladder: sending → sent → delivered → (read when peer opens).
    setTimeout(() => {
      set((s) => ({
        messages: s.messages.map((x) => (x.id === msg.id && x.receipt === 'sending' ? { ...x, receipt: 'sent' } : x)),
      }));
    }, 400);
    setTimeout(() => {
      const cur = get().messages.find((x) => x.id === msg.id);
      if (cur && (cur.receipt === 'sent' || cur.receipt === 'sending')) {
        set((s) => ({
          messages: s.messages.map((x) => (x.id === msg.id ? { ...x, receipt: 'delivered' } : x)),
        }));
      }
    }, 1200);
  },

  // Local-first media: the message appears instantly with the device-local
  // URI and climbs the same ack ladder as text. The backend upload (when a
  // peer username exists and realtime is configured) runs in the background.
  sendMedia: async (chatId, kind, mediaUri, opts) => {
    if (!mediaUri) return;
    const chat = get().chats.find((c) => c.id === chatId);
    if (chat && !chat.isGroup && chat.requestStatus && chat.requestStatus !== 'active') return;
    const fallbackText =
      kind === 'image' ? opts?.caption?.trim() || 'Photo' : `Voice note${opts?.durationMs ? ` (${formatDuration(opts.durationMs)})` : ''}`;
    const msg: ChatMessage = {
      id: uid('msg'),
      chatId,
      sender: get().currentUser.username,
      mine: true,
      kind,
      text: fallbackText.slice(0, 2000),
      createdAt: Date.now(),
      receipt: 'sending',
      replyToId: opts?.replyToId,
      whisperSessionId: get().whisperSessions[chatId]?.id,
      reactions: [],
      mediaUri,
      mediaMimeType: opts?.mimeType,
      mediaDuration: opts?.durationMs,
    };
    if (!chat?.username) return;
    const uploaded = await publishMediaMessage({
      to: chat.username,
      uri: mediaUri,
      kind,
      mimeType: opts?.mimeType,
      duration: opts?.durationMs ? opts.durationMs / 1000 : undefined,
    });
    set((s) => ({ messages: [...s.messages, { ...msg, id: uploaded.messageId, mediaUri: uploaded.mediaUri, receipt: 'delivered' }] }));
  },

  receiveMessage: (chatId, text, sender = 'them') => {    const msg: ChatMessage = {
      id: uid('msg'),
      chatId,
      sender,
      mine: false,
      kind: 'text',
      text: text.trim().slice(0, 2000),
      createdAt: Date.now(),
      receipt: 'read',
      reactions: [],
    };
    set((s) => ({ messages: [...s.messages, msg] }));
  },

  editMessage: (messageId, text) => {
    const clean = text.trim();
    if (!clean) return;
    set((s) => ({
      messages: s.messages.map((x) => (x.id === messageId ? { ...x, text: clean.slice(0, 2000) } : x)),
    }));
  },

  deleteMessage: (messageId) =>
    set((s) => ({ messages: s.messages.filter((x) => x.id !== messageId) })),

  deleteMessageForEveryone: (messageId) =>
    set((s) => ({
      messages: s.messages.map((x) =>
        x.id === messageId ? { ...x, text: 'This message was deleted', kind: 'system' } : x,
      ),
    })),

  toggleStarMessage: (messageId) =>
    set((s) => ({
      messages: s.messages.map((x) => (x.id === messageId ? { ...x, starred: !x.starred } : x)),
    })),

  togglePinMessage: (messageId) => {
    const message = get().messages.find((item) => item.id === messageId);
    if (!message) return false;
    if (message.pinned) {
      set((s) => ({ messages: s.messages.map((x) => x.id === messageId ? { ...x, pinned: false } : x) }));
      return true;
    }
    const pinnedCount = get().messages.filter((item) => item.chatId === message.chatId && item.pinned).length;
    if (pinnedCount >= 3) return false;
    set((s) => ({ messages: s.messages.map((x) => x.id === messageId ? { ...x, pinned: true } : x) }));
    return true;
  },

  markMessagesRead: (chatId) =>
    set((s) => ({
      messages: s.messages.map((x) =>
        x.chatId === chatId && x.mine && (x.receipt === 'sending' || x.receipt === 'sent' || x.receipt === 'delivered')
          ? { ...x, receipt: 'read' }
          : x,
      ),
    })),

  toggleReaction: (messageId, emoji) =>
    set((s) => ({
      messages: s.messages.map((x) => {
        if (x.id !== messageId) return x;
        const has = x.reactions.some((r) => r.emoji === emoji && r.by === 'me');
        return {
          ...x,
          reactions: has
            ? x.reactions.filter((r) => !(r.emoji === emoji && r.by === 'me'))
            : [...x.reactions, { emoji, by: 'me' }],
        };
      }),
    })),

  hideMessage: (messageId) =>
    set((s) => ({
      messages: s.messages.map((x) => (x.id === messageId ? { ...x, hidden: true } : x)),
    })),

  unhideMessage: (messageId) =>
    set((s) => ({
      messages: s.messages.map((x) => (x.id === messageId ? { ...x, hidden: false } : x)),
    })),

  setWhisperUnlocked: (chatId, v) =>
    set((s) => ({ whisperUnlocked: { ...s.whisperUnlocked, [chatId]: v } })),

  startWhisperSession: (chatId, durationMinutes) =>
    set((s) => ({
      whisperSessions: {
        ...s.whisperSessions,
        [chatId]: {
          id: uid('whisper'),
          startedAt: Date.now(),
          expiresAt: durationMinutes ? Date.now() + durationMinutes * 60_000 : undefined,
        },
      },
      whisperUnlocked: { ...s.whisperUnlocked, [chatId]: true },
    })),

  expireWhisperSession: (chatId) =>
    set((s) => ({
      whisperSessions: Object.fromEntries(Object.entries(s.whisperSessions).filter(([id]) => id !== chatId)),
      whisperUnlocked: { ...s.whisperUnlocked, [chatId]: false },
      messages: s.messages.map((message) =>
        message.chatId === chatId && message.whisperSessionId
          ? { ...message, hidden: true }
          : message,
      ),
    })),

  finishWhisperSession: (chatId, choice) =>
    set((s) => ({
      messages: choice === 'delete'
        ? s.messages.filter((message) => message.chatId !== chatId || !message.whisperSessionId)
        : s.messages.map((message) =>
            message.chatId === chatId && message.whisperSessionId
              ? { ...message, hidden: choice === 'hide' ? true : false, whisperSessionId: undefined }
              : message,
          ),
      whisperUnlocked: { ...s.whisperUnlocked, [chatId]: false },
      whisperSessions: Object.fromEntries(Object.entries(s.whisperSessions).filter(([id]) => id !== chatId)),
    })),

  createThread: (chatId, rootMessageId, title) => {
    const id = uid('t');
    set((s) => ({
      threads: [...s.threads, { id, chatId, rootMessageId, title, messageIds: [] }],
      messages: s.messages.map((x) =>
        x.id === rootMessageId ? { ...x, threadCount: (x.threadCount ?? 0) + 1 } : x,
      ),
    }));
    return id;
  },

  replyInThread: (threadId, text) => {
    const t = get().threads.find((x) => x.id === threadId);
    if (!t) return;
    const msg: ChatMessage = {
      id: uid('msg'),
      chatId: t.chatId,
      sender: 'me',
      mine: true,
      kind: 'text',
      text: `↳ ${t.title}: ${text.trim()}`.slice(0, 2000),
      createdAt: Date.now(),
      receipt: 'sent',
      replyToId: t.rootMessageId,
      reactions: [],
    };
    set((s) => ({
      messages: [...s.messages, msg],
      threads: s.threads.map((x) =>
        x.id === threadId ? { ...x, messageIds: [...x.messageIds, msg.id] } : x,
      ),
    }));
  },

  setLiteMode: (v) => set({ liteMode: v }),

  markRead: (chatId) =>
    set((s) => ({
      chats: s.chats.map((c) => (c.id === chatId ? { ...c, unread: 0 } : c)),
    })),

  logout: async () => {
    await signOutRealtime().catch((error) => console.warn('Logout failed:', error));
    realtimeBound = false;
    set({
      onboarded: false,
      userName: '',
      currentUser: { name: 'You', username: 'you', phone: '' },
      directory: [],
      chats: [],
      messages: [],
      threads: [],
      whisperUnlocked: {},
      whisperSessions: {},
      authDraft: { ...emptyDraft },
    });
  },
}), {
  name: 'tangent-session',
  storage: createJSONStorage(() => AsyncStorage),
  // After a cold app restart, zustand rehydrates persisted state from AsyncStorage.
  // If the user was already onboarded, completeOnboarding won't be called again,
  // so connectRealtime would never run — leaving `database` null and all outgoing
  // messages silently dropped. onRehydrateStorage fires once after hydration and
  // reconnects Firebase if needed.
  onRehydrateStorage: () => (state) => {
    if (state?.onboarded && state.currentUser.username) {
      realtimeBound = true;
      void connectRealtime(
        state.currentUser.name,
        state.currentUser.username,
        state.currentUser.phone,
      ).catch((error: unknown) => {
        console.warn('Firebase realtime is unavailable (rehydrate):', error);
      });
    }
  },
  partialize: (state) => ({
    onboarded: state.onboarded,
    userName: state.userName,
    currentUser: state.currentUser,
    directory: state.directory,
    chats: state.chats,
    messages: state.messages,
    threads: state.threads,
    liteMode: state.liteMode,
    whisperUnlocked: state.whisperUnlocked,
    whisperSessions: state.whisperSessions,
    authDraft: { ...emptyDraft },
  }),
}));

export function visibleMessages(messages: ChatMessage[], whisperOpen: boolean) {
  // Hidden items excluded from list / preview / search unless Whisper unlocked.
  return messages.filter((x) => (x.hidden ? whisperOpen : true));
}
