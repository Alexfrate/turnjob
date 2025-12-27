'use client';

import { useState, useMemo } from 'react';
import { Button } from '@/components/ui/button';
import { Badge } from '@/components/ui/badge';
import { ScrollArea } from '@/components/ui/scroll-area';
import {
  Popover,
  PopoverContent,
  PopoverTrigger,
} from '@/components/ui/popover';
import {
  Tooltip,
  TooltipContent,
  TooltipProvider,
  TooltipTrigger,
} from '@/components/ui/tooltip';
import {
  AlertDialog,
  AlertDialogAction,
  AlertDialogCancel,
  AlertDialogContent,
  AlertDialogDescription,
  AlertDialogFooter,
  AlertDialogHeader,
  AlertDialogTitle,
} from '@/components/ui/alert-dialog';
import {
  Sheet,
  SheetContent,
  SheetDescription,
  SheetHeader,
  SheetTitle,
} from '@/components/ui/sheet';
import {
  Users,
  Zap,
  Check,
  AlertCircle,
  Palmtree,
  Moon,
  Trash2,
  X,
  RefreshCw,
  Sun,
  Sunrise,
  Sunset,
  Clock,
} from 'lucide-react';
import {
  useRiposiSettimanali,
  useCreateRiposo,
  useDeleteRiposo,
  useResetRiposiSettimana,
  useAssignAllRiposi,
  type RiposoConCollaboratore,
} from '@/hooks/use-riposi-settimanali';
import { useRichiesteSettimana } from '@/hooks/use-richieste-collaboratore';
import { useAzienda } from '@/hooks/use-azienda';
import { cn } from '@/lib/utils';
import type { OrarioApertura, OrarioVariabile } from '@/types/database';

const GIORNI = ['L', 'M', 'M', 'G', 'V', 'S', 'D'];
const GIORNI_FULL = ['Lunedì', 'Martedì', 'Mercoledì', 'Giovedì', 'Venerdì', 'Sabato', 'Domenica'];
const GIORNI_KEY = ['lun', 'mar', 'mer', 'gio', 'ven', 'sab', 'dom'] as const;

type TipoRiposo = 'intero' | 'mezza_mattina' | 'mezza_pomeriggio';

const TIPO_RIPOSO_OPTIONS: { value: TipoRiposo; label: string; icon: React.ReactNode }[] = [
  { value: 'intero', label: 'Giorno intero', icon: <Sun className="h-4 w-4" /> },
  { value: 'mezza_mattina', label: 'Mattina', icon: <Sunrise className="h-4 w-4" /> },
  { value: 'mezza_pomeriggio', label: 'Pomeriggio', icon: <Sunset className="h-4 w-4" /> },
];

interface Collaboratore {
  id: string;
  nome: string;
  cognome: string;
  tipo_riposo?: 'giorni_interi' | 'mezze_giornate' | 'ore';
  riposi_settimanali_custom?: number;
  ore_riposo_settimanali?: number;
  attivo?: boolean;
}

interface DisponibilitaSheetProps {
  open: boolean;
  onOpenChange: (open: boolean) => void;
  weekStart: string;
  weekEnd: string;
  collaboratori: Collaboratore[];
  criticitaContinuative?: Array<{ giorno_settimana: number; staff_extra?: number }>;
  turniSettimana?: Array<{ giorno: number; collaboratori_ids: string[] }>;
  onRiposiChange?: (riposi: RiposoConCollaboratore[]) => void;
}

// Compute the expected number of rest slots
function getExpectedRiposi(collab: Collaboratore): number {
  const tipo = collab.tipo_riposo || 'giorni_interi';
  if (tipo === 'ore') {
    const ore = collab.ore_riposo_settimanali ?? 8;
    return Math.ceil(ore / 4);
  }
  return collab.riposi_settimanali_custom ?? 2;
}

type CollaboratoreStatus = 'complete' | 'partial' | 'missing' | 'ferie';

function getClosedDays(orarioApertura?: OrarioApertura): number[] {
  if (!orarioApertura) return [];
  if (orarioApertura.tipo === 'fisso') return [];

  const variabile = orarioApertura as OrarioVariabile;
  const closedDays: number[] = [];

  GIORNI_KEY.forEach((key, index) => {
    const giorno = variabile[key];
    if (giorno?.chiuso) {
      closedDays.push(index + 1);
    }
  });

  return closedDays;
}

