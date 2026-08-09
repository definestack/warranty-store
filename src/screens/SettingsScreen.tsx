import type { BottomTabScreenProps } from '@react-navigation/bottom-tabs';
import { StyleSheet, Text, View } from 'react-native';

import { colors } from '../utils/colors';
import type { MainTabParamList } from '../types/navigation';

type Props = BottomTabScreenProps<MainTabParamList, 'Settings'>;

const SETTINGS_SECTIONS = ['Notifications', 'Backup', 'About'];

export default function SettingsScreen(_props: Props) {
  return (
    <View style={styles.container}>
      <Text style={styles.title}>Settings</Text>
      {SETTINGS_SECTIONS.map((section) => (
        <View key={section} style={styles.row}>
          <Text style={styles.rowText}>{section}</Text>
        </View>
      ))}
    </View>
  );
}

const styles = StyleSheet.create({
  container: {
    flex: 1,
    backgroundColor: colors.background,
    padding: 16,
    gap: 12,
  },
  title: {
    fontSize: 22,
    fontWeight: '600',
    color: colors.text,
    marginBottom: 8,
  },
  row: {
    minHeight: 56,
    justifyContent: 'center',
    paddingHorizontal: 16,
    backgroundColor: colors.surface,
    borderRadius: 12,
    borderWidth: 1,
    borderColor: colors.border,
  },
  rowText: {
    fontSize: 16,
    color: colors.text,
  },
});
