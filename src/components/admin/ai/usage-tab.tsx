'use client';

import { useState, useEffect } from 'react';
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card';
import { Badge } from '@/components/ui/badge';
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from '@/components/ui/select';
import {
  Table,
  TableBody,
  TableCell,
  TableHead,
  TableHeader,
  TableRow,
} from '@/components/ui/table';
import { useToast } from '@/hooks/use-toast';
import {
  Loader2,
  TrendingUp,
  DollarSign,
  Zap,
  Clock,
  CheckCircle,
  XCircle,
  Activity,
  BarChart3,
  Cpu,
  Calendar,
  MessageSquare,
  Search,
  FileText,
  CheckCircle2,
  File,
  type LucideIcon,
} from 'lucide-react';

interface UsageStats {
  success: boolean;
  period: string;
  summary: {
    totalCalls: number;
    totalInputTokens: number;
    totalOutputTokens: number;
    totalTokens: number;
    totalCost: number;
    avgResponseTime: number;
    successRate: number;
  };
  byUseCase: Array<{
    useCase: string;
    calls: number;
    inputTokens: number;
    outputTokens: number;
    cost: number;
    avgResponseTime: number;
  }>;
  byModel: Array<{
    model: string;
    calls: number;
    inputTokens: number;
    outputTokens: number;
    cost: number;
  }>;
  dailyStats: Array<{
    date: string;
    calls: number;
    tokens: number;
    cost: number;
  }>;
  recentLogs: Array<{
    id: string;
    useCase: string;
    modelId: string;
    inputTokens: number;
    outputTokens: number;
    costUsd: string;
    responseTimeMs: number;
    success: boolean;
    createdAt: string;
  }>;
}

const USE_CASE_LABELS: Record<string, { label: string; icon: LucideIcon; color: string }> = {
  planning_chat: { label: 'Chat Pianificazione', icon: Calendar, color: 'bg-blue-500/10 text-blue-600' },
  onboarding: { label: 'Onboarding', icon: MessageSquare, color: 'bg-violet-500/10 text-violet-600' },
  constraint_extraction: { label: 'Estrazione Vincoli', icon: Search, color: 'bg-amber-500/10 text-amber-600' },
  explanation: { label: 'Spiegazioni', icon: FileText, color: 'bg-emerald-500/10 text-emerald-600' },
  validation: { label: 'Validazione', icon: CheckCircle2, color: 'bg-sky-500/10 text-sky-600' },
  unknown: { label: 'Altro', icon: File, color: 'bg-slate-500/10 text-slate-600' },
};

const PERIOD_OPTIONS = [
  { value: 'day', label: 'Oggi' },
  { value: 'week', label: 'Ultima settimana' },
  { value: 'month', label: 'Ultimo mese' },
  { value: 'all', label: 'Tutto' },
];

function formatNumber(num: number): string {
  if (num >= 1000000) return `${(num / 1000000).toFixed(1)}M`;
  if (num >= 1000) return `${(num / 1000).toFixed(1)}K`;
  return num.toString();
}

function formatCurrency(amount: number): string {
  return `$${amount.toFixed(4)}`;
}

function formatDate(dateString: string): string {
  return new Date(dateString).toLocaleString('it-IT', {
    day: '2-digit',
    month: '2-digit',
    hour: '2-digit',
    minute: '2-digit',
  });
}

/**
 * Tab Monitoraggio - Statistiche utilizzo AI
 */
