"use client";

import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Calendar, Users, Clock, CheckCircle, ArrowRight, TrendingUp, Layers, FileText } from "lucide-react";
import { useUser } from "@/hooks/use-user";
import { useAzienda } from "@/hooks/use-azienda";
import { useNuclei } from "@/hooks/use-nuclei";
import { useCollaboratori } from "@/hooks/use-collaboratori";
import Link from "next/link";
import { Skeleton } from "@/components/ui/skeleton";

export default function DashboardPage() {
  const { user, loading: userLoading } = useUser();
  const { azienda, isLoading: aziendaLoading } = useAzienda();
  const { nuclei, isLoading: nucleiLoading } = useNuclei();
  const { collaboratori, isLoading: collaboratoriLoading } = useCollaboratori();

  const isLoading = userLoading || aziendaLoading || nucleiLoading || collaboratoriLoading;

  if (isLoading) {
    return (
      <div className="p-8 space-y-8">
        <div className="flex items-center justify-between">
          <Skeleton className="h-10 w-48" />
          <Skeleton className="h-10 w-32" />
        </div>
        <div className="grid gap-4 md:grid-cols-2 lg:grid-cols-4">
          {[...Array(4)].map((_, i) => (
            <Skeleton key={i} className="h-32 rounded-xl" />
          ))}
        </div>
        <div className="grid gap-4 md:grid-cols-2 lg:grid-cols-7">
          <Skeleton className="col-span-4 h-[400px] rounded-xl" />
          <Skeleton className="col-span-3 h-[400px] rounded-xl" />
        </div>
      </div>
    );
  }

  // Show welcome screen if no azienda exists
  if (!azienda) {
    return (
      <div className="flex flex-col items-center justify-center min-h-[70vh] px-4">
        {/* Animated Background Elements */}
        <div className="absolute inset-0 -z-10 overflow-hidden">
          <div className="absolute top-20 left-1/4 w-64 h-64 bg-primary-200/20 dark:bg-primary-900/10 rounded-full mix-blend-multiply dark:mix-blend-lighten filter blur-3xl animate-blob"></div>
          <div className="absolute top-20 right-1/4 w-64 h-64 bg-purple-200/20 dark:bg-purple-900/10 rounded-full mix-blend-multiply dark:mix-blend-lighten filter blur-3xl animate-blob animation-delay-2000"></div>
          <div className="absolute bottom-20 left-1/2 w-64 h-64 bg-success-200/20 dark:bg-success-900/10 rounded-full mix-blend-multiply dark:mix-blend-lighten filter blur-3xl animate-blob animation-delay-4000"></div>
        </div>

        <div className="text-center max-w-2xl space-y-8">
          {/* Icon/Illustration */}
          <div className="relative mx-auto w-32 h-32 mb-6">
            <div className="absolute inset-0 bg-gradient-to-br from-primary-500 to-purple-600 rounded-3xl rotate-6 opacity-20 animate-pulse"></div>
            <div className="absolute inset-0 bg-gradient-to-br from-primary-500 to-purple-600 rounded-3xl flex items-center justify-center">
              <Calendar className="h-16 w-16 text-white" />
            </div>
          </div>

          {/* Heading */}
          <div className="space-y-3">
            <h1 className="text-4xl md:text-5xl font-extrabold bg-gradient-to-r from-primary-600 via-purple-600 to-primary-500 dark:from-primary-400 dark:via-purple-400 dark:to-primary-300 bg-clip-text text-transparent">
              Benvenuto in Turnjob!
            </h1>
            <p className="text-xl text-neutral-700 dark:text-neutral-300 font-medium">
              Configura la tua azienda in pochi minuti e inizia a gestire i turni in modo intelligente
            </p>
          </div>

          {/* Features Preview */}
          <div className="grid grid-cols-1 md:grid-cols-3 gap-4 py-6">
            <div className="flex flex-col items-center p-4 bg-white/50 dark:bg-neutral-800/50 rounded-xl border border-neutral-200 dark:border-neutral-700 backdrop-blur-sm">
              <div className="w-12 h-12 bg-primary-100 dark:bg-primary-900/30 rounded-lg flex items-center justify-center mb-3">
                <Layers className="h-6 w-6 text-primary-600 dark:text-primary-400" />
              </div>
              <p className="text-sm font-semibold text-neutral-900 dark:text-neutral-100">Organizza Nuclei</p>
            </div>
            <div className="flex flex-col items-center p-4 bg-white/50 dark:bg-neutral-800/50 rounded-xl border border-neutral-200 dark:border-neutral-700 backdrop-blur-sm">
              <div className="w-12 h-12 bg-success-100 dark:bg-success-900/30 rounded-lg flex items-center justify-center mb-3">
                <Users className="h-6 w-6 text-success-600 dark:text-success-400" />
              </div>
              <p className="text-sm font-semibold text-neutral-900 dark:text-neutral-100">Gestisci Collaboratori</p>
            </div>
            <div className="flex flex-col items-center p-4 bg-white/50 dark:bg-neutral-800/50 rounded-xl border border-neutral-200 dark:border-neutral-700 backdrop-blur-sm">
              <div className="w-12 h-12 bg-purple-100 dark:bg-purple-900/30 rounded-lg flex items-center justify-center mb-3">
                <Calendar className="h-6 w-6 text-purple-600 dark:text-purple-400" />
              </div>
              <p className="text-sm font-semibold text-neutral-900 dark:text-neutral-100">Pianifica Turni</p>
            </div>
          </div>

          {/* CTAs */}
          <div className="flex flex-col sm:flex-row gap-4 justify-center items-center pt-4">
            <Button
              asChild
              size="lg"
              className="text-lg px-8 py-6 shadow-xl hover:shadow-2xl transition-all duration-300 bg-gradient-to-r from-primary-600 to-purple-600 hover:from-primary-700 hover:to-purple-700"
            >
              <Link href="/onboarding" className="flex items-center gap-2">
                <CheckCircle className="h-5 w-5" />
                Inizia Setup (3 minuti)
                <ArrowRight className="h-5 w-5" />
              </Link>
            </Button>
          </div>

          {/* Progress Indicator */}
          <div className="flex items-center justify-center gap-2 text-sm text-neutral-600 dark:text-neutral-400">
            <Clock className="h-4 w-4" />
            <span className="font-medium">Tempo stimato: 3-5 minuti</span>
          </div>
        </div>
      </div>
    );
  }

  // Calculate stats from actual data
  const collaboratoriAttivi = collaboratori?.filter(c => c.attivo) || [];
  const stats = [
    {
      name: "Richieste in attesa",
      value: "0",
      change: "Nessuna richiesta pendente",
      trend: "neutral",
      trendValue: "",
      icon: Clock,
      color: "text-warning-600 dark:text-warning-400",
      bgColor: "bg-warning-100 dark:bg-warning-900/30",
      bgGradient: "from-warning-50 to-warning-100/50 dark:from-warning-900/20 dark:to-warning-900/10"
    },
    {
      name: "Nuclei attivi",
      value: String(nuclei?.length || 0),
      change: "Reparti configurati",
      trend: nuclei?.length ? "up" : "neutral",
      trendValue: nuclei?.length ? "Attivi" : "",
      icon: Layers,
      color: "text-success-600 dark:text-success-400",
      bgColor: "bg-success-100 dark:bg-success-900/30",
      bgGradient: "from-success-50 to-success-100/50 dark:from-success-900/20 dark:to-success-900/10"
    },
    {
      name: "Collaboratori",
      value: String(collaboratoriAttivi.length),
      change: `${collaboratori?.length || 0} totali`,
      trend: collaboratoriAttivi.length ? "up" : "neutral",
      trendValue: collaboratoriAttivi.length ? "Attivi" : "",
      icon: Users,
      color: "text-primary-600 dark:text-primary-400",
      bgColor: "bg-primary-100 dark:bg-primary-900/30",
      bgGradient: "from-primary-50 to-primary-100/50 dark:from-primary-900/20 dark:to-primary-900/10"
    },
    {
      name: "Turni questo mese",
      value: "0",
      change: "Inizia a pianificare",
      trend: "neutral",
      trendValue: "",
      icon: Calendar,
      color: "text-primary-700 dark:text-primary-400",
      bgColor: "bg-primary-100 dark:bg-primary-900/30",
      bgGradient: "from-primary-50 to-primary-100/50 dark:from-primary-900/20 dark:to-primary-900/10"
    }
  ];

  const quickActions = [
    {
      icon: Calendar,
      title: "Visualizza Calendario",
      description: "Vedi e gestisci i turni del team",
      href: "/dashboard/calendar",
      color: "text-primary-600 dark:text-primary-400",
      bgColor: "bg-primary-50 dark:bg-primary-900/20",
      borderColor: "border-primary-200 dark:border-primary-700"
    },
    {
      icon: Layers,
      title: "Gestisci Nuclei",
      description: "Organizza reparti e mansioni",
      href: "/dashboard/nuclei",
      color: "text-blue-600 dark:text-blue-400",
      bgColor: "bg-blue-50 dark:bg-blue-900/20",
      borderColor: "border-blue-200 dark:border-blue-700"
    },
    {
      icon: Users,
      title: "Gestisci Collaboratori",
      description: "Aggiungi e modifica il team",
      href: "/dashboard/collaboratori",
      color: "text-success-600 dark:text-success-400",
      bgColor: "bg-success-50 dark:bg-success-900/20",
      borderColor: "border-success-200 dark:border-success-700"
    }
  ];

  return (
    <div className="space-y-6">
      {/* Page Header */}
      <div className="flex flex-col md:flex-row md:items-center justify-between gap-4">
        <div>
          <h1 className="text-3xl font-bold text-neutral-900 dark:text-neutral-100">
            Dashboard
          </h1>
          <p className="text-neutral-700 dark:text-neutral-300 mt-1 font-medium">
            Benvenuto, {azienda.nome}
          </p>
        </div>
      </div>

      {/* Stats Grid */}
      <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-6">
        {stats.map((stat) => {
          const Icon = stat.icon;
          return (
            <Card
              key={stat.name}
              className="group hover:shadow-lg transition-all duration-300 hover:-translate-y-1"
            >
              <CardHeader className="flex flex-row items-center justify-between pb-2">
                <CardTitle className="text-sm font-bold text-neutral-800 dark:text-neutral-300">
                  {stat.name}
                </CardTitle>
                <div className={`w-12 h-12 rounded-xl ${stat.bgColor} flex items-center justify-center group-hover:scale-110 transition-transform duration-300`}>
                  <Icon className={`h-6 w-6 ${stat.color}`} />
                </div>
              </CardHeader>
              <CardContent>
                <div className="flex items-baseline justify-between">
                  <div className="text-3xl font-bold text-neutral-900 dark:text-neutral-100">
                    {stat.value}
                  </div>
                  {stat.trend === "up" && stat.trendValue && (
                    <div className="flex items-center gap-1 text-success-600 dark:text-success-400 text-sm font-medium">
                      <TrendingUp className="h-4 w-4" />
                      <span>{stat.trendValue}</span>
                    </div>
                  )}
                </div>
                <p className="text-xs text-neutral-700 dark:text-neutral-400 mt-2 font-semibold">
                  {stat.change}
                </p>
                {/* Mini trend line */}
                <div className={`mt-3 h-1 rounded-full bg-gradient-to-r ${stat.bgGradient}`}></div>
              </CardContent>
            </Card>
          );
        })}
      </div>

      {/* Onboarding reminder if not completed */}
      {azienda && !azienda.completato_onboarding && (
        <Card className="border-primary-200 dark:border-primary-800 bg-gradient-to-r from-primary-50 to-purple-50 dark:from-primary-900/20 dark:to-purple-900/20">
          <CardHeader>
            <CardTitle className="flex items-center gap-2 text-primary-700 dark:text-primary-400">
              <CheckCircle className="h-5 w-5" />
              Completa la configurazione
            </CardTitle>
            <CardDescription>
              Configura nuclei e collaboratori per iniziare a pianificare i turni
            </CardDescription>
          </CardHeader>
          <CardContent>
            <div className="flex gap-4">
              <Button asChild>
                <Link href="/onboarding">
                  Completa Onboarding
                </Link>
              </Button>
            </div>
          </CardContent>
        </Card>
      )}

      {/* Content Grid */}
      <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
        {/* Recent Nuclei */}
        <Card>
          <CardHeader>
            <div className="flex items-center justify-between">
              <div>
                <CardTitle>Nuclei</CardTitle>
                <CardDescription>
                  I tuoi reparti configurati
                </CardDescription>
              </div>
              <Button variant="ghost" size="sm" className="gap-2" asChild>
                <Link href="/dashboard/nuclei">
                  Gestisci
                  <ArrowRight className="h-4 w-4" />
                </Link>
              </Button>
            </div>
          </CardHeader>
          <CardContent>
            {nuclei && nuclei.length > 0 ? (
              <div className="space-y-3">
                {nuclei.slice(0, 5).map((nucleo) => (
                  <div
                    key={nucleo.id}
                    className="group flex items-center justify-between p-4 bg-neutral-50 dark:bg-neutral-800/50 rounded-lg hover:bg-neutral-100 dark:hover:bg-neutral-800 transition-all duration-200 border border-transparent hover:border-neutral-200 dark:hover:border-neutral-700"
                  >
                    <div className="flex items-center gap-3">
                      <div
                        className="w-10 h-10 rounded-full flex items-center justify-center"
                        style={{ backgroundColor: nucleo.colore + '20' }}
                      >
                        <Layers className="h-5 w-5" style={{ color: nucleo.colore }} />
                      </div>
                      <div>
                        <div className="font-semibold text-neutral-900 dark:text-neutral-100">
                          {nucleo.nome}
                        </div>
                        <div className="text-sm text-neutral-800 dark:text-neutral-300 font-semibold">
                          {nucleo.mansione}
                        </div>
                      </div>
                    </div>
                    <span className="text-xs bg-neutral-100 dark:bg-neutral-700 text-neutral-600 dark:text-neutral-300 px-3 py-1.5 rounded-full font-bold">
                      Min {nucleo.membri_richiesti_min}
                    </span>
                  </div>
                ))}
              </div>
            ) : (
              <div className="text-center py-8">
                <Layers className="h-12 w-12 mx-auto text-neutral-300 dark:text-neutral-600 mb-3" />
                <p className="text-neutral-600 dark:text-neutral-400 mb-4">
                  Nessun nucleo configurato
                </p>
                <Button asChild variant="outline">
                  <Link href="/dashboard/nuclei">
                    Crea il primo nucleo
                  </Link>
                </Button>
              </div>
            )}
          </CardContent>
        </Card>

        {/* Calendar Overview */}
        <Card>
          <CardHeader>
            <CardTitle>Calendario</CardTitle>
            <CardDescription>
              Panoramica dei turni della settimana
            </CardDescription>
          </CardHeader>
          <CardContent>
            <div className="h-72 flex items-center justify-center bg-gradient-to-br from-primary-50 to-success-50 dark:from-primary-900/20 dark:to-success-900/20 rounded-lg border-2 border-dashed border-primary-200 dark:border-primary-800">
              <div className="text-center">
                <div className="relative">
                  <Calendar className="h-20 w-20 mx-auto mb-4 text-primary-500 dark:text-primary-400 opacity-40 animate-pulse" />
                  <div className="absolute inset-0 bg-gradient-to-br from-primary-500/20 to-success-500/20 blur-2xl"></div>
                </div>
                <p className="text-neutral-700 dark:text-neutral-300 font-semibold">
                  Inizia a pianificare i turni
                </p>
                <Button variant="outline" size="sm" className="mt-4" asChild>
                  <Link href="/dashboard/calendar">
                    Apri Calendario
                  </Link>
                </Button>
              </div>
            </div>
          </CardContent>
        </Card>
      </div>

      {/* Quick Actions */}
      <Card>
        <CardHeader>
          <CardTitle>Azioni rapide</CardTitle>
          <CardDescription>
            Le operazioni più comuni per gestire i turni
          </CardDescription>
        </CardHeader>
        <CardContent>
          <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
            {quickActions.map((action) => {
              const Icon = action.icon;
              return (
                <Link
                  key={action.title}
                  href={action.href}
                  className={`group p-6 text-left rounded-xl border-2 transition-all duration-300 hover:shadow-lg hover:-translate-y-1 ${action.borderColor} ${action.bgColor} hover:bg-opacity-80 block`}
                >
                  <div className={`w-12 h-12 rounded-lg bg-white dark:bg-neutral-900 ${action.color} flex items-center justify-center mb-4 group-hover:scale-110 transition-transform duration-300 shadow-sm`}>
                    <Icon className="h-6 w-6" />
                  </div>
                  <div className="font-bold text-neutral-900 dark:text-neutral-100 mb-2 group-hover:text-primary-700 dark:group-hover:text-primary-400 transition-colors">
                    {action.title}
                  </div>
                  <div className="text-sm text-neutral-800 dark:text-neutral-300 font-semibold">
                    {action.description}
                  </div>
                  <div className="flex items-center gap-2 mt-4 text-primary-700 dark:text-primary-400 text-sm font-bold transition-all">
                    <span>Inizia</span>
                    <ArrowRight className="h-4 w-4 group-hover:translate-x-1 transition-transform" />
                  </div>
                </Link>
              );
            })}
          </div>
        </CardContent>
      </Card>
    </div>
  );
}
