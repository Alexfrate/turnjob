'use client';

import { useDraggable } from '@dnd-kit/core';
import { CSS } from '@dnd-kit/utilities';
import { User, GripVertical, AlertCircle } from 'lucide-react';
import { cn } from '@/lib/utils';
import { Badge } from '@/components/ui/badge';
import type { CollaboratoreConNuclei } from '@/hooks/use-collaboratori';

interface CollaboratorDragItemProps {
  collaboratore: CollaboratoreConNuclei;
  isAssigned?: boolean;
  hasConflict?: boolean;
  conflictMessage?: string;
  disabled?: boolean;
}

export function CollaboratorDragItem({
  collaboratore,
  isAssigned = false,
  hasConflict = false,
  conflictMessage,
  disabled = false,
}: CollaboratorDragItemProps) {
  const { attributes, listeners, setNodeRef, transform, isDragging } = useDraggable({
    id: `collaboratore-${collaboratore.id}`,
    data: {
      type: 'collaboratore',
      collaboratore,
    },
    disabled: disabled || hasConflict,
  });

  const style = transform
    ? {
        transform: CSS.Translate.toString(transform),
        zIndex: isDragging ? 1000 : undefined,
      }
    : undefined;

  // Get nucleo color if available
  const nucleoColor = collaboratore.Appartenenza_Nucleo?.[0]?.Nucleo?.colore;

  return (
    <div
      ref={setNodeRef}
      style={style}
      className={cn(
        'flex items-center gap-2 p-2 rounded-lg border transition-all',
        'bg-card hover:bg-accent/50',
        isDragging && 'opacity-50 shadow-lg ring-2 ring-primary',
        isAssigned && 'bg-green-50 dark:bg-green-950/20 border-green-200',
        hasConflict && 'bg-red-50 dark:bg-red-950/20 border-red-200 cursor-not-allowed',
        disabled && 'opacity-50 cursor-not-allowed',
        !disabled && !hasConflict && 'cursor-grab active:cursor-grabbing'
      )}
      {...attributes}
      {...listeners}
    >
      {/* Drag handle */}
      <GripVertical
        className={cn(
          'h-4 w-4 text-muted-foreground flex-shrink-0',
          (disabled || hasConflict) && 'opacity-30'
        )}
      />

      {/* Avatar */}
      <div
        className={cn(
          'w-8 h-8 rounded-full flex items-center justify-center text-xs font-medium flex-shrink-0',
          isAssigned ? 'bg-green-500 text-white' : 'bg-muted'
        )}
        style={nucleoColor && !isAssigned ? { backgroundColor: `${nucleoColor}20`, color: nucleoColor } : undefined}
      >
        {collaboratore.nome[0]}
        {collaboratore.cognome[0]}
      </div>

      {/* Info */}
      <div className="flex-1 min-w-0">
        <div className="flex items-center gap-1">
          <span className="text-sm font-medium truncate">
            {collaboratore.nome} {collaboratore.cognome}
          </span>
          {hasConflict && (
            <AlertCircle className="h-3 w-3 text-red-500 flex-shrink-0" />
          )}
        </div>
        <div className="text-xs text-muted-foreground truncate">
          {(collaboratore as { ruolo?: string }).ruolo || 'Collaboratore'}
        </div>
      </div>

      {/* Status badges */}
      <div className="flex flex-col gap-1 items-end">
        {isAssigned && (
          <Badge variant="default" className="text-[10px] bg-green-500">
            Assegnato
          </Badge>
        )}
        {hasConflict && (
          <Badge variant="destructive" className="text-[10px]">
            Conflitto
          </Badge>
        )}
      </div>

      {/* Conflict tooltip */}
      {hasConflict && conflictMessage && (
        <div className="absolute -top-8 left-0 right-0 bg-red-500 text-white text-xs px-2 py-1 rounded opacity-0 group-hover:opacity-100 transition-opacity pointer-events-none">
          {conflictMessage}
        </div>
      )}
    </div>
  );
}

// Compact version for sidebar
export function CollaboratorDragItemCompact({
  collaboratore,
  isAssigned = false,
  hasConflict = false,
  disabled = false,
}: CollaboratorDragItemProps) {
  const { attributes, listeners, setNodeRef, transform, isDragging } = useDraggable({
    id: `collaboratore-${collaboratore.id}`,
    data: {
      type: 'collaboratore',
      collaboratore,
    },
    disabled: disabled || hasConflict,
  });

  const style = transform
    ? {
        transform: CSS.Translate.toString(transform),
        zIndex: isDragging ? 1000 : undefined,
      }
    : undefined;

  const nucleoColor = collaboratore.Appartenenza_Nucleo?.[0]?.Nucleo?.colore;

  return (
    <div
      ref={setNodeRef}
      style={style}
      className={cn(
        'flex items-center gap-2 p-1.5 rounded-md border transition-all text-xs',
        'bg-card hover:bg-accent/50',
        isDragging && 'opacity-50 shadow-lg ring-2 ring-primary',
        isAssigned && 'bg-green-50/50 dark:bg-green-950/10 border-green-200/50',
        hasConflict && 'bg-red-50/50 dark:bg-red-950/10 border-red-200/50 cursor-not-allowed opacity-50',
        disabled && 'opacity-40 cursor-not-allowed',
        !disabled && !hasConflict && 'cursor-grab active:cursor-grabbing'
      )}
      {...attributes}
      {...listeners}
    >
      <div
        className="w-6 h-6 rounded-full flex items-center justify-center text-[10px] font-medium flex-shrink-0"
        style={nucleoColor ? { backgroundColor: `${nucleoColor}20`, color: nucleoColor } : undefined}
      >
        {collaboratore.nome[0]}
        {collaboratore.cognome[0]}
      </div>
      <span className="truncate flex-1">
        {collaboratore.nome} {collaboratore.cognome[0]}.
      </span>
      {isAssigned && (
        <div className="w-2 h-2 rounded-full bg-green-500 flex-shrink-0" />
      )}
      {hasConflict && (
        <AlertCircle className="h-3 w-3 text-red-500 flex-shrink-0" />
      )}
    </div>
  );
}
