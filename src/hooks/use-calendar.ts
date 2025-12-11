'use client';

import { useState, useMemo } from 'react';
import {
  addMonths,
  subMonths,
  startOfMonth,
  endOfMonth,
  startOfWeek,
  endOfWeek,
  eachDayOfInterval,
  format,
  isSameMonth,
  isSameDay,
  isToday
} from 'date-fns';
import { it } from 'date-fns/locale';
import { useTurni, Turno } from './use-turni';

export type DateRange = {
  from: Date | null;
  to: Date | null;
};

export interface EmployeeStatus {
  userId: string;
  userName: string;
  status: 'WORKING' | 'VACATION' | 'SICK_LEAVE' | 'PERMISSION' | 'DAY_OFF' | 'OFF_DUTY';
  currentShift?: {
    startTime: string;
    endTime: string;
    hours: number;
  };
  nextShift?: {
    date: string;
    startTime: string;
    endTime: string;
  };
}

export interface CalendarShift {
  id: string;
  date: string;
  startTime: string;
  endTime: string;
  hours: number;
  userId: string;
  userName: string;
  position?: string;
  nucleoId?: string;
  nucleoNome?: string;
  nucleoColore?: string;
  collaboratori?: Array<{
    id: string;
    nome: string;
    cognome: string;
  }>;
  notes?: string;
  tasks?: Array<{
    description: string;
    completed: boolean;
  }>;
  // Dati originali del turno
  turnoOriginale?: Turno;
  numCollaboratoriRichiesti?: number;
  numCollaboratoriAssegnati?: number;
  pubblicato?: boolean;
  completato?: boolean;
}

export interface CalendarAbsence {
  id: string;
  userId: string;
  userName: string;
  type: 'VACATION' | 'SICK_LEAVE' | 'PERMISSION' | 'DAY_OFF';
  startDate: string;
  endDate: string;
  status?: 'approved' | 'pending' | 'rejected';
  notes?: string;
}

// Helper per calcolare le ore tra due orari
function calculateHours(startTime: string, endTime: string): number {
  const [startH, startM] = startTime.split(':').map(Number);
  const [endH, endM] = endTime.split(':').map(Number);
  const startMinutes = startH * 60 + startM;
  const endMinutes = endH * 60 + endM;
  return (endMinutes - startMinutes) / 60;
}

// Converti Turno dal DB a CalendarShift per il calendario
function turnoToCalendarShift(turno: Turno): CalendarShift {
  const collaboratori = turno.Assegnazione_Turno?.map(a => ({
    id: a.Collaboratore?.id || a.collaboratore_id,
    nome: a.Collaboratore?.nome || '',
    cognome: a.Collaboratore?.cognome || '',
  })) || [];

  return {
    id: turno.id,
    date: turno.data.split('T')[0], // Formato YYYY-MM-DD
    startTime: turno.ora_inizio,
    endTime: turno.ora_fine,
    hours: calculateHours(turno.ora_inizio, turno.ora_fine),
    userId: collaboratori[0]?.id || '',
    userName: collaboratori[0] ? `${collaboratori[0].nome} ${collaboratori[0].cognome}` : 'Non assegnato',
    position: turno.Nucleo?.mansione,
    nucleoId: turno.nucleo_id,
    nucleoNome: turno.Nucleo?.nome,
    nucleoColore: turno.Nucleo?.colore || '#3b82f6',
    collaboratori,
    notes: turno.note,
    turnoOriginale: turno,
    numCollaboratoriRichiesti: turno.num_collaboratori_richiesti,
    numCollaboratoriAssegnati: turno.Assegnazione_Turno?.length || 0,
    pubblicato: turno.pubblicato,
    completato: turno.completato,
  };
}

