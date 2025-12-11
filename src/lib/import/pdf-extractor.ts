import type { ParsedCollaboratore, ParseResult } from './csv-parser';

interface ExtractedData {
  collaboratori: ParsedCollaboratore[];
  rawText?: string;
}

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

export async function extractFromPDF(file: File): Promise<ParseResult> {
  try {
    // Convert PDF to base64 for API call
    const base64 = await fileToBase64(file);

    // Call our API endpoint that handles OpenRouter
    const response = await fetch('/api/ai/extract-pdf', {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({
        fileData: base64,
        fileName: file.name,
        mimeType: file.type,
      }),
    });

    if (!response.ok) {
      const error = await response.json();
      return {
        success: false,
        data: [],
        errors: [error.error || 'Errore estrazione PDF'],
        warnings: [],
      };
    }

    const result: ExtractedData = await response.json();

    if (!result.collaboratori || result.collaboratori.length === 0) {
      return {
        success: false,
        data: [],
        errors: ['Nessun collaboratore trovato nel documento'],
        warnings: [],
      };
    }

    // Validate extracted data
    const errors: string[] = [];
    const warnings: string[] = [];
    const validData: ParsedCollaboratore[] = [];

    result.collaboratori.forEach((collab, index) => {
      const rowErrors: string[] = [];

      if (!collab.nome) rowErrors.push('Nome mancante');
      if (!collab.cognome) rowErrors.push('Cognome mancante');

      // Generate placeholder email if missing
      if (!collab.email && collab.nome && collab.cognome) {
        collab.email = `${collab.nome.toLowerCase()}.${collab.cognome.toLowerCase()}@placeholder.com`;
        warnings.push(`Collaboratore ${index + 1}: Email generata automaticamente (da verificare)`);
      }

      if (!collab.email) rowErrors.push('Email mancante');

      // Validate codice fiscale
      if (collab.codice_fiscale && !/^[A-Z0-9]{16}$/i.test(collab.codice_fiscale)) {
        warnings.push(`Collaboratore ${index + 1}: Codice fiscale potenzialmente non valido`);
      }

      if (rowErrors.length > 0) {
        errors.push(`Collaboratore ${index + 1}: ${rowErrors.join(', ')}`);
      } else {
        validData.push({
          ...collab,
          _rowIndex: index + 1,
        });
      }
    });

    return {
      success: validData.length > 0,
      data: validData,
      errors,
      warnings,
    };

  } catch (error) {
    return {
      success: false,
      data: [],
      errors: [`Errore estrazione PDF: ${error instanceof Error ? error.message : 'Errore sconosciuto'}`],
      warnings: [],
    };
  }
}

async function fileToBase64(file: File): Promise<string> {
  return new Promise((resolve, reject) => {
    const reader = new FileReader();
    reader.readAsDataURL(file);
    reader.onload = () => {
      const result = reader.result as string;
      // Remove data:application/pdf;base64, prefix
      const base64 = result.split(',')[1];
      resolve(base64);
    };
    reader.onerror = error => reject(error);
  });
}

export { EXTRACTION_PROMPT };
