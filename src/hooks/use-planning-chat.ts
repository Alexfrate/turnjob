'use client';

import { useState, useCallback, useEffect, useRef } from 'react';
import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query';

export interface ChatMessage {
  id: string;
  role: 'user' | 'assistant';
  content: string;
  timestamp: Date;
  extractedCriticita?: ExtractedCriticita | ExtractedCriticita[] | null;
  extractedTurni?: ExtractedTurno[] | null;
  extractedRiposi?: ExtractedRiposo[] | null;
}

export interface ExtractedCriticita {
  tipo: string;
  nome: string;
  descrizione?: string;
  giorno_settimana: number;
  ora_inizio?: string;
  ora_fine?: string;
  is_continuativa: boolean;
  staff_extra?: number;
  confidenza?: number;
}

export interface ExtractedTurno {
  nucleo_nome: string;
  nucleo_id?: string;
  nucleo_colore?: string;
  data: string;
  ora_inizio: string;
  ora_fine: string;
  num_collaboratori_richiesti: number;
  note?: string;
  collaboratori_suggeriti?: string[];
  confidenza?: number;
}

export interface ExtractedRiposo {
  collaboratore_id: string;
  nome_completo: string;
  giorno_settimana: number;
  giorno_nome: string;
  tipo_riposo: 'intero' | 'mezza_mattina' | 'mezza_pomeriggio';
  data: string;
  confidence: number;
}

export interface PlanningChatResponse {
  message: string;
  content: string;
  extractedCriticita?: ExtractedCriticita[] | null;
  extractedTurni?: ExtractedTurno[] | null;
  extractedRiposi?: ExtractedRiposo[] | null;
  context: {
    criticitaContinuative: number;
    collaboratori: number;
    nuclei: number;
    periodiCritici: number;
  };
}

interface SendMessageInput {
  messages: { role: string; content: string }[];
  weekStart?: string;
  weekEnd?: string;
  excludedCriticitaIds?: string[];
}

async function sendPlanningMessage(input: SendMessageInput): Promise<PlanningChatResponse> {
  const res = await fetch('/api/ai/planning-chat', {
    method: 'POST',
    headers: { 'Content-Type': 'application/json' },
    body: JSON.stringify(input),
  });

  if (!res.ok) {
    const error = await res.json();
    throw new Error(error.error || 'Errore nella comunicazione con l\'AI');
  }

  return res.json();
}

