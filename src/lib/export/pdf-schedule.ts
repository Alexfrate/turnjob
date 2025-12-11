import jsPDF from 'jspdf';
import 'jspdf-autotable';
import type { Turno } from '@/hooks/use-turni';
import type { CollaboratoreConNuclei } from '@/hooks/use-collaboratori';

// Extend jsPDF with autotable
declare module 'jspdf' {
  interface jsPDF {
    autoTable: (options: unknown) => jsPDF;
  }
}

interface ExportOptions {
  turni: Turno[];
  collaboratori: CollaboratoreConNuclei[];
  weekStart: Date;
  weekEnd: Date;
  aziendaNome?: string;
}

const DAY_NAMES = ['Domenica', 'Lunedì', 'Martedì', 'Mercoledì', 'Giovedì', 'Venerdì', 'Sabato'];
const SHORT_DAY_NAMES = ['Dom', 'Lun', 'Mar', 'Mer', 'Gio', 'Ven', 'Sab'];

function formatDate(date: Date): string {
  return date.toLocaleDateString('it-IT', {
    day: '2-digit',
    month: '2-digit',
    year: 'numeric',
  });
}

function getWeekDays(startDate: Date): Date[] {
  const days: Date[] = [];
  for (let i = 0; i < 7; i++) {
    const day = new Date(startDate);
    day.setDate(startDate.getDate() + i);
    days.push(day);
  }
  return days;
}

export function exportWeeklySchedulePDF({
  turni,
  collaboratori,
  weekStart,
  weekEnd,
  aziendaNome = 'Azienda',
}: ExportOptions): void {
  const doc = new jsPDF({
    orientation: 'landscape',
    unit: 'mm',
    format: 'a4',
  });

  const pageWidth = doc.internal.pageSize.getWidth();
  const pageHeight = doc.internal.pageSize.getHeight();

  // Header
  doc.setFontSize(18);
  doc.setFont('helvetica', 'bold');
  doc.text('PROGRAMMAZIONE TURNI', pageWidth / 2, 15, { align: 'center' });

  doc.setFontSize(12);
  doc.setFont('helvetica', 'normal');
  doc.text(aziendaNome, pageWidth / 2, 22, { align: 'center' });

  doc.setFontSize(11);
  doc.text(
    `Settimana: ${formatDate(weekStart)} - ${formatDate(weekEnd)}`,
    pageWidth / 2,
    29,
    { align: 'center' }
  );

  // Generate week days
  const weekDays = getWeekDays(weekStart);

  // Build table data
  // Each row: collaboratore name + cells for each day
  const tableData: string[][] = [];

  // Group turni by date and collaboratore
  const turniMap = new Map<string, Map<string, Turno[]>>();

  turni.forEach((turno) => {
    const dateKey = turno.data;
    if (!turniMap.has(dateKey)) {
      turniMap.set(dateKey, new Map());
    }

    turno.Assegnazione_Turno?.forEach((assegnazione) => {
      const collabId = assegnazione.collaboratore_id;
      const dateCollab = turniMap.get(dateKey)!;
      if (!dateCollab.has(collabId)) {
        dateCollab.set(collabId, []);
      }
      dateCollab.get(collabId)!.push(turno);
    });
  });

  // Get unique collaboratori who have shifts this week
  const collaboratoriWithShifts = new Set<string>();
  turni.forEach((turno) => {
    turno.Assegnazione_Turno?.forEach((a) => {
      collaboratoriWithShifts.add(a.collaboratore_id);
    });
  });

  // Build rows
  collaboratori
    .filter((c) => collaboratoriWithShifts.has(c.id))
    .forEach((collab) => {
      const row: string[] = [`${collab.cognome} ${collab.nome}`];

      weekDays.forEach((day) => {
        const dateKey = day.toISOString().split('T')[0];
        const dayTurni = turniMap.get(dateKey)?.get(collab.id) || [];

        if (dayTurni.length === 0) {
          row.push('-');
        } else {
          const shifts = dayTurni
            .sort((a, b) => a.ora_inizio.localeCompare(b.ora_inizio))
            .map((t) => {
              const nucleo = t.Nucleo?.nome ? `[${t.Nucleo.nome}] ` : '';
              return `${nucleo}${t.ora_inizio.slice(0, 5)}-${t.ora_fine.slice(0, 5)}`;
            })
            .join('\n');
          row.push(shifts);
        }
      });

      tableData.push(row);
    });

  // Build headers
  const headers = [
    'Collaboratore',
    ...weekDays.map((d) => `${SHORT_DAY_NAMES[d.getDay()]} ${d.getDate()}`),
  ];

  // Create table
  doc.autoTable({
    head: [headers],
    body: tableData,
    startY: 35,
    theme: 'grid',
    styles: {
      fontSize: 8,
      cellPadding: 2,
      overflow: 'linebreak',
      valign: 'middle',
    },
    headStyles: {
      fillColor: [51, 51, 51],
      textColor: [255, 255, 255],
      fontStyle: 'bold',
      halign: 'center',
    },
    columnStyles: {
      0: { cellWidth: 35, fontStyle: 'bold' },
      1: { cellWidth: 32, halign: 'center' },
      2: { cellWidth: 32, halign: 'center' },
      3: { cellWidth: 32, halign: 'center' },
      4: { cellWidth: 32, halign: 'center' },
      5: { cellWidth: 32, halign: 'center' },
      6: { cellWidth: 32, halign: 'center' },
      7: { cellWidth: 32, halign: 'center' },
    },
    alternateRowStyles: {
      fillColor: [245, 245, 245],
    },
    margin: { left: 10, right: 10 },
  });

  // Footer
  const pageCount = (doc as unknown as { internal: { pages: unknown[] } }).internal.pages.length - 1;
  doc.setFontSize(8);
  doc.setTextColor(128);
  for (let i = 1; i <= pageCount; i++) {
    doc.setPage(i);
    doc.text(
      `Generato il ${new Date().toLocaleString('it-IT')} - Pagina ${i} di ${pageCount}`,
      pageWidth / 2,
      pageHeight - 5,
      { align: 'center' }
    );
  }

  // Download
  const fileName = `turni_${weekStart.toISOString().split('T')[0]}_${weekEnd.toISOString().split('T')[0]}.pdf`;
  doc.save(fileName);
}

