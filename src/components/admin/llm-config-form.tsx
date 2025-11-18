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
import { Loader2, Save, Sparkles } from 'lucide-react';
import { OPENROUTER_MODELS } from '@/lib/ai/openrouter';

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
    id: 'onboardingModelId',
    label: 'Onboarding Conversazionale',
    description: 'Chat AI per setup iniziale azienda',
    icon: '💬',
  },
  {
    id: 'constraintModelId',
    label: 'Estrazione Vincoli',
    description: 'Estrae regole business da testo naturale',
    icon: '🔍',
  },
  {
    id: 'explanationModelId',
    label: 'Spiegazioni Scheduling',
    description: 'Spiega decisioni AI nella generazione turni',
    icon: '📝',
  },
  {
    id: 'validationModelId',
    label: 'Validazione Turni',
    description: 'Verifica correttezza schedule generati',
    icon: '✅',
  },
] as const;

// Modelli consigliati per caso d'uso
const RECOMMENDED_MODELS = {
  onboardingModelId: ['x-ai/grok-4-fast', 'anthropic/claude-3.5-sonnet', 'openai/gpt-4o'],
  constraintModelId: ['anthropic/claude-3.5-sonnet', 'openai/gpt-4o', 'x-ai/grok-4-fast'],
  explanationModelId: ['openai/gpt-4o-mini', 'anthropic/claude-3-haiku', 'x-ai/grok-4-fast'],
  validationModelId: ['anthropic/claude-3.5-sonnet', 'openai/gpt-4o', 'x-ai/grok-4-fast'],
};

