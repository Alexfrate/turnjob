'use client';

import { useSearchParams } from 'next/navigation';
import { useMemo, useState, useEffect, Suspense } from 'react';
import { PlanningChatWithKanban } from '@/components/turni/chat/PlanningChatWithKanban';
import { CriticitaOnboardingChat } from '@/components/turni/onboarding';
import { useCriticitaContinuative } from '@/hooks/use-criticita-continuative';
import { Loader2 } from 'lucide-react';

// Utility functions for week calculations (settimana inizia da lunedì)
function getWeekStart(date: Date): Date {
  const d = new Date(date);
  const day = d.getDay();
  // Se domenica (0), torna indietro di 6 giorni al lunedì
  // Altrimenti torna indietro di (day-1) giorni
  const diff = day === 0 ? -6 : 1 - day;
  d.setDate(d.getDate() + diff);
  d.setHours(0, 0, 0, 0);
  return d;
}

function getWeekEnd(date: Date): Date {
  const start = getWeekStart(date);
  const end = new Date(start);
  end.setDate(start.getDate() + 6);
  return end;
}

// Formatta data in formato YYYY-MM-DD senza conversione UTC (evita shift di timezone)
function formatDateLocal(date: Date): string {
  const year = date.getFullYear();
  const month = String(date.getMonth() + 1).padStart(2, '0');
  const day = String(date.getDate()).padStart(2, '0');
  return `${year}-${month}-${day}`;
}

function AITurniContent() {
  const searchParams = useSearchParams();
  const weekParam = searchParams.get('week');
  const [showOnboarding, setShowOnboarding] = useState(false);
  const [onboardingChecked, setOnboardingChecked] = useState(false);

  // Carica le criticità continuative esistenti
  const { data: criticitaContinuative, isLoading: criticitaLoading } = useCriticitaContinuative();

  const { weekStart, weekEnd } = useMemo(() => {
    // Usa sempre la data corrente come default
    let baseDate = new Date();

    if (weekParam) {
      // Parse la data come locale (aggiunge T12:00 per evitare problemi timezone)
      const parsed = new Date(weekParam + 'T12:00:00');
      if (!isNaN(parsed.getTime())) {
        baseDate = parsed;
      }
    }

    const start = getWeekStart(baseDate);
    const end = getWeekEnd(baseDate);

    return {
      weekStart: formatDateLocal(start),
      weekEnd: formatDateLocal(end),
    };
  }, [weekParam]);

  // Verifica se mostrare l'onboarding
  useEffect(() => {
    if (criticitaLoading) return;

    // Controlla se l'onboarding è già stato completato
    const onboardingDone = localStorage.getItem('turni_criticita_onboarding_done');

    // Mostra onboarding solo se:
    // 1. Non è stato completato
    // 2. Non ci sono criticità esistenti
    if (!onboardingDone && (!criticitaContinuative || criticitaContinuative.length === 0)) {
      setShowOnboarding(true);
    }

    setOnboardingChecked(true);
  }, [criticitaContinuative, criticitaLoading]);

  // Completa l'onboarding
  const handleOnboardingComplete = () => {
    localStorage.setItem('turni_criticita_onboarding_done', 'true');
    setShowOnboarding(false);
  };

  // Salta l'onboarding
  const handleSkipOnboarding = () => {
    localStorage.setItem('turni_criticita_onboarding_done', 'true');
    setShowOnboarding(false);
  };

  // Apre il setup (onboarding) manualmente
  const handleOpenSetup = () => {
    setShowOnboarding(true);
  };

  // Mostra loading mentre verifica l'onboarding
  if (!onboardingChecked || criticitaLoading) {
    return (
      <div className="flex items-center justify-center h-[calc(100vh-12rem)]">
        <Loader2 className="h-8 w-8 animate-spin text-muted-foreground" />
      </div>
    );
  }

  // Mostra onboarding se necessario
  if (showOnboarding) {
    return (
      <div className="h-[calc(100vh-12rem)]">
        <CriticitaOnboardingChat
          onComplete={handleOnboardingComplete}
          onSkip={handleSkipOnboarding}
        />
      </div>
    );
  }

  return (
    <PlanningChatWithKanban
      weekStart={weekStart}
      weekEnd={weekEnd}
      onOpenSetup={handleOpenSetup}
    />
  );
}

function LoadingFallback() {
  return (
    <div className="flex items-center justify-center h-[calc(100vh-12rem)]">
      <Loader2 className="h-8 w-8 animate-spin text-muted-foreground" />
    </div>
  );
}

export default function AITurniPage() {
  return (
    <Suspense fallback={<LoadingFallback />}>
      <AITurniContent />
    </Suspense>
  );
}
