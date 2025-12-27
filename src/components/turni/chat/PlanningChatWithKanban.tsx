'use client';

import { useEffect, useRef, useState, useMemo, useCallback } from 'react';
import { useTranslations } from 'next-intl';
import {
  Send,
  RefreshCw,
  ArrowLeft,
  Sparkles,
  Users,
  AlertTriangle,
  Calendar,
  LayoutGrid,
  MessageSquare,
  Settings,
  Loader2,
} from 'lucide-react';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Card, CardContent, CardHeader } from '@/components/ui/card';
import { Badge } from '@/components/ui/badge';
import { ScrollArea } from '@/components/ui/scroll-area';
import { Tabs, TabsContent, TabsList, TabsTrigger } from '@/components/ui/tabs';
import { usePlanningChat, ExtractedCriticita, ExtractedTurno, ExtractedRiposo } from '@/hooks/use-planning-chat';
import { useSaveAIRiposi } from '@/hooks/use-riposi-settimanali';
import {
  useCreateCriticitaContinuativa,
  CriticitaContinuativa,
} from '@/hooks/use-criticita-continuative';
import { useCreatePeriodoCritico } from '@/hooks/use-periodi-critici';
import { useCreateTurno } from '@/hooks/use-turni';
import { useNuclei } from '@/hooks/use-nuclei';
import type { Nucleo } from '@/types/database';
import { ChatMessage, ChatMessageLoading, ChatMessageError } from './ChatMessage';
import { CriticalitaCompactCard } from './CriticalitaCompactCard';
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
import { DisponibilitaCompactCard } from '../availability/DisponibilitaCompactCard';
import { TimelineKanbanBoard } from '../kanban';
import { useToast } from '@/hooks/use-toast';
import { useCollaboratori } from '@/hooks/use-collaboratori';
import Link from 'next/link';

interface PlanningChatWithKanbanProps {
  weekStart: string;
  weekEnd: string;
  onOpenSetup?: () => void;
}

