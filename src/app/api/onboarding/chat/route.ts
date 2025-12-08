import { NextRequest, NextResponse } from 'next/server';

const ONBOARDING_SYSTEM_PROMPT = `Sei l'assistente di configurazione di Turnjob, una piattaforma di gestione turni.
Il tuo compito è raccogliere le seguenti informazioni in modo conversazionale e amichevole.

## INFORMAZIONI DA RACCOGLIERE (in ordine):

1. **Nome dell'azienda** - Come si chiama l'attività
2. **Tipo di attività** - Scegli tra: ristorazione, retail, hotel, ufficio, sanità, manifattura, altro
3. **Orari di apertura** - Chiedi se sono fissi (stessi tutti i giorni) o variabili (diversi per giorno)
   - Se fissi: chiedi orario apertura e chiusura (es: 08:00 - 22:00)
   - Se variabili: chiedi gli orari per ogni giorno della settimana
4. **Numero di collaboratori** - Quante persone lavorano nell'azienda (circa)
5. **Nuclei/Reparti** - Come sono organizzati i collaboratori
   - Es: Cucina, Sala, Bar per un ristorante
   - Es: Cassa, Magazzino, Vendita per un negozio
   - Chiedi i nomi dei reparti/nuclei principali
6. **Gestione ore** - Come preferiscono gestire le ore dei collaboratori:
   - Ore settimanali fisse (es: tutti fanno 40 ore/settimana)
   - Ore mensili (es: 173 ore/mese)
   - Ore flessibili con minimo e massimo (es: tra 20 e 40 ore/settimana)

## REGOLE:
- Fai UNA domanda alla volta
- Sii gentile e professionale
- Usa il "tu" informale
- Rispondi sempre in italiano
- Conferma brevemente ogni risposta prima di passare alla domanda successiva
- Se l'utente non è sicuro, suggerisci opzioni comuni per il suo settore
- Quando hai raccolto TUTTE le informazioni, fai un riepilogo completo e chiedi conferma

## ESEMPIO DI RIEPILOGO FINALE:
"Perfetto! Ecco il riepilogo della tua azienda:
- Nome: [nome]
- Tipo: [tipo]
- Orari: [orari]
- Collaboratori: [numero]
- Nuclei: [lista nuclei]
- Gestione ore: [tipo ore]

È tutto corretto? Se sì, clicca su 'Completa Setup' per salvare!"

Inizia presentandoti brevemente e chiedendo il nome dell'azienda.`;

export async function POST(req: NextRequest) {
    try {
        const { messages } = await req.json();

        const apiKey = process.env.OPENROUTER_API_KEY?.trim();

        if (!apiKey) {
            return NextResponse.json(
                { error: 'OpenRouter API key not configured' },
                { status: 500 }
            );
        }

        const systemMessage = {
            role: 'system',
            content: ONBOARDING_SYSTEM_PROMPT,
        };

        const fullMessages = [systemMessage, ...messages];

        // Chiamata diretta all'API OpenRouter chat/completions
        const response = await fetch('https://openrouter.ai/api/v1/chat/completions', {
            method: 'POST',
            headers: {
                'Authorization': `Bearer ${apiKey}`,
                'Content-Type': 'application/json',
                'HTTP-Referer': process.env.NEXT_PUBLIC_APP_URL || 'http://localhost:3000',
                'X-Title': 'Turnjob',
            },
            body: JSON.stringify({
                model: 'x-ai/grok-4.1-fast',
                messages: fullMessages,
                max_tokens: 1000,
                temperature: 0.7,
            }),
        });

        if (!response.ok) {
            const errorData = await response.text();
            console.error('OpenRouter error:', errorData);
            return NextResponse.json(
                { error: 'Errore nella comunicazione con il modello AI', details: errorData },
                { status: response.status }
            );
        }

        const data = await response.json();
        const assistantMessage = data.choices?.[0]?.message?.content || 'Mi dispiace, non ho ricevuto una risposta. Riprova.';

        return NextResponse.json({
            message: assistantMessage,
            content: assistantMessage,
        });
    } catch (error) {
        console.error('Error in onboarding chat:', error);
        return NextResponse.json(
            { error: 'Errore durante la generazione della risposta', details: error instanceof Error ? error.message : String(error) },
            { status: 500 }
        );
    }
}
