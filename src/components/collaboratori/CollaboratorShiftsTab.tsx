'use client';

import { useMemo, useState } from 'react';
import { useTranslations } from 'next-intl';
import { Calendar, Clock, Users, ChevronLeft, ChevronRight, FileText } from 'lucide-react';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { Badge } from '@/components/ui/badge';
import { ScrollArea } from '@/components/ui/scroll-area';
import { cn } from '@/lib/utils';
import type { Turno } from '@/hooks/use-turni';

interface CollaboratorShiftsTabProps {
  collaboratoreId: string;
  collaboratoreName: string;
  turni: Turno[];
  isLoading?: boolean;
}

// Helper functions
function getWeekStart(date: Date): Date {
  const d = new Date(date);
  const day = d.getDay();
  const diff = d.getDate() - day + (day === 0 ? -6 : 1);
  d.setDate(diff);
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

function formatFullDate(date: string, locale: string = 'it-IT'): string {
  return new Date(date).toLocaleDateString(locale, {
    weekday: 'short',
    day: 'numeric',
    month: 'short',
  });
}

export function CollaboratorShiftsTab({
  collaboratoreId,
  collaboratoreName,
  turni,
  isLoading = false,
}: CollaboratorShiftsTabProps) {
  const t = useTranslations();
  const [selectedDate, setSelectedDate] = useState(() => new Date());

  const weekStart = useMemo(() => getWeekStart(selectedDate), [selectedDate]);
  const weekEnd = useMemo(() => getWeekEnd(selectedDate), [selectedDate]);

  // Filter turni for the selected week that include this collaboratore
  const weekTurni = useMemo(() => {
    const weekStartStr = weekStart.toISOString().split('T')[0];
    const weekEndStr = weekEnd.toISOString().split('T')[0];

    return turni
      .filter((turno) => {
        const turnoDate = turno.data;
        const hasCollaboratore = turno.Assegnazione_Turno?.some(
          (a) => a.collaboratore_id === collaboratoreId
        );
        return hasCollaboratore && turnoDate >= weekStartStr && turnoDate <= weekEndStr;
      })
      .sort((a, b) => {
        // Sort by date, then by start time
        if (a.data !== b.data) return a.data.localeCompare(b.data);
        return a.ora_inizio.localeCompare(b.ora_inizio);
      });
  }, [turni, collaboratoreId, weekStart, weekEnd]);

  // Calculate statistics
  const stats = useMemo(() => {
    const totalHours = weekTurni.reduce((acc, turno) => {
      const [startH, startM] = turno.ora_inizio.split(':').map(Number);
      const [endH, endM] = turno.ora_fine.split(':').map(Number);
      let hours = endH - startH + (endM - startM) / 60;
      // Handle overnight shifts
      if (hours < 0) hours += 24;
      return acc + hours;
    }, 0);

    const uniqueDays = new Set(weekTurni.map((t) => t.data)).size;

    return {
      totalShifts: weekTurni.length,
      totalHours: Math.round(totalHours * 10) / 10,
      daysWorked: uniqueDays,
    };
  }, [weekTurni]);

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

  // Group turni by day
  const turniByDay = useMemo(() => {
    const grouped: Record<string, Turno[]> = {};
    weekTurni.forEach((turno) => {
      if (!grouped[turno.data]) grouped[turno.data] = [];
      grouped[turno.data].push(turno);
    });
    return grouped;
  }, [weekTurni]);

  if (isLoading) {
    return (
      <div className="flex items-center justify-center h-64 text-muted-foreground">
        Caricamento turni...
      </div>
    );
  }

  return (
    <div className="space-y-4">
      {/* Week Navigator */}
      <Card>
        <CardContent className="py-3">
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

      {/* Statistics */}
      <div className="grid grid-cols-3 gap-4">
        <Card>
          <CardContent className="pt-4 pb-3">
            <div className="flex items-center gap-2">
              <Calendar className="h-4 w-4 text-muted-foreground" />
              <div>
                <p className="text-2xl font-bold">{stats.totalShifts}</p>
                <p className="text-xs text-muted-foreground">Turni</p>
              </div>
            </div>
          </CardContent>
        </Card>
        <Card>
          <CardContent className="pt-4 pb-3">
            <div className="flex items-center gap-2">
              <Clock className="h-4 w-4 text-muted-foreground" />
              <div>
                <p className="text-2xl font-bold">{stats.totalHours}h</p>
                <p className="text-xs text-muted-foreground">Ore totali</p>
              </div>
            </div>
          </CardContent>
        </Card>
        <Card>
          <CardContent className="pt-4 pb-3">
            <div className="flex items-center gap-2">
              <Users className="h-4 w-4 text-muted-foreground" />
              <div>
                <p className="text-2xl font-bold">{stats.daysWorked}</p>
                <p className="text-xs text-muted-foreground">Giorni lavorati</p>
              </div>
            </div>
          </CardContent>
        </Card>
      </div>

      {/* Shifts List */}
      <Card>
        <CardHeader className="pb-3">
          <CardTitle className="text-base flex items-center gap-2">
            <FileText className="h-4 w-4" />
            Turni della settimana
          </CardTitle>
        </CardHeader>
        <CardContent>
          {weekTurni.length === 0 ? (
            <div className="text-center py-8 text-muted-foreground">
              <Calendar className="h-8 w-8 mx-auto mb-2 opacity-50" />
              <p>Nessun turno per questa settimana</p>
            </div>
          ) : (
            <ScrollArea className="h-[400px] pr-4">
              <div className="space-y-4">
                {Object.entries(turniByDay).map(([date, dayTurni]) => (
                  <div key={date}>
                    <div className="flex items-center gap-2 mb-2">
                      <div className="font-medium text-sm">{formatFullDate(date)}</div>
                      <Badge variant="secondary" className="text-xs">
                        {dayTurni.length} {dayTurni.length === 1 ? 'turno' : 'turni'}
                      </Badge>
                    </div>
                    <div className="space-y-2 ml-4 border-l-2 border-muted pl-4">
                      {dayTurni.map((turno) => {
                        const assegnazione = turno.Assegnazione_Turno?.find(
                          (a) => a.collaboratore_id === collaboratoreId
                        );

                        return (
                          <div
                            key={turno.id}
                            className={cn(
                              'p-3 rounded-lg border bg-card',
                              'border-l-4',
                              assegnazione?.confermato && 'border-l-green-500',
                              !assegnazione?.confermato && 'border-l-yellow-500'
                            )}
                            style={{
                              borderLeftColor: turno.Nucleo?.colore || undefined,
                            }}
                          >
                            <div className="flex items-center justify-between">
                              <div className="flex items-center gap-2">
                                <Clock className="h-4 w-4 text-muted-foreground" />
                                <span className="font-medium">
                                  {turno.ora_inizio.slice(0, 5)} - {turno.ora_fine.slice(0, 5)}
                                </span>
                              </div>
                              <div className="flex items-center gap-2">
                                {assegnazione?.confermato ? (
                                  <Badge variant="default" className="bg-green-500 text-xs">
                                    Confermato
                                  </Badge>
                                ) : (
                                  <Badge variant="secondary" className="text-xs">
                                    In attesa
                                  </Badge>
                                )}
                              </div>
                            </div>
                            <div className="mt-1 flex items-center gap-2 text-sm text-muted-foreground">
                              <div
                                className="w-2 h-2 rounded-full"
                                style={{ backgroundColor: turno.Nucleo?.colore }}
                              />
                              <span>{turno.Nucleo?.nome || 'Nucleo'}</span>
                              {turno.suggerito_da_ai && (
                                <Badge variant="outline" className="text-xs text-purple-600">
                                  AI
                                </Badge>
                              )}
                            </div>
                            {turno.note && (
                              <p className="mt-2 text-xs text-muted-foreground border-t pt-2">
                                {turno.note}
                              </p>
                            )}
                          </div>
                        );
                      })}
                    </div>
                  </div>
                ))}
              </div>
            </ScrollArea>
          )}
        </CardContent>
      </Card>
    </div>
  );
}
