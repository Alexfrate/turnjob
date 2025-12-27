'use client';

import { useEffect, useRef, useState } from 'react';
import { useTranslations } from 'next-intl';
import { Send, RefreshCw, ArrowLeft, Sparkles, Users, AlertTriangle, Calendar, Wand2, Loader2 } from 'lucide-react';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Badge } from '@/components/ui/badge';
import { ScrollArea } from '@/components/ui/scroll-area';
import { usePlanningChat, ExtractedCriticita, ExtractedTurno, ExtractedRiposo } from '@/hooks/use-planning-chat';
import { useBatchAssignRiposi } from '@/hooks/use-riposi-settimanali';
import {
  useCreateCriticitaContinuativa,
  CriticitaContinuativa,
} from '@/hooks/use-criticita-continuative';
import { useCreatePeriodoCritico } from '@/hooks/use-periodi-critici';
import { useCreateTurno } from '@/hooks/use-turni';
import { ChatMessage, ChatMessageLoading, ChatMessageError } from './ChatMessage';
import { CriticalitySidebar } from './CriticalitySidebar';
import {
  AlertDialog,
  AlertDialogAction,
  AlertDialogCancel,
  AlertDialogContent,
  AlertDialogDescription,
  AlertDialogFooter,
  AlertDialogHeader,
  AlertDialogTitle,
  AlertDialogTrigger,
} from '@/components/ui/alert-dialog';
import { ShiftReviewPanel } from '../review/ShiftReviewPanel';
import { useToast } from '@/hooks/use-toast';
import { useGenerateWeek } from '@/hooks/use-generate-week';
import type { GeneratedShift } from '@/lib/ai/shift-generation';
import Link from 'next/link';

interface PlanningChatProps {
  weekStart: string;
  weekEnd: string;
}