export function usePlanningChat(weekStart?: string, weekEnd?: string, excludedCriticitaIds: string[] = []) {
  const queryClient = useQueryClient();
  const [messages, setMessages] = useState<ChatMessage[]>([]);
  const [context, setContext] = useState<PlanningChatResponse['context'] | null>(null);
  const [isEnabled, setIsEnabled] = useState(false);

  // Chiave unica per questa chat (includi esclusioni per invalidare cache se cambiano)
  const chatKey = `${weekStart}-${weekEnd}`;
  const queryKey = ['planning-chat-init', chatKey];

  // Ref per tracciare se abbiamo già processato la risposta iniziale
  const hasProcessedInitRef = useRef(false);

  // useQuery per il messaggio iniziale - React Query DEDUPLICA automaticamente!
  const initialQuery = useQuery({
    queryKey: queryKey,
    queryFn: () => sendPlanningMessage({
      messages: [{ role: 'user', content: 'Inizia' }],
      weekStart,
      weekEnd,
      excludedCriticitaIds,
    }),
    enabled: isEnabled, // Parte solo quando abilitato
    staleTime: Infinity, // Non diventa mai stale
    gcTime: 1000 * 60 * 5, // Cache per 5 minuti
    refetchOnMount: false,
    refetchOnWindowFocus: false,
    refetchOnReconnect: false,
    retry: 1,
  });

  // Quando la query completa con successo, aggiungi il messaggio
  useEffect(() => {
    if (initialQuery.data && !hasProcessedInitRef.current && messages.length === 0) {
      hasProcessedInitRef.current = true;
      const assistantMessage: ChatMessage = {
        id: `assistant-init-${Date.now()}`,
        role: 'assistant',
        content: initialQuery.data.message,
        timestamp: new Date(),
        extractedCriticita: initialQuery.data.extractedCriticita,
        extractedTurni: initialQuery.data.extractedTurni,
        extractedRiposi: initialQuery.data.extractedRiposi,
      };
      setMessages([assistantMessage]);
      setContext(initialQuery.data.context);
    }
  }, [initialQuery.data, messages.length]);

  // Mutation per messaggi successivi
  const sendMutation = useMutation({
    mutationFn: sendPlanningMessage,
    onSuccess: (data) => {
      const assistantMessage: ChatMessage = {
        id: `assistant-${Date.now()}`,
        role: 'assistant',
        content: data.message,
        timestamp: new Date(),
        extractedCriticita: data.extractedCriticita,
        extractedTurni: data.extractedTurni,
        extractedRiposi: data.extractedRiposi,
      };
      setMessages((prev) => [...prev, assistantMessage]);
      setContext(data.context);
    },
  });

  // Funzione per avviare la conversazione (abilita la query)
  const startConversation = useCallback(() => {
    if (!isEnabled) {
      console.log('[PlanningChat] Enabling initial query');
      setIsEnabled(true);
    }
  }, [isEnabled]);

  // Funzione per inviare messaggi successivi
  const sendMessage = useCallback(
    async (content: string) => {
      const userMessage: ChatMessage = {
        id: `user-${Date.now()}`,
        role: 'user',
        content,
        timestamp: new Date(),
      };
      setMessages((prev) => [...prev, userMessage]);

      const apiMessages = [...messages, userMessage].map((m) => ({
        role: m.role,
        content: m.content,
      }));

      await sendMutation.mutateAsync({
        messages: apiMessages,
        weekStart,
        weekEnd,
        excludedCriticitaIds,
      });
    },
    [messages, sendMutation, weekStart, weekEnd, excludedCriticitaIds]
  );

  // Funzione per resettare la chat (solo svuota, non riavvia)
  const resetChat = useCallback(() => {
    setMessages([]);
    setContext(null);
    setIsEnabled(false);
    hasProcessedInitRef.current = false;
    // Rimuovi la cache della query iniziale
    queryClient.removeQueries({ queryKey: queryKey });
  }, [queryClient, queryKey]);

  // Funzione per resettare E riavviare la chat automaticamente
  const restartChat = useCallback(() => {
    // Prima resetta tutto
    setMessages([]);
    setContext(null);
    hasProcessedInitRef.current = false;
    queryClient.removeQueries({ queryKey: queryKey });

    // Disabilita e poi riabilita per triggerare nuova query
    setIsEnabled(false);
    setTimeout(() => {
      setIsEnabled(true);
    }, 100);
  }, [queryClient, queryKey]);

  return {
    messages,
    context,
    isLoading: (isEnabled && initialQuery.isLoading) || sendMutation.isPending,
    error: initialQuery.error || sendMutation.error,
    sendMessage,
    startConversation,
    resetChat,
    restartChat,
  };
}

// Helper per normalizzare criticità a array
function normalizeCriticita(extracted: ExtractedCriticita | ExtractedCriticita[] | null | undefined): ExtractedCriticita[] {
  if (!extracted) return [];
  return Array.isArray(extracted) ? extracted : [extracted];
}

// Hook per estrarre criticità dai messaggi
export function useExtractedCriticita(messages: ChatMessage[]) {
  const extractedContinuative: ExtractedCriticita[] = [];
  const extractedSporadiche: ExtractedCriticita[] = [];

  messages.forEach((m) => {
    const allCriticita = normalizeCriticita(m.extractedCriticita);
    allCriticita.forEach((c) => {
      if (c.is_continuativa) {
        extractedContinuative.push(c);
      } else {
        extractedSporadiche.push(c);
      }
    });
  });

  return { extractedContinuative, extractedSporadiche };
}

// Hook per estrarre riposi dai messaggi
export function useExtractedRiposi(messages: ChatMessage[]) {
  const extractedRiposi: ExtractedRiposo[] = [];

  messages.forEach((m) => {
    if (m.extractedRiposi && Array.isArray(m.extractedRiposi)) {
      extractedRiposi.push(...m.extractedRiposi);
    }
  });

  return extractedRiposi;
}
