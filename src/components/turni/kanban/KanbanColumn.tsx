'use client';

import { useDroppable } from '@dnd-kit/core';
import { Users } from 'lucide-react';
import { cn } from '@/lib/utils';
import { Badge } from '@/components/ui/badge';
import { TurnoKanbanCard } from './TurnoKanbanCard';
import { formatDateItalian } from '@/hooks/use-extracted-turni';
import type { ExtractedTurno } from '@/hooks/use-planning-chat';

interface KanbanColumnProps {
  date: string;
  turni: ExtractedTurno[];
  onEditTurno: (turno: ExtractedTurno, index: number) => void;
  onDeleteTurno: (turno: ExtractedTurno, index: number) => void;
  isToday?: boolean;
}

export function KanbanColumn({
  date,
  turni,
  onEditTurno,
  onDeleteTurno,
  isToday = false,
}: KanbanColumnProps) {
  const { setNodeRef, isOver, active } = useDroppable({
    id: date,
    data: { date },
  });

  const { dayName, dayNumber, monthName } = formatDateItalian(date);

  // Calculate total staff required for this day
  const totalStaff = turni.reduce((sum, t) => sum + t.num_collaboratori_richiesti, 0);

  return (
    <div
      ref={setNodeRef}
      className={cn(
        'flex flex-col min-w-[180px] w-[180px] rounded-xl transition-all',
        isOver && 'ring-2 ring-primary ring-offset-2',
        isToday && 'ring-2 ring-blue-500 ring-offset-1'
      )}
    >
      {/* Header */}
      <div
        className={cn(
          'px-3 py-2 rounded-t-xl border-b',
          isToday
            ? 'bg-blue-50 dark:bg-blue-950/50 border-blue-200 dark:border-blue-800'
            : 'bg-muted/50 border-border'
        )}
      >
        <div className="flex items-center justify-between">
          <div>
            <div className={cn('text-xs font-medium', isToday && 'text-blue-600 dark:text-blue-400')}>
              {dayName}
            </div>
            <div className="flex items-baseline gap-1">
              <span className={cn('text-lg font-bold', isToday && 'text-blue-600 dark:text-blue-400')}>
                {dayNumber}
              </span>
              <span className="text-xs text-muted-foreground">{monthName}</span>
            </div>
          </div>
          {turni.length > 0 && (
            <Badge variant="secondary" className="text-[10px] px-1.5 py-0">
              {turni.length} turni
            </Badge>
          )}
        </div>
        {totalStaff > 0 && (
          <div className="text-[10px] text-muted-foreground mt-1 flex items-center gap-1">
            <Users className="h-3 w-3" />
            {totalStaff} collaboratori
          </div>
        )}
      </div>

      {/* Cards container */}
      <div
        className={cn(
          'flex-1 p-2 space-y-2 min-h-[200px] rounded-b-xl transition-colors',
          isOver
            ? 'bg-primary/5 dark:bg-primary/10'
            : 'bg-muted/20 dark:bg-muted/10',
          // Show drop indicator when dragging over
          isOver && active && 'border-2 border-dashed border-primary'
        )}
      >
        {turni.length === 0 ? (
          <div className="flex items-center justify-center h-full text-xs text-muted-foreground">
            {isOver ? (
              <span className="text-primary font-medium">Rilascia qui</span>
            ) : (
              <span>Nessun turno</span>
            )}
          </div>
        ) : (
          turni.map((turno, index) => (
            <TurnoKanbanCard
              key={`${date}-${index}`}
              turno={turno}
              index={index}
              dayDate={date}
              onEdit={() => onEditTurno(turno, index)}
              onDelete={() => onDeleteTurno(turno, index)}
            />
          ))
        )}
      </div>
    </div>
  );
}
