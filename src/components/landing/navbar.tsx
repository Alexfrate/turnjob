"use client";

import Link from "next/link";
import { Calendar, Menu, X } from "lucide-react";
import { Button } from "@/components/ui/button";
import { ThemeToggle } from "@/components/theme-toggle";
import { useState } from "react";

export function Navbar() {
  const [mobileMenuOpen, setMobileMenuOpen] = useState(false);

  const navLinks = [
    { name: "Funzionalità", href: "/#features" },
    { name: "Prezzi", href: "/#pricing" },
    { name: "Chi Siamo", href: "/about" }
  ];

  return (
    <nav className="fixed top-0 w-full bg-background/80 backdrop-blur-lg border-b border-neutral-200 dark:border-neutral-800 z-50">
      <div className="container mx-auto px-4 sm:px-6 lg:px-8">
        <div className="flex items-center justify-between h-16">
          {/* Logo */}
          <Link href="/" className="flex items-center gap-2">
            <div className="w-10 h-10 bg-primary-500 dark:bg-primary-600 rounded-lg flex items-center justify-center">
              <Calendar className="h-6 w-6 text-white" />
            </div>
            <span className="text-2xl font-bold bg-gradient-to-r from-primary-600 to-primary-500 dark:from-primary-400 dark:to-primary-300 bg-clip-text text-transparent">
              Turnjob
            </span>
          </Link>

          {/* Desktop Navigation */}
          <div className="hidden md:flex items-center gap-8">
            {navLinks.map((link) => (
              <Link
                key={link.name}
                href={link.href}
                className="text-neutral-700 dark:text-neutral-300 hover:text-primary-600 dark:hover:text-primary-400 transition-colors font-medium"
              >
                {link.name}
              </Link>
            ))}
          </div>

          {/* Desktop CTA */}
          <div className="hidden md:flex items-center gap-2">
            <ThemeToggle />
            <Button asChild variant="ghost" className="font-semibold">
              <Link href="/login">Accedi</Link>
            </Button>
            <Button asChild className="font-semibold">
              <Link href="/register">Registrati</Link>
            </Button>
          </div>

          {/* Mobile Menu Button */}
          <div className="flex items-center gap-2 md:hidden">
            <ThemeToggle />
            <button
              className="p-2 rounded-lg hover:bg-neutral-100 dark:hover:bg-neutral-800 transition-colors"
              onClick={() => setMobileMenuOpen(!mobileMenuOpen)}
              aria-label={mobileMenuOpen ? "Chiudi menu" : "Apri menu"}
              aria-expanded={mobileMenuOpen}
            >
              {mobileMenuOpen ? (
                <X className="h-6 w-6 text-neutral-700 dark:text-neutral-300" aria-hidden="true" />
              ) : (
                <Menu className="h-6 w-6 text-neutral-700 dark:text-neutral-300" aria-hidden="true" />
              )}
            </button>
          </div>
        </div>

        {/* Mobile Menu */}
        {mobileMenuOpen && (
          <div className="md:hidden py-4 border-t border-neutral-200 dark:border-neutral-800 animate-in slide-in-from-top-2 duration-200">
            <nav className="flex flex-col gap-4" aria-label="Menu di navigazione mobile">
              {navLinks.map((link) => (
                <Link
                  key={link.name}
                  href={link.href}
                  className="text-neutral-700 dark:text-neutral-300 hover:text-primary-600 dark:hover:text-primary-400 transition-colors font-medium px-2 py-2 rounded-lg hover:bg-neutral-100 dark:hover:bg-neutral-800"
                  onClick={() => setMobileMenuOpen(false)}
                >
                  {link.name}
                </Link>
              ))}
              <div className="flex flex-col gap-2 pt-4 border-t border-neutral-200 dark:border-neutral-800">
                <Button asChild variant="ghost" className="w-full font-semibold">
                  <Link href="/login" onClick={() => setMobileMenuOpen(false)}>Accedi</Link>
                </Button>
                <Button asChild className="w-full font-semibold">
                  <Link href="/register" onClick={() => setMobileMenuOpen(false)}>Registrati</Link>
                </Button>
              </div>
            </nav>
          </div>
        )}
      </div>
    </nav>
  );
}
