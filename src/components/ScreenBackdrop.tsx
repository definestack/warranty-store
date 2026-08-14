import { LinearGradient } from 'expo-linear-gradient';
import { StyleSheet } from 'react-native';

import { useAppTheme } from '../theme/ThemeContext';

/** Soft color glow behind the top of a screen, so glass surfaces have something to blur. */
export default function ScreenBackdrop() {
  const theme = useAppTheme();

  return (
    <LinearGradient
      colors={theme.backdropGradient}
      style={styles.gradient}
      pointerEvents="none"
    />
  );
}

const styles = StyleSheet.create({
  gradient: {
    position: 'absolute',
    top: 0,
    left: 0,
    right: 0,
    height: 340,
  },
});
