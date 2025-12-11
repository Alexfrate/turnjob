'use client';

import { useState, useCallback } from 'react';
import { useMutation } from '@tanstack/react-query';

export interface ChatMessage {
  id: string;
  role: 'user' | 'assistant';
  content: string;
  timestamp: Date;
  extractedCriticita?: ExtractedCriticita | null;
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

export interface PlanningChatResponse {
  message: string;
  content: string;
  extractedCriticita?: ExtractedCriticita | null;
  context: {
    criticitaContinuative: number;
    collaboratori: number;
    periodiCritici: number;
  };
}

interface SendMessageInput {
  messages: { role: string; content: string }[];
  weekStart?: string;
  weekEnd?: string;
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

export function usePlanningChat(weekStart?: string, weekEnd?: string) {
  const [messages, setMessages] = useState<ChatMessage[]>([]);
  const [context, setContext] = useState<PlanningChatResponse['context'] | null>(null);

  const mutation = useMutation({
    mutationFn: sendPlanningMessage,
    onSuccess: (data) => {
      // Aggiungi messaggio assistente
      const assistantMessage: ChatMessage = {
        id: `assistant-${Date.now()}`,
        role: 'assistant',
        content: data.message,
        timestamp: new Date(),
        extractedCriticita: data.extractedCriticita,
      };
      setMessages((prev) => [...prev, assistantMessage]);
      setContext(data.context);
    },
  });

  const sendMessage = useCallback(
    async (content: string) => {
      // Aggiungi messaggio utente
      const userMessage: ChatMessage = {
        id: `user-${Date.now()}`,
        role: 'user',
        content,
        timestamp: new Date(),
      };
      setMessages((prev) => [...prev, userMessage]);

      // Prepara messaggi per API (senza metadata)
      const apiMessages = [...messages, userMessage].map((m) => ({
        role: m.role,
        content: m.content,
      }));

      // Invia all'API
      await mutation.mutateAsync({
        messages: apiMessages,
        weekStart,
        weekEnd,
      });
    },
    [messages, mutation, weekStart, weekEnd]
  );

  const startConversation = useCallback(async () => {
    // Inizia conversazione con messaggio vuoto per ottenere intro dall'AI
    await mutation.mutateAsync({
      messages: [{ role: 'user', content: 'Inizia' }],
      weekStart,
      weekEnd,
    });
  }, [mutation, weekStart, weekEnd]);

  const resetChat = useCallback(() => {
    setMessages([]);
    setContext(null);
  }, []);

  return {
    messages,
    context,
    isLoading: mutation.isPending,
    error: mutation.error,
    sendMessage,
    startConversation,
    resetChat,
  };
}

// Hook per estrarre criticità dai messaggi
export function useExtractedCriticita(messages: ChatMessage[]) {
  const extractedContinuative: ExtractedCriticita[] = [];
  const extractedSporadiche: ExtractedCriticita[] = [];

  messages.forEach((m) => {
    if (m.extractedCriticita) {
      if (m.extractedCriticita.is_continuativa) {
        extractedContinuative.push(m.extractedCriticita);
      } else {
        extractedSporadiche.push(m.extractedCriticita);
      }
    }
  });

  return { extractedContinuative, extractedSporadiche };
}
