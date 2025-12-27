'use client';

import { useState, useEffect } from 'react';
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { Switch } from '@/components/ui/switch';
import { Badge } from '@/components/ui/badge';
import { useToast } from '@/hooks/use-toast';
import { useAzienda } from '@/hooks/use-azienda';
import {
  Building2,
  Clock,
  Save,
  Loader2,
  CheckCircle,
  XCircle
} from 'lucide-react';
import type { OrarioApertura, OrarioVariabile, OrarioGiorno } from '@/types/database';

const GIORNI = [
  { key: 'lun', label: 'Lunedì', short: 'Lun' },
  { key: 'mar', label: 'Martedì', short: 'Mar' },
  { key: 'mer', label: 'Mercoledì', short: 'Mer' },
  { key: 'gio', label: 'Giovedì', short: 'Gio' },
  { key: 'ven', label: 'Venerdì', short: 'Ven' },
  { key: 'sab', label: 'Sabato', short: 'Sab' },
  { key: 'dom', label: 'Domenica', short: 'Dom' },
] as const;

type GiornoKey = typeof GIORNI[number]['key'];

interface OrarioGiornoState {
  inizio: string;
  fine: string;
  chiuso: boolean;
}

const DEFAULT_ORARIO: OrarioGiornoState = {
  inizio: '08:00',
  fine: '20:00',
  chiuso: false
};

