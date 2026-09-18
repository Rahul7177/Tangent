import { Platform } from 'react-native';
import { ChatMessage, DirectoryUser } from './types';

export type RealtimeEvent =
  | { type: 'message'; message: ChatMessage }
  | { type: 'directory'; users: DirectoryUser[] }
  | { type: 'presence'; username: string; online: boolean };

type Listener = (event: RealtimeEvent) => void;

function endpoint() {
  const configured = process.env.EXPO_PUBLIC_TANGENT_WS_URL;
  if (configured) return configured;
  if (Platform.OS === 'web' && typeof window !== 'undefined') {
    return `ws://${window.location.hostname}:8787`;
  }
  return '';
}

let socket: WebSocket | null = null;
let identity: { name: string; username: string } | null = null;
let listeners: Listener[] = [];
let queue: string[] = [];

function emit(event: RealtimeEvent) {
  listeners.forEach((listener) => listener(event));
}

function flush() {
  if (!socket || socket.readyState !== WebSocket.OPEN) return;
  queue.splice(0).forEach((payload) => socket?.send(payload));
}

export function connectRealtime(name: string, username: string) {
  const url = endpoint();
  if (!url || typeof WebSocket === 'undefined') return;
  identity = { name, username };
  if (socket && socket.readyState <= WebSocket.OPEN) {
    socket.close();
  }
  socket = new WebSocket(url);
  socket.onopen = () => {
    socket?.send(JSON.stringify({ type: 'hello', name, username }));
    flush();
  };
  socket.onmessage = (event) => {
    try {
      const parsed = JSON.parse(String(event.data)) as RealtimeEvent;
      if (parsed.type === 'message' && parsed.message.sender === username) return;
      emit(parsed);
    } catch {
      // Ignore malformed frames so a bad client cannot break the session.
    }
  };
  socket.onclose = () => {
    if (identity) setTimeout(() => connectRealtime(identity!.name, identity!.username), 1500);
  };
}

export function subscribeRealtime(listener: Listener) {
  listeners.push(listener);
  return () => {
    listeners = listeners.filter((item) => item !== listener);
  };
}

export function publishRealtime(payload: object) {
  const encoded = JSON.stringify(payload);
  if (socket?.readyState === WebSocket.OPEN) socket.send(encoded);
  else queue.push(encoded);
}

export function isRealtimeConfigured() {
  return Boolean(endpoint());
}