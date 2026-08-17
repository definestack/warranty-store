import { DarkTheme, DefaultTheme, NavigationContainer } from '@react-navigation/native';
import { StatusBar } from 'expo-status-bar';
import { useEffect, useState } from 'react';
import { GestureHandlerRootView } from 'react-native-gesture-handler';
import { PaperProvider } from 'react-native-paper';
import { SafeAreaProvider } from 'react-native-safe-area-context';
import { StyleSheet, Text, View } from 'react-native';

import Toast from './components/Toast';
import { initDatabase } from './db/database';
import { LocaleProvider, useTranslation } from './i18n/LocaleContext';
import { navigateToItemDetail, navigationRef } from './navigation/navigationRef';
import RootNavigator from './navigation/RootNavigator';
import { addNotificationResponseListener } from './services/notificationService';
import { ThemeProvider, useAppTheme } from './theme/ThemeContext';

type DbStatus = 'loading' | 'ready' | 'error';

function AppShell({ status, error }: { status: DbStatus; error: string | null }) {
  const theme = useAppTheme();
  const { t } = useTranslation();

  if (status === 'loading') {
    return (
      <View style={[styles.container, { backgroundColor: theme.background }]}>
        <Text style={{ color: theme.text }}>{t('common.initializingDatabase')}</Text>
        <StatusBar style={theme.mode === 'dark' ? 'light' : 'dark'} />
      </View>
    );
  }

  if (status === 'error') {
    return (
      <View style={[styles.container, { backgroundColor: theme.background }]}>
        <Text style={[styles.error, { color: theme.danger }]}>{t('common.databaseError', { error })}</Text>
        <StatusBar style={theme.mode === 'dark' ? 'light' : 'dark'} />
      </View>
    );
  }

  const navigationTheme = {
    ...(theme.mode === 'dark' ? DarkTheme : DefaultTheme),
    colors: {
      ...(theme.mode === 'dark' ? DarkTheme.colors : DefaultTheme.colors),
      background: theme.background,
      card: theme.surface,
      text: theme.text,
      border: theme.border,
      primary: theme.primary,
    },
  };

  return (
    <SafeAreaProvider>
      <PaperProvider theme={theme.paper}>
        <NavigationContainer ref={navigationRef} theme={navigationTheme}>
          <RootNavigator />
        </NavigationContainer>
        <Toast />
        <StatusBar style={theme.mode === 'dark' ? 'light' : 'dark'} />
      </PaperProvider>
    </SafeAreaProvider>
  );
}

export default function App() {
  const [status, setStatus] = useState<DbStatus>('loading');
  const [error, setError] = useState<string | null>(null);

  useEffect(() => {
    initDatabase()
      .then(() => setStatus('ready'))
      .catch((err) => {
        console.error('Failed to initialize database', err);
        setError(err instanceof Error ? err.message : String(err));
        setStatus('error');
      });
  }, []);

  useEffect(() => {
    const subscription = addNotificationResponseListener(navigateToItemDetail);
    return () => subscription.remove();
  }, []);

  return (
    <GestureHandlerRootView style={styles.root}>
      <LocaleProvider>
        <ThemeProvider>
          <AppShell status={status} error={error} />
        </ThemeProvider>
      </LocaleProvider>
    </GestureHandlerRootView>
  );
}

const styles = StyleSheet.create({
  root: {
    flex: 1,
  },
  container: {
    flex: 1,
    alignItems: 'center',
    justifyContent: 'center',
    gap: 8,
  },
  error: {
    textAlign: 'center',
    paddingHorizontal: 16,
  },
});
