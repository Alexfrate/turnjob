'use client';

import { useDraggable } from '@dnd-kit/core';
import { CSS } from '@dnd-kit/utilities';
import { Clock, Users, Trash2, Pencil } from 'lucide-react';
import { cn } from '@/lib/utils';
import { Button } from '@/components/ui/button';
import type { ExtractedTurno } from '@/hooks/use-planning-chat';

interface TurnoTimelineCardProps {
  turno: ExtractedTurno;
  index: number;
  dayDate: string;
  height: number;
  onEdit: () => void;
  onDelete: () => void;
  isDragOverlay?: boolean;
}

export function TurnoTimelineCard({
  turno,
  index,
  dayDate,
  height,
  onEdit,
  onDelete,
  isDragOverlay = false,
}: TurnoTimelineCardProps) {
  const id = `turno-${dayDate}-${index}`;

  const { attributes, listeners, setNodeRef, transform, isDragging } = useDraggable({
    id,
    data: {
      turno,
      index,
      dayDate,
    },
  });

  const style = {
    transform: CSS.Translate.toString(transform),
    opacity: isDragging ? 0.5 : 1,
  };

  // Versione compatta per card piccole (< 50px)
  const isCompact = height < 50;

  const combinedStyle = {
    ...(!isDragOverlay ? style : {}),
    backgroundColor: turno.nucleo_colore ? `${turno.nucleo_colore}15` : 'hsl(var(--card))',
    borderColor: turno.nucleo_colore || 'hsl(var(--border))',
  };

  return (
    <div
      ref={!isDragOverlay ? setNodeRef : undefined}
      style={combinedStyle}
      {...(!isDragOverlay ? { ...attributes, ...listeners } : {})}
      className={cn(
        'group h-full rounded-md border shadow-sm transition-all cursor-grab overflow-hidden',
        isDragging && 'ring-2 ring-primary shadow-lg',
        isDragOverlay && 'shadow-xl ring-2 ring-primary cursor-grabbing',
        !isDragOverlay && 'hover:shadow-md'
      )}
    >
      {/* Content */}
      <div className={cn('h-full flex flex-col', isCompact ? 'p-1' : 'p-2')}>
        {/* Header: Nucleo + Actions */}
        <div className="flex items-center justify-between gap-1">
          <span
            className={cn(
              'font-medium truncate',
              isCompact ? 'text-[10px]' : 'text-xs'
            )}
            style={{ color: turno.nucleo_colore || 'inherit' }}
          >
            {turno.nucleo_nome}
          </span>

          {/* Action buttons - visibili su hover */}
          <div className="flex items-center gap-0.5 opacity-0 group-hover:opacity-100 transition-opacity">
            <Button
              variant="ghost"
              size="icon"
              className="h-5 w-5"
              onClick={(e) => {
                e.stopPropagation();
                onEdit();
              }}
            >
              <Pencil className="h-2.5 w-2.5" />
            </Button>
            <Button
              variant="ghost"
              size="icon"
              className="h-5 w-5 hover:text-destructive"
              onClick={(e) => {
                e.stopPropagation();
                onDelete();
              }}
            >
              <Trash2 className="h-2.5 w-2.5" />
            </Button>
          </div>
        </div>

        {/* Time & Staff */}
        {!isCompact && (
          <div className="flex-1 flex flex-col justify-center gap-0.5 mt-1">
            <div className="flex items-center gap-1 text-[10px] text-muted-foreground">
              <Clock className="h-2.5 w-2.5" />
              <span>
                {turno.ora_inizio} - {turno.ora_fine}
              </span>
            </div>
            <div className="flex items-center gap-1 text-[10px] text-muted-foreground">
              <Users className="h-2.5 w-2.5" />
              <span>{turno.num_collaboratori_richiesti}</span>
            </div>
          </div>
        )}

        {/* Compact: solo orario inline */}
        {isCompact && (
          <div className="text-[9px] text-muted-foreground">
            {turno.ora_inizio}-{turno.ora_fine} • {turno.num_collaboratori_richiesti}p
          </div>
        )}
      </div>
    </div>
  );
}

// Overlay version for drag preview
export function TurnoTimelineCardOverlay({
  turno,
  index,
  dayDate,
}: Omit<TurnoTimelineCardProps, 'onEdit' | 'onDelete' | 'height'>) {
  return (
    <div
      className="w-32 h-16 rounded-md border shadow-xl ring-2 ring-primary p-2"
      style={{
        backgroundColor: turno.nucleo_colore ? `${turno.nucleo_colore}15` : 'hsl(var(--card))',
        borderColor: turno.nucleo_colore || 'hsl(var(--border))',
      }}
    >
      <div className="text-xs font-medium" style={{ color: turno.nucleo_colore || 'inherit' }}>
        {turno.nucleo_nome}
      </div>
      <div className="text-[10px] text-muted-foreground mt-1">
        {turno.ora_inizio} - {turno.ora_fine}
      </div>
    </div>
  );
}
