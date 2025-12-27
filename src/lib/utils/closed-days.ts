import type { OrarioApertura, OrarioVariabile, OrarioGiorno } from '@/types/database';

// Mapping giorni settimana: 1 = Lunedì, 7 = Domenica
const GIORNI_KEY = ['lun', 'mar', 'mer', 'gio', 'ven', 'sab', 'dom'] as const;
const GIORNI_NOME = ['Lunedì', 'Martedì', 'Mercoledì', 'Giovedì', 'Venerdì', 'Sabato', 'Domenica'];

type GiornoKey = typeof GIORNI_KEY[number];

/**
 * Estrae i giorni di chiusura dall'orario apertura dell'azienda
 * @returns Array di numeri 1-7 (1=Lunedì, 7=Domenica)
 */
export function getClosedDays(orarioApertura?: OrarioApertura): number[] {
  if (!orarioApertura) return [];

  // Orario fisso = sempre aperto tutti i giorni
  if (orarioApertura.tipo === 'fisso') return [];

  const variabile = orarioApertura as OrarioVariabile;
  const closedDays: number[] = [];

  GIORNI_KEY.forEach((key, index) => {
    const giorno = variabile[key] as OrarioGiorno | undefined;
    if (giorno?.chiuso) {
      closedDays.push(index + 1); // 1-7
    }
  });

  return closedDays;
}

/**
 * Converte numero giorno (1-7) in nome italiano
 */
export function getDayName(dayNumber: number): string {
  if (dayNumber < 1 || dayNumber > 7) return '';
  return GIORNI_NOME[dayNumber - 1];
}

/**
 * Converte numero giorno (1-7) in chiave (lun, mar, etc.)
 */
export function getDayKey(dayNumber: number): GiornoKey | null {
  if (dayNumber < 1 || dayNumber > 7) return null;
  return GIORNI_KEY[dayNumber - 1];
}

/**
 * Verifica se un giorno della settimana è chiuso
 */
export function isDayClosed(dayNumber: number, orarioApertura?: OrarioApertura): boolean {
  const closedDays = getClosedDays(orarioApertura);
  return closedDays.includes(dayNumber);
}

// ============================================
// FESTIVITÀ ITALIANE
// ============================================

interface Holiday {
  date: Date;
  name: string;
  dayOfWeek: number; // 1-7
}

/**
 * Calcola la data di Pasqua per un anno (algoritmo di Gauss)
 */
function getEasterDate(year: number): Date {
  const a = year % 19;
  const b = Math.floor(year / 100);
  const c = year % 100;
  const d = Math.floor(b / 4);
  const e = b % 4;
  const f = Math.floor((b + 8) / 25);
  const g = Math.floor((b - f + 1) / 3);
  const h = (19 * a + b - d - g + 15) % 30;
  const i = Math.floor(c / 4);
  const k = c % 4;
  const l = (32 + 2 * e + 2 * i - h - k) % 7;
  const m = Math.floor((a + 11 * h + 22 * l) / 451);
  const month = Math.floor((h + l - 7 * m + 114) / 31);
  const day = ((h + l - 7 * m + 114) % 31) + 1;

  return new Date(year, month - 1, day);
}

/**
 * Restituisce tutte le festività italiane per un anno
 */
export function getItalianHolidays(year: number): Holiday[] {
  const easter = getEasterDate(year);

  // Pasquetta = giorno dopo Pasqua
  const easterMonday = new Date(easter);
  easterMonday.setDate(easter.getDate() + 1);

  const holidays: { date: Date; name: string }[] = [
    { date: new Date(year, 0, 1), name: 'Capodanno' },
    { date: new Date(year, 0, 6), name: 'Epifania' },
    { date: easter, name: 'Pasqua' },
    { date: easterMonday, name: 'Pasquetta' },
    { date: new Date(year, 3, 25), name: 'Festa della Liberazione' },
    { date: new Date(year, 4, 1), name: 'Festa dei Lavoratori' },
    { date: new Date(year, 5, 2), name: 'Festa della Repubblica' },
    { date: new Date(year, 7, 15), name: 'Ferragosto' },
    { date: new Date(year, 10, 1), name: 'Tutti i Santi' },
    { date: new Date(year, 11, 8), name: 'Immacolata Concezione' },
    { date: new Date(year, 11, 25), name: 'Natale' },
    { date: new Date(year, 11, 26), name: 'Santo Stefano' },
  ];

  return holidays.map(h => ({
    ...h,
    dayOfWeek: getDayOfWeekISO(h.date)
  }));
}

/**
 * Converte Date.getDay() (0=Dom) in ISO (1=Lun, 7=Dom)
 */
