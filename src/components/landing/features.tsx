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
import { useLanguage } from "@/contexts/language-context";

const getFeatures = (t: (key: string) => string) => [
  {
    icon: Calendar,
    titleKey: "feature.calendar.title",
    descriptionKey: "feature.calendar.description",
    color: "text-primary-500"
  },
  {
    icon: CheckCircle,
    titleKey: "feature.validation.title",
    descriptionKey: "feature.validation.description",
    color: "text-success-500"
  },
  {
    icon: Users,
    titleKey: "feature.positions.title",
    descriptionKey: "feature.positions.description",
    color: "text-warning-500"
  },
  {
    icon: BarChart,
    titleKey: "feature.dashboard.title",
    descriptionKey: "feature.dashboard.description",
    color: "text-primary-600"
  },
  {
    icon: Clock,
    titleKey: "feature.quotas.title",
    descriptionKey: "feature.quotas.description",
    color: "text-success-600"
  },
  {
    icon: Bell,
    titleKey: "feature.notifications.title",
    descriptionKey: "feature.notifications.description",
    color: "text-warning-600"
  },
  {
    icon: Shield,
    titleKey: "feature.security.title",
    descriptionKey: "feature.security.description",
    color: "text-danger-500"
  },
  {
    icon: Zap,
    titleKey: "feature.performance.title",
    descriptionKey: "feature.performance.description",
    color: "text-primary-500"
  },
  {
    icon: Lock,
    titleKey: "feature.blackout.title",
    descriptionKey: "feature.blackout.description",
    color: "text-neutral-600"
  }
];

export function Features() {
  const { t } = useLanguage();
  const features = getFeatures(t);

  return (
    <section className="py-24 bg-neutral-50 dark:bg-neutral-900" id="features">
      <div className="container mx-auto px-4 sm:px-6 lg:px-8">
        {/* Section Header */}
        <div className="text-center max-w-3xl mx-auto mb-16">
          <h2 className="text-4xl md:text-5xl font-extrabold text-neutral-900 dark:text-neutral-100 mb-4">
            {t('features.title')}
          </h2>
          <p className="text-xl text-neutral-700 dark:text-neutral-300 font-medium">
            {t('features.subtitle')}
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
                  <CardTitle className="text-xl text-neutral-900 dark:text-neutral-100">{t(feature.titleKey)}</CardTitle>
                </CardHeader>
                <CardContent>
                  <CardDescription className="text-base text-neutral-700 dark:text-neutral-300">
                    {t(feature.descriptionKey)}
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
