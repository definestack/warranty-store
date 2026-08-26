import { MD3DarkTheme, MD3LightTheme } from 'react-native-paper';
import type { MD3Theme } from 'react-native-paper';

export type ThemeMode = 'light' | 'dark';

export interface AppTheme {
  mode: ThemeMode;
  /** The underlying react-native-paper MD3 theme, for components rendered with Paper directly. */
  paper: MD3Theme;
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
  primaryContainer: string;
  onPrimaryContainer: string;
  accent: string;
  danger: string;
  dangerBg: string;
  success: string;
  successBg: string;
  warning: string;
  warningBg: string;
  tabInactive: string;
  /** Rounded highlight pill behind the active bottom-tab icon/label. */
  tabActiveBg: string;
  headerBg: string;
  /** Dimming scrim behind modal sheets. */
  overlay: string;
}

function buildTheme(mode: ThemeMode, paper: MD3Theme): AppTheme {
  const isDark = mode === 'dark';
  const c = paper.colors;

  return {
    mode,
    paper,
    // The splash `backgroundColor` literals in `app.json` (#FFFBFE light, #1C1B1F dark)
    // must stay equal to these MD3 light/dark `background` values. Native splash config
    // cannot import from TypeScript, so the pair is duplicated; if they drift, the splash
    // steps colour as it hands off to the first screen.
    background: c.background,
    surface: c.surface,
    surfaceAlt: c.surfaceVariant,
    card: c.elevation.level1,
    border: c.outlineVariant,
    text: c.onSurface,
    subtleText: c.onSurfaceVariant,
    mutedText: c.outline,
    primary: c.primary,
    primaryText: c.onPrimary,
    primaryContainer: c.primaryContainer,
    onPrimaryContainer: c.onPrimaryContainer,
    accent: c.secondary,
    danger: c.error,
    dangerBg: c.errorContainer,
    success: isDark ? '#4ADE80' : '#16A34A',
    successBg: isDark ? 'rgba(74, 222, 128, 0.16)' : '#DCFCE7',
    warning: isDark ? '#FBBF24' : '#D97706',
    warningBg: isDark ? 'rgba(251, 191, 36, 0.16)' : '#FEF3C7',
    tabInactive: c.onSurfaceVariant,
    tabActiveBg: c.secondaryContainer,
    headerBg: c.surface,
    overlay: c.backdrop,
  };
}

export const lightTheme = buildTheme('light', MD3LightTheme);
export const darkTheme = buildTheme('dark', MD3DarkTheme);

export const themes: Record<ThemeMode, AppTheme> = {
  light: lightTheme,
  dark: darkTheme,
};
