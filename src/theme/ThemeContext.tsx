import React, { createContext, useContext, useMemo, useState } from 'react';
import { useColorScheme } from 'react-native';
import { darkPalette, lightPalette, Palette, ThemeMode } from './tokens';

interface ThemeCtx {
  mode: ThemeMode;
  palette: Palette;
  toggle: () => void;
  setMode: (m: ThemeMode) => void;
}

const Ctx = createContext<ThemeCtx>({
  mode: 'light',
  palette: lightPalette,
  toggle: () => {},
  setMode: () => {},
});

export function ThemeProvider({
  initial,
  children,
}: {
  initial?: ThemeMode;
  children: React.ReactNode;
}) {
  const system = useColorScheme();
  const [mode, setMode] = useState<ThemeMode>(initial ?? (system === 'dark' ? 'dark' : 'light'));
  const value = useMemo<ThemeCtx>(
    () => ({
      mode,
      palette: mode === 'dark' ? darkPalette : lightPalette,
      toggle: () => setMode((m) => (m === 'dark' ? 'light' : 'dark')),
      setMode,
    }),
    [mode],
  );
  return <Ctx.Provider value={value}>{children}</Ctx.Provider>;
}

export function useTheme() {
  return useContext(Ctx);
}
