import { Ionicons } from '@expo/vector-icons';
import { Pressable, StyleSheet, Text, View } from 'react-native';
import { useSafeAreaInsets } from 'react-native-safe-area-context';

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
  const insets = useSafeAreaInsets();

  return (
    <View style={[styles.container, { backgroundColor: theme.background, paddingTop: insets.top }]}>
      <View style={styles.row}>
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
            <Pressable
              hitSlop={12}
              onPress={onRightPress}
              disabled={rightDisabled}
              style={[
                styles.rightButton,
                { backgroundColor: rightDisabled ? theme.surfaceAlt : theme.primary },
              ]}
            >
              <Text
                style={[
                  styles.rightLabel,
                  { color: rightDisabled ? theme.mutedText : theme.primaryText },
                ]}
              >
                {rightLabel}
              </Text>
            </Pressable>
          ) : null}
        </View>
      </View>
    </View>
  );
}

const styles = StyleSheet.create({
  container: {},
  row: {
    flexDirection: 'row',
    alignItems: 'center',
    minHeight: 56,
    paddingHorizontal: 16,
  },
  side: {
    minWidth: 48,
    justifyContent: 'center',
  },
  rightSide: {
    alignItems: 'flex-end',
  },
  title: {
    flex: 1,
    textAlign: 'center',
    fontSize: 18,
    fontWeight: '700',
  },
  rightButton: {
    paddingHorizontal: 14,
    paddingVertical: 7,
    borderRadius: 14,
  },
  rightLabel: {
    fontSize: 14,
    fontWeight: '700',
  },
});
