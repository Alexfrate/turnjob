'use client';

import { Tabs, TabsContent, TabsList, TabsTrigger } from '@/components/ui/tabs';
import { Bot, BarChart3, FileText, FlaskConical, Sparkles } from 'lucide-react';
import { ModelsTab } from './models-tab';
import { UsageTab } from './usage-tab';
import { PromptsTab } from './prompts-tab';
import { SandboxTab } from './sandbox-tab';

/**
 * Container principale per la configurazione AI - Solo Super Admin
 * 4 tab: Modelli, Monitoraggio, Prompt, Sandbox
 */
export function AiConfigTabs() {
  return (
    <div className="space-y-6">
      {/* Header */}
      <div className="flex items-center gap-4">
        <div className="w-12 h-12 rounded-xl bg-gradient-to-br from-violet-500 to-purple-600 flex items-center justify-center shadow-lg">
          <Sparkles className="h-6 w-6 text-white" />
        </div>
        <div>
          <h1 className="text-2xl font-bold text-foreground">Configurazione AI</h1>
          <p className="text-muted-foreground">
            Gestisci modelli, prompt e monitora l&apos;utilizzo AI
          </p>
        </div>
      </div>

      {/* Tabs */}
      <Tabs defaultValue="models" className="space-y-6">
        <TabsList className="h-auto p-1.5 bg-muted/80 rounded-xl inline-flex gap-1.5 border border-border/50">
          <TabsTrigger
            value="models"
            className="flex items-center gap-2 px-5 py-3 rounded-lg font-medium transition-all
                       data-[state=inactive]:text-muted-foreground data-[state=inactive]:hover:text-foreground data-[state=inactive]:hover:bg-muted/50
                       data-[state=active]:bg-primary data-[state=active]:text-primary-foreground data-[state=active]:shadow-md"
          >
            <Bot className="h-4 w-4" />
            <span>Modelli</span>
          </TabsTrigger>
          <TabsTrigger
            value="usage"
            className="flex items-center gap-2 px-5 py-3 rounded-lg font-medium transition-all
                       data-[state=inactive]:text-muted-foreground data-[state=inactive]:hover:text-foreground data-[state=inactive]:hover:bg-muted/50
                       data-[state=active]:bg-primary data-[state=active]:text-primary-foreground data-[state=active]:shadow-md"
          >
            <BarChart3 className="h-4 w-4" />
            <span>Monitoraggio</span>
          </TabsTrigger>
          <TabsTrigger
            value="prompts"
            className="flex items-center gap-2 px-5 py-3 rounded-lg font-medium transition-all
                       data-[state=inactive]:text-muted-foreground data-[state=inactive]:hover:text-foreground data-[state=inactive]:hover:bg-muted/50
                       data-[state=active]:bg-primary data-[state=active]:text-primary-foreground data-[state=active]:shadow-md"
          >
            <FileText className="h-4 w-4" />
            <span>Prompt</span>
          </TabsTrigger>
          <TabsTrigger
            value="sandbox"
            className="flex items-center gap-2 px-5 py-3 rounded-lg font-medium transition-all
                       data-[state=inactive]:text-muted-foreground data-[state=inactive]:hover:text-foreground data-[state=inactive]:hover:bg-muted/50
                       data-[state=active]:bg-primary data-[state=active]:text-primary-foreground data-[state=active]:shadow-md"
          >
            <FlaskConical className="h-4 w-4" />
            <span>Sandbox</span>
          </TabsTrigger>
        </TabsList>

        <TabsContent value="models" className="mt-0">
          <ModelsTab />
        </TabsContent>

        <TabsContent value="usage" className="mt-0">
          <UsageTab />
        </TabsContent>

        <TabsContent value="prompts" className="mt-0">
          <PromptsTab />
        </TabsContent>

        <TabsContent value="sandbox" className="mt-0">
          <SandboxTab />
        </TabsContent>
      </Tabs>
    </div>
  );
}
