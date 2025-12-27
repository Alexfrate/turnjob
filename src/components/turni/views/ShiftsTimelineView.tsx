'use client';

import { useMemo, useRef, useEffect } from 'react';
import { useTranslations } from 'next-intl';
import { Clock, Users, Sparkles } from 'lucide-react';
import { Badge } from '@/components/ui/badge';
import { cn } from '@/lib/utils';
import type { Turno } from '@/hooks/use-turni';

interface ShiftsTimelineViewProps {
  turni: Turno[];
  weekStart: string;
  onViewShift?: (turno: Turno) => void;
}

const giorni = ['Lun', 'Mar', 'Mer', 'Gio', 'Ven', 'Sab', 'Dom'];
const hours = Array.from({ length: 24 }, (_, i) => i);

export function ShiftsTimelineView({ turni, weekStart, onViewShift }: ShiftsTimelineViewProps) {
  const t = useTranslations();
  const scrollContainerRef = useRef<HTMLDivElement>(null);

  // Scroll to 6:00 AM on mount
  useEffect(() => {
    if (scrollContainerRef.current) {
      const hourWidth = 60; // pixels per hour
      scrollContainerRef.current.scrollLeft = 6 * hourWidth;
    }
  }, []);

  // Group shifts by day and nucleo
  const timelineData = useMemo(() => {
    const weekStartDate = new Date(weekStart + 'T12:00:00');
    const nucleiMap = new Map<string, { nome: string; colore: string; turniByDay: Map<number, Turno[]> }>();

    turni.forEach((turno) => {
      const nucleoId = turno.nucleo_id;
      const nucleoNome = turno.Nucleo?.nome || 'Nucleo';
      const nucleoColore = turno.Nucleo?.colore || '#6366f1';

      if (!nucleiMap.has(nucleoId)) {
        nucleiMap.set(nucleoId, {
          nome: nucleoNome,
          colore: nucleoColore,
          turniByDay: new Map(),
        });
      }

      const turnoDate = new Date(turno.data + 'T12:00:00');
      const dayIndex = Math.floor((turnoDate.getTime() - weekStartDate.getTime()) / (1000 * 60 * 60 * 24));

      if (dayIndex >= 0 && dayIndex < 7) {
        const nucleo = nucleiMap.get(nucleoId)!;
        if (!nucleo.turniByDay.has(dayIndex)) {
          nucleo.turniByDay.set(dayIndex, []);
        }
        nucleo.turniByDay.get(dayIndex)!.push(turno);
      }
    });

    return Array.from(nucleiMap.entries()).map(([id, data]) => ({
      id,
      ...data,
    }));
  }, [turni, weekStart]);

  // Calculate position and width for a shift bar
  const getShiftStyle = (turno: Turno) => {
    const [startHour, startMin] = turno.ora_inizio.split(':').map(Number);
    const [endHour, endMin] = turno.ora_fine.split(':').map(Number);

    const startPosition = startHour + startMin / 60;
    const endPosition = endHour + endMin / 60;
    const duration = endPosition - startPosition;

    return {
      left: `${startPosition * 60}px`,
      width: `${Math.max(duration * 60, 30)}px`, // minimum 30px width
    };
  };

  const formatDate = (dayIndex: number) => {
    const date = new Date(weekStart + 'T12:00:00');
    date.setDate(date.getDate() + dayIndex);
    return date.getDate();
  };

  if (turni.length === 0) {
    return (
      <div className="text-center py-8 text-muted-foreground">
        <Clock className="h-12 w-12 mx-auto mb-3 opacity-50" />
        <p>Nessun turno pianificato per questa settimana</p>
      </div>
    );
  }

  return (
    <div className="border rounded-lg overflow-hidden bg-card">
      {/* Timeline container */}
      <div className="flex">
        {/* Left sidebar - Days */}
        <div className="flex-shrink-0 w-24 border-r bg-muted/30">
          {/* Header spacer */}
          <div className="h-10 border-b" />

          {/* Day labels */}
          {giorni.map((giorno, dayIndex) => (
            <div
              key={dayIndex}
              className={cn(
                'h-16 border-b flex flex-col items-center justify-center text-sm',
                dayIndex >= 5 && 'bg-muted/50'
              )}
            >
              <span className="font-medium">{giorno}</span>
              <span className="text-xs text-muted-foreground">{formatDate(dayIndex)}</span>
            </div>
          ))}
        </div>

        {/* Timeline grid */}
        <div
          ref={scrollContainerRef}
          className="flex-1 overflow-x-auto"
        >
          {/* Hour headers */}
          <div className="flex border-b h-10 sticky top-0 bg-card z-10">
            {hours.map((hour) => (
              <div
                key={hour}
                className="flex-shrink-0 w-[60px] border-r text-xs text-center py-2 text-muted-foreground"
              >
                {hour.toString().padStart(2, '0')}:00
              </div>
            ))}
          </div>

          {/* Day rows */}
          {giorni.map((_, dayIndex) => {
            // Get all shifts for this day
            const dayTurni = timelineData.flatMap((nucleo) =>
              (nucleo.turniByDay.get(dayIndex) || []).map((turno) => ({
                turno,
                colore: nucleo.colore,
              }))
            );

            return (
              <div
                key={dayIndex}
                className={cn(
                  'relative h-16 border-b',
                  dayIndex >= 5 && 'bg-muted/20'
                )}
              >
                {/* Hour grid lines */}
                <div className="absolute inset-0 flex">
                  {hours.map((hour) => (
                    <div
                      key={hour}
                      className={cn(
                        'flex-shrink-0 w-[60px] border-r border-dashed',
                        hour >= 6 && hour <= 22 ? 'border-muted-foreground/20' : 'border-muted/50'
                      )}
                    />
                  ))}
                </div>

                {/* Shift bars */}
                {dayTurni.map(({ turno, colore }) => {
                  const style = getShiftStyle(turno);
                  const assigned = turno.Assegnazione_Turno?.length || 0;
                  const required = turno.num_collaboratori_richiesti;
                  const isComplete = assigned >= required;

                  return (
                    <div
                      key={turno.id}
                      className={cn(
                        'absolute top-2 h-12 rounded-md cursor-pointer',
                        'flex items-center px-2 gap-1 overflow-hidden',
                        'transition-all hover:shadow-md hover:scale-[1.02]',
                        'border border-white/20'
                      )}
                      style={{
                        ...style,
                        backgroundColor: colore,
                        opacity: turno.pubblicato ? 1 : 0.7,
                      }}
                      onClick={() => onViewShift?.(turno)}
                      title={`${turno.Nucleo?.nome || 'Turno'} - ${turno.ora_inizio.slice(0, 5)} - ${turno.ora_fine.slice(0, 5)}`}
                    >
                      {/* Content - show based on width */}
                      <div className="flex items-center gap-1 text-white text-xs font-medium truncate">
                        {turno.suggerito_da_ai && (
                          <Sparkles className="h-3 w-3 flex-shrink-0" />
                        )}
                        <span className="truncate">{turno.Nucleo?.nome || 'Turno'}</span>
                      </div>

                      {/* Staff badge - only show if enough width */}
                      <Badge
                        variant="secondary"
                        className={cn(
                          'h-5 text-[10px] px-1 flex-shrink-0 ml-auto',
                          isComplete
                            ? 'bg-white/20 text-white'
                            : 'bg-orange-500 text-white'
                        )}
                      >
                        <Users className="h-2 w-2 mr-0.5" />
                        {assigned}/{required}
                      </Badge>
                    </div>
                  );
                })}
              </div>
            );
          })}
        </div>
      </div>

      {/* Legend */}
      {timelineData.length > 0 && (
        <div className="border-t p-3 bg-muted/30">
          <div className="flex flex-wrap gap-3">
            {timelineData.map((nucleo) => (
              <div key={nucleo.id} className="flex items-center gap-2 text-sm">
                <div
                  className="w-4 h-4 rounded"
                  style={{ backgroundColor: nucleo.colore }}
                />
                <span>{nucleo.nome}</span>
              </div>
            ))}
          </div>
        </div>
      )}
    </div>
  );
}
