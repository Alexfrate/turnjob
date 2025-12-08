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

export default function LoginPage() {
  const router = useRouter();
  const [isLoading, setIsLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [rememberMe, setRememberMe] = useState(false);
  const [emailError, setEmailError] = useState<string | null>(null);

  const [passwordError, setPasswordError] = useState<string | null>(null);  function validateForm(email: string, password: string) {
    const emailRegex = /^[^s@]+@[^s@]+.[^s@]+$/;
    setEmailError(!emailRegex.test(email) ? "Email non valida" : null);
    setPasswordError(password.length < 8 ? "Password deve essere almeno 8 caratteri" : null);
    return !emailError && !passwordError;
  }
  async function handleSubmit(e: React.FormEvent<HTMLFormElement>) {    e.preventDefault();
    setIsLoading(true);
    setError(null);

    const formData = new FormData(e.currentTarget);
    const email = formData.get("email") as string;
    const password = formData.get("password") as string;

    if (!validateForm(email, password)) {
      setIsLoading(false);
      return;
    }

    try {
      const supabase = createClient();
      const { data, error } = await supabase.auth.signInWithPassword({
        email,
        password,
      });

      if (error) throw error;

      if (data.user) {
        router.push("/dashboard");
        router.refresh();
      }
    } catch (err: any) {
      setError(err.message || "Errore durante il login");
    } finally {
      setIsLoading(false);
    }
  }
  return (    <div className="min-h-screen flex items-center justify-center bg-gradient-to-br from-primary-50 via-white to-success-50 dark:from-slate-900 dark:via-slate-800 dark:to-slate-900 p-4">
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

        {/* Login Card */}
        <Card className="border-2 dark:border-slate-700">
          <CardHeader className="space-y-1">
            <CardTitle className="text-2xl font-bold text-center">
              Bentornato
            </CardTitle>
            <CardDescription className="text-center">
              Accedi al tuo account per continuare
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
                <Label htmlFor="email">Email</Label>
                <Input
                  id="email"
                  name="email"
                  type="email"
                  placeholder="nome@azienda.it"
                  required
                  disabled={isLoading}
                />
                {emailError && <p className="text-red-500 text-sm">{emailError}</p>}              </div>

              <div className="space-y-2">
                <div className="flex items-center justify-between">
                  <Label htmlFor="password">Password</Label>
                  <Link
                  href="/forgot-password"                    className="text-sm text-primary-600 hover:text-primary-700"
                  >
                    Dimenticata?
                  </Link>
                </div>
                <Input
                  id="password"
                  name="password"
                  type="password"
                  placeholder="••••••••"
                  required
                  disabled={isLoading}
                />
                {passwordError && <p className="text-red-500 text-sm">{passwordError}</p>}              </div>


              <div className="flex items-center space-x-2">
                <input
                  name="remember"                  id="remember"
                  type="checkbox"
                  checked={rememberMe}
                  onChange={(e) => setRememberMe(e.target.checked)}
                  className="rounded border-neutral-300 dark:border-slate-600 dark:bg-slate-700 dark:checked:bg-primary-600"
                />
                <Label htmlFor="remember" className="text-sm">Ricordami</Label>
              </div>              <Button type="submit" className="w-full" size="lg" disabled={isLoading}>
                {isLoading && <Loader2 className="mr-2 h-4 w-4 animate-spin" />}
                Accedi
              </Button>
            </form>
          </CardContent>
          <CardFooter className="flex flex-col space-y-4">
            <div className="text-sm text-center text-neutral-600">
              Non hai un account?{" "}
              <Link href="/register" className="text-primary-600 hover:text-primary-700 font-semibold">
                Registrati
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