// Export daily schedule for a specific nucleo
export function exportDailySchedulePDF({
  turni,
  date,
  nucleoNome,
  aziendaNome = 'Azienda',
}: {
  turni: Turno[];
  date: Date;
  nucleoNome?: string;
  aziendaNome?: string;
}): void {
  const doc = new jsPDF({
    orientation: 'portrait',
    unit: 'mm',
    format: 'a4',
  });

  const pageWidth = doc.internal.pageSize.getWidth();

  // Header
  doc.setFontSize(16);
  doc.setFont('helvetica', 'bold');
  doc.text('TURNI DEL GIORNO', pageWidth / 2, 15, { align: 'center' });

  doc.setFontSize(12);
  doc.setFont('helvetica', 'normal');
  doc.text(aziendaNome, pageWidth / 2, 22, { align: 'center' });

  if (nucleoNome) {
    doc.text(`Nucleo: ${nucleoNome}`, pageWidth / 2, 28, { align: 'center' });
  }

  doc.setFontSize(11);
  const dayName = DAY_NAMES[date.getDay()];
  doc.text(`${dayName}, ${formatDate(date)}`, pageWidth / 2, 35, { align: 'center' });

  // Sort turni by start time
  const sortedTurni = [...turni].sort((a, b) => a.ora_inizio.localeCompare(b.ora_inizio));

  // Build table data
  const tableData = sortedTurni.map((turno) => {
    const collaboratori =
      turno.Assegnazione_Turno?.map((a) => {
        const confirmed = a.confermato ? '✓' : '○';
        return `${confirmed} ${a.Collaboratore?.nome} ${a.Collaboratore?.cognome}`;
      }).join('\n') || '-';

    return [
      `${turno.ora_inizio.slice(0, 5)} - ${turno.ora_fine.slice(0, 5)}`,
      turno.Nucleo?.nome || '-',
      collaboratori,
      `${turno.Assegnazione_Turno?.length || 0}/${turno.num_collaboratori_richiesti || 1}`,
      turno.note || '-',
    ];
  });

  // Create table
  doc.autoTable({
    head: [['Orario', 'Nucleo', 'Collaboratori', 'Staff', 'Note']],
    body: tableData,
    startY: 42,
    theme: 'striped',
    styles: {
      fontSize: 9,
      cellPadding: 3,
      overflow: 'linebreak',
    },
    headStyles: {
      fillColor: [51, 51, 51],
      textColor: [255, 255, 255],
      fontStyle: 'bold',
    },
    columnStyles: {
      0: { cellWidth: 30 },
      1: { cellWidth: 25 },
      2: { cellWidth: 70 },
      3: { cellWidth: 15, halign: 'center' },
      4: { cellWidth: 45 },
    },
  });

  // Legend
  const finalY = (doc as unknown as { lastAutoTable: { finalY: number } }).lastAutoTable.finalY || 150;
  doc.setFontSize(8);
  doc.setTextColor(100);
  doc.text('Legenda: ✓ = Confermato, ○ = In attesa', 14, finalY + 10);

  // Download
  const fileName = `turni_${date.toISOString().split('T')[0]}.pdf`;
  doc.save(fileName);
}
