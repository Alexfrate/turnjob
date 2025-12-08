"use client";

import Link from "next/link";
import { usePathname, useRouter } from "next/navigation";
import {
    Calendar,
    LayoutDashboard,
    Users,
    Settings,
    LogOut,
    Layers,
    UserPlus,
    FileText,
    Brain
} from "lucide-react";
import { cn } from "@/lib/utils";
import { createClient } from "@/lib/supabase/client";

export function Sidebar() {
    const pathname = usePathname();
    const router = useRouter();

    const handleLogout = async () => {
        try {
            const supabase = createClient();
            await supabase.auth.signOut();
            router.push('/login');
        } catch (error) {
            console.error('Logout error:', error);
        }
    };

    const navigation = [
        { name: "Dashboard", href: "/dashboard", icon: LayoutDashboard },
        { name: "Calendario", href: "/dashboard/calendar", icon: Calendar },
        { name: "Nuclei", href: "/dashboard/nuclei", icon: Layers },
        { name: "Collaboratori", href: "/dashboard/collaboratori", icon: Users },
        { name: "Richieste", href: "/dashboard/richieste", icon: FileText },
        { name: "Configurazione AI", href: "/dashboard/llm-config", icon: Brain },
        { name: "Impostazioni", href: "/dashboard/settings", icon: Settings },
    ];

    return (
        <aside className="hidden md:flex md:flex-shrink-0">
            <div className="flex flex-col w-64 border-r border-neutral-200 dark:border-neutral-800 bg-white dark:bg-neutral-900">
                {/* Logo */}
                <div className="flex items-center h-16 flex-shrink-0 px-6 border-b border-neutral-200 dark:border-neutral-800">
                    <Link href="/dashboard" className="flex items-center gap-2">
                        <div className="w-8 h-8 bg-primary-500 dark:bg-primary-600 rounded-lg flex items-center justify-center">
                            <Calendar className="h-5 w-5 text-white" />
                        </div>
                        <span className="text-xl font-bold bg-gradient-to-r from-primary-600 to-primary-500 dark:from-primary-400 dark:to-primary-300 bg-clip-text text-transparent">
                            Turnjob
                        </span>
                    </Link>
                </div>

                {/* Navigation */}
                <nav className="flex-1 px-4 py-6 space-y-1 overflow-y-auto">
                    {navigation.map((item) => {
                        const Icon = item.icon;
                        const isActive = pathname === item.href || pathname.startsWith(item.href + '/');

                        return (
                            <Link
                                key={item.name}
                                href={item.href}
                                className={cn(
                                    "flex items-center gap-3 px-4 py-3 rounded-lg text-sm font-medium transition-colors",
                                    isActive
                                        ? "bg-primary-50 dark:bg-primary-900/30 text-primary-700 dark:text-primary-400"
                                        : "text-neutral-700 dark:text-neutral-300 hover:bg-neutral-100 dark:hover:bg-neutral-800 hover:text-neutral-900 dark:hover:text-neutral-100"
                                )}
                            >
                                <Icon className="h-5 w-5" />
                                {item.name}
                            </Link>
                        );
                    })}
                </nav>

                {/* User Section */}
                <div className="flex-shrink-0 border-t border-neutral-200 dark:border-neutral-800 p-4">
                    <button
                        onClick={handleLogout}
                        className="flex items-center gap-3 px-4 py-3 w-full rounded-lg text-sm font-medium text-neutral-700 dark:text-neutral-300 hover:bg-neutral-100 dark:hover:bg-neutral-800 transition-colors"
                    >
                        <LogOut className="h-5 w-5" />
                        Esci
                    </button>
                </div>
            </div>
        </aside>
    );
}
