// Core domain types — PRD Modules 1, 4, 8.

export type Receipt = 'sending' | 'sent' | 'delivered' | 'read';
export type MessageKind = 'text' | 'image' | 'voice' | 'system';

export interface Reaction {
  emoji: string;
  by: string;
}

export interface ChatMessage {
  id: string;
  chatId: string;
  sender: string; // 'me' | contact name
  mine: boolean;
  kind: MessageKind;
  text: string;
  createdAt: number;
  receipt: Receipt;
  replyToId?: string;
  reactions: Reaction[];
  hidden?: boolean;
  threadCount?: number;
  offlineQueued?: boolean;
}

export interface TangentThread {
  id: string;
  rootMessageId: string;
  chatId: string;
  title: string;
  messageIds: string[];
  ephemeralSecs?: number;
}

export interface Chat {
  id: string;
  name: string;
  isGroup: boolean;
  lastSeen?: string;
  online?: boolean;
  unread: number;
  draft?: string;
  // Message-request gating: strangers start as a request that must be accepted.
  requestStatus?: 'active' | 'pending-sent' | 'pending-received';
  username?: string;
  phone?: string;
}

// Public directory profile — what username search / QR resolve to.
// (Phase 1: local stub. Backend: Matrix user directory / custom lookup.)
export interface DirectoryUser {
  id: string;
  name: string;
  username: string; // unique, lowercase, e.g. "anya_roams"
  phone: string; // E.164-ish digits
}

// Encoded in the profile QR: `tangent://add/<username>`
export function qrPayloadFor(username: string) {
  return `tangent://add/${username.toLowerCase()}`;
}

export function usernameFromQrPayload(payload: string): string | null {
  const m = payload.trim().match(/^tangent:\/\/add\/([a-z0-9._-]{3,24})$/i);
  return m ? m[1].toLowerCase() : null;
}

export function normalizePhone(raw: string) {
  return raw.replace(/[^\d+]/g, '');
}

export function isValidUsername(u: string) {
  return /^[a-z0-9._-]{3,24}$/.test(u);
}
