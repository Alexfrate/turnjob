'use client';

import { useState, useEffect } from 'react';
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { Badge } from '@/components/ui/badge';
import { Textarea } from '@/components/ui/textarea';
import { Label } from '@/components/ui/label';
import { Slider } from '@/components/ui/slider';
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from '@/components/ui/select';
import { useToast } from '@/hooks/use-toast';
import {
  Loader2,
  Play,
  Zap,
  Clock,
  DollarSign,
  Bot,
  User,
  Copy,
  CheckCheck,
  FlaskConical,
  Settings2,
  MessageSquare,
} from 'lucide-react';

interface LlmModel {
  id: string;
  modelId: string;
  displayName: string;
  inputCostPer1M: number;
  outputCostPer1M: number;
  maxTokens: number;
}

interface SystemPrompt {
  id: string;
  useCase: string;
  name: string;
  promptTemplate: string;
}

interface TestResult {
  response: string;
  stats: {
    modelId: string;
    inputTokens: number;
    outputTokens: number;
    totalTokens: number;
    estimatedCost: number;
    responseTimeMs: number;
    finishReason: string;
  };
}

/**
 * Tab Sandbox - Test modelli AI in ambiente controllato
 */
export function SandboxTab() {
  const { toast } = useToast();
  const [loading, setLoading] = useState(true);
  const [testing, setTesting] = useState(false);
  const [copied, setCopied] = useState(false);

  // Data
  const [models, setModels] = useState<LlmModel[]>([]);
  const [prompts, setPrompts] = useState<SystemPrompt[]>([]);

  // Form state
  const [selectedModel, setSelectedModel] = useState('');
  const [selectedPromptId, setSelectedPromptId] = useState('custom');
  const [customSystemPrompt, setCustomSystemPrompt] = useState('');
  const [userMessage, setUserMessage] = useState('');
  const [temperature, setTemperature] = useState(0.7);
  const [maxTokens, setMaxTokens] = useState(1000);

  // Result
  const [result, setResult] = useState<TestResult | null>(null);

  useEffect(() => {
    loadData();
  }, []);

  const loadData = async () => {
    try {
      setLoading(true);

      // Carica modelli e prompts in parallelo
      const [modelsRes, promptsRes] = await Promise.all([
        fetch('/api/admin/llm-config'),
        fetch('/api/admin/ai-prompts'),
      ]);

      const modelsData = await modelsRes.json();
      const promptsData = await promptsRes.json();

      if (modelsData.success) {
        setModels(modelsData.models);
        if (modelsData.models.length > 0) {
          setSelectedModel(modelsData.models[0].modelId);
        }
      }

      if (promptsData.success) {
        setPrompts(promptsData.prompts);
      }
    } catch (error) {
      console.error('Error loading data:', error);
      toast({
        title: 'Errore',
        description: 'Impossibile caricare i dati',
        variant: 'destructive',
      });
    } finally {
      setLoading(false);
    }
  };

  const handlePromptSelect = (promptId: string) => {
    setSelectedPromptId(promptId);
    if (promptId !== 'custom') {
      const prompt = prompts.find(p => p.id === promptId);
      if (prompt) {
        setCustomSystemPrompt(prompt.promptTemplate);
      }
    } else {
      setCustomSystemPrompt('');
    }
  };

  const handleTest = async () => {
    if (!selectedModel) {
      toast({
        title: 'Errore',
        description: 'Seleziona un modello',
        variant: 'destructive',
      });
      return;
    }

    if (!userMessage.trim()) {
      toast({
        title: 'Errore',
        description: 'Inserisci un messaggio di test',
        variant: 'destructive',
      });
      return;
    }

    setTesting(true);
    setResult(null);

    try {
      const response = await fetch('/api/admin/ai-test', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          modelId: selectedModel,
          systemPrompt: customSystemPrompt || undefined,
          userMessage,
          temperature,
          maxTokens,
        }),
      });

      const data = await response.json();

      if (data.success) {
        setResult({
          response: data.response,
          stats: data.stats,
        });
        toast({
          title: 'Test completato',
          description: `Risposta ricevuta in ${data.stats.responseTimeMs}ms`,
        });
      } else {
        throw new Error(data.error || 'Errore nel test');
      }
    } catch (error) {
      console.error('Error running test:', error);
      toast({
        title: 'Errore',
        description: error instanceof Error ? error.message : 'Impossibile eseguire il test',
        variant: 'destructive',
      });
    } finally {
      setTesting(false);
    }
  };

  const copyResponse = async () => {
    if (result?.response) {
      await navigator.clipboard.writeText(result.response);
      setCopied(true);
      setTimeout(() => setCopied(false), 2000);
    }
  };

  if (loading) {
    return (
      <div className="flex items-center justify-center py-16">
        <div className="flex flex-col items-center gap-3">
          <Loader2 className="h-8 w-8 animate-spin text-primary" />
          <span className="text-sm text-muted-foreground">Caricamento sandbox...</span>
        </div>
      </div>
    );
  }

  return (
    <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
      {/* Left - Input */}
      <div className="space-y-4">
        <Card className="border bg-card">
          <CardHeader className="pb-4">
            <div className="flex items-center gap-3">
              <div className="w-10 h-10 rounded-lg bg-violet-500/10 flex items-center justify-center">
                <FlaskConical className="h-5 w-5 text-violet-600" />
              </div>
              <div>
                <CardTitle className="text-lg">Configurazione Test</CardTitle>
                <CardDescription>
                  Testa i modelli AI prima di usarli in produzione
                </CardDescription>
              </div>
            </div>
          </CardHeader>
          <CardContent className="space-y-6">
            {/* Model Selection */}
            <div className="space-y-2">
              <Label className="text-sm font-medium">Modello</Label>
              <Select value={selectedModel} onValueChange={setSelectedModel}>
                <SelectTrigger className="bg-background">
                  <SelectValue placeholder="Seleziona modello..." />
                </SelectTrigger>
                <SelectContent>
                  {models.map((model) => (
                    <SelectItem key={model.id} value={model.modelId}>
                      <div className="flex items-center justify-between w-full gap-4">
                        <span className="font-medium">{model.displayName}</span>
                        <span className="text-xs text-muted-foreground">
                          {(model.maxTokens / 1000).toFixed(0)}K max
                        </span>
                      </div>
                    </SelectItem>
                  ))}
                </SelectContent>
              </Select>
            </div>

            {/* System Prompt Selection */}
            <div className="space-y-2">
              <Label className="text-sm font-medium">System Prompt</Label>
              <Select value={selectedPromptId} onValueChange={handlePromptSelect}>
                <SelectTrigger className="bg-background">
                  <SelectValue placeholder="Seleziona prompt..." />
                </SelectTrigger>
                <SelectContent>
                  <SelectItem value="custom">✏️ Personalizzato</SelectItem>
                  {prompts.map((prompt) => (
                    <SelectItem key={prompt.id} value={prompt.id}>
                      {prompt.name}
                    </SelectItem>
                  ))}
                </SelectContent>
              </Select>
            </div>

            {/* Custom System Prompt */}
            <div className="space-y-2">
              <Label className="text-sm font-medium">
                System Prompt {selectedPromptId !== 'custom' && <span className="text-muted-foreground">(dal template)</span>}
              </Label>
              <Textarea
                value={customSystemPrompt}
                onChange={(e) => setCustomSystemPrompt(e.target.value)}
                placeholder="Inserisci il system prompt (opzionale)..."
                className="min-h-[120px] font-mono text-sm bg-background"
              />
            </div>

            {/* User Message */}
            <div className="space-y-2">
              <Label className="text-sm font-medium">
                Messaggio di Test <span className="text-red-500">*</span>
              </Label>
              <Textarea
                value={userMessage}
                onChange={(e) => setUserMessage(e.target.value)}
                placeholder="Inserisci il messaggio da inviare al modello..."
                className="min-h-[100px] bg-background"
              />
            </div>

            {/* Parameters */}
            <div className="grid grid-cols-1 sm:grid-cols-2 gap-6">
              <div className="space-y-3">
                <div className="flex items-center justify-between">
                  <Label className="text-sm font-medium">Temperature</Label>
                  <Badge variant="outline" className="font-mono">{temperature}</Badge>
                </div>
                <Slider
                  value={[temperature]}
                  onValueChange={(values: number[]) => setTemperature(values[0])}
                  min={0}
                  max={2}
                  step={0.1}
                />
                <p className="text-xs text-muted-foreground">
                  0 = deterministico, 2 = creativo
                </p>
              </div>
              <div className="space-y-3">
                <div className="flex items-center justify-between">
                  <Label className="text-sm font-medium">Max Tokens</Label>
                  <Badge variant="outline" className="font-mono">{maxTokens}</Badge>
                </div>
                <Slider
                  value={[maxTokens]}
                  onValueChange={(values: number[]) => setMaxTokens(values[0])}
                  min={100}
                  max={4000}
                  step={100}
                />
                <p className="text-xs text-muted-foreground">
                  Lunghezza massima risposta
                </p>
              </div>
            </div>

            {/* Run Button */}
            <Button
              onClick={handleTest}
              disabled={testing || !selectedModel || !userMessage.trim()}
              className="w-full"
              size="lg"
            >
              {testing ? (
                <>
                  <Loader2 className="h-4 w-4 mr-2 animate-spin" />
                  Esecuzione test...
                </>
              ) : (
                <>
                  <Play className="h-4 w-4 mr-2" />
                  Esegui Test
                </>
              )}
            </Button>
          </CardContent>
        </Card>
      </div>

      {/* Right - Output */}
      <div className="space-y-4">
        {result ? (
          <>
            {/* Stats */}
            <div className="grid grid-cols-2 md:grid-cols-4 gap-3">
              <Card className="border bg-card">
                <CardContent className="p-4">
                  <div className="flex items-center gap-2 text-muted-foreground mb-1">
                    <Zap className="h-4 w-4" />
                    <span className="text-xs font-medium">Token</span>
                  </div>
                  <p className="text-xl font-bold">{result.stats.totalTokens}</p>
                  <p className="text-xs text-muted-foreground mt-0.5">
                    {result.stats.inputTokens} / {result.stats.outputTokens}
                  </p>
                </CardContent>
              </Card>
              <Card className="border bg-card">
                <CardContent className="p-4">
                  <div className="flex items-center gap-2 text-muted-foreground mb-1">
                    <Clock className="h-4 w-4" />
                    <span className="text-xs font-medium">Tempo</span>
                  </div>
                  <p className="text-xl font-bold">{result.stats.responseTimeMs}ms</p>
                </CardContent>
              </Card>
              <Card className="border bg-card">
                <CardContent className="p-4">
                  <div className="flex items-center gap-2 text-muted-foreground mb-1">
                    <DollarSign className="h-4 w-4" />
                    <span className="text-xs font-medium">Costo</span>
                  </div>
                  <p className="text-xl font-bold">${result.stats.estimatedCost.toFixed(6)}</p>
                </CardContent>
              </Card>
              <Card className="border bg-card">
                <CardContent className="p-4">
                  <div className="flex items-center gap-2 text-muted-foreground mb-1">
                    <Settings2 className="h-4 w-4" />
                    <span className="text-xs font-medium">Stato</span>
                  </div>
                  <Badge variant="outline" className="mt-1 font-mono text-xs">
                    {result.stats.finishReason}
                  </Badge>
                </CardContent>
              </Card>
            </div>

            {/* Response */}
            <Card className="border bg-card">
              <CardHeader className="pb-3">
                <div className="flex items-center justify-between">
                  <div className="flex items-center gap-2">
                    <div className="w-8 h-8 rounded-lg bg-emerald-500/10 flex items-center justify-center">
                      <Bot className="h-4 w-4 text-emerald-600" />
                    </div>
                    <div>
                      <CardTitle className="text-base">Risposta AI</CardTitle>
                      <CardDescription className="font-mono text-xs">
                        {result.stats.modelId}
                      </CardDescription>
                    </div>
                  </div>
                  <Button variant="ghost" size="sm" onClick={copyResponse} className="h-8 w-8 p-0">
                    {copied ? (
                      <CheckCheck className="h-4 w-4 text-emerald-600" />
                    ) : (
                      <Copy className="h-4 w-4" />
                    )}
                  </Button>
                </div>
              </CardHeader>
              <CardContent>
                <div className="bg-muted/50 rounded-lg p-4 max-h-[400px] overflow-y-auto border">
                  <pre className="whitespace-pre-wrap text-sm">{result.response}</pre>
                </div>
              </CardContent>
            </Card>

            {/* Request Preview */}
            <Card className="border bg-card">
              <CardHeader className="pb-3">
                <div className="flex items-center gap-2">
                  <div className="w-8 h-8 rounded-lg bg-blue-500/10 flex items-center justify-center">
                    <MessageSquare className="h-4 w-4 text-blue-600" />
                  </div>
                  <CardTitle className="text-base">Messaggio Inviato</CardTitle>
                </div>
              </CardHeader>
              <CardContent>
                <div className="space-y-3">
                  {customSystemPrompt && (
                    <div className="bg-violet-500/5 border border-violet-500/20 rounded-lg p-3">
                      <Badge variant="outline" className="mb-2 text-xs">System</Badge>
                      <p className="text-sm text-muted-foreground line-clamp-3">{customSystemPrompt}</p>
                    </div>
                  )}
                  <div className="bg-muted/50 rounded-lg p-3 border">
                    <Badge variant="outline" className="mb-2 text-xs">User</Badge>
                    <p className="text-sm">{userMessage}</p>
                  </div>
                </div>
              </CardContent>
            </Card>
          </>
        ) : (
          <Card className="h-full min-h-[500px] flex items-center justify-center border bg-card">
            <CardContent className="text-center py-16">
              <div className="w-16 h-16 rounded-2xl bg-muted/50 flex items-center justify-center mx-auto mb-4">
                <Bot className="h-8 w-8 text-muted-foreground" />
              </div>
              <h3 className="text-lg font-semibold mb-2">Sandbox AI</h3>
              <p className="text-muted-foreground max-w-sm mx-auto">
                Configura un modello e un messaggio, poi clicca &quot;Esegui Test&quot; per vedere la risposta AI
              </p>
            </CardContent>
          </Card>
        )}
      </div>
    </div>
  );
}
