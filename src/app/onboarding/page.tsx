'use client';

import { Suspense } from 'react';
import { useSearchParams, useRouter } from 'next/navigation';
import { OnboardingChat } from '@/components/onboarding/onboarding-chat';
import { Toaster } from '@/components/ui/toaster';
import { Button } from '@/components/ui/button';
import { ArrowLeft, Sparkles } from 'lucide-react';

function OnboardingContent() {
    const searchParams = useSearchParams();
    const router = useRouter();
    const isNewCompany = searchParams.get('newCompany') === 'true';

    return (
        <div className="min-h-screen bg-slate-950 relative overflow-hidden flex flex-col">
            {/* Subtle Background */}
            <div className="absolute inset-0 overflow-hidden pointer-events-none">
                <div className="absolute top-1/4 left-1/3 w-[400px] h-[400px] bg-blue-500/10 rounded-full blur-[100px]" />
                <div className="absolute bottom-1/4 right-1/3 w-[300px] h-[300px] bg-indigo-500/10 rounded-full blur-[80px]" />
            </div>

            {/* Content */}
            <div className="relative z-10 flex-1 flex flex-col p-4 md:p-6">
                {/* Top Bar */}
                <div className="flex items-center justify-between mb-6">
                    {isNewCompany ? (
                        <Button
                            variant="ghost"
                            onClick={() => router.push('/dashboard')}
                            className="text-slate-400 hover:text-white hover:bg-slate-800/50 -ml-2"
                        >
                            <ArrowLeft className="mr-2 h-4 w-4" />
                            Dashboard
                        </Button>
                    ) : (
                        <div />
                    )}

                    {/* Logo / Brand */}
                    <div className="flex items-center gap-2 text-slate-400">
                        <Sparkles className="w-4 h-4 text-blue-400" />
                        <span className="text-sm font-medium">Turnjob</span>
                    </div>
                </div>

                {/* Centered Content */}
                <div className="flex-1 flex flex-col items-center justify-center">
                    {/* Minimal Header */}
                    <div className="text-center mb-4">
                        <div className="flex flex-col items-center gap-1">
                            <div className="flex items-center gap-3">
                                <div className="w-1.5 h-1.5 rounded-full bg-blue-400 animate-pulse" />
                                <h1 className="text-xl md:text-2xl font-semibold bg-gradient-to-r from-white to-slate-400 bg-clip-text text-transparent">
                                    {isNewCompany ? 'Nuova Azienda' : 'Configura Turnjob'}
                                </h1>
                                <div className="w-1.5 h-1.5 rounded-full bg-blue-400 animate-pulse" />
                            </div>
                            <span className="text-slate-400 text-sm">Rispondi alle domande</span>
                        </div>
                    </div>

                    {/* Chat Card - Narrower */}
                    <div className="w-full max-w-xl">
                        <OnboardingChat forceNewCompany={isNewCompany} />
                    </div>
                </div>
            </div>
            <Toaster />
        </div>
    );
}

function LoadingState() {
    return (
        <div className="min-h-screen bg-slate-950 flex items-center justify-center">
            <div className="text-center">
                <div className="w-12 h-12 mx-auto mb-3 rounded-xl bg-gradient-to-br from-blue-500 to-indigo-600 animate-pulse" />
                <div className="h-3 w-24 bg-slate-800 rounded mx-auto animate-pulse" />
            </div>
        </div>
    );
}

export default function OnboardingPage() {
    return (
        <Suspense fallback={<LoadingState />}>
            <OnboardingContent />
        </Suspense>
    );
}
