import { StatusBar } from 'expo-status-bar';
import type { ReactNode } from 'react';
import { Image, StyleSheet, View, type LayoutChangeEvent } from 'react-native';

import { useAppTheme } from '../theme/ThemeContext';

/**
 * Width of the logo. Must stay equal to `imageWidth` in the `expo-splash-screen`
 * plugin entry in `app.json` — the two are coupled, and a mismatch shows up as the
 * logo jumping size when the native splash hands off to this component.
 */
const LOGO_WIDTH = 200;

interface AppSplashProps {
  /** Rendered below the logo — a preparing message, or a failure message with a retry action. */
  children?: ReactNode;
  onLayout?: (event: LayoutChangeEvent) => void;
}

/**
 * Repeats the native splash composition inside the app: the same artwork, centred on the
 * same background, so launch reads as one continuous branded sequence.
 */
export default function AppSplash({ children, onLayout }: AppSplashProps) {
  const theme = useAppTheme();

  return (
    <View style={[styles.container, { backgroundColor: theme.background }]} onLayout={onLayout}>
      <Image
        source={require('../../assets/splash-icon.png')}
        style={styles.logo}
        resizeMode="contain"
        accessibilityIgnoresInvertColors
      />
      {children ? <View style={styles.content}>{children}</View> : null}
      <StatusBar style={theme.mode === 'dark' ? 'light' : 'dark'} />
    </View>
  );
}

const styles = StyleSheet.create({
  container: {
    flex: 1,
    alignItems: 'center',
    justifyContent: 'center',
  },
  logo: {
    width: LOGO_WIDTH,
    height: LOGO_WIDTH,
  },
  // Absolutely positioned so the logo stays exactly centred whether or not there is a
  // message below it — that is what keeps the logo from shifting as the splash hands off.
  content: {
    position: 'absolute',
    top: '50%',
    left: 0,
    right: 0,
    marginTop: LOGO_WIDTH / 2 + 24,
    alignItems: 'center',
    gap: 16,
    paddingHorizontal: 24,
  },
});
