'use client';

import { useTransition } from 'react';
import { useLocale, useTranslations } from 'next-intl';
import {
  DropdownMenu,
  DropdownMenuContent,
  DropdownMenuItem,
  DropdownMenuTrigger,
} from '@/components/ui/dropdown-menu';
import { Button } from '@/components/ui/button';
import { Globe } from 'lucide-react';
import { locales, localeNames, localeFlags, type Locale } from '@/i18n/config';

export function LanguageSelector() {
  const t = useTranslations('language');
  const currentLocale = useLocale() as Locale;
  const [isPending, startTransition] = useTransition();

  const handleLocaleChange = (locale: Locale) => {
    startTransition(() => {
      // Set cookie
      document.cookie = `locale=${locale};path=/;max-age=31536000`;
      // Reload to apply new locale
      window.location.reload();
    });
  };

  return (
    <DropdownMenu>
      <DropdownMenuTrigger asChild>
        <Button variant="ghost" size="sm" className="gap-2" disabled={isPending}>
          <Globe className="h-4 w-4" />
          <span className="hidden sm:inline">{localeFlags[currentLocale]} {localeNames[currentLocale]}</span>
          <span className="sm:hidden">{localeFlags[currentLocale]}</span>
        </Button>
      </DropdownMenuTrigger>
      <DropdownMenuContent align="end">
        {locales.map((locale) => (
          <DropdownMenuItem
            key={locale}
            onClick={() => handleLocaleChange(locale)}
            className={locale === currentLocale ? 'bg-accent' : ''}
          >
            <span className="mr-2">{localeFlags[locale]}</span>
            {localeNames[locale]}
          </DropdownMenuItem>
        ))}
      </DropdownMenuContent>
    </DropdownMenu>
  );
}
