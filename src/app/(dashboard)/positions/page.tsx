import { Building2 } from "lucide-react";

export default function PositionsPage() {
  return (
    <div className="flex flex-col items-center justify-center min-h-[60vh] gap-4">
      <Building2 className="h-16 w-16 text-muted-foreground" />
      <h1 className="text-3xl font-bold">Posizioni</h1>
      <p className="text-muted-foreground text-center max-w-md">
        Questa pagina sarà disponibile nella Fase 2 dell&apos;implementazione.
        <br />
        Gestione posizioni lavorative e requisiti.
      </p>
    </div>
  );
}
