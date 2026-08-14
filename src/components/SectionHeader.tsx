import { StyleSheet, Text } from 'react-native';

import { useAppTheme } from '../theme/ThemeContext';

export default function SectionHeader({ title }: { title: string }) {
  const theme = useAppTheme();

  return <Text style={[styles.text, { color: theme.subtleText }]}>{title}</Text>;
}

const styles = StyleSheet.create({
  text: {
    fontSize: 13,
    fontWeight: '600',
    textTransform: 'uppercase',
    letterSpacing: 0.4,
    marginBottom: 8,
  },
});
