'use client';

import { useState, useEffect } from 'react';
import { useTranslations } from 'next-intl';
import { Clock, Users, Trash2, Plus, X, Check } from 'lucide-react';
import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogFooter,
  DialogHeader,
  DialogTitle,
} from '@/components/ui/dialog';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { Textarea } from '@/components/ui/textarea';
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from '@/components/ui/select';
import { Badge } from '@/components/ui/badge';
import { ScrollArea } from '@/components/ui/scroll-area';
import { useCollaboratori } from '@/hooks/use-collaboratori';
import type { Turno, CreateTurnoInput } from '@/hooks/use-turni';
import type { Nucleo } from '@/types/database';
import { cn } from '@/lib/utils';

interface ShiftAssignmentDialogProps {
  open: boolean;
  onOpenChange: (open: boolean) => void;
  date?: string;
  defaultTimeSlot?: { id: string; label: string; start: string; end: string };
  turno?: Turno | null;
  nuclei: Nucleo[];
  onSave: (input: CreateTurnoInput) => Promise<void>;
  onUpdate: (id: string, input: Partial<Turno>) => Promise<void>;
  onDelete: (id: string) => Promise<void>;
  onAddAssegnazione: (params: { turnoId: string; collaboratoreId: string; tipo?: string }) => Promise<unknown>;
  onRemoveAssegnazione: (params: { turnoId: string; assegnazioneId: string }) => Promise<unknown>;
  isLoading?: boolean;
}

