'use client';

import { useDroppable } from '@dnd-kit/core';
import { Plus, UserPlus } from 'lucide-react';
import { cn } from '@/lib/utils';

interface DroppableSlotProps {
  id: string;
  date: string;
  timeSlotId: string;
  children?: React.ReactNode;
  isOver?: boolean;
  isEmpty?: boolean;
  onClick?: () => void;
  disabled?: boolean;
}

export function DroppableSlot({
  id,
  date,
  timeSlotId,
  children,
  isEmpty = true,
  onClick,
  disabled = false,
}: DroppableSlotProps) {
  const { isOver, setNodeRef, active } = useDroppable({
    id,
    data: {
      type: 'slot',
      date,
      timeSlotId,
    },
    disabled,
  });

  const isDraggingCollaboratore = active?.data?.current?.type === 'collaboratore';

  return (
    <div
      ref={setNodeRef}
      onClick={onClick}
      className={cn(
        'min-h-[100px] p-2 rounded-md transition-all relative',
        'border-2 border-dashed border-transparent',
        isOver && isDraggingCollaboratore && 'border-primary bg-primary/5 ring-2 ring-primary/20',
        isOver && !isDraggingCollaboratore && 'border-muted',
        isEmpty && !isOver && 'hover:border-muted-foreground/30',
        disabled && 'opacity-50 cursor-not-allowed'
      )}
    >
      {children}

      {/* Drop indicator */}
      {isOver && isDraggingCollaboratore && (
        <div className="absolute inset-0 flex items-center justify-center bg-primary/10 rounded-md pointer-events-none">
          <div className="flex flex-col items-center gap-1 text-primary">
            <UserPlus className="h-6 w-6" />
            <span className="text-xs font-medium">Rilascia qui</span>
          </div>
        </div>
      )}

      {/* Empty state - click to add */}
      {isEmpty && !isOver && !disabled && (
        <div
          className={cn(
            'absolute inset-0 flex items-center justify-center',
            'opacity-0 hover:opacity-100 transition-opacity cursor-pointer'
          )}
          onClick={onClick}
        >
          <div className="flex flex-col items-center gap-1 text-muted-foreground">
            <Plus className="h-5 w-5" />
            <span className="text-xs">Aggiungi turno</span>
          </div>
        </div>
      )}
    </div>
  );
}

// Minimal droppable for existing shift cards
export function DroppableShiftZone({
  id,
  turnoId,
  children,
  onDrop,
  disabled = false,
}: {
  id: string;
  turnoId: string;
  children: React.ReactNode;
  onDrop?: (collaboratoreId: string) => void;
  disabled?: boolean;
}) {
  const { isOver, setNodeRef, active } = useDroppable({
    id,
    data: {
      type: 'shift',
      turnoId,
    },
    disabled,
  });

  const isDraggingCollaboratore = active?.data?.current?.type === 'collaboratore';

  return (
    <div
      ref={setNodeRef}
      className={cn(
        'relative rounded-md transition-all',
        isOver && isDraggingCollaboratore && 'ring-2 ring-primary ring-offset-1'
      )}
    >
      {children}

      {/* Drop overlay for existing shifts */}
      {isOver && isDraggingCollaboratore && (
        <div className="absolute inset-0 bg-primary/20 rounded-md flex items-center justify-center pointer-events-none">
          <UserPlus className="h-4 w-4 text-primary" />
        </div>
      )}
    </div>
  );
}
