import { i18n, resolveDeviceLocale } from './i18n';
import de from './locales/de';
import en from './locales/en';
import es from './locales/es';
import fr from './locales/fr';

describe('resolveDeviceLocale', () => {
  it('picks the first supported locale from the device list', () => {
    expect(resolveDeviceLocale([{ languageCode: 'fr' }, { languageCode: 'en' }])).toBe('fr');
  });

  it('skips unsupported locales and picks the next supported one', () => {
    expect(resolveDeviceLocale([{ languageCode: 'ja' }, { languageCode: 'de' }])).toBe('de');
  });

  it('falls back to English when nothing matches', () => {
    expect(resolveDeviceLocale([{ languageCode: 'ja' }, { languageCode: 'zh' }])).toBe('en');
  });

  it('falls back to English for an empty list', () => {
    expect(resolveDeviceLocale([])).toBe('en');
  });

  it('falls back to English when languageCode is null', () => {
    expect(resolveDeviceLocale([{ languageCode: null }])).toBe('en');
  });
});

describe('i18n translations', () => {
  it('translates a simple key per locale', () => {
    expect(i18n.t('settings.language', { locale: 'en' })).toBe('Language');
    expect(i18n.t('settings.language', { locale: 'es' })).toBe('Idioma');
    expect(i18n.t('settings.language', { locale: 'fr' })).toBe('Langue');
    expect(i18n.t('settings.language', { locale: 'de' })).toBe('Sprache');
  });

  it('interpolates placeholders', () => {
    expect(i18n.t('home.expiresOn', { locale: 'en', date: '20 May 2026' })).toBe('Expires 20 May 2026');
  });

  it('pluralizes using each locale’s own cardinal rule', () => {
    expect(i18n.t('duration.months', { locale: 'en', count: 1 })).toBe('1 month');
    expect(i18n.t('duration.months', { locale: 'en', count: 6 })).toBe('6 months');

    expect(i18n.t('duration.months', { locale: 'fr', count: 1 })).toBe('1 mois');
    expect(i18n.t('duration.months', { locale: 'fr', count: 6 })).toBe('6 mois');

    // French treats 0 as the "one" plural category, unlike the other supported locales.
    expect(i18n.t('date.expiresIn', { locale: 'fr', count: 0 })).toBe('Expire dans 0 jour');
    expect(i18n.t('date.expiresIn', { locale: 'en', count: 0 })).toBe('Expires in 0 days');
  });
});

/** Every leaf key in a locale bundle, dotted and sorted, so two bundles can be compared. */
function keyPaths(bundle: object, prefix = ''): string[] {
  return Object.entries(bundle)
    .flatMap(([key, value]) => {
      const path = prefix ? `${prefix}.${key}` : key;
      return value && typeof value === 'object' ? keyPaths(value, path) : [path];
    })
    .sort();
}

describe('locale bundles', () => {
  // Fallback to English hides a missing key at runtime, so the bundles are compared
  // directly: a string added to one locale must be added to all of them.
  it.each([
    ['es', es],
    ['fr', fr],
    ['de', de],
  ])('%s carries exactly the keys English does', (_locale, bundle) => {
    expect(keyPaths(bundle)).toEqual(keyPaths(en));
  });
});
