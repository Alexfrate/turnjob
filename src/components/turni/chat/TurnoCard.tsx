'use client';

import { useState } from 'react';
import { Clock, Users, Calendar, CheckCircle, RefreshCw, Sparkles, X, FileText } from 'lucide-react';
import { cn } from '@/lib/utils';
import { Badge } from '@/components/ui/badge';
import { Button } from '@/components/ui/button';
import type { ExtractedTurno } from '@/hooks/use-planning-chat';
import { useTranslations } from 'next-intl';

interface TurnoCardProps {
  turno: ExtractedTurno;
  onSave?: (turno: ExtractedTurno) => void;
  onDiscard?: (turno: ExtractedTurno) => void;
  isSaving?: boolean;
  isSelected?: boolean;
  onToggleSelect?: (turno: ExtractedTurno) => void;
  showActions?: boolean;
}

const giorni = ['Dom', 'Lun', 'Mar', 'Mer', 'Gio', 'Ven', 'Sab'];

function formatDate(dateStr: string): string {
  const date = new Date(dateStr + 'T12:00:00');
  const dayOfWeek = giorni[date.getDay()];
  const day = date.getDate();
  const month = date.toLocaleDateString('it-IT', { month: 'short' });
  return `${dayOfWeek} ${day} ${month}`;
}

export function TurnoCard({
  turno,
  onSave,
  onDiscard,
  isSaving,
  isSelected,
  onToggleSelect,
  showActions = true,
}: TurnoCardProps) {
  const t = useTranslations();

  return (
    <div
      className={cn(
        'border rounded-lg p-4 mt-3 transition-all',
        'border-indigo-200 bg-indigo-50 dark:border-indigo-800 dark:bg-indigo-950/30',
        isSelected && 'ring-2 ring-indigo-500',
        onToggleSelect && 'cursor-pointer hover:bg-indigo-100 dark:hover:bg-indigo-950/50'
      )}
      onClick={() => onToggleSelect?.(turno)}
    >
      {/* Header */}
      <div className="flex items-center justify-between mb-3">
        <div className="flex items-center gap-2">
          <Badge
            variant="outline"
            className="border-indigo-500 text-indigo-700 dark:text-indigo-400 gap-1"
          >
            <Sparkles className="h-3 w-3" />
            Turno AI
          </Badge>
          {turno.nucleo_colore && (
            <div
              className="w-3 h-3 rounded-full"
              style={{ backgroundColor: turno.nucleo_colore }}
            />
          )}
          <span className="font-medium">{turno.nucleo_nome}</span>
        </div>
        {turno.confidenza && (
          <span className="text-xs text-muted-foreground">
            Confidenza: {Math.round(turno.confidenza * 100)}%
          </span>
        )}
      </div>

      {/* Details */}
      <div className="space-y-2 text-sm">
        <div className="flex flex-wrap gap-4 text-muted-foreground">
          <span className="flex items-center gap-1">
            <Calendar className="h-4 w-4" />
            {formatDate(turno.data)}
          </span>
          <span className="flex items-center gap-1">
            <Clock className="h-4 w-4" />
            {turno.ora_inizio} - {turno.ora_fine}
          </span>
          <span className="flex items-center gap-1">
            <Users className="h-4 w-4" />
            {turno.num_collaboratori_richiesti} collaborator{turno.num_collaboratori_richiesti !== 1 ? 'i' : 'e'}
          </span>
        </div>

        {turno.note && (
          <div className="text-muted-foreground italic flex items-center gap-1">
            <FileText className="h-3.5 w-3.5 flex-shrink-0" />
            {turno.note}
          </div>
        )}

        {turno.collaboratori_suggeriti && turno.collaboratori_suggeriti.length > 0 && (
          <div className="flex items-center gap-2 flex-wrap">
            <span className="text-xs text-muted-foreground">Suggeriti:</span>
            {turno.collaboratori_suggeriti.map((nome, idx) => (
              <Badge key={idx} variant="secondary" className="text-xs">
                {nome}
              </Badge>
            ))}
          </div>
        )}
      </div>

      {/* Actions */}
      {showActions && (onSave || onDiscard) && (
        <div className="mt-4 pt-3 border-t border-indigo-200 dark:border-indigo-800 flex gap-2">
          {onSave && (
            <Button
              size="sm"
              variant="default"
              onClick={(e) => {
                e.stopPropagation();
                onSave(turno);
              }}
              disabled={isSaving}
              className="gap-2"
            >
              {isSaving ? (
                <>
                  <RefreshCw className="h-4 w-4 animate-spin" />
                  Salvataggio...
                </>
              ) : (
                <>
                  <CheckCircle className="h-4 w-4" />
                  Salva turno
                </>
              )}
            </Button>
          )}
          {onDiscard && (
            <Button
              size="sm"
              variant="ghost"
              onClick={(e) => {
                e.stopPropagation();
                onDiscard(turno);
              }}
              disabled={isSaving}
              className="gap-2 text-muted-foreground"
            >
              <X className="h-4 w-4" />
              Scarta
            </Button>
          )}
        </div>
      )}
    </div>
  );
}

