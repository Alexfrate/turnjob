'use client';

import { useEffect, useState } from 'react';
import { useRouter } from 'next/navigation';
import { Button } from '@/components/ui/button';
import { Toaster } from '@/components/ui/toaster';
import { useToast } from '@/hooks/use-toast';
import {
    ArrowLeft,
    CheckCircle2,
    Loader2,
    Building2,
    Clock,
    Users,
    Layers,
    Timer,
    Sparkles,
    MapPin,
    Edit3
} from 'lucide-react';
import type { OnboardingData } from '@/lib/schemas/onboarding';

export default function OnboardingReviewPage() {
    const router = useRouter();
    const { toast } = useToast();
    const [data, setData] = useState<OnboardingData | null>(null);
    const [isLoading, setIsLoading] = useState(true);
    const [isSaving, setIsSaving] = useState(false);
    const [forceNewCompany, setForceNewCompany] = useState(false);

    useEffect(() => {
        // Recupera i dati dal localStorage
        const storedData = localStorage.getItem('onboarding_extracted_data');
        const storedForceNew = localStorage.getItem('onboarding_force_new_company');

        if (storedData) {
            try {
                setData(JSON.parse(storedData));
                setForceNewCompany(storedForceNew === 'true');
            } catch {
                toast({
                    title: 'Errore',
                    description: 'Dati non validi. Torna alla chat.',
                    variant: 'destructive',
                });
                router.push('/onboarding');
            }
        } else {
            router.push('/onboarding');
        }
        setIsLoading(false);
    }, [router, toast]);

    const handleConfirmAndSave = async () => {
        if (!data) return;

        setIsSaving(true);
        try {
            const response = await fetch('/api/onboarding/complete', {
                method: 'POST',
                headers: { 'Content-Type': 'application/json' },
                body: JSON.stringify({ data, forceNewCompany }),
            });

            const result = await response.json();

            if (!response.ok) {
                throw new Error(result.error || 'Errore durante il salvataggio');
            }

            // Pulisci localStorage
            localStorage.removeItem('onboarding_extracted_data');
            localStorage.removeItem('onboarding_force_new_company');

            toast({
                title: 'Configurazione completata!',
                description: 'La tua azienda è stata configurata con successo.',
            });

            router.push(result.redirect || '/dashboard');
        } catch (error) {
            console.error('Save error:', error);
            toast({
                title: 'Errore',
                description: 'Impossibile salvare la configurazione. Riprova.',
                variant: 'destructive',
            });
        } finally {
            setIsSaving(false);
        }
    };

    const handleGoBack = () => {
        router.push(forceNewCompany ? '/onboarding?newCompany=true' : '/onboarding');
    };

    if (isLoading || !data) {
        return (
            <div className="min-h-screen bg-slate-950 flex items-center justify-center">
                <div className="text-center">
                    <Loader2 className="w-12 h-12 mx-auto mb-3 text-blue-500 animate-spin" />
                    <p className="text-slate-400">Caricamento...</p>
                </div>
            </div>
        );
    }

    return (
        <div className="min-h-screen bg-slate-950 relative overflow-hidden">
            {/* Background */}
            <div className="absolute inset-0 overflow-hidden pointer-events-none">
                <div className="absolute top-1/4 left-1/3 w-[400px] h-[400px] bg-emerald-500/10 rounded-full blur-[100px]" />
                <div className="absolute bottom-1/4 right-1/3 w-[300px] h-[300px] bg-blue-500/10 rounded-full blur-[80px]" />
            </div>

            {/* Content */}
            <div className="relative z-10 min-h-screen flex flex-col p-4 md:p-6">
                {/* Top Bar */}
                <div className="flex items-center justify-between mb-8">
                    <Button
                        variant="ghost"
                        onClick={handleGoBack}
                        className="text-slate-400 hover:text-white hover:bg-slate-800/50 -ml-2"
                    >
                        <ArrowLeft className="mr-2 h-4 w-4" />
                        Modifica risposte
                    </Button>

                    <div className="flex items-center gap-2 text-slate-400">
                        <Sparkles className="w-4 h-4 text-emerald-400" />
                        <span className="text-sm font-medium">Turnjob</span>
                    </div>
                </div>

                {/* Main Content */}
                <div className="flex-1 flex flex-col items-center justify-center max-w-2xl mx-auto w-full">
                    {/* Header */}
                    <div className="text-center mb-8">
                        <div className="w-16 h-16 mx-auto mb-4 bg-gradient-to-br from-emerald-500 to-emerald-600 rounded-2xl flex items-center justify-center shadow-lg shadow-emerald-500/30">
                            <CheckCircle2 className="w-8 h-8 text-white" />
                        </div>
                        <h1 className="text-2xl md:text-3xl font-bold text-white mb-2">
                            Riepilogo Configurazione
                        </h1>
                        <p className="text-slate-400">
                            Verifica i dati prima di completare
                        </p>
                    </div>

                    {/* Data Cards */}
                    <div className="w-full space-y-4 mb-8">
                        {/* Company Name */}
                        <div className="bg-slate-900/70 backdrop-blur-xl rounded-2xl border border-slate-700/50 p-5">
                            <div className="flex items-center gap-3 mb-3">
                                <div className="w-10 h-10 bg-gradient-to-br from-blue-500 to-indigo-600 rounded-xl flex items-center justify-center">
                                    <Building2 className="w-5 h-5 text-white" />
                                </div>
                                <div>
                                    <p className="text-xs text-slate-400 uppercase tracking-wider">Nome Azienda</p>
                                    <p className="text-lg font-semibold text-white">{data.nomeAzienda}</p>
                                </div>
                            </div>
                        </div>

                        {/* Type and Hours Row */}
                        <div className="grid grid-cols-2 gap-4">
                            <div className="bg-slate-900/70 backdrop-blur-xl rounded-2xl border border-slate-700/50 p-5">
                                <div className="flex items-center gap-3">
                                    <div className="w-10 h-10 bg-gradient-to-br from-purple-500 to-purple-600 rounded-xl flex items-center justify-center">
                                        <MapPin className="w-5 h-5 text-white" />
                                    </div>
                                    <div>
                                        <p className="text-xs text-slate-400 uppercase tracking-wider">Tipo Attività</p>
                                        <p className="text-base font-semibold text-white capitalize">{data.tipoAttivita}</p>
                                    </div>
                                </div>
                            </div>

                            <div className="bg-slate-900/70 backdrop-blur-xl rounded-2xl border border-slate-700/50 p-5">
                                <div className="flex items-center gap-3">
                                    <div className="w-10 h-10 bg-gradient-to-br from-amber-500 to-orange-600 rounded-xl flex items-center justify-center">
                                        <Clock className="w-5 h-5 text-white" />
                                    </div>
                                    <div>
                                        <p className="text-xs text-slate-400 uppercase tracking-wider">Orari</p>
                                        <p className="text-base font-semibold text-white">
                                            {data.orarioApertura.tipo === 'fisso'
                                                ? `${data.orarioApertura.inizio} - ${data.orarioApertura.fine}`
                                                : 'Variabili'}
                                        </p>
                                    </div>
                                </div>
                            </div>
                        </div>

                        {/* Collaborators and Hours Config */}
                        <div className="grid grid-cols-2 gap-4">
                            <div className="bg-slate-900/70 backdrop-blur-xl rounded-2xl border border-slate-700/50 p-5">
                                <div className="flex items-center gap-3">
                                    <div className="w-10 h-10 bg-gradient-to-br from-cyan-500 to-cyan-600 rounded-xl flex items-center justify-center">
                                        <Users className="w-5 h-5 text-white" />
                                    </div>
                                    <div>
                                        <p className="text-xs text-slate-400 uppercase tracking-wider">Collaboratori</p>
                                        <p className="text-base font-semibold text-white">{data.numeroCollaboratori}</p>
                                    </div>
                                </div>
                            </div>

                            <div className="bg-slate-900/70 backdrop-blur-xl rounded-2xl border border-slate-700/50 p-5">
                                <div className="flex items-center gap-3">
                                    <div className="w-10 h-10 bg-gradient-to-br from-rose-500 to-rose-600 rounded-xl flex items-center justify-center">
                                        <Timer className="w-5 h-5 text-white" />
                                    </div>
                                    <div>
                                        <p className="text-xs text-slate-400 uppercase tracking-wider">Gestione Ore</p>
                                        <p className="text-base font-semibold text-white">
                                            {data.configurazioneOre.tipo === 'settimanale_fisso' && `${data.configurazioneOre.valore}h/sett`}
                                            {data.configurazioneOre.tipo === 'mensile' && `${data.configurazioneOre.valore}h/mese`}
                                            {data.configurazioneOre.tipo === 'flessibile' && `${data.configurazioneOre.min}-${data.configurazioneOre.max}h`}
                                        </p>
                                    </div>
                                </div>
                            </div>
                        </div>

                        {/* Nuclei */}
                        <div className="bg-slate-900/70 backdrop-blur-xl rounded-2xl border border-slate-700/50 p-5">
                            <div className="flex items-center gap-3 mb-4">
                                <div className="w-10 h-10 bg-gradient-to-br from-emerald-500 to-emerald-600 rounded-xl flex items-center justify-center">
                                    <Layers className="w-5 h-5 text-white" />
                                </div>
                                <div>
                                    <p className="text-xs text-slate-400 uppercase tracking-wider">Nuclei / Reparti</p>
                                    <p className="text-sm text-slate-300">{data.nuclei.length} nuclei configurati</p>
                                </div>
                            </div>
                            <div className="flex flex-wrap gap-2">
                                {data.nuclei.map((n, i) => (
                                    <span
                                        key={i}
                                        className="px-4 py-2 rounded-xl text-sm font-medium text-white shadow-lg"
                                        style={{
                                            backgroundColor: n.colore || '#3b82f6',
                                            boxShadow: `0 4px 14px ${n.colore || '#3b82f6'}40`
                                        }}
                                    >
                                        {n.nome}
                                    </span>
                                ))}
                            </div>
                        </div>
                    </div>

                    {/* Action Buttons */}
                    <div className="w-full flex gap-4">
                        <Button
                            variant="outline"
                            onClick={handleGoBack}
                            disabled={isSaving}
                            className="flex-1 h-14 rounded-xl border-slate-700 text-slate-300 hover:bg-slate-800 hover:text-white"
                        >
                            <Edit3 className="mr-2 h-5 w-5" />
                            Modifica
                        </Button>
                        <Button
                            onClick={handleConfirmAndSave}
                            disabled={isSaving}
                            className="flex-[2] h-14 rounded-xl bg-gradient-to-r from-emerald-500 to-emerald-600 hover:from-emerald-600 hover:to-emerald-700 text-white shadow-lg shadow-emerald-500/30 border-0 text-base font-semibold"
                        >
                            {isSaving ? (
                                <>
                                    <Loader2 className="mr-2 h-5 w-5 animate-spin" />
                                    Salvataggio in corso...
                                </>
                            ) : (
                                <>
                                    <CheckCircle2 className="mr-2 h-5 w-5" />
                                    Conferma e Inizia
                                </>
                            )}
                        </Button>
                    </div>
                </div>
            </div>
            <Toaster />
        </div>
    );
}
