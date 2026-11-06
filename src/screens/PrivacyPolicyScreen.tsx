import type { NativeStackScreenProps } from '@react-navigation/native-stack';
import { useCallback, useEffect, useState } from 'react';
import { ActivityIndicator, ScrollView, StyleSheet, Text, View } from 'react-native';
import { Button } from 'react-native-paper';

import ScreenHeader from '../components/ScreenHeader';
import { useTranslation } from '../i18n/LocaleContext';
import { fetchPrivacyPolicyText } from '../services/privacyPolicyService';
import { useAppTheme } from '../theme/ThemeContext';
import type { RootStackParamList } from '../types/navigation';

type Props = NativeStackScreenProps<RootStackParamList, 'PrivacyPolicy'>;

type LoadState = 'loading' | 'loaded' | 'error';

export default function PrivacyPolicyScreen({ navigation }: Props) {
  const theme = useAppTheme();
  const { t } = useTranslation();
  const [state, setState] = useState<LoadState>('loading');
  const [content, setContent] = useState('');

  const load = useCallback(() => {
    setState('loading');
    fetchPrivacyPolicyText()
      .then((text) => {
        setContent(text);
        setState('loaded');
      })
      .catch((err) => {
        console.error('Failed to load privacy policy', err);
        setState('error');
      });
  }, []);

  useEffect(() => {
    load();
  }, [load]);

  return (
    <View style={[styles.container, { backgroundColor: theme.background }]}>
      <ScreenHeader title={t('privacyPolicy.title')} onBack={() => navigation.goBack()} />
      {state === 'loading' ? (
        <View style={styles.centered}>
          <ActivityIndicator color={theme.primary} />
        </View>
      ) : null}
      {state === 'error' ? (
        <View style={styles.centered}>
          <Text style={[styles.errorText, { color: theme.subtleText }]}>{t('privacyPolicy.loadFailed')}</Text>
          <Button mode="contained" theme={theme.paper} onPress={load}>
            {t('common.retry')}
          </Button>
        </View>
      ) : null}
      {state === 'loaded' ? (
        <ScrollView contentContainerStyle={styles.content}>
          <Text style={[styles.bodyText, { color: theme.text }]}>{content}</Text>
        </ScrollView>
      ) : null}
    </View>
  );
}

const styles = StyleSheet.create({
  container: {
    flex: 1,
  },
  centered: {
    flex: 1,
    alignItems: 'center',
    justifyContent: 'center',
    paddingHorizontal: 32,
    gap: 16,
  },
  errorText: {
    fontSize: 14,
    textAlign: 'center',
  },
  content: {
    padding: 16,
  },
  bodyText: {
    fontSize: 14,
    lineHeight: 22,
  },
});
