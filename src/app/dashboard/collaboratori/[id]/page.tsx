'use client';

import { use, useMemo } from 'react';
import Link from 'next/link';
import { useTranslations } from 'next-intl';
import {
  ArrowLeft,
  User,
  Mail,
  Phone,
  Clock,
  Calendar,
  Briefcase,
  Building,
  Loader2,
} from 'lucide-react';
import { Button } from '@/components/ui/button';
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card';
import { Badge } from '@/components/ui/badge';
import { Tabs, TabsContent, TabsList, TabsTrigger } from '@/components/ui/tabs';
import { CollaboratorShiftsTab } from '@/components/collaboratori/CollaboratorShiftsTab';
import { useCollaboratore } from '@/hooks/use-collaboratori';
import { useTurni } from '@/hooks/use-turni';

interface Props {
  params: Promise<{ id: string }>;
}

export default function CollaboratoreDetailPage({ params }: Props) {
  const { id } = use(params);
  const t = useTranslations();
  const { data: collaboratore, isLoading: isLoadingCollab } = useCollaboratore(id);

  // Get a wide range of turni to show in the shifts tab
  const today = new Date();
  const startDate = new Date(today);
  startDate.setMonth(startDate.getMonth() - 1);
  const endDate = new Date(today);
  endDate.setMonth(endDate.getMonth() + 2);

  const { data: turni = [], isLoading: isLoadingTurni } = useTurni({
    data_inizio: startDate.toISOString().split('T')[0],
    data_fine: endDate.toISOString().split('T')[0],
  });

  // Filter turni for this collaboratore
  const collaboratoreTurni = useMemo(() => {
    return turni.filter((turno) =>
      turno.Assegnazione_Turno?.some((a) => a.collaboratore_id === id)
    );
  }, [turni, id]);

  const renderOreInfo = () => {
    if (!collaboratore) return '';
    if (collaboratore.tipo_ore === 'flessibile') {
      return `${collaboratore.ore_min || 0}-${collaboratore.ore_max || 0}h/settimana`;
    }
    if (collaboratore.tipo_ore === 'mensile') {
      return `${collaboratore.ore_mensili || 0}h/mese`;
    }
    return `${collaboratore.ore_settimanali || 0}h/settimana`;
  };

  const renderContratto = () => {
    if (!collaboratore) return '';
    switch (collaboratore.tipo_contratto) {
      case 'full_time':
        return 'Full Time';
      case 'part_time':
        return 'Part Time';
      default:
        return collaboratore.tipo_contratto || 'N/D';
    }
  };

  if (isLoadingCollab) {
    return (
      <div className="flex items-center justify-center h-64">
        <Loader2 className="h-8 w-8 animate-spin text-muted-foreground" />
      </div>
    );
  }

  if (!collaboratore) {
    return (
      <div className="text-center py-12">
        <h2 className="text-xl font-semibold">Collaboratore non trovato</h2>
        <Link href="/dashboard/collaboratori">
          <Button variant="outline" className="mt-4">
            <ArrowLeft className="h-4 w-4 mr-2" />
            Torna alla lista
          </Button>
        </Link>
      </div>
    );
  }

  return (
    <div className="space-y-6">
      {/* Header */}
      <div className="flex items-center gap-4">
        <Link href="/dashboard/collaboratori">
          <Button variant="ghost" size="icon">
            <ArrowLeft className="h-4 w-4" />
          </Button>
        </Link>
        <div className="flex-1">
          <h1 className="text-2xl font-bold flex items-center gap-2">
            <User className="h-6 w-6 text-primary" />
            {collaboratore.nome} {collaboratore.cognome}
          </h1>
          <p className="text-muted-foreground">{collaboratore.email}</p>
        </div>
        {!collaboratore.attivo && (
          <Badge variant="destructive" className="text-sm">
            Disattivato
          </Badge>
        )}
      </div>

      {/* Info Cards */}
      <div className="grid gap-4 md:grid-cols-4">
        <Card>
          <CardContent className="pt-4 flex items-center gap-3">
            <Mail className="h-5 w-5 text-muted-foreground" />
            <div className="min-w-0">
              <p className="text-xs text-muted-foreground">Email</p>
              <p className="text-sm font-medium truncate">{collaboratore.email}</p>
            </div>
          </CardContent>
        </Card>

        <Card>
          <CardContent className="pt-4 flex items-center gap-3">
            <Phone className="h-5 w-5 text-muted-foreground" />
            <div>
              <p className="text-xs text-muted-foreground">Telefono</p>
              <p className="text-sm font-medium">{collaboratore.telefono || 'N/D'}</p>
            </div>
          </CardContent>
        </Card>

        <Card>
          <CardContent className="pt-4 flex items-center gap-3">
            <Clock className="h-5 w-5 text-muted-foreground" />
            <div>
              <p className="text-xs text-muted-foreground">Ore</p>
              <p className="text-sm font-medium">{renderOreInfo()}</p>
            </div>
          </CardContent>
        </Card>

        <Card>
          <CardContent className="pt-4 flex items-center gap-3">
            <Briefcase className="h-5 w-5 text-muted-foreground" />
            <div>
              <p className="text-xs text-muted-foreground">Contratto</p>
              <p className="text-sm font-medium">{renderContratto()}</p>
            </div>
          </CardContent>
        </Card>
      </div>

      {/* Nuclei */}
      {collaboratore.Appartenenza_Nucleo && collaboratore.Appartenenza_Nucleo.length > 0 && (
        <Card>
          <CardHeader className="pb-3">
            <CardTitle className="text-base flex items-center gap-2">
              <Building className="h-4 w-4" />
              Nuclei assegnati
            </CardTitle>
          </CardHeader>
          <CardContent>
            <div className="flex flex-wrap gap-2">
              {collaboratore.Appartenenza_Nucleo.filter(
                (app: { data_fine?: string | null }) => !app.data_fine
              ).map(
                (app: {
                  id: string;
                  data_inizio: string;
                  Nucleo?: { id: string; nome: string; colore: string; mansione?: string };
                }) => (
                  <Badge
                    key={app.id}
                    variant="outline"
                    className="py-1 px-3"
                    style={{
                      borderColor: app.Nucleo?.colore,
                      backgroundColor: `${app.Nucleo?.colore}15`,
                    }}
                  >
                    <div
                      className="w-2 h-2 rounded-full mr-2"
                      style={{ backgroundColor: app.Nucleo?.colore }}
                    />
                    <span style={{ color: app.Nucleo?.colore }}>{app.Nucleo?.nome}</span>
                    {app.Nucleo?.mansione && (
                      <span className="text-muted-foreground ml-2">({app.Nucleo.mansione})</span>
                    )}
                  </Badge>
                )
              )}
            </div>
          </CardContent>
        </Card>
      )}

      {/* Tabs */}
      <Tabs defaultValue="turni" className="w-full">
        <TabsList>
          <TabsTrigger value="turni" className="flex items-center gap-2">
            <Calendar className="h-4 w-4" />
            Turni
          </TabsTrigger>
          <TabsTrigger value="richieste" className="flex items-center gap-2">
            <Clock className="h-4 w-4" />
            Richieste
          </TabsTrigger>
        </TabsList>

        <TabsContent value="turni" className="mt-4">
          <CollaboratorShiftsTab
            collaboratoreId={id}
            collaboratoreName={`${collaboratore.nome} ${collaboratore.cognome}`}
            turni={turni}
            isLoading={isLoadingTurni}
          />
        </TabsContent>

        <TabsContent value="richieste" className="mt-4">
          <Card>
            <CardHeader>
              <CardTitle className="text-base">Richieste ferie e permessi</CardTitle>
              <CardDescription>
                Storico delle richieste di ferie e permessi
              </CardDescription>
            </CardHeader>
            <CardContent>
              {collaboratore.Richiesta && collaboratore.Richiesta.length > 0 ? (
                <div className="space-y-3">
                  {collaboratore.Richiesta.map(
                    (richiesta: {
                      id: string;
                      tipo: string;
                      data_inizio: string;
                      data_fine: string;
                      stato: string;
                    }) => (
                      <div
                        key={richiesta.id}
                        className="flex items-center justify-between p-3 border rounded-lg"
                      >
                        <div>
                          <p className="font-medium capitalize">{richiesta.tipo}</p>
                          <p className="text-sm text-muted-foreground">
                            {new Date(richiesta.data_inizio).toLocaleDateString('it-IT')} -{' '}
                            {new Date(richiesta.data_fine).toLocaleDateString('it-IT')}
                          </p>
                        </div>
                        <Badge
                          variant={
                            richiesta.stato === 'approvata'
                              ? 'default'
                              : richiesta.stato === 'rifiutata'
                              ? 'destructive'
                              : 'secondary'
                          }
                        >
                          {richiesta.stato}
                        </Badge>
                      </div>
                    )
                  )}
                </div>
              ) : (
                <div className="text-center py-8 text-muted-foreground">
                  <Clock className="h-8 w-8 mx-auto mb-2 opacity-50" />
                  <p>Nessuna richiesta</p>
                </div>
              )}
            </CardContent>
          </Card>
        </TabsContent>
      </Tabs>
    </div>
  );
}
