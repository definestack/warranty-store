import { Ionicons } from '@expo/vector-icons';
import { Pressable, StyleSheet, Text, View } from 'react-native';

import GlassSurface from './GlassSurface';
import { useAppTheme } from '../theme/ThemeContext';

interface ScreenHeaderProps {
  title: string;
  onBack?: () => void;
  rightLabel?: string;
  onRightPress?: () => void;
  rightDisabled?: boolean;
}

export default function ScreenHeader({
  title,
  onBack,
  rightLabel,
  onRightPress,
  rightDisabled,
}: ScreenHeaderProps) {
  const theme = useAppTheme();

  return (
    <GlassSurface style={styles.container}>
      <View style={styles.side}>
        {onBack ? (
          <Pressable hitSlop={12} onPress={onBack} accessibilityLabel="Go back">
            <Ionicons name="chevron-back" size={26} color={theme.text} />
          </Pressable>
        ) : null}
      </View>
      <Text style={[styles.title, { color: theme.text }]} numberOfLines={1}>
        {title}
      </Text>
      <View style={[styles.side, styles.rightSide]}>
        {rightLabel ? (
          <Pressable hitSlop={12} onPress={onRightPress} disabled={rightDisabled}>
            <Text
              style={[
                styles.rightLabel,
                { color: rightDisabled ? theme.mutedText : theme.primary },
              ]}
            >
              {rightLabel}
            </Text>
          </Pressable>
        ) : null}
      </View>
    </GlassSurface>
  );
}

const styles = StyleSheet.create({
  container: {
    flexDirection: 'row',
    alignItems: 'center',
    minHeight: 56,
    paddingHorizontal: 16,
  },
  side: {
    width: 48,
    justifyContent: 'center',
  },
  rightSide: {
    alignItems: 'flex-end',
  },
  title: {
    flex: 1,
    textAlign: 'center',
    fontSize: 18,
    fontWeight: '600',
  },
  rightLabel: {
    fontSize: 16,
    fontWeight: '600',
  },
});
