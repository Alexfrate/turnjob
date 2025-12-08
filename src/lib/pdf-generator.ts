import jsPDF from 'jspdf';
import 'jspdf-autotable';
import { CalendarShift, CalendarAbsence } from '@/hooks/use-calendar';
import { format } from 'date-fns';
import { it } from 'date-fns/locale';

export function generateWeeklyShiftsPDF(shifts: CalendarShift[], weekStart: Date, companyName: string) {
  const doc = new jsPDF();
  const title = `Turni Settimanali - ${format(weekStart, 'dd MMMM yyyy', { locale: it })}`;
  
  doc.setFontSize(20);
  doc.text(title, 14, 20);
  doc.setFontSize(12);
  doc.text(companyName, 14, 30);

  const tableColumn = ['Data', 'Collaboratore', 'Mansione', 'Orario', 'Ore'];
  const tableRows = shifts.map(shift => [
    format(new Date(shift.date), 'dd/MM', { locale: it }),
    shift.userName,
    shift.position || '',
    `${shift.startTime} - ${shift.endTime}`,
    `${shift.hours}h`
  ]);

  (doc as any).autoTable(tableColumn, tableRows, {
    startY: 40,
    theme: 'grid',
    styles: { fontSize: 10, cellPadding: 3 },
    headStyles: { fillColor: [59, 130, 246] },
  });

  return doc.output('blob');
}

export function generateAnnualFeriePDF(absences: CalendarAbsence[], year: number, companyName: string) {
  const doc = new jsPDF();
  const title = `Ferie Annuali - ${year}`;
  
  doc.setFontSize(20);
  doc.text(title, 14, 20);
  doc.setFontSize(12);
  doc.text(companyName, 14, 30);

  const tableColumn = ['Collaboratore', 'Tipo', 'Periodo', 'Giorni'];
  const tableRows = absences.map(absence => {
    const startDate = new Date(absence.startDate);
    const endDate = new Date(absence.endDate);
    return [
      absence.userName,
      absence.type === 'VACATION' ? 'Ferie' : 'Altro',
      `${format(startDate, 'dd/MM')} - ${format(endDate, 'dd/MM')}`,
      `${Math.ceil((endDate.getTime() - startDate.getTime()) / (1000 * 60 * 60 * 24))} giorni`
    ];
  });

  (doc as any).autoTable(tableColumn, tableRows, {
    startY: 40,
    theme: 'grid',
    styles: { fontSize: 10, cellPadding: 3 },
    headStyles: { fillColor: [34, 197, 94] },
  });

  return doc.output('blob');
}