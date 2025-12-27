'use client';

import { useMemo, useState } from 'react';
import { useTranslations } from 'next-intl';
import { Clock, Users, ChevronDown, ChevronUp, Sparkles, Calendar } from 'lucide-react';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Badge } from '@/components/ui/badge';
import { Button } from '@/components/ui/button';
import { Collapsible, CollapsibleContent, CollapsibleTrigger } from '@/components/ui/collapsible';
import { cn } from '@/lib/utils';
import type { Turno } from '@/hooks/use-turni';

interface ShiftsCardViewProps {
  turni: Turno[];
  weekStart: string;
  onViewShift?: (turno: Turno) => void;
}

const giorni = ['Lunedì', 'Martedì', 'Mercoledì', 'Giovedì', 'Venerdì', 'Sabato', 'Domenica'];

export function ShiftsCardView({ turni, weekStart, onViewShift }: ShiftsCardViewProps) {
  const t = useTranslations();
  const [openDays, setOpenDays] = useState<Set<number>>(new Set([0, 1, 2, 3, 4, 5, 6]));

  // Raggruppa turni per giorno della settimana
  const turniByDay = useMemo(() => {
    const weekStartDate = new Date(weekStart + 'T12:00:00');
    const result: Map<number, { date: string; turni: Turno[] }> = new Map();

    // Inizializza tutti i 7 giorni
    for (let i = 0; i < 7; i++) {
      const date = new Date(weekStartDate);
      date.setDate(weekStartDate.getDate() + i);
      const dateStr = date.toISOString().split('T')[0];
      result.set(i, { date: dateStr, turni: [] });
    }

    // Assegna turni ai giorni
    turni.forEach((turno) => {
      const turnoDate = new Date(turno.data + 'T12:00:00');
      const dayIndex = Math.floor((turnoDate.getTime() - weekStartDate.getTime()) / (1000 * 60 * 60 * 24));
      if (dayIndex >= 0 && dayIndex < 7) {
        result.get(dayIndex)?.turni.push(turno);
      }
    });

    // Ordina turni di ogni giorno per ora
    result.forEach((day) => {
      day.turni.sort((a, b) => a.ora_inizio.localeCompare(b.ora_inizio));
    });

    return result;
  }, [turni, weekStart]);

  const toggleDay = (dayIndex: number) => {
    const newOpenDays = new Set(openDays);
    if (newOpenDays.has(dayIndex)) {
      newOpenDays.delete(dayIndex);
    } else {
      newOpenDays.add(dayIndex);
    }
    setOpenDays(newOpenDays);
  };

  const formatDate = (dateStr: string) => {
    const date = new Date(dateStr + 'T12:00:00');
    return date.getDate();
  };

  const formatMonth = (dateStr: string) => {
    const date = new Date(dateStr + 'T12:00:00');
    return date.toLocaleDateString('it-IT', { month: 'short' });
  };

  return (
    <div className="space-y-3">
      {Array.from(turniByDay.entries()).map(([dayIndex, { date, turni: dayTurni }]) => {
        const isOpen = openDays.has(dayIndex);
        const totalAssigned = dayTurni.reduce(
          (sum, t) => sum + (t.Assegnazione_Turno?.length || 0),
          0
        );
        const totalRequired = dayTurni.reduce(
          (sum, t) => sum + t.num_collaboratori_richiesti,
          0
        );

        return (
          <Card key={dayIndex} className="overflow-hidden">
            <Collapsible open={isOpen} onOpenChange={() => toggleDay(dayIndex)}>
              <CollapsibleTrigger asChild>
                <CardHeader className="py-3 cursor-pointer hover:bg-muted/50 transition-colors">
                  <div className="flex items-center justify-between">
                    <div className="flex items-center gap-3">
                      <div className="flex flex-col items-center justify-center w-12 h-12 rounded-lg bg-primary/10">
                        <span className="text-lg font-bold text-primary">
                          {formatDate(date)}
                        </span>
                        <span className="text-[10px] text-muted-foreground uppercase">
                          {formatMonth(date)}
                        </span>
                      </div>
                      <div>
                        <CardTitle className="text-base">{giorni[dayIndex]}</CardTitle>
                        <p className="text-sm text-muted-foreground">
                          {dayTurni.length} {dayTurni.length === 1 ? 'turno' : 'turni'}
                        </p>
                      </div>
                    </div>

                    <div className="flex items-center gap-3">
                      {dayTurni.length > 0 && (
                        <Badge
                          variant={totalAssigned >= totalRequired ? 'default' : 'outline'}
                          className={cn(
                            'gap-1',
                            totalAssigned >= totalRequired
                              ? 'bg-green-100 text-green-700'
                              : 'text-orange-600 border-orange-300'
                          )}
                        >
                          <Users className="h-3 w-3" />
                          {totalAssigned}/{totalRequired}
                        </Badge>
                      )}
                      {isOpen ? (
                        <ChevronUp className="h-5 w-5 text-muted-foreground" />
                      ) : (
                        <ChevronDown className="h-5 w-5 text-muted-foreground" />
                      )}
                    </div>
                  </div>
                </CardHeader>
              </CollapsibleTrigger>

              <CollapsibleContent>
                <CardContent className="pt-0 pb-4">
                  {dayTurni.length === 0 ? (
                    <div className="text-center py-4 text-muted-foreground text-sm">
                      <Calendar className="h-8 w-8 mx-auto mb-2 opacity-50" />
                      Nessun turno programmato
                    </div>
                  ) : (
                    <div className="space-y-2">
                      {dayTurni.map((turno) => {
                        const assigned = turno.Assegnazione_Turno?.length || 0;
                        const required = turno.num_collaboratori_richiesti;
                        const isComplete = assigned >= required;

                        return (
                          <div
                            key={turno.id}
                            className={cn(
                              'flex items-center justify-between p-3 rounded-lg border',
                              'hover:bg-muted/50 transition-colors cursor-pointer',
                              turno.pubblicato && 'border-green-200 bg-green-50/50'
                            )}
                            onClick={() => onViewShift?.(turno)}
                          >
                            <div className="flex items-center gap-3">
                              {turno.Nucleo?.colore && (
                                <div
                                  className="w-2 h-10 rounded-full"
                                  style={{ backgroundColor: turno.Nucleo.colore }}
                                />
                              )}
                              <div>
                                <div className="flex items-center gap-2">
                                  <span className="font-medium">
                                    {turno.Nucleo?.nome || 'Nucleo'}
                                  </span>
                                  {turno.suggerito_da_ai && (
                                    <Sparkles className="h-3 w-3 text-purple-500" />
                                  )}
                                </div>
                                <div className="flex items-center gap-1 text-sm text-muted-foreground">
                                  <Clock className="h-3 w-3" />
                                  {turno.ora_inizio.slice(0, 5)} - {turno.ora_fine.slice(0, 5)}
                                </div>
                              </div>
                            </div>

                            <div className="flex items-center gap-2">
                              <Badge
                                variant={isComplete ? 'default' : 'outline'}
                                className={cn(
                                  'gap-1',
                                  isComplete
                                    ? 'bg-green-100 text-green-700'
                                    : 'text-orange-600 border-orange-300'
                                )}
                              >
                                <Users className="h-3 w-3" />
                                {assigned}/{required}
                              </Badge>
                            </div>
                          </div>
                        );
                      })}
                    </div>
                  )}
                </CardContent>
              </CollapsibleContent>
            </Collapsible>
          </Card>
        );
      })}
    </div>
  );
}
