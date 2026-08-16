import { I18n, useMakePlural as makePluralizer } from 'i18n-js';

import de from './locales/de';
import en from './locales/en';
import es from './locales/es';
import fr from './locales/fr';

export const SUPPORTED_LOCALES = ['en', 'es', 'fr', 'de'] as const;
export type SupportedLocale = (typeof SUPPORTED_LOCALES)[number];
export const DEFAULT_LOCALE: SupportedLocale = 'en';

/** Native-language names for the language picker; these are intentionally not translated. */
export const LANGUAGE_ENDONYMS: Record<SupportedLocale, string> = {
  en: 'English',
  es: 'Español',
  fr: 'Français',
  de: 'Deutsch',
};

export type TranslateFn = (scope: string, options?: Record<string, unknown>) => string;

export const i18n = new I18n({ en, es, fr, de });
i18n.enableFallback = true;
i18n.defaultLocale = DEFAULT_LOCALE;
i18n.locale = DEFAULT_LOCALE;

// The default pluralizer only implements English's one/other split. Spanish and German
// follow the same rule (singular only at exactly 1), but French also treats 0 as
// singular — register CLDR's cardinal rule per locale so plural strings pick the right form.
const singularAtOne = (count: number) => (count === 1 ? 'one' : 'other');
const singularAtZeroOrOne = (count: number) => (count === 0 || count === 1 ? 'one' : 'other');

i18n.pluralization.register('es', makePluralizer({ pluralizer: singularAtOne }));
i18n.pluralization.register('de', makePluralizer({ pluralizer: singularAtOne }));
i18n.pluralization.register('fr', makePluralizer({ pluralizer: singularAtZeroOrOne }));

function isSupportedLocale(value: string | null | undefined): value is SupportedLocale {
  return !!value && (SUPPORTED_LOCALES as readonly string[]).includes(value);
}

/** Picks the first supported locale from a device locale list (as returned by expo-localization), falling back to English. */
export function resolveDeviceLocale(deviceLocales: { languageCode?: string | null }[]): SupportedLocale {
  for (const { languageCode } of deviceLocales) {
    if (isSupportedLocale(languageCode)) return languageCode;
  }
  return DEFAULT_LOCALE;
}

export default i18n;
