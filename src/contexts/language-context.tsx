'use client';

import React, { createContext, useContext, useState, useEffect } from 'react';

type Language = 'it' | 'en';

interface LanguageContextType {
  language: Language;
  setLanguage: (lang: Language) => void;
  t: (key: string) => string;
}

const translations = {
  it: {
    // Navbar
    'nav.features': 'Funzionalità',
    'nav.pricing': 'Prezzi',
    'nav.about': 'Chi Siamo',
    'nav.login': 'Accedi',
    'nav.register': 'Inizia Gratis',

    // Hero
    'hero.badge': 'Gestione turni semplificata per la tua azienda',
    'hero.title': 'Turnjob',
    'hero.subtitle': 'Gestione Turni Intelligente',
    'hero.description': 'La piattaforma SaaS che semplifica la gestione di turni, ferie e permessi. Sistema intelligente con validazione automatica e disponibilità real-time.',
    'hero.cta.primary': 'Inizia Gratis',
    'hero.cta.secondary': 'Accedi',
    'hero.social.companies': '500+ Aziende',
    'hero.social.shifts': '10K+ Turni Gestiti',
    'hero.social.satisfaction': '95% Soddisfazione',

    // Features
    'features.title': 'Tutto ciò di cui hai bisogno',
    'features.subtitle': 'Funzionalità complete per gestire i turni del tuo team in modo efficiente e trasparente',
    'feature.calendar.title': 'Calendario Real-time',
    'feature.calendar.description': 'Visualizza la disponibilità degli slot in tempo reale per ogni mansione aziendale',
    'feature.validation.title': 'Validazione Intelligente',
    'feature.validation.description': 'Sistema automatico che previene conflitti e sovrapposizioni nelle richieste',
    'feature.positions.title': 'Gestione per Mansione',
    'feature.positions.description': 'Configura limiti di assenze contemporanee per ogni ruolo aziendale',
    'feature.dashboard.title': 'Dashboard Completa',
    'feature.dashboard.description': 'Monitora quote residue, richieste pending e statistiche del team in un colpo d\'occhio',
    'feature.quotas.title': 'Quote Personalizzabili',
    'feature.quotas.description': 'Gestisci ferie, permessi, ROL e riposi con configurazioni flessibili per anno',
    'feature.notifications.title': 'Notifiche Automatiche',
    'feature.notifications.description': 'Sistema di notifiche email per approvazioni, rifiuti e reminder importante',
    'feature.security.title': 'Sicurezza Garantita',
    'feature.security.description': 'Autenticazione robusta con Row Level Security e protezione dati GDPR compliant',
    'feature.performance.title': 'Veloce e Reattivo',
    'feature.performance.description': 'Interfaccia moderna e performante, ottimizzata per desktop e mobile',
    'feature.blackout.title': 'Periodi di Blackout',
    'feature.blackout.description': 'Configura periodi di blocco per alta stagione o eventi critici aziendali',

    // Pricing
    'pricing.title': 'Prezzi Trasparenti',
    'pricing.subtitle': 'Scegli il piano perfetto per la tua azienda. Nessun costo nascosto.',
    'pricing.trial': 'Tutti i piani includono 14 giorni di prova gratuita. Nessuna carta di credito richiesta.',
    'pricing.starter.name': 'Starter',
    'pricing.starter.description': 'Perfetto per piccole aziende',
    'pricing.starter.price': '29',
    'pricing.starter.period': 'mese',
    'pricing.starter.cta': 'Inizia Gratis',
    'pricing.starter.feature1': 'Fino a 10 dipendenti',
    'pricing.starter.feature2': 'Calendario real-time',
    'pricing.starter.feature3': 'Gestione richieste base',
    'pricing.starter.feature4': 'Dashboard essenziale',
    'pricing.starter.feature5': 'Supporto email',
    'pricing.starter.feature6': '1 mansione configurabile',
    'pricing.professional.name': 'Professional',
    'pricing.professional.description': 'Ideale per aziende in crescita',
    'pricing.professional.price': '79',
    'pricing.professional.period': 'mese',
    'pricing.professional.cta': 'Prova 14 Giorni Gratis',
    'pricing.professional.feature1': 'Fino a 50 dipendenti',
    'pricing.professional.feature2': 'Tutte le feature Starter',
    'pricing.professional.feature3': 'Mansioni illimitate',
    'pricing.professional.feature4': 'Periodi blackout',
    'pricing.professional.feature5': 'Notifiche email automatiche',
    'pricing.professional.feature6': 'Export report (PDF/Excel)',
    'pricing.professional.feature7': 'Supporto prioritario',
    'pricing.professional.feature8': 'Statistiche avanzate',
    'pricing.professional.popular': 'Più Popolare',
    'pricing.enterprise.name': 'Enterprise',
    'pricing.enterprise.description': 'Per grandi organizzazioni',
    'pricing.enterprise.price': 'Custom',
    'pricing.enterprise.priceLabel': 'Su Misura',
    'pricing.enterprise.cta': 'Contattaci',
    'pricing.enterprise.feature1': 'Dipendenti illimitati',
    'pricing.enterprise.feature2': 'Tutte le feature Professional',
    'pricing.enterprise.feature3': 'White-label option',
    'pricing.enterprise.feature4': 'Multi-company support',
    'pricing.enterprise.feature5': 'SLA garantito 99.9%',
    'pricing.enterprise.feature6': 'Onboarding dedicato',
    'pricing.enterprise.feature7': 'Account manager dedicato',
    'pricing.enterprise.feature8': 'Integrazioni custom',
    'pricing.enterprise.feature9': 'SSO & SAML',

    // How It Works
    'howItWorks.title': 'Come Funziona',
    'howItWorks.subtitle': 'Inizia in 4 semplici passaggi e ottimizza la gestione turni della tua azienda',
    'howItWorks.step1.title': '1. Registra l\'Azienda',
    'howItWorks.step1.description': 'Crea il tuo account aziendale in meno di 2 minuti. Inserisci i dati base e sei pronto a partire.',
    'howItWorks.step2.title': '2. Configura Mansioni',
    'howItWorks.step2.description': 'Aggiungi le mansioni aziendali e definisci i limiti di assenze contemporanee per ciascun ruolo.',
    'howItWorks.step3.title': '3. Gestisci Richieste',
    'howItWorks.step3.description': 'I collaboratori richiedono ferie e permessi. Il sistema valida automaticamente la disponibilità.',
    'howItWorks.step4.title': '4. Approva in 1 Click',
    'howItWorks.step4.description': 'Approva o rifiuta richieste dalla dashboard. Notifiche automatiche tengono tutti aggiornati.',

    // Footer Links
    'footer.product.features': 'Funzionalità',
    'footer.product.pricing': 'Prezzi',
    'footer.product.demo': 'Demo',
    'footer.product.roadmap': 'Roadmap',
    'footer.company.about': 'Chi Siamo',
    'footer.company.blog': 'Blog',
    'footer.company.careers': 'Carriere',
    'footer.company.contact': 'Contatti',
    'footer.resources.docs': 'Documentazione',
    'footer.resources.guides': 'Guide',
    'footer.resources.api': 'API',
    'footer.resources.support': 'Supporto',
    'footer.copyright': 'Tutti i diritti riservati.',

    // CTA
    'cta.title': 'Pronto a Trasformare la Gestione Turni?',
    'cta.description': 'Unisciti a centinaia di aziende che hanno semplificato la gestione di turni, ferie e permessi con Turnjob. Inizia oggi la tua prova gratuita.',
    'cta.primary': 'Inizia Gratis - 14 Giorni',
    'cta.secondary': 'Parla con un Esperto',

    // Footer
    'footer.description': 'La piattaforma SaaS che semplifica la gestione di turni, ferie e permessi per la tua azienda.',
    'footer.product': 'Prodotto',
    'footer.company': 'Azienda',
    'footer.resources': 'Risorse',
    'footer.legal': 'Legale',
    'footer.rights': 'Tutti i diritti riservati.',
    'footer.made': 'Made with ❤️ in Italy',

    // Dashboard
    'dashboard.title': 'Dashboard',
    'dashboard.subtitle': 'Panoramica generale della gestione turni',
    'dashboard.search': 'Cerca collaboratori, richieste...',

    // Sidebar
    'sidebar.dashboard': 'Dashboard',
    'sidebar.calendar': 'Calendario',
    'sidebar.requests': 'Richieste',
    'sidebar.team': 'Team',
    'sidebar.positions': 'Mansioni',
    'sidebar.settings': 'Impostazioni',
    'sidebar.logout': 'Esci',

    // Stats
    'stats.pending': 'Richieste Pending',
    'stats.approved': 'Ferie Approvate',
    'stats.active': 'Collaboratori Attivi',
    'stats.shifts': 'Turni Questo Mese',
    'stats.pendingChange': '+3 da ieri',
    'stats.approvedChange': 'Questo mese',
    'stats.activeChange': 'Su 30 totali',
    'stats.shiftsChange': '+12% vs scorso mese',

    // Recent Requests
    'requests.title': 'Richieste Recenti',
    'requests.subtitle': 'Ultime richieste in attesa di approvazione',
    'requests.pending': 'Pending',
    'requests.approved': 'Approvata',
    'requests.rejected': 'Rifiutata',

    // Calendar
    'calendar.title': 'Calendario Turni',
    'calendar.subtitle': 'Panoramica dei prossimi turni programmati',
    'calendar.coming': 'Calendario in arrivo',

    // Quick Actions
    'actions.title': 'Azioni Rapide',
    'actions.subtitle': 'Collegamenti alle funzionalità più utilizzate',
    'actions.viewCalendar': 'Visualizza Calendario',
    'actions.viewCalendarDesc': 'Vedi tutti i turni programmati',
    'actions.manageTeam': 'Gestisci Team',
    'actions.manageTeamDesc': 'Aggiungi o modifica collaboratori',
    'actions.approveRequests': 'Approva Richieste',
    'actions.getStarted': 'Inizia',
    'actions.approveRequestsDesc': 'Gestisci le richieste pending',
  },
  en: {
    // Navbar
    'nav.features': 'Features',
    'nav.pricing': 'Pricing',
    'nav.about': 'About Us',
    'nav.login': 'Sign In',
    'nav.register': 'Get Started',

    // Hero
    'hero.badge': 'Simplified shift management for your company',
    'hero.title': 'Turnjob',
    'hero.subtitle': 'Smart Shift Management',
    'hero.description': 'The SaaS platform that simplifies shift, vacation, and leave management. Intelligent system with automatic validation and real-time availability.',
    'hero.cta.primary': 'Get Started',
    'hero.cta.secondary': 'Sign In',
    'hero.social.companies': '500+ Companies',
    'hero.social.shifts': '10K+ Shifts Managed',
    'hero.social.satisfaction': '95% Satisfaction',

    // Features
    'features.title': 'Everything you need',
    'features.subtitle': 'Complete features to manage your team shifts efficiently and transparently',
    'feature.calendar.title': 'Real-time Calendar',
    'feature.calendar.description': 'View slot availability in real-time for every company position',
    'feature.validation.title': 'Intelligent Validation',
    'feature.validation.description': 'Automatic system that prevents conflicts and overlaps in requests',
    'feature.positions.title': 'Position Management',
    'feature.positions.description': 'Configure concurrent absence limits for each company role',
    'feature.dashboard.title': 'Complete Dashboard',
    'feature.dashboard.description': 'Monitor remaining quotas, pending requests and team statistics at a glance',
    'feature.quotas.title': 'Customizable Quotas',
    'feature.quotas.description': 'Manage vacation, leave, ROL and rest days with flexible yearly configurations',
    'feature.notifications.title': 'Automatic Notifications',
    'feature.notifications.description': 'Email notification system for approvals, rejections and important reminders',
    'feature.security.title': 'Guaranteed Security',
    'feature.security.description': 'Robust authentication with Row Level Security and GDPR compliant data protection',
    'feature.performance.title': 'Fast and Responsive',
    'feature.performance.description': 'Modern and performant interface, optimized for desktop and mobile',
    'feature.blackout.title': 'Blackout Periods',
    'feature.blackout.description': 'Configure blocking periods for high season or critical company events',

    // Pricing
    'pricing.title': 'Transparent Pricing',
    'pricing.subtitle': 'Choose the perfect plan for your company. No hidden costs.',
    'pricing.trial': 'All plans include a 14-day free trial. No credit card required.',
    'pricing.starter.name': 'Starter',
    'pricing.starter.description': 'Perfect for small businesses',
    'pricing.starter.price': '29',
    'pricing.starter.period': 'month',
    'pricing.starter.cta': 'Get Started',
    'pricing.starter.feature1': 'Up to 10 employees',
    'pricing.starter.feature2': 'Real-time calendar',
    'pricing.starter.feature3': 'Basic request management',
    'pricing.starter.feature4': 'Essential dashboard',
    'pricing.starter.feature5': 'Email support',
    'pricing.starter.feature6': '1 configurable position',
    'pricing.professional.name': 'Professional',
    'pricing.professional.description': 'Ideal for growing companies',
    'pricing.professional.price': '79',
    'pricing.professional.period': 'month',
    'pricing.professional.cta': 'Try 14 Days Free',
    'pricing.professional.feature1': 'Up to 50 employees',
    'pricing.professional.feature2': 'All Starter features',
    'pricing.professional.feature3': 'Unlimited positions',
    'pricing.professional.feature4': 'Blackout periods',
    'pricing.professional.feature5': 'Automatic email notifications',
    'pricing.professional.feature6': 'Export reports (PDF/Excel)',
    'pricing.professional.feature7': 'Priority support',
    'pricing.professional.feature8': 'Advanced statistics',
    'pricing.professional.popular': 'Most Popular',
    'pricing.enterprise.name': 'Enterprise',
    'pricing.enterprise.description': 'For large organizations',
    'pricing.enterprise.price': 'Custom',
    'pricing.enterprise.priceLabel': 'Custom Pricing',
    'pricing.enterprise.cta': 'Contact Us',
    'pricing.enterprise.feature1': 'Unlimited employees',
    'pricing.enterprise.feature2': 'All Professional features',
    'pricing.enterprise.feature3': 'White-label option',
    'pricing.enterprise.feature4': 'Multi-company support',
    'pricing.enterprise.feature5': '99.9% guaranteed SLA',
    'pricing.enterprise.feature6': 'Dedicated onboarding',
    'pricing.enterprise.feature7': 'Dedicated account manager',
    'pricing.enterprise.feature8': 'Custom integrations',
    'pricing.enterprise.feature9': 'SSO & SAML',

    // How It Works
    'howItWorks.title': 'How It Works',
    'howItWorks.subtitle': 'Get started in 4 simple steps and optimize your company shift management',
    'howItWorks.step1.title': '1. Register Company',
    'howItWorks.step1.description': 'Create your company account in less than 2 minutes. Enter basic information and you\'re ready to go.',
    'howItWorks.step2.title': '2. Configure Positions',
    'howItWorks.step2.description': 'Add company positions and define concurrent absence limits for each role.',
    'howItWorks.step3.title': '3. Manage Requests',
    'howItWorks.step3.description': 'Collaborators request vacation and leave. The system automatically validates availability.',
    'howItWorks.step4.title': '4. Approve in 1 Click',
    'howItWorks.step4.description': 'Approve or reject requests from the dashboard. Automatic notifications keep everyone updated.',

    // Footer Links
    'footer.product.features': 'Features',
    'footer.product.pricing': 'Pricing',
    'footer.product.demo': 'Demo',
    'footer.product.roadmap': 'Roadmap',
    'footer.company.about': 'About Us',
    'footer.company.blog': 'Blog',
    'footer.company.careers': 'Careers',
    'footer.company.contact': 'Contact',
    'footer.resources.docs': 'Documentation',
    'footer.resources.guides': 'Guides',
    'footer.resources.api': 'API',
    'footer.resources.support': 'Support',
    'footer.copyright': 'All rights reserved.',

    // CTA
    'cta.title': 'Ready to Transform Shift Management?',
    'cta.description': 'Join hundreds of companies that have simplified shift, vacation, and leave management with Turnjob. Start your free trial today.',
    'cta.primary': 'Start Free - 14 Days',
    'cta.secondary': 'Talk to an Expert',

    // Footer
    'footer.description': 'The SaaS platform that simplifies shift, vacation, and leave management for your company.',
    'footer.product': 'Product',
    'footer.company': 'Company',
    'footer.resources': 'Resources',
    'footer.legal': 'Legal',
    'footer.rights': 'All rights reserved.',
    'footer.made': 'Made with ❤️ in Italy',

    // Dashboard
    'dashboard.title': 'Dashboard',
    'dashboard.subtitle': 'General overview of shift management',
    'dashboard.search': 'Search collaborators, requests...',

    // Sidebar
    'sidebar.dashboard': 'Dashboard',
    'sidebar.calendar': 'Calendar',
    'sidebar.requests': 'Requests',
    'sidebar.team': 'Team',
    'sidebar.positions': 'Positions',
    'sidebar.settings': 'Settings',
    'sidebar.logout': 'Logout',

    // Stats
    'stats.pending': 'Pending Requests',
    'stats.approved': 'Approved Leaves',
    'stats.active': 'Active Collaborators',
    'stats.shifts': 'Shifts This Month',
    'stats.pendingChange': '+3 from yesterday',
    'stats.approvedChange': 'This month',
    'stats.activeChange': 'Out of 30 total',
    'stats.shiftsChange': '+12% vs last month',

    // Recent Requests
    'requests.title': 'Recent Requests',
    'requests.subtitle': 'Latest requests pending approval',
    'requests.pending': 'Pending',
    'requests.approved': 'Approved',
    'requests.rejected': 'Rejected',

    // Calendar
    'calendar.title': 'Shift Calendar',
    'calendar.subtitle': 'Overview of upcoming scheduled shifts',
    'calendar.coming': 'Calendar coming soon',

    // Quick Actions
    'actions.title': 'Quick Actions',
    'actions.subtitle': 'Links to most used features',
    'actions.viewCalendar': 'View Calendar',
    'actions.viewCalendarDesc': 'See all scheduled shifts',
    'actions.manageTeam': 'Manage Team',
    'actions.manageTeamDesc': 'Add or edit collaborators',
    'actions.approveRequests': 'Approve Requests',
    'actions.approveRequestsDesc': 'Manage pending requests',
    'actions.getStarted': 'Get started',
  },
};

const LanguageContext = createContext<LanguageContextType | undefined>(undefined);

export function LanguageProvider({ children }: { children: React.ReactNode }) {
  const [language, setLanguageState] = useState<Language>('it');

  useEffect(() => {
    // Load language from localStorage
    const savedLang = localStorage.getItem('turnjob-lang') as Language | null;
    if (savedLang && (savedLang === 'it' || savedLang === 'en')) {
      setLanguageState(savedLang);
    }
  }, []);

  const setLanguage = (lang: Language) => {
    setLanguageState(lang);
    localStorage.setItem('turnjob-lang', lang);
  };

  const t = (key: string): string => {
    return translations[language][key as keyof typeof translations['it']] || key;
  };

  return (
    <LanguageContext.Provider value={{ language, setLanguage, t }}>
      {children}
    </LanguageContext.Provider>
  );
}

export function useLanguage() {
  const context = useContext(LanguageContext);
  if (context === undefined) {
    throw new Error('useLanguage must be used within a LanguageProvider');
  }
  return context;
}