export function PlanningChatWithKanban({ weekStart, weekEnd, onOpenSetup }: PlanningChatWithKanbanProps) {
  const t = useTranslations();
  const { toast } = useToast();
  const [input, setInput] = useState('');
  const [activeTab, setActiveTab] = useState<'chat' | 'kanban'>('chat');
  const [isRestarting, setIsRestarting] = useState(false);
  const messagesEndRef = useRef<HTMLDivElement>(null);
  const inputRef = useRef<HTMLInputElement>(null);
  const previousTurniCountRef = useRef(0);

  // Stato per esclusioni criticità
  const [excludedCriticitaIds, setExcludedCriticitaIds] = useState<string[]>([]);

  const {
    messages,
    context,
    isLoading,
    error,
    sendMessage,
    startConversation,
    restartChat,
  } = usePlanningChat(weekStart, weekEnd, excludedCriticitaIds);

  const { nuclei } = useNuclei();
  const { collaboratori } = useCollaboratori();
  const createCriticita = useCreateCriticitaContinuativa();
  const createPeriodoCritico = useCreatePeriodoCritico();
  const createTurno = useCreateTurno();
  const saveAIRiposi = useSaveAIRiposi();

  // Stato locale per i turni (per permettere modifiche prima del salvataggio)
  const [localTurni, setLocalTurni] = useState<ExtractedTurno[]>([]);

  // Aggrega tutti i turni estratti dai messaggi
  const extractedTurni = useMemo(() => {
    const turni: ExtractedTurno[] = [];
    messages.forEach((m) => {
      m.extractedTurni?.forEach((turno) => {
        turni.push(turno);
      });
    });
    return turni;
  }, [messages]);

  // Sincronizza localTurni quando extractedTurni cambia
  useEffect(() => {
    if (extractedTurni.length > 0) {
      setLocalTurni(extractedTurni);
    }
  }, [extractedTurni]);

  // Auto-switch alla tab Kanban quando vengono generati nuovi turni
  useEffect(() => {
    const currentCount = extractedTurni.length;
    if (currentCount > previousTurniCountRef.current && currentCount > 0) {
      // Nuovi turni generati, switch alla tab kanban con un piccolo delay
      const timer = setTimeout(() => {
        setActiveTab('kanban');
      }, 1500);
      return () => clearTimeout(timer);
    }
    previousTurniCountRef.current = currentCount;
  }, [extractedTurni.length]);

  // Avvia conversazione automaticamente solo al primo mount
  useEffect(() => {
    startConversation();
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [weekStart, weekEnd]);

  // Scroll to bottom on new messages
  useEffect(() => {
    const timer = setTimeout(() => {
      messagesEndRef.current?.scrollIntoView({ behavior: 'smooth' });
    }, 100);
    return () => clearTimeout(timer);
  }, [messages, isLoading]);

  // Refocus input quando il caricamento finisce
  useEffect(() => {
    if (!isLoading && activeTab === 'chat') {
      const timer = setTimeout(() => {
        inputRef.current?.focus();
      }, 150);
      return () => clearTimeout(timer);
    }
  }, [isLoading, activeTab]);

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
    setLocalTurni([]);
    setActiveTab('chat');
    setExcludedCriticitaIds([]);
    restartChat();
    // Aspetta che la nuova conversazione parta
    await new Promise(resolve => setTimeout(resolve, 500));
    setIsRestarting(false);
  };

  // Handler per aggiornare un turno locale
  const handleUpdateTurno = useCallback((oldTurno: ExtractedTurno, updates: Partial<ExtractedTurno>) => {
    setLocalTurni((prev) =>
      prev.map((t) =>
        t.data === oldTurno.data &&
        t.ora_inizio === oldTurno.ora_inizio &&
        t.nucleo_nome === oldTurno.nucleo_nome
          ? { ...t, ...updates }
          : t
      )
    );
  }, []);

  // Handler per eliminare un turno locale
  const handleDeleteTurno = useCallback((turno: ExtractedTurno) => {
    setLocalTurni((prev) =>
      prev.filter(
        (t) =>
          !(
            t.data === turno.data &&
            t.ora_inizio === turno.ora_inizio &&
            t.nucleo_nome === turno.nucleo_nome
          )
      )
    );
  }, []);

  // Helper per parsare giorni multipli (es. "1,3,5" o "1-7" o 3)
  function parseGiorni(input: number | string): number[] {
    if (typeof input === 'number') {
      return [input];
    }

    const str = String(input).trim();

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

    if (str.includes(',')) {
      const giorni = str
        .split(',')
        .map((s) => parseInt(s.trim(), 10))
        .filter((n) => !isNaN(n) && n >= 1 && n <= 7);
      return giorni.length > 0 ? giorni : [1];
    }

    const num = parseInt(str, 10);
    return !isNaN(num) && num >= 1 && num <= 7 ? [num] : [1];
  }

  const handleSaveCriticita = async (criticita: ExtractedCriticita) => {
    try {
      const giorni = parseGiorni(criticita.giorno_settimana);
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
        description:
          giorni.length > 1
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

  const handleSaveSporadica = async (criticita: ExtractedCriticita) => {
    try {
      const giorni = parseGiorni(criticita.giorno_settimana);
      const weekStartDate = new Date(weekStart + 'T12:00:00');

      const promises = giorni.map((giorno) => {
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
        description:
          giorni.length > 1
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

  // Handler per salvare turni dal Kanban board
  const handleSaveTurniFromKanban = async (turni: ExtractedTurno[]) => {
    const validTurni = turni.filter((t) => t.nucleo_id);
    if (validTurni.length === 0) {
      toast({
        title: 'Errore',
        description: 'Nessun turno valido da salvare. Verifica che i nuclei siano riconosciuti.',
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

      // Svuota i turni locali dopo il salvataggio
      setLocalTurni([]);
    } catch (err) {
      toast({
        title: 'Errore',
        description: 'Errore durante il salvataggio dei turni.',
        variant: 'destructive',
      });
    }
  };

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

  // Handler per salvare riposi suggeriti dall'AI
  const handleSaveRiposi = async (riposi: ExtractedRiposo[]) => {
    if (riposi.length === 0) return;

    try {
      await saveAIRiposi.mutateAsync({
        weekStart,
        riposi: riposi.map((r) => ({
          collaboratore_id: r.collaboratore_id,
          giorno_settimana: r.giorno_settimana,
          tipo_riposo: r.tipo_riposo,
          note: `AI assegnato - ${r.giorno_nome}`,
        })),
      });

      toast({
        title: 'Riposi salvati',
        description: `${riposi.length} riposi salvati con successo.`,
      });
    } catch (err) {
      toast({
        title: 'Errore',
        description: 'Errore durante il salvataggio dei riposi.',
        variant: 'destructive',
      });
    }
  };

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

  // Prepara nuclei per il modal di modifica
  const nucleiForModal = useMemo(
    () =>
      nuclei.map((n: Nucleo) => ({
        id: n.id,
        nome: n.nome,
        colore: n.colore || undefined,
      })),
    [nuclei]
  );

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
          {onOpenSetup && (
            <Button variant="outline" size="sm" onClick={onOpenSetup} className="gap-2">
              <Settings className="h-4 w-4" />
              Configura
            </Button>
          )}
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
                  La conversazione verrà cancellata e si riavvierà automaticamente con un nuovo messaggio iniziale. I turni non salvati andranno persi.
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

      <div className="flex gap-4 flex-1 min-h-0">
        {/* Main Area with Tabs */}
        <Card className="flex-1 flex flex-col">
          <Tabs
            value={activeTab}
            onValueChange={(v) => setActiveTab(v as 'chat' | 'kanban')}
            className="flex flex-col flex-1"
          >
            <CardHeader className="py-3 border-b">
              <div className="flex items-center justify-between">
                <TabsList>
                  <TabsTrigger value="chat" className="gap-2">
                    <MessageSquare className="h-4 w-4" />
                    Chat AI
                  </TabsTrigger>
                  <TabsTrigger value="kanban" className="gap-2">
                    <LayoutGrid className="h-4 w-4" />
                    Visualizza Turni
                    {localTurni.length > 0 && (
                      <Badge variant="secondary" className="ml-1">
                        {localTurni.length}
                      </Badge>
                    )}
                  </TabsTrigger>
                </TabsList>

                {/* Context badges */}
                {context && (
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
                )}
              </div>
            </CardHeader>

            {/* Chat Tab */}
            <TabsContent value="chat" className="flex-1 flex flex-col m-0 data-[state=inactive]:hidden">
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
                      isSaving={
                        createCriticita.isPending ||
                        createPeriodoCritico.isPending ||
                        createTurno.isPending ||
                        saveAIRiposi.isPending
                      }
                    />
                  ))}
                  {isLoading && <ChatMessageLoading />}
                  {error && <ChatMessageError error={error.message} />}
                  <div ref={messagesEndRef} />
                </div>
              </ScrollArea>

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
            </TabsContent>

            {/* Kanban Tab */}
            <TabsContent value="kanban" className="flex-1 m-0 data-[state=inactive]:hidden">
              <TimelineKanbanBoard
                turni={localTurni}
                weekStart={weekStart}
                weekEnd={weekEnd}
                onUpdateTurno={handleUpdateTurno}
                onDeleteTurno={handleDeleteTurno}
                onSaveTurni={handleSaveTurniFromKanban}
                onOpenSetup={onOpenSetup}
                isSaving={createTurno.isPending}
                nuclei={nucleiForModal}
              />
            </TabsContent>
          </Tabs>
        </Card>

        {/* Side Panel - Criticità e Disponibilità (card compatte con Sheet) */}
        <div className="w-80 hidden lg:flex flex-col gap-4">
          <CriticalitaCompactCard
            weekStart={weekStart}
            weekEnd={weekEnd}
            excludedIds={excludedCriticitaIds}
            onExclusionsChange={setExcludedCriticitaIds}
          />
          <DisponibilitaCompactCard
            weekStart={weekStart}
            weekEnd={weekEnd}
            collaboratori={collaboratori.filter(c => c.attivo !== false).map(c => ({
              id: c.id,
              nome: c.nome,
              cognome: c.cognome,
              tipo_riposo: c.tipo_riposo,
              riposi_settimanali_custom: c.riposi_settimanali_custom,
              ore_riposo_settimanali: c.ore_riposo_settimanali,
              attivo: c.attivo,
            }))}
          />
        </div>
      </div>
    </div>
  );
}
