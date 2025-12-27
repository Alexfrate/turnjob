'use client';

import { useState } from 'react';
import { Bot, User, RefreshCw, AlertCircle, CheckCircle, AlertTriangle, Calendar, Clock, Users, Zap } from 'lucide-react';
import { cn } from '@/lib/utils';
import { Badge } from '@/components/ui/badge';
import { Button } from '@/components/ui/button';
import type { ChatMessage as ChatMessageType, ExtractedCriticita, ExtractedTurno, ExtractedRiposo } from '@/hooks/use-planning-chat';
import { useTranslations } from 'next-intl';
import { TurniList } from './TurnoCard';

interface ChatMessageProps {
  message: ChatMessageType;
  onSaveCriticita?: (criticita: ExtractedCriticita) => void;
  onSaveSporadica?: (criticita: ExtractedCriticita) => void;
  onSaveAllCriticita?: (criticita: ExtractedCriticita[]) => void;
  onSaveAllSporadiche?: (criticita: ExtractedCriticita[]) => void;
  onSaveTurno?: (turno: ExtractedTurno) => void;
  onSaveAllTurni?: (turni: ExtractedTurno[]) => void;
  onSaveRiposi?: (riposi: ExtractedRiposo[]) => void;
  isSaving?: boolean;
}

// Helper per normalizzare criticità a array
function normalizeCriticita(extracted: ExtractedCriticita | ExtractedCriticita[] | null | undefined): ExtractedCriticita[] {
  if (!extracted) return [];
  return Array.isArray(extracted) ? extracted : [extracted];
}

const giorni = ['', 'Lunedì', 'Martedì', 'Mercoledì', 'Giovedì', 'Venerdì', 'Sabato', 'Domenica'];

