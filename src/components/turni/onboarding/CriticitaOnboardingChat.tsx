'use client';

import { useRef, useEffect, useState } from 'react';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { ScrollArea } from '@/components/ui/scroll-area';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import {
  Send,
  Bot,
  CheckCircle2,
  Sparkles,
  Calendar,
  Clock,
  AlertTriangle,
  Truck,
  CalendarOff,
  User,
  ArrowRight,
  X,
} from 'lucide-react';
import { cn } from '@/lib/utils';
import { useToast } from '@/hooks/use-toast';
import { useCreateCriticitaContinuativa } from '@/hooks/use-criticita-continuative';

interface Message {
  id: string;
  role: 'user' | 'assistant';
  content: string;
  timestamp?: Date;
}

interface ExtractedCriticita {
  tipo: string;
  nome: string;
  descrizione: string;
  giorno_settimana: number;
  ora_inizio?: string;
  ora_fine?: string;
  staff_extra?: number;
}

// Animated typing indicator
function TypingIndicator() {
  return (
    <div className="flex items-center gap-1 px-4 py-3">
      <div className="flex gap-1">
        <span
          className="w-2 h-2 bg-indigo-400 rounded-full animate-bounce"
          style={{ animationDelay: '0ms' }}
        />
        <span
          className="w-2 h-2 bg-indigo-400 rounded-full animate-bounce"
          style={{ animationDelay: '150ms' }}
        />
        <span
          className="w-2 h-2 bg-indigo-400 rounded-full animate-bounce"
          style={{ animationDelay: '300ms' }}
        />
      </div>
      <span className="ml-2 text-sm text-muted-foreground">Sta analizzando...</span>
    </div>
  );
}

// Step indicator component
const STEPS = [
  { icon: Calendar, label: 'Giorni critici', key: 'giorni' },
  { icon: Clock, label: 'Orari picco', key: 'orari' },
  { icon: Truck, label: 'Eventi ricorrenti', key: 'eventi' },
  { icon: CalendarOff, label: 'Ferie/Assenze', key: 'assenze' },
  { icon: CheckCircle2, label: 'Conferma', key: 'conferma' },
];

function StepIndicator({ currentStep }: { currentStep: number }) {
  return (
    <div className="flex items-center justify-center gap-1 px-4 py-2">
      {STEPS.map((step, index) => {
        const Icon = step.icon;
        const isCompleted = index < currentStep;
        const isCurrent = index === currentStep;

        return (
          <div key={step.key} className="flex items-center">
            <div
              className={cn(
                'w-8 h-8 rounded-full flex items-center justify-center transition-all duration-300',
                isCompleted &&
                  'bg-gradient-to-r from-emerald-500 to-emerald-600 text-white shadow-lg shadow-emerald-500/30',
                isCurrent &&
                  'bg-gradient-to-r from-indigo-500 to-purple-600 text-white shadow-lg shadow-indigo-500/30 scale-110',
                !isCompleted && !isCurrent && 'bg-muted text-muted-foreground'
              )}
            >
              {isCompleted ? <CheckCircle2 className="w-4 h-4" /> : <Icon className="w-4 h-4" />}
            </div>
            {index < STEPS.length - 1 && (
              <div
                className={cn(
                  'w-6 h-0.5 mx-1 transition-all duration-300',
                  isCompleted ? 'bg-emerald-500' : 'bg-muted'
                )}
              />
            )}
          </div>
        );
      })}
    </div>
  );
}

interface CriticitaOnboardingChatProps {
  onComplete: () => void;
  onSkip?: () => void;
}

