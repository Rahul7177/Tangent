// Tangent design tokens — airy ice glass in light mode, midnight glass in dark.
// Blue is the functional accent; atmosphere comes from translucent layered color
// washes and grain rather than opaque panels or neon effects.

export const spacing = {
  xs: 4,
  sm: 8,
  md: 12,
  lg: 16,
  xl: 24,
  xxl: 32,
  xxxl: 48,
  huge: 64,
} as const;

export const radius = {
  chip: 4,
  button: 10,
  bubble: 16,
  sheet: 24,
} as const;

export const motion = {
  ease: 'cubic-bezier(0.2, 0.8, 0.2, 1)',
  micro: 200, // 180-220ms micro-interactions
  screen: 280, // 260-320ms screen/sheet transitions
  weather: 400, // network weather morph
} as const;

export type ThemeMode = 'light' | 'dark';

export interface Palette {
  bgBase: string;
  bgSurface: string;
  bgRaised: string;
  textPrimary: string;
  textSecondary: string;
  hairline: string | null; // null on dark — use shadow instead
  shadow: string | null; // only meaningful on dark / floating surfaces
  ember: string; // accent: electric blue (name kept for API stability)
  emberPressed: string;
  onAccent: string; // text drawn ON TOP of the accent
  glass: string; // frosted-bar fill (header / composer / tab bar) — low alpha so blur shows
  good: string;
  weak: string;
  bad: string;
}

export const lightPalette: Palette = {
  bgBase: '#EAF5FA',
  bgSurface: 'rgba(255,255,255,0.62)',
  bgRaised: 'rgba(255,255,255,0.78)',
  textPrimary: '#10202B',
  textSecondary: '#607583',
  hairline: 'rgba(126,164,183,0.28)',
  shadow: null,
  ember: '#2F7BFF',
  emberPressed: '#1E5FD3',
  onAccent: '#FFFFFF',
  glass: 'rgba(255,255,255,0.54)',
  good: '#3E7A5C',
  weak: '#A9812E',
  bad: '#A8443A',
};

export const darkPalette: Palette = {
  bgBase: '#0B1421',
  bgSurface: 'rgba(24,38,55,0.68)',
  bgRaised: 'rgba(55,76,98,0.56)',
  textPrimary: '#F3F8FC',
  textSecondary: '#A7BBC9',
  hairline: null,
  shadow: '0 2px 12px rgba(0,0,0,0.35)',
  ember: '#65A3FF',
  emberPressed: '#3F83E8',
  onAccent: '#061326',
  glass: 'rgba(15,29,44,0.54)',
  good: '#6FA37E',
  weak: '#CBA354',
  bad: '#D26858',
};

// Dynamic gradients — cool ambient washes (hero/card) + blue actions
// (primary CTA, sender own-bubble). No tinted neutrals anywhere.
export type GradientStop = [string, string];

export const gradients: Record<ThemeMode, { primary: GradientStop; hero: GradientStop; card: GradientStop; sender: GradientStop }> = {
  light: {
    primary: ['#1E5FD3', '#65A3FF'],
    hero: ['#F9FDFF', '#DDEFFA'],
    card: ['rgba(255,255,255,0.82)', 'rgba(221,239,250,0.66)'],
    sender: ['#D8E7FF', '#BBD4FF'],
  },
  dark: {
    primary: ['#65A3FF', '#2F7BFF'],
    hero: ['#0A1523', '#152D43'],
    card: ['rgba(28,49,69,0.82)', 'rgba(12,25,39,0.72)'],
    sender: ['#5D99F5', '#2F6FD9'],
  },
};

// Type scale — tangent_design.md §2
// display/title: Cabinet Grotesk · heading/body/caption/micro: General Sans
// metadata: JetBrains Mono
export const fonts = {
  display: 'CabinetGrotesk',
  title: 'CabinetGrotesk',
  ui: 'GeneralSans',
  mono: 'JetBrainsMono',
} as const;

export const typeScale = {
  display: { size: 34, lineHeight: 40, weight: '600' as const, family: fonts.display },
  title: { size: 24, lineHeight: 30, weight: '600' as const, family: fonts.title },
  heading: { size: 20, lineHeight: 28, weight: '600' as const, family: fonts.ui },
  body: { size: 16, lineHeight: 26, weight: '400' as const, family: fonts.ui },
  bodyMedium: { size: 16, lineHeight: 26, weight: '500' as const, family: fonts.ui },
  caption: { size: 13, lineHeight: 20, weight: '500' as const, family: fonts.ui },
  micro: { size: 11, lineHeight: 16, weight: '500' as const, family: fonts.ui },
  mono: { size: 12, lineHeight: 16, weight: '500' as const, family: fonts.mono },
} as const;
