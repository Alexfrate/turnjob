'use client';

import { useState } from 'react';
import { Calendar, Clock, Plus, Check, X, AlertCircle, Settings } from 'lucide-react';
import { Button } from '@/components/ui/button';
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card';
import { Badge } from '@/components/ui/badge';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from '@/components/ui/select';
import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogFooter,
  DialogHeader,
  DialogTitle,
  DialogTrigger,
} from '@/components/ui/dialog';
import { Textarea } from '@/components/ui/textarea';
import { useCollaboratori } from '@/hooks/use-collaboratori';
import { useRichiesteCollaboratore, useCreateRichiestaCollaboratore } from '@/hooks/use-richieste-collaboratore';
import { useToast } from '@/hooks/use-toast';
import type { TipoRiposo, Collaboratore } from '@/types/database';

interface CollaboratorAvailabilityTabProps {
  collaboratoreId: string;
  collaboratore: Collaboratore & {
    Appartenenza_Nucleo?: unknown[];
    Richiesta?: unknown[];
  };
}

export function CollaboratorAvailabilityTab({
  collaboratoreId,
  collaboratore,
}: CollaboratorAvailabilityTabProps) {
  const { toast } = useToast();
  const { updateCollaboratore, isUpdating } = useCollaboratori();
  const { richieste, inAttesa, approvate, rifiutate, stats, isLoading } = useRichiesteCollaboratore(collaboratoreId);
  const { createRichiesta, isPending: isCreating } = useCreateRichiestaCollaboratore();

  // State for editing riposo config
  const [isEditingRiposo, setIsEditingRiposo] = useState(false);
  const [tipoRiposo, setTipoRiposo] = useState<TipoRiposo>(collaboratore.tipo_riposo || 'giorni_interi');
  const [quantitaRiposo, setQuantitaRiposo] = useState(
    collaboratore.tipo_riposo === 'ore'
      ? (collaboratore.ore_riposo_settimanali || 8)
      : (collaboratore.riposi_settimanali_custom || 2)
  );

  // State for new request dialog
  const [isNewRequestOpen, setIsNewRequestOpen] = useState(false);
  const [newRequestType, setNewRequestType] = useState<'ferie' | 'permesso'>('ferie');
  const [newRequestDateStart, setNewRequestDateStart] = useState('');
  const [newRequestDateEnd, setNewRequestDateEnd] = useState('');
  const [newRequestHours, setNewRequestHours] = useState<number | undefined>();
  const [newRequestNote, setNewRequestNote] = useState('');

  // Helper to format dates
  const formatDate = (dateStr: string) => {
    return new Date(dateStr).toLocaleDateString('it-IT', {
      weekday: 'short',
      day: 'numeric',
      month: 'short',
      year: 'numeric',
    });
  };

  // Save riposo configuration
  const handleSaveRiposoConfig = () => {
    updateCollaboratore(
      {
        id: collaboratoreId,
        updates: {
          tipo_riposo: tipoRiposo,
          riposi_settimanali_custom: tipoRiposo !== 'ore' ? quantitaRiposo : undefined,
          ore_riposo_settimanali: tipoRiposo === 'ore' ? quantitaRiposo : undefined,
        },
      },
      {
        onSuccess: () => {
          toast({
            title: 'Configurazione salvata',
            description: 'La configurazione dei riposi è stata aggiornata.',
          });
          setIsEditingRiposo(false);
        },
        onError: (error) => {
          toast({
            title: 'Errore',
            description: error instanceof Error ? error.message : 'Errore durante il salvataggio',
            variant: 'destructive',
          });
        },
      }
    );
  };

  // Create new request
  const handleCreateRequest = async () => {
    if (!newRequestDateStart || !newRequestDateEnd) {
      toast({
        title: 'Errore',
        description: 'Inserisci le date di inizio e fine',
        variant: 'destructive',
      });
      return;
    }

    try {
      await createRichiesta(collaboratoreId, {
        tipo: newRequestType,
        data_inizio: newRequestDateStart,
        data_fine: newRequestDateEnd,
        ore_richieste: newRequestType === 'permesso' ? newRequestHours : undefined,
        note_collaboratore: newRequestNote || undefined,
      });

      toast({
        title: 'Richiesta creata',
        description: `Richiesta di ${newRequestType} creata con successo.`,
      });

      // Reset form
      setIsNewRequestOpen(false);
      setNewRequestDateStart('');
      setNewRequestDateEnd('');
      setNewRequestHours(undefined);
      setNewRequestNote('');
    } catch (error) {
      toast({
        title: 'Errore',
        description: error instanceof Error ? error.message : 'Errore durante la creazione',
        variant: 'destructive',
      });
    }
  };

  // Get label for riposo type
  const getRiposoLabel = (tipo: TipoRiposo) => {
    switch (tipo) {
      case 'giorni_interi':
        return 'giorni';
      case 'mezze_giornate':
        return 'mezze giornate';
      case 'ore':
        return 'ore';
      default:
        return '';
    }
  };

  return (
    <div className="space-y-6">
      {/* Riposo Configuration Card */}
      <Card>
        <CardHeader className="pb-3">
          <div className="flex items-center justify-between">
            <div>
              <CardTitle className="text-base flex items-center gap-2">
                <Settings className="h-4 w-4" />
                Configurazione Riposi Settimanali
              </CardTitle>
              <CardDescription>
                Tipo e quantità di riposo settimanale per questo collaboratore
              </CardDescription>
            </div>
            {!isEditingRiposo && (
              <Button variant="outline" size="sm" onClick={() => setIsEditingRiposo(true)}>
                Modifica
              </Button>
            )}
          </div>
        </CardHeader>
        <CardContent>
          {isEditingRiposo ? (
            <div className="space-y-4">
              <div className="grid gap-4 sm:grid-cols-2">
                <div className="space-y-2">
                  <Label>Tipo di riposo</Label>
                  <Select
                    value={tipoRiposo}
                    onValueChange={(v) => setTipoRiposo(v as TipoRiposo)}
                  >
                    <SelectTrigger>
                      <SelectValue />
                    </SelectTrigger>
                    <SelectContent>
                      <SelectItem value="giorni_interi">Giorni interi</SelectItem>
                      <SelectItem value="mezze_giornate">Mezze giornate</SelectItem>
                      <SelectItem value="ore">Ore</SelectItem>
                    </SelectContent>
                  </Select>
                </div>
                <div className="space-y-2">
                  <Label>
                    Quantità ({getRiposoLabel(tipoRiposo)}/settimana)
                  </Label>
                  <Input
                    type="number"
                    min={0}
                    max={tipoRiposo === 'ore' ? 40 : 7}
                    value={quantitaRiposo}
                    onChange={(e) => setQuantitaRiposo(Number(e.target.value))}
                  />
                </div>
              </div>
              <div className="flex gap-2">
                <Button onClick={handleSaveRiposoConfig} disabled={isUpdating}>
                  {isUpdating ? 'Salvataggio...' : 'Salva'}
                </Button>
                <Button variant="outline" onClick={() => setIsEditingRiposo(false)}>
                  Annulla
                </Button>
              </div>
            </div>
          ) : (
            <div className="flex items-center gap-4">
              <div className="flex-1">
                <p className="text-2xl font-bold">
                  {collaboratore.tipo_riposo === 'ore'
                    ? collaboratore.ore_riposo_settimanali || 8
                    : collaboratore.riposi_settimanali_custom || 2}
                </p>
                <p className="text-sm text-muted-foreground">
                  {getRiposoLabel(collaboratore.tipo_riposo || 'giorni_interi')} per settimana
                </p>
              </div>
              <Badge variant="outline" className="text-sm px-3 py-1">
                {collaboratore.tipo_riposo === 'giorni_interi'
                  ? 'Giorni interi'
                  : collaboratore.tipo_riposo === 'mezze_giornate'
                  ? 'Mezze giornate'
                  : 'Ore'}
              </Badge>
            </div>
          )}
        </CardContent>
      </Card>

      {/* Ferie/Permessi Card */}
      <Card>
        <CardHeader className="pb-3">
          <div className="flex items-center justify-between">
            <div>
              <CardTitle className="text-base flex items-center gap-2">
                <Calendar className="h-4 w-4" />
                Ferie e Permessi
              </CardTitle>
              <CardDescription>
                Gestisci le richieste di ferie e permessi
              </CardDescription>
            </div>
            <Dialog open={isNewRequestOpen} onOpenChange={setIsNewRequestOpen}>
              <DialogTrigger asChild>
                <Button size="sm">
                  <Plus className="h-4 w-4 mr-1" />
                  Nuova richiesta
                </Button>
              </DialogTrigger>
              <DialogContent>
                <DialogHeader>
                  <DialogTitle>Nuova richiesta ferie/permessi</DialogTitle>
                  <DialogDescription>
                    Crea una nuova richiesta per {collaboratore.nome} {collaboratore.cognome}
                  </DialogDescription>
                </DialogHeader>
                <div className="space-y-4 py-4">
                  <div className="space-y-2">
                    <Label>Tipo</Label>
                    <Select
                      value={newRequestType}
                      onValueChange={(v) => setNewRequestType(v as 'ferie' | 'permesso')}
                    >
                      <SelectTrigger>
                        <SelectValue />
                      </SelectTrigger>
                      <SelectContent>
                        <SelectItem value="ferie">Ferie</SelectItem>
                        <SelectItem value="permesso">Permesso</SelectItem>
                      </SelectContent>
                    </Select>
                  </div>
                  <div className="grid gap-4 sm:grid-cols-2">
                    <div className="space-y-2">
                      <Label>Data inizio</Label>
                      <Input
                        type="date"
                        value={newRequestDateStart}
                        onChange={(e) => setNewRequestDateStart(e.target.value)}
                      />
                    </div>
                    <div className="space-y-2">
                      <Label>Data fine</Label>
                      <Input
                        type="date"
                        value={newRequestDateEnd}
                        onChange={(e) => setNewRequestDateEnd(e.target.value)}
                        min={newRequestDateStart}
                      />
                    </div>
                  </div>
                  {newRequestType === 'permesso' && (
                    <div className="space-y-2">
                      <Label>Ore richieste (opzionale)</Label>
                      <Input
                        type="number"
                        min={1}
                        max={8}
                        placeholder="Es. 4"
                        value={newRequestHours || ''}
                        onChange={(e) => setNewRequestHours(e.target.value ? Number(e.target.value) : undefined)}
                      />
                    </div>
                  )}
                  <div className="space-y-2">
                    <Label>Note (opzionale)</Label>
                    <Textarea
                      placeholder="Aggiungi note per la richiesta..."
                      value={newRequestNote}
                      onChange={(e) => setNewRequestNote(e.target.value)}
                    />
                  </div>
                </div>
                <DialogFooter>
                  <Button variant="outline" onClick={() => setIsNewRequestOpen(false)}>
                    Annulla
                  </Button>
                  <Button onClick={handleCreateRequest} disabled={isCreating}>
                    {isCreating ? 'Creazione...' : 'Crea richiesta'}
                  </Button>
                </DialogFooter>
              </DialogContent>
            </Dialog>
          </div>
        </CardHeader>
        <CardContent>
          {isLoading ? (
            <div className="text-center py-8 text-muted-foreground">Caricamento...</div>
          ) : richieste.length === 0 ? (
            <div className="text-center py-8 text-muted-foreground">
              <Calendar className="h-8 w-8 mx-auto mb-2 opacity-50" />
              <p>Nessuna richiesta</p>
            </div>
          ) : (
            <div className="space-y-3">
              {/* In Attesa section */}
              {inAttesa.length > 0 && (
                <div className="space-y-2">
                  <p className="text-sm font-medium text-muted-foreground flex items-center gap-1">
                    <Clock className="h-3.5 w-3.5" />
                    In attesa ({inAttesa.length})
                  </p>
                  {inAttesa.map((r) => (
                    <div
                      key={r.id}
                      className="flex items-center justify-between p-3 border border-yellow-200 bg-yellow-50 dark:bg-yellow-950/20 dark:border-yellow-900 rounded-lg"
                    >
                      <div>
                        <p className="font-medium capitalize">{r.tipo}</p>
                        <p className="text-sm text-muted-foreground">
                          {formatDate(r.data_inizio)} - {formatDate(r.data_fine)}
                        </p>
                      </div>
                      <Badge variant="secondary" className="bg-yellow-100 text-yellow-800 dark:bg-yellow-900 dark:text-yellow-200">
                        <AlertCircle className="h-3 w-3 mr-1" />
                        In attesa
                      </Badge>
                    </div>
                  ))}
                </div>
              )}

              {/* Approvate section */}
              {approvate.length > 0 && (
                <div className="space-y-2">
                  <p className="text-sm font-medium text-muted-foreground flex items-center gap-1">
                    <Check className="h-3.5 w-3.5" />
                    Approvate ({approvate.length})
                  </p>
                  {approvate.map((r) => (
                    <div
                      key={r.id}
                      className="flex items-center justify-between p-3 border border-green-200 bg-green-50 dark:bg-green-950/20 dark:border-green-900 rounded-lg"
                    >
                      <div>
                        <p className="font-medium capitalize">{r.tipo}</p>
                        <p className="text-sm text-muted-foreground">
                          {formatDate(r.data_inizio)} - {formatDate(r.data_fine)}
                        </p>
                      </div>
                      <Badge variant="default" className="bg-green-100 text-green-800 dark:bg-green-900 dark:text-green-200">
                        <Check className="h-3 w-3 mr-1" />
                        Approvata
                      </Badge>
                    </div>
                  ))}
                </div>
              )}

              {/* Rifiutate section */}
              {rifiutate.length > 0 && (
                <div className="space-y-2">
                  <p className="text-sm font-medium text-muted-foreground flex items-center gap-1">
                    <X className="h-3.5 w-3.5" />
                    Rifiutate ({rifiutate.length})
                  </p>
                  {rifiutate.map((r) => (
                    <div
                      key={r.id}
                      className="flex items-center justify-between p-3 border border-red-200 bg-red-50 dark:bg-red-950/20 dark:border-red-900 rounded-lg"
                    >
                      <div>
                        <p className="font-medium capitalize">{r.tipo}</p>
                        <p className="text-sm text-muted-foreground">
                          {formatDate(r.data_inizio)} - {formatDate(r.data_fine)}
                        </p>
                      </div>
                      <Badge variant="destructive">
                        <X className="h-3 w-3 mr-1" />
                        Rifiutata
                      </Badge>
                    </div>
                  ))}
                </div>
              )}
            </div>
          )}
        </CardContent>
      </Card>

      {/* Annual Stats Card */}
      <Card>
        <CardHeader className="pb-3">
          <CardTitle className="text-base flex items-center gap-2">
            <Clock className="h-4 w-4" />
            Riepilogo Annuale {new Date().getFullYear()}
          </CardTitle>
        </CardHeader>
        <CardContent>
          <div className="grid gap-4 sm:grid-cols-2">
            <div className="p-4 rounded-lg bg-muted/50">
              <p className="text-sm text-muted-foreground">Giorni ferie usati</p>
              <p className="text-2xl font-bold">
                {stats.giorniFerieUsati}
                <span className="text-sm font-normal text-muted-foreground">
                  {' '}/ {collaboratore.ferie_annuali_custom || 26} giorni
                </span>
              </p>
            </div>
            <div className="p-4 rounded-lg bg-muted/50">
              <p className="text-sm text-muted-foreground">Ore permessi usate</p>
              <p className="text-2xl font-bold">
                {stats.orePermessiUsate}
                <span className="text-sm font-normal text-muted-foreground">
                  {' '}/ {collaboratore.permessi_annuali_custom || 32} ore
                </span>
              </p>
            </div>
          </div>
          <div className="mt-4 flex gap-4 text-sm text-muted-foreground">
            <span>Totale richieste: {stats.totaleRichieste}</span>
            {stats.richiesteInAttesa > 0 && (
              <span className="text-yellow-600">
                {stats.richiesteInAttesa} in attesa
              </span>
            )}
          </div>
        </CardContent>
      </Card>
    </div>
  );
}