export function PlanningChat({ weekStart, weekEnd }: PlanningChatProps) {
  const t = useTranslations();
  const { toast } = useToast();
  const [input, setInput] = useState('');
  const [showReviewPanel, setShowReviewPanel] = useState(false);
  const [isSavingGenerated, setIsSavingGenerated] = useState(false);
  const [isRestarting, setIsRestarting] = useState(false);
  const messagesEndRef = useRef<HTMLDivElement>(null);
  const inputRef = useRef<HTMLInputElement>(null);

  const {
    messages,
    context,
    isLoading,
    error,
    sendMessage,
    startConversation,
    restartChat,
  } = usePlanningChat(weekStart, weekEnd);

  const createCriticita = useCreateCriticitaContinuativa();
  const createPeriodoCritico = useCreatePeriodoCritico();
  const createTurno = useCreateTurno();
  const batchAssignRiposi = useBatchAssignRiposi();

  // Hook per generazione AI
  const {
    generate: generateWeek,
    isGenerating,
    result: generationResult,
    error: generationError,
    reset: resetGeneration,
  } = useGenerateWeek({
    onSuccess: (result) => {
      setShowReviewPanel(true);
      toast({
        title: 'Turni generati',
        description: `${result.turni.length} turni generati con confidence media del ${(result.confidence_average * 100).toFixed(0)}%`,
      });
    },
    onError: (err) => {
      toast({
        title: 'Errore generazione',
        description: err,
        variant: 'destructive',
      });
    },
  });

  // Avvia conversazione automaticamente solo al primo mount
  // Usiamo weekStart+weekEnd come chiave per evitare re-init
  useEffect(() => {
    startConversation();
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [weekStart, weekEnd]);

  // Scroll to bottom on new messages - usa scrollIntoView per migliore comportamento
  useEffect(() => {
    // Piccolo delay per permettere il rendering
    const timer = setTimeout(() => {
      messagesEndRef.current?.scrollIntoView({ behavior: 'smooth' });
    }, 100);
    return () => clearTimeout(timer);
  }, [messages, isLoading]);

  // Refocus input quando il caricamento finisce
  useEffect(() => {
    if (!isLoading) {
      // Delay per garantire che il DOM sia aggiornato
      const timer = setTimeout(() => {
        inputRef.current?.focus();
      }, 150);
      return () => clearTimeout(timer);
    }
  }, [isLoading]);

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!input.trim() || isLoading) return;

    const message = input.trim();
    setInput('');
    await sendMessage(message);
    inputRef.current?.focus();
  };

  // Handler per ripristinare e riavviare la chat
  const handleRestartChat = async () => {
    setIsRestarting(true);
    setInput('');
    restartChat();
    // Aspetta che la nuova conversazione parta
    await new Promise(resolve => setTimeout(resolve, 500));
    setIsRestarting(false);
  };

  const handleSaveCriticita = async (criticita: ExtractedCriticita) => {
    try {
      // Gestisce giorni multipli (es. "1,3,5" o "1-7")
      const giorni = parseGiorni(criticita.giorno_settimana);

      // Salva una criticità per ogni giorno
      const promises = giorni.map((giorno) =>
        createCriticita.mutateAsync({
          tipo: criticita.tipo,
          nome: criticita.nome,
          descrizione: criticita.descrizione,
          giorno_settimana: giorno,
          ora_inizio: criticita.ora_inizio,
          ora_fine: criticita.ora_fine,
          staff_extra: criticita.staff_extra || 0,
          fonte: 'AI_DETECTED',
          confidenza_ai: criticita.confidenza,
        })
      );

      await Promise.all(promises);

      toast({
        title: 'Criticità salvata',
        description: giorni.length > 1
          ? `"${criticita.nome}" salvata per ${giorni.length} giorni.`
          : `"${criticita.nome}" è stata salvata come criticità continuativa.`,
      });
    } catch (err) {
      toast({
        title: 'Errore',
        description: 'Impossibile salvare la criticità. Riprova.',
        variant: 'destructive',
      });
    }
  };

  // Handler per salvare criticità sporadiche (PeriodoCritico)
  const handleSaveSporadica = async (criticita: ExtractedCriticita) => {
    try {
      // Calcola le date specifiche dalla settimana corrente
      const giorni = parseGiorni(criticita.giorno_settimana);
      const weekStartDate = new Date(weekStart + 'T12:00:00');

      // Per ogni giorno, calcola la data esatta nella settimana
      const promises = giorni.map((giorno) => {
        // giorno: 1=Lun, 2=Mar, ... 7=Dom
        const daysFromMonday = giorno - 1;
        const targetDate = new Date(weekStartDate);
        targetDate.setDate(weekStartDate.getDate() + daysFromMonday);
        const dateStr = targetDate.toISOString().split('T')[0];

        return createPeriodoCritico.mutateAsync({
          nome: criticita.nome,
          descrizione: criticita.descrizione,
          data_inizio: dateStr,
          data_fine: dateStr,
          ora_inizio: criticita.ora_inizio,
          ora_fine: criticita.ora_fine,
          fonte: 'AI_DETECTED',
          tipo_criticita: criticita.tipo,
          staff_minimo: criticita.staff_extra,
        });
      });

      await Promise.all(promises);

      toast({
        title: 'Criticità salvata',
        description: giorni.length > 1
          ? `"${criticita.nome}" salvata per ${giorni.length} date.`
          : `"${criticita.nome}" è stata salvata come criticità sporadica.`,
      });
    } catch (err) {
      toast({
        title: 'Errore',
        description: 'Impossibile salvare la criticità. Riprova.',
        variant: 'destructive',
      });
    }
  };

  // Helper per parsare giorni multipli (es. "1,3,5" o "1-7" o 3)
  function parseGiorni(input: number | string): number[] {
    // Se è già un numero singolo
    if (typeof input === 'number') {
      return [input];
    }

    const str = String(input).trim();

    // Range (es. "1-7")
    if (str.includes('-')) {
      const [start, end] = str.split('-').map(Number);
      if (!isNaN(start) && !isNaN(end)) {
        const result: number[] = [];
        for (let i = start; i <= end; i++) {
          if (i >= 1 && i <= 7) result.push(i);
        }
        return result.length > 0 ? result : [1];
      }
    }

    // Lista separata da virgole (es. "1,3,5")
    if (str.includes(',')) {
      const giorni = str.split(',')
        .map((s) => parseInt(s.trim(), 10))
        .filter((n) => !isNaN(n) && n >= 1 && n <= 7);
      return giorni.length > 0 ? giorni : [1];
    }

    // Numero singolo come stringa
    const num = parseInt(str, 10);
    return !isNaN(num) && num >= 1 && num <= 7 ? [num] : [1];
  }

  // Handler per salvare un singolo turno
  const handleSaveTurno = async (turno: ExtractedTurno) => {
    if (!turno.nucleo_id) {
      toast({
        title: 'Errore',
        description: 'Il nucleo non è stato riconosciuto. Verifica i dati.',
        variant: 'destructive',
      });
      return;
    }

    try {
      await createTurno.mutateAsync({
        nucleo_id: turno.nucleo_id,
        data: turno.data,
        ora_inizio: turno.ora_inizio,
        ora_fine: turno.ora_fine,
        num_collaboratori_richiesti: turno.num_collaboratori_richiesti || 1,
        note: turno.note,
        pubblicato: false,
      });

      toast({
        title: 'Turno salvato',
        description: `Turno per ${turno.nucleo_nome} del ${turno.data} salvato con successo.`,
      });
    } catch (err) {
      toast({
        title: 'Errore',
        description: 'Impossibile salvare il turno. Riprova.',
        variant: 'destructive',
      });
    }
  };

  // Handler per salvare più turni in batch
  const handleSaveAllTurni = async (turni: ExtractedTurno[]) => {
    const validTurni = turni.filter((t) => t.nucleo_id);
    if (validTurni.length === 0) {
      toast({
        title: 'Errore',
        description: 'Nessun turno valido da salvare.',
        variant: 'destructive',
      });
      return;
    }

    try {
      const promises = validTurni.map((turno) =>
        createTurno.mutateAsync({
          nucleo_id: turno.nucleo_id!,
          data: turno.data,
          ora_inizio: turno.ora_inizio,
          ora_fine: turno.ora_fine,
          num_collaboratori_richiesti: turno.num_collaboratori_richiesti || 1,
          note: turno.note,
          pubblicato: false,
        })
      );

      await Promise.all(promises);

      toast({
        title: 'Turni salvati',
        description: `${validTurni.length} turni salvati con successo.`,
      });
    } catch (err) {
      toast({
        title: 'Errore',
        description: 'Errore durante il salvataggio dei turni.',
        variant: 'destructive',
      });
    }
  };

  // Handler per salvare TUTTE le criticità continuative selezionate in batch
  const handleSaveAllCriticita = async (criticitaList: ExtractedCriticita[]) => {
    if (criticitaList.length === 0) return;

    try {
      const allPromises: Promise<unknown>[] = [];

      for (const criticita of criticitaList) {
        const giorni = parseGiorni(criticita.giorno_settimana);
        for (const giorno of giorni) {
          allPromises.push(
            createCriticita.mutateAsync({
              tipo: criticita.tipo,
              nome: criticita.nome,
              descrizione: criticita.descrizione,
              giorno_settimana: giorno,
              ora_inizio: criticita.ora_inizio,
              ora_fine: criticita.ora_fine,
              staff_extra: criticita.staff_extra || 0,
              fonte: 'AI_DETECTED',
              confidenza_ai: criticita.confidenza,
            })
          );
        }
      }

      await Promise.all(allPromises);

      toast({
        title: 'Criticità salvate',
        description: `${criticitaList.length} criticità continuative salvate con successo.`,
      });
    } catch (err) {
      toast({
        title: 'Errore',
        description: 'Errore durante il salvataggio delle criticità.',
        variant: 'destructive',
      });
    }
  };

  // Handler per salvare TUTTE le criticità sporadiche selezionate in batch
  const handleSaveAllSporadiche = async (criticitaList: ExtractedCriticita[]) => {
    if (criticitaList.length === 0) return;

    try {
      const allPromises: Promise<unknown>[] = [];
      const weekStartDate = new Date(weekStart + 'T12:00:00');

      for (const criticita of criticitaList) {
        const giorni = parseGiorni(criticita.giorno_settimana);
        for (const giorno of giorni) {
          const daysFromMonday = giorno - 1;
          const targetDate = new Date(weekStartDate);
          targetDate.setDate(weekStartDate.getDate() + daysFromMonday);
          const dateStr = targetDate.toISOString().split('T')[0];

          allPromises.push(
            createPeriodoCritico.mutateAsync({
              nome: criticita.nome,
              descrizione: criticita.descrizione,
              data_inizio: dateStr,
              data_fine: dateStr,
              ora_inizio: criticita.ora_inizio,
              ora_fine: criticita.ora_fine,
              fonte: 'AI_DETECTED',
              tipo_criticita: criticita.tipo,
              staff_minimo: criticita.staff_extra,
            })
          );
        }
      }

      await Promise.all(allPromises);

      toast({
        title: 'Criticità salvate',
        description: `${criticitaList.length} criticità sporadiche salvate con successo.`,
      });
    } catch (err) {
      toast({
        title: 'Errore',
        description: 'Errore durante il salvataggio delle criticità.',
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

  // Handler per salvare i riposi estratti dall'AI
  const handleSaveRiposi = async (riposi: ExtractedRiposo[]) => {
    if (riposi.length === 0) return;

    try {
      const riposiToSave = riposi.map((r) => ({
        collaboratore_id: r.collaboratore_id,
        settimana_inizio: weekStart,
        giorno_settimana: r.giorno_settimana,
        tipo_riposo: r.tipo_riposo,
        fonte: 'AI_ASSIGNED' as const,
        note: `Assegnato via chat AI`,
      }));

      await batchAssignRiposi.mutateAsync(riposiToSave);

      toast({
        title: 'Riposi salvati',
        description: `${riposi.length} riposi assegnati con successo.`,
      });
    } catch (err) {
      toast({
        title: 'Errore',
        description: 'Errore durante il salvataggio dei riposi.',
        variant: 'destructive',
      });
    }
  };

  // Handler per generare turni con AI
  const handleGenerateWeek = async () => {
    await generateWeek(weekStart, weekEnd);
  };

  // Handler per salvare tutti i turni generati
  const handleSaveGeneratedShifts = async (turni: GeneratedShift[]) => {
    setIsSavingGenerated(true);
    try {
      // Filtra solo turni con nucleo_id valido
      const validTurni = turni.filter((t) => t.nucleo_id);

      const promises = validTurni.map((turno) =>
        createTurno.mutateAsync({
          nucleo_id: turno.nucleo_id,
          data: turno.data,
          ora_inizio: turno.ora_inizio,
          ora_fine: turno.ora_fine,
          num_collaboratori_richiesti: turno.num_collaboratori_richiesti,
          note: turno.reasoning,
          pubblicato: false,
          suggerito_da_ai: true,
          ai_confidence: turno.confidence,
        })
      );

      await Promise.all(promises);

      toast({
        title: 'Turni salvati',
        description: `${validTurni.length} turni salvati con successo come bozze.`,
      });

      setShowReviewPanel(false);
      resetGeneration();
    } catch (err) {
      toast({
        title: 'Errore',
        description: 'Errore durante il salvataggio dei turni.',
        variant: 'destructive',
      });
    } finally {
      setIsSavingGenerated(false);
    }
  };

  // Handler per rigenerare i turni
  const handleRegenerateShifts = () => {
    resetGeneration();
    setShowReviewPanel(false);
    handleGenerateWeek();
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

        <div className="flex items-center gap-2">
          <Button
            variant="default"
            size="sm"
            onClick={handleGenerateWeek}
            disabled={isGenerating || isLoading}
            className="gap-2"
          >
            {isGenerating ? (
              <>
                <RefreshCw className="h-4 w-4 animate-spin" />
                Generazione...
              </>
            ) : (
              <>
                <Wand2 className="h-4 w-4" />
                Genera Settimana
              </>
            )}
          </Button>
          <AlertDialog>
            <AlertDialogTrigger asChild>
              <Button variant="outline" size="sm" disabled={isRestarting || isLoading}>
                {isRestarting ? (
                  <Loader2 className="h-4 w-4 mr-2 animate-spin" />
                ) : (
                  <RefreshCw className="h-4 w-4 mr-2" />
                )}
                {t('common.reset')}
              </Button>
            </AlertDialogTrigger>
            <AlertDialogContent>
              <AlertDialogHeader>
                <AlertDialogTitle>Ripristinare la chat?</AlertDialogTitle>
                <AlertDialogDescription>
                  La conversazione verrà cancellata e si riavvierà automaticamente con un nuovo messaggio iniziale.
                </AlertDialogDescription>
              </AlertDialogHeader>
              <AlertDialogFooter>
                <AlertDialogCancel>Annulla</AlertDialogCancel>
                <AlertDialogAction onClick={handleRestartChat}>
                  Ripristina
                </AlertDialogAction>
              </AlertDialogFooter>
            </AlertDialogContent>
          </AlertDialog>
        </div>
      </div>

      {/* Pannello Revisione Turni Generati */}
      {showReviewPanel && generationResult && (
        <Card className="mb-4">
          <CardHeader className="pb-2">
            <div className="flex items-center justify-between">
              <CardTitle className="text-lg flex items-center gap-2">
                <Wand2 className="h-5 w-5 text-blue-500" />
                Turni Generati - Revisione
              </CardTitle>
              <Button
                variant="ghost"
                size="sm"
                onClick={() => {
                  setShowReviewPanel(false);
                  resetGeneration();
                }}
              >
                Chiudi
              </Button>
            </div>
          </CardHeader>
          <CardContent>
            <ShiftReviewPanel
              result={generationResult}
              onSaveAll={handleSaveGeneratedShifts}
              onRegenerate={handleRegenerateShifts}
              isSaving={isSavingGenerated}
            />
          </CardContent>
        </Card>
      )}

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
                  onSaveSporadica={handleSaveSporadica}
                  onSaveAllCriticita={handleSaveAllCriticita}
                  onSaveAllSporadiche={handleSaveAllSporadiche}
                  onSaveTurno={handleSaveTurno}
                  onSaveAllTurni={handleSaveAllTurni}
                  onSaveRiposi={handleSaveRiposi}
                  isSaving={createCriticita.isPending || createPeriodoCritico.isPending || createTurno.isPending || batchAssignRiposi.isPending}
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
