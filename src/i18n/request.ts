import { getRequestConfig } from 'next-intl/server';
import { cookies } from 'next/headers';
import { defaultLocale, type Locale, locales } from './config';

export default getRequestConfig(async () => {
  // Get locale from cookie or use default
  const cookieStore = await cookies();
  const localeCookie = cookieStore.get('locale')?.value as Locale | undefined;
  const locale = localeCookie && locales.includes(localeCookie) ? localeCookie : defaultLocale;

  return {
    locale,
    messages: (await import(`./locales/${locale}.json`)).default,
  };
});
