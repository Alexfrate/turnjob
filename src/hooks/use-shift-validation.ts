'use client';

import { useMemo, useCallback } from 'react';
import type { Turno } from '@/hooks/use-turni';
import type { CollaboratoreConNuclei } from '@/hooks/use-collaboratori';

// Time slot definitions
const TIME_SLOTS = [
  { id: 'morning', start: 6, end: 14 },
  { id: 'afternoon', start: 14, end: 22 },
  { id: 'evening', start: 22, end: 6 }, // Crosses midnight
];

export interface ValidationResult {
  valid: boolean;
  message?: string;
  type?: 'error' | 'warning';
}

export interface ConflictInfo {
  collaboratoreId: string;
  type: 'overlap' | 'max_shifts' | 'rest_time' | 'nucleo_mismatch';
  message: string;
  severity: 'error' | 'warning';
}

interface UseShiftValidationOptions {
  turni: Turno[];
  collaboratori?: CollaboratoreConNuclei[];
  maxShiftsPerDay?: number;
  minRestHours?: number;
}

export function useShiftValidation({
  turni,
  collaboratori = [],
  maxShiftsPerDay = 2,
  minRestHours = 8,
}: UseShiftValidationOptions) {
  // Map of collaboratore assignments by date
  const assignmentsByDate = useMemo(() => {
    const map = new Map<string, Map<string, Turno[]>>();

    turni.forEach((turno) => {
      if (!map.has(turno.data)) {
        map.set(turno.data, new Map());
      }

      turno.Assegnazione_Turno?.forEach((assegnazione) => {
        const dateMap = map.get(turno.data)!;
        const collabTurni = dateMap.get(assegnazione.collaboratore_id) || [];
        collabTurni.push(turno);
        dateMap.set(assegnazione.collaboratore_id, collabTurni);
      });
    });

    return map;
  }, [turni]);

  // Check if time ranges overlap
  const timeRangesOverlap = useCallback(
    (start1: string, end1: string, start2: string, end2: string): boolean => {
      const toMinutes = (time: string) => {
        const [h, m] = time.split(':').map(Number);
        return h * 60 + m;
      };

      const s1 = toMinutes(start1);
      const e1 = toMinutes(end1);
      const s2 = toMinutes(start2);
      const e2 = toMinutes(end2);

      // Handle overnight shifts
      if (e1 <= s1) {
        // Shift crosses midnight
        return s2 < e1 || s2 >= s1 || (e2 <= s2 && (e2 > 0 || s1 <= s2));
      }
      if (e2 <= s2) {
        // Other shift crosses midnight
        return s1 < e2 || s1 >= s2 || (e1 <= s1 && (e1 > 0 || s2 <= s1));
      }

      // Normal case
      return s1 < e2 && s2 < e1;
    },
    []
  );

  // Calculate rest hours between two shifts
  const calculateRestHours = useCallback(
    (endTime1: string, startTime2: string): number => {
      const toMinutes = (time: string) => {
        const [h, m] = time.split(':').map(Number);
        return h * 60 + m;
      };

      const end = toMinutes(endTime1);
      let start = toMinutes(startTime2);

      if (start <= end) {
        // Next day
        start += 24 * 60;
      }

      return (start - end) / 60;
    },
    []
  );

  // Validate a single assignment
  const validateAssignment = useCallback(
    (
      collaboratoreId: string,
      date: string,
      oraInizio: string,
      oraFine: string,
      turnoId?: string // Exclude this turno from validation (for edits)
    ): ValidationResult => {
      const dateAssignments = assignmentsByDate.get(date);
      const collabTurni = dateAssignments?.get(collaboratoreId) || [];

      // Filter out the current turno if editing
      const otherTurni = turnoId
        ? collabTurni.filter((t) => t.id !== turnoId)
        : collabTurni;

      // Check max shifts per day
      if (otherTurni.length >= maxShiftsPerDay) {
        return {
          valid: false,
          message: `Massimo ${maxShiftsPerDay} turni al giorno`,
          type: 'error',
        };
      }

      // Check time overlaps
      for (const existingTurno of otherTurni) {
        if (
          timeRangesOverlap(
            oraInizio,
            oraFine,
            existingTurno.ora_inizio,
            existingTurno.ora_fine
          )
        ) {
          return {
            valid: false,
            message: `Sovrapposizione con turno ${existingTurno.ora_inizio}-${existingTurno.ora_fine}`,
            type: 'error',
          };
        }
      }

      // Check minimum rest time
      for (const existingTurno of otherTurni) {
        const restBefore = calculateRestHours(existingTurno.ora_fine, oraInizio);
        const restAfter = calculateRestHours(oraFine, existingTurno.ora_inizio);

        const minRest = Math.min(restBefore, restAfter);
        if (minRest < minRestHours && minRest > 0) {
          return {
            valid: false,
            message: `Riposo insufficiente (${Math.round(minRest)}h < ${minRestHours}h richieste)`,
            type: 'warning',
          };
        }
      }

      return { valid: true };
    },
    [assignmentsByDate, maxShiftsPerDay, timeRangesOverlap, calculateRestHours, minRestHours]
  );

  // Validate a slot for a collaboratore
  const validateSlot = useCallback(
    (
      collaboratoreId: string,
      date: string,
      timeSlotId: string
    ): ValidationResult => {
      const slot = TIME_SLOTS.find((s) => s.id === timeSlotId);
      if (!slot) return { valid: true };

      const oraInizio = `${slot.start.toString().padStart(2, '0')}:00`;
      const oraFine = `${slot.end.toString().padStart(2, '0')}:00`;

      return validateAssignment(collaboratoreId, date, oraInizio, oraFine);
    },
    [validateAssignment]
  );

  // Validate adding collaboratore to existing turno
  const validateTurnoAssignment = useCallback(
    (collaboratoreId: string, turno: Turno): ValidationResult => {
      // Check if already assigned
      const alreadyAssigned = turno.Assegnazione_Turno?.some(
        (a) => a.collaboratore_id === collaboratoreId
      );
      if (alreadyAssigned) {
        return {
          valid: false,
          message: 'Già assegnato a questo turno',
          type: 'error',
        };
      }

      // Check turno capacity
      const assignedCount = turno.Assegnazione_Turno?.length || 0;
      const requiredCount = turno.num_collaboratori_richiesti || 1;
      if (assignedCount >= requiredCount) {
        return {
          valid: false,
          message: `Turno già completo (${assignedCount}/${requiredCount})`,
          type: 'warning',
        };
      }

      // Validate time conflicts
      return validateAssignment(
        collaboratoreId,
        turno.data,
        turno.ora_inizio,
        turno.ora_fine,
        turno.id
      );
    },
    [validateAssignment]
  );

  // Get all conflicts for a specific date
  const getConflictsForDate = useCallback(
    (date: string): ConflictInfo[] => {
      const conflicts: ConflictInfo[] = [];
      const dateAssignments = assignmentsByDate.get(date);

      if (!dateAssignments) return conflicts;

      dateAssignments.forEach((collabTurni, collaboratoreId) => {
        // Check max shifts
        if (collabTurni.length > maxShiftsPerDay) {
          conflicts.push({
            collaboratoreId,
            type: 'max_shifts',
            message: `${collabTurni.length} turni (max ${maxShiftsPerDay})`,
            severity: 'error',
          });
        }

        // Check overlaps
        for (let i = 0; i < collabTurni.length; i++) {
          for (let j = i + 1; j < collabTurni.length; j++) {
            if (
              timeRangesOverlap(
                collabTurni[i].ora_inizio,
                collabTurni[i].ora_fine,
                collabTurni[j].ora_inizio,
                collabTurni[j].ora_fine
              )
            ) {
              conflicts.push({
                collaboratoreId,
                type: 'overlap',
                message: `Turni sovrapposti: ${collabTurni[i].ora_inizio}-${collabTurni[i].ora_fine} e ${collabTurni[j].ora_inizio}-${collabTurni[j].ora_fine}`,
                severity: 'error',
              });
            }
          }
        }
      });

      return conflicts;
    },
    [assignmentsByDate, maxShiftsPerDay, timeRangesOverlap]
  );

  // Get all collaboratori with valid/invalid status for a slot
  const getAvailableCollaboratori = useCallback(
    (date: string, oraInizio: string, oraFine: string, turnoId?: string) => {
      return collaboratori.map((collaboratore) => {
        const result = validateAssignment(
          collaboratore.id,
          date,
          oraInizio,
          oraFine,
          turnoId
        );
        return {
          collaboratore,
          available: result.valid,
          message: result.message,
          type: result.type,
        };
      });
    },
    [collaboratori, validateAssignment]
  );

  return {
    validateAssignment,
    validateSlot,
    validateTurnoAssignment,
    getConflictsForDate,
    getAvailableCollaboratori,
    assignmentsByDate,
  };
}
