'use client';

import React, { useState, useMemo } from 'react';
import { Button } from '@/components/ui/button';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Badge } from '@/components/ui/badge';
import {
  Calendar,
  Users,
  AlertTriangle,
  CheckCircle,
  Clock,
  RefreshCw,
  Save,
  ChevronDown,
  ChevronUp,
  User,
  Info,
} from 'lucide-react';
import type { WeekGenerationResult, GeneratedShift, CollaboratoreSuggerito } from '@/lib/ai/shift-generation';

interface ShiftReviewPanelProps {
  result: WeekGenerationResult;
  onSaveAll: (turni: GeneratedShift[]) => void;
  onRegenerate: () => void;
  onModifyShift?: (shift: GeneratedShift, updates: Partial<GeneratedShift>) => void;
  isSaving?: boolean;
}

// Giorni della settimana
const GIORNI = ['', 'Lun', 'Mar', 'Mer', 'Gio', 'Ven', 'Sab', 'Dom'];

export function ShiftReviewPanel({
  result,
  onSaveAll,
  onRegenerate,
  onModifyShift,
  isSaving = false,
}: ShiftReviewPanelProps) {
  const [viewMode, setViewMode] = useState<'timeline' | 'nucleo'>('timeline');
  const [expandedDays, setExpandedDays] = useState<Set<string>>(new Set());
  const [selectedShifts, setSelectedShifts] = useState<Set<string>>(new Set());

  // Raggruppa turni per data o nucleo
  const groupedShifts = useMemo(() => {
    if (viewMode === 'timeline') {
      const grouped = new Map<string, GeneratedShift[]>();
      for (const shift of result.turni) {
        const existing = grouped.get(shift.data) || [];
        existing.push(shift);
        grouped.set(shift.data, existing);
      }
      return grouped;
    } else {
      const grouped = new Map<string, GeneratedShift[]>();
      for (const shift of result.turni) {
        const existing = grouped.get(shift.nucleo_nome) || [];
        existing.push(shift);
        grouped.set(shift.nucleo_nome, existing);
      }
      return grouped;
    }
  }, [result.turni, viewMode]);

  const toggleDay = (key: string) => {
    const newExpanded = new Set(expandedDays);
    if (newExpanded.has(key)) {
      newExpanded.delete(key);
    } else {
      newExpanded.add(key);
    }
    setExpandedDays(newExpanded);
  };

  const formatDate = (dateStr: string) => {
    const date = new Date(dateStr);
    const dayOfWeek = date.getDay();
    const dayIT = dayOfWeek === 0 ? 7 : dayOfWeek;
    return `${GIORNI[dayIT]} ${date.getDate()}/${date.getMonth() + 1}`;
  };

  const getCoverageColor = (status: 'ok' | 'parziale' | 'scoperta') => {
    switch (status) {
      case 'ok':
        return 'bg-green-100 text-green-800 dark:bg-green-900/30 dark:text-green-300';
      case 'parziale':
        return 'bg-yellow-100 text-yellow-800 dark:bg-yellow-900/30 dark:text-yellow-300';
      case 'scoperta':
        return 'bg-red-100 text-red-800 dark:bg-red-900/30 dark:text-red-300';
    }
  };

  const handleSaveAll = () => {
    onSaveAll(result.turni);
  };

  return (
    <div className="space-y-4">
      {/* Header Stats */}
      <Card>
        <CardHeader className="pb-3">
          <div className="flex items-center justify-between">
            <CardTitle className="text-lg flex items-center gap-2">
              <Calendar className="h-5 w-5" />
              Riepilogo Generazione
            </CardTitle>
            <div className="flex items-center gap-2">
              <Badge variant="outline" className="text-xs">
                Confidence: {(result.confidence_average * 100).toFixed(0)}%
              </Badge>
            </div>
          </div>
        </CardHeader>
        <CardContent>
          <div className="grid grid-cols-2 sm:grid-cols-4 gap-4">
            {/* Turni generati */}
            <div className="text-center p-3 rounded-lg bg-muted/50">
              <div className="text-2xl font-bold">{result.coverage_stats.totale_turni}</div>
              <div className="text-xs text-muted-foreground">Turni generati</div>
            </div>

            {/* Copertura OK */}
            <div className="text-center p-3 rounded-lg bg-green-100 dark:bg-green-900/20">
              <div className="text-2xl font-bold text-green-700 dark:text-green-300">
                {result.coverage_stats.turni_coperti}
              </div>
              <div className="text-xs text-green-600 dark:text-green-400">Copertura OK</div>
            </div>

            {/* Parziali */}
            <div className="text-center p-3 rounded-lg bg-yellow-100 dark:bg-yellow-900/20">
              <div className="text-2xl font-bold text-yellow-700 dark:text-yellow-300">
                {result.coverage_stats.turni_parziali}
              </div>
              <div className="text-xs text-yellow-600 dark:text-yellow-400">Parziali</div>
            </div>

            {/* Scoperti */}
            <div className="text-center p-3 rounded-lg bg-red-100 dark:bg-red-900/20">
              <div className="text-2xl font-bold text-red-700 dark:text-red-300">
                {result.coverage_stats.turni_scoperti}
              </div>
              <div className="text-xs text-red-600 dark:text-red-400">Scoperti</div>
            </div>
          </div>

          {/* Equita Score */}
          <div className="mt-4 flex items-center justify-between text-sm">
            <span className="text-muted-foreground">Distribuzione carico di lavoro:</span>
            <div className="flex items-center gap-2">
              <div className="w-32 h-2 bg-muted rounded-full overflow-hidden">
                <div
                  className="h-full bg-primary rounded-full transition-all"
                  style={{ width: `${result.workload_distribution.equita_score * 100}%` }}
                />
              </div>
              <span className="font-medium">
                {(result.workload_distribution.equita_score * 100).toFixed(0)}% equa
              </span>
            </div>
          </div>
        </CardContent>
      </Card>

      {/* Warnings */}
      {result.warnings.length > 0 && (
        <Card className="border-yellow-200 dark:border-yellow-800">
          <CardHeader className="pb-2">
            <CardTitle className="text-sm flex items-center gap-2 text-yellow-700 dark:text-yellow-300">
              <AlertTriangle className="h-4 w-4" />
              Avvisi ({result.warnings.length})
            </CardTitle>
          </CardHeader>
          <CardContent>
            <div className="space-y-2 max-h-40 overflow-y-auto">
              {result.warnings.map((warning, idx) => (
                <div
                  key={idx}
                  className={`text-xs p-2 rounded ${
                    warning.severita === 'error'
                      ? 'bg-red-100 text-red-800 dark:bg-red-900/30 dark:text-red-300'
                      : warning.severita === 'warning'
                        ? 'bg-yellow-100 text-yellow-800 dark:bg-yellow-900/30 dark:text-yellow-300'
                        : 'bg-blue-100 text-blue-800 dark:bg-blue-900/30 dark:text-blue-300'
                  }`}
                >
                  {warning.messaggio}
                </div>
              ))}
            </div>
          </CardContent>
        </Card>
      )}

      {/* View Toggle */}
      <div className="flex items-center justify-between">
        <div className="flex gap-2">
          <Button
            variant={viewMode === 'timeline' ? 'default' : 'outline'}
            size="sm"
            onClick={() => setViewMode('timeline')}
          >
            <Calendar className="h-4 w-4 mr-1" />
            Timeline
          </Button>
          <Button
            variant={viewMode === 'nucleo' ? 'default' : 'outline'}
            size="sm"
            onClick={() => setViewMode('nucleo')}
          >
            <Users className="h-4 w-4 mr-1" />
            Per Nucleo
          </Button>
        </div>
      </div>

      {/* Shifts List */}
      <div className="space-y-3">
        {Array.from(groupedShifts.entries()).map(([key, shifts]) => (
          <Card key={key}>
            <div
              className="p-3 flex items-center justify-between cursor-pointer hover:bg-muted/50 transition-colors"
              onClick={() => toggleDay(key)}
            >
              <div className="flex items-center gap-3">
                <span className="font-medium">
                  {viewMode === 'timeline' ? formatDate(key) : key}
                </span>
                <div className="flex gap-1">
                  {shifts.map((shift, idx) => (
                    <div
                      key={idx}
                      className={`w-2 h-2 rounded-full ${
                        shift.copertura_status === 'ok'
                          ? 'bg-green-500'
                          : shift.copertura_status === 'parziale'
                            ? 'bg-yellow-500'
                            : 'bg-red-500'
                      }`}
                    />
                  ))}
                </div>
              </div>
              <div className="flex items-center gap-2">
                <span className="text-sm text-muted-foreground">{shifts.length} turni</span>
                {expandedDays.has(key) ? (
                  <ChevronUp className="h-4 w-4" />
                ) : (
                  <ChevronDown className="h-4 w-4" />
                )}
              </div>
            </div>

            {expandedDays.has(key) && (
              <CardContent className="pt-0 border-t">
                <div className="space-y-3 mt-3">
                  {shifts.map((shift, idx) => (
                    <ShiftCard key={idx} shift={shift} viewMode={viewMode} />
                  ))}
                </div>
              </CardContent>
            )}
          </Card>
        ))}
      </div>

      {/* Actions */}
      <div className="flex justify-end gap-3 pt-4 border-t">
        <Button variant="outline" onClick={onRegenerate} disabled={isSaving}>
          <RefreshCw className="h-4 w-4 mr-2" />
          Rigenera
        </Button>
        <Button onClick={handleSaveAll} disabled={isSaving}>
          {isSaving ? (
            <>
              <RefreshCw className="h-4 w-4 mr-2 animate-spin" />
              Salvataggio...
            </>
          ) : (
            <>
              <Save className="h-4 w-4 mr-2" />
              Salva Tutti ({result.turni.length} turni)
            </>
          )}
        </Button>
      </div>
    </div>
  );
}

