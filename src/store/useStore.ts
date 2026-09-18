import { create } from 'zustand';
import { Chat, ChatMessage, DirectoryUser, TangentThread, isValidUsername } from '../lib/types';
import { seedChats, seedDirectory, seedMessages } from '../data/seed';
import { connectRealtime, publishRealtime, subscribeRealtime } from '../lib/realtime';

export interface CurrentUser {
  name: string;
  username: string;
  phone: string;
}

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
  completeOnboarding: (name: string, username: string, phone: string) => void;
  usernameTaken: (username: string) => boolean;
  searchDirectory: (query: string) => DirectoryUser[];
  findUserByUsername: (username: string) => DirectoryUser | undefined;
  findUserByPhone: (phone: string) => DirectoryUser | undefined;
  // Returns existing chat id or creates a pending-sent request chat.
  requestChatWithUser: (userId: string) => string;
  acceptRequest: (chatId: string) => void;
  declineRequest: (chatId: string) => void;
  sendMessage: (chatId: string, text: string, opts?: { replyToId?: string }) => void;
  receiveMessage: (chatId: string, text: string, sender?: string) => void;
  editMessage: (messageId: string, text: string) => void;
  deleteMessage: (messageId: string) => void;
  markMessagesRead: (chatId: string) => void;
  toggleReaction: (messageId: string, emoji: string) => void;
  hideMessage: (messageId: string) => void;
  unhideMessage: (messageId: string) => void;
  setWhisperUnlocked: (chatId: string, v: boolean) => void;
  createThread: (chatId: string, rootMessageId: string, title: string) => string;
  replyInThread: (threadId: string, text: string) => void;
  setLiteMode: (v: boolean) => void;
  markRead: (chatId: string) => void;
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

export const useStore = create<TangentState>((set, get) => ({
  onboarded: false,
  userName: '',
  currentUser: { name: 'You', username: 'you', phone: '' },
  directory: seedDirectory,
  chats: seedChats,
  messages: seedMessages,
  threads: [
    {
      id: 't-1',
      chatId: 'c-anya',
      rootMessageId: 'msg-3',
      title: 'Train stories',
      messageIds: [],
    },
  ],
  liteMode: false,
  whisperUnlocked: {},

  completeOnboarding: (name, username, phone) => {
    const cleanName = name.trim() || 'You';
    const uname = username.trim().toLowerCase();
    set({
      onboarded: true,
      userName: cleanName,
      currentUser: { name: cleanName, username: uname, phone: phone.trim() },
    });
    if (!realtimeBound) {
      realtimeBound = true;
      subscribeRealtime((event) => {
        if (event.type === 'directory') {
          set((s) => ({ directory: event.users }));
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
                ? s.chats.map((chat) => chat.id === chatId ? { ...chat, unread: chat.unread + 1, online: true } : chat)
                : [...s.chats, nextChat],
            };
          });
        }
      });
    }
    connectRealtime(cleanName, uname);
  },

  usernameTaken: (username) => {
    const u = username.trim().toLowerCase();
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
      requestStatus: 'active',
      username: user.username,
      phone: user.phone,
    };
    set((s) => ({ chats: [...s.chats, chat] }));
    return id;
  },

  acceptRequest: (chatId) =>
    set((s) => ({
      chats: s.chats.map((c) =>
        c.id === chatId ? { ...c, requestStatus: 'active', unread: 0 } : c,
      ),
    })),

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

  receiveMessage: (chatId, text, sender = 'them') => {
    const msg: ChatMessage = {
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

  markMessagesRead: (chatId) =>
    set((s) => ({
      messages: s.messages.map((x) =>
        x.chatId === chatId && x.mine && (x.receipt === 'sent' || x.receipt === 'delivered')
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

  createThread: (chatId, rootMessageId, title) => {
    const id = uid('t');
    set((s) => ({
      threads: [...s.threads, { id, chatId, rootMessageId, title, messageIds: [] }],
      messages: s.messages.map((x) =>
        x.id === rootMessageId ? { ...x, threadCount: (x.threadCount ?? 0) + 0 } : x,
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
}));

export function visibleMessages(messages: ChatMessage[], whisperOpen: boolean) {
  // Hidden items excluded from list / preview / search unless Whisper unlocked.
  return messages.filter((x) => (x.hidden ? whisperOpen : true));
}
