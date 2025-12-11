import { NextRequest, NextResponse } from 'next/server';
import { createOpenRouter, OPENROUTER_MODELS } from '@/lib/ai/openrouter';
import { generateText } from 'ai';
import { createClient } from '@/lib/supabase/server';

const EXTRACTION_PROMPT = `Sei un esperto di estrazione dati da documenti HR italiani.
Analizza questa immagine di un documento (busta paga, contratto, lista dipendenti).

Estrai i dati dei collaboratori trovati nel documento. Per ogni collaboratore cerca di estrarre:
- nome (obbligatorio)
- cognome (obbligatorio)
- email (se presente)
- telefono (se presente)
- codice_fiscale (16 caratteri alfanumerici)
- tipo_contratto: "full_time", "part_time" o "altro"
- ore_settimanali (numero)
- data_assunzione (formato YYYY-MM-DD)
- iban (se presente)
- indirizzo (se presente)

IMPORTANTE:
- Se trovi più collaboratori, restituiscili tutti
- Se un campo non è presente, omettilo
- Per le email, se non presenti prova a costruirle dal nome (opzionale)
- Codice fiscale italiano: 16 caratteri (es. RSSMRA80A01H501Z)

Rispondi SOLO con un JSON valido nel formato:
{
  "collaboratori": [
    {
      "nome": "Mario",
      "cognome": "Rossi",
      "email": "mario.rossi@email.com",
      "codice_fiscale": "RSSMRA80A01H501Z",
      "tipo_contratto": "full_time",
      "ore_settimanali": 40
    }
  ]
}

Se non riesci a estrarre dati, rispondi con: {"collaboratori": [], "error": "motivo"}`;

export async function POST(request: NextRequest) {
  try {
    // Verify authentication
    const supabase = await createClient();
    const { data: { user }, error: authError } = await supabase.auth.getUser();

    if (authError || !user) {
      return NextResponse.json(
        { error: 'Non autenticato' },
        { status: 401 }
      );
    }

    const body = await request.json();
    const { fileData, fileName, mimeType } = body;

    if (!fileData) {
      return NextResponse.json(
        { error: 'Dati file mancanti' },
        { status: 400 }
      );
    }

    // Get AI configuration from database
    const { data: aiConfig } = await supabase
      .from('ConfigAI')
      .select('llm_model, llm_provider')
      .eq('user_id', user.id)
      .single();

    // Use configured model or default to a vision-capable model
    const modelId = aiConfig?.llm_model || OPENROUTER_MODELS.gpt4o;

    const openrouter = createOpenRouter();

    // For PDFs, we need to convert to images first (handled client-side)
    // The fileData should already be a base64 encoded image
    const result = await generateText({
      model: openrouter(modelId),
      messages: [
        {
          role: 'user' as const,
          content: [
            { type: 'text' as const, text: EXTRACTION_PROMPT },
            {
              type: 'image' as const,
              image: `data:${mimeType || 'image/png'};base64,${fileData}`,
            },
          ],
        },
      ],
    });

    // Parse the JSON response
    let extractedData;
    try {
      // Try to extract JSON from the response
      const jsonMatch = result.text.match(/\{[\s\S]*\}/);
      if (jsonMatch) {
        extractedData = JSON.parse(jsonMatch[0]);
      } else {
        throw new Error('No JSON found in response');
      }
    } catch (parseError) {
      console.error('Error parsing AI response:', parseError);
      console.error('Raw response:', result.text);
      return NextResponse.json(
        { error: 'Errore nel parsing della risposta AI', rawResponse: result.text },
        { status: 500 }
      );
    }

    return NextResponse.json(extractedData);
  } catch (error) {
    console.error('Error extracting PDF data:', error);
    return NextResponse.json(
      { error: error instanceof Error ? error.message : 'Errore estrazione PDF' },
      { status: 500 }
    );
  }
}