// Componente singolo turno
function ShiftCard({
  shift,
  viewMode,
}: {
  shift: GeneratedShift;
  viewMode: 'timeline' | 'nucleo';
}) {
  const [showCollaboratori, setShowCollaboratori] = useState(false);

  const disponibili = shift.collaboratori_suggeriti.filter((c) => c.disponibile);
  const nonDisponibili = shift.collaboratori_suggeriti.filter((c) => !c.disponibile);

  return (
    <div
      className="p-3 rounded-lg border"
      style={{ borderLeftWidth: '4px', borderLeftColor: shift.nucleo_colore || '#3b82f6' }}
    >
      <div className="flex items-start justify-between">
        <div>
          <div className="flex items-center gap-2">
            {viewMode === 'timeline' && (
              <span className="font-medium">{shift.nucleo_nome}</span>
            )}
            {viewMode === 'nucleo' && (
              <span className="font-medium">
                {new Date(shift.data).getDate()}/{new Date(shift.data).getMonth() + 1}
              </span>
            )}
            <Badge className={getCoverageColor(shift.copertura_status)} variant="secondary">
              {shift.copertura_status === 'ok'
                ? 'OK'
                : shift.copertura_status === 'parziale'
                  ? 'Parziale'
                  : 'Scoperto'}
            </Badge>
          </div>
          <div className="text-sm text-muted-foreground mt-1 flex items-center gap-3">
            <span className="flex items-center gap-1">
              <Clock className="h-3 w-3" />
              {shift.ora_inizio} - {shift.ora_fine}
            </span>
            <span className="flex items-center gap-1">
              <Users className="h-3 w-3" />
              {disponibili.length}/{shift.num_collaboratori_richiesti} persone
            </span>
          </div>
        </div>
        <Button
          variant="ghost"
          size="sm"
          onClick={() => setShowCollaboratori(!showCollaboratori)}
        >
          <User className="h-4 w-4 mr-1" />
          {showCollaboratori ? 'Nascondi' : 'Mostra'}
        </Button>
      </div>

      {shift.warning && (
        <div className="mt-2 text-xs p-2 rounded bg-yellow-100 text-yellow-800 dark:bg-yellow-900/30 dark:text-yellow-300 flex items-start gap-1">
          <Info className="h-3 w-3 mt-0.5 shrink-0" />
          {shift.warning}
        </div>
      )}

      {showCollaboratori && (
        <div className="mt-3 space-y-2">
          {/* Disponibili */}
          {disponibili.length > 0 && (
            <div>
              <div className="text-xs font-medium text-muted-foreground mb-1">
                Disponibili ({disponibili.length})
              </div>
              <div className="flex flex-wrap gap-1">
                {disponibili.map((coll) => (
                  <CollaboratoreChip key={coll.id} collaboratore={coll} />
                ))}
              </div>
            </div>
          )}

          {/* Non disponibili */}
          {nonDisponibili.length > 0 && (
            <div>
              <div className="text-xs font-medium text-muted-foreground mb-1">
                Non disponibili ({nonDisponibili.length})
              </div>
              <div className="flex flex-wrap gap-1">
                {nonDisponibili.map((coll) => (
                  <CollaboratoreChip key={coll.id} collaboratore={coll} unavailable />
                ))}
              </div>
            </div>
          )}
        </div>
      )}
    </div>
  );
}

