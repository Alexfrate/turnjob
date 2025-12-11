"use client";

import { UserPlus, Settings, Calendar, CheckCircle } from "lucide-react";

const steps = [
  {
    icon: UserPlus,
    title: "1. Crea il tuo Account",
    description: "Registrati gratuitamente in pochi secondi. Nessuna carta di credito richiesta.",
    color: "bg-primary-500"
  },
  {
    icon: Settings,
    title: "2. Configura l'Azienda",
    description: "Imposta i nuclei, aggiungi i collaboratori e definisci le regole dei turni.",
    color: "bg-primary-600"
  },
  {
    icon: Calendar,
    title: "3. Pianifica i Turni",
    description: "Crea e assegna turni con il nostro calendario intuitivo. Drag & drop facile.",
    color: "bg-primary-700"
  },
  {
    icon: CheckCircle,
    title: "4. Gestisci con Semplicità",
    description: "Monitora, modifica e ottimizza la gestione del tuo team in tempo reale.",
    color: "bg-success-500"
  }
];

export function HowItWorks() {
  return (
    <section className="py-16 sm:py-20 md:py-24 bg-white dark:bg-neutral-950">
      <div className="container mx-auto px-4 sm:px-6 lg:px-8">
        {/* Section Header */}
        <div className="text-center max-w-3xl mx-auto mb-12 sm:mb-16">
          <h2 className="text-3xl sm:text-4xl md:text-5xl font-extrabold text-neutral-900 dark:text-white mb-4">
            Come Funziona
          </h2>
          <p className="text-lg sm:text-xl text-neutral-600 dark:text-neutral-200 font-medium">
            Inizia a gestire i turni del tuo team in soli 4 semplici passaggi
          </p>
        </div>

        {/* Steps */}
        <div className="max-w-5xl mx-auto">
          <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-8 sm:gap-10">
            {steps.map((step, index) => {
              const Icon = step.icon;
              return (
                <div key={index} className="relative">
                  {/* Connector Line */}
                  {index < steps.length - 1 && (
                    <div className="hidden lg:block absolute top-12 left-full w-full h-0.5 bg-gradient-to-r from-primary-400 via-primary-300 to-transparent dark:from-primary-600 dark:via-primary-700 dark:to-transparent -z-10"></div>
                  )}

                  <div className="text-center">
                    {/* Icon */}
                    <div className={`w-20 h-20 sm:w-24 sm:h-24 ${step.color} rounded-2xl flex items-center justify-center mx-auto mb-6 shadow-lg transform hover:scale-110 transition-transform duration-300`}>
                      <Icon className="h-10 w-10 sm:h-12 sm:w-12 text-white" aria-hidden="true" />
                    </div>

                    {/* Content */}
                    <h3 className="text-lg sm:text-xl font-bold text-neutral-900 dark:text-white mb-3">
                      {step.title}
                    </h3>
                    <p className="text-sm sm:text-base text-neutral-600 dark:text-neutral-200 font-medium leading-relaxed">
                      {step.description}
                    </p>
                  </div>
                </div>
              );
            })}
          </div>
        </div>
      </div>
    </section>
  );
}
