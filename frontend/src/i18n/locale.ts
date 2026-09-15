export type Locale = 'de' | 'en';

const storageKey = 'daytrack-max.locale';
let activeLocale: Locale | null = null;

export function isLocale(value: unknown): value is Locale {
  return value === 'de' || value === 'en';
}

function localeFromLanguage(language: string | undefined): Locale {
  return language?.toLowerCase().startsWith('de') ? 'de' : 'en';
}

export function resolveInitialLocale(): Locale {
  const urlLocale = new URLSearchParams(window.location.search).get('lang');
  if (isLocale(urlLocale)) return urlLocale;

  const storedLocale = window.localStorage.getItem(storageKey);
  if (isLocale(storedLocale)) return storedLocale;

  return localeFromLanguage(navigator.languages?.[0] ?? navigator.language);
}

export function applyLocale(locale: Locale): void {
  activeLocale = locale;
  window.localStorage.setItem(storageKey, locale);
  document.documentElement.lang = locale;
}

export function getActiveLocale(): Locale {
  return activeLocale ?? resolveInitialLocale();
}

export function localeTag(locale: Locale): string {
  return locale === 'de' ? 'de-DE' : 'en-US';
}
