export type ThemeMode = 'light' | 'dark';

export interface AppTheme {
  mode: ThemeMode;
  background: string;
  surface: string;
  surfaceAlt: string;
  card: string;
  border: string;
  text: string;
  subtleText: string;
  mutedText: string;
  primary: string;
  primaryText: string;
  accent: string;
  danger: string;
  success: string;
  successBg: string;
  warning: string;
  warningBg: string;
  tabInactive: string;
  /** Rounded highlight pill behind the active bottom-tab icon/label. */
  tabActiveBg: string;
  headerBg: string;
  overlay: string;
  /** Backdrop gradient glow rendered behind glass surfaces, top of screen fading to transparent. */
  backdropGradient: [string, string];
  /** Tint overlay painted on top of the blur for the frosted-glass surfaces (cards, header, tab bar, sheets). */
  glassOverlay: string;
  /** Hairline highlight border on glass surfaces. */
  glassBorder: string;
  /** expo-blur tint mode and intensity for glass surfaces. */
  blurTint: 'light' | 'dark';
  blurIntensity: number;
}

export const lightTheme: AppTheme = {
  mode: 'light',
  background: '#F5F6FA',
  surface: '#FFFFFF',
  surfaceAlt: '#F3F4F6',
  card: '#FFFFFF',
  border: '#E8E9EF',
  text: '#12131A',
  subtleText: '#6B7280',
  mutedText: '#9CA3AF',
  primary: '#5B5FEF',
  primaryText: '#FFFFFF',
  accent: '#5B5FEF',
  danger: '#EF4444',
  success: '#16A34A',
  successBg: '#DCFCE7',
  warning: '#D97706',
  warningBg: '#FEF3C7',
  tabInactive: '#9CA3AF',
  tabActiveBg: 'rgba(91, 95, 239, 0.12)',
  headerBg: '#F5F6FA',
  overlay: 'rgba(17, 24, 39, 0.35)',
  backdropGradient: ['rgba(91, 95, 239, 0.20)', 'rgba(245, 246, 250, 0)'],
  glassOverlay: 'rgba(255, 255, 255, 0.55)',
  glassBorder: 'rgba(255, 255, 255, 0.6)',
  blurTint: 'light',
  blurIntensity: 40,
};

export const darkTheme: AppTheme = {
  mode: 'dark',
  background: '#0D1526',
  surface: '#16203A',
  surfaceAlt: '#1B2745',
  card: '#16203A',
  border: '#2A3655',
  text: '#F5F7FF',
  subtleText: '#96A3C4',
  mutedText: '#5F6C8F',
  primary: '#818CF8',
  primaryText: '#FFFFFF',
  accent: '#9AA5FA',
  danger: '#F87171',
  success: '#4ADE80',
  successBg: 'rgba(74, 222, 128, 0.16)',
  warning: '#FBBF24',
  warningBg: 'rgba(251, 191, 36, 0.16)',
  tabInactive: '#5F6C8F',
  tabActiveBg: 'rgba(129, 140, 248, 0.18)',
  headerBg: '#0D1526',
  overlay: 'rgba(0, 0, 0, 0.55)',
  backdropGradient: ['rgba(129, 140, 248, 0.30)', 'rgba(13, 21, 38, 0)'],
  glassOverlay: 'rgba(22, 32, 58, 0.55)',
  glassBorder: 'rgba(255, 255, 255, 0.08)',
  blurTint: 'dark',
  blurIntensity: 35,
};

export const themes: Record<ThemeMode, AppTheme> = {
  light: lightTheme,
  dark: darkTheme,
};
