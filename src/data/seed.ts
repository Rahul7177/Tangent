import { Chat, ChatMessage, DirectoryUser } from '../lib/types';

const now = Date.now();
const m = (m: number) => 60_000 * m;

export const seedChats: Chat[] = [
  { id: 'c-anya', name: 'Anya', isGroup: false, online: true, unread: 2, requestStatus: 'active', username: 'anya_roams', phone: '+911234567890' },
  { id: 'c-family', name: 'Family group', isGroup: true, unread: 0, requestStatus: 'active' },
  { id: 'c-kabir', name: 'Kabir', isGroup: false, online: false, lastSeen: 'last seen 2h ago', unread: 0, requestStatus: 'active', username: 'kabir.jpeg', phone: '+919876543210' },
  // Demo incoming request — Meera found you by username and wants to chat.
  { id: 'c-meera', name: 'Meera', isGroup: false, online: true, unread: 1, requestStatus: 'pending-received', username: 'meera.wav', phone: '+917070707070' },
];

// Simulated public directory (backend: user directory service).
export const seedDirectory: DirectoryUser[] = [
  { id: 'u-anya', name: 'Anya', username: 'anya_roams', phone: '+911234567890' },
  { id: 'u-kabir', name: 'Kabir', username: 'kabir.jpeg', phone: '+919876543210' },
  { id: 'u-meera', name: 'Meera', username: 'meera.wav', phone: '+917070707070' },
  { id: 'u-dev', name: 'Dev', username: 'dev_on_wire', phone: '+916060606060' },
];

export const seedMessages: ChatMessage[] = [
  {
    id: 'msg-1',
    chatId: 'c-anya',
    sender: 'Anya',
    mine: false,
    kind: 'text',
    text: 'Train wifi is terrible but this still goes through 🧡',
    createdAt: now - m(42),
    receipt: 'read',
    reactions: [{ emoji: '🧡', by: 'me' }],
  },
  {
    id: 'msg-2',
    chatId: 'c-anya',
    sender: 'me',
    mine: true,
    kind: 'text',
    text: 'That is exactly what Tangent is for. Text first, media in background.',
    createdAt: now - m(40),
    receipt: 'read',
    reactions: [],
  },
  {
    id: 'msg-3',
    chatId: 'c-anya',
    sender: 'Anya',
    mine: false,
    kind: 'text',
    text: 'Branch this into a Tangent Thread? I have a long tangent 😅',
    createdAt: now - m(38),
    receipt: 'read',
    reactions: [],
    threadCount: 2,
  },
  {
    id: 'msg-4',
    chatId: 'c-family',
    sender: 'Mum',
    mine: false,
    kind: 'text',
    text: 'Call at 8? Video if signal allows, else audio.',
    createdAt: now - m(120),
    receipt: 'delivered',
    reactions: [],
  },
  {
    id: 'msg-5',
    chatId: 'c-meera',
    sender: 'Meera',
    mine: false,
    kind: 'text',
    text: 'Hey! Found you through your username — can we chat here?',
    createdAt: now - m(15),
    receipt: 'delivered',
    reactions: [],
  },
];
