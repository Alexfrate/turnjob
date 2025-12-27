'use client';

import { useMemo } from 'react';
import type { ChatMessage, ExtractedTurno } from './use-planning-chat';

export interface TurniByDay {
  [date: string]: ExtractedTurno[];
}

export interface UseExtractedTurniResult {
  turniByDay: TurniByDay;
  turniArray: ExtractedTurno[];
  totalCount: number;
  hasGeneratedTurni: boolean;
  getDayTurni: (date: string) => ExtractedTurno[];
}

/**
 * Hook per aggregare i turni estratti da tutti i messaggi della chat
 * Organizza i turni per giorno per facilitare la visualizzazione nel Kanban
 */
export function useExtractedTurni(messages: ChatMessage[]): UseExtractedTurniResult {
  return useMemo(() => {
    const turniByDay: TurniByDay = {};
    const turniArray: ExtractedTurno[] = [];

    messages.forEach((m) => {
      m.extractedTurni?.forEach((turno) => {
        const day = turno.data;
        if (!turniByDay[day]) {
          turniByDay[day] = [];
        }
        turniByDay[day].push(turno);
        turniArray.push(turno);
      });
    });

    return {
      turniByDay,
      turniArray,
      totalCount: turniArray.length,
      hasGeneratedTurni: turniArray.length > 0,
      getDayTurni: (date: string) => turniByDay[date] || [],
    };
  }, [messages]);
}

/**
 * Helper per generare le date della settimana a partire da weekStart
 */
export function getWeekDates(weekStart: string): string[] {
  const dates: string[] = [];
  const startDate = new Date(weekStart + 'T12:00:00');

  for (let i = 0; i < 7; i++) {
    const date = new Date(startDate);
    date.setDate(startDate.getDate() + i);
    const year = date.getFullYear();
    const month = String(date.getMonth() + 1).padStart(2, '0');
    const day = String(date.getDate()).padStart(2, '0');
    dates.push(`${year}-${month}-${day}`);
  }

  return dates;
}

/**
 * Helper per formattare la data in italiano
 */
export function formatDateItalian(dateStr: string): { dayName: string; dayNumber: number; monthName: string } {
  const date = new Date(dateStr + 'T12:00:00');
  const giorni = ['Domenica', 'Lunedì', 'Martedì', 'Mercoledì', 'Giovedì', 'Venerdì', 'Sabato'];
  const mesi = ['Gen', 'Feb', 'Mar', 'Apr', 'Mag', 'Giu', 'Lug', 'Ago', 'Set', 'Ott', 'Nov', 'Dic'];

  return {
    dayName: giorni[date.getDay()],
    dayNumber: date.getDate(),
    monthName: mesi[date.getMonth()],
  };
}

/**
 * Helper per ottenere il giorno della settimana abbreviato
 */
export function getDayShortName(dateStr: string): string {
  const date = new Date(dateStr + 'T12:00:00');
  const giorni = ['Dom', 'Lun', 'Mar', 'Mer', 'Gio', 'Ven', 'Sab'];
  return giorni[date.getDay()];
}
