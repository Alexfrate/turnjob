'use client';

import { useState, useEffect } from 'react';
import { X, Clock, Users, FileText, Calendar } from 'lucide-react';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { Textarea } from '@/components/ui/textarea';
import {
  Dialog,
  DialogContent,
  DialogHeader,
  DialogTitle,
  DialogFooter,
} from '@/components/ui/dialog';
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from '@/components/ui/select';
import type { ExtractedTurno } from '@/hooks/use-planning-chat';

interface TurnoEditModalProps {
  turno: ExtractedTurno;
  nuclei: { id: string; nome: string; colore?: string }[];
  isOpen: boolean;
  onClose: () => void;
  onSave: (updates: Partial<ExtractedTurno>) => void;
}

export function TurnoEditModal({ turno, nuclei, isOpen, onClose, onSave }: TurnoEditModalProps) {
  const [formData, setFormData] = useState({
    nucleo_nome: turno.nucleo_nome,
    data: turno.data,
    ora_inizio: turno.ora_inizio,
    ora_fine: turno.ora_fine,
    num_collaboratori_richiesti: turno.num_collaboratori_richiesti,
    note: turno.note || '',
  });

  // Reset form when turno changes
  useEffect(() => {
    setFormData({
      nucleo_nome: turno.nucleo_nome,
      data: turno.data,
      ora_inizio: turno.ora_inizio,
      ora_fine: turno.ora_fine,
      num_collaboratori_richiesti: turno.num_collaboratori_richiesti,
      note: turno.note || '',
    });
  }, [turno]);

  const handleSubmit = (e: React.FormEvent) => {
    e.preventDefault();

    // Find nucleo to get color
    const selectedNucleo = nuclei.find((n) => n.nome === formData.nucleo_nome);

    onSave({
      ...formData,
      nucleo_id: selectedNucleo?.id,
      nucleo_colore: selectedNucleo?.colore,
    });
  };

  const handleChange = (field: keyof typeof formData, value: string | number) => {
    setFormData((prev) => ({ ...prev, [field]: value }));
  };

  return (
    <Dialog open={isOpen} onOpenChange={(open) => !open && onClose()}>
      <DialogContent className="sm:max-w-[425px]">
        <DialogHeader>
          <DialogTitle className="flex items-center gap-2">
            <Calendar className="h-5 w-5 text-primary" />
            Modifica Turno
          </DialogTitle>
        </DialogHeader>

        <form onSubmit={handleSubmit} className="space-y-4">
          {/* Nucleo select */}
          <div className="space-y-2">
            <Label htmlFor="nucleo" className="flex items-center gap-2">
              Nucleo
            </Label>
            <Select
              value={formData.nucleo_nome}
              onValueChange={(value) => handleChange('nucleo_nome', value)}
            >
              <SelectTrigger>
                <SelectValue placeholder="Seleziona nucleo..." />
              </SelectTrigger>
              <SelectContent>
                {nuclei.map((nucleo) => (
                  <SelectItem key={nucleo.id} value={nucleo.nome}>
                    <div className="flex items-center gap-2">
                      {nucleo.colore && (
                        <div
                          className="w-3 h-3 rounded-full"
                          style={{ backgroundColor: nucleo.colore }}
                        />
                      )}
                      {nucleo.nome}
                    </div>
                  </SelectItem>
                ))}
              </SelectContent>
            </Select>
          </div>

          {/* Data */}
          <div className="space-y-2">
            <Label htmlFor="data" className="flex items-center gap-2">
              <Calendar className="h-4 w-4" />
              Data
            </Label>
            <Input
              id="data"
              type="date"
              value={formData.data}
              onChange={(e) => handleChange('data', e.target.value)}
            />
          </div>

          {/* Orario */}
          <div className="grid grid-cols-2 gap-4">
            <div className="space-y-2">
              <Label htmlFor="ora_inizio" className="flex items-center gap-2">
                <Clock className="h-4 w-4" />
                Inizio
              </Label>
              <Input
                id="ora_inizio"
                type="time"
                value={formData.ora_inizio}
                onChange={(e) => handleChange('ora_inizio', e.target.value)}
              />
            </div>
            <div className="space-y-2">
              <Label htmlFor="ora_fine">Fine</Label>
              <Input
                id="ora_fine"
                type="time"
                value={formData.ora_fine}
                onChange={(e) => handleChange('ora_fine', e.target.value)}
              />
            </div>
          </div>

          {/* Collaboratori richiesti */}
          <div className="space-y-2">
            <Label htmlFor="num_collaboratori" className="flex items-center gap-2">
              <Users className="h-4 w-4" />
              Collaboratori richiesti
            </Label>
            <Input
              id="num_collaboratori"
              type="number"
              min={1}
              max={50}
              value={formData.num_collaboratori_richiesti}
              onChange={(e) => handleChange('num_collaboratori_richiesti', parseInt(e.target.value) || 1)}
            />
          </div>

          {/* Note */}
          <div className="space-y-2">
            <Label htmlFor="note" className="flex items-center gap-2">
              <FileText className="h-4 w-4" />
              Note (opzionale)
            </Label>
            <Textarea
              id="note"
              value={formData.note}
              onChange={(e) => handleChange('note', e.target.value)}
              placeholder="Note aggiuntive..."
              rows={2}
            />
          </div>

          <DialogFooter>
            <Button type="button" variant="outline" onClick={onClose}>
              Annulla
            </Button>
            <Button type="submit">Salva modifiche</Button>
          </DialogFooter>
        </form>
      </DialogContent>
    </Dialog>
  );
}
