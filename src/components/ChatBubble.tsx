import React, { useEffect, useRef } from 'react';
import { Animated, PanResponder, Platform, Pressable, StyleSheet, Text, View } from 'react-native';
import { LinearGradient } from 'expo-linear-gradient';
import { ChatMessage } from '../lib/types';
import { useTheme } from '../theme/ThemeContext';
import { gradients, radius, typeScale } from '../theme/tokens';
import { haptic } from '../lib/haptics';
import { Icon } from './icons';
import { Ticks, formatTime } from './Ticks';

interface Props {
  msg: ChatMessage;
  replyToText?: string;
  replyToSender?: string;
  showSenderName?: boolean;
  onSwipeReply: () => void;
  onLongPress: () => void;
  onTapReaction: (emoji: string) => void;
}

// WhatsApp-style bubble: swipe-right to reply, quoted reply block,
// time + ticks tucked bottom-right, reactions as a small pill.
export function ChatBubble({
  msg,
  replyToText,
  replyToSender,
  showSenderName,
  onSwipeReply,
  onLongPress,
  onTapReaction,
}: Props) {
  const { palette, mode } = useTheme();
  const nativeDriver = Platform.OS !== 'web';
  const mine = msg.mine;
  const reactions = Array.isArray(msg.reactions) ? msg.reactions : [];

  const enterFade = useRef(new Animated.Value(0)).current;
  const enterScale = useRef(new Animated.Value(0.96)).current;
  const enterDy = useRef(new Animated.Value(6)).current;
  const dragX = useRef(new Animated.Value(0)).current;
  const replied = useRef(false);

  useEffect(() => {
    Animated.parallel([
      Animated.timing(enterFade, { toValue: 1, duration: 180, useNativeDriver: nativeDriver }),
      Animated.timing(enterScale, { toValue: 1, duration: 180, useNativeDriver: nativeDriver }),
      Animated.timing(enterDy, { toValue: 0, duration: 180, useNativeDriver: nativeDriver }),
    ]).start();
  }, [enterFade, enterScale, enterDy]);

  // Swipe-to-reply slides inward (theirs → right, mine → left) so the bubble
  // never pushes off-screen; the reply icon is revealed on the trailing side.
  const dir = mine ? -1 : 1;
  const pan = useRef(
    PanResponder.create({
      onMoveShouldSetPanResponder: (_, g) =>
        dir * g.dx > 14 && Math.abs(g.dx) > Math.abs(g.dy) * 1.4,
      onPanResponderMove: (_, g) => {
        const along = Math.max(0, Math.min(72, dir * g.dx));
        dragX.setValue(dir * along);
        if (along > 48 && !replied.current) {
          replied.current = true;
          haptic.swipeThreshold();
          onSwipeReply();
        }
      },
      onPanResponderRelease: () => {
        replied.current = false;
        Animated.timing(dragX, { toValue: 0, duration: 200, useNativeDriver: nativeDriver }).start();
      },
      onPanResponderTerminate: () => {
        replied.current = false;
        Animated.timing(dragX, { toValue: 0, duration: 200, useNativeDriver: nativeDriver }).start();
      },
    }),
  ).current;

  const dragDistance = dragX.interpolate({
    inputRange: mine ? [-72, 0] : [0, 72],
    outputRange: [72, 0],
    extrapolate: 'clamp',
  });
  const iconOpacity = dragDistance.interpolate({
    inputRange: [20, 52],
    outputRange: [0, 1],
    extrapolate: 'clamp',
  });

  const senderGrad = gradients[mode].sender;
  // Own bubble is saturated mint (like the reference) → deep-pine ink on top.
  // Their bubble is the neutral surface → regular primary/secondary text.
  const ink = mine ? palette.onAccent : palette.textPrimary;
  const inkDim = mine ? palette.onAccent : palette.textSecondary;

  const body = (
    <>
      {!mine && showSenderName ? (
        <Text style={[styles.sender, { color: palette.ember }]} numberOfLines={1}>
          {msg.sender}
        </Text>
      ) : null}
      {replyToText ? (
        <View style={[styles.quote, { backgroundColor: mine ? 'rgba(255,255,255,0.25)' : mode === 'dark' ? 'rgba(255,255,255,0.08)' : 'rgba(0,0,0,0.05)' }]}>
          <View style={[styles.quoteBar, { backgroundColor: mine ? palette.onAccent : palette.ember }]} />
          <View style={styles.quoteBody}>
            {replyToSender ? (
              <Text style={[styles.quoteSender, { color: mine ? palette.onAccent : palette.ember }]} numberOfLines={1}>
                {replyToSender}
              </Text>
            ) : null}
            <Text style={[styles.quoteText, { color: inkDim }]} numberOfLines={2}>
              {replyToText}
            </Text>
          </View>
        </View>
      ) : null}
      <Text style={[styles.text, { color: ink }]}>{msg.text}</Text>
      <View style={styles.metaRow}>
        <Text style={[styles.time, { color: inkDim }]}>{formatTime(msg.createdAt)}</Text>
        {mine ? <Ticks receipt={msg.receipt} color={inkDim} readColor={ink} /> : null}
      </View>
    </>
  );

  return (
    <Animated.View style={{ opacity: enterFade, transform: [{ scale: enterScale }, { translateY: enterDy }] }}>
      {/* Reply icon floats absolutely — zero layout footprint, so both sides
          keep symmetric edge margins and the bubble slides over it on drag */}
      <View style={[styles.row, { justifyContent: mine ? 'flex-end' : 'flex-start' }]}>
        <Animated.View
          pointerEvents="none"
          style={[styles.replyIconFloat, { opacity: iconOpacity, left: mine ? undefined : 0, right: mine ? 0 : undefined }]}
        >
          <Icon name="reply" size={18} color={palette.textSecondary} />
        </Animated.View>
        <Animated.View
          style={[styles.bubbleWrap, { transform: [{ translateX: dragX }] }]}
          {...pan.panHandlers}
        >
          <Pressable
            onLongPress={() => {
              haptic.longPressMenu();
              onLongPress();
            }}
            delayLongPress={350}
          >
            {mine ? (
              <LinearGradient
                colors={[senderGrad[0], senderGrad[1]]}
                start={{ x: 0, y: 0 }}
                end={{ x: 1, y: 1 }}
                style={[styles.bubble, mine ? styles.mineRadius : styles.theirsRadius]}
              >
                {body}
              </LinearGradient>
            ) : (
              <View
                style={[
                  styles.bubble,
                  styles.theirsRadius,
                  {
                    backgroundColor: palette.bgSurface,
                    borderColor: palette.glassBorder,
                    borderWidth: 1,
                  },
                ]}
              >
                {body}
              </View>
            )}
          </Pressable>
          {reactions.length > 0 ? (
            <Pressable
              onPress={() => {
                haptic.reaction();
                onTapReaction(reactions[0].emoji);
              }}
              style={[
                styles.reactionPill,
                {
                  backgroundColor: palette.bgSurface,
                  borderColor: mode === 'dark' ? 'transparent' : palette.hairline ?? 'transparent',
                  alignSelf: mine ? 'flex-end' : 'flex-start',
                },
              ]}
            >
              <Text style={{ fontSize: 12 }}>{reactions.map((r) => r.emoji).join(' ')}</Text>
            </Pressable>
          ) : null}
        </Animated.View>
      </View>
    </Animated.View>
  );
}

