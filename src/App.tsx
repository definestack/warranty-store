import { DarkTheme, DefaultTheme, NavigationContainer } from '@react-navigation/native';
import * as SplashScreen from 'expo-splash-screen';
import { StatusBar } from 'expo-status-bar';
import { useCallback, useEffect, useRef } from 'react';
import { GestureHandlerRootView } from 'react-native-gesture-handler';
import { Button, PaperProvider } from 'react-native-paper';
import { SafeAreaProvider } from 'react-native-safe-area-context';
import { StyleSheet, Text, View } from 'react-native';

import AppSplash from './components/AppSplash';
import Toast from './components/Toast';
import { LocaleProvider, useTranslation } from './i18n/LocaleContext';
import { navigateToItemDetail, navigationRef } from './navigation/navigationRef';
import RootNavigator from './navigation/RootNavigator';
import { addNotificationResponseListener } from './services/notificationService';
import { useBootstrapStore } from './store/bootstrapStore';
import { useNotificationsStore } from './store/notificationsStore';
import { ThemeProvider, useAppTheme } from './theme/ThemeContext';

// Hold the native splash until boot settles. This runs at module scope, before any
// component renders, and its rejection is swallowed: it rejects harmlessly when the splash
// has already hidden, and a floating rejected promise must not surface at boot.
SplashScreen.preventAutoHideAsync().catch(() => {});

function AppShell() {
  const theme = useAppTheme();
  const { t } = useTranslation();
  const status = useBootstrapStore((state) => state.status);
  const error = useBootstrapStore((state) => state.error);
  const retry = useBootstrapStore((state) => state.retry);
  const splashHidden = useRef(false);

  // Hiding from `onLayout` rather than from the status effect means the first frame of
  // real UI is already committed underneath before the splash lifts. Fires on `error` as
  // well as `ready`, so a database failure cannot strand the user on the splash.
  const handleLayout = useCallback(() => {
    if (status === 'loading' || splashHidden.current) return;
    splashHidden.current = true;
    SplashScreen.hideAsync().catch(() => {});
  }, [status]);

  if (status === 'loading') {
    return (
      <AppSplash>
        <Text style={[styles.message, { color: theme.subtleText }]}>
          {t('common.initializingDatabase')}
        </Text>
      </AppSplash>
    );
  }

  if (status === 'error') {
    return (
      <AppSplash onLayout={handleLayout}>
        <Text style={[styles.message, { color: theme.danger }]}>
          {t('common.databaseError', { error })}
        </Text>
        <Button mode="contained" theme={theme.paper} onPress={() => retry()}>
          {t('common.retry')}
        </Button>
      </AppSplash>
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
    <View style={styles.root} onLayout={handleLayout}>
      <SafeAreaProvider>
        <PaperProvider theme={theme.paper}>
          <NavigationContainer ref={navigationRef} theme={navigationTheme}>
            <RootNavigator />
          </NavigationContainer>
          <Toast />
          <StatusBar style={theme.mode === 'dark' ? 'light' : 'dark'} />
        </PaperProvider>
      </SafeAreaProvider>
    </View>
  );
}

export default function App() {
  useEffect(() => {
    void useBootstrapStore.getState().initialize();
  }, []);

  useEffect(() => {
    const subscription = addNotificationResponseListener(navigateToItemDetail);
    return () => subscription.remove();
  }, []);

  useEffect(() => {
    useNotificationsStore.getState().loadPreference();
  }, []);

  return (
    <GestureHandlerRootView style={styles.root}>
      <LocaleProvider>
        <ThemeProvider>
          <AppShell />
        </ThemeProvider>
      </LocaleProvider>
    </GestureHandlerRootView>
  );
}

const styles = StyleSheet.create({
  root: {
    flex: 1,
  },
  message: {
    textAlign: 'center',
  },
});