function getDayOfWeekISO(date: Date): number {
  const day = date.getDay();
  return day === 0 ? 7 : day;
}

/**
 * Verifica se una data è una festività italiana
 */
export function isHoliday(date: Date): { isHoliday: boolean; name?: string } {
  const year = date.getFullYear();
  const holidays = getItalianHolidays(year);

  const found = holidays.find(h =>
    h.date.getDate() === date.getDate() &&
    h.date.getMonth() === date.getMonth() &&
    h.date.getFullYear() === date.getFullYear()
  );

  return {
    isHoliday: !!found,
    name: found?.name
  };
}

/**
 * Trova le festività in un intervallo di date
 */
export function getHolidaysInRange(startDate: Date, endDate: Date): Holiday[] {
  const holidays: Holiday[] = [];
  const startYear = startDate.getFullYear();
  const endYear = endDate.getFullYear();

  // Raccoglie festività per tutti gli anni nell'intervallo
  for (let year = startYear; year <= endYear; year++) {
    const yearHolidays = getItalianHolidays(year);

    yearHolidays.forEach(h => {
      if (h.date >= startDate && h.date <= endDate) {
        holidays.push(h);
      }
    });
  }

  return holidays;
}

/**
 * Trova le festività in una settimana specifica
 * @param weekStart Data di inizio settimana (Lunedì) in formato ISO "YYYY-MM-DD"
 */
export function getHolidaysInWeek(weekStart: string): { day: number; date: string; name: string }[] {
  const startDate = new Date(weekStart);
  const endDate = new Date(startDate);
  endDate.setDate(startDate.getDate() + 6);

  const holidays = getHolidaysInRange(startDate, endDate);

  return holidays.map(h => ({
    day: h.dayOfWeek,
    date: h.date.toISOString().split('T')[0],
    name: h.name
  }));
}

// ============================================
// FORMATTAZIONE PER AI
// ============================================

/**
 * Formatta i giorni di chiusura per il prompt AI
 */
export function formatClosedDaysForAI(closedDays: number[]): string {
  if (closedDays.length === 0) {
    return 'L\'azienda è aperta tutti i giorni della settimana.';
  }

  const dayNames = closedDays.map(d => getDayName(d));

  if (closedDays.length === 1) {
    return `L'azienda è CHIUSA il ${dayNames[0]} (ogni settimana).`;
  }

  const lastDay = dayNames.pop();
  return `L'azienda è CHIUSA nei seguenti giorni: ${dayNames.join(', ')} e ${lastDay} (ogni settimana).`;
}

/**
 * Formatta le festività per il prompt AI
 */
export function formatHolidaysForAI(holidays: { day: number; date: string; name: string }[]): string {
  if (holidays.length === 0) {
    return 'Non ci sono festività in questa settimana.';
  }

  const lines = holidays.map(h => `- ${h.date} (${getDayName(h.day)}): ${h.name}`);
  return `FESTIVITÀ in questa settimana:\n${lines.join('\n')}`;
}

/**
 * Genera il blocco completo di vincoli operativi per il prompt AI
 */
export function generateOperationalConstraintsForAI(
  orarioApertura: OrarioApertura | undefined,
  weekStart?: string
): string {
  const closedDays = getClosedDays(orarioApertura);
  const closedDaysText = formatClosedDaysForAI(closedDays);

  let holidaysText = '';
  if (weekStart) {
    const holidays = getHolidaysInWeek(weekStart);
    holidaysText = formatHolidaysForAI(holidays);
  }

  const constraints = `
## VINCOLI OPERATIVI - GIORNI NON LAVORATIVI

${closedDaysText}

${holidaysText}

**REGOLA FONDAMENTALE**: NON proporre MAI turni o criticità per i giorni di chiusura aziendale o per le festività nazionali elencate sopra. Questi giorni devono essere completamente esclusi dalla pianificazione.
`.trim();

  return constraints;
}

/**
 * Valida se un giorno può avere criticità/turni
 * Restituisce errore se il giorno non è valido
 */
export function validateDayForScheduling(
  dayNumber: number,
  orarioApertura?: OrarioApertura,
  specificDate?: string
): { valid: boolean; error?: string } {
  // Controlla giorni di chiusura settimanale
  if (isDayClosed(dayNumber, orarioApertura)) {
    return {
      valid: false,
      error: `${getDayName(dayNumber)} è un giorno di chiusura aziendale`
    };
  }

  // Controlla festività se abbiamo una data specifica
  if (specificDate) {
    const date = new Date(specificDate);
    const holiday = isHoliday(date);
    if (holiday.isHoliday) {
      return {
        valid: false,
        error: `${specificDate} è ${holiday.name} (festività nazionale)`
      };
    }
  }

  return { valid: true };
}