export default function ImpostazioniPage() {
  const { toast } = useToast();
  const { azienda, isLoading: isLoadingAzienda, refetch } = useAzienda();

  const [isSaving, setIsSaving] = useState(false);
  const [orari, setOrari] = useState<Record<GiornoKey, OrarioGiornoState>>({
    lun: { ...DEFAULT_ORARIO },
    mar: { ...DEFAULT_ORARIO },
    mer: { ...DEFAULT_ORARIO },
    gio: { ...DEFAULT_ORARIO },
    ven: { ...DEFAULT_ORARIO },
    sab: { ...DEFAULT_ORARIO },
    dom: { ...DEFAULT_ORARIO, chiuso: true },
  });

  // Load existing orario from azienda
  useEffect(() => {
    if (azienda?.orario_apertura) {
      const orarioApertura = azienda.orario_apertura;

      if (orarioApertura.tipo === 'variabile') {
        const variabile = orarioApertura as OrarioVariabile;
        const newOrari = { ...orari };

        GIORNI.forEach(({ key }) => {
          const giorno = variabile[key] as OrarioGiorno | undefined;
          if (giorno) {
            newOrari[key] = {
              inizio: giorno.inizio || '08:00',
              fine: giorno.fine || '20:00',
              chiuso: giorno.chiuso || false,
            };
          }
        });

        setOrari(newOrari);
      } else if (orarioApertura.tipo === 'fisso') {
        // Orario fisso: applica a tutti i giorni
        const newOrari = {} as Record<GiornoKey, OrarioGiornoState>;
        GIORNI.forEach(({ key }) => {
          newOrari[key] = {
            inizio: orarioApertura.inizio || '08:00',
            fine: orarioApertura.fine || '20:00',
            chiuso: false,
          };
        });
        setOrari(newOrari);
      }
    }
  }, [azienda?.orario_apertura]);

  const handleOrarioChange = (giorno: GiornoKey, field: keyof OrarioGiornoState, value: string | boolean) => {
    setOrari(prev => ({
      ...prev,
      [giorno]: {
        ...prev[giorno],
        [field]: value
      }
    }));
  };

  const handleToggleChiuso = (giorno: GiornoKey) => {
    setOrari(prev => ({
      ...prev,
      [giorno]: {
        ...prev[giorno],
        chiuso: !prev[giorno].chiuso
      }
    }));
  };

  const handleSave = async () => {
    setIsSaving(true);

    try {
      // Build orarioApertura object
      const orarioApertura: OrarioVariabile = {
        tipo: 'variabile',
        lun: { inizio: orari.lun.inizio, fine: orari.lun.fine, chiuso: orari.lun.chiuso },
        mar: { inizio: orari.mar.inizio, fine: orari.mar.fine, chiuso: orari.mar.chiuso },
        mer: { inizio: orari.mer.inizio, fine: orari.mer.fine, chiuso: orari.mer.chiuso },
        gio: { inizio: orari.gio.inizio, fine: orari.gio.fine, chiuso: orari.gio.chiuso },
        ven: { inizio: orari.ven.inizio, fine: orari.ven.fine, chiuso: orari.ven.chiuso },
        sab: { inizio: orari.sab.inizio, fine: orari.sab.fine, chiuso: orari.sab.chiuso },
        dom: { inizio: orari.dom.inizio, fine: orari.dom.fine, chiuso: orari.dom.chiuso },
      };

      const response = await fetch('/api/azienda/orario', {
        method: 'PATCH',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ orarioApertura }),
      });

      if (!response.ok) {
        throw new Error('Errore nel salvataggio');
      }

      toast({
        title: 'Salvato!',
        description: 'Gli orari di apertura sono stati aggiornati.',
      });

      // Refetch azienda data
      refetch();
    } catch (error) {
      console.error('Error saving orario:', error);
      toast({
        title: 'Errore',
        description: 'Impossibile salvare gli orari. Riprova.',
        variant: 'destructive',
      });
    } finally {
      setIsSaving(false);
    }
  };

  // Count closed days
  const giorniChiusi = Object.values(orari).filter(o => o.chiuso).length;

  if (isLoadingAzienda) {
    return (
      <div className="flex items-center justify-center min-h-[400px]">
        <Loader2 className="h-8 w-8 animate-spin text-muted-foreground" />
      </div>
    );
  }

  return (
    <div className="container max-w-4xl py-6 space-y-6">
      {/* Header */}
      <div className="flex items-center gap-3">
        <div className="p-2 bg-primary/10 rounded-lg">
          <Building2 className="h-6 w-6 text-primary" />
        </div>
        <div>
          <h1 className="text-2xl font-bold">Impostazioni Azienda</h1>
          <p className="text-muted-foreground">{azienda?.nome}</p>
        </div>
      </div>

      {/* Orari di Apertura */}
      <Card>
        <CardHeader>
          <div className="flex items-center justify-between">
            <div className="flex items-center gap-2">
              <Clock className="h-5 w-5 text-primary" />
              <CardTitle>Orari di Apertura</CardTitle>
            </div>
            <Badge variant="outline" className="gap-1">
              {7 - giorniChiusi} giorni aperti
            </Badge>
          </div>
          <CardDescription>
            Configura gli orari di apertura e i giorni di chiusura settimanale
          </CardDescription>
        </CardHeader>
        <CardContent className="space-y-4">
          {/* Days Grid */}
          <div className="space-y-3">
            {GIORNI.map(({ key, label }) => (
              <div
                key={key}
                className={`flex items-center gap-4 p-3 rounded-lg border transition-colors ${
                  orari[key].chiuso
                    ? 'bg-orange-50 dark:bg-orange-950/20 border-orange-200 dark:border-orange-800'
                    : 'bg-green-50 dark:bg-green-950/20 border-green-200 dark:border-green-800'
                }`}
              >
                {/* Day Name */}
                <div className="w-24 flex items-center gap-2">
                  {orari[key].chiuso ? (
                    <XCircle className="h-4 w-4 text-orange-500" />
                  ) : (
                    <CheckCircle className="h-4 w-4 text-green-500" />
                  )}
                  <span className="font-medium">{label}</span>
                </div>

                {/* Time Inputs */}
                <div className="flex items-center gap-2 flex-1">
                  <div className="flex items-center gap-2">
                    <Label htmlFor={`${key}-inizio`} className="text-xs text-muted-foreground w-12">
                      Dalle
                    </Label>
                    <Input
                      id={`${key}-inizio`}
                      type="time"
                      value={orari[key].inizio}
                      onChange={(e) => handleOrarioChange(key, 'inizio', e.target.value)}
                      disabled={orari[key].chiuso}
                      className="w-28"
                    />
                  </div>
                  <div className="flex items-center gap-2">
                    <Label htmlFor={`${key}-fine`} className="text-xs text-muted-foreground w-12">
                      Alle
                    </Label>
                    <Input
                      id={`${key}-fine`}
                      type="time"
                      value={orari[key].fine}
                      onChange={(e) => handleOrarioChange(key, 'fine', e.target.value)}
                      disabled={orari[key].chiuso}
                      className="w-28"
                    />
                  </div>
                </div>

                {/* Closed Toggle */}
                <div className="flex items-center gap-2">
                  <Label htmlFor={`${key}-chiuso`} className="text-sm cursor-pointer">
                    Chiuso
                  </Label>
                  <Switch
                    id={`${key}-chiuso`}
                    checked={orari[key].chiuso}
                    onCheckedChange={() => handleToggleChiuso(key)}
                  />
                </div>
              </div>
            ))}
          </div>

          {/* Save Button */}
          <div className="flex justify-end pt-4 border-t">
            <Button onClick={handleSave} disabled={isSaving} className="gap-2">
              {isSaving ? (
                <>
                  <Loader2 className="h-4 w-4 animate-spin" />
                  Salvataggio...
                </>
              ) : (
                <>
                  <Save className="h-4 w-4" />
                  Salva Modifiche
                </>
              )}
            </Button>
          </div>
        </CardContent>
      </Card>
    </div>
  );
}
