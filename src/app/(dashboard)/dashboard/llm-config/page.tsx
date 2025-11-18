import { LlmConfigForm } from '@/components/admin/llm-config-form';
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card';

/**
 * Pagina SuperAdmin - Configurazione LLM
 * Gestisce modelli AI, budget e preferenze
 */
export default async function LlmConfigPage() {
  return (
    <div className="container mx-auto p-6 max-w-6xl">
      <div className="mb-8">
        <h1 className="text-3xl font-bold tracking-tight">Configurazione LLM</h1>
        <p className="text-muted-foreground mt-2">
          Gestisci i modelli AI, budget e preferenze per l&apos;intero sistema
        </p>
      </div>

      <div className="space-y-6">
        {/* Overview Card */}
        <Card>
          <CardHeader>
            <CardTitle>OpenRouter Integration</CardTitle>
            <CardDescription>
              Turnjob usa OpenRouter come gateway unificato per accedere a 150+ modelli LLM
              da xAI, OpenAI, Anthropic, Google e altri provider.
            </CardDescription>
          </CardHeader>
          <CardContent className="space-y-4">
            <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
              <div className="p-4 border rounded-lg">
                <div className="text-sm font-medium text-muted-foreground">Provider</div>
                <div className="text-2xl font-bold mt-1">OpenRouter</div>
              </div>
              <div className="p-4 border rounded-lg">
                <div className="text-sm font-medium text-muted-foreground">Modelli Disponibili</div>
                <div className="text-2xl font-bold mt-1">10</div>
              </div>
              <div className="p-4 border rounded-lg">
                <div className="text-sm font-medium text-muted-foreground">Budget Mensile</div>
                <div className="text-2xl font-bold mt-1">€500</div>
              </div>
            </div>
          </CardContent>
        </Card>

        {/* Configuration Form */}
        <LlmConfigForm />
      </div>
    </div>
  );
}
