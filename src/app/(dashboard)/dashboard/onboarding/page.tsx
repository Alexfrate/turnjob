import { Metadata } from 'next';
// Temporarily disabled due to AI SDK compatibility
// import { OnboardingChat } from '@/components/onboarding/onboarding-chat';

export const metadata: Metadata = {
    title: 'Onboarding Aziendale - Turnjob',
    description: 'Configura la tua azienda con l\'aiuto dell\'AI',
};

export default function OnboardingPage() {
    return (
        <div className="container mx-auto py-6 space-y-6">
            <div className="flex flex-col gap-2">
                <h1 className="text-3xl font-bold tracking-tight">Setup Aziendale</h1>
                <p className="text-muted-foreground">
                    Configura la tua azienda rispondendo a qualche semplice domanda. L'AI ti aiuterà a impostare tutto correttamente.
                </p>
            </div>

            <div className="grid gap-6">
                {/* Temporarily disabled due to AI SDK compatibility issue */}
                {/* <OnboardingChat /> */}
                <div className="text-center p-12 bg-neutral-50 dark:bg-neutral-900 rounded-lg">
                    <p className="text-lg font-semibold mb-2">Onboarding in fase di miglioramento</p>
                    <p className="text-sm text-muted-foreground">Stiamo lavorando per offrirti un'esperienza migliore.</p>
                </div>
            </div>
        </div>
    );
}
