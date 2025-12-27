'use client';

import { useState, useMemo } from 'react';
import { useTranslations } from 'next-intl';
import { useRouter } from 'next/navigation';
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { Badge } from '@/components/ui/badge';
import { Tabs, TabsContent, TabsList, TabsTrigger } from '@/components/ui/tabs';
import {
  ChevronLeft,
  ChevronRight,
  Bot,
  CalendarDays,
  AlertTriangle,
  Plane,
  Package,
  Flame,
  List,
  LayoutGrid,
  Clock,
  Loader2
} from 'lucide-react';
import { usePeriodiCriticiAttivi } from '@/hooks/use-ai-scheduling';
import { useTurniCalendar, type Turno } from '@/hooks/use-turni';
import { ShiftsListView, ShiftsCardView, ShiftsTimelineView } from '@/components/turni/views';
import { cn } from '@/lib/utils';

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

function formatFullDate(date: Date, locale: string = 'it-IT'): string {
  return date.toLocaleDateString(locale, { day: 'numeric', month: 'long', year: 'numeric' });
}

// Formatta data in formato YYYY-MM-DD senza conversione UTC (evita shift di timezone)
function formatDateISO(date: Date): string {
  const year = date.getFullYear();
  const month = String(date.getMonth() + 1).padStart(2, '0');
  const day = String(date.getDate()).padStart(2, '0');
  return `${year}-${month}-${day}`;
}

