"use client";

import Link from "next/link";
import { ArrowRight, Calendar, Users, TrendingUp } from "lucide-react";
import { Button } from "@/components/ui/button";
import { Badge } from "@/components/ui/badge";

export function Hero() {
  return (
    <section className="relative overflow-hidden bg-gradient-to-b from-primary-50 via-white to-white dark:from-neutral-900 dark:via-neutral-950 dark:to-neutral-950 pt-20 pb-32">
      {/* Background decoration */}
      <div className="absolute inset-0 -z-10">
        <div className="absolute top-0 left-1/4 w-96 h-96 bg-primary-200 dark:bg-primary-900 rounded-full mix-blend-multiply dark:mix-blend-lighten filter blur-3xl opacity-20 dark:opacity-10 animate-blob"></div>
        <div className="absolute top-0 right-1/4 w-96 h-96 bg-success-200 dark:bg-success-900 rounded-full mix-blend-multiply dark:mix-blend-lighten filter blur-3xl opacity-20 dark:opacity-10 animate-blob animation-delay-2000"></div>
        <div className="absolute bottom-0 left-1/2 w-96 h-96 bg-warning-200 dark:bg-warning-900 rounded-full mix-blend-multiply dark:mix-blend-lighten filter blur-3xl opacity-20 dark:opacity-10 animate-blob animation-delay-4000"></div>
      </div>

      <div className="container mx-auto px-4 sm:px-6 lg:px-8">
        <div className="text-center max-w-4xl mx-auto">
          {/* Badge */}
          <Badge variant="secondary" className="mb-6 text-sm font-semibold px-4 py-2">
            <span className="mr-2">🚀</span>
            Nuovo: Gestione turni intelligente con AI
          </Badge>

          {/* Heading */}
          <h1 className="text-5xl md:text-6xl lg:text-7xl font-extrabold tracking-tight mb-6">
            <span className="bg-gradient-to-r from-primary-600 via-primary-500 to-primary-700 dark:from-primary-400 dark:via-primary-300 dark:to-primary-500 bg-clip-text text-transparent">
              Gestione Turni
            </span>
            <br />
            <span className="text-neutral-900 dark:text-neutral-100">
              Semplice e Potente
            </span>
          </h1>

          {/* Description */}
          <p className="text-xl md:text-2xl text-neutral-700 dark:text-neutral-300 font-medium mb-10 max-w-3xl mx-auto leading-relaxed">
            Pianifica, organizza e gestisci i turni del tuo team in modo intelligente.
            Risparmia tempo e riduci gli errori con la nostra piattaforma intuitiva.
          </p>

          {/* CTA Buttons */}
          <div className="flex flex-col sm:flex-row gap-4 justify-center items-center mb-16">
            <Button asChild size="lg" className="text-lg font-bold px-8 py-6 shadow-lg hover:shadow-xl transition-all">
              <Link href="/register">
                Inizia Gratis
                <ArrowRight className="ml-2 h-5 w-5" />
              </Link>
            </Button>
            <Button asChild variant="outline" size="lg" className="text-lg font-bold px-8 py-6 border-2">
              <Link href="/login">
                Accedi
              </Link>
            </Button>
          </div>

          {/* Social Proof */}
          <div className="grid grid-cols-1 md:grid-cols-3 gap-6 max-w-3xl mx-auto">
            <div className="flex flex-col items-center gap-2 p-4 rounded-xl bg-white/50 dark:bg-neutral-900/50 backdrop-blur-sm border border-neutral-200 dark:border-neutral-800">
              <Users className="h-8 w-8 text-primary-600 dark:text-primary-400" />
              <div className="text-2xl font-bold text-neutral-900 dark:text-neutral-100">500+ Aziende</div>
            </div>
            <div className="flex flex-col items-center gap-2 p-4 rounded-xl bg-white/50 dark:bg-neutral-900/50 backdrop-blur-sm border border-neutral-200 dark:border-neutral-800">
              <Calendar className="h-8 w-8 text-primary-600 dark:text-primary-400" />
              <div className="text-2xl font-bold text-neutral-900 dark:text-neutral-100">1M+ Turni Gestiti</div>
            </div>
            <div className="flex flex-col items-center gap-2 p-4 rounded-xl bg-white/50 dark:bg-neutral-900/50 backdrop-blur-sm border border-neutral-200 dark:border-neutral-800">
              <TrendingUp className="h-8 w-8 text-primary-600 dark:text-primary-400" />
              <div className="text-2xl font-bold text-neutral-900 dark:text-neutral-100">98% Soddisfatti</div>
            </div>
          </div>
        </div>
      </div>
    </section>
  );
}
