'use client';

import { Clock, Users, Sparkles, Check, AlertCircle } from 'lucide-react';
import { Badge } from '@/components/ui/badge';
import { cn } from '@/lib/utils';
import type { Turno } from '@/hooks/use-turni';

interface ShiftCardProps {
  turno: Turno;
  compact?: boolean;
  onClick?: () => void;
}

export function ShiftCard({ turno, compact = false, onClick }: ShiftCardProps) {
  const assignedCount = turno.Assegnazione_Turno?.length || 0;
  const requiredCount = turno.num_collaboratori_richiesti || 1;
  const isFull = assignedCount >= requiredCount;
  const isAISuggested = turno.suggerito_da_ai;

  // Determine nucleo color
  const nucleoColor = turno.Nucleo?.colore || '#6366f1';

  if (compact) {
    return (
      <div
        onClick={onClick}
        className={cn(
          'rounded-md p-2 cursor-pointer transition-all hover:shadow-md',
          'border-l-4'
        )}
        style={{
          borderLeftColor: nucleoColor,
          backgroundColor: `${nucleoColor}10`,
        }}
      >
        <div className="flex items-center justify-between gap-1">
          <div className="flex items-center gap-1 min-w-0">
            {isAISuggested && (
              <Sparkles className="h-3 w-3 text-purple-500 flex-shrink-0" />
            )}
            <span className="text-xs font-medium truncate">
              {turno.Nucleo?.nome || 'Turno'}
            </span>
          </div>
          <Badge
            variant={isFull ? 'default' : 'secondary'}
            className={cn(
              'text-[10px] px-1 py-0 h-4',
              isFull ? 'bg-green-500' : 'bg-orange-500'
            )}
          >
            {assignedCount}/{requiredCount}
          </Badge>
        </div>
        <div className="flex items-center gap-1 mt-1 text-[10px] text-muted-foreground">
          <Clock className="h-3 w-3" />
          <span>
            {turno.ora_inizio.slice(0, 5)} - {turno.ora_fine.slice(0, 5)}
          </span>
        </div>
      </div>
    );
  }

  // Full card view
  return (
    <div
      onClick={onClick}
      className={cn(
        'rounded-lg p-3 cursor-pointer transition-all hover:shadow-lg',
        'border-l-4 border bg-card'
      )}
      style={{
        borderLeftColor: nucleoColor,
      }}
    >
      {/* Header */}
      <div className="flex items-center justify-between mb-2">
        <div className="flex items-center gap-2">
          {isAISuggested && (
            <Sparkles className="h-4 w-4 text-purple-500" />
          )}
          <span
            className="font-medium"
            style={{ color: nucleoColor }}
          >
            {turno.Nucleo?.nome || 'Turno'}
          </span>
        </div>
        <div className="flex items-center gap-2">
          {turno.pubblicato && (
            <Badge variant="outline" className="text-xs">
              Pubblicato
            </Badge>
          )}
          <Badge
            variant={isFull ? 'default' : 'secondary'}
            className={cn(
              'text-xs',
              isFull ? 'bg-green-500' : 'bg-orange-500'
            )}
          >
            <Users className="h-3 w-3 mr-1" />
            {assignedCount}/{requiredCount}
          </Badge>
        </div>
      </div>

      {/* Time */}
      <div className="flex items-center gap-2 text-sm text-muted-foreground mb-2">
        <Clock className="h-4 w-4" />
        <span>
          {turno.ora_inizio.slice(0, 5)} - {turno.ora_fine.slice(0, 5)}
        </span>
        {isAISuggested && turno.ai_confidence && (
          <span className="text-xs text-purple-500">
            ({Math.round(turno.ai_confidence * 100)}% conf.)
          </span>
        )}
      </div>

      {/* Assigned collaborators */}
      {turno.Assegnazione_Turno && turno.Assegnazione_Turno.length > 0 && (
        <div className="space-y-1">
          {turno.Assegnazione_Turno.map((a) => (
            <div
              key={a.id}
              className="flex items-center gap-2 text-sm"
            >
              {a.confermato ? (
                <Check className="h-3 w-3 text-green-500" />
              ) : (
                <AlertCircle className="h-3 w-3 text-yellow-500" />
              )}
              <span>
                {a.Collaboratore?.nome} {a.Collaboratore?.cognome}
              </span>
              {a.tipo === 'suggerita_ai' && (
                <Sparkles className="h-3 w-3 text-purple-400" />
              )}
            </div>
          ))}
        </div>
      )}

      {/* Notes */}
      {turno.note && (
        <div className="mt-2 text-xs text-muted-foreground border-t pt-2">
          {turno.note}
        </div>
      )}
    </div>
  );
}
