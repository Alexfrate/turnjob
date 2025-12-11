'use client';

import { useState } from 'react';
import { useTranslations } from 'next-intl';
import { Plus, RefreshCw, Calendar, Clock, Users, Loader2, Send } from 'lucide-react';
import { Button } from '@/components/ui/button';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Badge } from '@/components/ui/badge';
import { ScrollArea } from '@/components/ui/scroll-area';
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
  Collapsible,
  CollapsibleContent,
  CollapsibleTrigger,
} from '@/components/ui/collapsible';
import { Checkbox } from '@/components/ui/checkbox';
import { cn } from '@/lib/utils';
import {
  useCriticitaContinuativeAttive,
  CriticitaContinuativa,
} from '@/hooks/use-criticita-continuative';

interface CriticalitySidebarProps {
  weekStart: string;
  weekEnd: string;
  onLoadToContext: (criticita: CriticitaContinuativa[]) => void;
  isLoading?: boolean;
}

interface SporadicCriticita {
  id: string;
  tipo: string;
  nome: string;
  descrizione?: string;
  giorno_settimana: number;
  ora_inizio?: string;
  ora_fine?: string;
}

const giorni = ['', 'Lunedì', 'Martedì', 'Mercoledì', 'Giovedì', 'Venerdì', 'Sabato', 'Domenica'];
const giorniShort = ['', 'Lun', 'Mar', 'Mer', 'Gio', 'Ven', 'Sab', 'Dom'];

const CRITICITA_TYPES = [
  { value: 'SCARICO_MERCI', label: 'Scarico merci', icon: '📦' },
  { value: 'ALTA_AFFLUENZA', label: 'Alta affluenza', icon: '👥' },
  { value: 'PICCO_WEEKEND', label: 'Picco weekend', icon: '🔥' },
  { value: 'COPERTURA_MINIMA', label: 'Copertura minima', icon: '⚠️' },
  { value: 'ASSENZA_FERIE', label: 'Ferie/Assenza', icon: '🏖️' },
  { value: 'EVENTO_SPECIALE', label: 'Evento speciale', icon: '🎉' },
  { value: 'EVENTO_CRITICO', label: 'Evento critico', icon: '🚨' },
  { value: 'MANUTENZIONE', label: 'Manutenzione', icon: '🔧' },
  { value: 'FORMAZIONE', label: 'Formazione', icon: '📚' },
  { value: 'ALTRO', label: 'Altro', icon: '📝' },
];

