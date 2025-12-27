'use client';

import { useState, useMemo, useCallback } from 'react';
import {
  DndContext,
  DragOverlay,
  useSensor,
  useSensors,
  PointerSensor,
  closestCenter,
  DragStartEvent,
  DragEndEvent,
} from '@dnd-kit/core';
import { CheckCircle, RefreshCw, Calendar, Sparkles } from 'lucide-react';
import { cn } from '@/lib/utils';
import { Button } from '@/components/ui/button';
import { Badge } from '@/components/ui/badge';
import { ScrollArea, ScrollBar } from '@/components/ui/scroll-area';
import { KanbanColumn } from './KanbanColumn';
import { TurnoKanbanCardOverlay } from './TurnoKanbanCard';
import { TurnoEditModal } from './TurnoEditModal';
import { getWeekDates } from '@/hooks/use-extracted-turni';
import type { ExtractedTurno } from '@/hooks/use-planning-chat';

interface TurniKanbanBoardProps {
  turni: ExtractedTurno[];
  weekStart: string;
  weekEnd: string;
  onUpdateTurno: (oldTurno: ExtractedTurno, updates: Partial<ExtractedTurno>) => void;
  onDeleteTurno: (turno: ExtractedTurno) => void;
  onSaveTurni: (turni: ExtractedTurno[]) => void;
  isSaving?: boolean;
  nuclei?: { id: string; nome: string; colore?: string }[];
}

