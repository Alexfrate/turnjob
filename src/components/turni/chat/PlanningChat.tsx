'use client';

import { useEffect, useRef, useState } from 'react';
import { useTranslations } from 'next-intl';
import { Send, RefreshCw, ArrowLeft, Sparkles, Users, AlertTriangle, Calendar } from 'lucide-react';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Badge } from '@/components/ui/badge';
import { ScrollArea } from '@/components/ui/scroll-area';
import { usePlanningChat, ExtractedCriticita } from '@/hooks/use-planning-chat';
import {
  useCreateCriticitaContinuativa,
  CriticitaContinuativa,
} from '@/hooks/use-criticita-continuative';
import { ChatMessage, ChatMessageLoading, ChatMessageError } from './ChatMessage';
import { CriticalitySidebar } from './CriticalitySidebar';
import { useToast } from '@/hooks/use-toast';
import Link from 'next/link';

interface PlanningChatProps {
  weekStart: string;
  weekEnd: string;
}

export function PlanningChat({ weekStart, weekEnd }: PlanningChatProps) {
  const t = useTranslations();
  const { toast } = useToast();
  const [input, setInput] = useState('');
  const messagesEndRef = useRef<HTMLDivElement>(null);
  const inputRef = useRef<HTMLInputElement>(null);

  const {
    messages,
    context,
    isLoading,
    error,
    sendMessage,
    startConversation,
    resetChat,
  } = usePlanningChat(weekStart, weekEnd);

  const createCriticita = useCreateCriticitaContinuativa();

  // Avvia conversazione automaticamente
  useEffect(() => {
    if (messages.length === 0) {
      startConversation();
    }
  }, []);

  // Scroll to bottom on new messages - usa scrollIntoView per migliore comportamento
  useEffect(() => {
    // Piccolo delay per permettere il rendering
    const timer = setTimeout(() => {
      messagesEndRef.current?.scrollIntoView({ behavior: 'smooth' });
    }, 100);
    return () => clearTimeout(timer);
  }, [messages, isLoading]);

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!input.trim() || isLoading) return;

    const message = input.trim();
    setInput('');
    await sendMessage(message);
    inputRef.current?.focus();
  };

  const handleSaveCriticita = async (criticita: ExtractedCriticita) => {
    try {
      await createCriticita.mutateAsync({
        tipo: criticita.tipo,
        nome: criticita.nome,
        descrizione: criticita.descrizione,
        giorno_settimana: criticita.giorno_settimana,
        ora_inizio: criticita.ora_inizio,
        ora_fine: criticita.ora_fine,
        staff_extra: criticita.staff_extra || 0,
        fonte: 'AI_DETECTED',
        confidenza_ai: criticita.confidenza,
      });

      toast({
        title: 'Criticità salvata',
        description: `"${criticita.nome}" è stata salvata come criticità continuativa.`,
      });
    } catch (err) {
      toast({
        title: 'Errore',
        description: 'Impossibile salvare la criticità. Riprova.',
        variant: 'destructive',
      });
    }
  };

  // Handler per caricare criticità nel contesto AI
  const handleLoadCriticitaToContext = async (criticita: CriticitaContinuativa[]) => {
    if (criticita.length === 0) return;

    const giorni = ['', 'Lunedì', 'Martedì', 'Mercoledì', 'Giovedì', 'Venerdì', 'Sabato', 'Domenica'];
    const criticitaList = criticita
      .map(
        (c) =>
          `- ${c.nome} (${c.tipo}): ${giorni[c.giorno_settimana]}${c.ora_inizio ? ` ${c.ora_inizio}-${c.ora_fine || ''}` : ''}`
      )
      .join('\n');

    const message = `Considera queste criticità continuative per la pianificazione:\n${criticitaList}`;
    await sendMessage(message);
  };

  const formatDate = (dateStr: string) => {
    return new Date(dateStr).toLocaleDateString('it-IT', {
      day: 'numeric',
      month: 'short',
    });
  };

  return (
    <div className="flex flex-col h-[calc(100vh-12rem)]">
      {/* Header */}
      <div className="flex items-center justify-between mb-4">
        <div className="flex items-center gap-3">
          <Link href="/dashboard/turni">
            <Button variant="ghost" size="icon">
              <ArrowLeft className="h-4 w-4" />
            </Button>
          </Link>
          <div>
            <h1 className="text-xl font-bold flex items-center gap-2">
              <Sparkles className="h-5 w-5 text-blue-500" />
              {t('ai.planWithAI')}
            </h1>
            <p className="text-sm text-muted-foreground">
              {t('shifts.week')}: {formatDate(weekStart)} - {formatDate(weekEnd)}
            </p>
          </div>
        </div>

        <Button variant="outline" size="sm" onClick={resetChat}>
          <RefreshCw className="h-4 w-4 mr-2" />
          {t('common.reset')}
        </Button>
      </div>

      <div className="flex gap-4 flex-1 min-h-0">
        {/* Chat Area */}
        <Card className="flex-1 flex flex-col">
          {/* Context badges */}
          {context && (
            <CardHeader className="py-3 border-b">
              <div className="flex flex-wrap gap-2">
                <Badge variant="outline" className="gap-1">
                  <Calendar className="h-3 w-3" />
                  {context.criticitaContinuative} {t('criticalities.continuative')}
                </Badge>
                <Badge variant="outline" className="gap-1">
                  <Users className="h-3 w-3" />
                  {context.collaboratori} {t('collaborators.title')}
                </Badge>
                {context.periodiCritici > 0 && (
                  <Badge variant="outline" className="gap-1 text-orange-600">
                    <AlertTriangle className="h-3 w-3" />
                    {context.periodiCritici} {t('criticalities.title')}
                  </Badge>
                )}
              </div>
            </CardHeader>
          )}

          {/* Messages */}
          <ScrollArea className="flex-1">
            <div className="divide-y">
              {messages.map((message) => (
                <ChatMessage
                  key={message.id}
                  message={message}
                  onSaveCriticita={handleSaveCriticita}
                  isSaving={createCriticita.isPending}
                />
              ))}
              {isLoading && <ChatMessageLoading />}
              {error && <ChatMessageError error={error.message} />}
              {/* Ancora per scroll automatico */}
              <div ref={messagesEndRef} />
            </div>
          </ScrollArea>

          {/* Input */}
          <CardContent className="pt-4 border-t">
            <form onSubmit={handleSubmit} className="flex gap-2">
              <Input
                ref={inputRef}
                value={input}
                onChange={(e) => setInput(e.target.value)}
                placeholder={t('ai.typeMessage')}
                disabled={isLoading}
                className="flex-1"
              />
              <Button type="submit" disabled={isLoading || !input.trim()}>
                <Send className="h-4 w-4" />
              </Button>
            </form>
          </CardContent>
        </Card>

        {/* Side Panel - Criticità */}
        <div className="w-80 hidden lg:block">
          <CriticalitySidebar
            weekStart={weekStart}
            weekEnd={weekEnd}
            onLoadToContext={handleLoadCriticitaToContext}
            isLoading={isLoading}
          />
        </div>
      </div>
    </div>
  );
}