export function CriticalitySidebar({
  weekStart,
  weekEnd,
  onLoadToContext,
  isLoading: externalLoading,
}: CriticalitySidebarProps) {
  const t = useTranslations();
  const [selectedContinuative, setSelectedContinuative] = useState<Set<string>>(new Set());
  const [sporadicCriticita, setSporadicCriticita] = useState<SporadicCriticita[]>([]);
  const [selectedSporadic, setSelectedSporadic] = useState<Set<string>>(new Set());
  const [showAddForm, setShowAddForm] = useState(false);
  const [newCriticita, setNewCriticita] = useState({
    tipo: '',
    nome: '',
    giorno_settimana: 1,
    ora_inizio: '',
    ora_fine: '',
  });

  const { data: continuative, isLoading } = useCriticitaContinuativeAttive();

  const handleToggleContinuativa = (id: string) => {
    const newSelected = new Set(selectedContinuative);
    if (newSelected.has(id)) {
      newSelected.delete(id);
    } else {
      newSelected.add(id);
    }
    setSelectedContinuative(newSelected);
  };

  const handleToggleSporadic = (id: string) => {
    const newSelected = new Set(selectedSporadic);
    if (newSelected.has(id)) {
      newSelected.delete(id);
    } else {
      newSelected.add(id);
    }
    setSelectedSporadic(newSelected);
  };

  const handleAddSporadic = () => {
    if (!newCriticita.tipo || !newCriticita.nome) return;

    const typeInfo = CRITICITA_TYPES.find((t) => t.value === newCriticita.tipo);
    const newItem: SporadicCriticita = {
      id: `sporadic-${Date.now()}`,
      tipo: newCriticita.tipo,
      nome: newCriticita.nome,
      giorno_settimana: newCriticita.giorno_settimana,
      ora_inizio: newCriticita.ora_inizio || undefined,
      ora_fine: newCriticita.ora_fine || undefined,
    };

    setSporadicCriticita([...sporadicCriticita, newItem]);
    setSelectedSporadic(new Set([...selectedSporadic, newItem.id]));
    setNewCriticita({
      tipo: '',
      nome: '',
      giorno_settimana: 1,
      ora_inizio: '',
      ora_fine: '',
    });
    setShowAddForm(false);
  };

  const handleLoadToContext = () => {
    const selectedContinuativeItems = (continuative || []).filter((c) =>
      selectedContinuative.has(c.id)
    );
    onLoadToContext(selectedContinuativeItems);
  };

  const selectedCount = selectedContinuative.size + selectedSporadic.size;
  const totalContinuative = continuative?.length || 0;

  const getTypeIcon = (tipo: string) => {
    return CRITICITA_TYPES.find((t) => t.value === tipo)?.icon || '📝';
  };

  return (
    <Card className="h-full flex flex-col">
      <CardHeader className="py-3 border-b flex-shrink-0">
        <CardTitle className="text-sm flex items-center gap-2">
          <Calendar className="h-4 w-4" />
          {t('criticalities.title')}
        </CardTitle>
      </CardHeader>

      <ScrollArea className="flex-1">
        <CardContent className="p-3 space-y-4">
          {/* Add Button */}
          <Button
            variant="outline"
            size="sm"
            className="w-full gap-2"
            onClick={() => setShowAddForm(!showAddForm)}
          >
            <Plus className="h-4 w-4" />
            {t('criticalities.addNew')}
          </Button>

          {/* Add Form */}
          {showAddForm && (
            <Card className="p-3 space-y-3 bg-muted/50">
              <div className="space-y-2">
                <Label className="text-xs">{t('common.type') || 'Tipo'}</Label>
                <Select
                  value={newCriticita.tipo}
                  onValueChange={(v) => setNewCriticita({ ...newCriticita, tipo: v })}
                >
                  <SelectTrigger className="h-8 text-xs">
                    <SelectValue placeholder="Seleziona tipo..." />
                  </SelectTrigger>
                  <SelectContent>
                    {CRITICITA_TYPES.map((type) => (
                      <SelectItem key={type.value} value={type.value}>
                        <span className="flex items-center gap-2">
                          <span>{type.icon}</span>
                          <span>{type.label}</span>
                        </span>
                      </SelectItem>
                    ))}
                  </SelectContent>
                </Select>
              </div>

              <div className="space-y-2">
                <Label className="text-xs">{t('common.name') || 'Nome'}</Label>
                <Input
                  value={newCriticita.nome}
                  onChange={(e) => setNewCriticita({ ...newCriticita, nome: e.target.value })}
                  placeholder="es. Marco in ferie"
                  className="h-8 text-xs"
                />
              </div>

              <div className="space-y-2">
                <Label className="text-xs">{t('calendar.day') || 'Giorno'}</Label>
                <Select
                  value={String(newCriticita.giorno_settimana)}
                  onValueChange={(v) =>
                    setNewCriticita({ ...newCriticita, giorno_settimana: parseInt(v) })
                  }
                >
                  <SelectTrigger className="h-8 text-xs">
                    <SelectValue />
                  </SelectTrigger>
                  <SelectContent>
                    {giorni.slice(1).map((g, i) => (
                      <SelectItem key={i + 1} value={String(i + 1)}>
                        {g}
                      </SelectItem>
                    ))}
                  </SelectContent>
                </Select>
              </div>

              <div className="grid grid-cols-2 gap-2">
                <div className="space-y-2">
                  <Label className="text-xs">{t('shifts.startTime') || 'Ora inizio'}</Label>
                  <Input
                    type="time"
                    value={newCriticita.ora_inizio}
                    onChange={(e) =>
                      setNewCriticita({ ...newCriticita, ora_inizio: e.target.value })
                    }
                    className="h-8 text-xs"
                  />
                </div>
                <div className="space-y-2">
                  <Label className="text-xs">{t('shifts.endTime') || 'Ora fine'}</Label>
                  <Input
                    type="time"
                    value={newCriticita.ora_fine}
                    onChange={(e) => setNewCriticita({ ...newCriticita, ora_fine: e.target.value })}
                    className="h-8 text-xs"
                  />
                </div>
              </div>

              <div className="flex gap-2 pt-2">
                <Button
                  variant="outline"
                  size="sm"
                  className="flex-1 h-7 text-xs"
                  onClick={() => setShowAddForm(false)}
                >
                  {t('common.cancel')}
                </Button>
                <Button
                  size="sm"
                  className="flex-1 h-7 text-xs"
                  onClick={handleAddSporadic}
                  disabled={!newCriticita.tipo || !newCriticita.nome}
                >
                  {t('common.create')}
                </Button>
              </div>
            </Card>
          )}

          {/* Continuative Section */}
          <Collapsible defaultOpen>
            <CollapsibleTrigger className="flex items-center justify-between w-full text-xs font-medium text-muted-foreground hover:text-foreground py-1">
              <span className="flex items-center gap-2">
                🔄 {t('criticalities.continuative')}
                <Badge variant="secondary" className="text-[10px] px-1.5 py-0">
                  {totalContinuative}
                </Badge>
              </span>
            </CollapsibleTrigger>
            <CollapsibleContent className="pt-2 space-y-1.5">
              {isLoading ? (
                <div className="flex items-center justify-center py-4">
                  <Loader2 className="h-4 w-4 animate-spin text-muted-foreground" />
                </div>
              ) : continuative && continuative.length > 0 ? (
                continuative.map((c) => (
                  <CriticitaItem
                    key={c.id}
                    criticita={c}
                    selected={selectedContinuative.has(c.id)}
                    onToggle={() => handleToggleContinuativa(c.id)}
                    getTypeIcon={getTypeIcon}
                  />
                ))
              ) : (
                <p className="text-xs text-muted-foreground text-center py-2">
                  {t('criticalities.continuativeDesc')}
                </p>
              )}
            </CollapsibleContent>
          </Collapsible>

          {/* Sporadic Section */}
          <Collapsible defaultOpen>
            <CollapsibleTrigger className="flex items-center justify-between w-full text-xs font-medium text-muted-foreground hover:text-foreground py-1">
              <span className="flex items-center gap-2">
                ⚡ {t('criticalities.sporadic')}
                {sporadicCriticita.length > 0 && (
                  <Badge variant="secondary" className="text-[10px] px-1.5 py-0">
                    {sporadicCriticita.length}
                  </Badge>
                )}
              </span>
            </CollapsibleTrigger>
            <CollapsibleContent className="pt-2 space-y-1.5">
              {sporadicCriticita.length > 0 ? (
                sporadicCriticita.map((c) => (
                  <SporadicItem
                    key={c.id}
                    criticita={c}
                    selected={selectedSporadic.has(c.id)}
                    onToggle={() => handleToggleSporadic(c.id)}
                    onRemove={() => {
                      setSporadicCriticita(sporadicCriticita.filter((s) => s.id !== c.id));
                      const newSelected = new Set(selectedSporadic);
                      newSelected.delete(c.id);
                      setSelectedSporadic(newSelected);
                    }}
                    getTypeIcon={getTypeIcon}
                  />
                ))
              ) : (
                <p className="text-xs text-muted-foreground text-center py-2">
                  {t('criticalities.sporadicDesc')}
                </p>
              )}
            </CollapsibleContent>
          </Collapsible>
        </CardContent>
      </ScrollArea>

      {/* Footer with Load Button */}
      <div className="p-3 border-t flex-shrink-0">
        <Button
          size="sm"
          className="w-full gap-2"
          onClick={handleLoadToContext}
          disabled={selectedCount === 0 || externalLoading}
        >
          {externalLoading ? (
            <>
              <Loader2 className="h-4 w-4 animate-spin" />
              Caricamento...
            </>
          ) : (
            <>
              <Send className="h-4 w-4" />
              Carica nel contesto AI
              {selectedCount > 0 && (
                <Badge variant="secondary" className="ml-1 text-[10px]">
                  {selectedCount}
                </Badge>
              )}
            </>
          )}
        </Button>
      </div>
    </Card>
  );
}