export function UsageTab() {
  const { toast } = useToast();
  const [loading, setLoading] = useState(true);
  const [period, setPeriod] = useState('month');
  const [stats, setStats] = useState<UsageStats | null>(null);

  useEffect(() => {
    const loadStats = async () => {
      try {
        setLoading(true);
        const response = await fetch(`/api/admin/ai-usage?period=${period}`);
        const data = await response.json();

        if (data.success) {
          setStats(data);
        } else {
          throw new Error(data.error || 'Errore nel caricamento');
        }
      } catch (error) {
        console.error('Error loading usage stats:', error);
        toast({
          title: 'Errore',
          description: 'Impossibile caricare le statistiche',
          variant: 'destructive',
        });
      } finally {
        setLoading(false);
      }
    };

    loadStats();
  }, [period, toast]);

  if (loading) {
    return (
      <div className="flex items-center justify-center py-16">
        <div className="flex flex-col items-center gap-3">
          <Loader2 className="h-8 w-8 animate-spin text-primary" />
          <span className="text-sm text-muted-foreground">Caricamento statistiche...</span>
        </div>
      </div>
    );
  }

  if (!stats) {
    return (
      <Card className="border bg-card">
        <CardContent className="py-16 text-center">
          <BarChart3 className="h-12 w-12 mx-auto text-muted-foreground mb-4" />
          <p className="text-muted-foreground">Nessun dato disponibile</p>
        </CardContent>
      </Card>
    );
  }

  return (
    <div className="space-y-6">
      {/* Header with Period Selector */}
      <div className="flex flex-col sm:flex-row justify-between items-start sm:items-center gap-4">
        <div className="flex items-center gap-3">
          <div className="w-10 h-10 rounded-lg bg-blue-500/10 flex items-center justify-center">
            <BarChart3 className="h-5 w-5 text-blue-600" />
          </div>
          <div>
            <h3 className="text-lg font-semibold text-foreground">Monitoraggio AI</h3>
            <p className="text-sm text-muted-foreground">
              Statistiche di utilizzo e costi
            </p>
          </div>
        </div>
        <Select value={period} onValueChange={setPeriod}>
          <SelectTrigger className="w-[180px] bg-background">
            <SelectValue placeholder="Seleziona periodo" />
          </SelectTrigger>
          <SelectContent>
            {PERIOD_OPTIONS.map((opt) => (
              <SelectItem key={opt.value} value={opt.value}>
                {opt.label}
              </SelectItem>
            ))}
          </SelectContent>
        </Select>
      </div>

      {/* Summary Cards */}
      <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-4">
        <Card className="border bg-card">
          <CardContent className="p-5">
            <div className="flex items-center justify-between">
              <div>
                <p className="text-sm font-medium text-muted-foreground">Chiamate Totali</p>
                <p className="text-2xl font-bold text-foreground mt-1">
                  {formatNumber(stats.summary.totalCalls)}
                </p>
                <p className="text-xs text-muted-foreground mt-1">
                  {stats.summary.successRate.toFixed(1)}% successo
                </p>
              </div>
              <div className="w-10 h-10 rounded-lg bg-violet-500/10 flex items-center justify-center">
                <Activity className="h-5 w-5 text-violet-600" />
              </div>
            </div>
          </CardContent>
        </Card>

        <Card className="border bg-card">
          <CardContent className="p-5">
            <div className="flex items-center justify-between">
              <div>
                <p className="text-sm font-medium text-muted-foreground">Token Utilizzati</p>
                <p className="text-2xl font-bold text-foreground mt-1">
                  {formatNumber(stats.summary.totalTokens)}
                </p>
                <p className="text-xs text-muted-foreground mt-1">
                  {formatNumber(stats.summary.totalInputTokens)} in / {formatNumber(stats.summary.totalOutputTokens)} out
                </p>
              </div>
              <div className="w-10 h-10 rounded-lg bg-amber-500/10 flex items-center justify-center">
                <Zap className="h-5 w-5 text-amber-600" />
              </div>
            </div>
          </CardContent>
        </Card>

        <Card className="border bg-card">
          <CardContent className="p-5">
            <div className="flex items-center justify-between">
              <div>
                <p className="text-sm font-medium text-muted-foreground">Costo Totale</p>
                <p className="text-2xl font-bold text-foreground mt-1">
                  {formatCurrency(stats.summary.totalCost)}
                </p>
                <p className="text-xs text-muted-foreground mt-1">
                  ~{formatCurrency(stats.summary.totalCost / (stats.summary.totalCalls || 1))} / chiamata
                </p>
              </div>
              <div className="w-10 h-10 rounded-lg bg-emerald-500/10 flex items-center justify-center">
                <DollarSign className="h-5 w-5 text-emerald-600" />
              </div>
            </div>
          </CardContent>
        </Card>

        <Card className="border bg-card">
          <CardContent className="p-5">
            <div className="flex items-center justify-between">
              <div>
                <p className="text-sm font-medium text-muted-foreground">Tempo Medio</p>
                <p className="text-2xl font-bold text-foreground mt-1">
                  {stats.summary.avgResponseTime}ms
                </p>
                <p className="text-xs text-muted-foreground mt-1">
                  Tempo risposta medio
                </p>
              </div>
              <div className="w-10 h-10 rounded-lg bg-sky-500/10 flex items-center justify-center">
                <Clock className="h-5 w-5 text-sky-600" />
              </div>
            </div>
          </CardContent>
        </Card>
      </div>

      {/* Usage by Use Case */}
      <Card className="border bg-card">
        <CardHeader className="pb-4">
          <div className="flex items-center gap-2">
            <div className="w-8 h-8 rounded-lg bg-primary/10 flex items-center justify-center">
              <TrendingUp className="h-4 w-4 text-primary" />
            </div>
            <div>
              <CardTitle className="text-lg">Utilizzo per Funzionalità</CardTitle>
              <CardDescription>Dettaglio chiamate AI per tipo di operazione</CardDescription>
            </div>
          </div>
        </CardHeader>
        <CardContent>
          {stats.byUseCase.length === 0 ? (
            <div className="text-center py-8">
              <Activity className="h-10 w-10 mx-auto text-muted-foreground mb-3" />
              <p className="text-muted-foreground">Nessun dato di utilizzo disponibile</p>
            </div>
          ) : (
            <div className="overflow-x-auto">
              <Table>
                <TableHeader>
                  <TableRow className="hover:bg-transparent">
                    <TableHead className="font-semibold">Funzionalità</TableHead>
                    <TableHead className="text-right font-semibold">Chiamate</TableHead>
                    <TableHead className="text-right font-semibold">Token</TableHead>
                    <TableHead className="text-right font-semibold">Costo</TableHead>
                    <TableHead className="text-right font-semibold">Tempo</TableHead>
                  </TableRow>
                </TableHeader>
                <TableBody>
                  {stats.byUseCase.map((item) => {
                    const useCaseInfo = USE_CASE_LABELS[item.useCase] || USE_CASE_LABELS.unknown;
                    const IconComponent = useCaseInfo.icon;
                    return (
                      <TableRow key={item.useCase} className="hover:bg-muted/50">
                        <TableCell>
                          <div className="flex items-center gap-3">
                            <div className={`w-8 h-8 rounded-lg ${useCaseInfo.color} flex items-center justify-center`}>
                              <IconComponent className="h-4 w-4" />
                            </div>
                            <span className="font-medium">{useCaseInfo.label}</span>
                          </div>
                        </TableCell>
                        <TableCell className="text-right font-mono">{item.calls}</TableCell>
                        <TableCell className="text-right font-mono">
                          {formatNumber(item.inputTokens + item.outputTokens)}
                        </TableCell>
                        <TableCell className="text-right font-mono">{formatCurrency(item.cost)}</TableCell>
                        <TableCell className="text-right font-mono">{item.avgResponseTime}ms</TableCell>
                      </TableRow>
                    );
                  })}
                </TableBody>
              </Table>
            </div>
          )}
        </CardContent>
      </Card>

      {/* Usage by Model */}
      <Card className="border bg-card">
        <CardHeader className="pb-4">
          <div className="flex items-center gap-2">
            <div className="w-8 h-8 rounded-lg bg-orange-500/10 flex items-center justify-center">
              <Cpu className="h-4 w-4 text-orange-600" />
            </div>
            <div>
              <CardTitle className="text-lg">Utilizzo per Modello</CardTitle>
              <CardDescription>Dettaglio chiamate AI per modello LLM</CardDescription>
            </div>
          </div>
        </CardHeader>
        <CardContent>
          {stats.byModel.length === 0 ? (
            <div className="text-center py-8">
              <Cpu className="h-10 w-10 mx-auto text-muted-foreground mb-3" />
              <p className="text-muted-foreground">Nessun dato disponibile</p>
            </div>
          ) : (
            <div className="overflow-x-auto">
              <Table>
                <TableHeader>
                  <TableRow className="hover:bg-transparent">
                    <TableHead className="font-semibold">Modello</TableHead>
                    <TableHead className="text-right font-semibold">Chiamate</TableHead>
                    <TableHead className="text-right font-semibold">Token In</TableHead>
                    <TableHead className="text-right font-semibold">Token Out</TableHead>
                    <TableHead className="text-right font-semibold">Costo</TableHead>
                  </TableRow>
                </TableHeader>
                <TableBody>
                  {stats.byModel.map((item) => (
                    <TableRow key={item.model} className="hover:bg-muted/50">
                      <TableCell>
                        <Badge variant="outline" className="font-mono text-xs">
                          {item.model}
                        </Badge>
                      </TableCell>
                      <TableCell className="text-right font-mono">{item.calls}</TableCell>
                      <TableCell className="text-right font-mono">{formatNumber(item.inputTokens)}</TableCell>
                      <TableCell className="text-right font-mono">{formatNumber(item.outputTokens)}</TableCell>
                      <TableCell className="text-right font-mono">{formatCurrency(item.cost)}</TableCell>
                    </TableRow>
                  ))}
                </TableBody>
              </Table>
            </div>
          )}
        </CardContent>
      </Card>

      {/* Recent Logs */}
      <Card className="border bg-card">
        <CardHeader className="pb-4">
          <div className="flex items-center gap-2">
            <div className="w-8 h-8 rounded-lg bg-slate-500/10 flex items-center justify-center">
              <Activity className="h-4 w-4 text-slate-600" />
            </div>
            <div>
              <CardTitle className="text-lg">Log Recenti</CardTitle>
              <CardDescription>Ultime 50 chiamate AI</CardDescription>
            </div>
          </div>
        </CardHeader>
        <CardContent>
          {stats.recentLogs.length === 0 ? (
            <div className="text-center py-8">
              <Activity className="h-10 w-10 mx-auto text-muted-foreground mb-3" />
              <p className="text-muted-foreground">Nessun log disponibile</p>
            </div>
          ) : (
            <div className="max-h-[400px] overflow-y-auto rounded-lg border">
              <Table>
                <TableHeader className="sticky top-0 bg-background">
                  <TableRow className="hover:bg-transparent">
                    <TableHead className="font-semibold">Data</TableHead>
                    <TableHead className="font-semibold">Funzionalità</TableHead>
                    <TableHead className="font-semibold">Modello</TableHead>
                    <TableHead className="text-right font-semibold">Token</TableHead>
                    <TableHead className="text-right font-semibold">Costo</TableHead>
                    <TableHead className="text-right font-semibold">Tempo</TableHead>
                    <TableHead className="text-center font-semibold">Stato</TableHead>
                  </TableRow>
                </TableHeader>
                <TableBody>
                  {stats.recentLogs.map((log) => {
                    const useCaseInfo = USE_CASE_LABELS[log.useCase] || USE_CASE_LABELS.unknown;
                    const LogIconComponent = useCaseInfo.icon;
                    return (
                      <TableRow key={log.id} className="hover:bg-muted/50">
                        <TableCell className="text-sm text-muted-foreground whitespace-nowrap">
                          {formatDate(log.createdAt)}
                        </TableCell>
                        <TableCell>
                          <div className="flex items-center gap-2">
                            <div className={`w-6 h-6 rounded-md ${useCaseInfo.color} flex items-center justify-center`}>
                              <LogIconComponent className="h-3 w-3" />
                            </div>
                            <span className="text-sm">{useCaseInfo.label}</span>
                          </div>
                        </TableCell>
                        <TableCell>
                          <span className="font-mono text-xs text-muted-foreground">
                            {log.modelId.split('/').pop()}
                          </span>
                        </TableCell>
                        <TableCell className="text-right font-mono text-sm">
                          {formatNumber(log.inputTokens + log.outputTokens)}
                        </TableCell>
                        <TableCell className="text-right font-mono text-sm">
                          {formatCurrency(parseFloat(log.costUsd || '0'))}
                        </TableCell>
                        <TableCell className="text-right font-mono text-sm">
                          {log.responseTimeMs}ms
                        </TableCell>
                        <TableCell className="text-center">
                          {log.success ? (
                            <div className="w-6 h-6 rounded-full bg-emerald-500/10 flex items-center justify-center mx-auto">
                              <CheckCircle className="h-3.5 w-3.5 text-emerald-600" />
                            </div>
                          ) : (
                            <div className="w-6 h-6 rounded-full bg-red-500/10 flex items-center justify-center mx-auto">
                              <XCircle className="h-3.5 w-3.5 text-red-600" />
                            </div>
                          )}
                        </TableCell>
                      </TableRow>
                    );
                  })}
                </TableBody>
              </Table>
            </div>
          )}
        </CardContent>
      </Card>
    </div>
  );
}
