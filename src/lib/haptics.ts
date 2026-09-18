import * as Haptics from 'expo-haptics';
import { Platform } from 'react-native';

// Maps tangent_design.md §4 event table to expo-haptics.
// Android VIRTUAL_KEY / iOS UIImpactFeedbackGenerator equivalents.
async function safe(fn: () => Promise<void>) {
  try {
    await fn();
  } catch {
    // Haptics unavailable (web / simulator) — silent no-op.
  }
}

export const haptic = {
  messageSent: () => safe(() => Haptics.impactAsync(Haptics.ImpactFeedbackStyle.Light)),
  longPressMenu: () => safe(() => Haptics.impactAsync(Haptics.ImpactFeedbackStyle.Medium)),
  reaction: () => safe(() => Haptics.impactAsync(Haptics.ImpactFeedbackStyle.Light)),
  stickerSend: () => safe(() => Haptics.impactAsync(Haptics.ImpactFeedbackStyle.Light)),
  swipeThreshold: () => safe(() => Haptics.impactAsync(Haptics.ImpactFeedbackStyle.Light)),
  pullThreshold: () => safe(() => Haptics.impactAsync(Haptics.ImpactFeedbackStyle.Light)),
  audioFallback: () => safe(() => Haptics.impactAsync(Haptics.ImpactFeedbackStyle.Light)),
  networkPoor: () => safe(() => Haptics.impactAsync(Haptics.ImpactFeedbackStyle.Soft)),
  callConnect: () => safe(() => Haptics.notificationAsync(Haptics.NotificationFeedbackType.Success)),
  whisperUnlock: () => safe(() => Haptics.notificationAsync(Haptics.NotificationFeedbackType.Success)),
  whisperFail: () => safe(() => Haptics.notificationAsync(Haptics.NotificationFeedbackType.Error)),
  mention: () =>
    Platform.OS === 'web'
      ? Promise.resolve()
      : safe(() => Haptics.impactAsync(Haptics.ImpactFeedbackStyle.Soft)),
};
