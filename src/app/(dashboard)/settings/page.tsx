import { Settings as SettingsIcon } from "lucide-react";

export default function SettingsPage() {
  return (
    <div className="flex flex-col items-center justify-center min-h-[60vh] gap-4">
      <SettingsIcon className="h-16 w-16 text-muted-foreground" />
      <h1 className="text-3xl font-bold">Impostazioni</h1>
      <p className="text-muted-foreground text-center max-w-md">
        Questa pagina sarà disponibile nella Fase 2 dell&apos;implementazione.
        <br />
        Configurazione azienda, LLM e preferenze sistema.
      </p>
    </div>
  );
}