export function ChatMessage({ message, onSaveCriticita, onSaveSporadica, onSaveAllCriticita, onSaveAllSporadiche, onSaveTurno, onSaveAllTurni, onSaveRiposi, isSaving }: ChatMessageProps) {
  const t = useTranslations();
  const isUser = message.role === 'user';

  // Normalizza criticità a array
  const allCriticita = normalizeCriticita(message.extractedCriticita);
  const criticitaContinuative = allCriticita.filter((c) => c.is_continuativa);
  const criticitaSporadiche = allCriticita.filter((c) => !c.is_continuativa);

  // Rimuovi i blocchi JSON/criticita/turno dal contenuto visualizzato
  // Funzione per pulire completamente il contenuto dai blocchi tecnici
  const displayContent = (() => {
    let content = message.content;

    // 1. Rimuovi blocchi code completi (```xxx ... ```)
    content = content.replace(/```[\w]*[\s\S]*?```/g, '');

    // 2. Rimuovi blocchi code incompleti (```turno senza chiusura fino alla fine o prossimo ```)
    content = content.replace(/```\w+[\s\S]*?(?=```|$)/g, '');

    // 3. Rimuovi triple backtick rimaste
    content = content.replace(/```/g, '');

    // 4. Rimuovi tutto ciò che sembra JSON (oggetti con chiavi)
    // Pattern: { seguito da "chiave": fino a } (anche multilinea)
    content = content.replace(/\{[\s\S]*?"[\w_]+"[\s\S]*?\}/g, '');

    // 5. Rimuovi oggetti JSON semplici su singola linea
    content = content.replace(/\{[^{}]+\}/g, '');

    // 6. Rimuovi righe che contengono pattern JSON tipici
    content = content.replace(/^\s*"[\w_]+":\s*.+$/gm, '');

    // 7. Rimuovi righe con solo { o }
    content = content.replace(/^\s*[{}]\s*$/gm, '');

    // 8. Rimuovi righe che iniziano con "nucleo", "data", "ora_", "num_", "confidenza", "note", "collaboratori"
    content = content.replace(/^\s*"(?:nucleo|data|ora_|num_|confidenza|note|collaboratori|tipo|nome|descrizione|giorno|staff|is_)[\w_]*".*$/gm, '');

    // 9. Pulisci newlines multipli
    content = content.replace(/\n{3,}/g, '\n\n');

    return content.trim();
  })();

  return (
    <div
      className={cn(
        'flex gap-3 p-4',
        isUser ? 'flex-row-reverse' : ''
      )}
    >
      {/* Avatar */}
      <div
        className={cn(
          'flex-shrink-0 w-10 h-10 rounded-full flex items-center justify-center',
          'shadow-md ring-2 ring-background',
          isUser
            ? 'bg-gradient-to-br from-primary to-primary/80 text-primary-foreground'
            : 'bg-gradient-to-br from-blue-500 to-indigo-600 text-white'
        )}
      >
        {isUser ? (
          <User className="h-4 w-4" />
        ) : (
          <Bot className="h-4 w-4" />
        )}
      </div>

      {/* Content */}
      <div className={cn('flex-1 space-y-1', isUser ? 'items-end' : 'items-start')}>
        {/* Header */}
        <div className={cn('flex items-center gap-2 text-xs text-muted-foreground', isUser ? 'justify-end' : '')}>
          <span className="font-medium">
            {isUser ? t('common.you') || 'Tu' : 'AI'}
          </span>
          <span>
            {message.timestamp.toLocaleTimeString('it-IT', {
              hour: '2-digit',
              minute: '2-digit',
            })}
          </span>
        </div>

        {/* Message bubble */}
        <div
          className={cn(
            'inline-block max-w-[85%] rounded-2xl px-4 py-3 text-sm leading-relaxed',
            'whitespace-pre-wrap break-words overflow-hidden',
            isUser
              ? 'bg-primary text-primary-foreground rounded-br-sm shadow-sm'
              : 'bg-muted/80 border border-border/50 rounded-bl-sm shadow-sm'
          )}
        >
          {displayContent}
        </div>

        {/* Extracted criticità - mostra lista se multiple */}
        {allCriticita.length > 0 && (
          <CriticitaList
            criticita={allCriticita}
            onSaveSingle={onSaveCriticita}
            onSaveSporadicaSingle={onSaveSporadica}
            onSaveAllContinuative={onSaveAllCriticita}
            onSaveAllSporadiche={onSaveAllSporadiche}
            isSaving={isSaving}
          />
        )}

        {/* Extracted turni list */}
        {message.extractedTurni && message.extractedTurni.length > 0 && (
          <TurniList
            turni={message.extractedTurni}
            onSaveSingle={onSaveTurno}
            onSaveAll={onSaveAllTurni}
            isSaving={isSaving}
          />
        )}

        {/* Extracted riposi list */}
        {message.extractedRiposi && message.extractedRiposi.length > 0 && (
          <RiposiList
            riposi={message.extractedRiposi}
            onSaveAll={onSaveRiposi}
            isSaving={isSaving}
          />
        )}

        {/* Conferma Tutto - appare quando ci sono sia turni che riposi */}
        {message.extractedTurni && message.extractedTurni.length > 0 &&
         message.extractedRiposi && message.extractedRiposi.length > 0 &&
         onSaveAllTurni && onSaveRiposi && (
          <ConfirmAllSection
            turni={message.extractedTurni}
            riposi={message.extractedRiposi}
            onSaveAllTurni={onSaveAllTurni}
            onSaveRiposi={onSaveRiposi}
            isSaving={isSaving}
          />
        )}
      </div>
    </div>
  );
}

interface CriticitaCardProps {
  criticita: ExtractedCriticita;
  onSave?: (criticita: ExtractedCriticita) => void;
  onSaveSporadica?: (criticita: ExtractedCriticita) => void;
  isSaving?: boolean;
}

function CriticitaCard({ criticita, onSave, onSaveSporadica, isSaving }: CriticitaCardProps) {
  const t = useTranslations();

  return (
    <div
      className={cn(
        'border rounded-lg p-4 mt-3',
        criticita.is_continuativa
          ? 'border-blue-200 bg-blue-50 dark:border-blue-800 dark:bg-blue-950/30'
          : 'border-orange-200 bg-orange-50 dark:border-orange-800 dark:bg-orange-950/30'
      )}
    >
      {/* Header */}
      <div className="flex items-center justify-between mb-3">
        <div className="flex items-center gap-2">
          <Badge
            variant="outline"
            className={cn(
              criticita.is_continuativa
                ? 'border-blue-500 text-blue-700 dark:text-blue-400'
                : 'border-orange-500 text-orange-700 dark:text-orange-400'
            )}
          >
            <span className="flex items-center gap-1">
              {criticita.is_continuativa ? <RefreshCw className="h-3 w-3" /> : <Zap className="h-3 w-3" />}
              {criticita.is_continuativa ? 'Continuativa' : 'Sporadica'}
            </span>
          </Badge>
          <Badge variant="secondary">{criticita.tipo}</Badge>
        </div>
        {criticita.confidenza && (
          <span className="text-xs text-muted-foreground">
            Confidenza: {Math.round(criticita.confidenza * 100)}%
          </span>
        )}
      </div>

      {/* Details */}
      <div className="space-y-2 text-sm">
        <div className="font-medium">{criticita.nome}</div>
        {criticita.descrizione && (
          <div className="text-muted-foreground">{criticita.descrizione}</div>
        )}
        <div className="flex flex-wrap gap-4 text-muted-foreground">
          <span className="flex items-center gap-1">
            <Calendar className="h-3.5 w-3.5" />
            {giorni[criticita.giorno_settimana]}
          </span>
          {criticita.ora_inizio && (
            <span className="flex items-center gap-1">
              <Clock className="h-3.5 w-3.5" />
              {criticita.ora_inizio}
              {criticita.ora_fine && ` - ${criticita.ora_fine}`}
            </span>
          )}
          {criticita.staff_extra && criticita.staff_extra > 0 && (
            <span className="flex items-center gap-1">
              <Users className="h-3.5 w-3.5" />
              +{criticita.staff_extra} staff
            </span>
          )}
        </div>
      </div>

      {/* Actions */}
      {criticita.is_continuativa && onSave && (
        <div className="mt-4 pt-3 border-t border-blue-200 dark:border-blue-800">
          <Button
            size="sm"
            variant="outline"
            onClick={() => onSave(criticita)}
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
                Salva per le prossime settimane
              </>
            )}
          </Button>
        </div>
      )}

      {/* Actions per sporadica */}
      {!criticita.is_continuativa && onSaveSporadica && (
        <div className="mt-4 pt-3 border-t border-orange-200 dark:border-orange-800">
          <Button
            size="sm"
            variant="outline"
            onClick={() => onSaveSporadica(criticita)}
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
                Salva questa criticità
              </>
            )}
          </Button>
        </div>
      )}
    </div>
  );
}

// Componente per lista di criticità con azioni batch
interface CriticitaListProps {
  criticita: ExtractedCriticita[];
  onSaveSingle?: (criticita: ExtractedCriticita) => void;
  onSaveSporadicaSingle?: (criticita: ExtractedCriticita) => void;
  onSaveAllContinuative?: (criticita: ExtractedCriticita[]) => void;
  onSaveAllSporadiche?: (criticita: ExtractedCriticita[]) => void;
  isSaving?: boolean;
}

function CriticitaList({
  criticita,
  onSaveSingle,
  onSaveSporadicaSingle,
  onSaveAllContinuative,
  onSaveAllSporadiche,
  isSaving,
}: CriticitaListProps) {
  const [selectedContinuative, setSelectedContinuative] = useState<Set<number>>(
    new Set(criticita.filter((c) => c.is_continuativa).map((_, idx) => idx))
  );
  const [selectedSporadiche, setSelectedSporadiche] = useState<Set<number>>(
    new Set(criticita.filter((c) => !c.is_continuativa).map((_, idx) => idx))
  );

  const continuative = criticita.filter((c) => c.is_continuativa);
  const sporadiche = criticita.filter((c) => !c.is_continuativa);

  const toggleContinuativa = (idx: number) => {
    const newSet = new Set(selectedContinuative);
    if (newSet.has(idx)) {
      newSet.delete(idx);
    } else {
      newSet.add(idx);
    }
    setSelectedContinuative(newSet);
  };

  const toggleSporadica = (idx: number) => {
    const newSet = new Set(selectedSporadiche);
    if (newSet.has(idx)) {
      newSet.delete(idx);
    } else {
      newSet.add(idx);
    }
    setSelectedSporadiche(newSet);
  };

  const handleSaveAllContinuative = () => {
    const selected = continuative.filter((_, idx) => selectedContinuative.has(idx));
    if (onSaveAllContinuative && selected.length > 0) {
      onSaveAllContinuative(selected);
    }
  };

  const handleSaveAllSporadiche = () => {
    const selected = sporadiche.filter((_, idx) => selectedSporadiche.has(idx));
    if (onSaveAllSporadiche && selected.length > 0) {
      onSaveAllSporadiche(selected);
    }
  };

  // Se c'è solo una criticità, usa il layout singolo
  if (criticita.length === 1) {
    return (
      <CriticitaCard
        criticita={criticita[0]}
        onSave={onSaveSingle}
        onSaveSporadica={onSaveSporadicaSingle}
        isSaving={isSaving}
      />
    );
  }

  return (
    <div className="space-y-4 mt-3">
      {/* Header con conteggio */}
      <div className="flex items-center justify-between bg-gradient-to-r from-blue-100 to-orange-100 dark:from-blue-900/30 dark:to-orange-900/30 rounded-lg p-3">
        <div className="flex items-center gap-2">
          <AlertTriangle className="h-5 w-5 text-amber-600" />
          <span className="font-medium">
            {criticita.length} criticità rilevate
          </span>
        </div>
        <div className="flex gap-2">
          {continuative.length > 0 && (
            <Badge variant="outline" className="border-blue-500 text-blue-700 dark:text-blue-400 flex items-center gap-1">
              <RefreshCw className="h-3 w-3" />
              {continuative.length} continuative
            </Badge>
          )}
          {sporadiche.length > 0 && (
            <Badge variant="outline" className="border-orange-500 text-orange-700 dark:text-orange-400 flex items-center gap-1">
              <Zap className="h-3 w-3" />
              {sporadiche.length} sporadiche
            </Badge>
          )}
        </div>
      </div>

      {/* Sezione Continuative */}
      {continuative.length > 0 && (
        <div className="space-y-2">
          <div className="flex items-center justify-between">
            <span className="text-sm font-medium text-blue-700 dark:text-blue-400 flex items-center gap-1.5">
              <RefreshCw className="h-3.5 w-3.5" />
              Criticità Continuative (ricorrenti ogni settimana)
            </span>
            {onSaveAllContinuative && selectedContinuative.size > 0 && (
              <Button
                size="sm"
                variant="outline"
                onClick={handleSaveAllContinuative}
                disabled={isSaving}
                className="gap-2 border-blue-500 text-blue-700 hover:bg-blue-50"
              >
                {isSaving ? (
                  <RefreshCw className="h-4 w-4 animate-spin" />
                ) : (
                  <CheckCircle className="h-4 w-4" />
                )}
                Salva {selectedContinuative.size} selezionate
              </Button>
            )}
          </div>
          {continuative.map((c, idx) => (
            <div
              key={`cont-${idx}`}
              className={cn(
                'cursor-pointer transition-all',
                selectedContinuative.has(idx) ? 'ring-2 ring-blue-500' : 'opacity-70'
              )}
              onClick={() => toggleContinuativa(idx)}
            >
              <CriticitaCard
                criticita={c}
                onSave={onSaveSingle}
                isSaving={isSaving}
              />
            </div>
          ))}
        </div>
      )}

      {/* Sezione Sporadiche */}
      {sporadiche.length > 0 && (
        <div className="space-y-2">
          <div className="flex items-center justify-between">
            <span className="text-sm font-medium text-orange-700 dark:text-orange-400 flex items-center gap-1.5">
              <Zap className="h-3.5 w-3.5" />
              Criticità Sporadiche (solo questa settimana)
            </span>
            {onSaveAllSporadiche && selectedSporadiche.size > 0 && (
              <Button
                size="sm"
                variant="outline"
                onClick={handleSaveAllSporadiche}
                disabled={isSaving}
                className="gap-2 border-orange-500 text-orange-700 hover:bg-orange-50"
              >
                {isSaving ? (
                  <RefreshCw className="h-4 w-4 animate-spin" />
                ) : (
                  <CheckCircle className="h-4 w-4" />
                )}
                Salva {selectedSporadiche.size} selezionate
              </Button>
            )}
          </div>
          {sporadiche.map((c, idx) => (
            <div
              key={`spor-${idx}`}
              className={cn(
                'cursor-pointer transition-all',
                selectedSporadiche.has(idx) ? 'ring-2 ring-orange-500' : 'opacity-70'
              )}
              onClick={() => toggleSporadica(idx)}
            >
              <CriticitaCard
                criticita={c}
                onSaveSporadica={onSaveSporadicaSingle}
                isSaving={isSaving}
              />
            </div>
          ))}
        </div>
      )}
    </div>
  );
}

// Componente per lista di riposi assegnati dall'AI
interface RiposiListProps {
  riposi: ExtractedRiposo[];
  onSaveAll?: (riposi: ExtractedRiposo[]) => void;
  isSaving?: boolean;
}

function RiposiList({ riposi, onSaveAll, isSaving }: RiposiListProps) {
  const tipoRiposoLabels: Record<string, string> = {
    intero: 'Giorno intero',
    mezza_mattina: 'Mezza giornata (mattina)',
    mezza_pomeriggio: 'Mezza giornata (pomeriggio)',
  };

  // Raggruppa riposi per collaboratore
  const riposiPerCollaboratore = riposi.reduce((acc, riposo) => {
    const key = riposo.collaboratore_id;
    if (!acc[key]) {
      acc[key] = {
        nome_completo: riposo.nome_completo,
        riposi: [],
      };
    }
    acc[key].riposi.push(riposo);
    return acc;
  }, {} as Record<string, { nome_completo: string; riposi: ExtractedRiposo[] }>);

  return (
    <div className="mt-3 border rounded-lg p-4 border-green-200 bg-green-50 dark:border-green-800 dark:bg-green-950/30">
      {/* Header */}
      <div className="flex items-center justify-between mb-3">
        <div className="flex items-center gap-2">
          <Badge
            variant="outline"
            className="border-green-500 text-green-700 dark:text-green-400"
          >
            <span className="flex items-center gap-1">
              <Calendar className="h-3 w-3" />
              {riposi.length} riposi assegnati
            </span>
          </Badge>
        </div>
        {onSaveAll && (
          <Button
            size="sm"
            variant="outline"
            onClick={() => onSaveAll(riposi)}
            disabled={isSaving}
            className="gap-2 border-green-500 text-green-700 hover:bg-green-100"
          >
            {isSaving ? (
              <>
                <RefreshCw className="h-4 w-4 animate-spin" />
                Salvataggio...
              </>
            ) : (
              <>
                <CheckCircle className="h-4 w-4" />
                Salva tutti i riposi
              </>
            )}
          </Button>
        )}
      </div>

      {/* Lista riposi per collaboratore */}
      <div className="space-y-3">
        {Object.values(riposiPerCollaboratore).map((collData) => (
          <div key={collData.nome_completo} className="text-sm">
            <div className="font-medium text-green-800 dark:text-green-300">
              {collData.nome_completo}
            </div>
            <div className="flex flex-wrap gap-2 mt-1">
              {collData.riposi.map((riposo, idx) => (
                <Badge key={idx} variant="secondary" className="text-xs">
                  <Calendar className="h-3 w-3 mr-1" />
                  {riposo.giorno_nome}
                  <span className="ml-1 text-muted-foreground">
                    ({tipoRiposoLabels[riposo.tipo_riposo] || riposo.tipo_riposo})
                  </span>
                </Badge>
              ))}
            </div>
          </div>
        ))}
      </div>
    </div>
  );
}

// Componente per conferma totale (turni + riposi insieme)
interface ConfirmAllSectionProps {
  turni: ExtractedTurno[];
  riposi: ExtractedRiposo[];
  onSaveAllTurni: (turni: ExtractedTurno[]) => void;
  onSaveRiposi: (riposi: ExtractedRiposo[]) => void;
  isSaving?: boolean;
}

function ConfirmAllSection({ turni, riposi, onSaveAllTurni, onSaveRiposi, isSaving }: ConfirmAllSectionProps) {
  const [saving, setSaving] = useState(false);

  const handleConfirmAll = async () => {
    setSaving(true);
    try {
      // Salva turni e riposi in parallelo
      await Promise.all([
        onSaveAllTurni(turni),
        onSaveRiposi(riposi),
      ]);
    } finally {
      setSaving(false);
    }
  };

  const isCurrentlySaving = isSaving || saving;
  const validTurni = turni.filter(t => t.nucleo_id);

  return (
    <div className="mt-4 p-4 border-2 border-dashed border-purple-300 dark:border-purple-700 rounded-xl bg-gradient-to-br from-purple-50 to-indigo-50 dark:from-purple-950/30 dark:to-indigo-950/30">
      <div className="flex items-center justify-between">
        <div className="space-y-1">
          <div className="flex items-center gap-2 text-purple-700 dark:text-purple-400 font-medium">
            <Zap className="h-5 w-5" />
            Conferma Tutto
          </div>
          <p className="text-sm text-muted-foreground">
            Salva {validTurni.length} turni e {riposi.length} riposi con un click
          </p>
        </div>
        <Button
          size="lg"
          onClick={handleConfirmAll}
          disabled={isCurrentlySaving || validTurni.length === 0}
          className="gap-2 bg-gradient-to-r from-purple-600 to-indigo-600 hover:from-purple-700 hover:to-indigo-700 text-white shadow-lg"
        >
          {isCurrentlySaving ? (
            <>
              <RefreshCw className="h-5 w-5 animate-spin" />
              Salvataggio...
            </>
          ) : (
            <>
              <CheckCircle className="h-5 w-5" />
              Conferma Tutto
            </>
          )}
        </Button>
      </div>
      {validTurni.length < turni.length && (
        <p className="mt-2 text-xs text-amber-600 dark:text-amber-400 flex items-center gap-1">
          <AlertTriangle className="h-3 w-3" />
          {turni.length - validTurni.length} turni non hanno un nucleo valido e verranno ignorati
        </p>
      )}
    </div>
  );
}

// Loading message component with typing indicator
export function ChatMessageLoading() {
  return (
    <div className="flex gap-3 p-4">
      <div className="flex-shrink-0 w-9 h-9 rounded-full flex items-center justify-center shadow-sm bg-gradient-to-br from-blue-500 to-blue-600 text-white">
        <Bot className="h-4 w-4" />
      </div>
      <div className="flex-1 space-y-1">
        <div className="flex items-center gap-2 text-xs text-muted-foreground">
          <span className="font-medium">AI</span>
        </div>
        <div className="inline-flex items-center gap-2 bg-muted rounded-2xl rounded-bl-md px-4 py-3">
          <div className="flex gap-1">
            <span className="w-2 h-2 bg-blue-500 rounded-full animate-bounce" style={{ animationDelay: '0ms' }} />
            <span className="w-2 h-2 bg-blue-500 rounded-full animate-bounce" style={{ animationDelay: '150ms' }} />
            <span className="w-2 h-2 bg-blue-500 rounded-full animate-bounce" style={{ animationDelay: '300ms' }} />
          </div>
          <span className="text-sm text-muted-foreground ml-1">Sta scrivendo...</span>
        </div>
      </div>
    </div>
  );
}

// Error message component
export function ChatMessageError({ error }: { error: string }) {
  return (
    <div className="flex gap-3 p-4 bg-red-50 dark:bg-red-950/30">
      <div className="flex-shrink-0 w-8 h-8 rounded-full flex items-center justify-center bg-red-500/10 text-red-600">
        <AlertCircle className="h-4 w-4" />
      </div>
      <div className="flex-1 space-y-2">
        <div className="font-medium text-sm text-red-600">Errore</div>
        <div className="text-sm text-red-600/80">{error}</div>
      </div>
    </div>
  );
}
