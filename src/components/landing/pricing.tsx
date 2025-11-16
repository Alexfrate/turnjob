"use client";

import { Check } from "lucide-react";
import { Button } from "@/components/ui/button";
import { Card, CardContent, CardDescription, CardFooter, CardHeader, CardTitle } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import Link from "next/link";
import { useLanguage } from "@/contexts/language-context";

const getPlans = (t: (key: string) => string) => [
  {
    nameKey: "pricing.starter.name",
    descriptionKey: "pricing.starter.description",
    priceKey: "pricing.starter.price",
    periodKey: "pricing.starter.period",
    featureKeys: [
      "pricing.starter.feature1",
      "pricing.starter.feature2",
      "pricing.starter.feature3",
      "pricing.starter.feature4",
      "pricing.starter.feature5",
      "pricing.starter.feature6"
    ],
    ctaKey: "pricing.starter.cta",
    popular: false
  },
  {
    nameKey: "pricing.professional.name",
    descriptionKey: "pricing.professional.description",
    priceKey: "pricing.professional.price",
    periodKey: "pricing.professional.period",
    featureKeys: [
      "pricing.professional.feature1",
      "pricing.professional.feature2",
      "pricing.professional.feature3",
      "pricing.professional.feature4",
      "pricing.professional.feature5",
      "pricing.professional.feature6",
      "pricing.professional.feature7",
      "pricing.professional.feature8"
    ],
    ctaKey: "pricing.professional.cta",
    popularKey: "pricing.professional.popular",
    popular: true
  },
  {
    nameKey: "pricing.enterprise.name",
    descriptionKey: "pricing.enterprise.description",
    priceKey: "pricing.enterprise.price",
    priceLabelKey: "pricing.enterprise.priceLabel",
    periodKey: "",
    featureKeys: [
      "pricing.enterprise.feature1",
      "pricing.enterprise.feature2",
      "pricing.enterprise.feature3",
      "pricing.enterprise.feature4",
      "pricing.enterprise.feature5",
      "pricing.enterprise.feature6",
      "pricing.enterprise.feature7",
      "pricing.enterprise.feature8",
      "pricing.enterprise.feature9"
    ],
    ctaKey: "pricing.enterprise.cta",
    popular: false
  }
];

export function Pricing() {
  const { t } = useLanguage();
  const plans = getPlans(t);

  return (
    <section className="py-24 bg-neutral-50 dark:bg-neutral-900" id="pricing">
      <div className="container mx-auto px-4 sm:px-6 lg:px-8">
        {/* Section Header */}
        <div className="text-center max-w-3xl mx-auto mb-16">
          <h2 className="text-4xl md:text-5xl font-extrabold text-neutral-900 dark:text-neutral-100 mb-4">
            {t('pricing.title')}
          </h2>
          <p className="text-xl text-neutral-700 dark:text-neutral-300 font-medium">
            {t('pricing.subtitle')}
          </p>
        </div>

        {/* Pricing Cards */}
        <div className="grid grid-cols-1 md:grid-cols-3 gap-8 max-w-7xl mx-auto">
          {plans.map((plan, index) => (
            <Card
              key={index}
              className={`relative bg-white dark:bg-neutral-800 ${
                plan.popular
                  ? "border-primary-500 dark:border-primary-600 border-2 shadow-xl scale-105"
                  : "border-neutral-200 dark:border-neutral-700"
              }`}
            >
              {plan.popular && (
                <div className="absolute -top-4 left-1/2 -translate-x-1/2">
                  <Badge className="px-4 py-1">{t(plan.popularKey || 'pricing.professional.popular')}</Badge>
                </div>
              )}

              <CardHeader>
                <CardTitle className="text-2xl">{t(plan.nameKey)}</CardTitle>
                <CardDescription className="text-base">
                  {t(plan.descriptionKey)}
                </CardDescription>
                <div className="mt-4">
                  {t(plan.priceKey) === "Custom" ? (
                    <div className="text-4xl font-bold text-neutral-900 dark:text-neutral-100">
                      {t(plan.priceLabelKey || 'pricing.enterprise.priceLabel')}
                    </div>
                  ) : (
                    <div className="flex items-baseline">
                      <span className="text-5xl font-bold text-neutral-900 dark:text-neutral-100">
                        €{t(plan.priceKey)}
                      </span>
                      {plan.periodKey && (
                        <span className="text-neutral-600 dark:text-neutral-400 ml-2">/{t(plan.periodKey)}</span>
                      )}
                    </div>
                  )}
                </div>
              </CardHeader>

              <CardContent>
                <ul className="space-y-3">
                  {plan.featureKeys.map((featureKey, featureIndex) => (
                    <li key={featureIndex} className="flex items-start gap-3">
                      <Check className="h-5 w-5 text-success-500 dark:text-success-400 flex-shrink-0 mt-0.5" />
                      <span className="text-neutral-700 dark:text-neutral-300">{t(featureKey)}</span>
                    </li>
                  ))}
                </ul>
              </CardContent>

              <CardFooter>
                <Button
                  asChild
                  className="w-full"
                  variant={plan.popular ? "default" : "outline"}
                  size="lg"
                >
                  <Link href={t(plan.nameKey) === "Enterprise" ? "/contact" : "/register"}>
                    {t(plan.ctaKey)}
                  </Link>
                </Button>
              </CardFooter>
            </Card>
          ))}
        </div>

        {/* Bottom Note */}
        <p className="text-center text-neutral-500 dark:text-neutral-400 mt-12">
          {t('pricing.trial')}
        </p>
      </div>
    </section>
  );
}
