import { Ionicons } from '@expo/vector-icons';
import { useEffect } from 'react';
import { StyleSheet, Text } from 'react-native';
import { useSafeAreaInsets } from 'react-native-safe-area-context';

import Surface from './Surface';
import { useAppTheme } from '../theme/ThemeContext';
import { useToastStore } from '../store/toastStore';

const AUTO_HIDE_MS = 2000;

/** Renders the app-wide success/error toast driven by `useToastStore`. Mount once near the navigation root. */
export default function Toast() {
  const theme = useAppTheme();
  const insets = useSafeAreaInsets();
  const message = useToastStore((state) => state.message);
  const hide = useToastStore((state) => state.hide);

  useEffect(() => {
    if (!message) return;
    const timer = setTimeout(hide, AUTO_HIDE_MS);
    return () => clearTimeout(timer);
  }, [message, hide]);

  if (!message) return null;

  return (
    <Surface style={[styles.container, { bottom: insets.bottom + 24 }]}>
      <Ionicons name="checkmark-circle" size={18} color={theme.success} />
      <Text style={[styles.text, { color: theme.text }]} numberOfLines={2}>
        {message}
      </Text>
    </Surface>
  );
}

const styles = StyleSheet.create({
  container: {
    position: 'absolute',
    left: 24,
    right: 24,
    borderRadius: 14,
    flexDirection: 'row',
    alignItems: 'center',
    gap: 10,
    paddingHorizontal: 16,
    paddingVertical: 14,
    shadowColor: '#000000',
    shadowOffset: { width: 0, height: 6 },
    shadowOpacity: 0.12,
    shadowRadius: 14,
    elevation: 4,
  },
  text: {
    flex: 1,
    fontSize: 14,
    fontWeight: '600',
  },
});
