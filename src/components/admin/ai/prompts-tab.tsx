'use client';

import { useState, useEffect } from 'react';
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { Badge } from '@/components/ui/badge';
import { Textarea } from '@/components/ui/textarea';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { Switch } from '@/components/ui/switch';
import { useToast } from '@/hooks/use-toast';
import {
  Loader2,
  Save,
  RotateCcw,
  FileText,
  Code,
  CheckCircle,
  AlertCircle,
  Sparkles,
  Calendar,
  MessageSquare,
  Search,
  CheckCircle2,
  type LucideIcon,
} from 'lucide-react';

interface SystemPrompt {
  id: string;
  useCase: string;
  name: string;
  description: string;
  promptTemplate: string;
  variables: Array<{
    name: string;
    required: boolean;
    description: string;
  }>;
  isActive: boolean;
  version: number;
  updatedBy: string | null;
  updatedAt: string;
}

const USE_CASE_INFO: Record<string, { icon: LucideIcon; color: string }> = {
  planning_chat: { icon: Calendar, color: 'bg-blue-500/10 text-blue-600' },
  onboarding: { icon: MessageSquare, color: 'bg-violet-500/10 text-violet-600' },
  constraint_extraction: { icon: Search, color: 'bg-amber-500/10 text-amber-600' },
  explanation: { icon: FileText, color: 'bg-emerald-500/10 text-emerald-600' },
  validation: { icon: CheckCircle2, color: 'bg-sky-500/10 text-sky-600' },
};

/**
 * Tab Prompts - Gestione system prompts AI
 */
