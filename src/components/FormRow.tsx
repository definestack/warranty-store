import { Ionicons } from '@expo/vector-icons';
import { Pressable, StyleSheet, Text, TextInput, View } from 'react-native';
import type { KeyboardTypeOptions } from 'react-native';

import { useAppTheme } from '../theme/ThemeContext';

interface FormRowProps {
  label: string;
  placeholder: string;
  value?: string;
  onChangeText?: (text: string) => void;
  onPress?: () => void;
  icon?: keyof typeof Ionicons.glyphMap;
  keyboardType?: KeyboardTypeOptions;
  editable?: boolean;
}

export default function FormRow({
  label,
  placeholder,
  value,
  onChangeText,
  onPress,
  icon,
  keyboardType,
  editable = true,
}: FormRowProps) {
  const theme = useAppTheme();
  const isPressable = !!onPress;
  const displayValue = value && value.length > 0 ? value : undefined;

  const content = (
    <View style={[styles.row, { borderBottomColor: theme.border }]}>
      <Text style={[styles.label, { color: theme.text }]}>{label}</Text>
      <View style={styles.valueContainer}>
        {isPressable ? (
          <Text
            style={[styles.value, { color: displayValue ? theme.text : theme.mutedText }]}
            numberOfLines={1}
          >
            {displayValue ?? placeholder}
          </Text>
        ) : (
          <TextInput
            style={[styles.input, { color: theme.text }]}
            value={value}
            onChangeText={onChangeText}
            placeholder={placeholder}
            placeholderTextColor={theme.mutedText}
            keyboardType={keyboardType}
            editable={editable}
            textAlign="right"
          />
        )}
        {icon ? <Ionicons name={icon} size={18} color={theme.mutedText} style={styles.icon} /> : null}
      </View>
    </View>
  );

  if (isPressable) {
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
    justifyContent: 'space-between',
    paddingHorizontal: 16,
    borderBottomWidth: StyleSheet.hairlineWidth,
  },
  label: {
    fontSize: 15,
    fontWeight: '500',
  },
  valueContainer: {
    flexDirection: 'row',
    alignItems: 'center',
    flexShrink: 1,
    marginLeft: 12,
  },
  value: {
    fontSize: 15,
    flexShrink: 1,
  },
  input: {
    fontSize: 15,
    minWidth: 120,
    paddingVertical: 8,
  },
  icon: {
    marginLeft: 8,
  },
});
