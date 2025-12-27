import { NextRequest, NextResponse } from 'next/server';

const EXTRACTION_PROMPT = `Analizza la seguente conversazione di onboarding e estrai le informazioni aziendali.
Restituisci SOLO un oggetto JSON valido (senza markdown, senza spiegazioni) con i seguenti campi:

{
  "nomeAzienda": "string - Il nome dell'azienda",
  "tipoAttivita": "string - Una tra: ristorazione, retail, hotel, ufficio, sanita, manifattura, altro",
  "orarioApertura": {
    "tipo": "fisso o variabile",
    // SE tipo = "fisso": tutti i giorni hanno lo stesso orario
    "inizio": "HH:MM",
    "fine": "HH:MM",
    // SE tipo = "variabile": specifica ogni giorno con possibilità di chiusura
    "lun": { "inizio": "HH:MM", "fine": "HH:MM", "chiuso": false },
    "mar": { "inizio": "HH:MM", "fine": "HH:MM", "chiuso": false },
    "mer": { "inizio": "HH:MM", "fine": "HH:MM", "chiuso": false },
    "gio": { "inizio": "HH:MM", "fine": "HH:MM", "chiuso": false },
    "ven": { "inizio": "HH:MM", "fine": "HH:MM", "chiuso": false },
    "sab": { "inizio": "HH:MM", "fine": "HH:MM", "chiuso": false },
    "dom": { "inizio": "HH:MM", "fine": "HH:MM", "chiuso": true } // chiuso = giorno di chiusura
  },
  "numeroCollaboratori": "number - Numero approssimativo di collaboratori",
  "nuclei": [
    { "nome": "string", "mansione": "string" }
  ],
  "configurazioneOre": {
    "tipo": "settimanale_fisso, mensile, o flessibile",
    "valore": "number (ore)",
    "min": "number (se flessibile)",
    "max": "number (se flessibile)"
  }
}

IMPORTANTE per orarioApertura:
- Se l'utente menziona giorni di CHIUSURA (es. "chiusi la domenica", "non apriamo il lunedì"), usa tipo "variabile" e imposta chiuso=true per quei giorni
- Se l'utente dice "aperti 7 giorni su 7" o non menziona chiusure, usa tipo "fisso"
- Per retail/supermercati: di solito domenica chiusa o orario ridotto

Se un'informazione non è chiara, usa questi default:
- tipoAttivita: "altro"
- orarioApertura: { "tipo": "variabile", "lun": {"inizio":"08:00","fine":"20:00"}, "mar": {"inizio":"08:00","fine":"20:00"}, "mer": {"inizio":"08:00","fine":"20:00"}, "gio": {"inizio":"08:00","fine":"20:00"}, "ven": {"inizio":"08:00","fine":"20:00"}, "sab": {"inizio":"08:00","fine":"20:00"}, "dom": {"inizio":"08:00","fine":"13:00","chiuso":true} }
- numeroCollaboratori: 10
- configurazioneOre: { "tipo": "settimanale_fisso", "valore": 40 }

IMPORTANTE: Rispondi SOLO con il JSON, senza testo prima o dopo. Non usare commenti nel JSON.

Conversazione:
`;

export async function POST(req: NextRequest) {
    try {
        const { messages } = await req.json();

        if (!messages || !Array.isArray(messages)) {
            return NextResponse.json(
                { error: 'Messaggi non validi' },
                { status: 400 }
            );
        }

        const apiKey = process.env.OPENROUTER_API_KEY;
        if (!apiKey) {
            return NextResponse.json(
                { error: 'OpenRouter API key not configured' },
                { status: 500 }
            );
        }

        // Costruisci il testo della conversazione
        const conversationText = messages
            .filter((m: { role: string }) => m.role !== 'system')
            .map((m: { role: string; content: string }) => `${m.role === 'user' ? 'Utente' : 'Assistente'}: ${m.content}`)
            .join('\n');

        const fullPrompt = EXTRACTION_PROMPT + conversationText;

        // Chiamata diretta all'API OpenRouter
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
                messages: [
                    {
                        role: 'user',
                        content: fullPrompt
                    }
                ],
                max_tokens: 2000,
                temperature: 0.3, // Bassa temperatura per output più deterministico
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

        const result = await response.json();
        const content = result.choices?.[0]?.message?.content || '';

        // Prova a parsare il JSON dalla risposta
        let extractedData;
        try {
            // Rimuovi eventuale markdown code block
            let jsonStr = content.trim();
            if (jsonStr.startsWith('```json')) {
                jsonStr = jsonStr.slice(7);
            }
            if (jsonStr.startsWith('```')) {
                jsonStr = jsonStr.slice(3);
            }
            if (jsonStr.endsWith('```')) {
                jsonStr = jsonStr.slice(0, -3);
            }
            jsonStr = jsonStr.trim();

            extractedData = JSON.parse(jsonStr);
        } catch (parseError) {
            console.error('Error parsing JSON from AI response:', content);
            console.error('Parse error:', parseError);
            return NextResponse.json(
                { error: 'Impossibile parsare la risposta del modello', details: content },
                { status: 500 }
            );
        }

        return NextResponse.json({ success: true, data: extractedData });
    } catch (error) {
        console.error('Error extracting onboarding data:', error);
        return NextResponse.json(
            {
                error: 'Errore durante l\'estrazione dei dati',
                details: error instanceof Error ? error.message : String(error)
            },
            { status: 500 }
        );
    }
}
