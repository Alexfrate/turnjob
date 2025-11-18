import { Users } from "lucide-react";

export default function TeamPage() {
  return (
    <div className="flex flex-col items-center justify-center min-h-[60vh] gap-4">
      <Users className="h-16 w-16 text-muted-foreground" />
      <h1 className="text-3xl font-bold">Team</h1>
      <p className="text-muted-foreground text-center max-w-md">
        Questa pagina sarà disponibile nella Fase 2 dell&apos;implementazione.
        <br />
        Gestione dipendenti, competenze e disponibilità.
      </p>
    </div>
  );
}
