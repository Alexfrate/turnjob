'use client';

import { useState, useMemo, useCallback } from 'react';
import {
  DndContext,
  DragOverlay,
  useSensor,
  useSensors,
  PointerSensor,
  DragStartEvent,
  DragEndEvent,
  useDroppable,
} from '@dnd-kit/core';
import { CheckCircle, RefreshCw, Sparkles, Settings } from 'lucide-react';
import { cn } from '@/lib/utils';
import { Button } from '@/components/ui/button';
import { Badge } from '@/components/ui/badge';
import { ScrollArea, ScrollBar } from '@/components/ui/scroll-area';
import { TurnoTimelineCard, TurnoTimelineCardOverlay } from './TurnoTimelineCard';
import { TurnoEditModal } from './TurnoEditModal';
import { getWeekDates, formatDateItalian } from '@/hooks/use-extracted-turni';
import type { ExtractedTurno } from '@/hooks/use-planning-chat';

// Ore da mostrare (configurabile)
const START_HOUR = 6;
const END_HOUR = 23;
const HOURS = Array.from({ length: END_HOUR - START_HOUR + 1 }, (_, i) => START_HOUR + i);
const HOUR_HEIGHT = 60; // px per ora

interface TimelineKanbanBoardProps {
  turni: ExtractedTurno[];
  weekStart: string;
  weekEnd: string;
  onUpdateTurno: (oldTurno: ExtractedTurno, updates: Partial<ExtractedTurno>) => void;
  onDeleteTurno: (turno: ExtractedTurno) => void;
  onSaveTurni: (turni: ExtractedTurno[]) => void;
  onOpenSetup?: () => void;
  isSaving?: boolean;
  nuclei?: { id: string; nome: string; colore?: string }[];
}

// Componente cella droppable per ogni giorno/ora
function TimelineDropCell({ date, hour }: { date: string; hour: number }) {
  const { setNodeRef, isOver } = useDroppable({
    id: `${date}-${hour}`,
    data: { date, hour },
  });

  return (
    <div
      ref={setNodeRef}
      className={cn(
        'border-b border-r border-border/30 min-h-[60px]',
        isOver && 'bg-primary/10'
      )}
    />
  );
}

// Helper per convertire ora stringa in minuti
function timeToMinutes(time: string): number {
  const [hours, minutes] = time.split(':').map(Number);
  return hours * 60 + (minutes || 0);
}

// Helper per calcolare posizione e altezza del turno
function getTurnoPosition(turno: ExtractedTurno) {
  const startMinutes = timeToMinutes(turno.ora_inizio);
  const endMinutes = timeToMinutes(turno.ora_fine);
  const startHour = Math.floor(startMinutes / 60);
  const startOffset = (startMinutes % 60) / 60;
  const durationHours = (endMinutes - startMinutes) / 60;

  return {
    top: (startHour - START_HOUR + startOffset) * HOUR_HEIGHT,
    height: Math.max(durationHours * HOUR_HEIGHT, 30), // min 30px
  };
}

