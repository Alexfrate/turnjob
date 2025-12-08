"use client";

import { Bell, Building2, Check, ChevronDown, Menu, Plus, Search, User } from "lucide-react";
import { useRouter } from "next/navigation";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { ThemeToggle } from "@/components/theme-toggle";
import { Skeleton } from "@/components/ui/skeleton";
import {
  DropdownMenu,
  DropdownMenuContent,
  DropdownMenuItem,
  DropdownMenuLabel,
  DropdownMenuSeparator,
  DropdownMenuTrigger,
} from "@/components/ui/dropdown-menu";
import { useUser } from "@/hooks/use-user";
import { useActiveCompany } from "@/contexts/active-company-context";

function CompanySwitcher() {
  const { aziende, activeAzienda, setActiveAziendaId, isLoading } = useActiveCompany();
  const router = useRouter();

  if (isLoading) {
    return <Skeleton className="h-9 w-40" />;
  }

  if (aziende.length === 0) {
    return (
      <Button
        variant="outline"
        className="gap-2"
        onClick={() => router.push('/onboarding')}
      >
        <Plus className="h-4 w-4" />
        <span className="hidden sm:inline">Crea azienda</span>
      </Button>
    );
  }

  return (
    <DropdownMenu>
      <DropdownMenuTrigger asChild>
        <Button variant="outline" className="gap-2 max-w-[200px]">
          <Building2 className="h-4 w-4 shrink-0" />
          <span className="truncate hidden sm:inline">{activeAzienda?.nome || 'Seleziona'}</span>
          <ChevronDown className="h-4 w-4 shrink-0" />
        </Button>
      </DropdownMenuTrigger>
      <DropdownMenuContent align="end" className="w-[250px]">
        <DropdownMenuLabel>Le tue aziende</DropdownMenuLabel>
        <DropdownMenuSeparator />
        {aziende.map((azienda) => (
          <DropdownMenuItem
            key={azienda.id}
            onClick={() => setActiveAziendaId(azienda.id)}
            className="gap-2 cursor-pointer"
          >
            {azienda.id === activeAzienda?.id ? (
              <Check className="h-4 w-4 text-primary-600" />
            ) : (
              <span className="w-4" />
            )}
            <span className="truncate">{azienda.nome}</span>
          </DropdownMenuItem>
        ))}
        <DropdownMenuSeparator />
        <DropdownMenuItem
          onClick={() => router.push('/onboarding?newCompany=true')}
          className="gap-2 cursor-pointer text-primary-600 dark:text-primary-400"
        >
          <Plus className="h-4 w-4" />
          Aggiungi nuova azienda
        </DropdownMenuItem>
      </DropdownMenuContent>
    </DropdownMenu>
  );
}

export function Header() {
  const { user } = useUser();

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
                placeholder="Cerca collaboratori, turni..."
                className="pl-10 bg-neutral-50 dark:bg-neutral-800 dark:border-neutral-700 dark:text-neutral-200 dark:placeholder:text-neutral-500 border-0"
              />
            </div>
          </div>
        </div>

        {/* Right section */}
        <div className="flex items-center gap-2">
          {/* Company Switcher */}
          <CompanySwitcher />

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
              <div className="text-sm font-medium text-neutral-900 dark:text-neutral-100">Utente</div>
              <div className="text-xs text-neutral-500 dark:text-neutral-400">{user?.email || 'caricamento...'}</div>
            </div>
          </Button>
        </div>
      </div>
    </header>
  );
}
