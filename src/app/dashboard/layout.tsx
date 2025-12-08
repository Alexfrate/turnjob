'use client';

import { Sidebar } from "@/components/layout/sidebar";
import { Header } from "@/components/layout/header";
import { ActiveCompanyProvider } from "@/contexts/active-company-context";

import { QueryClient, QueryClientProvider } from "@tanstack/react-query";
import { useState } from "react";

export default function DashboardLayout({
  children,
}: {
  children: React.ReactNode;
}) {
  const [queryClient] = useState(() => new QueryClient());

  return (
    <QueryClientProvider client={queryClient}>
      <ActiveCompanyProvider>
        <div className="flex h-screen overflow-hidden bg-neutral-50 dark:bg-neutral-950">
          {/* Sidebar */}
          <Sidebar />

          {/* Main Content */}
          <div className="flex flex-1 flex-col overflow-hidden">
            {/* Header */}
            <Header />

            {/* Page Content */}
            <main className="flex-1 overflow-y-auto bg-neutral-50 dark:bg-neutral-950">
              <div className="py-6 px-6">
                {children}
              </div>
            </main>
          </div>
        </div>
      </ActiveCompanyProvider>
    </QueryClientProvider>
  );
}
