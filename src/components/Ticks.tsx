import React from 'react';
import { Receipt } from '../lib/types';
import { useTheme } from '../theme/ThemeContext';
import { Icon } from './icons';

// WhatsApp-style ticks as custom geometry (no emoji glyphs):
// clock → single check → double check grey → double check accent (read).
// Shape (single vs double) carries meaning too, never color alone.
// Optional color/readColor let callers retint ticks on tinted surfaces
// (e.g. deep-pine ticks on the mint own-bubble).
export function Ticks({
  receipt,
  color,
  readColor,
}: {
  receipt: Receipt;
  color?: string;
  readColor?: string;
}) {
  const { palette } = useTheme();
  const dim = color ?? palette.textSecondary;
  const read = readColor ?? palette.ember;
  if (receipt === 'sending') {
    return <Icon name="clock" size={13} color={dim} />;
  }
  if (receipt === 'sent') {
    return <Icon name="check" size={13} color={dim} />;
  }
  if (receipt === 'delivered') {
    return <Icon name="doubleCheck" size={15} color={dim} />;
  }
  return <Icon name="doubleCheck" size={15} color={read} />;
}

export function formatTime(ts: number) {
  return new Date(ts).toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' });
}
