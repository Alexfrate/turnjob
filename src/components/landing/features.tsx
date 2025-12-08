"use client";

import {
  Calendar,
  CheckCircle,
  Users,
  Shield,
  Zap,
  BarChart,
  Clock,
  Bell,
  Lock
} from "lucide-react";
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";

const features = [
  {
    icon: Calendar,
    title: "Calendario Intuitivo",
    description: "Visualizza e gestisci tutti i turni in un calendario chiaro e facile da usare. Drag & drop per modifiche rapide.",
    color: "text-primary-500"
  },
  {
    icon: CheckCircle,
    title: "Validazione Automatica",
    description: "Il sistema verifica automaticamente la compatibilità dei turni, evitando sovrapposizioni e conflitti.",
    color: "text-success-500"
  },
  {
    icon: Users,
    title: "Gestione Nuclei",
    description: "Organizza i collaboratori in nuclei per mansione, reparto o qualsiasi criterio. Assegna turni per gruppo.",
    color: "text-warning-500"
  },
  {
    icon: BarChart,
    title: "Dashboard Analitica",
    description: "Monitora le statistiche del tuo team: ore lavorate, presenze, copertura turni e molto altro.",
    color: "text-primary-600"
  },
  {
    icon: Clock,
    title: "Ore Flessibili",
    description: "Configura ore settimanali fisse, mensili o flessibili per ogni collaboratore secondo le tue esigenze.",
    color: "text-success-600"
  },
  {
    icon: Bell,
    title: "Notifiche Smart",
    description: "Avvisa automaticamente i collaboratori di nuovi turni, modifiche o richieste da approvare.",
    color: "text-warning-600"
  },
  {
    icon: Shield,
    title: "Sicurezza Avanzata",
    description: "I tuoi dati sono protetti con crittografia di livello enterprise e backup automatici.",
    color: "text-danger-500"
  },
  {
    icon: Zap,
    title: "Prestazioni Elevate",
    description: "Interfaccia veloce e reattiva anche con migliaia di turni. Ottimizzato per ogni dispositivo.",
    color: "text-primary-500"
  },
  {
    icon: Lock,
    title: "Periodi di Blocco",
    description: "Definisci periodi in cui non è possibile richiedere ferie o permessi, come festività o alta stagione.",
    color: "text-neutral-600"
  }
];

export function Features() {
  return (
    <section className="py-24 bg-neutral-50 dark:bg-neutral-900" id="features">
      <div className="container mx-auto px-4 sm:px-6 lg:px-8">
        {/* Section Header */}
        <div className="text-center max-w-3xl mx-auto mb-16">
          <h2 className="text-4xl md:text-5xl font-extrabold text-neutral-900 dark:text-neutral-100 mb-4">
            Tutto ciò di cui hai bisogno
          </h2>
          <p className="text-xl text-neutral-700 dark:text-neutral-300 font-medium">
            Funzionalità pensate per semplificare la gestione del tuo team
          </p>
        </div>

        {/* Features Grid */}
        <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-8 max-w-7xl mx-auto">
          {features.map((feature, index) => {
            const Icon = feature.icon;
            return (
              <Card
                key={index}
                className="border-2 hover:border-primary-200 dark:hover:border-primary-700 transition-all hover:shadow-lg group bg-white dark:bg-neutral-800"
              >
                <CardHeader>
                  <div className={`w-12 h-12 rounded-lg bg-primary-50 dark:bg-primary-900/20 flex items-center justify-center mb-4 group-hover:scale-110 transition-transform`}>
                    <Icon className={`h-6 w-6 ${feature.color}`} />
                  </div>
                  <CardTitle className="text-xl text-neutral-900 dark:text-neutral-100">{feature.title}</CardTitle>
                </CardHeader>
                <CardContent>
                  <CardDescription className="text-base text-neutral-700 dark:text-neutral-300">
                    {feature.description}
                  </CardDescription>
                </CardContent>
              </Card>
            );
          })}
        </div>
      </div>
    </section>
  );
}
