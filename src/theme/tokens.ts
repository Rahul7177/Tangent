// Tangent design tokens — white/blue glass in light mode, black/blue glass in dark.
// The canvas stays neutral; blue belongs to soft atmospheric blooms and actions.

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
  bgBase: '#FFFFFF',
  bgSurface: 'rgba(255,255,255,0.58)',
  bgRaised: 'rgba(255,255,255,0.76)',
  textPrimary: '#080B10',
  textSecondary: '#68717C',
  hairline: 'rgba(100,116,136,0.22)',
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
  bgBase: '#000000',
  bgSurface: 'rgba(18,20,24,0.72)',
  bgRaised: 'rgba(38,42,50,0.62)',
  textPrimary: '#F7F9FC',
  textSecondary: '#9EA7B3',
  hairline: null,
  shadow: '0 2px 12px rgba(0,0,0,0.35)',
  ember: '#65A3FF',
  emberPressed: '#3F83E8',
  onAccent: '#061326',
  glass: 'rgba(12,14,18,0.58)',
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
    hero: ['#FFFFFF', '#FFFFFF'],
    card: ['rgba(255,255,255,0.76)', 'rgba(255,255,255,0.48)'],
    sender: ['#D8E7FF', '#BBD4FF'],
  },
  dark: {
    primary: ['#65A3FF', '#2F7BFF'],
    hero: ['#000000', '#000000'],
    card: ['rgba(24,26,31,0.82)', 'rgba(8,9,12,0.72)'],
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