export function CriticitaOnboardingChat({ onComplete, onSkip }: CriticitaOnboardingChatProps) {
  const { toast } = useToast();
  const scrollAreaRef = useRef<HTMLDivElement>(null);
  const inputRef = useRef<HTMLInputElement>(null);
  const createCriticita = useCreateCriticitaContinuativa();

  const [messages, setMessages] = useState<Message[]>([
    {
      id: 'welcome',
      role: 'assistant',
      content:
        'Ciao! Prima di pianificare i turni, aiutami a capire le criticità ricorrenti della tua attività. Questo mi permetterà di generare turni più intelligenti.\n\n**Quali giorni della settimana sono più critici per te?** (es. "Sabato e domenica sono i giorni più pieni", "Il venerdì sera è sempre caotico")',
      timestamp: new Date(),
    },
  ]);
  const [input, setInput] = useState('');
  const [isLoading, setIsLoading] = useState(false);
  const [currentStep, setCurrentStep] = useState(0);
  const [collectedCriticita, setCollectedCriticita] = useState<ExtractedCriticita[]>([]);
  const [isComplete, setIsComplete] = useState(false);

  // Auto-scroll to bottom
  useEffect(() => {
    if (scrollAreaRef.current) {
      const scrollContainer = scrollAreaRef.current.querySelector(
        '[data-radix-scroll-area-viewport]'
      );
      if (scrollContainer) {
        scrollContainer.scrollTo({
          top: scrollContainer.scrollHeight,
          behavior: 'smooth',
        });
      }
    }
  }, [messages, isLoading]);

  // Focus input on mount
  useEffect(() => {
    inputRef.current?.focus();
  }, []);

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!input.trim() || isLoading) return;

    const userMessage: Message = {
      id: `user-${Date.now()}`,
      role: 'user',
      content: input.trim(),
      timestamp: new Date(),
    };

    setMessages((prev) => [...prev, userMessage]);
    setInput('');
    setIsLoading(true);

    try {
      const response = await fetch('/api/ai/criticita-onboarding', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          messages: [...messages, userMessage].map((m) => ({
            role: m.role,
            content: m.content,
          })),
          currentStep,
        }),
      });

      const data = await response.json();

      if (!response.ok) {
        throw new Error(data.error || 'Errore nella risposta');
      }

      // Aggiungi la risposta dell'AI
      const assistantMessage: Message = {
        id: `assistant-${Date.now()}`,
        role: 'assistant',
        content: data.message,
        timestamp: new Date(),
      };
      setMessages((prev) => [...prev, assistantMessage]);

      // Se l'AI ha estratto criticità, aggiungile alla lista
      if (data.extractedCriticita && data.extractedCriticita.length > 0) {
        setCollectedCriticita((prev) => [...prev, ...data.extractedCriticita]);
      }

      // Aggiorna lo step se necessario
      if (data.nextStep !== undefined) {
        setCurrentStep(data.nextStep);
      }

      // Se l'onboarding è completo
      if (data.isComplete) {
        setIsComplete(true);
      }
    } catch (error) {
      console.error('Onboarding error:', error);
      const errorMessage: Message = {
        id: `error-${Date.now()}`,
        role: 'assistant',
        content:
          'Mi dispiace, ho avuto un problema. Puoi ripetere? Se preferisci, puoi saltare questa configurazione e procedere direttamente alla pianificazione.',
        timestamp: new Date(),
      };
      setMessages((prev) => [...prev, errorMessage]);
    } finally {
      setIsLoading(false);
      inputRef.current?.focus();
    }
  };

  // Salva tutte le criticità e completa l'onboarding
  const handleSaveAndComplete = async () => {
    if (collectedCriticita.length === 0) {
      onComplete();
      return;
    }

    setIsLoading(true);
    try {
      // Salva ogni criticità
      for (const criticita of collectedCriticita) {
        await createCriticita.mutateAsync({
          tipo: criticita.tipo,
          nome: criticita.nome,
          descrizione: criticita.descrizione,
          giorno_settimana: criticita.giorno_settimana,
          ora_inizio: criticita.ora_inizio,
          ora_fine: criticita.ora_fine,
          staff_extra: criticita.staff_extra || 0,
          fonte: 'AI_DETECTED',
          confidenza_ai: 0.9,
        });
      }

      toast({
        title: 'Criticità salvate',
        description: `${collectedCriticita.length} criticità sono state configurate con successo.`,
      });

      // Segna l'onboarding come completato
      localStorage.setItem('turni_criticita_onboarding_done', 'true');
      onComplete();
    } catch (error) {
      console.error('Save error:', error);
      toast({
        title: 'Errore',
        description: 'Errore nel salvataggio. Puoi procedere comunque.',
        variant: 'destructive',
      });
    } finally {
      setIsLoading(false);
    }
  };

  return (
    <Card className="h-full flex flex-col">
      <CardHeader className="border-b">
        <div className="flex items-center justify-between">
          <CardTitle className="flex items-center gap-2">
            <Sparkles className="h-5 w-5 text-indigo-500" />
            Configurazione Criticità
          </CardTitle>
          {onSkip && (
            <Button variant="ghost" size="sm" onClick={onSkip}>
              <X className="h-4 w-4 mr-1" />
              Salta
            </Button>
          )}
        </div>
        <StepIndicator currentStep={currentStep} />
      </CardHeader>

      <ScrollArea ref={scrollAreaRef} className="flex-1 p-4">
        <div className="space-y-4">
          {messages.map((message) => (
            <div
              key={message.id}
              className={cn(
                'flex gap-3',
                message.role === 'user' ? 'justify-end' : 'justify-start'
              )}
            >
              {message.role === 'assistant' && (
                <div className="flex-shrink-0 w-8 h-8 rounded-full bg-gradient-to-r from-indigo-500 to-purple-600 flex items-center justify-center">
                  <Bot className="w-4 h-4 text-white" />
                </div>
              )}
              <div
                className={cn(
                  'max-w-[80%] rounded-2xl px-4 py-3',
                  message.role === 'user'
                    ? 'bg-primary text-primary-foreground'
                    : 'bg-muted'
                )}
              >
                <p className="text-sm whitespace-pre-wrap">{message.content}</p>
              </div>
              {message.role === 'user' && (
                <div className="flex-shrink-0 w-8 h-8 rounded-full bg-primary flex items-center justify-center">
                  <User className="w-4 h-4 text-primary-foreground" />
                </div>
              )}
            </div>
          ))}
          {isLoading && <TypingIndicator />}

          {/* Riepilogo criticità raccolte */}
          {collectedCriticita.length > 0 && (
            <div className="mt-4 p-4 bg-muted/50 rounded-lg border">
              <h4 className="font-medium text-sm mb-2 flex items-center gap-2">
                <AlertTriangle className="h-4 w-4 text-amber-500" />
                Criticità rilevate ({collectedCriticita.length})
              </h4>
              <div className="space-y-2">
                {collectedCriticita.map((c, i) => (
                  <div key={i} className="text-xs text-muted-foreground flex items-center gap-2">
                    <CheckCircle2 className="h-3 w-3 text-emerald-500" />
                    <span>
                      {c.nome} - {getGiornoNome(c.giorno_settimana)}
                      {c.ora_inizio && ` (${c.ora_inizio}-${c.ora_fine})`}
                    </span>
                  </div>
                ))}
              </div>
            </div>
          )}

          {/* Pulsante completamento */}
          {isComplete && (
            <div className="mt-4 flex justify-center">
              <Button
                onClick={handleSaveAndComplete}
                disabled={isLoading}
                className="gap-2"
                size="lg"
              >
                {collectedCriticita.length > 0 ? (
                  <>
                    Salva {collectedCriticita.length} criticità e continua
                    <ArrowRight className="h-4 w-4" />
                  </>
                ) : (
                  <>
                    Continua alla pianificazione
                    <ArrowRight className="h-4 w-4" />
                  </>
                )}
              </Button>
            </div>
          )}
        </div>
      </ScrollArea>

      {!isComplete && (
        <CardContent className="border-t pt-4">
          <form onSubmit={handleSubmit} className="flex gap-2">
            <Input
              ref={inputRef}
              value={input}
              onChange={(e) => setInput(e.target.value)}
              placeholder="Descrivi le tue criticità..."
              disabled={isLoading}
              className="flex-1"
            />
            <Button type="submit" disabled={isLoading || !input.trim()}>
              <Send className="h-4 w-4" />
            </Button>
          </form>
        </CardContent>
      )}
    </Card>
  );
}

// Helper per ottenere il nome del giorno
function getGiornoNome(giorno: number): string {
  const giorni = ['', 'Lunedì', 'Martedì', 'Mercoledì', 'Giovedì', 'Venerdì', 'Sabato', 'Domenica'];
  return giorni[giorno] || '';
}
