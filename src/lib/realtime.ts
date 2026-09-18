import { initializeApp, getApps } from 'firebase/app';
import { getAuth, signInAnonymously } from 'firebase/auth';
import {
  getDatabase,
  onChildAdded,
  onValue,
  push,
  ref,
  serverTimestamp,
  set,
} from 'firebase/database';
import { ChatMessage, DirectoryUser } from './types';

export type RealtimeEvent =
  | { type: 'message'; message: ChatMessage }
  | { type: 'directory'; users: DirectoryUser[] }
  | { type: 'presence'; username: string; online: boolean };

type Listener = (event: RealtimeEvent) => void;

const firebaseConfig = {
  apiKey: process.env.EXPO_PUBLIC_FIREBASE_API_KEY,
  authDomain: process.env.EXPO_PUBLIC_FIREBASE_AUTH_DOMAIN,
  databaseURL: process.env.EXPO_PUBLIC_FIREBASE_DATABASE_URL,
  projectId: process.env.EXPO_PUBLIC_FIREBASE_PROJECT_ID,
  storageBucket: process.env.EXPO_PUBLIC_FIREBASE_STORAGE_BUCKET,
  messagingSenderId: process.env.EXPO_PUBLIC_FIREBASE_MESSAGING_SENDER_ID,
  appId: process.env.EXPO_PUBLIC_FIREBASE_APP_ID,
};

const configured = Object.values(firebaseConfig).every(Boolean);
let listeners: Listener[] = [];
let username = '';
let database: ReturnType<typeof getDatabase> | null = null;

function emit(event: RealtimeEvent) {
  listeners.forEach((listener) => listener(event));
}

function chatIdFor(a: string, b: string) {
  return `dm:${[a, b].sort().join(':')}`;
}

function userRecord(name: string, phone: string) {
  const uid = getAuth().currentUser?.uid ?? '';
  return { id: username, ownerId: uid, name, username, phone: phone || '' };
}

export async function connectRealtime(name: string, nextUsername: string, phone = '') {
  if (!configured) return;
  username = nextUsername.toLowerCase();
  const app = getApps().length ? getApps()[0] : initializeApp(firebaseConfig);
  const auth = getAuth(app);
  await signInAnonymously(auth);
  database = getDatabase(app);

  await set(ref(database, `users/${username}`), userRecord(name, phone));
  onValue(ref(database, 'users'), (snapshot) => {
    const users = Object.values(snapshot.val() ?? {}) as DirectoryUser[];
    emit({ type: 'directory', users });
  });
  onValue(ref(database, `presence/${username}`), (snapshot) => {
    if (snapshot.exists()) emit({ type: 'presence', username, online: Boolean(snapshot.val()) });
  });
  await set(ref(database, `presence/${username}`), true);
  onChildAdded(ref(database, `inbox/${username}`), (snapshot) => {
    const message = snapshot.val() as ChatMessage;
    if (message.sender !== username) emit({ type: 'message', message });
  });
}

export function subscribeRealtime(listener: Listener) {
  listeners.push(listener);
  return () => {
    listeners = listeners.filter((item) => item !== listener);
  };
}

export function publishRealtime(payload: { type: 'message'; to: string; text: string; replyToId?: string; clientId?: string }) {
  if (!database || !username || payload.type !== 'message') return;
  const messageRef = push(ref(database, `messages/${chatIdFor(username, payload.to)}`));
  const message = {
    id: payload.clientId ?? messageRef.key,
    chatId: chatIdFor(username, payload.to),
    sender: username,
    senderUid: getAuth().currentUser?.uid ?? '',
    mine: false,
    kind: 'text' as const,
    text: payload.text.slice(0, 2000),
    createdAt: Date.now(),
    serverCreatedAt: serverTimestamp(),
    receipt: 'delivered' as const,
    replyToId: payload.replyToId,
    reactions: [],
  };
  void set(messageRef, message);
  void set(push(ref(database, `inbox/${payload.to}`)), { ...message, to: payload.to });
}

export function isRealtimeConfigured() {
  return configured;
}