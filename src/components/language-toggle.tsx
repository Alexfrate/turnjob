'use client';

import * as React from 'react';
import { Globe } from 'lucide-react';
import { Button } from '@/components/ui/button';
import { useLanguage } from '@/contexts/language-context';

export function LanguageToggle() {
  const { language, setLanguage } = useLanguage();
  const [mounted, setMounted] = React.useState(false);

  React.useEffect(() => {
    setMounted(true);
  }, []);

  if (!mounted) {
    return <Button variant="ghost" size="icon" className="h-9 w-9" />;
  }

  const toggleLanguage = () => {
    setLanguage(language === 'it' ? 'en' : 'it');
  };

  return (
    <Button
      variant="ghost"
      size="icon"
      className="h-9 w-9"
      onClick={toggleLanguage}
      title={language === 'it' ? 'Switch to English' : 'Passa all\'Italiano'}
    >
      <Globe className="h-4 w-4" />
      <span className="sr-only ml-2 text-xs font-medium">
        {language.toUpperCase()}
      </span>
    </Button>
  );
}
