import type { BottomTabScreenProps } from '@react-navigation/bottom-tabs';
import { useState } from 'react';
import { Pressable, ScrollView, StyleSheet, Text, View } from 'react-native';
import { useSafeAreaInsets } from 'react-native-safe-area-context';

import Card from '../components/Card';
import SectionHeader from '../components/SectionHeader';
import SelectModal from '../components/SelectModal';
import SettingsRow from '../components/SettingsRow';
import { useLanguagePreference, useTranslation } from '../i18n/LocaleContext';
import { LANGUAGE_ENDONYMS, SUPPORTED_LOCALES } from '../i18n/i18n';
import { useNotificationsStore } from '../store/notificationsStore';
import { useAppTheme, useThemePreference } from '../theme/ThemeContext';
import type { ThemePreference } from '../theme/ThemeContext';
import type { MainTabParamList } from '../types/navigation';

type Props = BottomTabScreenProps<MainTabParamList, 'Settings'>;

const APP_VERSION = '1.0.0';

export default function SettingsScreen(_props: Props) {
  const theme = useAppTheme();
  const insets = useSafeAreaInsets();
  const { t } = useTranslation();
  const { preference: themePreference, setPreference: setThemePreference } = useThemePreference();
  const { preference: languagePreference, setPreference: setLanguagePreference } = useLanguagePreference();
  const notificationsEnabled = useNotificationsStore((state) => state.enabled);
  const setNotificationsEnabled = useNotificationsStore((state) => state.setEnabled);
  const [themeModalVisible, setThemeModalVisible] = useState(false);
  const [languageModalVisible, setLanguageModalVisible] = useState(false);

  const themeOptions: { value: ThemePreference; label: string }[] = [
    { value: 'system', label: t('common.systemDefault') },
    { value: 'light', label: t('settings.themeLight') },
    { value: 'dark', label: t('settings.themeDark') },
  ];
  const languageOptions = [
    { value: 'system', label: t('common.systemDefault') },
    ...SUPPORTED_LOCALES.map((locale) => ({ value: locale, label: LANGUAGE_ENDONYMS[locale] })),
  ];

  const themeLabel = themeOptions.find((option) => option.value === themePreference)?.label ?? t('common.systemDefault');
  const languageLabel =
    languageOptions.find((option) => option.value === languagePreference)?.label ?? t('common.systemDefault');

  return (
    <View style={[styles.container, { backgroundColor: theme.background, paddingTop: insets.top }]}>
      <Text style={[styles.title, { color: theme.text }]}>{t('settings.title')}</Text>
      <ScrollView contentContainerStyle={styles.content}>
        <SectionHeader title={t('settings.appearance')} />
        <Card style={styles.card}>
          <SettingsRow
            icon="contrast-outline"
            label={t('settings.theme')}
            trailingText={themeLabel}
            chevron="down"
            onPress={() => setThemeModalVisible(true)}
          />
          <View style={[styles.divider, { backgroundColor: theme.border }]} />
          <SettingsRow
            icon="globe-outline"
            label={t('settings.language')}
            trailingText={languageLabel}
            chevron="down"
            onPress={() => setLanguageModalVisible(true)}
          />
        </Card>

        <SectionHeader title={t('settings.general')} />
        <Card style={styles.card}>
          <SettingsRow icon="cloud-upload-outline" label={t('settings.backupRestore')} chevron="forward" onPress={() => {}} />
          <View style={[styles.divider, { backgroundColor: theme.border }]} />
          <SettingsRow icon="download-outline" label={t('settings.exportData')} chevron="forward" onPress={() => {}} />
          <View style={[styles.divider, { backgroundColor: theme.border }]} />
          <SettingsRow
            icon="notifications-outline"
            label={t('settings.notificationsEnabled')}
            toggleValue={notificationsEnabled}
            onToggleChange={(value) => setNotificationsEnabled(value, t)}
          />
        </Card>

        <SectionHeader title={t('settings.about')} />
        <Card style={styles.card}>
          <SettingsRow
            icon="information-circle-outline"
            label={t('settings.aboutApp')}
            subtitle={t('settings.version', { version: APP_VERSION })}
          />
        </Card>

        <Pressable style={[styles.signOut, { borderColor: theme.danger }]}>
          <Text style={[styles.signOutText, { color: theme.danger }]}>{t('settings.signOut')}</Text>
        </Pressable>
      </ScrollView>

      <SelectModal
        visible={themeModalVisible}
        title={t('settings.theme')}
        options={themeOptions}
        selected={themePreference}
        onSelect={(value) => setThemePreference(value as ThemePreference)}
        onClose={() => setThemeModalVisible(false)}
      />
      <SelectModal
        visible={languageModalVisible}
        title={t('settings.language')}
        options={languageOptions}
        selected={languagePreference}
        onSelect={(value) => setLanguagePreference(value as typeof languagePreference)}
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
    borderRadius: 14,
    borderWidth: StyleSheet.hairlineWidth,
    alignItems: 'center',
    justifyContent: 'center',
  },
  signOutText: {
    fontSize: 16,
    fontWeight: '600',
  },
});
