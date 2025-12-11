'use client';

import { useMemo, useState, useCallback } from 'react';
import { useTranslations } from 'next-intl';
import {
  DndContext,
  DragOverlay,
  useSensor,
  useSensors,
  PointerSensor,
  type DragStartEvent,
  type DragEndEvent,
  type DragOverEvent,
} from '@dnd-kit/core';
import { Plus, Clock, AlertTriangle, Sparkles, Users } from 'lucide-react';
import { Card, CardContent } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { Badge } from '@/components/ui/badge';
import { cn } from '@/lib/utils';
import { ShiftCard } from './ShiftCard';
import { ShiftAssignmentDialog } from './ShiftAssignmentDialog';
import { CollaboratorSidebar } from './CollaboratorSidebar';
import { CollaboratorDragItem } from './CollaboratorDragItem';
import { DroppableSlot, DroppableShiftZone } from './DroppableSlot';
import { useTurniCalendar, type Turno, type CreateTurnoInput } from '@/hooks/use-turni';
import { useNuclei } from '@/hooks/use-nuclei';
import { useCollaboratori, type CollaboratoreConNuclei } from '@/hooks/use-collaboratori';
import { useCriticitaContinuative } from '@/hooks/use-criticita-continuative';
import { usePeriodiCriticiAttivi } from '@/hooks/use-ai-scheduling';
import { useShiftValidation } from '@/hooks/use-shift-validation';
import { toast } from 'sonner';

interface WeeklySchedulerProps {
  weekStart: string;
  weekEnd: string;
}

// Generate days of the week
function getWeekDays(startDate: string): Date[] {
  const start = new Date(startDate);
  const days: Date[] = [];
  for (let i = 0; i < 7; i++) {
    const day = new Date(start);
    day.setDate(start.getDate() + i);
    days.push(day);
  }
  return days;
}

// Time slots for the day
const TIME_SLOTS = [
  { id: 'morning', label: 'Mattina', start: '06:00', end: '14:00' },
  { id: 'afternoon', label: 'Pomeriggio', start: '14:00', end: '22:00' },
  { id: 'evening', label: 'Sera', start: '22:00', end: '06:00' },
];