interface CriticitaItemProps {
  criticita: CriticitaContinuativa;
  selected: boolean;
  onToggle: () => void;
  getTypeIcon: (tipo: string) => string;
}

function CriticitaItem({ criticita, selected, onToggle, getTypeIcon }: CriticitaItemProps) {
  return (
    <div
      className={cn(
        'flex items-start gap-2 p-2 rounded-md border cursor-pointer transition-colors',
        selected
          ? 'border-blue-500 bg-blue-50 dark:bg-blue-950/30'
          : 'border-transparent bg-muted/50 hover:bg-muted'
      )}
      onClick={onToggle}
    >
      <Checkbox checked={selected} className="mt-0.5" />
      <div className="flex-1 min-w-0">
        <div className="flex items-center gap-1.5">
          <span className="text-sm">{getTypeIcon(criticita.tipo)}</span>
          <span className="text-xs font-medium truncate">{criticita.nome}</span>
        </div>
        <div className="flex items-center gap-2 mt-1 text-[10px] text-muted-foreground">
          <span className="flex items-center gap-1">
            <Calendar className="h-3 w-3" />
            {giorniShort[criticita.giorno_settimana]}
          </span>
          {criticita.ora_inizio && (
            <span className="flex items-center gap-1">
              <Clock className="h-3 w-3" />
              {criticita.ora_inizio}
              {criticita.ora_fine && `-${criticita.ora_fine}`}
            </span>
          )}
          {criticita.staff_extra > 0 && (
            <span className="flex items-center gap-1">
              <Users className="h-3 w-3" />+{criticita.staff_extra}
            </span>
          )}
        </div>
      </div>
    </div>
  );
}

