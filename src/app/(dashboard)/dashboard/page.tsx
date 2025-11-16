"use client";

import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Calendar, Users, Clock, CheckCircle, ArrowRight, TrendingUp, TrendingDown } from "lucide-react";
import { useLanguage } from "@/contexts/language-context";

export default function DashboardPage() {
  const { t } = useLanguage();

  const stats = [
    {
      name: t('stats.pending'),
      value: "12",
      change: t('stats.pendingChange'),
      trend: "up",
      trendValue: "+25%",
      icon: Clock,
      color: "text-warning-600 dark:text-warning-400",
      bgColor: "bg-warning-100 dark:bg-warning-900/30",
      bgGradient: "from-warning-50 to-warning-100/50 dark:from-warning-900/20 dark:to-warning-900/10"
    },
    {
      name: t('stats.approved'),
      value: "45",
      change: t('stats.approvedChange'),
      trend: "up",
      trendValue: "+8%",
      icon: CheckCircle,
      color: "text-success-600 dark:text-success-400",
      bgColor: "bg-success-100 dark:bg-success-900/30",
      bgGradient: "from-success-50 to-success-100/50 dark:from-success-900/20 dark:to-success-900/10"
    },
    {
      name: t('stats.active'),
      value: "28",
      change: t('stats.activeChange'),
      trend: "neutral",
      trendValue: "93%",
      icon: Users,
      color: "text-primary-600 dark:text-primary-400",
      bgColor: "bg-primary-100 dark:bg-primary-900/30",
      bgGradient: "from-primary-50 to-primary-100/50 dark:from-primary-900/20 dark:to-primary-900/10"
    },
    {
      name: t('stats.shifts'),
      value: "156",
      change: t('stats.shiftsChange'),
      trend: "up",
      trendValue: "+12%",
      icon: Calendar,
      color: "text-primary-700 dark:text-primary-400",
      bgColor: "bg-primary-100 dark:bg-primary-900/30",
      bgGradient: "from-primary-50 to-primary-100/50 dark:from-primary-900/20 dark:to-primary-900/10"
    }
  ];

  const recentRequests = [
    {
      id: 1,
      name: "Mario Rossi",
      type: "Ferie",
      period: "15-22 Dic 2024",
      days: "7 giorni",
      status: "pending"
    },
    {
      id: 2,
      name: "Giulia Bianchi",
      type: "Permesso",
      period: "20 Dic 2024",
      days: "1 giorno",
      status: "pending"
    },
    {
      id: 3,
      name: "Luca Verdi",
      type: "Ferie",
      period: "23-30 Dic 2024",
      days: "7 giorni",
      status: "pending"
    }
  ];

  const quickActions = [
    {
      icon: Calendar,
      title: t('actions.viewCalendar'),
      description: t('actions.viewCalendarDesc'),
      href: "/dashboard/calendar",
      color: "text-primary-600 dark:text-primary-400",
      bgColor: "bg-primary-50 dark:bg-primary-900/20",
      borderColor: "border-primary-200 dark:border-primary-700"
    },
    {
      icon: Users,
      title: t('actions.manageTeam'),
      description: t('actions.manageTeamDesc'),
      href: "/dashboard/team",
      color: "text-blue-600 dark:text-blue-400",
      bgColor: "bg-blue-50 dark:bg-blue-900/20",
      borderColor: "border-blue-200 dark:border-blue-700"
    },
    {
      icon: CheckCircle,
      title: t('actions.approveRequests'),
      description: t('actions.approveRequestsDesc'),
      href: "/dashboard/requests",
      color: "text-success-600 dark:text-success-400",
      bgColor: "bg-success-50 dark:bg-success-900/20",
      borderColor: "border-success-200 dark:border-success-700"
    }
  ];

  return (
    <div className="space-y-6 animate-in fade-in duration-500">
      {/* Page Header */}
      <div>
        <h1 className="text-3xl font-bold text-neutral-900 dark:text-neutral-100">
          {t('dashboard.title')}
        </h1>
        <p className="text-neutral-700 dark:text-neutral-300 mt-1 font-medium">
          {t('dashboard.subtitle')}
        </p>
      </div>

      {/* Stats Grid */}
      <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-6">
        {stats.map((stat, index) => {
          const Icon = stat.icon;
          return (
            <Card
              key={stat.name}
              className="group hover:shadow-lg transition-all duration-300 hover:-translate-y-1 animate-in slide-in-from-bottom duration-500"
              style={{ animationDelay: `${index * 100}ms` }}
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
                  {stat.trend === "up" && (
                    <div className="flex items-center gap-1 text-success-600 dark:text-success-400 text-sm font-medium">
                      <TrendingUp className="h-4 w-4" />
                      <span>{stat.trendValue}</span>
                    </div>
                  )}
                  {stat.trend === "down" && (
                    <div className="flex items-center gap-1 text-danger-600 dark:text-danger-400 text-sm font-medium">
                      <TrendingDown className="h-4 w-4" />
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

      {/* Content Grid */}
      <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
        {/* Recent Requests */}
        <Card className="animate-in slide-in-from-left duration-500 delay-200">
          <CardHeader>
            <div className="flex items-center justify-between">
              <div>
                <CardTitle>{t('requests.title')}</CardTitle>
                <CardDescription>
                  {t('requests.subtitle')}
                </CardDescription>
              </div>
              <Button variant="ghost" size="sm" className="gap-2">
                View all
                <ArrowRight className="h-4 w-4" />
              </Button>
            </div>
          </CardHeader>
          <CardContent>
            <div className="space-y-3">
              {recentRequests.map((request) => (
                <div
                  key={request.id}
                  className="group flex items-center justify-between p-4 bg-neutral-50 dark:bg-neutral-800/50 rounded-lg hover:bg-neutral-100 dark:hover:bg-neutral-800 transition-all duration-200 border border-transparent hover:border-neutral-200 dark:hover:border-neutral-700"
                >
                  <div className="flex items-center gap-3">
                    <div className="w-10 h-10 rounded-full bg-gradient-to-br from-primary-100 to-primary-200 dark:from-primary-900/30 dark:to-primary-900/20 flex items-center justify-center">
                      <Users className="h-5 w-5 text-primary-600 dark:text-primary-400" />
                    </div>
                    <div>
                      <div className="font-semibold text-neutral-900 dark:text-neutral-100">
                        {request.name}
                      </div>
                      <div className="text-sm text-neutral-800 dark:text-neutral-300 font-semibold">
                        {request.type}: {request.period}
                      </div>
                      <div className="text-xs text-neutral-700 dark:text-neutral-400 mt-0.5 font-semibold">
                        {request.days}
                      </div>
                    </div>
                  </div>
                  <div className="flex items-center gap-2">
                    <span className="text-xs bg-warning-100 dark:bg-warning-900/40 text-warning-800 dark:text-warning-300 px-3 py-1.5 rounded-full font-bold border border-warning-200 dark:border-warning-700">
                      {t('requests.pending')}
                    </span>
                    <Button variant="ghost" size="sm" className="opacity-0 group-hover:opacity-100 transition-opacity">
                      <ArrowRight className="h-4 w-4" />
                    </Button>
                  </div>
                </div>
              ))}
            </div>
          </CardContent>
        </Card>

        {/* Calendar Overview */}
        <Card className="animate-in slide-in-from-right duration-500 delay-200">
          <CardHeader>
            <CardTitle>{t('calendar.title')}</CardTitle>
            <CardDescription>
              {t('calendar.subtitle')}
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
                  {t('calendar.coming')}
                </p>
                <Button variant="outline" size="sm" className="mt-4">
                  Preview Calendar
                </Button>
              </div>
            </div>
          </CardContent>
        </Card>
      </div>

      {/* Quick Actions */}
      <Card className="animate-in slide-in-from-bottom duration-500 delay-300">
        <CardHeader>
          <CardTitle>{t('actions.title')}</CardTitle>
          <CardDescription>
            {t('actions.subtitle')}
          </CardDescription>
        </CardHeader>
        <CardContent>
          <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
            {quickActions.map((action, index) => {
              const Icon = action.icon;
              return (
                <button
                  key={action.title}
                  className={`group p-6 text-left rounded-xl border-2 transition-all duration-300 hover:shadow-lg hover:-translate-y-1 ${action.borderColor} ${action.bgColor} hover:bg-opacity-80`}
                  style={{ animationDelay: `${(index + 4) * 100}ms` }}
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
                    <span>{t('actions.getStarted')}</span>
                    <ArrowRight className="h-4 w-4 group-hover:translate-x-1 transition-transform" />
                  </div>
                </button>
              );
            })}
          </div>
        </CardContent>
      </Card>
    </div>
  );
}
