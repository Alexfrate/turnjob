'use client';

import { NextIntlClientProvider } from 'next-intl';
import { useEffect, useState } from 'react';
import { defaultLocale, type Locale, locales } from '@/i18n/config';

// Import all locale messages
import itMessages from '@/i18n/locales/it.json';
import enMessages from '@/i18n/locales/en.json';
import esMessages from '@/i18n/locales/es.json';
import frMessages from '@/i18n/locales/fr.json';
import deMessages from '@/i18n/locales/de.json';

const messages: Record<Locale, typeof itMessages> = {
  it: itMessages,
  en: enMessages,
  es: esMessages,
  fr: frMessages,
  de: deMessages,
};

function getLocaleFromCookie(): Locale {
  if (typeof document === 'undefined') return defaultLocale;

  const match = document.cookie.match(/(?:^|;\s*)locale=([^;]*)/);
  const locale = match?.[1] as Locale | undefined;

  if (locale && locales.includes(locale)) {
    return locale;
  }

  return defaultLocale;
}

interface IntlProviderProps {
  children: React.ReactNode;
}

export function IntlProvider({ children }: IntlProviderProps) {
  const [locale, setLocale] = useState<Locale>(defaultLocale);
  const [mounted, setMounted] = useState(false);

  useEffect(() => {
    setLocale(getLocaleFromCookie());
    setMounted(true);

    // Listen for locale changes
    const handleLocaleChange = () => {
      setLocale(getLocaleFromCookie());
    };

    window.addEventListener('localeChange', handleLocaleChange);
    return () => window.removeEventListener('localeChange', handleLocaleChange);
  }, []);

  // Avoid hydration mismatch
  if (!mounted) {
    return (
      <NextIntlClientProvider
        locale={defaultLocale}
        messages={messages[defaultLocale]}
        timeZone="Europe/Rome"
      >
        {children}
      </NextIntlClientProvider>
    );
  }

  return (
    <NextIntlClientProvider
      locale={locale}
      messages={messages[locale]}
      timeZone="Europe/Rome"
    >
      {children}
    </NextIntlClientProvider>
  );
}