interface SporadicItemProps {
  criticita: SporadicCriticita;
  selected: boolean;
  onToggle: () => void;
  onRemove: () => void;
  getTypeIcon: (tipo: string) => string;
}

function SporadicItem({
  criticita,
  selected,
  onToggle,
  onRemove,
  getTypeIcon,
}: SporadicItemProps) {
  return (
    <div
      className={cn(
        'flex items-start gap-2 p-2 rounded-md border cursor-pointer transition-colors',
        selected
          ? 'border-orange-500 bg-orange-50 dark:bg-orange-950/30'
          : 'border-transparent bg-muted/50 hover:bg-muted'
      )}
      onClick={onToggle}
    >
      <Checkbox checked={selected} className="mt-0.5" />
      <div className="flex-1 min-w-0">
        <div className="flex items-center gap-1.5">
          <span className="text-sm">{getTypeIcon(criticita.tipo)}</span>
          <span className="text-xs font-medium truncate">{criticita.nome}</span>
        </div>
        <div className="flex items-center gap-2 mt-1 text-[10px] text-muted-foreground">
          <span className="flex items-center gap-1">
            <Calendar className="h-3 w-3" />
            {giorniShort[criticita.giorno_settimana]}
          </span>
          {criticita.ora_inizio && (
            <span className="flex items-center gap-1">
              <Clock className="h-3 w-3" />
              {criticita.ora_inizio}
              {criticita.ora_fine && `-${criticita.ora_fine}`}
            </span>
          )}
        </div>
      </div>
      <Button
        variant="ghost"
        size="icon"
        className="h-5 w-5 shrink-0 text-muted-foreground hover:text-destructive"
        onClick={(e) => {
          e.stopPropagation();
          onRemove();
        }}
      >
        ×
      </Button>
    </div>
  );
}
