'use client';

import { useMemo } from 'react';
import { useTranslations } from 'next-intl';
import { Clock, Users, CheckCircle, Sparkles, Eye } from 'lucide-react';
import {
  Table,
  TableBody,
  TableCell,
  TableHead,
  TableHeader,
  TableRow,
} from '@/components/ui/table';
import { Badge } from '@/components/ui/badge';
import { Button } from '@/components/ui/button';
import { cn } from '@/lib/utils';
import type { Turno } from '@/hooks/use-turni';

interface ShiftsListViewProps {
  turni: Turno[];
  onViewShift?: (turno: Turno) => void;
}

const giorni = ['Dom', 'Lun', 'Mar', 'Mer', 'Gio', 'Ven', 'Sab'];

export function ShiftsListView({ turni, onViewShift }: ShiftsListViewProps) {
  const t = useTranslations();

  // Ordina turni per data e ora
  const sortedTurni = useMemo(() => {
    return [...turni].sort((a, b) => {
      const dateCompare = a.data.localeCompare(b.data);
      if (dateCompare !== 0) return dateCompare;
      return a.ora_inizio.localeCompare(b.ora_inizio);
    });
  }, [turni]);

  const formatDate = (dateStr: string) => {
    const date = new Date(dateStr + 'T12:00:00');
    const dayOfWeek = giorni[date.getDay()];
    const day = date.getDate();
    const month = date.toLocaleDateString('it-IT', { month: 'short' });
    return `${dayOfWeek} ${day} ${month}`;
  };

  const formatTime = (start: string, end: string) => {
    return `${start.slice(0, 5)} - ${end.slice(0, 5)}`;
  };

  const getAssignedCount = (turno: Turno) => {
    return turno.Assegnazione_Turno?.length || 0;
  };

  const getAssignedNames = (turno: Turno) => {
    if (!turno.Assegnazione_Turno || turno.Assegnazione_Turno.length === 0) {
      return 'Nessuna assegnazione';
    }
    return turno.Assegnazione_Turno
      .map((a) => a.Collaboratore ? `${a.Collaboratore.nome} ${a.Collaboratore.cognome}` : 'N/D')
      .join(', ');
  };

  if (turni.length === 0) {
    return (
      <div className="text-center py-8 text-muted-foreground">
        <Clock className="h-12 w-12 mx-auto mb-3 opacity-50" />
        <p>Nessun turno pianificato per questa settimana</p>
      </div>
    );
  }

  return (
    <div className="rounded-md border">
      <Table>
        <TableHeader>
          <TableRow>
            <TableHead className="w-[120px]">Giorno</TableHead>
            <TableHead className="w-[100px]">Orario</TableHead>
            <TableHead>Nucleo</TableHead>
            <TableHead>Collaboratori</TableHead>
            <TableHead className="w-[100px]">Stato</TableHead>
            <TableHead className="w-[80px] text-right">Azioni</TableHead>
          </TableRow>
        </TableHeader>
        <TableBody>
          {sortedTurni.map((turno) => {
            const assigned = getAssignedCount(turno);
            const required = turno.num_collaboratori_richiesti;
            const isComplete = assigned >= required;

            return (
              <TableRow key={turno.id}>
                <TableCell className="font-medium">
                  {formatDate(turno.data)}
                </TableCell>
                <TableCell>
                  <div className="flex items-center gap-1 text-sm">
                    <Clock className="h-3 w-3 text-muted-foreground" />
                    {formatTime(turno.ora_inizio, turno.ora_fine)}
                  </div>
                </TableCell>
                <TableCell>
                  <div className="flex items-center gap-2">
                    {turno.Nucleo?.colore && (
                      <div
                        className="w-3 h-3 rounded-full"
                        style={{ backgroundColor: turno.Nucleo.colore }}
                      />
                    )}
                    <span>{turno.Nucleo?.nome || 'N/D'}</span>
                    {turno.suggerito_da_ai && (
                      <Sparkles className="h-3 w-3 text-purple-500" />
                    )}
                  </div>
                </TableCell>
                <TableCell>
                  <div className="flex items-center gap-2">
                    <Badge
                      variant={isComplete ? 'default' : 'outline'}
                      className={cn(
                        'gap-1',
                        isComplete
                          ? 'bg-green-100 text-green-700 hover:bg-green-100'
                          : 'text-orange-600 border-orange-300'
                      )}
                    >
                      <Users className="h-3 w-3" />
                      {assigned}/{required}
                    </Badge>
                    <span className="text-xs text-muted-foreground truncate max-w-[200px]">
                      {getAssignedNames(turno)}
                    </span>
                  </div>
                </TableCell>
                <TableCell>
                  <div className="flex items-center gap-1">
                    {turno.pubblicato && (
                      <Badge variant="secondary" className="text-xs">
                        <CheckCircle className="h-3 w-3 mr-1" />
                        Pubblicato
                      </Badge>
                    )}
                    {turno.completato && (
                      <Badge variant="default" className="text-xs bg-green-600">
                        Completo
                      </Badge>
                    )}
                  </div>
                </TableCell>
                <TableCell className="text-right">
                  {onViewShift && (
                    <Button
                      variant="ghost"
                      size="sm"
                      onClick={() => onViewShift(turno)}
                    >
                      <Eye className="h-4 w-4" />
                    </Button>
                  )}
                </TableCell>
              </TableRow>
            );
          })}
        </TableBody>
      </Table>
    </div>
  );
}
