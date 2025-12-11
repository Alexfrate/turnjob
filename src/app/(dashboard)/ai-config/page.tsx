import { redirect } from 'next/navigation';
import { createClient } from '@/lib/supabase/server';
import { checkIsSuperAdmin } from '@/lib/auth/check-super-admin';
import { AiConfigTabs } from '@/components/admin/ai/ai-config-tabs';
import { Card, CardContent } from '@/components/ui/card';
import { ShieldAlert } from 'lucide-react';

/**
 * Pagina Configurazione AI - Solo Super Admin
 * Gestisce modelli LLM, monitoraggio usage, prompt e testing
 */
export default async function AiConfigPage() {
  const supabase = await createClient();

  // Verifica autenticazione
  const {
    data: { user },
  } = await supabase.auth.getUser();

  if (!user) {
    redirect('/login');
  }

  // Verifica super_admin
  const isSuperAdmin = await checkIsSuperAdmin(supabase, user.email);

  if (!isSuperAdmin) {
    return (
      <div className="container mx-auto p-6 max-w-6xl">
        <Card className="border-destructive bg-card">
          <CardContent className="flex flex-col items-center justify-center py-16">
            <div className="w-16 h-16 rounded-2xl bg-destructive/10 flex items-center justify-center mb-4">
              <ShieldAlert className="h-8 w-8 text-destructive" />
            </div>
            <h1 className="text-2xl font-bold text-destructive mb-2">Accesso Negato</h1>
            <p className="text-muted-foreground text-center max-w-md">
              Questa sezione è riservata ai super amministratori. Se pensi di dover avere
              accesso, contatta l&apos;amministratore del sistema.
            </p>
          </CardContent>
        </Card>
      </div>
    );
  }

  return (
    <div className="container mx-auto p-6 max-w-7xl">
      <AiConfigTabs />
    </div>
  );
}
