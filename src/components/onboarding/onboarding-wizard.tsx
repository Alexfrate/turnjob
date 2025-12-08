'use client';

import { useState } from 'react';
import { Button } from '@/components/ui/button';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Form, FormControl, FormField, FormItem, FormLabel, FormMessage } from '@/components/ui/form';
import { Input } from '@/components/ui/input';
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select';
import { zodResolver } from '@hookform/resolvers/zod';
import { useForm } from 'react-hook-form';
import { z } from 'zod';
import { createClient } from '@/lib/supabase/client';
import { useUser } from '@/hooks/use-user';
import { ChevronLeft, ChevronRight, Check } from 'lucide-react';

const stepSchemas = [
  z.object({
    industry: z.string().min(1),
    expectedEmployees: z.coerce.number().min(1).max(1000),
  }),
  z.object({
    adminEmails: z.array(z.string().email()).min(1, 'Almeno un admin'),
  }),
  z.object({
    minCoverage: z.coerce.number().min(1),
    positions: z.array(z.string().min(1)).min(1),
  }),
];

type StepData = z.infer<typeof stepSchemas[0]> & z.infer<typeof stepSchemas[1]> & z.infer<typeof stepSchemas[2]>;

export default function OnboardingWizard() {
  const [currentStep, setCurrentStep] = useState(0);
  const [companyId, setCompanyId] = useState<string>('');
  const [isLoading, setIsLoading] = useState(false);
  const { user } = useUser();

  const form = useForm<StepData>({
    resolver: zodResolver(stepSchemas[currentStep]),
    defaultValues: {
      industry: '',
      expectedEmployees: 10,
      adminEmails: [''],
      minCoverage: 1,
      positions: [''],
    },
  });

  const totalSteps = stepSchemas.length;

  const onSubmit = async (data: any) => {
    setIsLoading(true);
    const supabase = createClient();

    if (currentStep === 0) {
      // Step 1: Update Company
      const { data: company } = await supabase.from('Company').select('id').eq('id', user!.user_metadata.companyId as string).single();
      if (company) {
        await supabase.from('Company').update({
          industry: data.industry,
          expectedEmployees: data.expectedEmployees,
          onboardingStep: 1,
        }).eq('id', company.id);
        setCompanyId(company.id);
      }
    } else if (currentStep === 1) {
      // Step 2: Add admin users
      for (const email of data.adminEmails) {
        await supabase.from('User').upsert({
          email,
          name: email.split('@')[0],
          role: 'ADMIN',
          companyId,
        });
      }
    } else if (currentStep === 2) {
      // Step 3: Create positions
      for (const posName of data.positions) {
        await supabase.from('Position').upsert({
          companyId,
          name: posName,
          minStaffPerShift: data.minCoverage,
        });
      }

      // Complete onboarding
      await supabase.from('Company').update({
        onboardingStep: 3,
        hasCompletedOnboarding: true,
      }).eq('id', companyId);
    }

    setIsLoading(false);
    if (currentStep < totalSteps - 1) {
      setCurrentStep(currentStep + 1);
    } else {
      window.location.href = '/dashboard';
    }
  };

  const steps = [
    { title: 'Profilo Azienda', description: 'Descrivi la tua attività' },
    { title: 'Team Amministrativo', description: 'Aggiungi amministratori' },
    { title: 'Nuclei e Mansioni', description: 'Definisci ruoli' },
  ];

  return (
    <div className="min-h-screen bg-gradient-to-br from-blue-50 to-indigo-100 dark:from-slate-900 dark:to-slate-800 p-8 flex items-center justify-center">
      <Card className="w-full max-w-2xl">
        <CardHeader className="text-center">
          <CardTitle className="text-3xl font-bold bg-gradient-to-r from-blue-600 to-indigo-600 bg-clip-text text-transparent">
            Benvenuto in Turnjob
          </CardTitle>
          <p className="text-lg text-muted-foreground mt-2">
            Completa l'onboarding in {totalSteps} passi
          </p>
          <div className="mt-4 h-2 bg-muted rounded-full">
            <div className="h-2 bg-blue-600 rounded-full transition-all duration-300" style={{ width: `${((currentStep / (totalSteps - 1)) * 100)}%` }} />
          </div>
          <div className="flex justify-between text-sm mt-2">
            {steps.map((step, index) => (
              <div key={index} className={`flex flex-col items-center ${index <= currentStep ? 'text-blue-600' : 'text-muted-foreground'}`}>
                <div className={`w-8 h-8 rounded-full flex items-center justify-center font-bold ${index <= currentStep ? 'bg-blue-600 text-white' : 'bg-muted'}`}>
                  {index < currentStep ? <Check className="w-4 h-4" /> : index + 1}
                </div>
                <span className="mt-1">{step.title}</span>
              </div>
            ))}
          </div>
        </CardHeader>
        <CardContent className="space-y-6">
          <Form {...form}>
            <form onSubmit={form.handleSubmit(onSubmit)} className="space-y-6">
              {currentStep === 0 && (
                <>
                  <FormField
                    control={form.control}
                    name="industry"
                    render={({ field }) => (
                      <FormItem>
                        <FormLabel>Sector attività</FormLabel>
                        <Select onValueChange={field.onChange} defaultValue={field.value}>
                          <FormControl>
                            <SelectTrigger>
                              <SelectValue />
                            </SelectTrigger>
                          </FormControl>
                          <SelectContent>
                            <SelectItem value="restaurant">Ristorazione</SelectItem>
                            <SelectItem value="retail">Retail</SelectItem>
                            <SelectItem value="hospitality">Hospitality</SelectItem>
                            <SelectItem value="healthcare">Sanità</SelectItem>
                            <SelectItem value="manufacturing">Manifatturiero</SelectItem>
                            <SelectItem value="other">Altro</SelectItem>
                          </SelectContent>
                        </Select>
                        <FormMessage />
                      </FormItem>
                    )}
                  />
                  <FormField
                    control={form.control}
                    name="expectedEmployees"
                    render={({ field }) => (
                      <FormItem>
                        <FormLabel>Numero collaboratori attesi</FormLabel>
                        <FormControl>
                          <Input type="number" {...field} />
                        </FormControl>
                        <FormMessage />
                      </FormItem>
                    )}
                  />
                </>
              )}
              {currentStep === 1 && (
                <FormField
                  control={form.control}
                  name="adminEmails"
                  render={({ field }) => (
                    <FormItem>
                      <FormLabel>Email amministratori (una per riga)</FormLabel>
                      <FormControl>
                        <textarea
                          className="w-full p-3 border rounded-lg"
                          rows={4}
                          placeholder="admin@azienda.it&#10;hr@azienda.it"
                          onChange={(e) => field.onChange(e.target.value.split('\n').filter(Boolean))}
                        />
                      </FormControl>
                      <FormMessage />
                    </FormItem>
                  )}
                />
              )}
              {currentStep === 2 && (
                <>
                  <FormField
                    control={form.control}
                    name="minCoverage"
                    render={({ field }) => (
                      <FormItem>
                        <FormLabel>Copertura minima</FormLabel>
                        <FormControl>
                          <Input type="number" {...field} />
                        </FormControl>
                        <FormMessage />
                      </FormItem>
                    )}
                  />
                  <FormField
                    control={form.control}
                    name="positions"
                    render={({ field }) => (
                      <FormItem>
                        <FormLabel>Mansioni (una per riga)</FormLabel>
                        <FormControl>
                          <textarea
                            className="w-full p-3 border rounded-lg"
                            rows={3}
                            placeholder="Cameriere&#10;Cuoco&#10;Barista"
                            onChange={(e) => field.onChange(e.target.value.split('\n').filter(Boolean))}
                          />
                        </FormControl>
                        <FormMessage />
                      </FormItem>
                    )}
                  />
                </>
              )}
              <div className="flex gap-4">
                {currentStep > 0 && (
                  <Button type="button" variant="outline" onClick={() => setCurrentStep(currentStep - 1)}>
                    <ChevronLeft className="w-4 h-4 mr-2" />
                    Indietro
                  </Button>
                )}
                <Button type="submit" className="ml-auto" disabled={isLoading}>
                  {currentStep === totalSteps - 1 ? 'Completa' : 'Avanti'}
                  <ChevronRight className="w-4 h-4 ml-2" />
                </Button>
              </div>
            </form>
          </Form>
        </CardContent>
      </Card>
    </div>
  );
}