export function ShiftAssignmentDialog({
  open,
  onOpenChange,
  date,
  defaultTimeSlot,
  turno,
  nuclei,
  onSave,
  onUpdate,
  onDelete,
  onAddAssegnazione,
  onRemoveAssegnazione,
  isLoading,
}: ShiftAssignmentDialogProps) {
  const t = useTranslations();
  const { collaboratoriAttivi, isLoading: isLoadingCollaboratori } = useCollaboratori();

  const isEditing = !!turno;

  // Form state
  const [nucleoId, setNucleoId] = useState('');
  const [oraInizio, setOraInizio] = useState('');
  const [oraFine, setOraFine] = useState('');
  const [numCollaboratori, setNumCollaboratori] = useState(1);
  const [note, setNote] = useState('');
  const [selectedCollaboratori, setSelectedCollaboratori] = useState<string[]>([]);

  // Reset form when opening
  useEffect(() => {
    if (open) {
      if (turno) {
        // Editing mode
        setNucleoId(turno.nucleo_id);
        setOraInizio(turno.ora_inizio.slice(0, 5));
        setOraFine(turno.ora_fine.slice(0, 5));
        setNumCollaboratori(turno.num_collaboratori_richiesti || 1);
        setNote(turno.note ?? '');
        setSelectedCollaboratori(
          turno.Assegnazione_Turno?.map((a) => a.collaboratore_id) || []
        );
      } else {
        // Creating mode
        setNucleoId(nuclei[0]?.id || '');
        setOraInizio(defaultTimeSlot?.start || '08:00');
        setOraFine(defaultTimeSlot?.end || '16:00');
        setNumCollaboratori(1);
        setNote('');
        setSelectedCollaboratori([]);
      }
    }
  }, [open, turno, defaultTimeSlot, nuclei]);

  const handleSave = async () => {
    if (!nucleoId || !date) return;

    if (isEditing && turno) {
      await onUpdate(turno.id, {
        nucleo_id: nucleoId,
        ora_inizio: oraInizio,
        ora_fine: oraFine,
        num_collaboratori_richiesti: numCollaboratori,
        note: note || undefined,
      });
    } else {
      await onSave({
        nucleo_id: nucleoId,
        data: date,
        ora_inizio: oraInizio,
        ora_fine: oraFine,
        num_collaboratori_richiesti: numCollaboratori,
        note: note || undefined,
        assegnazioni: selectedCollaboratori.map((id) => ({
          collaboratore_id: id,
          tipo: 'manuale',
        })),
      });
    }

    onOpenChange(false);
  };

  const handleDelete = async () => {
    if (turno) {
      await onDelete(turno.id);
      onOpenChange(false);
    }
  };

  const handleToggleCollaboratore = async (collaboratoreId: string) => {
    if (isEditing && turno) {
      const existingAssegnazione = turno.Assegnazione_Turno?.find(
        (a) => a.collaboratore_id === collaboratoreId
      );

      if (existingAssegnazione) {
        await onRemoveAssegnazione({
          turnoId: turno.id,
          assegnazioneId: existingAssegnazione.id,
        });
      } else {
        await onAddAssegnazione({
          turnoId: turno.id,
          collaboratoreId,
          tipo: 'manuale',
        });
      }
    } else {
      setSelectedCollaboratori((prev) =>
        prev.includes(collaboratoreId)
          ? prev.filter((id) => id !== collaboratoreId)
          : [...prev, collaboratoreId]
      );
    }
  };

  const currentAssignedIds = isEditing
    ? turno?.Assegnazione_Turno?.map((a) => a.collaboratore_id) || []
    : selectedCollaboratori;

  const formatDate = (dateStr: string) => {
    return new Date(dateStr).toLocaleDateString('it-IT', {
      weekday: 'long',
      day: 'numeric',
      month: 'long',
    });
  };

  const selectedNucleo = nuclei.find((n) => n.id === nucleoId);

  return (
    <Dialog open={open} onOpenChange={onOpenChange}>
      <DialogContent className="sm:max-w-[600px]">
        <DialogHeader>
          <DialogTitle>
            {isEditing ? t('shifts.editShift') : t('common.create')} Turno
          </DialogTitle>
          <DialogDescription>
            {date && formatDate(date)}
          </DialogDescription>
        </DialogHeader>

        <div className="grid gap-4 py-4">
          {/* Nucleo selection */}
          <div className="grid grid-cols-4 items-center gap-4">
            <Label htmlFor="nucleo" className="text-right">
              Nucleo
            </Label>
            <Select value={nucleoId} onValueChange={setNucleoId}>
              <SelectTrigger className="col-span-3">
                <SelectValue placeholder="Seleziona nucleo" />
              </SelectTrigger>
              <SelectContent>
                {nuclei.map((nucleo) => (
                  <SelectItem key={nucleo.id} value={nucleo.id}>
                    <div className="flex items-center gap-2">
                      <div
                        className="w-3 h-3 rounded-full"
                        style={{ backgroundColor: nucleo.colore }}
                      />
                      {nucleo.nome}
                    </div>
                  </SelectItem>
                ))}
              </SelectContent>
            </Select>
          </div>

          {/* Time */}
          <div className="grid grid-cols-4 items-center gap-4">
            <Label className="text-right">
              <Clock className="h-4 w-4 inline mr-1" />
              Orario
            </Label>
            <div className="col-span-3 flex items-center gap-2">
              <Input
                type="time"
                value={oraInizio}
                onChange={(e) => setOraInizio(e.target.value)}
                className="w-32"
              />
              <span>-</span>
              <Input
                type="time"
                value={oraFine}
                onChange={(e) => setOraFine(e.target.value)}
                className="w-32"
              />
            </div>
          </div>

          {/* Collaborators required */}
          <div className="grid grid-cols-4 items-center gap-4">
            <Label className="text-right">
              <Users className="h-4 w-4 inline mr-1" />
              Richiesti
            </Label>
            <Input
              type="number"
              min={1}
              max={20}
              value={numCollaboratori}
              onChange={(e) => setNumCollaboratori(parseInt(e.target.value) || 1)}
              className="w-20"
            />
          </div>

          {/* Collaborators selection */}
          <div className="grid grid-cols-4 gap-4">
            <Label className="text-right pt-2">Assegna</Label>
            <div className="col-span-3">
              <ScrollArea className="h-[200px] border rounded-md p-2">
                {isLoadingCollaboratori ? (
                  <div className="text-sm text-muted-foreground p-4 text-center">
                    Caricamento...
                  </div>
                ) : collaboratoriAttivi.length === 0 ? (
                  <div className="text-sm text-muted-foreground p-4 text-center">
                    Nessun collaboratore disponibile
                  </div>
                ) : (
                  <div className="space-y-1">
                    {collaboratoriAttivi.map((collaboratore) => {
                      const isSelected = currentAssignedIds.includes(collaboratore.id);
                      // Check if collaboratore belongs to selected nucleo
                      const belongsToNucleo = collaboratore.Appartenenza_Nucleo?.some(
                        (a) => a.Nucleo?.id === nucleoId && !a.data_fine
                      );

                      return (
                        <div
                          key={collaboratore.id}
                          onClick={() => handleToggleCollaboratore(collaboratore.id)}
                          className={cn(
                            'flex items-center justify-between p-2 rounded-md cursor-pointer transition-colors',
                            isSelected
                              ? 'bg-primary/10 border border-primary'
                              : 'hover:bg-muted',
                            belongsToNucleo && !isSelected && 'bg-muted/50'
                          )}
                        >
                          <div className="flex items-center gap-2">
                            <div
                              className={cn(
                                'w-8 h-8 rounded-full flex items-center justify-center text-sm font-medium',
                                isSelected
                                  ? 'bg-primary text-primary-foreground'
                                  : 'bg-muted'
                              )}
                            >
                              {collaboratore.nome[0]}
                              {collaboratore.cognome[0]}
                            </div>
                            <div>
                              <div className="text-sm font-medium">
                                {collaboratore.nome} {collaboratore.cognome}
                              </div>
                              <div className="text-xs text-muted-foreground">
                                {(collaboratore as { ruolo?: string }).ruolo || 'N/D'}
                              </div>
                            </div>
                          </div>
                          {isSelected && <Check className="h-4 w-4 text-primary" />}
                          {belongsToNucleo && !isSelected && (
                            <Badge variant="outline" className="text-xs">
                              {selectedNucleo?.nome}
                            </Badge>
                          )}
                        </div>
                      );
                    })}
                  </div>
                )}
              </ScrollArea>
              <div className="mt-2 text-xs text-muted-foreground">
                {currentAssignedIds.length}/{numCollaboratori} assegnati
              </div>
            </div>
          </div>

          {/* Notes */}
          <div className="grid grid-cols-4 items-start gap-4">
            <Label htmlFor="note" className="text-right pt-2">
              Note
            </Label>
            <Textarea
              id="note"
              value={note}
              onChange={(e) => setNote(e.target.value)}
              placeholder="Note opzionali..."
              className="col-span-3"
              rows={2}
            />
          </div>
        </div>

        <DialogFooter className="flex justify-between">
          {isEditing && (
            <Button
              variant="destructive"
              onClick={handleDelete}
              disabled={isLoading}
            >
              <Trash2 className="h-4 w-4 mr-2" />
              {t('common.delete')}
            </Button>
          )}
          <div className="flex gap-2 ml-auto">
            <Button variant="outline" onClick={() => onOpenChange(false)}>
              {t('common.cancel')}
            </Button>
            <Button onClick={handleSave} disabled={isLoading || !nucleoId}>
              {isLoading ? 'Salvataggio...' : t('common.save')}
            </Button>
          </div>
        </DialogFooter>
      </DialogContent>
    </Dialog>
  );
}
