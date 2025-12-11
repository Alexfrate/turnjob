'use client';

import { useState, useEffect, useRef } from 'react';
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card';
import { Label } from '@/components/ui/label';
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from '@/components/ui/select';
import { Input } from '@/components/ui/input';
import { Button } from '@/components/ui/button';
import { Badge } from '@/components/ui/badge';
import { useToast } from '@/hooks/use-toast';
import {
  Loader2,
  Save,
  Sparkles,
  Cpu,
  Coins,
  Zap,
  Calendar,
  MessageSquare,
  Search,
  FileText,
  CheckCircle2,
} from 'lucide-react';

interface LlmModel {
  id: string;
  modelId: string;
  displayName: string;
  inputCostPer1M: number;
  outputCostPer1M: number;
  maxTokens: number;
  isActive: boolean;
  priority: number;
}

interface LlmConfig {
  planningChatModelId: string;
  onboardingModelId: string;
  constraintModelId: string;
  explanationModelId: string;
  validationModelId: string;
  dailyBudgetLimit: number;
  monthlyBudgetLimit: number;
  alertThreshold: number;
}

const USE_CASES = [
  {
    id: 'planningChatModelId',
    label: 'Chat Pianificazione Turni',
    description: 'Chat AI per pianificare turni e gestire criticità',
    icon: Calendar,
    color: 'bg-blue-500/10 text-blue-600',
  },
  {
    id: 'onboardingModelId',
    label: 'Onboarding Conversazionale',
    description: 'Chat AI per setup iniziale azienda',
    icon: MessageSquare,
    color: 'bg-violet-500/10 text-violet-600',
  },
  {
    id: 'constraintModelId',
    label: 'Estrazione Vincoli',
    description: 'Estrae regole business da testo naturale',
    icon: Search,
    color: 'bg-amber-500/10 text-amber-600',
  },
  {
    id: 'explanationModelId',
    label: 'Spiegazioni Scheduling',
    description: 'Spiega decisioni AI nella generazione turni',
    icon: FileText,
    color: 'bg-emerald-500/10 text-emerald-600',
  },
  {
    id: 'validationModelId',
    label: 'Validazione Turni',
    description: 'Verifica correttezza schedule generati',
    icon: CheckCircle2,
    color: 'bg-sky-500/10 text-sky-600',
  },
] as const;

const RECOMMENDED_MODELS: Record<string, string[]> = {
  planningChatModelId: ['x-ai/grok-4.1-fast', 'openai/gpt-4o', 'anthropic/claude-3.5-sonnet'],
  onboardingModelId: ['x-ai/grok-4-fast', 'anthropic/claude-3.5-sonnet', 'openai/gpt-4o'],
  constraintModelId: ['anthropic/claude-3.5-sonnet', 'openai/gpt-4o', 'x-ai/grok-4-fast'],
  explanationModelId: ['openai/gpt-4o-mini', 'anthropic/claude-3-haiku', 'x-ai/grok-4-fast'],
  validationModelId: ['anthropic/claude-3.5-sonnet', 'openai/gpt-4o', 'x-ai/grok-4-fast'],
};

