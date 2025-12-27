'use client';

import { useDraggable } from '@dnd-kit/core';
import { CSS } from '@dnd-kit/utilities';
import { Clock, Users, Trash2, GripVertical, Pencil, FileText } from 'lucide-react';
import { cn } from '@/lib/utils';
import { Badge } from '@/components/ui/badge';
import { Button } from '@/components/ui/button';
import type { ExtractedTurno } from '@/hooks/use-planning-chat';

interface TurnoKanbanCardProps {
  turno: ExtractedTurno;
  index: number;
  dayDate: string;
  onEdit: () => void;
  onDelete: () => void;
  isDragOverlay?: boolean;
}

export function TurnoKanbanCard({
  turno,
  index,
  dayDate,
  onEdit,
  onDelete,
  isDragOverlay = false,
}: TurnoKanbanCardProps) {
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

  return (
    <div
      ref={!isDragOverlay ? setNodeRef : undefined}
      style={!isDragOverlay ? style : undefined}
      className={cn(
        'group relative bg-white dark:bg-gray-800 rounded-lg border shadow-sm p-3 transition-all',
        isDragging && 'ring-2 ring-primary shadow-lg',
        isDragOverlay && 'shadow-xl ring-2 ring-primary cursor-grabbing',
        !isDragOverlay && 'hover:shadow-md cursor-grab'
      )}
    >
      {/* Drag handle */}
      <div
        {...(!isDragOverlay ? { ...attributes, ...listeners } : {})}
        className="absolute left-1 top-1/2 -translate-y-1/2 opacity-0 group-hover:opacity-100 transition-opacity cursor-grab"
      >
        <GripVertical className="h-4 w-4 text-muted-foreground" />
      </div>

      {/* Content */}
      <div className="pl-4">
        {/* Header: Nucleo badge */}
        <div className="flex items-center justify-between mb-2">
          <Badge
            className="text-xs font-medium"
            style={{
              backgroundColor: turno.nucleo_colore ? `${turno.nucleo_colore}20` : undefined,
              borderColor: turno.nucleo_colore || undefined,
              color: turno.nucleo_colore || undefined,
            }}
            variant="outline"
          >
            {turno.nucleo_nome}
          </Badge>

          {/* Action buttons */}
          <div className="flex items-center gap-1 opacity-0 group-hover:opacity-100 transition-opacity">
            <Button
              variant="ghost"
              size="icon"
              className="h-6 w-6"
              onClick={(e) => {
                e.stopPropagation();
                onEdit();
              }}
            >
              <Pencil className="h-3 w-3" />
            </Button>
            <Button
              variant="ghost"
              size="icon"
              className="h-6 w-6 hover:text-destructive"
              onClick={(e) => {
                e.stopPropagation();
                onDelete();
              }}
            >
              <Trash2 className="h-3 w-3" />
            </Button>
          </div>
        </div>

        {/* Time */}
        <div className="flex items-center gap-1 text-sm text-muted-foreground mb-1">
          <Clock className="h-3.5 w-3.5" />
          <span>
            {turno.ora_inizio} - {turno.ora_fine}
          </span>
        </div>

        {/* Staff required */}
        <div className="flex items-center gap-1 text-sm text-muted-foreground">
          <Users className="h-3.5 w-3.5" />
          <span>
            {turno.num_collaboratori_richiesti} collaborator
            {turno.num_collaboratori_richiesti !== 1 ? 'i' : 'e'}
          </span>
        </div>

        {/* Note (if present) */}
        {turno.note && (
          <div className="mt-2 text-xs text-muted-foreground italic truncate flex items-center gap-1" title={turno.note}>
            <FileText className="h-3 w-3 flex-shrink-0" />
            {turno.note}
          </div>
        )}

        {/* Confidence (if present) */}
        {turno.confidenza && (
          <div className="mt-1 text-[10px] text-muted-foreground">
            Confidenza: {Math.round(turno.confidenza * 100)}%
          </div>
        )}
      </div>
    </div>
  );
}

// Overlay version for drag preview
export function TurnoKanbanCardOverlay({ turno, index, dayDate }: Omit<TurnoKanbanCardProps, 'onEdit' | 'onDelete'>) {
  return (
    <TurnoKanbanCard
      turno={turno}
      index={index}
      dayDate={dayDate}
      onEdit={() => {}}
      onDelete={() => {}}
      isDragOverlay
    />
  );
}
