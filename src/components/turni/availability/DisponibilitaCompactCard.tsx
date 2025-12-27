'use client';

import { useState, useMemo } from 'react';
import { Button } from '@/components/ui/button';
import { Badge } from '@/components/ui/badge';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import {
  Tooltip,
  TooltipContent,
  TooltipProvider,
  TooltipTrigger,
} from '@/components/ui/tooltip';
import {
  Users,
  Zap,
  Check,
  AlertCircle,
  Palmtree,
  Settings,
  RefreshCw,
} from 'lucide-react';
import {
  useRiposiSettimanali,
  useAssignAllRiposi,
  type RiposoConCollaboratore,
} from '@/hooks/use-riposi-settimanali';
import { useRichiesteSettimana } from '@/hooks/use-richieste-collaboratore';
import { cn } from '@/lib/utils';
import { DisponibilitaSheet } from './DisponibilitaSheet';

interface Collaboratore {
  id: string;
  nome: string;
  cognome: string;
  tipo_riposo?: 'giorni_interi' | 'mezze_giornate' | 'ore';
  riposi_settimanali_custom?: number;
  ore_riposo_settimanali?: number;
  attivo?: boolean;
}

interface DisponibilitaCompactCardProps {
  weekStart: string;
  weekEnd: string;
  collaboratori: Collaboratore[];
  criticitaContinuative?: Array<{ giorno_settimana: number; staff_extra?: number }>;
  turniSettimana?: Array<{ giorno: number; collaboratori_ids: string[] }>;
  onRiposiChange?: (riposi: RiposoConCollaboratore[]) => void;
}

function getExpectedRiposi(collab: Collaboratore): number {
  const tipo = collab.tipo_riposo || 'giorni_interi';
  if (tipo === 'ore') {
    const ore = collab.ore_riposo_settimanali ?? 8;
    return Math.ceil(ore / 4);
  }
  return collab.riposi_settimanali_custom ?? 2;
}

type CollaboratoreStatus = 'complete' | 'partial' | 'missing' | 'ferie';

export function DisponibilitaCompactCard({
  weekStart,
  weekEnd,
  collaboratori,
  criticitaContinuative = [],
  turniSettimana = [],
  onRiposiChange,
}: DisponibilitaCompactCardProps) {
  const [sheetOpen, setSheetOpen] = useState(false);
  const [isAssigningAll, setIsAssigningAll] = useState(false);

  const { data: riposi = [], isLoading: isLoadingRiposi } = useRiposiSettimanali(weekStart);
  const { richieste: richiesteSettimana, perCollaboratore: richiestePerCollab } = useRichiesteSettimana(weekStart, weekEnd);
  const assignAllRiposi = useAssignAllRiposi();

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

  const getStatus = (collab: Collaboratore): CollaboratoreStatus => {
    if (isInFerieIntere(collab.id)) return 'ferie';

    const expected = getExpectedRiposi(collab);
    const assigned = riposiPerCollab[collab.id]?.length || 0;

    if (assigned >= expected) return 'complete';
    if (assigned > 0) return 'partial';
    return 'missing';
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

  const needsAssignment = stats.missing + stats.partial > 0;

  return (
    <TooltipProvider>
      <Card className="flex-shrink-0">
        <CardHeader className="py-3 px-4">
          <div className="flex items-center justify-between">
            <CardTitle className="text-sm flex items-center gap-2">
              <Users className="h-4 w-4 text-primary" />
              Disponibilità
            </CardTitle>
            <Button
              variant="ghost"
              size="sm"
              className="h-7 px-2 text-xs"
              onClick={() => setSheetOpen(true)}
            >
              <Settings className="h-3.5 w-3.5 mr-1" />
              Gestisci
            </Button>
          </div>
        </CardHeader>
        <CardContent className="pt-0 pb-3 px-4 space-y-2">
          {/* Stats badges */}
          {isLoadingRiposi ? (
            <div className="flex items-center gap-2 text-xs text-muted-foreground">
              <RefreshCw className="h-3 w-3 animate-spin" />
              Caricamento...
            </div>
          ) : (
            <>
              <div className="flex items-center gap-1.5 flex-wrap">
                <Tooltip>
                  <TooltipTrigger asChild>
                    <Badge variant="outline" className="text-xs gap-1 px-2 py-0.5">
                      <Users className="h-3 w-3" />
                      {stats.total}
                    </Badge>
                  </TooltipTrigger>
                  <TooltipContent>Totale collaboratori</TooltipContent>
                </Tooltip>

                {stats.complete > 0 && (
                  <Tooltip>
                    <TooltipTrigger asChild>
                      <Badge className="text-xs bg-green-600 gap-1 px-2 py-0.5">
                        <Check className="h-3 w-3" />
                        {stats.complete}
                      </Badge>
                    </TooltipTrigger>
                    <TooltipContent>Riposi completi</TooltipContent>
                  </Tooltip>
                )}

                {stats.partial > 0 && (
                  <Tooltip>
                    <TooltipTrigger asChild>
                      <Badge variant="secondary" className="text-xs bg-yellow-100 text-yellow-800 gap-1 px-2 py-0.5">
                        <AlertCircle className="h-3 w-3" />
                        {stats.partial}
                      </Badge>
                    </TooltipTrigger>
                    <TooltipContent>Riposi parziali</TooltipContent>
                  </Tooltip>
                )}

                {stats.missing > 0 && (
                  <Tooltip>
                    <TooltipTrigger asChild>
                      <Badge variant="outline" className="text-xs border-orange-400 text-orange-600 gap-1 px-2 py-0.5">
                        <AlertCircle className="h-3 w-3" />
                        {stats.missing}
                      </Badge>
                    </TooltipTrigger>
                    <TooltipContent>Senza riposi</TooltipContent>
                  </Tooltip>
                )}

                {stats.ferie > 0 && (
                  <Tooltip>
                    <TooltipTrigger asChild>
                      <Badge variant="secondary" className="text-xs bg-blue-100 text-blue-800 gap-1 px-2 py-0.5">
                        <Palmtree className="h-3 w-3" />
                        {stats.ferie}
                      </Badge>
                    </TooltipTrigger>
                    <TooltipContent>In ferie</TooltipContent>
                  </Tooltip>
                )}
              </div>

              {/* Quick action button */}
              {needsAssignment && (
                <Button
                  size="sm"
                  onClick={handleAssignAll}
                  disabled={isAssigningAll}
                  className="w-full gap-1.5 h-7 text-xs"
                  variant="outline"
                >
                  {isAssigningAll ? (
                    <RefreshCw className="h-3 w-3 animate-spin" />
                  ) : (
                    <Zap className="h-3 w-3" />
                  )}
                  {isAssigningAll ? 'Assegnando...' : 'Assegna Tutti'}
                </Button>
              )}
            </>
          )}
        </CardContent>
      </Card>

      <DisponibilitaSheet
        open={sheetOpen}
        onOpenChange={setSheetOpen}
        weekStart={weekStart}
        weekEnd={weekEnd}
        collaboratori={collaboratori}
        criticitaContinuative={criticitaContinuative}
        turniSettimana={turniSettimana}
        onRiposiChange={onRiposiChange}
      />
    </TooltipProvider>
  );
}
