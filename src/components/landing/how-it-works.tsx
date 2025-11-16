"use client";

import { UserPlus, Settings, Calendar, CheckCircle } from "lucide-react";
import { useLanguage } from "@/contexts/language-context";

const getSteps = (t: (key: string) => string) => [
  {
    icon: UserPlus,
    titleKey: "howItWorks.step1.title",
    descriptionKey: "howItWorks.step1.description",
    color: "bg-primary-500"
  },
  {
    icon: Settings,
    titleKey: "howItWorks.step2.title",
    descriptionKey: "howItWorks.step2.description",
    color: "bg-primary-600"
  },
  {
    icon: Calendar,
    titleKey: "howItWorks.step3.title",
    descriptionKey: "howItWorks.step3.description",
    color: "bg-primary-700"
  },
  {
    icon: CheckCircle,
    titleKey: "howItWorks.step4.title",
    descriptionKey: "howItWorks.step4.description",
    color: "bg-success-500"
  }
];

export function HowItWorks() {
  const { t } = useLanguage();
  const steps = getSteps(t);

  return (
    <section className="py-24 bg-white dark:bg-neutral-950">
      <div className="container mx-auto px-4 sm:px-6 lg:px-8">
        {/* Section Header */}
        <div className="text-center max-w-3xl mx-auto mb-16">
          <h2 className="text-4xl md:text-5xl font-extrabold text-neutral-900 dark:text-neutral-100 mb-4">
            {t('howItWorks.title')}
          </h2>
          <p className="text-xl text-neutral-700 dark:text-neutral-300 font-medium">
            {t('howItWorks.subtitle')}
          </p>
        </div>

        {/* Steps */}
        <div className="max-w-5xl mx-auto">
          <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-8">
            {steps.map((step, index) => {
              const Icon = step.icon;
              return (
                <div key={index} className="relative">
                  {/* Connector Line */}
                  {index < steps.length - 1 && (
                    <div className="hidden lg:block absolute top-12 left-full w-full h-0.5 bg-gradient-to-r from-primary-300 to-transparent -z-10"></div>
                  )}

                  <div className="text-center">
                    {/* Icon */}
                    <div className={`w-24 h-24 ${step.color} rounded-2xl flex items-center justify-center mx-auto mb-6 shadow-lg transform hover:scale-110 transition-transform`}>
                      <Icon className="h-12 w-12 text-white" />
                    </div>

                    {/* Content */}
                    <h3 className="text-xl font-bold text-neutral-900 dark:text-neutral-100 mb-3">
                      {t(step.titleKey)}
                    </h3>
                    <p className="text-neutral-700 dark:text-neutral-300 font-medium">
                      {t(step.descriptionKey)}
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
