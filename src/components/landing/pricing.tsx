"use client";

import { Check } from "lucide-react";
import { Button } from "@/components/ui/button";
import { Card, CardContent, CardDescription, CardFooter, CardHeader, CardTitle } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import Link from "next/link";

const plans = [
  {
    name: "Starter",
    description: "Perfetto per piccoli team che iniziano",
    price: "0",
    period: "mese",
    features: [
      "Fino a 5 collaboratori",
      "Calendario base",
      "1 Nucleo",
      "Notifiche email",
      "Supporto community",
      "Export PDF base"
    ],
    cta: "Inizia Gratis",
    popular: false
  },
  {
    name: "Professional",
    description: "Per team in crescita con esigenze avanzate",
    price: "29",
    period: "mese",
    features: [
      "Fino a 25 collaboratori",
      "Calendario avanzato",
      "Nuclei illimitati",
      "Notifiche push & email",
      "Dashboard analitica",
      "Export avanzati",
      "Supporto prioritario",
      "Integrazioni API"
    ],
    cta: "Prova 14 giorni gratis",
    popularBadge: "Più Popolare",
    popular: true
  },
  {
    name: "Enterprise",
    description: "Soluzioni personalizzate per grandi organizzazioni",
    price: "Personalizzato",
    priceLabel: "Contattaci",
    period: "",
    features: [
      "Collaboratori illimitati",
      "Multi-sede supportato",
      "Nuclei illimitati",
      "SSO & SAML",
      "API dedicate",
      "Manager dedicato",
      "SLA garantito",
      "Formazione inclusa",
      "Personalizzazioni"
    ],
    cta: "Contatta Vendite",
    popular: false
  }
];

export function Pricing() {
  return (
    <section className="py-16 sm:py-20 md:py-24 bg-neutral-50 dark:bg-neutral-900" id="pricing">
      <div className="container mx-auto px-4 sm:px-6 lg:px-8">
        {/* Section Header */}
        <div className="text-center max-w-3xl mx-auto mb-12 sm:mb-16">
          <h2 className="text-3xl sm:text-4xl md:text-5xl font-extrabold text-neutral-900 dark:text-white mb-4">
            Prezzi Semplici e Trasparenti
          </h2>
          <p className="text-lg sm:text-xl text-neutral-600 dark:text-neutral-200 font-medium">
            Scegli il piano più adatto alle tue esigenze. Nessun costo nascosto.
          </p>
        </div>

        {/* Pricing Cards */}
        <div className="grid grid-cols-1 md:grid-cols-3 gap-6 sm:gap-8 max-w-7xl mx-auto">
          {plans.map((plan, index) => (
            <Card
              key={index}
              className={`relative bg-white dark:bg-neutral-800 transition-all duration-300 hover:shadow-xl ${plan.popular
                  ? "border-primary-500 dark:border-primary-600 border-2 shadow-xl md:scale-105"
                  : "border-neutral-200 dark:border-neutral-700 hover:border-primary-300 dark:hover:border-primary-700"
                }`}
            >
              {plan.popular && plan.popularBadge && (
                <div className="absolute -top-4 left-1/2 -translate-x-1/2 z-10">
                  <Badge className="px-4 py-1 shadow-md">{plan.popularBadge}</Badge>
                </div>
              )}

              <CardHeader>
                <CardTitle className="text-xl sm:text-2xl text-neutral-900 dark:text-white">{plan.name}</CardTitle>
                <CardDescription className="text-sm sm:text-base text-neutral-600 dark:text-neutral-300">
                  {plan.description}
                </CardDescription>
                <div className="mt-4">
                  {plan.priceLabel ? (
                    <div className="text-3xl sm:text-4xl font-bold text-neutral-900 dark:text-white">
                      {plan.priceLabel}
                    </div>
                  ) : (
                    <div className="flex items-baseline">
                      <span className="text-4xl sm:text-5xl font-bold text-neutral-900 dark:text-white">
                        €{plan.price}
                      </span>
                      {plan.period && (
                        <span className="text-neutral-600 dark:text-neutral-300 ml-2 text-base sm:text-lg">/{plan.period}</span>
                      )}
                    </div>
                  )}
                </div>
              </CardHeader>

              <CardContent>
                <ul className="space-y-3">
                  {plan.features.map((feature, featureIndex) => (
                    <li key={featureIndex} className="flex items-start gap-3">
                      <Check className="h-5 w-5 text-success-500 dark:text-success-400 flex-shrink-0 mt-0.5" aria-hidden="true" />
                      <span className="text-sm sm:text-base text-neutral-600 dark:text-neutral-200">{feature}</span>
                    </li>
                  ))}
                </ul>
              </CardContent>

              <CardFooter>
                <Button
                  asChild
                  className="w-full transition-all duration-300 hover:scale-105"
                  variant={plan.popular ? "default" : "outline"}
                  size="lg"
                >
                  <Link
                    href={plan.name === "Enterprise" ? "/contact" : "/register"}
                    aria-label={`${plan.cta} - Piano ${plan.name}`}
                  >
                    {plan.cta}
                  </Link>
                </Button>
              </CardFooter>
            </Card>
          ))}
        </div>

        {/* Bottom Note */}
        <p className="text-center text-neutral-500 dark:text-neutral-300 mt-12 text-sm sm:text-base">
          Tutti i piani includono 14 giorni di prova gratuita. Nessuna carta di credito richiesta.
        </p>
      </div>
    </section>
  );
}
