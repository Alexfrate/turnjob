export const locales = ['it', 'en', 'es', 'fr', 'de'] as const;
export type Locale = (typeof locales)[number];

export const defaultLocale: Locale = 'it';

export const localeNames: Record<Locale, string> = {
  it: 'Italiano',
  en: 'English',
  es: 'Español',
  fr: 'Français',
  de: 'Deutsch',
};

export const localeFlags: Record<Locale, string> = {
  it: '🇮🇹',
  en: '🇬🇧',
  es: '🇪🇸',
  fr: '🇫🇷',
  de: '🇩🇪',
};
