import { initializeApp, getApps } from 'firebase/app';
import { Platform } from 'react-native';
import {
  browserLocalPersistence,
  GoogleAuthProvider,
  browserPopupRedirectResolver,
  getAuth,
  signOut,
  signInAnonymously,
  signInWithEmailAndPassword,
  signInWithPopup,
  createUserWithEmailAndPassword,
} from 'firebase/auth';
import {
  getDatabase,
  onChildAdded,
  onValue,
  push,
  ref,
  serverTimestamp,
  set,
  get,
} from 'firebase/database';
import { ChatMessage, DirectoryUser } from './types';

export type RealtimeEvent =
  | { type: 'message'; message: ChatMessage }
  | { type: 'directory'; users: DirectoryUser[] }
  | { type: 'presence'; username: string; online: boolean }
  | { type: 'request'; id: string; from: string; to: string; createdAt: number }
  | { type: 'requestAccepted'; id: string; from: string; to: string };

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
let connectedUsername = '';
let detachRealtime: (() => void)[] = [];
let authInstance: ReturnType<typeof getAuth> | null = null;
let reconnectTimer: ReturnType<typeof setTimeout> | null = null;

export function firebaseReady() {
  return configured;
}

function firebaseAuth() {
  if (!configured) throw new Error('Firebase is not configured. Add the values from .env.local.');
  const app = getApps().length ? getApps()[0] : initializeApp(firebaseConfig);
  if (authInstance) return authInstance;
  authInstance = getAuth(app);
  return authInstance;
}

async function prepareAuth() {
  const auth = firebaseAuth();
  if (Platform.OS === 'web') {
    const { setPersistence } = await import('firebase/auth');
    await setPersistence(auth, browserLocalPersistence);
  }
  return auth;
}

export async function signOutRealtime() {
  if (reconnectTimer) clearTimeout(reconnectTimer);
  reconnectTimer = null;
  detachRealtime.forEach((detach) => detach());
  detachRealtime = [];
  connectedUsername = '';
  username = '';
  database = null;
  await signOut(firebaseAuth());
}

export async function signUpWithEmail(email: string, password: string) {
  return createUserWithEmailAndPassword(await prepareAuth(), email.trim(), password);
}

export async function signInWithEmail(email: string, password: string) {
  return signInWithEmailAndPassword(await prepareAuth(), email.trim(), password);
}

export async function signInWithGoogle() {
  const auth = await prepareAuth();
  const provider = new GoogleAuthProvider();
  return signInWithPopup(auth, provider, browserPopupRedirectResolver);
}

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
  if (connectedUsername === username && database) return;
  detachRealtime.forEach((detach) => detach());
  detachRealtime = [];
  const auth = await prepareAuth();
  if (!auth.currentUser) await signInAnonymously(auth);
  const app = getApps()[0];
  database = getDatabase(app);

  await set(ref(database, `users/${username}`), userRecord(name, phone));
  detachRealtime.push(onValue(ref(database, 'users'), (snapshot) => {
    const users = Object.values(snapshot.val() ?? {}) as DirectoryUser[];
    emit({ type: 'directory', users });
  }));
  detachRealtime.push(onValue(ref(database, `presence/${username}`), (snapshot) => {
    if (snapshot.exists()) emit({ type: 'presence', username, online: Boolean(snapshot.val()) });
  }));
  await set(ref(database, `presence/${username}`), true);
  const activeUsername = username;
  const handleRealtimeError = (error: Error) => {
    console.warn('Firebase realtime listener failed:', error.message);
    connectedUsername = '';
    if (!reconnectTimer) {
      reconnectTimer = setTimeout(() => {
        reconnectTimer = null;
        void connectRealtime(name, activeUsername, phone).catch((retryError) => {
          console.warn('Firebase realtime reconnect failed:', retryError);
        });
      }, 1500);
    }
  };
  detachRealtime.push(onChildAdded(ref(database, `inbox/${username}`), (snapshot) => {
    const raw = snapshot.val() as Partial<ChatMessage>;
    const message: ChatMessage = {
      id: raw.id ?? snapshot.key ?? `msg-${Date.now()}`,
      chatId: raw.chatId ?? '',
      sender: raw.sender ?? 'unknown',
      mine: false,
      kind: raw.kind ?? 'text',
      text: raw.text ?? '',
      createdAt: typeof raw.createdAt === 'number' ? raw.createdAt : Date.now(),
      receipt: raw.receipt ?? 'delivered',
      replyToId: raw.replyToId,
      reactions: Array.isArray(raw.reactions) ? raw.reactions : [],
    };
    if (message.sender !== username) emit({ type: 'message', message });
  }, handleRealtimeError));
  detachRealtime.push(onChildAdded(ref(database, `requests/${username}`), (snapshot) => {
    const request = snapshot.val() as {
      id: string;
      from: string;
      to: string;
      createdAt: number;
      status: string;
    };
    if (request.status === 'pending') {
      emit({
        type: 'request',
        id: request.id,
        from: request.from,
        to: request.to,
        createdAt: request.createdAt,
      });
    }
  }));
  detachRealtime.push(onChildAdded(ref(database, `requestEvents/${username}`), (snapshot) => {
    const event = snapshot.val() as {
      id: string;
      from: string;
      to: string;
      type: string;
    };
    if (event.type === 'accepted') {
      emit({
        type: 'requestAccepted',
        id: event.id,
        from: event.from,
        to: event.to,
      });
    }
  }));
  connectedUsername = username;
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
  const message: Record<string, unknown> = {
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
    reactions: [],
  };
  if (payload.replyToId) message.replyToId = payload.replyToId;
  void set(push(ref(database, `inbox/${payload.to}`)), { ...message, to: payload.to })
    .catch((error) => console.warn('Message delivery failed:', error));
}

export function publishRequest(payload: { type: 'request'; id: string; to: string }) {
  if (!database || !username) return;
  const activeDatabase = database;
  const request = {
    id: payload.id,
    from: username,
    to: payload.to,
    createdAt: Date.now(),
    status: 'pending',
  };
  void set(ref(activeDatabase, `requests/${payload.to}/${payload.id}`), request)
    .then(() => set(ref(activeDatabase, `requestsOut/${username}/${payload.id}`), request))
    .catch((error) => console.warn('Request failed:', error));
}

export function publishRequestAccepted(payload: { id: string; to: string }) {
  if (!database || !username) return;
  void set(ref(database, `requestEvents/${payload.to}/${payload.id}`), {
    id: payload.id,
    from: username,
    to: payload.to,
    type: 'accepted',
  }).catch((error) => console.warn('Request acceptance failed:', error));
}

export function isRealtimeConfigured() {
  return configured;
}

export async function signedInProfile() {
  const auth = firebaseAuth();
  if (!auth.currentUser) return undefined;
  const app = getApps()[0];
  const databaseRef = getDatabase(app);
  const snapshot = await get(ref(databaseRef, 'users'));
  const users = Object.values(snapshot.val() ?? {}) as Array<DirectoryUser & { ownerId?: string }>;
  return users.find((user) => user.ownerId === auth.currentUser?.uid);
}