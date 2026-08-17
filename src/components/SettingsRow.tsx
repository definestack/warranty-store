import { Ionicons } from '@expo/vector-icons';
import { Pressable, StyleSheet, Switch, Text, View } from 'react-native';

import { useAppTheme } from '../theme/ThemeContext';

interface SettingsRowProps {
  icon: keyof typeof Ionicons.glyphMap;
  label: string;
  subtitle?: string;
  trailingText?: string;
  chevron?: 'down' | 'forward' | 'none';
  onPress?: () => void;
  toggleValue?: boolean;
  onToggleChange?: (value: boolean) => void;
}

export default function SettingsRow({
  icon,
  label,
  subtitle,
  trailingText,
  chevron = 'none',
  onPress,
  toggleValue,
  onToggleChange,
}: SettingsRowProps) {
  const theme = useAppTheme();

  const content = (
    <View style={styles.row}>
      <Ionicons name={icon} size={20} color={theme.subtleText} style={styles.icon} />
      <View style={styles.labelContainer}>
        <Text style={[styles.label, { color: theme.text }]}>{label}</Text>
        {subtitle ? (
          <Text style={[styles.subtitle, { color: theme.subtleText }]}>{subtitle}</Text>
        ) : null}
      </View>
      <View style={styles.trailing}>
        {trailingText ? (
          <Text style={[styles.trailingText, { color: theme.subtleText }]}>{trailingText}</Text>
        ) : null}
        {chevron === 'down' ? (
          <Ionicons name="chevron-down" size={16} color={theme.mutedText} />
        ) : null}
        {chevron === 'forward' ? (
          <Ionicons name="chevron-forward" size={18} color={theme.mutedText} />
        ) : null}
        {onToggleChange ? (
          <Switch
            value={toggleValue ?? false}
            onValueChange={onToggleChange}
            trackColor={{ false: theme.border, true: theme.primary }}
            thumbColor={theme.surface}
          />
        ) : null}
      </View>
    </View>
  );

  if (onPress) {
    return (
      <Pressable onPress={onPress} accessibilityRole="button">
        {content}
      </Pressable>
    );
  }

  return content;
}

const styles = StyleSheet.create({
  row: {
    minHeight: 56,
    flexDirection: 'row',
    alignItems: 'center',
    paddingHorizontal: 16,
  },
  icon: {
    marginRight: 14,
    width: 20,
  },
  labelContainer: {
    flex: 1,
  },
  label: {
    fontSize: 15,
    fontWeight: '500',
  },
  subtitle: {
    fontSize: 13,
    marginTop: 2,
  },
  trailing: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 4,
  },
  trailingText: {
    fontSize: 14,
  },
});