// Chip collaboratore
function CollaboratoreChip({
  collaboratore,
  unavailable = false,
}: {
  collaboratore: CollaboratoreSuggerito;
  unavailable?: boolean;
}) {
  return (
    <div
      className={`inline-flex items-center gap-1 px-2 py-1 rounded-full text-xs ${
        unavailable
          ? 'bg-gray-100 text-gray-500 dark:bg-gray-800 dark:text-gray-400'
          : collaboratore.preferenza === 'PREFERRED'
            ? 'bg-green-100 text-green-800 dark:bg-green-900/30 dark:text-green-300'
            : 'bg-blue-100 text-blue-800 dark:bg-blue-900/30 dark:text-blue-300'
      }`}
      title={
        collaboratore.motivo_non_disponibile ||
        `${collaboratore.ore_residue.toFixed(1)}h residue`
      }
    >
      {collaboratore.preferenza === 'PREFERRED' && (
        <CheckCircle className="h-3 w-3" />
      )}
      {collaboratore.spostabile_da && (
        <span className="text-yellow-600">*</span>
      )}
      {collaboratore.nome.split(' ')[0]}
    </div>
  );
}

function getCoverageColor(status: 'ok' | 'parziale' | 'scoperta') {
  switch (status) {
    case 'ok':
      return 'bg-green-100 text-green-800 dark:bg-green-900/30 dark:text-green-300';
    case 'parziale':
      return 'bg-yellow-100 text-yellow-800 dark:bg-yellow-900/30 dark:text-yellow-300';
    case 'scoperta':
      return 'bg-red-100 text-red-800 dark:bg-red-900/30 dark:text-red-300';
  }
}
