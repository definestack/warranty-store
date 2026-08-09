import { NavigationContainer } from '@react-navigation/native';
import { StatusBar } from 'expo-status-bar';
import { useEffect, useState } from 'react';
import { SafeAreaProvider } from 'react-native-safe-area-context';
import { StyleSheet, Text, View } from 'react-native';

import { initDatabase } from './db/database';
import RootNavigator from './navigation/RootNavigator';

type DbStatus = 'loading' | 'ready' | 'error';

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

  if (status === 'loading') {
    return (
      <View style={styles.container}>
        <Text>Initializing database…</Text>
        <StatusBar style="auto" />
      </View>
    );
  }

  if (status === 'error') {
    return (
      <View style={styles.container}>
        <Text style={styles.error}>Database error: {error}</Text>
        <StatusBar style="auto" />
      </View>
    );
  }

  return (
    <SafeAreaProvider>
      <NavigationContainer>
        <RootNavigator />
      </NavigationContainer>
      <StatusBar style="auto" />
    </SafeAreaProvider>
  );
}

const styles = StyleSheet.create({
  container: {
    flex: 1,
    backgroundColor: '#fff',
    alignItems: 'center',
    justifyContent: 'center',
    gap: 8,
  },
  error: {
    color: 'red',
    textAlign: 'center',
    paddingHorizontal: 16,
  },
});
