import type { BottomTabScreenProps } from '@react-navigation/bottom-tabs';
import { useState } from 'react';
import { Pressable, ScrollView, StyleSheet, Text, View } from 'react-native';
import { useSafeAreaInsets } from 'react-native-safe-area-context';

import Card from '../components/Card';
import ScreenBackdrop from '../components/ScreenBackdrop';
import SectionHeader from '../components/SectionHeader';
import SelectModal from '../components/SelectModal';
import SettingsRow from '../components/SettingsRow';
import { useAppTheme, useThemePreference } from '../theme/ThemeContext';
import type { ThemePreference } from '../theme/ThemeContext';
import type { MainTabParamList } from '../types/navigation';

type Props = BottomTabScreenProps<MainTabParamList, 'Settings'>;

const THEME_OPTIONS: Record<string, ThemePreference> = {
  'System Default': 'system',
  Light: 'light',
  Dark: 'dark',
};

export default function SettingsScreen(_props: Props) {
  const theme = useAppTheme();
  const insets = useSafeAreaInsets();
  const { preference, setPreference } = useThemePreference();
  const [themeModalVisible, setThemeModalVisible] = useState(false);
  const [language, setLanguage] = useState('English');
  const [languageModalVisible, setLanguageModalVisible] = useState(false);

  const themeLabel = Object.keys(THEME_OPTIONS).find((key) => THEME_OPTIONS[key] === preference) ?? 'System Default';

  return (
    <View style={[styles.container, { backgroundColor: theme.background, paddingTop: insets.top }]}>
      <ScreenBackdrop />
      <Text style={[styles.title, { color: theme.text }]}>Settings</Text>
      <ScrollView contentContainerStyle={styles.content}>
        <SectionHeader title="Appearance" />
        <Card style={styles.card}>
          <SettingsRow
            icon="contrast-outline"
            label="Theme"
            trailingText={themeLabel}
            chevron="down"
            onPress={() => setThemeModalVisible(true)}
          />
          <View style={[styles.divider, { backgroundColor: theme.border }]} />
          <SettingsRow
            icon="globe-outline"
            label="Language"
            trailingText={language}
            chevron="down"
            onPress={() => setLanguageModalVisible(true)}
          />
        </Card>

        <SectionHeader title="General" />
        <Card style={styles.card}>
          <SettingsRow icon="cloud-upload-outline" label="Backup & Restore" chevron="forward" onPress={() => {}} />
          <View style={[styles.divider, { backgroundColor: theme.border }]} />
          <SettingsRow icon="download-outline" label="Export Data" chevron="forward" onPress={() => {}} />
          <View style={[styles.divider, { backgroundColor: theme.border }]} />
          <SettingsRow icon="notifications-outline" label="Reminders" chevron="forward" onPress={() => {}} />
        </Card>

        <SectionHeader title="About" />
        <Card style={styles.card}>
          <SettingsRow icon="information-circle-outline" label="About Warranty Tracker" subtitle="Version 1.0.0" />
        </Card>

        <Pressable>
          <Card style={styles.signOut}>
            <Text style={[styles.signOutText, { color: theme.danger }]}>Sign Out</Text>
          </Card>
        </Pressable>
      </ScrollView>

      <SelectModal
        visible={themeModalVisible}
        title="Theme"
        options={Object.keys(THEME_OPTIONS)}
        selected={themeLabel}
        onSelect={(label) => setPreference(THEME_OPTIONS[label])}
        onClose={() => setThemeModalVisible(false)}
      />
      <SelectModal
        visible={languageModalVisible}
        title="Language"
        options={['English']}
        selected={language}
        onSelect={setLanguage}
        onClose={() => setLanguageModalVisible(false)}
      />
    </View>
  );
}

const styles = StyleSheet.create({
  container: {
    flex: 1,
  },
  title: {
    fontSize: 22,
    fontWeight: '700',
    paddingHorizontal: 16,
    paddingTop: 12,
    paddingBottom: 8,
  },
  content: {
    padding: 16,
    gap: 20,
  },
  card: {
    paddingVertical: 4,
  },
  divider: {
    height: StyleSheet.hairlineWidth,
    marginLeft: 50,
  },
  signOut: {
    minHeight: 52,
    alignItems: 'center',
    justifyContent: 'center',
  },
  signOutText: {
    fontSize: 16,
    fontWeight: '600',
  },
});
