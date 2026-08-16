import AsyncStorage from '@react-native-async-storage/async-storage';
import * as Localization from 'expo-localization';
import { createContext, useContext, useEffect, useMemo, useState } from 'react';
import type { ReactNode } from 'react';

import { DEFAULT_LOCALE, SUPPORTED_LOCALES, i18n, resolveDeviceLocale } from './i18n';
import type { SupportedLocale, TranslateFn } from './i18n';

const LANGUAGE_PREFERENCE_KEY = 'settings.languagePreference';

export type LanguagePreference = SupportedLocale | 'system';

interface LocaleContextValue {
  locale: SupportedLocale;
  preference: LanguagePreference;
  setPreference: (preference: LanguagePreference) => void;
  t: TranslateFn;
}

const LocaleContext = createContext<LocaleContextValue | undefined>(undefined);

function isLanguagePreference(value: string): value is LanguagePreference {
  return value === 'system' || (SUPPORTED_LOCALES as readonly string[]).includes(value);
}

export function LocaleProvider({ children }: { children: ReactNode }) {
  const [preference, setPreferenceState] = useState<LanguagePreference>('system');

  useEffect(() => {
    AsyncStorage.getItem(LANGUAGE_PREFERENCE_KEY).then((stored) => {
      if (stored && isLanguagePreference(stored)) {
        setPreferenceState(stored);
      }
    });
  }, []);

  const setPreference = (next: LanguagePreference) => {
    setPreferenceState(next);
    AsyncStorage.setItem(LANGUAGE_PREFERENCE_KEY, next).catch((err) => {
      console.error('Failed to persist language preference', err);
    });
  };

  const resolvedLocale: SupportedLocale =
    preference === 'system' ? resolveDeviceLocale(Localization.getLocales()) : preference;

  const value = useMemo<LocaleContextValue>(() => {
    const t: TranslateFn = (scope, options) => i18n.t(scope, { locale: resolvedLocale, ...options });
    return { locale: resolvedLocale, preference, setPreference, t };
  }, [resolvedLocale, preference]);

  return <LocaleContext.Provider value={value}>{children}</LocaleContext.Provider>;
}

export function useTranslation() {
  const ctx = useContext(LocaleContext);
  if (!ctx) throw new Error('useTranslation must be used within a LocaleProvider');
  return { t: ctx.t, locale: ctx.locale };
}

export function useLanguagePreference() {
  const ctx = useContext(LocaleContext);
  if (!ctx) throw new Error('useLanguagePreference must be used within a LocaleProvider');
  return { preference: ctx.preference, setPreference: ctx.setPreference, locale: ctx.locale };
}

export { DEFAULT_LOCALE };
