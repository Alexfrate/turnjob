import { useState } from 'react';
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

export function useCalendar() {
  const [currentDate, setCurrentDate] = useState(new Date());
  const [dateRange, setDateRange] = useState<DateRange>({ from: null, to: null });

  // Always use Italian locale
  const dateFnsLocale = it;

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

  // Mock data for shifts/availability
  const shiftsData: Record<string, { type: 'full' | 'partial' | 'free'; label: string }> = {
    '2024-11-28': { type: 'full', label: 'Completo' },
    '2024-11-29': { type: 'partial', label: '2 slot liberi' },
    '2024-11-30': { type: 'free', label: 'Tutto libero' },
  };

  const getDayStatus = (date: Date) => {
    const key = format(date, 'yyyy-MM-dd');
    return shiftsData[key];
  };

  // Mock data for calendar views
  const shifts: CalendarShift[] = [];
  const absences: CalendarAbsence[] = [];
  const employeeStatuses: EmployeeStatus[] = [];
  const isLoading = false;

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
    // Calendar data
    shifts,
    absences,
    employeeStatuses,
    isLoading
  };
}