export function TurniKanbanBoard({
  turni,
  weekStart,
  weekEnd,
  onUpdateTurno,
  onDeleteTurno,
  onSaveTurni,
  isSaving = false,
  nuclei = [],
}: TurniKanbanBoardProps) {
  const [activeId, setActiveId] = useState<string | null>(null);
  const [activeTurno, setActiveTurno] = useState<{ turno: ExtractedTurno; index: number; dayDate: string } | null>(
    null
  );
  const [editingTurno, setEditingTurno] = useState<{ turno: ExtractedTurno; index: number } | null>(null);
  const [selectedTurni, setSelectedTurni] = useState<Set<number>>(new Set(turni.map((_, i) => i)));

  // Get all dates in the week
  const weekDates = useMemo(() => getWeekDates(weekStart), [weekStart]);

  // Today's date for highlighting
  const today = useMemo(() => {
    const d = new Date();
    const year = d.getFullYear();
    const month = String(d.getMonth() + 1).padStart(2, '0');
    const day = String(d.getDate()).padStart(2, '0');
    return `${year}-${month}-${day}`;
  }, []);

  // Group turni by date
  const turniByDate = useMemo(() => {
    const grouped: Record<string, ExtractedTurno[]> = {};
    weekDates.forEach((date) => {
      grouped[date] = [];
    });
    turni.forEach((turno) => {
      if (grouped[turno.data]) {
        grouped[turno.data].push(turno);
      }
    });
    return grouped;
  }, [turni, weekDates]);

  // Sensors for drag and drop
  const sensors = useSensors(
    useSensor(PointerSensor, {
      activationConstraint: {
        distance: 8,
      },
    })
  );

  // Handle drag start
  const handleDragStart = useCallback((event: DragStartEvent) => {
    const { active } = event;
    setActiveId(active.id as string);
    const data = active.data.current as { turno: ExtractedTurno; index: number; dayDate: string } | undefined;
    if (data) {
      setActiveTurno(data);
    }
  }, []);

  // Handle drag end
  const handleDragEnd = useCallback(
    (event: DragEndEvent) => {
      const { active, over } = event;
      setActiveId(null);
      setActiveTurno(null);

      if (!over || !active.data.current) return;

      const sourceData = active.data.current as { turno: ExtractedTurno; index: number; dayDate: string };
      const targetDate = over.id as string;

      // If dropped on the same date, do nothing
      if (sourceData.dayDate === targetDate) return;

      // Update the turno's date
      onUpdateTurno(sourceData.turno, { data: targetDate });
    },
    [onUpdateTurno]
  );

  // Handle edit turno
  const handleEditTurno = useCallback((turno: ExtractedTurno, index: number) => {
    setEditingTurno({ turno, index });
  }, []);

  // Handle save edited turno
  const handleSaveEditedTurno = useCallback(
    (updates: Partial<ExtractedTurno>) => {
      if (editingTurno) {
        onUpdateTurno(editingTurno.turno, updates);
        setEditingTurno(null);
      }
    },
    [editingTurno, onUpdateTurno]
  );

  // Toggle turno selection
  const toggleTurnoSelection = useCallback((index: number) => {
    setSelectedTurni((prev) => {
      const newSet = new Set(prev);
      if (newSet.has(index)) {
        newSet.delete(index);
      } else {
        newSet.add(index);
      }
      return newSet;
    });
  }, []);

  // Select/deselect all
  const toggleSelectAll = useCallback(() => {
    if (selectedTurni.size === turni.length) {
      setSelectedTurni(new Set());
    } else {
      setSelectedTurni(new Set(turni.map((_, i) => i)));
    }
  }, [selectedTurni.size, turni.length]);

  // Handle save selected turni
  const handleSaveSelected = useCallback(() => {
    const selected = turni.filter((_, idx) => selectedTurni.has(idx));
    if (selected.length > 0) {
      onSaveTurni(selected);
    }
  }, [turni, selectedTurni, onSaveTurni]);

  if (turni.length === 0) {
    return (
      <div className="flex flex-col items-center justify-center h-[400px] text-center">
        <Calendar className="h-12 w-12 text-muted-foreground/50 mb-4" />
        <h3 className="text-lg font-medium text-muted-foreground mb-2">Nessun turno generato</h3>
        <p className="text-sm text-muted-foreground">
          Chiedi all'AI di generare i turni per questa settimana
        </p>
      </div>
    );
  }

  return (
    <div className="flex flex-col h-full">
      {/* Header with actions */}
      <div className="flex items-center justify-between p-4 border-b bg-muted/30">
        <div className="flex items-center gap-3">
          <Sparkles className="h-5 w-5 text-indigo-500" />
          <span className="font-medium">{turni.length} turni generati dall'AI</span>
          <Badge variant="secondary">{selectedTurni.size} selezionati</Badge>
        </div>
        <div className="flex items-center gap-2">
          <Button variant="ghost" size="sm" onClick={toggleSelectAll}>
            {selectedTurni.size === turni.length ? 'Deseleziona tutti' : 'Seleziona tutti'}
          </Button>
          <Button
            size="sm"
            onClick={handleSaveSelected}
            disabled={isSaving || selectedTurni.size === 0}
            className="gap-2"
          >
            {isSaving ? (
              <>
                <RefreshCw className="h-4 w-4 animate-spin" />
                Salvataggio...
              </>
            ) : (
              <>
                <CheckCircle className="h-4 w-4" />
                Salva {selectedTurni.size} turni
              </>
            )}
          </Button>
        </div>
      </div>

      {/* Kanban board */}
      <ScrollArea className="flex-1">
        <DndContext
          sensors={sensors}
          collisionDetection={closestCenter}
          onDragStart={handleDragStart}
          onDragEnd={handleDragEnd}
        >
          <div className="flex gap-3 p-4 min-w-max">
            {weekDates.map((date) => (
              <KanbanColumn
                key={date}
                date={date}
                turni={turniByDate[date] || []}
                onEditTurno={(turno, index) => handleEditTurno(turno, index)}
                onDeleteTurno={(turno) => onDeleteTurno(turno)}
                isToday={date === today}
              />
            ))}
          </div>

          {/* Drag overlay */}
          <DragOverlay>
            {activeId && activeTurno && (
              <TurnoKanbanCardOverlay
                turno={activeTurno.turno}
                index={activeTurno.index}
                dayDate={activeTurno.dayDate}
              />
            )}
          </DragOverlay>
        </DndContext>
        <ScrollBar orientation="horizontal" />
      </ScrollArea>

      {/* Edit Modal */}
      {editingTurno && (
        <TurnoEditModal
          turno={editingTurno.turno}
          nuclei={nuclei}
          isOpen={!!editingTurno}
          onClose={() => setEditingTurno(null)}
          onSave={handleSaveEditedTurno}
        />
      )}
    </div>
  );
}
