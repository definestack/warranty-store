import { DarkTheme, DefaultTheme, NavigationContainer } from '@react-navigation/native';
import { StatusBar } from 'expo-status-bar';
import { useEffect, useState } from 'react';
import { SafeAreaProvider } from 'react-native-safe-area-context';
import { StyleSheet, Text, View } from 'react-native';

import Toast from './components/Toast';
import { initDatabase } from './db/database';
import RootNavigator from './navigation/RootNavigator';
import { ThemeProvider, useAppTheme } from './theme/ThemeContext';

type DbStatus = 'loading' | 'ready' | 'error';

function AppShell({ status, error }: { status: DbStatus; error: string | null }) {
  const theme = useAppTheme();

  if (status === 'loading') {
    return (
      <View style={[styles.container, { backgroundColor: theme.background }]}>
        <Text style={{ color: theme.text }}>Initializing database…</Text>
        <StatusBar style={theme.mode === 'dark' ? 'light' : 'dark'} />
      </View>
    );
  }

  if (status === 'error') {
    return (
      <View style={[styles.container, { backgroundColor: theme.background }]}>
        <Text style={[styles.error, { color: theme.danger }]}>Database error: {error}</Text>
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
      <NavigationContainer theme={navigationTheme}>
        <RootNavigator />
      </NavigationContainer>
      <Toast />
      <StatusBar style={theme.mode === 'dark' ? 'light' : 'dark'} />
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

  return (
    <ThemeProvider>
      <AppShell status={status} error={error} />
    </ThemeProvider>
  );
}

const styles = StyleSheet.create({
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
