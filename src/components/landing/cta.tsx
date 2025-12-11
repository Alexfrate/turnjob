"use client";

import Link from "next/link";
import { ArrowRight, Sparkles } from "lucide-react";
import { Button } from "@/components/ui/button";

export function CTA() {
  return (
    <section className="py-16 sm:py-20 md:py-24 bg-gradient-to-br from-primary-600 via-primary-500 to-primary-700 dark:from-primary-700 dark:via-primary-800 dark:to-neutral-900 relative overflow-hidden">
      {/* Background decoration */}
      <div className="absolute inset-0 opacity-10 dark:opacity-20">
        <div className="absolute top-0 right-0 w-96 h-96 bg-white dark:bg-primary-300 rounded-full blur-3xl"></div>
        <div className="absolute bottom-0 left-0 w-96 h-96 bg-white dark:bg-primary-300 rounded-full blur-3xl"></div>
      </div>

      <div className="container mx-auto px-4 sm:px-6 lg:px-8 relative z-10">
        <div className="max-w-4xl mx-auto text-center">
          {/* Icon */}
          <div className="inline-flex items-center justify-center w-14 h-14 sm:w-16 sm:h-16 bg-white/20 dark:bg-white/10 rounded-2xl mb-6 backdrop-blur-sm">
            <Sparkles className="h-7 w-7 sm:h-8 sm:w-8 text-white" aria-hidden="true" />
          </div>

          {/* Heading */}
          <h2 className="text-3xl sm:text-4xl md:text-5xl font-extrabold text-white mb-6 leading-tight">
            Pronto a semplificare la gestione dei turni?
          </h2>

          {/* Description */}
          <p className="text-lg sm:text-xl text-white/95 dark:text-neutral-100 font-medium mb-10 max-w-2xl mx-auto leading-relaxed">
            Unisciti a centinaia di aziende che hanno già rivoluzionato il modo di gestire il proprio team.
            Inizia oggi stesso, gratis.
          </p>

          {/* CTA Buttons */}
          <div className="flex flex-col sm:flex-row gap-4 justify-center items-center">
            <Button
              asChild
              size="lg"
              className="bg-white text-primary-600 hover:bg-neutral-100 dark:bg-white dark:text-primary-700 dark:hover:bg-neutral-50 text-lg font-bold px-8 py-6 shadow-xl hover:shadow-2xl transition-all duration-300 hover:scale-105 w-full sm:w-auto"
            >
              <Link href="/register" aria-label="Inizia gratuitamente con Turnjob">
                Inizia Gratis
                <ArrowRight className="ml-2 h-5 w-5" aria-hidden="true" />
              </Link>
            </Button>
            <Button
              asChild
              variant="outline"
              size="lg"
              className="border-2 border-white text-white hover:bg-white/20 dark:border-white dark:text-white dark:hover:bg-white/30 text-lg font-bold px-8 py-6 backdrop-blur-sm transition-all duration-300 w-full sm:w-auto"
            >
              <Link href="/contact" aria-label="Contatta il nostro team">
                Contattaci
              </Link>
            </Button>
          </div>

          {/* Trust Indicators */}
          <div className="mt-12 flex flex-wrap justify-center items-center gap-6 sm:gap-8 text-sm text-white font-semibold">
            <div className="flex items-center gap-2">
              <svg className="h-5 w-5" fill="currentColor" viewBox="0 0 20 20" aria-hidden="true">
                <path d="M10 18a8 8 0 100-16 8 8 0 000 16zm3.707-9.293a1 1 0 00-1.414-1.414L9 10.586 7.707 9.293a1 1 0 00-1.414 1.414l2 2a1 1 0 001.414 0l4-4z" />
              </svg>
              <span>Nessuna carta richiesta</span>
            </div>
            <div className="flex items-center gap-2">
              <svg className="h-5 w-5" fill="currentColor" viewBox="0 0 20 20" aria-hidden="true">
                <path d="M10 18a8 8 0 100-16 8 8 0 000 16zm3.707-9.293a1 1 0 00-1.414-1.414L9 10.586 7.707 9.293a1 1 0 00-1.414 1.414l2 2a1 1 0 001.414 0l4-4z" />
              </svg>
              <span>Setup in 5 minuti</span>
            </div>
            <div className="flex items-center gap-2">
              <svg className="h-5 w-5" fill="currentColor" viewBox="0 0 20 20" aria-hidden="true">
                <path d="M10 18a8 8 0 100-16 8 8 0 000 16zm3.707-9.293a1 1 0 00-1.414-1.414L9 10.586 7.707 9.293a1 1 0 00-1.414 1.414l2 2a1 1 0 001.414 0l4-4z" />
              </svg>
              <span>Annulla quando vuoi</span>
            </div>
          </div>
        </div>
      </div>
    </section>
  );
}
