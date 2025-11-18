import { FileText } from "lucide-react";

export default function RequestsPage() {
  return (
    <div className="flex flex-col items-center justify-center min-h-[60vh] gap-4">
      <FileText className="h-16 w-16 text-muted-foreground" />
      <h1 className="text-3xl font-bold">Richieste</h1>
      <p className="text-muted-foreground text-center max-w-md">
        Questa pagina sarà disponibile nella Fase 2 dell&apos;implementazione.
        <br />
        Gestione richieste ferie, permessi e cambio turno.
      </p>
    </div>
  );
}