export function WeeklyScheduler({ weekStart, weekEnd }: WeeklySchedulerProps) {
  const t = useTranslations();

  // Drag state
  const [activeDragItem, setActiveDragItem] = useState<CollaboratoreConNuclei | null>(null);
  const [dragOverTarget, setDragOverTarget] = useState<string | null>(null);

  // Dialog state
  const [selectedSlot, setSelectedSlot] = useState<{
    date: string;
    timeSlot: (typeof TIME_SLOTS)[number];
  } | null>(null);
  const [selectedTurno, setSelectedTurno] = useState<Turno | null>(null);

  // Sidebar state
  const [selectedDateSlot, setSelectedDateSlot] = useState<{
    date: string;
    timeSlotId: string;
  } | null>(null);

  const {
    turni,
    isLoading,
    createTurno,
    updateTurno,
    deleteTurno,
    addAssegnazione,
    removeAssegnazione,
    isCreating,
  } = useTurniCalendar(weekStart, weekEnd);

  const { nuclei } = useNuclei();
  const { collaboratoriAttivi } = useCollaboratori();
  const { data: criticitaContinuative } = useCriticitaContinuative({ attivo: true });
  const { data: periodiCritici } = usePeriodiCriticiAttivi(weekStart, weekEnd);

  // Validation hook
  const { validateTurnoAssignment, validateSlot } = useShiftValidation({
    turni,
    collaboratori: collaboratoriAttivi,
  });

  const weekDays = useMemo(() => getWeekDays(weekStart), [weekStart]);
  const shortDayNames = ['Dom', 'Lun', 'Mar', 'Mer', 'Gio', 'Ven', 'Sab'];

  // DnD sensors
  const sensors = useSensors(
    useSensor(PointerSensor, {
      activationConstraint: {
        distance: 8,
      },
    })
  );

  // Map turni to grid positions
  const turniByDayAndSlot = useMemo(() => {
    const map: Record<string, Record<string, Turno[]>> = {};

    turni.forEach((turno) => {
      const date = turno.data;
      if (!map[date]) map[date] = {};

      // Determine which slot this turno belongs to
      const turnoHour = parseInt(turno.ora_inizio.split(':')[0]);
      let slotId = 'morning';
      if (turnoHour >= 14 && turnoHour < 22) slotId = 'afternoon';
      else if (turnoHour >= 22 || turnoHour < 6) slotId = 'evening';

      if (!map[date][slotId]) map[date][slotId] = [];
      map[date][slotId].push(turno);
    });

    return map;
  }, [turni]);

  // Check for criticalities on a specific day
  const getCriticalitiesForDay = (date: Date) => {
    const dayOfWeek = date.getDay() === 0 ? 7 : date.getDay();
    const dateStr = date.toISOString().split('T')[0];

    const continuative =
      criticitaContinuative?.filter((c) => c.giorno_settimana === dayOfWeek) || [];

    const sporadiche =
      periodiCritici?.filter((p) => {
        return p.data_inizio <= dateStr && p.data_fine >= dateStr;
      }) || [];

    return { continuative, sporadiche };
  };

  // Drag handlers
  const handleDragStart = useCallback((event: DragStartEvent) => {
    const { active } = event;
    const collaboratore = active.data.current?.collaboratore as CollaboratoreConNuclei;
    if (collaboratore) {
      setActiveDragItem(collaboratore);
    }
  }, []);

  const handleDragOver = useCallback((event: DragOverEvent) => {
    const { over } = event;
    setDragOverTarget(over?.id as string | null);
  }, []);

  const handleDragEnd = useCallback(
    async (event: DragEndEvent) => {
      const { active, over } = event;
      setActiveDragItem(null);
      setDragOverTarget(null);

      if (!over) return;

      const collaboratore = active.data.current?.collaboratore as CollaboratoreConNuclei;
      const dropTarget = over.data.current;

      if (!collaboratore || !dropTarget) return;

      // Dropped on existing turno
      if (dropTarget.type === 'shift') {
        const turnoId = dropTarget.turnoId as string;
        const turno = turni.find((t) => t.id === turnoId);

        if (!turno) return;

        // Validate assignment
        const validation = validateTurnoAssignment(collaboratore.id, turno);
        if (!validation.valid) {
          toast.error(validation.message || 'Assegnazione non valida');
          return;
        }

        try {
          await addAssegnazione({
            turnoId: turno.id,
            collaboratoreId: collaboratore.id,
            tipo: 'manuale',
          });
          toast.success(`${collaboratore.nome} assegnato al turno`);
        } catch (error) {
          toast.error('Errore durante l\'assegnazione');
        }
        return;
      }

      // Dropped on empty slot - create new turno
      if (dropTarget.type === 'slot') {
        const { date, timeSlotId } = dropTarget as { date: string; timeSlotId: string };
        const timeSlot = TIME_SLOTS.find((s) => s.id === timeSlotId);

        if (!timeSlot) return;

        // Validate slot
        const validation = validateSlot(collaboratore.id, date, timeSlotId);
        if (!validation.valid) {
          toast.error(validation.message || 'Slot non valido');
          return;
        }

        // Open dialog to create turno with pre-selected collaboratore
        setSelectedSlot({ date, timeSlot });
        // Note: The dialog will need to handle pre-selecting the collaboratore
        toast.info('Crea un nuovo turno per assegnare il collaboratore');
      }
    },
    [turni, addAssegnazione, validateTurnoAssignment, validateSlot]
  );

  const handleSlotClick = (date: Date, timeSlot: (typeof TIME_SLOTS)[number]) => {
    setSelectedSlot({
      date: date.toISOString().split('T')[0],
      timeSlot,
    });
    setSelectedTurno(null);
    setSelectedDateSlot({
      date: date.toISOString().split('T')[0],
      timeSlotId: timeSlot.id,
    });
  };

  const handleTurnoClick = (turno: Turno) => {
    setSelectedTurno(turno);
    setSelectedSlot(null);
  };

  const handleCreateTurno = async (input: CreateTurnoInput) => {
    await createTurno(input);
    setSelectedSlot(null);
  };

  const handleUpdateTurno = async (id: string, input: Partial<Turno>) => {
    await updateTurno({ id, ...input });
    setSelectedTurno(null);
  };

  const handleDeleteTurno = async (id: string) => {
    await deleteTurno(id);
    setSelectedTurno(null);
  };

  const isToday = (date: Date) => {
    const today = new Date();
    return date.toDateString() === today.toDateString();
  };

  return (
    <DndContext
      sensors={sensors}
      onDragStart={handleDragStart}
      onDragOver={handleDragOver}
      onDragEnd={handleDragEnd}
    >
      <div className="flex gap-4">
        {/* Sidebar with collaboratori */}
        <div className="w-64 flex-shrink-0 h-[calc(100vh-280px)]">
          <CollaboratorSidebar
            turni={turni}
            selectedDate={selectedDateSlot?.date}
            selectedTimeSlot={selectedDateSlot?.timeSlotId}
            onValidateAssignment={(collaboratoreId, date, timeSlot) =>
              validateSlot(collaboratoreId, date, timeSlot)
            }
          />
        </div>

        {/* Calendar Grid */}
        <div className="flex-1 space-y-4">
          <Card>
            <CardContent className="p-0">
              {/* Header row with day names */}
              <div className="grid grid-cols-8 border-b">
                <div className="p-3 text-sm font-medium text-muted-foreground border-r">
                  <Clock className="h-4 w-4 mx-auto" />
                </div>
                {weekDays.map((day, i) => {
                  const { continuative, sporadiche } = getCriticalitiesForDay(day);
                  const hasCriticalities = continuative.length > 0 || sporadiche.length > 0;

                  return (
                    <div
                      key={i}
                      className={cn(
                        'p-3 text-center border-r last:border-r-0',
                        isToday(day) && 'bg-primary/5'
                      )}
                    >
                      <div className="text-xs text-muted-foreground">
                        {shortDayNames[day.getDay()]}
                      </div>
                      <div
                        className={cn(
                          'text-lg font-semibold',
                          isToday(day) && 'text-primary'
                        )}
                      >
                        {day.getDate()}
                      </div>
                      {hasCriticalities && (
                        <div className="flex justify-center gap-1 mt-1">
                          {continuative.length > 0 && (
                            <Badge
                              variant="outline"
                              className="text-[10px] px-1 py-0 text-blue-600"
                            >
                              {continuative.length} 🔄
                            </Badge>
                          )}
                          {sporadiche.length > 0 && (
                            <Badge
                              variant="outline"
                              className="text-[10px] px-1 py-0 text-orange-600"
                            >
                              {sporadiche.length} ⚡
                            </Badge>
                          )}
                        </div>
                      )}
                    </div>
                  );
                })}
              </div>

              {/* Time slots rows */}
              {TIME_SLOTS.map((slot) => (
                <div key={slot.id} className="grid grid-cols-8 border-b last:border-b-0">
                  {/* Time label */}
                  <div className="p-3 border-r bg-muted/30 flex flex-col justify-center">
                    <div className="text-xs font-medium">{slot.label}</div>
                    <div className="text-[10px] text-muted-foreground">
                      {slot.start} - {slot.end}
                    </div>
                  </div>

                  {/* Day cells */}
                  {weekDays.map((day, dayIndex) => {
                    const dateStr = day.toISOString().split('T')[0];
                    const cellTurni = turniByDayAndSlot[dateStr]?.[slot.id] || [];
                    const { continuative } = getCriticalitiesForDay(day);

                    // Filter criticalities for this time slot
                    const relevantCriticalities = continuative.filter((c) => {
                      if (!c.ora_inizio) return true;
                      const critHour = parseInt(c.ora_inizio.split(':')[0]);
                      if (slot.id === 'morning') return critHour >= 6 && critHour < 14;
                      if (slot.id === 'afternoon') return critHour >= 14 && critHour < 22;
                      return critHour >= 22 || critHour < 6;
                    });

                    const slotId = `slot-${dateStr}-${slot.id}`;
                    const isDropTarget = dragOverTarget === slotId;

                    return (
                      <DroppableSlot
                        key={dayIndex}
                        id={slotId}
                        date={dateStr}
                        timeSlotId={slot.id}
                        isEmpty={cellTurni.length === 0}
                        onClick={() => handleSlotClick(day, slot)}
                      >
                        <div
                          className={cn(
                            'min-h-[100px] relative',
                            isToday(day) && 'bg-primary/5',
                            relevantCriticalities.length > 0 &&
                              'bg-orange-50/50 dark:bg-orange-950/20'
                          )}
                        >
                          {/* Criticality indicators */}
                          {relevantCriticalities.length > 0 && (
                            <div className="absolute top-1 right-1">
                              <AlertTriangle className="h-3 w-3 text-orange-500" />
                            </div>
                          )}

                          {/* Turni in this cell */}
                          <div className="space-y-1">
                            {cellTurni.map((turno) => (
                              <DroppableShiftZone
                                key={turno.id}
                                id={`turno-${turno.id}`}
                                turnoId={turno.id}
                              >
                                <ShiftCard
                                  turno={turno}
                                  compact
                                  onClick={() => handleTurnoClick(turno)}
                                />
                              </DroppableShiftZone>
                            ))}
                          </div>

                          {/* Add button */}
                          {cellTurni.length === 0 && !activeDragItem && (
                            <Button
                              variant="ghost"
                              size="sm"
                              className="w-full mt-1 h-7 text-xs opacity-50 hover:opacity-100"
                              onClick={() => handleSlotClick(day, slot)}
                            >
                              <Plus className="h-3 w-3 mr-1" />
                              {t('common.create')}
                            </Button>
                          )}
                        </div>
                      </DroppableSlot>
                    );
                  })}
                </div>
              ))}
            </CardContent>
          </Card>

          {/* Legend */}
          <div className="flex flex-wrap gap-4 text-xs text-muted-foreground">
            <div className="flex items-center gap-1">
              <div className="w-3 h-3 rounded bg-blue-500/20 border border-blue-500" />
              <span>{t('criticalities.continuative')}</span>
            </div>
            <div className="flex items-center gap-1">
              <div className="w-3 h-3 rounded bg-orange-500/20 border border-orange-500" />
              <span>{t('criticalities.sporadic')}</span>
            </div>
            <div className="flex items-center gap-1">
              <Sparkles className="h-3 w-3 text-purple-500" />
              <span>AI Suggerito</span>
            </div>
            <div className="flex items-center gap-1">
              <Users className="h-3 w-3 text-green-500" />
              <span>Drag & Drop attivo</span>
            </div>
          </div>
        </div>
      </div>

      {/* Drag overlay */}
      <DragOverlay>
        {activeDragItem && (
          <CollaboratorDragItem collaboratore={activeDragItem} />
        )}
      </DragOverlay>

      {/* Dialog for creating/editing shifts */}
      <ShiftAssignmentDialog
        open={!!selectedSlot || !!selectedTurno}
        onOpenChange={(open) => {
          if (!open) {
            setSelectedSlot(null);
            setSelectedTurno(null);
          }
        }}
        date={selectedSlot?.date || selectedTurno?.data}
        defaultTimeSlot={selectedSlot?.timeSlot}
        turno={selectedTurno}
        nuclei={nuclei || []}
        onSave={handleCreateTurno}
        onUpdate={handleUpdateTurno}
        onDelete={handleDeleteTurno}
        onAddAssegnazione={addAssegnazione}
        onRemoveAssegnazione={removeAssegnazione}
        isLoading={isCreating}
      />
    </DndContext>
  );
}