export function PromptsTab() {
  const { toast } = useToast();
  const [loading, setLoading] = useState(true);
  const [saving, setSaving] = useState(false);
  const [prompts, setPrompts] = useState<SystemPrompt[]>([]);
  const [selectedPrompt, setSelectedPrompt] = useState<SystemPrompt | null>(null);
  const [editedTemplate, setEditedTemplate] = useState('');
  const [editedName, setEditedName] = useState('');
  const [editedDescription, setEditedDescription] = useState('');
  const [editedActive, setEditedActive] = useState(true);
  const [hasChanges, setHasChanges] = useState(false);

  useEffect(() => {
    loadPrompts();
  }, []);

  const loadPrompts = async () => {
    try {
      setLoading(true);
      const response = await fetch('/api/admin/ai-prompts');
      const data = await response.json();

      if (data.success) {
        setPrompts(data.prompts);
        // Seleziona il primo prompt se nessuno selezionato
        if (data.prompts.length > 0 && !selectedPrompt) {
          selectPrompt(data.prompts[0]);
        }
      } else {
        throw new Error(data.error || 'Errore nel caricamento');
      }
    } catch (error) {
      console.error('Error loading prompts:', error);
      toast({
        title: 'Errore',
        description: 'Impossibile caricare i prompts',
        variant: 'destructive',
      });
    } finally {
      setLoading(false);
    }
  };

  const selectPrompt = (prompt: SystemPrompt) => {
    if (hasChanges) {
      if (!confirm('Hai modifiche non salvate. Vuoi continuare?')) {
        return;
      }
    }
    setSelectedPrompt(prompt);
    setEditedTemplate(prompt.promptTemplate);
    setEditedName(prompt.name);
    setEditedDescription(prompt.description || '');
    setEditedActive(prompt.isActive);
    setHasChanges(false);
  };

  const handleTemplateChange = (value: string) => {
    setEditedTemplate(value);
    setHasChanges(true);
  };

  const handleSave = async () => {
    if (!selectedPrompt) return;

    setSaving(true);
    try {
      const response = await fetch('/api/admin/ai-prompts', {
        method: 'PUT',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          id: selectedPrompt.id,
          promptTemplate: editedTemplate,
          name: editedName,
          description: editedDescription,
          isActive: editedActive,
        }),
      });

      const data = await response.json();

      if (data.success) {
        toast({
          title: 'Prompt salvato',
          description: `Versione ${data.prompt.version} salvata con successo`,
        });
        // Aggiorna lista prompts
        setPrompts(prompts.map(p =>
          p.id === data.prompt.id ? data.prompt : p
        ));
        setSelectedPrompt(data.prompt);
        setHasChanges(false);
      } else {
        throw new Error(data.error || 'Errore nel salvataggio');
      }
    } catch (error) {
      console.error('Error saving prompt:', error);
      toast({
        title: 'Errore',
        description: 'Impossibile salvare il prompt',
        variant: 'destructive',
      });
    } finally {
      setSaving(false);
    }
  };

  const handleReset = async () => {
    if (!selectedPrompt) return;

    if (!confirm('Sei sicuro di voler ripristinare il prompt al valore di default?')) {
      return;
    }

    setSaving(true);
    try {
      const response = await fetch('/api/admin/ai-prompts', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          useCase: selectedPrompt.useCase,
        }),
      });

      const data = await response.json();

      if (data.success) {
        toast({
          title: 'Prompt ripristinato',
          description: 'Il prompt è stato riportato al valore di default',
        });
        // Aggiorna
        setPrompts(prompts.map(p =>
          p.id === data.prompt.id ? data.prompt : p
        ));
        selectPrompt(data.prompt);
      } else {
        throw new Error(data.error || 'Errore nel ripristino');
      }
    } catch (error) {
      console.error('Error resetting prompt:', error);
      toast({
        title: 'Errore',
        description: 'Impossibile ripristinare il prompt',
        variant: 'destructive',
      });
    } finally {
      setSaving(false);
    }
  };

  if (loading) {
    return (
      <div className="flex items-center justify-center py-16">
        <div className="flex flex-col items-center gap-3">
          <Loader2 className="h-8 w-8 animate-spin text-primary" />
          <span className="text-sm text-muted-foreground">Caricamento prompts...</span>
        </div>
      </div>
    );
  }

  return (
    <div className="grid grid-cols-1 lg:grid-cols-4 gap-6">
      {/* Sidebar - Lista Use Cases */}
      <Card className="lg:col-span-1 border bg-card">
        <CardHeader className="pb-3">
          <div className="flex items-center gap-3">
            <div className="w-10 h-10 rounded-xl bg-primary/10 flex items-center justify-center">
              <Sparkles className="h-5 w-5 text-primary" />
            </div>
            <div>
              <CardTitle className="text-base">Use Cases</CardTitle>
              <CardDescription className="text-xs">Seleziona per modificare</CardDescription>
            </div>
          </div>
        </CardHeader>
        <CardContent className="p-2">
          <div className="space-y-1">
            {prompts.map((prompt) => {
              const info = USE_CASE_INFO[prompt.useCase] || { icon: FileText, color: 'bg-slate-500/10 text-slate-600' };
              const IconComponent = info.icon;
              const isSelected = selectedPrompt?.id === prompt.id;

              return (
                <button
                  key={prompt.id}
                  onClick={() => selectPrompt(prompt)}
                  className={`w-full text-left px-3 py-3 rounded-xl transition-all ${
                    isSelected
                      ? 'bg-primary text-primary-foreground shadow-md'
                      : 'hover:bg-muted/80'
                  }`}
                >
                  <div className="flex items-center gap-3">
                    <div className={`w-9 h-9 rounded-lg flex items-center justify-center ${
                      isSelected ? 'bg-primary-foreground/20' : info.color
                    }`}>
                      <IconComponent className={`h-4.5 w-4.5 ${isSelected ? '' : ''}`} />
                    </div>
                    <span className="text-sm font-medium truncate flex-1">{prompt.name}</span>
                  </div>
                  <div className="flex items-center gap-2 mt-2 ml-12">
                    {prompt.isActive ? (
                      <Badge
                        variant={isSelected ? 'secondary' : 'outline'}
                        className="text-xs px-2 py-0.5 gap-1"
                      >
                        <CheckCircle className="h-3 w-3" />
                        Attivo
                      </Badge>
                    ) : (
                      <Badge variant="secondary" className="text-xs px-2 py-0.5 gap-1">
                        <AlertCircle className="h-3 w-3" />
                        Inattivo
                      </Badge>
                    )}
                    <span className={`text-xs font-mono ${isSelected ? 'text-primary-foreground/70' : 'text-muted-foreground'}`}>
                      v{prompt.version}
                    </span>
                  </div>
                </button>
              );
            })}
          </div>
        </CardContent>
      </Card>

      {/* Main Content - Editor */}
      <div className="lg:col-span-3 space-y-4">
        {selectedPrompt ? (
          <>
            {/* Header */}
            <Card className="border bg-card">
              <CardHeader className="pb-4">
                <div className="flex flex-col sm:flex-row sm:items-start sm:justify-between gap-4">
                  <div className="flex items-start gap-4">
                    {(() => {
                      const info = USE_CASE_INFO[selectedPrompt.useCase] || { icon: FileText, color: 'bg-slate-500/10 text-slate-600' };
                      const IconComponent = info.icon;
                      return (
                        <div className={`w-12 h-12 rounded-xl ${info.color} flex items-center justify-center`}>
                          <IconComponent className="h-6 w-6" />
                        </div>
                      );
                    })()}
                    <div className="min-w-0">
                      <CardTitle className="text-lg">{selectedPrompt.name}</CardTitle>
                      <CardDescription className="mt-1">
                        Use case: <code className="bg-muted px-2 py-0.5 rounded text-xs font-mono">{selectedPrompt.useCase}</code>
                      </CardDescription>
                    </div>
                  </div>
                  <div className="flex items-center gap-3 self-start">
                    <div className="flex items-center gap-3 bg-muted/50 px-4 py-2 rounded-xl border border-border/50">
                      <Switch
                        id="active"
                        checked={editedActive}
                        onCheckedChange={(checked: boolean) => {
                          setEditedActive(checked);
                          setHasChanges(true);
                        }}
                      />
                      <Label htmlFor="active" className="text-sm font-medium cursor-pointer">
                        Attivo
                      </Label>
                    </div>
                  </div>
                </div>
              </CardHeader>
              <CardContent className="space-y-4">
                <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                  <div className="space-y-2">
                    <Label htmlFor="name" className="text-sm font-medium">Nome</Label>
                    <Input
                      id="name"
                      value={editedName}
                      onChange={(e) => {
                        setEditedName(e.target.value);
                        setHasChanges(true);
                      }}
                      className="bg-background"
                    />
                  </div>
                  <div className="space-y-2">
                    <Label htmlFor="description" className="text-sm font-medium">Descrizione</Label>
                    <Input
                      id="description"
                      value={editedDescription}
                      onChange={(e) => {
                        setEditedDescription(e.target.value);
                        setHasChanges(true);
                      }}
                      className="bg-background"
                    />
                  </div>
                </div>
              </CardContent>
            </Card>

            {/* Editor */}
            <Card className="border bg-card">
              <CardHeader className="pb-3">
                <div className="flex items-center gap-3">
                  <div className="w-10 h-10 rounded-xl bg-violet-500/10 flex items-center justify-center">
                    <Code className="h-5 w-5 text-violet-600" />
                  </div>
                  <div>
                    <CardTitle className="text-base">Template Prompt</CardTitle>
                    <CardDescription className="text-xs">
                      Usa <code className="bg-muted px-1.5 py-0.5 rounded font-mono">{'{{variabile}}'}</code> per i placeholder dinamici
                    </CardDescription>
                  </div>
                </div>
              </CardHeader>
              <CardContent className="space-y-4">
                <Textarea
                  value={editedTemplate}
                  onChange={(e) => handleTemplateChange(e.target.value)}
                  className="font-mono text-sm min-h-[400px] bg-background border-border"
                  placeholder="Inserisci il template del prompt..."
                />

                {/* Variables */}
                {selectedPrompt.variables && selectedPrompt.variables.length > 0 && (
                  <div className="border border-border/50 rounded-xl p-4 bg-muted/30">
                    <h4 className="text-sm font-medium mb-3 flex items-center gap-2">
                      <Sparkles className="h-4 w-4 text-amber-500" />
                      Variabili disponibili:
                    </h4>
                    <div className="flex flex-wrap gap-2">
                      {selectedPrompt.variables.map((variable) => (
                        <Badge
                          key={variable.name}
                          variant={variable.required ? 'default' : 'outline'}
                          className="cursor-help font-mono text-xs px-2.5 py-1"
                          title={variable.description}
                        >
                          {`{{${variable.name}}}`}
                          {variable.required && <span className="text-red-300 ml-1">*</span>}
                        </Badge>
                      ))}
                    </div>
                  </div>
                )}

                {/* Info */}
                {selectedPrompt.updatedBy && (
                  <p className="text-xs text-muted-foreground">
                    Ultimo aggiornamento: {new Date(selectedPrompt.updatedAt).toLocaleString('it-IT')}
                    {' '}da {selectedPrompt.updatedBy}
                  </p>
                )}
              </CardContent>
            </Card>

            {/* Actions */}
            <div className="flex flex-col sm:flex-row justify-between gap-3">
              <Button
                variant="outline"
                onClick={handleReset}
                disabled={saving}
                className="sm:w-auto"
              >
                <RotateCcw className="h-4 w-4 mr-2" />
                Ripristina Default
              </Button>
              <Button
                onClick={handleSave}
                disabled={saving || !hasChanges}
                className="sm:w-auto min-w-[180px]"
              >
                {saving ? (
                  <>
                    <Loader2 className="h-4 w-4 mr-2 animate-spin" />
                    Salvataggio...
                  </>
                ) : (
                  <>
                    <Save className="h-4 w-4 mr-2" />
                    Salva Modifiche
                    {hasChanges && <Badge variant="secondary" className="ml-2 text-xs">*</Badge>}
                  </>
                )}
              </Button>
            </div>
          </>
        ) : (
          <Card className="border bg-card">
            <CardContent className="py-16 text-center">
              <div className="w-16 h-16 rounded-2xl bg-muted/50 flex items-center justify-center mx-auto mb-4">
                <FileText className="h-8 w-8 text-muted-foreground" />
              </div>
              <h3 className="text-lg font-semibold mb-2">Seleziona un Prompt</h3>
              <p className="text-muted-foreground max-w-md mx-auto">
                Seleziona un use case dalla lista per visualizzare e modificare il prompt
              </p>
            </CardContent>
          </Card>
        )}
      </div>
    </div>
  );
}
