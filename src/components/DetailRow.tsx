import { Ionicons } from '@expo/vector-icons';
import { Pressable, StyleSheet, Text, View } from 'react-native';

import { useAppTheme } from '../theme/ThemeContext';

interface DetailRowProps {
  icon: keyof typeof Ionicons.glyphMap;
  label: string;
  value: string;
  onPress?: () => void;
}

export default function DetailRow({ icon, label, value, onPress }: DetailRowProps) {
  const theme = useAppTheme();

  const content = (
    <View style={[styles.row, { borderBottomColor: theme.border }]}>
      <Ionicons name={icon} size={18} color={theme.subtleText} style={styles.icon} />
      <Text style={[styles.label, { color: theme.text }]}>{label}</Text>
      <View style={styles.valueContainer}>
        <Text style={[styles.value, { color: theme.subtleText }]} numberOfLines={1}>
          {value}
        </Text>
        {onPress ? <Ionicons name="chevron-forward" size={16} color={theme.mutedText} /> : null}
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
    borderBottomWidth: StyleSheet.hairlineWidth,
  },
  icon: {
    marginRight: 12,
  },
  label: {
    fontSize: 15,
    flex: 1,
  },
  valueContainer: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 6,
    marginLeft: 8,
  },
  value: {
    fontSize: 15,
    maxWidth: 160,
    textAlign: 'right',
  },
});
