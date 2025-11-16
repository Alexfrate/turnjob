"use client";

import { useState } from "react";
import Link from "next/link";
import { useRouter } from "next/navigation";
import { Calendar, Loader2 } from "lucide-react";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Card, CardContent, CardDescription, CardFooter, CardHeader, CardTitle } from "@/components/ui/card";
import { createClient } from "@/lib/supabase/client";

export default function RegisterPage() {
  const router = useRouter();
  const [isLoading, setIsLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [success, setSuccess] = useState(false);

  async function handleSubmit(e: React.FormEvent<HTMLFormElement>) {
    e.preventDefault();
    setIsLoading(true);
    setError(null);

    const formData = new FormData(e.currentTarget);
    const email = formData.get("email") as string;
    const password = formData.get("password") as string;
    const confirmPassword = formData.get("confirmPassword") as string;
    const companyName = formData.get("companyName") as string;
    const fullName = formData.get("fullName") as string;

    // Validations
    if (password !== confirmPassword) {
      setError("Le password non corrispondono");
      setIsLoading(false);
      return;
    }

    if (password.length < 8) {
      setError("La password deve essere di almeno 8 caratteri");
      setIsLoading(false);
      return;
    }

    try {
      const supabase = createClient();

      // Sign up the user
      const { data, error: signUpError } = await supabase.auth.signUp({
        email,
        password,
        options: {
          data: {
            full_name: fullName,
            company_name: companyName,
          },
        },
      });

      if (signUpError) throw signUpError;

      if (data.user) {
        setSuccess(true);
        // Redirect after 2 seconds
        setTimeout(() => {
          router.push("/login");
        }, 2000);
      }
    } catch (err: any) {
      setError(err.message || "Errore durante la registrazione");
    } finally {
      setIsLoading(false);
    }
  }

  if (success) {
    return (
      <div className="min-h-screen flex items-center justify-center bg-gradient-to-br from-primary-50 via-white to-success-50 p-4">
        <Card className="w-full max-w-md border-2">
          <CardHeader>
            <div className="flex justify-center mb-4">
              <div className="w-16 h-16 bg-success-100 rounded-full flex items-center justify-center">
                <svg className="h-8 w-8 text-success-600" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                  <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M5 13l4 4L19 7" />
                </svg>
              </div>
            </div>
            <CardTitle className="text-2xl text-center">Account Creato!</CardTitle>
            <CardDescription className="text-center">
              Controlla la tua email per confermare l'account. Verrai reindirizzato al login...
            </CardDescription>
          </CardHeader>
        </Card>
      </div>
    );
  }

  return (
    <div className="min-h-screen flex items-center justify-center bg-gradient-to-br from-primary-50 via-white to-success-50 p-4">
      <div className="w-full max-w-md">
        {/* Logo */}
        <Link href="/" className="flex items-center justify-center gap-2 mb-8">
          <div className="w-12 h-12 bg-primary-500 rounded-xl flex items-center justify-center">
            <Calendar className="h-7 w-7 text-white" />
          </div>
          <span className="text-3xl font-bold bg-gradient-to-r from-primary-600 to-primary-500 bg-clip-text text-transparent">
            Turnjob
          </span>
        </Link>

        {/* Register Card */}
        <Card className="border-2">
          <CardHeader className="space-y-1">
            <CardTitle className="text-2xl font-bold text-center">
              Crea il tuo Account
            </CardTitle>
            <CardDescription className="text-center">
              Inizia a gestire i turni della tua azienda
            </CardDescription>
          </CardHeader>
          <CardContent>
            <form onSubmit={handleSubmit} className="space-y-4">
              {error && (
                <div className="bg-danger-50 border border-danger-200 text-danger-700 px-4 py-3 rounded-lg text-sm">
                  {error}
                </div>
              )}

              <div className="space-y-2">
                <Label htmlFor="companyName">Nome Azienda</Label>
                <Input
                  id="companyName"
                  name="companyName"
                  type="text"
                  placeholder="La Mia Azienda S.r.l."
                  required
                  disabled={isLoading}
                />
              </div>

              <div className="space-y-2">
                <Label htmlFor="fullName">Nome e Cognome</Label>
                <Input
                  id="fullName"
                  name="fullName"
                  type="text"
                  placeholder="Mario Rossi"
                  required
                  disabled={isLoading}
                />
              </div>

              <div className="space-y-2">
                <Label htmlFor="email">Email Aziendale</Label>
                <Input
                  id="email"
                  name="email"
                  type="email"
                  placeholder="mario@azienda.it"
                  required
                  disabled={isLoading}
                />
              </div>

              <div className="space-y-2">
                <Label htmlFor="password">Password</Label>
                <Input
                  id="password"
                  name="password"
                  type="password"
                  placeholder="••••••••"
                  required
                  disabled={isLoading}
                />
                <p className="text-xs text-neutral-500">
                  Minimo 8 caratteri
                </p>
              </div>

              <div className="space-y-2">
                <Label htmlFor="confirmPassword">Conferma Password</Label>
                <Input
                  id="confirmPassword"
                  name="confirmPassword"
                  type="password"
                  placeholder="••••••••"
                  required
                  disabled={isLoading}
                />
              </div>

              <Button type="submit" className="w-full" size="lg" disabled={isLoading}>
                {isLoading && <Loader2 className="mr-2 h-4 w-4 animate-spin" />}
                Crea Account
              </Button>

              <p className="text-xs text-neutral-500 text-center">
                Registrandoti accetti i nostri{" "}
                <Link href="/terms" className="text-primary-600 hover:underline">
                  Termini di Servizio
                </Link>{" "}
                e la{" "}
                <Link href="/privacy" className="text-primary-600 hover:underline">
                  Privacy Policy
                </Link>
              </p>
            </form>
          </CardContent>
          <CardFooter className="flex flex-col space-y-4">
            <div className="text-sm text-center text-neutral-600">
              Hai già un account?{" "}
              <Link href="/login" className="text-primary-600 hover:text-primary-700 font-semibold">
                Accedi
              </Link>
            </div>
            <Link
              href="/"
              className="text-sm text-neutral-500 hover:text-neutral-700 text-center"
            >
              ← Torna alla home
            </Link>
          </CardFooter>
        </Card>
      </div>
    </div>
  );
}
