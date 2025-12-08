'use client';

import { useRef, useEffect, useState } from 'react';
import { useRouter } from 'next/navigation';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { ScrollArea } from '@/components/ui/scroll-area';
import { Send, Bot, Loader2, CheckCircle2, Sparkles, Building2, Clock, Users, Layers, Timer } from 'lucide-react';
import { cn } from '@/lib/utils';
import { useToast } from '@/hooks/use-toast';

interface Message {
    id: string;
    role: 'user' | 'assistant';
    content: string;
    timestamp?: Date;
}

// Animated typing indicator
function TypingIndicator() {
    return (
        <div className="flex items-center gap-1 px-4 py-3">
            <div className="flex gap-1">
                <span className="w-2 h-2 bg-blue-400 rounded-full animate-bounce" style={{ animationDelay: '0ms' }} />
                <span className="w-2 h-2 bg-blue-400 rounded-full animate-bounce" style={{ animationDelay: '150ms' }} />
                <span className="w-2 h-2 bg-blue-400 rounded-full animate-bounce" style={{ animationDelay: '300ms' }} />
            </div>
            <span className="ml-2 text-sm text-slate-400">Sta scrivendo...</span>
        </div>
    );
}

// Step indicator component
const STEPS = [
    { icon: Building2, label: 'Azienda', key: 'nome' },
    { icon: Layers, label: 'Tipo', key: 'tipo' },
    { icon: Clock, label: 'Orari', key: 'orari' },
    { icon: Users, label: 'Team', key: 'collaboratori' },
    { icon: Sparkles, label: 'Nuclei', key: 'nuclei' },
    { icon: Timer, label: 'Ore', key: 'ore' },
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
                                "w-8 h-8 rounded-full flex items-center justify-center transition-all duration-300",
                                isCompleted && "bg-gradient-to-r from-emerald-500 to-emerald-600 text-white shadow-lg shadow-emerald-500/30",
                                isCurrent && "bg-gradient-to-r from-blue-500 to-indigo-600 text-white shadow-lg shadow-blue-500/30 scale-110",
                                !isCompleted && !isCurrent && "bg-slate-700/50 text-slate-500"
                            )}
                        >
                            {isCompleted ? (
                                <CheckCircle2 className="w-4 h-4" />
                            ) : (
                                <Icon className="w-4 h-4" />
                            )}
                        </div>
                        {index < STEPS.length - 1 && (
                            <div
                                className={cn(
                                    "w-6 h-0.5 mx-1 transition-all duration-300",
                                    isCompleted ? "bg-emerald-500" : "bg-slate-700/50"
                                )}
                            />
                        )}
                    </div>
                );
            })}
        </div>
    );
}

interface OnboardingChatProps {
    forceNewCompany?: boolean;
}

