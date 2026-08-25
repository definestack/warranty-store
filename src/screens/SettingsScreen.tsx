import type { BottomTabScreenProps } from '@react-navigation/bottom-tabs';
import { useCallback, useEffect, useState } from 'react';
import { ActivityIndicator, Alert, ScrollView, StyleSheet, Text, View } from 'react-native';
import { useSafeAreaInsets } from 'react-native-safe-area-context';

import Card from '../components/Card';
import SectionHeader from '../components/SectionHeader';
import SelectModal from '../components/SelectModal';
import SettingsRow from '../components/SettingsRow';
import { useLanguagePreference, useTranslation } from '../i18n/LocaleContext';
import { LANGUAGE_ENDONYMS, SUPPORTED_LOCALES } from '../i18n/i18n';
import { getLastBackupTime, setLastBackupTime as persistLastBackupTime } from '../services/backupPreferenceService';
import { BackupMissingFilesError, createBackupArchive, shareBackupArchive } from '../services/backupService';
import {
  BackupValidationError,
  applyBackup,
  loadBackupArchive,
  pickBackupFile,
} from '../services/restoreService';
import type { LoadedBackup } from '../services/restoreService';
import { useItemsStore } from '../store/itemsStore';
import { useNotificationsStore } from '../store/notificationsStore';
import { useToastStore } from '../store/toastStore';
import { useAppTheme, useThemePreference } from '../theme/ThemeContext';
import type { ThemePreference } from '../theme/ThemeContext';
import type { MainTabParamList } from '../types/navigation';
import { formatDate, nowIso } from '../utils/date';

type Props = BottomTabScreenProps<MainTabParamList, 'Settings'>;

const APP_VERSION = '1.0.0';

export default function SettingsScreen(_props: Props) {
  const theme = useAppTheme();
  const insets = useSafeAreaInsets();
  const { t, locale } = useTranslation();
  const { preference: themePreference, setPreference: setThemePreference } = useThemePreference();
  const { preference: languagePreference, setPreference: setLanguagePreference } = useLanguagePreference();
  const notificationsEnabled = useNotificationsStore((state) => state.enabled);
  const setNotificationsEnabled = useNotificationsStore((state) => state.setEnabled);
  const [themeModalVisible, setThemeModalVisible] = useState(false);
  const [languageModalVisible, setLanguageModalVisible] = useState(false);
  const [lastBackupTime, setLastBackupTime] = useState<string | null>(null);
  const [exportingBackup, setExportingBackup] = useState(false);
  const [importingBackup, setImportingBackup] = useState(false);

  useEffect(() => {
    getLastBackupTime().then(setLastBackupTime);
  }, []);

  const runExport = useCallback(
    async (skipMissingFiles: boolean) => {
      setExportingBackup(true);
      try {
        const result = await createBackupArchive({ skipMissingFiles });
        const timestamp = nowIso();
        await persistLastBackupTime(timestamp);
        setLastBackupTime(timestamp);
        useToastStore
          .getState()
          .show(
            result.skippedFileCount > 0
              ? t('settings.exportBackupSuccessSkipped', { count: result.skippedFileCount })
              : t('settings.exportBackupSuccess')
          );
        setExportingBackup(false);

        // Android's share intent resolves the same way on cancel or completion, so it
        // can't gate the success feedback above — fire it as a best-effort follow-up.
        shareBackupArchive(result.uri).catch((err) => {
          if (__DEV__) console.warn('Failed to open share sheet for backup', err);
        });
      } catch (err) {
        setExportingBackup(false);

        // Image files can go missing outside the app; nothing has been written yet, so
        // let the user decide between fixing them and exporting without them.
        if (err instanceof BackupMissingFilesError) {
          Alert.alert(
            t('settings.exportBackupMissingFilesTitle'),
            t('settings.exportBackupMissingFilesMessage', { count: err.missingFiles.length }),
            [
              { text: t('common.cancel'), style: 'cancel' },
              {
                text: t('settings.exportBackupMissingFilesAction'),
                onPress: () => runExport(true),
              },
            ]
          );
          return;
        }

        console.error('Failed to export backup', err);
        useToastStore.getState().show(t('settings.exportBackupFailed'));
      }
    },
    [t]
  );

  const handleExportBackup = useCallback(() => {
    if (exportingBackup) return;
    runExport(false);
  }, [exportingBackup, runExport]);

  const runImport = useCallback(
    async (backup: LoadedBackup) => {
      setImportingBackup(true);
      try {
        const { imported, skipped } = await applyBackup(backup, t);
        if (imported > 0) {
          await useItemsStore.getState().loadItems();
        }

        let message: string;
        if (imported === 0) {
          message = t('settings.importBackupNothingNew');
        } else if (skipped > 0) {
          message = t('settings.importBackupSuccessSkipped', { imported, skipped });
        } else {
          message = t('settings.importBackupSuccess', { count: imported });
        }
        useToastStore.getState().show(message);
      } catch (err) {
        console.error('Failed to import backup', err);
        useToastStore.getState().show(t('settings.importBackupFailed'));
      } finally {
        setImportingBackup(false);
      }
    },
    [t]
  );

  const handleImportBackup = useCallback(async () => {
    if (importingBackup) return;
    setImportingBackup(true);

    // The archive is read and fully validated before the confirmation prompt, so a
    // corrupt file is rejected without the user ever being asked to overwrite anything.
    let backup: LoadedBackup;
    try {
      const uri = await pickBackupFile();
      if (!uri) {
        setImportingBackup(false);
        return;
      }
      backup = await loadBackupArchive(uri);
    } catch (err) {
      console.error('Failed to read backup file', err);
      let message = t('settings.importBackupFailed');
      if (err instanceof BackupValidationError) {
        message =
          err.reason === 'unsupportedVersion'
            ? t('settings.importBackupUnsupportedVersion')
            : t('settings.importBackupInvalid');
      }
      useToastStore.getState().show(message);
      setImportingBackup(false);
      return;
    }

    setImportingBackup(false);

    if (backup.payload.items.length === 0) {
      useToastStore.getState().show(t('settings.importBackupEmpty'));
      return;
    }

    Alert.alert(
      t('settings.importBackupConfirmTitle'),
      t('settings.importBackupConfirmMessage', { count: backup.payload.items.length }),
      [
        { text: t('common.cancel'), style: 'cancel' },
        { text: t('settings.importBackupConfirmAction'), onPress: () => runImport(backup) },
      ]
    );
  }, [importingBackup, runImport, t]);

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
          <SettingsRow
            icon="download-outline"
            label={t('settings.exportData')}
            subtitle={
              lastBackupTime
                ? t('settings.exportBackupLastExported', { date: formatDate(new Date(lastBackupTime), locale) })
                : t('settings.exportBackupNeverExported')
            }
            trailing={exportingBackup ? <ActivityIndicator color={theme.subtleText} /> : undefined}
            chevron={exportingBackup ? 'none' : 'forward'}
            onPress={handleExportBackup}
          />
          <View style={[styles.divider, { backgroundColor: theme.border }]} />
          <SettingsRow
            icon="folder-open-outline"
            label={t('settings.importData')}
            subtitle={t('settings.importBackupSubtitle')}
            trailing={importingBackup ? <ActivityIndicator color={theme.subtleText} /> : undefined}
            chevron={importingBackup ? 'none' : 'forward'}
            onPress={handleImportBackup}
          />
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
});
