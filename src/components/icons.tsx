import React from 'react';
import { Pressable, StyleSheet, View } from 'react-native';
import Svg, { Circle, Line, Path, Polyline } from 'react-native-svg';

export type IconName =
  | 'back'
  | 'forward'
  | 'close'
  | 'plus'
  | 'send'
  | 'mic'
  | 'video'
  | 'phone'
  | 'lock'
  | 'reply'
  | 'copy'
  | 'edit'
  | 'trash'
  | 'thread'
  | 'chat'
  | 'gear'
  | 'search'
  | 'check'
  | 'doubleCheck'
  | 'clock'
  | 'shield';

// Single custom line-icon set: 24×24 viewBox, 1.8 stroke, round caps.
// One geometry language everywhere keeps buttons/icons symmetric by construction.
export function Icon({
  name,
  size = 22,
  color = '#000',
  strokeWidth = 1.8,
}: {
  name: IconName;
  size?: number;
  color?: string;
  strokeWidth?: number;
}) {
  const p = {
    stroke: color,
    strokeWidth,
    strokeLinecap: 'round' as const,
    strokeLinejoin: 'round' as const,
    fill: 'none' as const,
  };
  return (
    <Svg width={size} height={size} viewBox="0 0 24 24">
      {name === 'back' && <Polyline points="15 5 8 12 15 19" {...p} />}
      {name === 'forward' && <Polyline points="9 5 16 12 9 19" {...p} />}
      {name === 'close' && (
        <>
          <Line x1="6" y1="6" x2="18" y2="18" {...p} />
          <Line x1="18" y1="6" x2="6" y2="18" {...p} />
        </>
      )}
      {name === 'plus' && (
        <>
          <Line x1="12" y1="5" x2="12" y2="19" {...p} />
          <Line x1="5" y1="12" x2="19" y2="12" {...p} />
        </>
      )}
      {name === 'send' && (
        <>
          <Line x1="12" y1="19" x2="12" y2="5" {...p} />
          <Polyline points="5 12 12 5 19 12" {...p} />
        </>
      )}
      {name === 'mic' && (
        <>
          <Path d="M12 3a3 3 0 0 1 3 3v5a3 3 0 0 1-6 0V6a3 3 0 0 1 3-3z" {...p} />
          <Path d="M6 11a6 6 0 0 0 12 0" {...p} />
          <Line x1="12" y1="17" x2="12" y2="21" {...p} />
        </>
      )}
      {name === 'video' && (
        <>
          <Path d="M3 8h11v8H3z" {...p} />
          <Polyline points="14 11 20 7 20 17 14 14" {...p} />
        </>
      )}
      {name === 'phone' && (
        <Path
          d="M5 4h4l2 5-2.5 1.5a12 12 0 0 0 5 5L15 13l5 2v4a2 2 0 0 1-2 2A16 16 0 0 1 3 6a2 2 0 0 1 2-2z"
          {...p}
        />
      )}
      {name === 'lock' && (
        <>
          <Path d="M6 11h12v9H6z" {...p} />
          <Path d="M8 11V8a4 4 0 0 1 8 0v3" {...p} />
        </>
      )}
      {name === 'shield' && <Path d="M12 3l7 3v5c0 5-3.5 8-7 10-3.5-2-7-5-7-10V6z" {...p} />}
      {name === 'reply' && (
        <>
          <Polyline points="9 14 4 9 9 4" {...p} />
          <Path d="M4 9h9a7 7 0 0 1 7 7v3" {...p} />
        </>
      )}
      {name === 'copy' && (
        <>
          <Path d="M9 9h10v11H9z" {...p} />
          <Path d="M5 15V4h10" {...p} />
        </>
      )}
      {name === 'edit' && <Path d="M4 20l1-4L16.5 4.5a2.1 2.1 0 0 1 3 3L8 19z" {...p} />}
      {name === 'trash' && (
        <>
          <Path d="M4 7h16" {...p} />
          <Path d="M9 7V4h6v3" {...p} />
          <Path d="M6 7l1 13h10l1-13" {...p} />
        </>
      )}
      {name === 'thread' && (
        <>
          <Circle cx="6" cy="6" r="2.5" {...p} />
          <Circle cx="6" cy="18" r="2.5" {...p} />
          <Path d="M6 8.5v7" {...p} />
          <Path d="M6 12h6a4 4 0 0 1 4 4v2" {...p} />
        </>
      )}
      {name === 'chat' && <Path d="M4 6h16v10H9l-5 4z" {...p} />}
      {name === 'gear' && (
        <>
          <Circle cx="12" cy="12" r="3" {...p} />
          <Path
            d="M12 2.5v3M12 18.5v3M2.5 12h3M18.5 12h3M5.3 5.3l2.1 2.1M16.6 16.6l2.1 2.1M18.7 5.3l-2.1 2.1M7.4 16.6l-2.1 2.1"
            {...p}
          />
        </>
      )}
      {name === 'search' && (
        <>
          <Circle cx="11" cy="11" r="6" {...p} />
          <Line x1="15.5" y1="15.5" x2="20" y2="20" {...p} />
        </>
      )}
      {(name === 'check' || name === 'doubleCheck') &&
        (name === 'check' ? (
          <Polyline points="4.5 12.5 10 18 19.5 6.5" {...p} strokeWidth={2.2} />
        ) : (
          <>
            <Polyline points="2 12.5 6.5 17 14 7" {...p} strokeWidth={2.2} opacity={0.6} />
            <Polyline points="9 12.5 13.5 17 22 7" {...p} strokeWidth={2.2} />
          </>
        ))}
      {name === 'clock' && (
        <>
          <Circle cx="12" cy="12" r="8" {...p} />
          <Polyline points="12 8 12 12 15 14" {...p} />
        </>
      )}
    </Svg>
  );
}

// Fixed-geometry press target: same width/height/radius everywhere it is used,
// content perfectly centered — symmetry by construction, not eyeballing.
export function IconButton({
  name,
  onPress,
  color,
  backgroundColor = 'transparent',
  size = 44,
  iconSize = 22,
  label,
}: {
  name: IconName;
  onPress: () => void;
  color: string;
  backgroundColor?: string;
  size?: number;
  iconSize?: number;
  label?: string;
}) {
  return (
    <Pressable
      onPress={onPress}
      accessibilityLabel={label ?? name}
      accessibilityRole="button"
      hitSlop={6}
      style={[styles.btn, { width: size, height: size, borderRadius: size / 2, backgroundColor }]}
    >
      <Icon name={name} size={iconSize} color={color} />
    </Pressable>
  );
}

// Non-interactive twin with identical geometry for rows that mix static + tappable icons.
export function IconSlot({
  name,
  color,
  size = 44,
  iconSize = 22,
}: {
  name: IconName;
  color: string;
  size?: number;
  iconSize?: number;
}) {
  return (
    <View style={[styles.btn, { width: size, height: size, borderRadius: size / 2 }]}>
      <Icon name={name} size={iconSize} color={color} />
    </View>
  );
}

const styles = StyleSheet.create({
  btn: { alignItems: 'center', justifyContent: 'center' },
});