export function OnboardingChat({ forceNewCompany = false }: OnboardingChatProps) {
    const router = useRouter();
    const { toast } = useToast();
    const scrollAreaRef = useRef<HTMLDivElement>(null);
    const inputRef = useRef<HTMLInputElement>(null);

    const welcomeMessage = forceNewCompany
        ? 'Ciao! Stai aggiungendo una nuova azienda al tuo account. Iniziamo: come si chiama questa nuova attività?'
        : 'Ciao! Sono qui per aiutarti a configurare Turnjob per la tua azienda. Iniziamo con una semplice domanda: come si chiama la tua attività?';

    const [messages, setMessages] = useState<Message[]>([
        {
            id: 'welcome',
            role: 'assistant',
            content: welcomeMessage,
            timestamp: new Date(),
        },
    ]);
    const [input, setInput] = useState('');
    const [isLoading, setIsLoading] = useState(false);
    const [isExtracting, setIsExtracting] = useState(false);

    // Auto-scroll to bottom
    useEffect(() => {
        if (scrollAreaRef.current) {
            const scrollContainer = scrollAreaRef.current.querySelector('[data-radix-scroll-area-viewport]');
            if (scrollContainer) {
                scrollContainer.scrollTo({
                    top: scrollContainer.scrollHeight,
                    behavior: 'smooth'
                });
            }
        }
    }, [messages, isLoading]);

    const handleSubmit = async (e: React.FormEvent) => {
        e.preventDefault();
        if (!input.trim() || isLoading) return;

        const userMessage: Message = {
            id: `user-${Date.now()}`,
            role: 'user',
            content: input.trim(),
            timestamp: new Date(),
        };

        setMessages(prev => [...prev, userMessage]);
        setInput('');
        setIsLoading(true);

        try {
            const response = await fetch('/api/onboarding/chat', {
                method: 'POST',
                headers: { 'Content-Type': 'application/json' },
                body: JSON.stringify({
                    messages: [...messages, userMessage].map(m => ({
                        role: m.role,
                        content: m.content,
                    })),
                }),
            });

            const data = await response.json();

            if (!response.ok) {
                throw new Error(data.error || 'Errore durante la chat');
            }

            const assistantMessage: Message = {
                id: `assistant-${Date.now()}`,
                role: 'assistant',
                content: data.message || data.content || 'Mi dispiace, non ho capito. Puoi ripetere?',
                timestamp: new Date(),
            };

            setMessages(prev => [...prev, assistantMessage]);
        } catch (error) {
            console.error('Chat error:', error);
            toast({
                title: 'Errore',
                description: 'Impossibile comunicare con l\'assistente. Riprova.',
                variant: 'destructive',
            });
        } finally {
            setIsLoading(false);
            // Auto-focus input after AI response
            setTimeout(() => {
                inputRef.current?.focus();
            }, 100);
        }
    };

    // Calculate step based on user messages
    const userMessageCount = messages.filter(m => m.role === 'user').length;
    const currentStep = Math.min(userMessageCount, STEPS.length);

    // Il pulsante si attiva solo quando l'assistente mostra il riepilogo finale
    const lastAssistantMessage = [...messages].reverse().find(m => m.role === 'assistant');
    const hasSummary = lastAssistantMessage?.content.toLowerCase().includes('riepilogo') ||
        lastAssistantMessage?.content.includes('È tutto corretto');
    const isOnboardingComplete = userMessageCount >= STEPS.length && hasSummary;

    const handleExtractData = async () => {
        if (!isOnboardingComplete) {
            toast({
                title: 'Conversazione non completata',
                description: `Rispondi a tutte le ${STEPS.length} domande prima di completare.`,
                variant: 'destructive',
            });
            return;
        }

        setIsExtracting(true);
        try {
            const response = await fetch('/api/onboarding/extract', {
                method: 'POST',
                headers: { 'Content-Type': 'application/json' },
                body: JSON.stringify({ messages }),
            });

            const result = await response.json();

            if (!response.ok) {
                throw new Error(result.error || 'Errore durante l\'estrazione');
            }

            // Salva i dati nel localStorage e reindirizza alla pagina di review
            localStorage.setItem('onboarding_extracted_data', JSON.stringify(result.data));
            localStorage.setItem('onboarding_force_new_company', String(forceNewCompany));
            router.push('/onboarding/review');

        } catch (error) {
            console.error('Extraction error:', error);
            toast({
                title: 'Errore',
                description: 'Impossibile estrarre i dati dalla conversazione. Riprova.',
                variant: 'destructive',
            });
            setIsExtracting(false);
        }
    };

    // Format timestamp
    const formatTime = (date?: Date) => {
        if (!date) return '';
        return date.toLocaleTimeString('it-IT', { hour: '2-digit', minute: '2-digit' });
    };

    return (
        <div className="relative">
            {/* Glassmorphism Card */}
            <div className="bg-slate-900/70 backdrop-blur-xl rounded-3xl border border-slate-700/50 shadow-2xl overflow-hidden">
                {/* Header */}
                <div className="bg-gradient-to-r from-slate-800/80 to-slate-900/80 border-b border-slate-700/50 p-4">
                    <div className="flex items-center justify-between mb-3">
                        <div className="flex items-center gap-3">
                            <div className="relative">
                                <div className="w-12 h-12 bg-gradient-to-br from-blue-500 to-indigo-600 rounded-2xl flex items-center justify-center shadow-lg shadow-blue-500/30">
                                    <Bot className="w-6 h-6 text-white" />
                                </div>
                                <div className="absolute -bottom-1 -right-1 w-4 h-4 bg-emerald-500 rounded-full border-2 border-slate-900" />
                            </div>
                            <div>
                                <h3 className="font-semibold text-white">Assistente Turnjob</h3>
                                <p className="text-xs text-slate-400">Online • Pronto ad aiutarti</p>
                            </div>
                        </div>
                        <div className="text-right">
                            <p className="text-xs text-slate-400">Step {currentStep + 1} di {STEPS.length}</p>
                            <p className="text-sm font-medium text-blue-400">
                                {STEPS[Math.min(currentStep, STEPS.length - 1)]?.label}
                            </p>
                        </div>
                    </div>

                    {/* Step Indicator */}
                    <StepIndicator currentStep={currentStep} />
                </div>

                {/* Messages Area */}
                <ScrollArea ref={scrollAreaRef} className="h-[280px] md:h-[320px]">
                    <div className="p-4 space-y-4">
                        {messages.map((message, index) => (
                            <div
                                key={message.id}
                                className={cn(
                                    "flex gap-3 animate-in slide-in-from-bottom-2 duration-300",
                                    message.role === 'user' ? "flex-row-reverse" : ""
                                )}
                                style={{ animationDelay: `${index * 50}ms` }}
                            >
                                {/* Avatar */}
                                <div className={cn(
                                    "w-9 h-9 rounded-xl flex items-center justify-center shrink-0 shadow-lg",
                                    message.role === 'assistant'
                                        ? "bg-gradient-to-br from-blue-500 to-indigo-600 shadow-blue-500/20"
                                        : "bg-gradient-to-br from-slate-600 to-slate-700 shadow-slate-500/20"
                                )}>
                                    {message.role === 'assistant' ? (
                                        <Bot className="w-5 h-5 text-white" />
                                    ) : (
                                        <span className="text-xs font-bold text-white">TU</span>
                                    )}
                                </div>

                                {/* Message Bubble */}
                                <div className={cn(
                                    "max-w-[75%] group",
                                    message.role === 'user' ? "items-end" : "items-start"
                                )}>
                                    <div
                                        className={cn(
                                            "rounded-2xl px-4 py-3 shadow-lg",
                                            message.role === 'user'
                                                ? "bg-gradient-to-r from-blue-500 to-indigo-600 text-white rounded-tr-md"
                                                : "bg-slate-800/80 text-slate-100 rounded-tl-md border border-slate-700/50"
                                        )}
                                    >
                                        <p className="text-sm leading-relaxed whitespace-pre-wrap">
                                            {message.content}
                                        </p>
                                    </div>
                                    <p className={cn(
                                        "text-[10px] text-slate-500 mt-1 opacity-0 group-hover:opacity-100 transition-opacity",
                                        message.role === 'user' ? "text-right mr-2" : "ml-2"
                                    )}>
                                        {formatTime(message.timestamp)}
                                    </p>
                                </div>
                            </div>
                        ))}

                        {/* Typing Indicator */}
                        {isLoading && (
                            <div className="flex gap-3 animate-in fade-in duration-300">
                                <div className="w-9 h-9 rounded-xl bg-gradient-to-br from-blue-500 to-indigo-600 flex items-center justify-center shrink-0 shadow-lg shadow-blue-500/20">
                                    <Bot className="w-5 h-5 text-white" />
                                </div>
                                <div className="bg-slate-800/80 rounded-2xl rounded-tl-md border border-slate-700/50 shadow-lg">
                                    <TypingIndicator />
                                </div>
                            </div>
                        )}
                    </div>
                </ScrollArea>

                {/* Input Area */}
                <div className="border-t border-slate-700/50 bg-slate-800/50 p-4">
                    <form onSubmit={handleSubmit} className="flex gap-3">
                        <div className="flex-1 relative">
                            <Input
                                ref={inputRef}
                                placeholder="Scrivi la tua risposta..."
                                value={input}
                                onChange={(e) => setInput(e.target.value)}
                                disabled={isLoading || isExtracting}
                                className="bg-slate-900/50 border-slate-700 text-white placeholder:text-slate-500 rounded-xl h-12 pr-4 focus:border-blue-500 focus:ring-blue-500/20"
                                autoFocus
                            />
                        </div>
                        <Button
                            type="submit"
                            size="icon"
                            disabled={isLoading || !input.trim()}
                            className="h-12 w-12 rounded-xl bg-gradient-to-r from-blue-500 to-indigo-600 hover:from-blue-600 hover:to-indigo-700 shadow-lg shadow-blue-500/30 border-0"
                        >
                            <Send className="h-5 w-5" />
                        </Button>
                    </form>

                    {/* Complete Button - si attiva solo dopo tutti i 6 step */}
                    <Button
                        variant="ghost"
                        onClick={handleExtractData}
                        disabled={isLoading || isExtracting || !isOnboardingComplete}
                        className={cn(
                            "w-full mt-3 rounded-xl h-11 transition-all duration-300",
                            isOnboardingComplete && !isLoading && !isExtracting
                                ? "bg-gradient-to-r from-emerald-500 to-emerald-600 hover:from-emerald-600 hover:to-emerald-700 text-white shadow-lg shadow-emerald-500/30 border-0"
                                : "text-slate-500 hover:text-slate-400 hover:bg-slate-800/50"
                        )}
                    >
                        {isExtracting ? (
                            <>
                                <Loader2 className="mr-2 h-4 w-4 animate-spin" />
                                Analisi in corso...
                            </>
                        ) : (
                            <>
                                <CheckCircle2 className="mr-2 h-4 w-4" />
                                Completa Configurazione
                            </>
                        )}
                    </Button>
                </div>
            </div>

        </div>
    );
}