const styles = StyleSheet.create({
  row: {
    flexDirection: 'row',
    alignItems: 'center',
    marginVertical: 2,
    // Symmetric gutters: both sides rest exactly on the list padding.
    marginHorizontal: 0,
  },
  replyIconFloat: {
    position: 'absolute',
    top: '50%',
    marginTop: -14,
    width: 28,
    height: 28,
    borderRadius: 14,
    alignItems: 'center',
    justifyContent: 'center',
  },
  bubbleWrap: { maxWidth: '82%', minWidth: 96, flexShrink: 1 },
  bubble: {
    borderRadius: radius.bubble,
    paddingHorizontal: 13,
    paddingVertical: 9,
    minWidth: 96,
  },
  mineRadius: { borderTopRightRadius: 4 },
  theirsRadius: { borderTopLeftRadius: 4 },
  sender: { fontSize: typeScale.caption.size, fontWeight: '700', marginBottom: 2 },
  quote: {
    flexDirection: 'row',
    gap: 6,
    borderRadius: 8,
    padding: 6,
    marginBottom: 4,
    alignSelf: 'stretch',
    minWidth: 150,
  },
  quoteBar: { width: 3, borderRadius: 2 },
  quoteBody: { flexShrink: 1 },
  quoteSender: { fontSize: 12, fontWeight: '700' },
  quoteText: { fontSize: 13, lineHeight: 18 },
  text: { fontSize: typeScale.body.size, lineHeight: 22 },
  metaRow: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 4,
    marginTop: 2,
    alignSelf: 'flex-end',
  },
  time: { fontSize: typeScale.micro.size },
  reactionPill: {
    borderRadius: 12,
    borderWidth: 1,
    paddingHorizontal: 8,
    paddingVertical: 2,
    marginTop: -6,
    marginHorizontal: 6,
  },
});