export function ModelsTab() {
  const { toast } = useToast();
  const [loading, setLoading] = useState(false);
  const [initialLoading, setInitialLoading] = useState(true);
  const [models, setModels] = useState<LlmModel[]>([]);
  const [config, setConfig] = useState<LlmConfig>({
    planningChatModelId: 'x-ai/grok-4.1-fast',
    onboardingModelId: 'x-ai/grok-4-fast',
    constraintModelId: 'x-ai/grok-4-fast',
    explanationModelId: 'x-ai/grok-4-fast',
    validationModelId: 'x-ai/grok-4-fast',
    dailyBudgetLimit: 50,
    monthlyBudgetLimit: 500,
    alertThreshold: 0.8,
  });
  const hasLoaded = useRef(false);

  useEffect(() => {
    if (hasLoaded.current) return;
    hasLoaded.current = true;

    const loadData = async () => {
      try {
        setInitialLoading(true);
        const response = await fetch('/api/admin/llm-config');
        if (!response.ok) throw new Error('Errore nel caricamento');
        const data = await response.json();
        if (data.success) {
          setModels(data.models);
          setConfig(data.config);
        }
      } catch (error) {
        console.error('Error loading LLM config:', error);
        toast({
          title: 'Errore',
          description: 'Impossibile caricare la configurazione',
          variant: 'destructive',
        });
      } finally {
        setInitialLoading(false);
      }
    };
    loadData();
  }, [toast]);

  const handleSave = async () => {
    setLoading(true);
    try {
      const response = await fetch('/api/admin/llm-config', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify(config),
      });
      const data = await response.json();
      if (!response.ok || !data.success) {
        throw new Error(data.error || 'Errore durante il salvataggio');
      }
      toast({
        title: 'Configurazione salvata',
        description: 'I modelli LLM sono stati aggiornati con successo.',
      });
    } catch (error) {
      console.error('Error saving LLM config:', error);
      toast({
        title: 'Errore',
        description: error instanceof Error ? error.message : 'Impossibile salvare.',
        variant: 'destructive',
      });
    } finally {
      setLoading(false);
    }
  };

  const getModelById = (modelId: string) => models.find((m) => m.modelId === modelId);
  const isRecommended = (useCase: string, modelId: string) =>
    RECOMMENDED_MODELS[useCase]?.includes(modelId);

  if (initialLoading) {
    return (
      <div className="flex items-center justify-center py-16">
        <div className="flex flex-col items-center gap-3">
          <Loader2 className="h-8 w-8 animate-spin text-primary" />
          <span className="text-sm text-muted-foreground">Caricamento configurazione...</span>
        </div>
      </div>
    );
  }

  return (
    <div className="space-y-6">
      {/* Model Selection Cards */}
      <div className="grid gap-4">
        {USE_CASES.map((useCase) => {
          const selectedModel = getModelById(config[useCase.id as keyof LlmConfig] as string);
          const IconComponent = useCase.icon;

          return (
            <Card key={useCase.id} className="border bg-card overflow-hidden">
              <CardContent className="p-0">
                <div className="flex flex-col lg:flex-row lg:items-center">
                  {/* Left: Icon + Info */}
                  <div className="flex items-start gap-4 p-5 flex-1 min-w-0 border-b lg:border-b-0 lg:border-r border-border/50">
                    <div className={`flex-shrink-0 w-12 h-12 rounded-xl ${useCase.color} flex items-center justify-center`}>
                      <IconComponent className="h-6 w-6" />
                    </div>
                    <div className="min-w-0 flex-1">
                      <h3 className="font-semibold text-foreground">{useCase.label}</h3>
                      <p className="text-sm text-muted-foreground mt-0.5">{useCase.description}</p>
                    </div>
                  </div>

                  {/* Right: Select + Stats */}
                  <div className="flex flex-col sm:flex-row items-stretch sm:items-center gap-3 p-5 lg:w-auto lg:flex-shrink-0">
                    <Select
                      value={config[useCase.id as keyof LlmConfig] as string}
                      onValueChange={(value) => setConfig({ ...config, [useCase.id]: value })}
                    >
                      <SelectTrigger className="w-full sm:w-[280px] bg-background border-border">
                        <SelectValue placeholder="Seleziona modello..." />
                      </SelectTrigger>
                      <SelectContent className="max-h-[300px]">
                        {models.map((model) => (
                          <SelectItem
                            key={model.id}
                            value={model.modelId}
                            className="py-2.5"
                          >
                            <div className="flex items-center gap-2">
                              <span className="font-medium">{model.displayName}</span>
                              {isRecommended(useCase.id, model.modelId) && (
                                <Sparkles className="h-3.5 w-3.5 text-amber-500 flex-shrink-0" />
                              )}
                            </div>
                          </SelectItem>
                        ))}
                      </SelectContent>
                    </Select>

                    {/* Model Stats Badge */}
                    {selectedModel && (
                      <div className="flex items-center gap-3 text-xs text-muted-foreground bg-muted/50 px-4 py-2.5 rounded-lg border border-border/50">
                        <div className="flex items-center gap-1.5">
                          <Cpu className="h-3.5 w-3.5" />
                          <span className="font-mono">{(selectedModel.maxTokens / 1000).toFixed(0)}K</span>
                        </div>
                        <div className="w-px h-4 bg-border" />
                        <div className="flex items-center gap-1.5">
                          <Coins className="h-3.5 w-3.5" />
                          <span className="font-mono">${selectedModel.inputCostPer1M.toFixed(2)}</span>
                        </div>
                      </div>
                    )}
                  </div>
                </div>
              </CardContent>
            </Card>
          );
        })}
      </div>

      {/* Budget Controls */}
      <Card className="border bg-card">
        <CardHeader className="pb-4">
          <div className="flex items-center gap-3">
            <div className="w-10 h-10 rounded-xl bg-emerald-500/10 flex items-center justify-center">
              <Coins className="h-5 w-5 text-emerald-600" />
            </div>
            <div>
              <CardTitle className="text-lg">Controllo Budget</CardTitle>
              <CardDescription>Limiti di spesa per l&apos;utilizzo AI</CardDescription>
            </div>
          </div>
        </CardHeader>
        <CardContent className="space-y-6">
          <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
            <div className="space-y-2">
              <Label htmlFor="dailyBudget" className="text-sm font-medium">
                Limite Giornaliero
              </Label>
              <div className="relative">
                <span className="absolute left-3 top-1/2 -translate-y-1/2 text-muted-foreground text-sm font-medium">$</span>
                <Input
                  id="dailyBudget"
                  type="number"
                  min="0"
                  step="10"
                  value={config.dailyBudgetLimit}
                  onChange={(e) =>
                    setConfig({ ...config, dailyBudgetLimit: parseFloat(e.target.value) || 0 })
                  }
                  className="pl-7 bg-background"
                />
              </div>
            </div>

            <div className="space-y-2">
              <Label htmlFor="monthlyBudget" className="text-sm font-medium">
                Limite Mensile
              </Label>
              <div className="relative">
                <span className="absolute left-3 top-1/2 -translate-y-1/2 text-muted-foreground text-sm font-medium">$</span>
                <Input
                  id="monthlyBudget"
                  type="number"
                  min="0"
                  step="50"
                  value={config.monthlyBudgetLimit}
                  onChange={(e) =>
                    setConfig({ ...config, monthlyBudgetLimit: parseFloat(e.target.value) || 0 })
                  }
                  className="pl-7 bg-background"
                />
              </div>
            </div>

            <div className="space-y-2">
              <Label htmlFor="alertThreshold" className="text-sm font-medium">
                Soglia Alert
              </Label>
              <div className="relative">
                <Input
                  id="alertThreshold"
                  type="number"
                  min="0"
                  max="100"
                  step="5"
                  value={config.alertThreshold * 100}
                  onChange={(e) =>
                    setConfig({ ...config, alertThreshold: (parseFloat(e.target.value) || 0) / 100 })
                  }
                  className="pr-8 bg-background"
                />
                <span className="absolute right-3 top-1/2 -translate-y-1/2 text-muted-foreground text-sm font-medium">%</span>
              </div>
            </div>
          </div>

          <div className="flex items-center gap-3 p-4 rounded-xl bg-amber-500/5 border border-amber-500/20">
            <div className="w-8 h-8 rounded-lg bg-amber-500/10 flex items-center justify-center flex-shrink-0">
              <Zap className="h-4 w-4 text-amber-600" />
            </div>
            <span className="text-sm text-muted-foreground">
              Riceverai un alert quando raggiungi il <strong className="text-foreground">{(config.alertThreshold * 100).toFixed(0)}%</strong> del budget configurato
            </span>
          </div>
        </CardContent>
      </Card>

      {/* Save Button */}
      <div className="flex justify-end pt-2">
        <Button onClick={handleSave} disabled={loading} size="lg" className="min-w-[180px]">
          {loading ? (
            <>
              <Loader2 className="mr-2 h-4 w-4 animate-spin" />
              Salvataggio...
            </>
          ) : (
            <>
              <Save className="mr-2 h-4 w-4" />
              Salva Configurazione
            </>
          )}
        </Button>
      </div>
    </div>
  );
}
