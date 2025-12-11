import type { Metadata } from 'next';
import { Inter } from 'next/font/google';
import '../styles/globals.css';
import { Toaster } from '@/components/ui/toaster';
import { ThemeProvider } from '@/components/providers/theme-provider';
import { QueryProvider } from '@/components/providers/query-provider';
import { IntlProvider } from '@/components/providers/intl-provider';

const inter = Inter({ subsets: ['latin'] });

export const metadata: Metadata = {
  title: 'Turnjob - Gestione Turni Intelligente',
  description: 'Piattaforma SaaS per la gestione di turni lavorativi, riposi, permessi e ferie',
};

export default function RootLayout({
  children,
}: {
  children: React.ReactNode;
}) {
  return (
    <html lang="it" suppressHydrationWarning>
      <body className={inter.className} suppressHydrationWarning>
        <ThemeProvider
          attribute="class"
          defaultTheme="system"
          enableSystem
          disableTransitionOnChange
        >
          <QueryProvider>
            <IntlProvider>
              {children}
            </IntlProvider>
          </QueryProvider>
        </ThemeProvider>
        <Toaster />
      </body>
    </html>
  );
}
