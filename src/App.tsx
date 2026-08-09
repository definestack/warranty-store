import { StatusBar } from 'expo-status-bar';
import { useEffect, useState } from 'react';
import { StyleSheet, Text, View } from 'react-native';

import { initDatabase } from './db/database';

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

  return (
    <View style={styles.container}>
      <Text style={styles.title}>Warranty Store</Text>
      {status === 'loading' && <Text>Initializing database…</Text>}
      {status === 'ready' && <Text>Database ready</Text>}
      {status === 'error' && (
        <Text style={styles.error}>Database error: {error}</Text>
      )}
      <StatusBar style="auto" />
    </View>
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
  title: {
    fontSize: 20,
    fontWeight: '600',
  },
  error: {
    color: 'red',
    textAlign: 'center',
    paddingHorizontal: 16,
  },
});
