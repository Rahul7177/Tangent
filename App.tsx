import React, { useEffect, useState } from 'react';
import { ActivityIndicator, View } from 'react-native';
import { StatusBar } from 'expo-status-bar';
import { SafeAreaProvider } from 'react-native-safe-area-context';
import { GestureHandlerRootView } from 'react-native-gesture-handler';
import { ThemeProvider, useTheme } from './src/theme/ThemeContext';
import { RootNavigator } from './src/navigation/RootNavigator';

// Fonts per tangent_design.md §2: Cabinet Grotesk + General Sans (Fontshare) +
// JetBrains Mono. Phase 1 uses system-font fallback so the app boots offline;
// add ./assets/fonts/*.ttf (from fontshare.com + jetbrains.com/mono) and
// register them here in Phase 2 polish. Never block launch on fonts.
async function loadFonts() {
  return Promise.resolve();
}

function Shell() {
  const { mode } = useTheme();
  return (
    <View style={{ flex: 1 }}>
      <StatusBar style={mode === 'dark' ? 'light' : 'dark'} />
      <RootNavigator />
    </View>
  );
}

export default function App() {
  const [ready, setReady] = useState(false);
  useEffect(() => {
    let live = true;
    (async () => {
      // Don't hard-block: 1.2s max, then render with system fallback.
      await Promise.race([loadFonts(), new Promise((r) => setTimeout(r, 1200))]);
      if (live) setReady(true);
    })();
    return () => {
      live = false;
    };
  }, []);

  if (!ready) {
    return (
      <View style={{ flex: 1, alignItems: 'center', justifyContent: 'center' }}>
        <ActivityIndicator />
      </View>
    );
  }

  return (
    <GestureHandlerRootView style={{ flex: 1 }}>
      <SafeAreaProvider>
        <ThemeProvider>
          <Shell />
        </ThemeProvider>
      </SafeAreaProvider>
    </GestureHandlerRootView>
  );
}
