import { useEffect, useState } from 'react';

export type NetQuality = 'good' | 'weak' | 'offline' | 'unknown';

// Connection-aware hook (PRD Module 5 + design "Network Weather").
// Uses @react-native-community/netinfo when available, degrades to
// navigator.onLine on web, and always exposes a manual override for demos.
export function useNetworkWeather(override?: NetQuality) {
  const [quality, setQuality] = useState<NetQuality>(override ?? 'unknown');

  useEffect(() => {
    if (override) {
      setQuality(override);
      return;
    }
    let mounted = true;
    (async () => {
      try {
        // Lazy require so web / Expo Go without the module still works.
        // eslint-disable-next-line @typescript-eslint/no-var-requires
        const NetInfo = require('@react-native-community/netinfo').default;
        const sub = NetInfo.addEventListener((state: any) => {
          if (!mounted) return;
          if (!state.isConnected) setQuality('offline');
          else if (state.type === 'cellular' && state.details?.cellularGeneration === '2g')
            setQuality('weak');
          else if (state.isInternetReachable === false) setQuality('weak');
          else setQuality('good');
        });
        return () => sub && sub();
      } catch {
        if (typeof navigator !== 'undefined' && 'onLine' in navigator) {
          setQuality(navigator.onLine ? 'good' : 'offline');
        } else {
          setQuality('good');
        }
      }
    })();
    return () => {
      mounted = false;
    };
  }, [override]);

  return quality;
}

export const qualityLabel: Record<NetQuality, string> = {
  good: 'Connected',
  weak: 'Low signal — audio only',
  offline: 'Offline — sending when back online',
  unknown: 'Checking connection…',
};