function isHoliday(date: Date): { isHoliday: boolean; name?: string } {
  const month = date.getMonth() + 1;
  const day = date.getDate();

  const holidays: Record<string, string> = {
    '1-1': 'Capodanno',
    '1-6': 'Epifania',
    '4-25': 'Liberazione',
    '5-1': 'Festa del Lavoro',
    '6-2': 'Repubblica',
    '8-15': 'Ferragosto',
    '11-1': 'Ognissanti',
    '12-8': 'Immacolata',
    '12-25': 'Natale',
    '12-26': 'Santo Stefano',
  };

  const key = `${month}-${day}`;
  if (holidays[key]) {
    return { isHoliday: true, name: holidays[key] };
  }

  return { isHoliday: false };
}

export function DisponibilitaSheet({
  open,
  onOpenChange,
  weekStart,
  weekEnd,
  collaboratori,
  criticitaContinuative = [],
  turniSettimana = [],
  onRiposiChange,
}: DisponibilitaSheetProps) {
  const [showResetDialog, setShowResetDialog] = useState(false);
  const [isAssigningAll, setIsAssigningAll] = useState(false);

  const { azienda } = useAzienda();

  const { data: riposi = [], isLoading: isLoadingRiposi } = useRiposiSettimanali(weekStart);
  const { richieste: richiesteSettimana, perCollaboratore: richiestePerCollab } = useRichiesteSettimana(weekStart, weekEnd);

  const createRiposo = useCreateRiposo();
  const deleteRiposo = useDeleteRiposo();
  const resetRiposi = useResetRiposiSettimana();
  const assignAllRiposi = useAssignAllRiposi();

  const closedDays = useMemo(() => {
    return getClosedDays(azienda?.orario_apertura);
  }, [azienda?.orario_apertura]);

  const weekHolidays = useMemo(() => {
    const holidays: Record<number, string> = {};
    const startDate = new Date(weekStart);

    for (let i = 0; i < 7; i++) {
      const date = new Date(startDate);
      date.setDate(startDate.getDate() + i);
      const holiday = isHoliday(date);
      if (holiday.isHoliday && holiday.name) {
        holidays[i + 1] = holiday.name;
      }
    }

    return holidays;
  }, [weekStart]);

  const riposiPerCollab = useMemo(() => {
    return riposi.reduce((acc, r) => {
      if (!acc[r.collaboratore_id]) acc[r.collaboratore_id] = [];
      acc[r.collaboratore_id].push(r);
      return acc;
    }, {} as Record<string, RiposoConCollaboratore[]>);
  }, [riposi]);

  const isInFerieIntere = (collabId: string): boolean => {
    const richieste = richiestePerCollab[collabId] || [];
    if (richieste.length === 0) return false;

    const weekStartDate = new Date(weekStart);
    const weekEndDate = new Date(weekEnd);

    return richieste.some(r => {
      const rStart = new Date(r.data_inizio);
      const rEnd = new Date(r.data_fine);
      return rStart <= weekStartDate && rEnd >= weekEndDate;
    });
  };

  const getFerieDays = (collabId: string): number[] => {
    const richieste = richiestePerCollab[collabId] || [];
    const days: number[] = [];

    richieste.forEach(r => {
      const rStart = new Date(r.data_inizio);
      const rEnd = new Date(r.data_fine);
      const weekStartDate = new Date(weekStart);

      for (let i = 0; i < 7; i++) {
        const currentDay = new Date(weekStartDate);
        currentDay.setDate(currentDay.getDate() + i);
        if (currentDay >= rStart && currentDay <= rEnd) {
          days.push(i + 1);
        }
      }
    });

    return days;
  };

  const getStatus = (collab: Collaboratore): CollaboratoreStatus => {
    if (isInFerieIntere(collab.id)) return 'ferie';

    const expected = getExpectedRiposi(collab);
    const assigned = riposiPerCollab[collab.id]?.length || 0;

    if (assigned >= expected) return 'complete';
    if (assigned > 0) return 'partial';
    return 'missing';
  };

  const getRiposiDays = (collabId: string): number[] => {
    return (riposiPerCollab[collabId] || []).map(r => r.giorno_settimana);
  };

  const activeCollabs = useMemo(() => {
    return collaboratori.filter(c => c.attivo !== false);
  }, [collaboratori]);

  const stats = useMemo(() => {
    const s = {
      total: activeCollabs.length,
      complete: 0,
      partial: 0,
      missing: 0,
      ferie: 0,
    };
    activeCollabs.forEach(c => {
      const status = getStatus(c);
      s[status]++;
    });
    return s;
  }, [activeCollabs, riposiPerCollab, richiestePerCollab]);

  const handleDeleteRiposo = async (riposoId: string) => {
    try {
      await deleteRiposo.mutateAsync({ id: riposoId, weekStart });
    } catch (error) {
      console.error('Error deleting riposo:', error);
    }
  };

  const handleResetAll = async () => {
    try {
      await resetRiposi.mutateAsync(weekStart);
      setShowResetDialog(false);
    } catch (error) {
      console.error('Error resetting riposi:', error);
    }
  };

  const handleAssignAll = async () => {
    setIsAssigningAll(true);
    try {
      await assignAllRiposi.mutateAsync({
        weekStart,
        existingRiposi: riposi,
        criticitaContinuative,
        turniSettimana,
        collaboratori: activeCollabs,
        richiesteApprovate: richiesteSettimana.map(r => ({
          collaboratore_id: r.collaboratore_id,
          data_inizio: r.data_inizio,
          data_fine: r.data_fine,
          tipo: r.tipo as 'ferie' | 'permesso',
        })),
      });
    } catch (error) {
      console.error('Error assigning all riposi:', error);
    } finally {
      setIsAssigningAll(false);
    }
  };

  const handleQuickAddRiposo = (collabId: string, day: number, tipoRiposo: TipoRiposo) => {
    createRiposo.mutate({
      collaboratore_id: collabId,
      settimana_inizio: weekStart,
      giorno_settimana: day,
      tipo_riposo: tipoRiposo,
      fonte: 'MANUAL',
    });
  };

  const DaySelector = ({
    collabId,
    day,
    isClosed,
    onSelect
  }: {
    collabId: string;
    day: number;
    isClosed?: boolean;
    onSelect: (tipo: TipoRiposo) => void;
  }) => {
    const [popoverOpen, setPopoverOpen] = useState(false);

    return (
      <Popover open={popoverOpen} onOpenChange={setPopoverOpen} modal={false}>
        <PopoverTrigger asChild>
          <button
            className={cn(
              "w-9 h-8 text-xs font-medium rounded flex items-center justify-center transition-colors",
              isClosed
                ? "bg-orange-100 text-orange-600 hover:bg-orange-200 dark:bg-orange-900/30 dark:text-orange-400 dark:hover:bg-orange-900/50 border border-dashed border-orange-300 dark:border-orange-700"
                : "bg-green-100 text-green-700 hover:bg-green-200 dark:bg-green-900/30 dark:text-green-400 dark:hover:bg-green-900/50"
            )}
          >
            {GIORNI[day - 1]}
          </button>
        </PopoverTrigger>
        <PopoverContent className="w-44 p-2 bg-zinc-800 dark:bg-zinc-800 border border-zinc-700 shadow-xl rounded-lg" align="center">
          <div className="space-y-1">
            <p className="text-xs text-zinc-400 mb-2 font-medium">
              {GIORNI_FULL[day - 1]}
              {isClosed && <span className="ml-1 text-orange-400">(Chiusura)</span>}
            </p>
            {TIPO_RIPOSO_OPTIONS.map((option) => (
              <button
                key={option.value}
                onClick={() => {
                  onSelect(option.value);
                  setPopoverOpen(false);
                }}
                className="w-full flex items-center gap-2 px-2 py-1.5 text-sm text-zinc-100 rounded hover:bg-zinc-700 transition-colors"
              >
                {option.icon}
                {option.label}
              </button>
            ))}
          </div>
        </PopoverContent>
      </Popover>
    );
  };

  const CollaboratorRow = ({ collab }: { collab: Collaboratore }) => {
    const status = getStatus(collab);
    const riposiDays = getRiposiDays(collab.id);
    const ferieDays = getFerieDays(collab.id);
    const expected = getExpectedRiposi(collab);
    const collabRiposi = riposiPerCollab[collab.id] || [];
    const assigned = collabRiposi.length;

    const statusColors = {
      complete: 'border-l-green-500 bg-green-50/50 dark:bg-green-950/20',
      partial: 'border-l-yellow-500 bg-yellow-50/50 dark:bg-yellow-950/20',
      missing: 'border-l-orange-500 bg-orange-50/50 dark:bg-orange-950/20',
      ferie: 'border-l-blue-500 bg-blue-50/50 dark:bg-blue-950/20',
    };

    const statusIcons = {
      complete: <Check className="h-3.5 w-3.5 text-green-600" />,
      partial: <AlertCircle className="h-3.5 w-3.5 text-yellow-600" />,
      missing: <AlertCircle className="h-3.5 w-3.5 text-orange-600" />,
      ferie: <Palmtree className="h-3.5 w-3.5 text-blue-600" />,
    };

    const getTipoRiposoIcon = (tipo: string) => {
      switch (tipo) {
        case 'mezza_mattina': return <Sunrise className="h-3 w-3" />;
        case 'mezza_pomeriggio': return <Sunset className="h-3 w-3" />;
        default: return <Moon className="h-3 w-3" />;
      }
    };

    return (
      <div
        className={cn(
          'p-3 rounded-lg border-l-4 transition-all',
          statusColors[status]
        )}
      >
        <div className="flex items-center justify-between mb-2">
          <div className="flex items-center gap-2 min-w-0 flex-1">
            {statusIcons[status]}
            <span className="font-medium text-sm truncate">
              {collab.nome} {collab.cognome}
            </span>
          </div>
          {status !== 'ferie' && (
            <Badge
              variant={status === 'complete' ? 'default' : 'outline'}
              className={cn(
                'text-xs shrink-0 ml-2',
                status === 'complete' && 'bg-green-600',
                status === 'partial' && 'border-yellow-500 text-yellow-700',
                status === 'missing' && 'border-orange-500 text-orange-700'
              )}
            >
              {assigned}/{expected}
            </Badge>
          )}
          {status === 'ferie' && (
            <Badge variant="secondary" className="text-xs bg-blue-100 text-blue-700 shrink-0 ml-2">
              Ferie
            </Badge>
          )}
        </div>

        <div className="flex gap-1 flex-wrap">
          {[1, 2, 3, 4, 5, 6, 7].map((day) => {
            const isRiposo = riposiDays.includes(day);
            const isFerie = ferieDays.includes(day);
            const isClosed = closedDays.includes(day);
            const riposo = collabRiposi.find(r => r.giorno_settimana === day);
            const holidayName = weekHolidays[day];

            if (holidayName) {
              return (
                <Tooltip key={day}>
                  <TooltipTrigger asChild>
                    <div className="w-9 h-8 text-xs font-medium rounded bg-red-100 text-red-700 dark:bg-red-900/50 dark:text-red-300 flex items-center justify-center border border-red-200">
                      {GIORNI[day - 1]}
                    </div>
                  </TooltipTrigger>
                  <TooltipContent side="top">
                    <p className="font-medium">{holidayName}</p>
                    <p className="text-xs text-muted-foreground">Festivo</p>
                  </TooltipContent>
                </Tooltip>
              );
            }

            if (isFerie) {
              return (
                <Tooltip key={day}>
                  <TooltipTrigger asChild>
                    <div className="w-9 h-8 text-xs font-medium rounded bg-blue-200 text-blue-700 flex items-center justify-center">
                      <Palmtree className="h-3.5 w-3.5" />
                    </div>
                  </TooltipTrigger>
                  <TooltipContent side="top">
                    <p>{GIORNI_FULL[day - 1]} - Ferie</p>
                  </TooltipContent>
                </Tooltip>
              );
            }

            if (isRiposo) {
              return (
                <Tooltip key={day}>
                  <TooltipTrigger asChild>
                    <button
                      onClick={() => riposo && handleDeleteRiposo(riposo.id)}
                      className="w-9 h-8 text-xs font-medium rounded bg-gray-300 text-gray-700 dark:bg-gray-600 dark:text-gray-200 flex items-center justify-center hover:bg-red-200 hover:text-red-700 transition-colors group"
                    >
                      <span className="group-hover:hidden flex items-center justify-center">
                        {getTipoRiposoIcon(riposo?.tipo_riposo || 'intero')}
                      </span>
                      <X className="h-3.5 w-3.5 hidden group-hover:block" />
                    </button>
                  </TooltipTrigger>
                  <TooltipContent side="top">
                    <p className="font-medium">{GIORNI_FULL[day - 1]}</p>
                    <p className="text-xs">
                      {riposo?.tipo_riposo === 'mezza_mattina' && 'Riposo mattina'}
                      {riposo?.tipo_riposo === 'mezza_pomeriggio' && 'Riposo pomeriggio'}
                      {riposo?.tipo_riposo === 'intero' && 'Riposo giorno intero'}
                    </p>
                    <p className="text-xs text-muted-foreground">Clicca per rimuovere</p>
                  </TooltipContent>
                </Tooltip>
              );
            }

            return (
              <DaySelector
                key={day}
                collabId={collab.id}
                day={day}
                isClosed={isClosed}
                onSelect={(tipo) => handleQuickAddRiposo(collab.id, day, tipo)}
              />
            );
          })}
        </div>
      </div>
    );
  };

  return (
    <TooltipProvider>
      <Sheet open={open} onOpenChange={onOpenChange}>
        <SheetContent side="right" className="w-[400px] sm:w-[540px] flex flex-col">
          <SheetHeader>
            <SheetTitle className="flex items-center gap-2">
              <Users className="h-5 w-5 text-primary" />
              Disponibilità
            </SheetTitle>
            <SheetDescription>
              Gestisci i riposi settimanali dei collaboratori
            </SheetDescription>
          </SheetHeader>

          {/* Stats bar */}
          <div className="flex items-center gap-1.5 mt-4 flex-wrap">
            <Badge variant="outline" className="text-xs gap-1 px-2 py-0.5">
              <Users className="h-3 w-3" />
              {stats.total}
            </Badge>
            {stats.complete > 0 && (
              <Badge className="text-xs bg-green-600 gap-1 px-2 py-0.5">
                <Check className="h-3 w-3" />
                {stats.complete}
              </Badge>
            )}
            {stats.partial > 0 && (
              <Badge variant="secondary" className="text-xs bg-yellow-100 text-yellow-800 gap-1 px-2 py-0.5">
                {stats.partial}
              </Badge>
            )}
            {stats.missing > 0 && (
              <Badge variant="outline" className="text-xs border-orange-400 text-orange-600 gap-1 px-2 py-0.5">
                {stats.missing}
              </Badge>
            )}
            {stats.ferie > 0 && (
              <Badge variant="secondary" className="text-xs bg-blue-100 text-blue-800 gap-1 px-2 py-0.5">
                <Palmtree className="h-3 w-3" />
                {stats.ferie}
              </Badge>
            )}
          </div>

          {/* Legend for closed days */}
          {closedDays.length > 0 && (
            <div className="flex items-center gap-1 mt-2 text-xs text-muted-foreground">
              <Clock className="h-3 w-3" />
              Chiusura: {closedDays.map(d => GIORNI_FULL[d-1]).join(', ')}
            </div>
          )}

          {/* Action buttons */}
          <div className="flex gap-2 mt-3">
            {stats.missing + stats.partial > 0 && (
              <Button
                size="sm"
                onClick={handleAssignAll}
                disabled={isAssigningAll}
                className="flex-1 gap-1.5 h-8"
              >
                {isAssigningAll ? (
                  <RefreshCw className="h-3.5 w-3.5 animate-spin" />
                ) : (
                  <Zap className="h-3.5 w-3.5" />
                )}
                {isAssigningAll ? 'Assegnando...' : 'Assegna Tutti'}
              </Button>
            )}
            {riposi.length > 0 && (
              <Tooltip>
                <TooltipTrigger asChild>
                  <Button
                    size="sm"
                    variant="outline"
                    onClick={() => setShowResetDialog(true)}
                    className="h-8 px-2"
                  >
                    <Trash2 className="h-3.5 w-3.5" />
                  </Button>
                </TooltipTrigger>
                <TooltipContent>Reset riposi</TooltipContent>
              </Tooltip>
            )}
          </div>

          {/* Content */}
          <div className="flex-1 overflow-hidden flex flex-col mt-4">
            {isLoadingRiposi ? (
              <div className="flex items-center justify-center py-6 text-muted-foreground text-sm gap-2">
                <RefreshCw className="h-4 w-4 animate-spin" />
                Caricamento...
              </div>
            ) : activeCollabs.length === 0 ? (
              <div className="text-center py-6 text-muted-foreground text-sm">
                Nessun collaboratore attivo
              </div>
            ) : (
              <ScrollArea className="flex-1">
                <div className="space-y-2 pr-4">
                  {activeCollabs.map((collab) => (
                    <CollaboratorRow key={collab.id} collab={collab} />
                  ))}
                </div>
              </ScrollArea>
            )}
          </div>
        </SheetContent>
      </Sheet>

      {/* Reset Dialog */}
      <AlertDialog open={showResetDialog} onOpenChange={setShowResetDialog}>
        <AlertDialogContent>
          <AlertDialogHeader>
            <AlertDialogTitle>Reset tutti i riposi</AlertDialogTitle>
            <AlertDialogDescription>
              Sei sicuro di voler eliminare tutti i {riposi.length} riposi assegnati per questa settimana?
              Questa azione non può essere annullata.
            </AlertDialogDescription>
          </AlertDialogHeader>
          <AlertDialogFooter>
            <AlertDialogCancel>Annulla</AlertDialogCancel>
            <AlertDialogAction
              onClick={handleResetAll}
              className="bg-destructive hover:bg-destructive/90"
            >
              Elimina tutti
            </AlertDialogAction>
          </AlertDialogFooter>
        </AlertDialogContent>
      </AlertDialog>
    </TooltipProvider>
  );
}
