'use client';

import { useMemo, useState, Suspense } from 'react';
import { useSearchParams } from 'next/navigation';
import { useTranslations } from 'next-intl';
import Link from 'next/link';
import {
  ArrowLeft,
  CalendarDays,
  ChevronLeft,
  ChevronRight,
  Bot,
  Users,
  AlertTriangle,
  FileDown,
  Loader2,
} from 'lucide-react';
import { Button } from '@/components/ui/button';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Badge } from '@/components/ui/badge';
import { WeeklyScheduler } from '@/components/turni/manual';
import { useTurni } from '@/hooks/use-turni';
import { useCollaboratori } from '@/hooks/use-collaboratori';
import { useCriticitaContinuative } from '@/hooks/use-criticita-continuative';
import { exportWeeklySchedulePDF } from '@/lib/export/pdf-schedule';

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

function formatDate(date: Date, locale: string = 'it-IT'): string {
  return date.toLocaleDateString(locale, { day: 'numeric', month: 'short' });
}

// Formatta data in formato YYYY-MM-DD senza conversione UTC (evita shift di timezone)
function formatDateISO(date: Date): string {
  const year = date.getFullYear();
  const month = String(date.getMonth() + 1).padStart(2, '0');
  const day = String(date.getDate()).padStart(2, '0');
  return `${year}-${month}-${day}`;
}

function ManualTurniContent() {
  const t = useTranslations();
  const searchParams = useSearchParams();
  const weekParam = searchParams.get('week');

  const [selectedDate, setSelectedDate] = useState(() => {
    if (weekParam) {
      // Parse come locale (T12:00 evita problemi timezone)
      const parsed = new Date(weekParam + 'T12:00:00');
      if (!isNaN(parsed.getTime())) {
        return parsed;
      }
    }
    return new Date();
  });

  const weekStart = useMemo(() => getWeekStart(selectedDate), [selectedDate]);
  const weekEnd = useMemo(() => getWeekEnd(selectedDate), [selectedDate]);

  const weekStartStr = formatDateISO(weekStart);
  const weekEndStr = formatDateISO(weekEnd);

  // Fetch data for stats
  const { data: turni } = useTurni({
    data_inizio: weekStartStr,
    data_fine: weekEndStr,
  });
  const { collaboratoriAttivi } = useCollaboratori();
  const { data: criticitaContinuative } = useCriticitaContinuative({ attivo: true });

  const navigateWeek = (direction: 'prev' | 'next') => {
    const newDate = new Date(selectedDate);
    newDate.setDate(newDate.getDate() + (direction === 'next' ? 7 : -7));
    setSelectedDate(newDate);
  };

  const goToToday = () => {
    setSelectedDate(new Date());
  };

  const isCurrentWeek = useMemo(() => {
    const today = new Date();
    const currentWeekStart = getWeekStart(today);
    return weekStart.getTime() === currentWeekStart.getTime();
  }, [weekStart]);

  // Stats
  const turniCount = turni?.length || 0;
  const assignedCollaboratori = new Set(
    turni?.flatMap((t) => t.Assegnazione_Turno?.map((a) => a.collaboratore_id) || [])
  ).size;
  const criticalitiesCount = criticitaContinuative?.length || 0;

  const handleExportPDF = () => {
    if (!turni || turni.length === 0) {
      return;
    }

    exportWeeklySchedulePDF({
      turni,
      collaboratori: collaboratoriAttivi,
      weekStart,
      weekEnd,
      aziendaNome: 'Turnjob', // TODO: get from azienda context
    });
  };

  return (
    <div className="space-y-6">
      {/* Header */}
      <div className="flex items-center justify-between">
        <div className="flex items-center gap-3">
          <Link href="/dashboard/turni">
            <Button variant="ghost" size="icon">
              <ArrowLeft className="h-4 w-4" />
            </Button>
          </Link>
          <div>
            <h1 className="text-xl font-bold flex items-center gap-2">
              <CalendarDays className="h-5 w-5 text-green-500" />
              {t('shifts.manualManagement')}
            </h1>
            <p className="text-sm text-muted-foreground">
              {t('shifts.manualManagementDesc')}
            </p>
          </div>
        </div>

        <div className="flex gap-2">
          <Button
            variant="outline"
            size="sm"
            className="gap-2"
            onClick={handleExportPDF}
            disabled={!turni || turni.length === 0}
          >
            <FileDown className="h-4 w-4" />
            {t('common.exportPDF') || 'Export PDF'}
          </Button>
          <Link href={`/dashboard/turni/ai?week=${weekStartStr}`}>
            <Button variant="outline" size="sm" className="gap-2">
              <Bot className="h-4 w-4" />
              {t('shifts.planWithAI')}
            </Button>
          </Link>
        </div>
      </div>

      {/* Week Selector */}
      <Card>
        <CardContent className="py-4">
          <div className="flex items-center justify-between">
            <Button variant="outline" size="icon" onClick={() => navigateWeek('prev')}>
              <ChevronLeft className="h-4 w-4" />
            </Button>

            <div className="flex items-center gap-4">
              <div className="text-center">
                <p className="text-sm text-muted-foreground">{t('shifts.week')}</p>
                <p className="text-lg font-semibold">
                  {formatDate(weekStart)} - {formatDate(weekEnd)}
                </p>
              </div>
              {!isCurrentWeek && (
                <Button variant="outline" size="sm" onClick={goToToday}>
                  {t('calendar.today')}
                </Button>
              )}
            </div>

            <Button variant="outline" size="icon" onClick={() => navigateWeek('next')}>
              <ChevronRight className="h-4 w-4" />
            </Button>
          </div>
        </CardContent>
      </Card>

      {/* Stats */}
      <div className="grid gap-4 md:grid-cols-4">
        <Card>
          <CardContent className="pt-4">
            <div className="text-2xl font-bold">{turniCount}</div>
            <p className="text-xs text-muted-foreground">Turni pianificati</p>
          </CardContent>
        </Card>
        <Card>
          <CardContent className="pt-4">
            <div className="text-2xl font-bold">{assignedCollaboratori}</div>
            <p className="text-xs text-muted-foreground">Collaboratori assegnati</p>
          </CardContent>
        </Card>
        <Card>
          <CardContent className="pt-4">
            <div className="text-2xl font-bold text-orange-600">{criticalitiesCount}</div>
            <p className="text-xs text-muted-foreground">{t('criticalities.title')}</p>
          </CardContent>
        </Card>
        <Card>
          <CardContent className="pt-4">
            <div className="text-2xl font-bold">{collaboratoriAttivi.length}</div>
            <p className="text-xs text-muted-foreground">Collaboratori disponibili</p>
          </CardContent>
        </Card>
      </div>

      {/* Weekly Scheduler */}
      <WeeklyScheduler weekStart={weekStartStr} weekEnd={weekEndStr} />
    </div>
  );
}

function LoadingFallback() {
  return (
    <div className="flex items-center justify-center h-64">
      <Loader2 className="h-8 w-8 animate-spin text-muted-foreground" />
    </div>
  );
}

export default function ManualTurniPage() {
  return (
    <Suspense fallback={<LoadingFallback />}>
      <ManualTurniContent />
    </Suspense>
  );
}
