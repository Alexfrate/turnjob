"use client";

import { Bell, Menu, Search, User } from "lucide-react";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { ThemeToggle } from "@/components/theme-toggle";
import { LanguageSelector } from "@/components/language-selector";
import { useLanguage } from "@/contexts/language-context";

export function Header() {
  const { t } = useLanguage();

  return (
    <header className="sticky top-0 z-10 flex h-16 flex-shrink-0 border-b border-neutral-200 dark:border-neutral-800 bg-white dark:bg-neutral-900">
      <div className="flex flex-1 justify-between px-6">
        {/* Mobile menu button */}
        <div className="flex items-center md:hidden">
          <Button variant="ghost" size="icon">
            <Menu className="h-6 w-6 dark:text-neutral-300" />
          </Button>
        </div>

        {/* Search bar */}
        <div className="flex flex-1 items-center justify-center px-2 md:ml-6 md:justify-start">
          <div className="w-full max-w-lg">
            <div className="relative">
              <Search className="absolute left-3 top-1/2 -translate-y-1/2 h-5 w-5 text-neutral-400 dark:text-neutral-500" />
              <Input
                type="search"
                placeholder={t('dashboard.search')}
                className="pl-10 bg-neutral-50 dark:bg-neutral-800 dark:border-neutral-700 dark:text-neutral-200 dark:placeholder:text-neutral-500 border-0"
              />
            </div>
          </div>
        </div>

        {/* Right section */}
        <div className="flex items-center gap-2">
          {/* Language Selector */}
          <LanguageSelector />

          {/* Theme Toggle */}
          <ThemeToggle />

          {/* Notifications */}
          <Button variant="ghost" size="icon" className="relative">
            <Bell className="h-5 w-5 text-neutral-700 dark:text-neutral-300" />
            <span className="absolute top-1.5 right-1.5 h-2 w-2 rounded-full bg-danger-500"></span>
          </Button>

          {/* User menu */}
          <Button variant="ghost" className="gap-2">
            <div className="w-8 h-8 rounded-full bg-primary-100 dark:bg-primary-900/30 flex items-center justify-center">
              <User className="h-4 w-4 text-primary-700 dark:text-primary-400" />
            </div>
            <div className="hidden md:block text-left">
              <div className="text-sm font-medium text-neutral-900 dark:text-neutral-100">Admin</div>
              <div className="text-xs text-neutral-500 dark:text-neutral-400">admin@azienda.it</div>
            </div>
          </Button>
        </div>
      </div>
    </header>
  );
}