export default function TurniPage() {
  const t = useTranslations();
  const router = useRouter();
  const [selectedDate, setSelectedDate] = useState(new Date());
  const [viewMode, setViewMode] = useState<'list' | 'cards' | 'timeline'>('cards');

  const weekStart = useMemo(() => getWeekStart(selectedDate), [selectedDate]);
  const weekEnd = useMemo(() => getWeekEnd(selectedDate), [selectedDate]);

  // Fetch critical periods for selected week
  const { data: periodiCritici, isLoading: isLoadingPeriodi } = usePeriodiCriticiAttivi(
    formatDateISO(weekStart),
    formatDateISO(weekEnd)
  );

  // Fetch turni for selected week
  const { turni, isLoading: isLoadingTurni } = useTurniCalendar(
    formatDateISO(weekStart),
    formatDateISO(weekEnd)
  );

  // Handler for viewing shift details
  const handleViewShift = (turno: Turno) => {
    router.push(`/dashboard/turni/manual?week=${formatDateISO(weekStart)}&turno=${turno.id}`);
  };

  const navigateWeek = (direction: 'prev' | 'next') => {
    const newDate = new Date(selectedDate);
    newDate.setDate(newDate.getDate() + (direction === 'next' ? 7 : -7));
    setSelectedDate(newDate);
  };

  const goToToday = () => {
    setSelectedDate(new Date());
  };

  // Mock data for alerts (to be replaced with real data)
  const weekAlerts = useMemo(() => {
    const alerts: { type: 'vacation' | 'critical' | 'delivery'; count: number; icon: React.ReactNode }[] = [];

    // Add critical periods from API
    if (periodiCritici && periodiCritici.length > 0) {
      alerts.push({
        type: 'critical',
        count: periodiCritici.length,
        icon: <Flame className="h-4 w-4 text-orange-500" />,
      });
    }

    return alerts;
  }, [periodiCritici]);

  const isCurrentWeek = useMemo(() => {
    const today = new Date();
    const currentWeekStart = getWeekStart(today);
    return weekStart.getTime() === currentWeekStart.getTime();
  }, [weekStart]);

  return (
    <div className="space-y-6">
      {/* Header */}
      <div>
        <h1 className="text-2xl font-bold">{t('shifts.title')}</h1>
        <p className="text-muted-foreground">{t('shifts.subtitle')}</p>
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

      {/* Week Alerts */}
      {weekAlerts.length > 0 && (
        <div className="flex items-center gap-2 p-3 bg-muted/50 rounded-lg">
          <AlertTriangle className="h-4 w-4 text-yellow-600" />
          <span className="text-sm font-medium">{t('shifts.weekAlerts')}:</span>
          <div className="flex items-center gap-3">
            {weekAlerts.map((alert, idx) => (
              <Badge key={idx} variant="outline" className="gap-1">
                {alert.icon}
                {alert.count} {t(`shifts.${alert.type === 'critical' ? 'criticalPeriods' : alert.type === 'vacation' ? 'vacations' : 'delivery'}`)}
              </Badge>
            ))}
          </div>
        </div>
      )}

      {/* Mode Selection Cards */}
      <div className="grid gap-6 md:grid-cols-2">
        {/* AI Mode */}
        <Card
          className={cn(
            'cursor-pointer transition-all hover:shadow-lg hover:border-primary',
            'group relative overflow-hidden'
          )}
          onClick={() => router.push(`/dashboard/turni/ai?week=${formatDateISO(weekStart)}`)}
        >
          <div className="absolute inset-0 bg-gradient-to-br from-blue-500/5 to-purple-500/5 opacity-0 group-hover:opacity-100 transition-opacity" />
          <CardHeader>
            <div className="flex items-center gap-3">
              <div className="p-3 bg-blue-500/10 rounded-lg">
                <Bot className="h-8 w-8 text-blue-600" />
              </div>
              <div>
                <CardTitle>{t('shifts.planWithAI')}</CardTitle>
                <CardDescription className="mt-1">
                  {t('shifts.planWithAIDesc')}
                </CardDescription>
              </div>
            </div>
          </CardHeader>
          <CardContent>
            <ul className="text-sm text-muted-foreground space-y-2">
              <li className="flex items-center gap-2">
                <span className="w-1.5 h-1.5 bg-blue-500 rounded-full" />
                {t('criticalities.continuativeDesc')}
              </li>
              <li className="flex items-center gap-2">
                <span className="w-1.5 h-1.5 bg-blue-500 rounded-full" />
                {t('criticalities.sporadicDesc')}
              </li>
            </ul>
          </CardContent>
        </Card>

        {/* Manual Mode */}
        <Card
          className={cn(
            'cursor-pointer transition-all hover:shadow-lg hover:border-primary',
            'group relative overflow-hidden'
          )}
          onClick={() => router.push(`/dashboard/turni/manual?week=${formatDateISO(weekStart)}`)}
        >
          <div className="absolute inset-0 bg-gradient-to-br from-green-500/5 to-emerald-500/5 opacity-0 group-hover:opacity-100 transition-opacity" />
          <CardHeader>
            <div className="flex items-center gap-3">
              <div className="p-3 bg-green-500/10 rounded-lg">
                <CalendarDays className="h-8 w-8 text-green-600" />
              </div>
              <div>
                <CardTitle>{t('shifts.manualManagement')}</CardTitle>
                <CardDescription className="mt-1">
                  {t('shifts.manualManagementDesc')}
                </CardDescription>
              </div>
            </div>
          </CardHeader>
          <CardContent>
            <ul className="text-sm text-muted-foreground space-y-2">
              <li className="flex items-center gap-2">
                <span className="w-1.5 h-1.5 bg-green-500 rounded-full" />
                Drag & drop collaboratori
              </li>
              <li className="flex items-center gap-2">
                <span className="w-1.5 h-1.5 bg-green-500 rounded-full" />
                Validazione automatica conflitti
              </li>
            </ul>
          </CardContent>
        </Card>
      </div>

      {/* Quick Stats */}
      <div className="grid gap-4 md:grid-cols-4">
        <Card>
          <CardContent className="pt-4">
            <div className="text-2xl font-bold">{turni.length}</div>
            <p className="text-xs text-muted-foreground">Turni pianificati</p>
          </CardContent>
        </Card>
        <Card>
          <CardContent className="pt-4">
            <div className="text-2xl font-bold">
              {turni.reduce((sum, t) => sum + (t.Assegnazione_Turno?.length || 0), 0)}
            </div>
            <p className="text-xs text-muted-foreground">Collaboratori assegnati</p>
          </CardContent>
        </Card>
        <Card>
          <CardContent className="pt-4">
            <div className="text-2xl font-bold text-orange-600">
              {periodiCritici?.length || 0}
            </div>
            <p className="text-xs text-muted-foreground">{t('criticalities.title')}</p>
          </CardContent>
        </Card>
        <Card>
          <CardContent className="pt-4">
            <div className={cn(
              'text-2xl font-bold',
              turni.length > 0 ? (
                turni.reduce((sum, t) => sum + (t.Assegnazione_Turno?.length || 0), 0) >=
                turni.reduce((sum, t) => sum + t.num_collaboratori_richiesti, 0)
                  ? 'text-green-600'
                  : 'text-orange-600'
              ) : 'text-muted-foreground'
            )}>
              {turni.length > 0
                ? `${Math.round(
                    (turni.reduce((sum, t) => sum + (t.Assegnazione_Turno?.length || 0), 0) /
                    turni.reduce((sum, t) => sum + t.num_collaboratori_richiesti, 0)) * 100
                  )}%`
                : '0%'}
            </div>
            <p className="text-xs text-muted-foreground">Copertura</p>
          </CardContent>
        </Card>
      </div>

      {/* Turni Definiti Section */}
      <Card>
        <CardHeader>
          <div className="flex items-center justify-between">
            <div>
              <CardTitle className="flex items-center gap-2">
                <CalendarDays className="h-5 w-5" />
                Turni pianificati
              </CardTitle>
              <CardDescription>
                Turni definiti per la settimana {formatDate(weekStart)} - {formatDate(weekEnd)}
              </CardDescription>
            </div>
            <Tabs value={viewMode} onValueChange={(v) => setViewMode(v as typeof viewMode)}>
              <TabsList>
                <TabsTrigger value="list" className="gap-1">
                  <List className="h-4 w-4" />
                  <span className="hidden sm:inline">Lista</span>
                </TabsTrigger>
                <TabsTrigger value="cards" className="gap-1">
                  <LayoutGrid className="h-4 w-4" />
                  <span className="hidden sm:inline">Card</span>
                </TabsTrigger>
                <TabsTrigger value="timeline" className="gap-1">
                  <Clock className="h-4 w-4" />
                  <span className="hidden sm:inline">Timeline</span>
                </TabsTrigger>
              </TabsList>
            </Tabs>
          </div>
        </CardHeader>
        <CardContent>
          {isLoadingTurni ? (
            <div className="flex items-center justify-center py-12">
              <Loader2 className="h-8 w-8 animate-spin text-muted-foreground" />
            </div>
          ) : (
            <>
              {viewMode === 'list' && (
                <ShiftsListView
                  turni={turni}
                  onViewShift={handleViewShift}
                />
              )}
              {viewMode === 'cards' && (
                <ShiftsCardView
                  turni={turni}
                  weekStart={formatDateISO(weekStart)}
                  onViewShift={handleViewShift}
                />
              )}
              {viewMode === 'timeline' && (
                <ShiftsTimelineView
                  turni={turni}
                  weekStart={formatDateISO(weekStart)}
                  onViewShift={handleViewShift}
                />
              )}
            </>
          )}
        </CardContent>
      </Card>
    </div>
  );
}
