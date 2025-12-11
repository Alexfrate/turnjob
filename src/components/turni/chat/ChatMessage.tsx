'use client';

import { Bot, User, RefreshCw, AlertCircle, CheckCircle } from 'lucide-react';
import { cn } from '@/lib/utils';
import { Badge } from '@/components/ui/badge';
import { Button } from '@/components/ui/button';
import type { ChatMessage as ChatMessageType, ExtractedCriticita } from '@/hooks/use-planning-chat';
import { useTranslations } from 'next-intl';

interface ChatMessageProps {
  message: ChatMessageType;
  onSaveCriticita?: (criticita: ExtractedCriticita) => void;
  isSaving?: boolean;
}

const giorni = ['', 'Lunedì', 'Martedì', 'Mercoledì', 'Giovedì', 'Venerdì', 'Sabato', 'Domenica'];

export function ChatMessage({ message, onSaveCriticita, isSaving }: ChatMessageProps) {
  const t = useTranslations();
  const isUser = message.role === 'user';

  // Rimuovi il blocco JSON criticita dal contenuto visualizzato
  const displayContent = message.content.replace(/```criticita[\s\S]*?```/g, '').trim();

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
          'flex-shrink-0 w-9 h-9 rounded-full flex items-center justify-center shadow-sm',
          isUser
            ? 'bg-gradient-to-br from-primary to-primary/80 text-primary-foreground'
            : 'bg-gradient-to-br from-blue-500 to-blue-600 text-white'
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
            'inline-block max-w-[90%] rounded-2xl px-4 py-2.5 text-sm whitespace-pre-wrap leading-relaxed',
            isUser
              ? 'bg-primary text-primary-foreground rounded-br-md ml-auto'
              : 'bg-muted rounded-bl-md'
          )}
        >
          {displayContent}
        </div>

        {/* Extracted criticità card */}
        {message.extractedCriticita && (
          <CriticitaCard
            criticita={message.extractedCriticita}
            onSave={onSaveCriticita}
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
  isSaving?: boolean;
}

function CriticitaCard({ criticita, onSave, isSaving }: CriticitaCardProps) {
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
            {criticita.is_continuativa ? '🔄 Continuativa' : '⚡ Sporadica'}
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
          <span>📅 {giorni[criticita.giorno_settimana]}</span>
          {criticita.ora_inizio && (
            <span>
              🕐 {criticita.ora_inizio}
              {criticita.ora_fine && ` - ${criticita.ora_fine}`}
            </span>
          )}
          {criticita.staff_extra && criticita.staff_extra > 0 && (
            <span>👥 +{criticita.staff_extra} staff</span>
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
