import { Ionicons } from '@expo/vector-icons';
import { Pressable, StyleSheet, Text, View } from 'react-native';
import { useSafeAreaInsets } from 'react-native-safe-area-context';

import { useTranslation } from '../i18n/LocaleContext';
import { useAppTheme } from '../theme/ThemeContext';

interface ScreenHeaderProps {
  title: string;
  onBack?: () => void;
  backIcon?: keyof typeof Ionicons.glyphMap;
  rightLabel?: string;
  rightIcon?: keyof typeof Ionicons.glyphMap;
  onRightPress?: () => void;
  rightDisabled?: boolean;
  /** Whether the right control has a filled pill background. Defaults to true for a label, false for an icon-only control. */
  rightFilled?: boolean;
}

export default function ScreenHeader({
  title,
  onBack,
  backIcon = 'chevron-back',
  rightLabel,
  rightIcon,
  onRightPress,
  rightDisabled,
  rightFilled = rightLabel !== undefined,
}: ScreenHeaderProps) {
  const theme = useAppTheme();
  const insets = useSafeAreaInsets();
  const { t } = useTranslation();

  return (
    <View style={[styles.container, { backgroundColor: theme.background, paddingTop: insets.top }]}>
      <View style={styles.row}>
        <View style={styles.side}>
          {onBack ? (
            <Pressable hitSlop={12} onPress={onBack} accessibilityLabel={t('nav.goBack')}>
              <Ionicons name={backIcon} size={24} color={theme.text} />
            </Pressable>
          ) : null}
        </View>
        <Text style={[styles.title, { color: theme.text }]} numberOfLines={1}>
          {title}
        </Text>
        <View style={[styles.side, styles.rightSide]}>
          {rightLabel || rightIcon ? (
            <Pressable
              hitSlop={12}
              onPress={onRightPress}
              disabled={rightDisabled}
              style={[
                rightFilled && (rightIcon ? styles.rightIconButton : styles.rightLabelButton),
                rightFilled && { backgroundColor: rightDisabled ? theme.surfaceAlt : theme.primary },
              ]}
            >
              {rightIcon ? (
                <Ionicons
                  name={rightIcon}
                  size={rightFilled ? 18 : 22}
                  color={rightDisabled ? theme.mutedText : rightFilled ? theme.primaryText : theme.text}
                />
              ) : (
                <Text
                  style={[
                    styles.rightLabel,
                    { color: rightDisabled ? theme.mutedText : theme.primaryText },
                  ]}
                >
                  {rightLabel}
                </Text>
              )}
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
    minWidth: 40,
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
  rightIconButton: {
    width: 36,
    height: 36,
    borderRadius: 18,
    alignItems: 'center',
    justifyContent: 'center',
  },
  rightLabelButton: {
    paddingHorizontal: 14,
    paddingVertical: 7,
    borderRadius: 14,
  },
  rightLabel: {
    fontSize: 14,
    fontWeight: '700',
  },
});