// Component to display multiple turni with batch actions
interface TurniListProps {
  turni: ExtractedTurno[];
  onSaveSingle?: (turno: ExtractedTurno) => void;
  onSaveAll?: (turni: ExtractedTurno[]) => void;
  onDiscardSingle?: (turno: ExtractedTurno) => void;
  isSaving?: boolean;
}

export function TurniList({
  turni,
  onSaveSingle,
  onSaveAll,
  onDiscardSingle,
  isSaving,
}: TurniListProps) {
  const [selectedTurni, setSelectedTurni] = useState<Set<number>>(
    new Set(turni.map((_, idx) => idx))
  );

  const toggleSelect = (index: number) => {
    const newSelected = new Set(selectedTurni);
    if (newSelected.has(index)) {
      newSelected.delete(index);
    } else {
      newSelected.add(index);
    }
    setSelectedTurni(newSelected);
  };

  const selectAll = () => {
    setSelectedTurni(new Set(turni.map((_, idx) => idx)));
  };

  const deselectAll = () => {
    setSelectedTurni(new Set());
  };

  const handleSaveSelected = () => {
    const selected = turni.filter((_, idx) => selectedTurni.has(idx));
    if (onSaveAll && selected.length > 0) {
      onSaveAll(selected);
    }
  };

  if (turni.length === 0) return null;

  return (
    <div className="space-y-3">
      {/* Header with batch actions */}
      <div className="flex items-center justify-between bg-indigo-100 dark:bg-indigo-900/30 rounded-lg p-3">
        <div className="flex items-center gap-2">
          <Sparkles className="h-5 w-5 text-indigo-600" />
          <span className="font-medium">
            {turni.length} turni generati dall'AI
          </span>
          <Badge variant="secondary">
            {selectedTurni.size} selezionati
          </Badge>
        </div>
        <div className="flex items-center gap-2">
          <Button
            variant="ghost"
            size="sm"
            onClick={selectedTurni.size === turni.length ? deselectAll : selectAll}
          >
            {selectedTurni.size === turni.length ? 'Deseleziona tutti' : 'Seleziona tutti'}
          </Button>
          {onSaveAll && selectedTurni.size > 0 && (
            <Button
              size="sm"
              onClick={handleSaveSelected}
              disabled={isSaving}
              className="gap-2"
            >
              {isSaving ? (
                <>
                  <RefreshCw className="h-4 w-4 animate-spin" />
                  Salvataggio...
                </>
              ) : (
                <>
                  <CheckCircle className="h-4 w-4" />
                  Salva {selectedTurni.size} turni
                </>
              )}
            </Button>
          )}
        </div>
      </div>

      {/* Turni cards */}
      <div className="space-y-2">
        {turni.map((turno, idx) => (
          <TurnoCard
            key={idx}
            turno={turno}
            onSave={onSaveSingle}
            onDiscard={onDiscardSingle}
            isSaving={isSaving}
            isSelected={selectedTurni.has(idx)}
            onToggleSelect={() => toggleSelect(idx)}
            showActions={false}
          />
        ))}
      </div>
    </div>
  );
}