export function TimelineKanbanBoard({
  turni,
  weekStart,
  weekEnd,
  onUpdateTurno,
  onDeleteTurno,
  onSaveTurni,
  onOpenSetup,
  isSaving = false,
  nuclei = [],
}: TimelineKanbanBoardProps) {
  const [activeId, setActiveId] = useState<string | null>(null);
  const [activeTurno, setActiveTurno] = useState<{ turno: ExtractedTurno; index: number; dayDate: string } | null>(null);
  const [editingTurno, setEditingTurno] = useState<{ turno: ExtractedTurno; index: number } | null>(null);
  const [selectedTurni, setSelectedTurni] = useState<Set<number>>(new Set(turni.map((_, i) => i)));

  const weekDates = useMemo(() => getWeekDates(weekStart), [weekStart]);

  const today = useMemo(() => {
    const d = new Date();
    return `${d.getFullYear()}-${String(d.getMonth() + 1).padStart(2, '0')}-${String(d.getDate()).padStart(2, '0')}`;
  }, []);

  // Group turni by date
  const turniByDate = useMemo(() => {
    const grouped: Record<string, ExtractedTurno[]> = {};
    weekDates.forEach((date) => {
      grouped[date] = [];
    });
    turni.forEach((turno, idx) => {
      if (grouped[turno.data]) {
        grouped[turno.data].push({ ...turno, _index: idx } as ExtractedTurno & { _index: number });
      }
    });
    return grouped;
  }, [turni, weekDates]);

  const sensors = useSensors(
    useSensor(PointerSensor, {
      activationConstraint: { distance: 8 },
    })
  );

  const handleDragStart = useCallback((event: DragStartEvent) => {
    const { active } = event;
    setActiveId(active.id as string);
    const data = active.data.current as { turno: ExtractedTurno; index: number; dayDate: string } | undefined;
    if (data) {
      setActiveTurno(data);
    }
  }, []);

  const handleDragEnd = useCallback(
    (event: DragEndEvent) => {
      const { active, over } = event;
      setActiveId(null);
      setActiveTurno(null);

      if (!over || !active.data.current) return;

      const sourceData = active.data.current as { turno: ExtractedTurno; index: number; dayDate: string };
      const overId = over.id as string;

      // Parse drop target (date-hour format)
      if (overId.includes('-')) {
        const parts = overId.split('-');
        // Format: YYYY-MM-DD-HH
        if (parts.length >= 4) {
          const targetDate = `${parts[0]}-${parts[1]}-${parts[2]}`;
          const targetHour = parseInt(parts[3]);

          if (!isNaN(targetHour)) {
            // Calcola nuova ora di inizio mantenendo la durata
            const oldStartMinutes = timeToMinutes(sourceData.turno.ora_inizio);
            const oldEndMinutes = timeToMinutes(sourceData.turno.ora_fine);
            const duration = oldEndMinutes - oldStartMinutes;

            const newStartMinutes = targetHour * 60;
            const newEndMinutes = newStartMinutes + duration;

            const newOraInizio = `${String(Math.floor(newStartMinutes / 60)).padStart(2, '0')}:${String(newStartMinutes % 60).padStart(2, '0')}`;
            const newOraFine = `${String(Math.floor(newEndMinutes / 60)).padStart(2, '0')}:${String(newEndMinutes % 60).padStart(2, '0')}`;

            onUpdateTurno(sourceData.turno, {
              data: targetDate,
              ora_inizio: newOraInizio,
              ora_fine: newOraFine,
            });
          }
        }
      }
    },
    [onUpdateTurno]
  );

  const handleEditTurno = useCallback((turno: ExtractedTurno, index: number) => {
    setEditingTurno({ turno, index });
  }, []);

  const handleSaveEditedTurno = useCallback(
    (updates: Partial<ExtractedTurno>) => {
      if (editingTurno) {
        onUpdateTurno(editingTurno.turno, updates);
        setEditingTurno(null);
      }
    },
    [editingTurno, onUpdateTurno]
  );

  const toggleSelectAll = useCallback(() => {
    if (selectedTurni.size === turni.length) {
      setSelectedTurni(new Set());
    } else {
      setSelectedTurni(new Set(turni.map((_, i) => i)));
    }
  }, [selectedTurni.size, turni.length]);

  const handleSaveSelected = useCallback(() => {
    const selected = turni.filter((_, idx) => selectedTurni.has(idx));
    if (selected.length > 0) {
      onSaveTurni(selected);
    }
  }, [turni, selectedTurni, onSaveTurni]);

  if (turni.length === 0) {
    return (
      <div className="flex flex-col items-center justify-center h-[400px] text-center">
        <Sparkles className="h-12 w-12 text-muted-foreground/50 mb-4" />
        <h3 className="text-lg font-medium text-muted-foreground mb-2">Nessun turno generato</h3>
        <p className="text-sm text-muted-foreground">
          Chiedi all'AI di generare i turni per questa settimana
        </p>
      </div>
    );
  }

  return (
    <div className="flex flex-col h-full">
      {/* Header con azioni */}
      <div className="flex items-center justify-between p-4 border-b bg-muted/30">
        <div className="flex items-center gap-3">
          <Sparkles className="h-5 w-5 text-indigo-500" />
          <span className="font-medium">{turni.length} turni generati dall'AI</span>
          <Badge variant="secondary">{selectedTurni.size} selezionati</Badge>
        </div>
        <div className="flex items-center gap-2">
          {onOpenSetup && (
            <Button variant="outline" size="sm" onClick={onOpenSetup} className="gap-2">
              <Settings className="h-4 w-4" />
              Configura
            </Button>
          )}
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

      {/* Timeline Grid */}
      <ScrollArea className="flex-1">
        <DndContext
          sensors={sensors}
          onDragStart={handleDragStart}
          onDragEnd={handleDragEnd}
        >
          <div className="flex min-w-max">
            {/* Colonna ore */}
            <div className="w-16 flex-shrink-0 border-r bg-muted/20 sticky left-0 z-10">
              {/* Header spacer */}
              <div className="h-12 border-b bg-muted/30" />
              {/* Ore */}
              {HOURS.map((hour) => (
                <div
                  key={hour}
                  className="h-[60px] border-b border-border/30 flex items-start justify-end pr-2 pt-1"
                >
                  <span className="text-xs text-muted-foreground font-medium">
                    {String(hour).padStart(2, '0')}:00
                  </span>
                </div>
              ))}
            </div>

            {/* Colonne giorni */}
            {weekDates.map((date) => {
              const { dayName, dayNumber, monthName } = formatDateItalian(date);
              const isToday = date === today;
              const dayTurni = turniByDate[date] || [];

              return (
                <div key={date} className="flex-1 min-w-[140px] relative">
                  {/* Header giorno */}
                  <div
                    className={cn(
                      'h-12 border-b border-r px-2 py-1 sticky top-0 z-10',
                      isToday
                        ? 'bg-blue-50 dark:bg-blue-950/50 border-blue-200'
                        : 'bg-muted/30'
                    )}
                  >
                    <div className={cn('text-xs font-medium', isToday && 'text-blue-600')}>
                      {dayName}
                    </div>
                    <div className="flex items-baseline gap-1">
                      <span className={cn('text-lg font-bold', isToday && 'text-blue-600')}>
                        {dayNumber}
                      </span>
                      <span className="text-xs text-muted-foreground">{monthName}</span>
                      {dayTurni.length > 0 && (
                        <Badge variant="secondary" className="ml-auto text-[10px] px-1 py-0">
                          {dayTurni.length}
                        </Badge>
                      )}
                    </div>
                  </div>

                  {/* Griglia ore */}
                  <div className="relative">
                    {HOURS.map((hour) => (
                      <TimelineDropCell key={`${date}-${hour}`} date={date} hour={hour} />
                    ))}

                    {/* Turni posizionati */}
                    {dayTurni.map((turno, idx) => {
                      const pos = getTurnoPosition(turno);
                      const turnoIndex = (turno as ExtractedTurno & { _index?: number })._index ?? idx;

                      return (
                        <div
                          key={`${date}-${idx}`}
                          className="absolute left-1 right-1"
                          style={{ top: pos.top, height: pos.height }}
                        >
                          <TurnoTimelineCard
                            turno={turno}
                            index={turnoIndex}
                            dayDate={date}
                            height={pos.height}
                            onEdit={() => handleEditTurno(turno, turnoIndex)}
                            onDelete={() => onDeleteTurno(turno)}
                          />
                        </div>
                      );
                    })}
                  </div>
                </div>
              );
            })}
          </div>

          <DragOverlay>
            {activeId && activeTurno && (
              <TurnoTimelineCardOverlay
                turno={activeTurno.turno}
                index={activeTurno.index}
                dayDate={activeTurno.dayDate}
              />
            )}
          </DragOverlay>
        </DndContext>
        <ScrollBar orientation="horizontal" />
        <ScrollBar orientation="vertical" />
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