export function useCalendar() {
  const [currentDate, setCurrentDate] = useState(new Date());
  const [dateRange, setDateRange] = useState<DateRange>({ from: null, to: null });

  // Always use Italian locale
  const dateFnsLocale = it;

  // Calcola range date per il mese corrente (con margine per settimane)
  const monthStart = startOfWeek(startOfMonth(currentDate), { locale: dateFnsLocale });
  const monthEnd = endOfWeek(endOfMonth(currentDate), { locale: dateFnsLocale });

  // Fetch turni dal database
  const { data: turniData, isLoading, error, refetch } = useTurni({
    data_inizio: format(monthStart, 'yyyy-MM-dd'),
    data_fine: format(monthEnd, 'yyyy-MM-dd'),
  });

  // Converti turni in formato calendario
  const shifts = useMemo(() => {
    if (!turniData) return [];
    return turniData.map(turnoToCalendarShift);
  }, [turniData]);

  // Raggruppa turni per data
  const shiftsByDate = useMemo(() => {
    const grouped: Record<string, CalendarShift[]> = {};
    for (const shift of shifts) {
      if (!grouped[shift.date]) {
        grouped[shift.date] = [];
      }
      grouped[shift.date].push(shift);
    }
    return grouped;
  }, [shifts]);

  const handleDateSelect = (date: Date) => {
    if (!dateRange.from || (dateRange.from && dateRange.to)) {
      // Start new range
      setDateRange({ from: date, to: null });
    } else {
      // Complete range
      if (date < dateRange.from) {
        setDateRange({ from: date, to: dateRange.from });
      } else {
        setDateRange({ from: dateRange.from, to: date });
      }
    }
  };

  const nextMonth = () => setCurrentDate(addMonths(currentDate, 1));
  const prevMonth = () => setCurrentDate(subMonths(currentDate, 1));
  const goToToday = () => setCurrentDate(new Date());

  const daysInMonth = eachDayOfInterval({
    start: startOfWeek(startOfMonth(currentDate), { locale: dateFnsLocale }),
    end: endOfWeek(endOfMonth(currentDate), { locale: dateFnsLocale })
  });

  const weekDays = eachDayOfInterval({
    start: startOfWeek(currentDate, { locale: dateFnsLocale }),
    end: endOfWeek(startOfWeek(currentDate, { locale: dateFnsLocale }), { locale: dateFnsLocale })
  }).map(day => format(day, 'EEEE', { locale: dateFnsLocale }));

  // Calcola stato del giorno basato sui turni reali
  const getDayStatus = (date: Date): { type: 'full' | 'partial' | 'free'; label: string } | undefined => {
    const key = format(date, 'yyyy-MM-dd');
    const dayShifts = shiftsByDate[key];

    if (!dayShifts || dayShifts.length === 0) {
      return undefined; // Nessun turno programmato
    }

    // Calcola se tutti i turni sono completi (tutti i posti assegnati)
    let totalRichiesti = 0;
    let totalAssegnati = 0;

    for (const shift of dayShifts) {
      totalRichiesti += shift.numCollaboratoriRichiesti || 1;
      totalAssegnati += shift.numCollaboratoriAssegnati || 0;
    }

    if (totalAssegnati === 0) {
      return { type: 'free', label: `${dayShifts.length} turni da assegnare` };
    } else if (totalAssegnati >= totalRichiesti) {
      return { type: 'full', label: `${dayShifts.length} turni completi` };
    } else {
      const mancanti = totalRichiesti - totalAssegnati;
      return { type: 'partial', label: `${mancanti} posti liberi` };
    }
  };

  // Ottieni turni per una data specifica
  const getShiftsForDate = (date: Date): CalendarShift[] => {
    const key = format(date, 'yyyy-MM-dd');
    return shiftsByDate[key] || [];
  };

  // TODO: Implementare quando avremo l'API richieste
  const absences: CalendarAbsence[] = [];
  const employeeStatuses: EmployeeStatus[] = [];

  return {
    currentDate,
    dateRange,
    handleDateSelect,
    nextMonth,
    prevMonth,
    goToToday,
    daysInMonth,
    weekDays,
    dateFnsLocale,
    isSameMonth,
    isSameDay,
    isToday,
    format,
    getDayStatus,
    getShiftsForDate,
    // Calendar data
    shifts,
    shiftsByDate,
    absences,
    employeeStatuses,
    isLoading,
    error,
    refetch,
    // Raw data
    turniData,
  };
}