export function LlmConfigForm() {
  const { toast } = useToast();
  const [loading, setLoading] = useState(false);
  const [initialLoading, setInitialLoading] = useState(true);
  const [models, setModels] = useState<LlmModel[]>([]);
  const [config, setConfig] = useState<LlmConfig>({
    onboardingModelId: 'x-ai/grok-4-fast',
    constraintModelId: 'x-ai/grok-4-fast',
    explanationModelId: 'x-ai/grok-4-fast',
    validationModelId: 'x-ai/grok-4-fast',
    dailyBudgetLimit: 50,
    monthlyBudgetLimit: 500,
    alertThreshold: 0.8,
  });
  const hasLoaded = useRef(false);

  // Carica configurazione e modelli da API
  useEffect(() => {
    // Previeni doppio caricamento in React StrictMode
    if (hasLoaded.current) return;
    hasLoaded.current = true;

    const loadData = async () => {
      try {
        setInitialLoading(true);
        const response = await fetch('/api/admin/llm-config');

        if (!response.ok) {
          throw new Error('Errore nel caricamento della configurazione');
        }

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
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, []); // Esegui solo al mount

  const handleSave = async () => {
    setLoading(true);
    try {
      const response = await fetch('/api/admin/llm-config', {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
        },
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
        description: error instanceof Error ? error.message : 'Impossibile salvare la configurazione.',
        variant: 'destructive',
      });
    } finally {
      setLoading(false);
    }
  };

  const getModelById = (modelId: string) => {
    return models.find((m) => m.modelId === modelId);
  };

  const isRecommended = (useCase: string, modelId: string) => {
    return RECOMMENDED_MODELS[useCase as keyof typeof RECOMMENDED_MODELS]?.includes(modelId);
  };

  if (initialLoading) {
    return (
      <div className="flex items-center justify-center py-12">
        <Loader2 className="h-8 w-8 animate-spin text-muted-foreground" />
        <span className="ml-3 text-muted-foreground">Caricamento configurazione...</span>
      </div>
    );
  }

  return (
    <div className="space-y-6">
      {/* Model Selection */}
      <Card>
        <CardHeader>
          <CardTitle>Selezione Modelli per Caso d&apos;Uso</CardTitle>
          <CardDescription>
            Assegna il modello LLM ottimale per ogni funzionalità AI del sistema
          </CardDescription>
        </CardHeader>
        <CardContent className="space-y-6">
          {USE_CASES.map((useCase) => {
            const selectedModel = getModelById(config[useCase.id]);

            return (
              <div key={useCase.id} className="space-y-3">
                <div className="flex items-start justify-between">
                  <div className="space-y-1">
                    <Label htmlFor={useCase.id} className="text-base font-medium flex items-center gap-2">
                      <span className="text-xl">{useCase.icon}</span>
                      {useCase.label}
                    </Label>
                    <p className="text-sm text-muted-foreground">{useCase.description}</p>
                  </div>
                  {selectedModel && (
                    <Badge variant="outline" className="ml-4">
                      €{selectedModel.inputCostPer1M.toFixed(2)}/€{selectedModel.outputCostPer1M.toFixed(2)} per 1M
                    </Badge>
                  )}
                </div>

                <Select
                  value={config[useCase.id]}
                  onValueChange={(value) => setConfig({ ...config, [useCase.id]: value })}
                >
                  <SelectTrigger id={useCase.id} className="w-full">
                    <SelectValue placeholder="Seleziona modello..." />
                  </SelectTrigger>
                  <SelectContent>
                    {models.map((model) => (
                      <SelectItem key={model.id} value={model.modelId}>
                        <div className="flex items-center justify-between w-full gap-4">
                          <span className="font-medium">{model.displayName}</span>
                          <div className="flex items-center gap-2 text-xs text-muted-foreground">
                            {isRecommended(useCase.id, model.modelId) && (
                              <Badge variant="secondary" className="text-xs">
                                <Sparkles className="h-3 w-3 mr-1" />
                                Consigliato
                              </Badge>
                            )}
                            <span>
                              {model.maxTokens.toLocaleString()} tokens
                            </span>
                          </div>
                        </div>
                      </SelectItem>
                    ))}
                  </SelectContent>
                </Select>
              </div>
            );
          })}
        </CardContent>
      </Card>

      {/* Budget Controls */}
      <Card>
        <CardHeader>
          <CardTitle>Controllo Budget</CardTitle>
          <CardDescription>
            Imposta limiti di spesa giornalieri e mensili per l&apos;utilizzo AI
          </CardDescription>
        </CardHeader>
        <CardContent className="space-y-4">
          <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
            <div className="space-y-2">
              <Label htmlFor="dailyBudget">Limite Giornaliero (€)</Label>
              <Input
                id="dailyBudget"
                type="number"
                min="0"
                step="10"
                value={config.dailyBudgetLimit}
                onChange={(e) =>
                  setConfig({ ...config, dailyBudgetLimit: parseFloat(e.target.value) })
                }
              />
              <p className="text-xs text-muted-foreground">
                Budget massimo giornaliero per chiamate AI
              </p>
            </div>

            <div className="space-y-2">
              <Label htmlFor="monthlyBudget">Limite Mensile (€)</Label>
              <Input
                id="monthlyBudget"
                type="number"
                min="0"
                step="50"
                value={config.monthlyBudgetLimit}
                onChange={(e) =>
                  setConfig({ ...config, monthlyBudgetLimit: parseFloat(e.target.value) })
                }
              />
              <p className="text-xs text-muted-foreground">
                Budget massimo mensile per chiamate AI
              </p>
            </div>
          </div>

          <div className="space-y-2">
            <Label htmlFor="alertThreshold">Soglia Alert (%)</Label>
            <div className="flex items-center gap-4">
              <Input
                id="alertThreshold"
                type="number"
                min="0"
                max="100"
                step="5"
                value={config.alertThreshold * 100}
                onChange={(e) =>
                  setConfig({ ...config, alertThreshold: parseFloat(e.target.value) / 100 })
                }
                className="w-32"
              />
              <span className="text-sm text-muted-foreground">
                Ricevi alert quando raggiungi {(config.alertThreshold * 100).toFixed(0)}% del budget
              </span>
            </div>
          </div>
        </CardContent>
      </Card>

      {/* Save Button */}
      <div className="flex justify-end">
        <Button onClick={handleSave} disabled={loading} size="lg">
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
