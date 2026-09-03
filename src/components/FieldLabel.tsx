import { StyleSheet, Text } from 'react-native';
import type { StyleProp, TextStyle } from 'react-native';

import { useTranslation } from '../i18n/LocaleContext';
import { useAppTheme } from '../theme/ThemeContext';

interface FieldLabelProps {
  label: string;
  /** Marks the field the save validation actually rejects when left blank. */
  required?: boolean;
  /** Appended after the label, e.g. the "(Optional)" tag some fields carry. */
  suffix?: string;
  style?: StyleProp<TextStyle>;
}

/**
 * A form field's label, with the asterisk that marks a required field. The asterisk is
 * decoration for sighted users; screen readers get the word instead, since a lone "*"
 * is read out as "star" or skipped entirely.
 */
export default function FieldLabel({ label, required = false, suffix, style }: FieldLabelProps) {
  const theme = useAppTheme();
  const { t } = useTranslation();

  return (
    <Text
      style={[styles.label, { color: theme.text }, style]}
      accessibilityLabel={required ? `${label}, ${t('addEditItem.requiredField')}` : undefined}
    >
      {label}
      {required ? <Text style={{ color: theme.danger }}> *</Text> : null}
      {suffix ? <Text style={{ color: theme.subtleText }}> {suffix}</Text> : null}
    </Text>
  );
}

const styles = StyleSheet.create({
  label: {
    fontSize: 13,
    fontWeight: '600',
  },
});
