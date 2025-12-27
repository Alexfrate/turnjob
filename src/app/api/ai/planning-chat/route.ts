/**
 * API AI Planning Chat
 *
 * POST /api/ai/planning-chat - Chat AI per pianificazione turni
 *
 * L'AI distingue tra:
 * - CONTINUATIVE: Pattern ricorrenti settimanali (salvati nel DB)
 * - SPORADICHE: Eventi una tantum per la settimana specifica
 */

import { createClient } from '@/lib/supabase/server';
import { NextRequest, NextResponse } from 'next/server';
import { getUserAzienda } from '@/lib/auth/get-user-azienda';
import {
  assignRiposiAutomatici,
  type RiposiAssignmentInput,
  type RiposiAssignmentContext,
  type RiposoGenerato,
} from '@/lib/ai/shift-generation';
import {
  generateOperationalConstraintsForAI
} from '@/lib/utils/closed-days';
import type { OrarioApertura } from '@/types/database';

// Funzione per formattare date ISO in italiano leggibile
function formatDateItalian(isoDate: string): string {
  if (!isoDate || isoDate === 'non specificato') return isoDate;
  try {
    const date = new Date(isoDate);
    return date.toLocaleDateString('it-IT', {
      timeZone: 'Europe/Rome',
      weekday: 'long',
      day: 'numeric',
      month: 'long',
    });
  } catch {
    return isoDate;
  }
}

// System prompt è costruito dinamicamente per includere data e ora corrente
function buildSystemPrompt(
  currentDate: string,
  currentTime: string,
  weekStart: string,
  weekEnd: string,
  orarioApertura?: OrarioApertura,
  weekStartISO?: string
): string {
  // Genera vincoli operativi (giorni chiusura + festività)
  const operationalConstraints = generateOperationalConstraintsForAI(orarioApertura, weekStartISO);

  return `Sei l'assistente AI di Turnjob per la pianificazione turni.

OGGI È: ${currentDate}
ORA CORRENTE: ${currentTime}
SETTIMANA DA PIANIFICARE: ${weekStart} - ${weekEnd}

${operationalConstraints}

## REGOLE COMUNICAZIONE (IMPORTANTE!)
- Messaggi BREVI: max 2-3 frasi per risposta
- Una domanda alla volta
- Scrivi in modo chiaro e conciso senza emoji
- NO lunghe introduzioni
- NON chiedere dati che sono già nel CONTESTO AZIENDA sotto
- **MAI proporre turni o criticità per giorni di chiusura o festività**

## DATI GIÀ CARICATI
I collaboratori, nuclei, criticità continuative, riposi, preferenze e ore lavorate sono GIÀ nel sistema (vedi CONTESTO AZIENDA sotto).
NON chiedere all'utente di elencare i collaboratori o i nuclei - li hai già!
Quando finisci con le criticità, conferma: "Ho già i dati di X collaboratori, Y nuclei, riposi e preferenze. Procedo con la generazione dei turni?"

## VINCOLI DA RISPETTARE
**HARD (obbligatori):**
- Collaboratore NON può lavorare se ha RIPOSO assegnato quel giorno
- Collaboratore NON può lavorare se in FERIE/PERMESSO approvati
- Collaboratore NON può superare ore settimanali del contratto
- Ogni nucleo DEVE avere copertura minima
- Collaboratore può lavorare SOLO in nuclei a cui appartiene (può appartenere a PIU nuclei)
- **NON pianificare MAI turni per giorni di chiusura aziendale o festività**

**SOFT (preferenziali):**
- Rispettare preferenze PREFERRED dei collaboratori
- Distribuire ore equamente tra collaboratori
- Seguire pattern storici quando disponibili

## PRIMO MESSAGGIO
Inizia con:
"Ciao! Pianifichiamo la settimana ${weekStart}-${weekEnd}.

Dimmi le **criticità** da considerare:
- Attività programmate
- Ferie/assenze
- Eventi speciali

Qual è la prima?"

## CRITICITÀ
- **CONTINUATIVE**: Pattern settimanali ricorrenti (es. "ogni giovedì scarico")
- **SPORADICHE**: Eventi solo questa settimana (es. "Marco in ferie lunedì")

**IMPORTANTE**: Quando l'utente descrive MULTIPLE criticità in un messaggio, DEVI emettere UN BLOCCO \`\`\`criticita PER OGNI criticità rilevata.
Esempio: "scarichi lunedì e venerdì + ferie Marco mercoledì" = 3 blocchi criticita separati.
Distingui attentamente tra criticità diverse per tipo, giorno, orario o attività.
**RICORDA**: NON proporre criticità per giorni di chiusura o festività!

## GENERAZIONE TURNI
Quando l'utente conferma o chiede di generare i turni:
1. Analizza nuclei, collaboratori e criticità
2. Genera turni per ogni giorno della settimana
3. Per ogni turno emetti un blocco \`\`\`turno con i dati
4. Considera le criticità per aumentare staff_richiesti
5. Suggerisci collaboratori in base ai nuclei di appartenenza

## CATEGORIE CRITICITÀ
SCARICO_MERCI, ALTA_AFFLUENZA, PICCO_WEEKEND, COPERTURA_MINIMA, EVENTO_SPECIALE, EVENTO_CRITICO, ASSENZA_FERIE, ASSENZA_MALATTIA, LIMITAZIONE_TEMP, FORMAZIONE, MANUTENZIONE, ALTRO

## OUTPUT JSON CRITICITÀ
\`\`\`criticita
{
  "tipo": "CATEGORIA",
  "nome": "Nome",
  "descrizione": "Descrizione",
  "giorno_settimana": 1-7,
  "ora_inizio": "HH:MM",
  "ora_fine": "HH:MM",
  "is_continuativa": true/false,
  "staff_extra": 0,
  "confidenza": 0.9
}
\`\`\`

## OUTPUT JSON TURNO (per generare turni)
\`\`\`turno
{
  "nucleo_nome": "Nome del nucleo (DEVE corrispondere esattamente a un nucleo esistente)",
  "data": "YYYY-MM-DD",
  "ora_inizio": "HH:MM",
  "ora_fine": "HH:MM",
  "num_collaboratori_richiesti": 1,
  "note": "Note opzionali",
  "collaboratori_suggeriti": ["Nome Cognome", "Nome Cognome"],
  "confidenza": 0.85
}
\`\`\`

## COMANDI RIPOSI SETTIMANALI
Quando l'utente chiede di assegnare riposi a un collaboratore (es. "Mario deve avere 2 mezze giornate di riposo"):
- Cerca il collaboratore nel contesto
- Determina tipo e quantita di riposo
- Se modalita="auto", assegnerai tu i giorni migliori evitando criticita
- Se modalita="specifico", usa i giorni indicati dall'utente

\`\`\`riposo
{
  "collaboratore_nome": "Nome Cognome",
  "tipo_riposo": "giorni_interi" | "mezze_giornate" | "ore",
  "quantita": 2,
  "modalita": "auto" | "specifico",
  "giorni_specifici": [3, 5],
  "confidenza": 0.9
}
\`\`\`

Esempi:
- "Mario deve avere 2 giorni di riposo" → tipo_riposo: "giorni_interi", quantita: 2, modalita: "auto"
- "Anna mezza giornata lunedi" → tipo_riposo: "mezze_giornate", quantita: 1, modalita: "specifico", giorni_specifici: [1]
- "Luca 8 ore di riposo" → tipo_riposo: "ore", quantita: 8, modalita: "auto"

IMPORTANTE: Puoi emettere più blocchi \`\`\`turno e \`\`\`riposo nella stessa risposta.`;
}

export async function POST(req: NextRequest) {
  try {
    const supabase = await createClient();

    // Verifica autenticazione
    const {
      data: { user },
      error: authError,
    } = await supabase.auth.getUser();
    if (authError || !user) {
      return NextResponse.json({ error: 'Non autenticato' }, { status: 401 });
    }

    // Ottieni azienda
    const { azienda, error: aziendaError } = await getUserAzienda(supabase, user.email!);

    if (!azienda || aziendaError) {
      return NextResponse.json({ error: aziendaError || 'Azienda non trovata' }, { status: 404 });
    }

    const { messages, weekStart, weekEnd, excludedCriticitaIds = [] } = await req.json();

    if (!messages || !Array.isArray(messages)) {
      return NextResponse.json({ error: 'Messaggi non validi' }, { status: 400 });
    }

    // Genera data e ora corrente formattata con timezone Europe/Rome
    const now = new Date();
    const currentDate = now.toLocaleDateString('it-IT', {
      timeZone: 'Europe/Rome',
      weekday: 'long',
      year: 'numeric',
      month: 'long',
      day: 'numeric',
    });
    const currentTime = now.toLocaleTimeString('it-IT', {
      timeZone: 'Europe/Rome',
      hour: '2-digit',
      minute: '2-digit',
    });

    // Calcola date per contesto storico (ultime 4 settimane)
    const fourWeeksAgo = weekStart
      ? new Date(new Date(weekStart).getTime() - 28 * 24 * 60 * 60 * 1000).toISOString().split('T')[0]
      : null;

    // Carica contesto: criticità continuative, collaboratori, nuclei, ferie, config LLM
    // + NUOVO: turni storici, riposi settimanali, assegnazioni esistenti, preferenze
    const [
      criticitaRes,
      collaboratoriRes,
      nucleiRes,
      appartenenzaRes,
      periodiCriticiRes,
      llmConfigRes,
      // Nuove query per contesto esteso
      turniStoriciRes,
      riposiRes,
      assegnazioniRes,
      preferenzeRes,
      richiesteRes,
    ] = await Promise.all([
      supabase
        .from('CriticitaContinuativa')
        .select('*')
        .eq('azienda_id', azienda.id)
        .eq('attivo', true)
        .order('giorno_settimana'),
      supabase
        .from('Collaboratore')
        .select('id, nome, cognome, tipo_contratto, ore_settimanali')
        .eq('azienda_id', azienda.id)
        .eq('attivo', true),
      supabase
        .from('Nucleo')
        .select('id, nome, mansione, colore, membri_richiesti_min, membri_richiesti_max, orario_specifico')
        .eq('azienda_id', azienda.id),
      supabase
        .from('Appartenenza_Nucleo')
        .select('collaboratore_id, nucleo_id, Collaboratore(nome, cognome), Nucleo(nome)')
        .is('data_fine', null),
      weekStart && weekEnd
        ? supabase
            .from('PeriodoCritico')
            .select('*')
            .eq('azienda_id', azienda.id)
            .eq('attivo', true)
            .gte('data_fine', weekStart)
            .lte('data_inizio', weekEnd)
        : Promise.resolve({ data: [] }),
      // Carica config LLM globale (planningChatModelId)
      supabase
        .from('LlmConfiguration')
        .select('planningChatModelId')
        .is('companyId', null)
        .limit(1),
      // NUOVO: Turni storici (ultime 4 settimane) per pattern analysis
      fourWeeksAgo && weekStart
        ? supabase
            .from('Turno')
            .select(`
              id, nucleo_id, data, ora_inizio, ora_fine, num_collaboratori_richiesti,
              Nucleo(nome),
              Assegnazione_Turno(collaboratore_id, Collaboratore(nome, cognome))
            `)
            .gte('data', fourWeeksAgo)
            .lt('data', weekStart)
            .order('data', { ascending: false })
            .limit(100)
        : Promise.resolve({ data: [] }),
      // NUOVO: Riposi settimanali assegnati per la settimana
      weekStart
        ? supabase
            .from('RiposoSettimanale')
            .select(`
              collaboratore_id, giorno_settimana, tipo_riposo,
              Collaboratore(nome, cognome)
            `)
            .eq('azienda_id', azienda.id)
            .eq('settimana_inizio', weekStart)
        : Promise.resolve({ data: [] }),
      // NUOVO: Assegnazioni esistenti nella settimana (per calcolo ore lavorate)
      weekStart && weekEnd
        ? supabase
            .from('Assegnazione_Turno')
            .select(`
              collaboratore_id,
              Turno!inner(data, ora_inizio, ora_fine, nucleo_id)
            `)
            .gte('Turno.data', weekStart)
            .lte('Turno.data', weekEnd)
        : Promise.resolve({ data: [] }),
      // NUOVO: Preferenze collaboratori per la settimana
      weekStart && weekEnd
        ? supabase
            .from('PreferenzaTurno')
            .select(`
              collaboratore_id, data, ora_inizio, ora_fine, tipo, stato_validazione,
              Collaboratore(nome, cognome)
            `)
            .gte('data', weekStart)
            .lte('data', weekEnd)
        : Promise.resolve({ data: [] }),
      // NUOVO: Richieste ferie/permessi nella settimana
      weekStart && weekEnd
        ? supabase
            .from('Richiesta')
            .select(`
              collaboratore_id, tipo, data_inizio, data_fine, stato,
              Collaboratore(nome, cognome)
            `)
            .or(`data_inizio.lte.${weekEnd},data_fine.gte.${weekStart}`)
            .in('stato', ['approvata', 'in_attesa'])
        : Promise.resolve({ data: [] }),
    ]);

    // Filtra criticità escluse dall'utente
    const allCriticita = criticitaRes.data || [];
    const criticita = excludedCriticitaIds.length > 0
      ? allCriticita.filter((c: { id: string }) => !excludedCriticitaIds.includes(c.id))
      : allCriticita;
    const collaboratori = collaboratoriRes.data || [];
    const nuclei = nucleiRes.data || [];
    const appartenenze = appartenenzaRes.data || [];
    const periodiCritici = periodiCriticiRes.data || [];
    // Nuovi dati per contesto esteso
    const turniStorici = turniStoriciRes.data || [];
    const riposi = riposiRes.data || [];
    const assegnazioni = assegnazioniRes.data || [];
    const preferenze = preferenzeRes.data || [];
    const richieste = richiesteRes.data || [];

    // Debug logging
    console.log('[AI Planning] Azienda:', azienda.id, azienda.nome);
    console.log('[AI Planning] Collaboratori trovati:', collaboratori.length);
    console.log('[AI Planning] Nuclei trovati:', nuclei.length);
    console.log('[AI Planning] Criticità trovate:', criticita.length);
    console.log('[AI Planning] Turni storici:', turniStorici.length);
    console.log('[AI Planning] Riposi settimana:', riposi.length);
    console.log('[AI Planning] Assegnazioni settimana:', assegnazioni.length);
    console.log('[AI Planning] Preferenze settimana:', preferenze.length);
    console.log('[AI Planning] Richieste ferie/permessi:', richieste.length);
    if (collaboratoriRes.error) console.error('[AI Planning] Errore collaboratori:', collaboratoriRes.error);
    if (nucleiRes.error) console.error('[AI Planning] Errore nuclei:', nucleiRes.error);

    // Modello dinamico dalla config globale o fallback
    const configuredModel = llmConfigRes.data?.[0]?.planningChatModelId;
    const model = configuredModel || 'x-ai/grok-4.1-fast';

    // Costruisci contesto per l'AI
    const giorni = ['', 'Lunedì', 'Martedì', 'Mercoledì', 'Giovedì', 'Venerdì', 'Sabato', 'Domenica'];

    const criticitaContext = criticita.length > 0
      ? `## CRITICITÀ CONTINUATIVE SALVATE\n${criticita
          .map((c) => `- [CONTINUATIVA] ${c.nome} (${c.tipo}): ${giorni[c.giorno_settimana]}${c.ora_inizio ? ` ${c.ora_inizio}-${c.ora_fine || ''}` : ''}`)
          .join('\n')}`
      : '## CRITICITÀ CONTINUATIVE\nNessuna criticità continuativa salvata.';

    const collaboratoriContext = collaboratori.length > 0
      ? `## COLLABORATORI DISPONIBILI (${collaboratori.length})\n${collaboratori
          .map((c) => `- ${c.nome} ${c.cognome} (${c.tipo_contratto || 'N/D'}) - ${c.ore_settimanali || 40}h/sett`)
          .join('\n')}`
      : '## COLLABORATORI\nNessun collaboratore registrato.';

    // Costruisci contesto nuclei con membri appartenenti
    const nucleiContext = nuclei.length > 0
      ? `## NUCLEI (${nuclei.length})\n${nuclei
          .map((n) => {
            const membri = (appartenenze as unknown[])
              .filter((a: unknown) => (a as { nucleo_id: string }).nucleo_id === n.id)
              .map((a: unknown) => {
                const app = a as { Collaboratore: { nome: string; cognome: string } | null };
                return app.Collaboratore ? `${app.Collaboratore.nome} ${app.Collaboratore.cognome}` : '';
              })
              .filter(Boolean);
            return `- **${n.nome}** (${n.mansione}): min ${n.membri_richiesti_min || 1} persone${membri.length > 0 ? ` | Membri: ${membri.join(', ')}` : ''}`;
          })
          .join('\n')}`
      : '## NUCLEI\nNessun nucleo configurato.';

    const periodiContext = periodiCritici.length > 0
      ? `## PERIODI CRITICI/FERIE QUESTA SETTIMANA\n${periodiCritici
          .map((p) => `- [SPORADICA] ${p.nome}: ${p.data_inizio} - ${p.data_fine}`)
          .join('\n')}`
      : '';

    // NUOVO: Contesto riposi settimanali assegnati
    const riposiContext = riposi.length > 0
      ? `## RIPOSI GIA ASSEGNATI QUESTA SETTIMANA\n${riposi
          .map((r) => {
            // Supabase ritorna relazioni come array, prendiamo il primo elemento
            const collArray = r.Collaboratore as unknown as Array<{ nome: string; cognome: string }> | null;
            const coll = Array.isArray(collArray) ? collArray[0] : collArray;
            const nome = coll ? `${coll.nome} ${coll.cognome}` : 'Collaboratore';
            return `- ${nome}: ${giorni[r.giorno_settimana]} (${r.tipo_riposo})`;
          })
          .join('\n')}`
      : '';

    // NUOVO: Calcola ore già lavorate/assegnate nella settimana per ogni collaboratore
    interface AssegnazioneConTurnoRaw {
      collaboratore_id: string;
      Turno: Array<{ data: string; ora_inizio: string; ora_fine: string; nucleo_id: string }>;
    }
    const orePerCollaboratore = new Map<string, number>();
    for (const ass of assegnazioni as unknown as AssegnazioneConTurnoRaw[]) {
      // Supabase ritorna Turno come array quando usa !inner
      const turnoArray = ass.Turno;
      const turno = Array.isArray(turnoArray) ? turnoArray[0] : turnoArray;
      if (turno && turno.ora_inizio && turno.ora_fine) {
        const [hI, mI] = turno.ora_inizio.split(':').map(Number);
        const [hF, mF] = turno.ora_fine.split(':').map(Number);
        const ore = (hF * 60 + mF - (hI * 60 + mI)) / 60;
        const current = orePerCollaboratore.get(ass.collaboratore_id) || 0;
        orePerCollaboratore.set(ass.collaboratore_id, current + Math.max(0, ore));
      }
    }

    const oreLavorateContext = orePerCollaboratore.size > 0
      ? `## ORE GIA ASSEGNATE QUESTA SETTIMANA\n${collaboratori
          .filter((c) => orePerCollaboratore.has(c.id))
          .map((c) => {
            const oreLavorate = orePerCollaboratore.get(c.id) || 0;
            const oreContratto = c.ore_settimanali || 40;
            const oreResidue = Math.max(0, oreContratto - oreLavorate);
            return `- ${c.nome} ${c.cognome}: ${oreLavorate.toFixed(1)}h/${oreContratto}h (residue: ${oreResidue.toFixed(1)}h)`;
          })
          .join('\n')}`
      : '';

    // NUOVO: Contesto preferenze collaboratori
    interface PreferenzaConCollaboratoreRaw {
      collaboratore_id: string;
      data: string;
      ora_inizio: string | null;
      ora_fine: string | null;
      tipo: string;
      stato_validazione: string;
      Collaboratore: Array<{ nome: string; cognome: string }> | null;
    }
    const preferenzeContext = preferenze.length > 0
      ? `## PREFERENZE COLLABORATORI QUESTA SETTIMANA\n${(preferenze as unknown as PreferenzaConCollaboratoreRaw[])
          .map((p) => {
            const collArray = p.Collaboratore;
            const coll = Array.isArray(collArray) ? collArray[0] : collArray;
            const nome = coll ? `${coll.nome} ${coll.cognome}` : 'Collaboratore';
            const dataFormatted = formatDateItalian(p.data);
            const orario = p.ora_inizio && p.ora_fine ? ` ${p.ora_inizio}-${p.ora_fine}` : '';
            const tipoLabel = p.tipo === 'PREFERRED' ? 'PREFERITO' : p.tipo === 'UNAVAILABLE' ? 'NON DISPONIBILE' : 'DISPONIBILE';
            return `- ${nome}: ${dataFormatted}${orario} [${tipoLabel}]`;
          })
          .join('\n')}`
      : '';

    // NUOVO: Contesto richieste ferie/permessi
    interface RichiestaConCollaboratoreRaw {
      collaboratore_id: string;
      tipo: string;
      data_inizio: string;
      data_fine: string;
      stato: string;
      Collaboratore: Array<{ nome: string; cognome: string }> | null;
    }
    const richiesteContext = richieste.length > 0
      ? `## RICHIESTE FERIE/PERMESSI QUESTA SETTIMANA\n${(richieste as unknown as RichiestaConCollaboratoreRaw[])
          .map((r) => {
            const collArray = r.Collaboratore;
            const coll = Array.isArray(collArray) ? collArray[0] : collArray;
            const nome = coll ? `${coll.nome} ${coll.cognome}` : 'Collaboratore';
            const tipoLabel = r.tipo === 'ferie' ? 'FERIE' : r.tipo === 'permesso' ? 'PERMESSO' : 'RIPOSO';
            const statoLabel = r.stato === 'approvata' ? '[APPROVATA]' : '[IN ATTESA]';
            return `- ${nome}: ${tipoLabel} ${formatDateItalian(r.data_inizio)} - ${formatDateItalian(r.data_fine)} ${statoLabel}`;
          })
          .join('\n')}`
      : '';

    // NUOVO: Analizza pattern storici per ogni nucleo
    interface TurnoStoricoRaw {
      id: string;
      nucleo_id: string;
      data: string;
      ora_inizio: string;
      ora_fine: string;
      num_collaboratori_richiesti: number;
      Nucleo: Array<{ nome: string }> | null;
      Assegnazione_Turno: Array<{ collaboratore_id: string; Collaboratore: Array<{ nome: string; cognome: string }> | null }>;
    }
    const patternPerNucleo = new Map<string, { giorni: Map<number, number[]>; nucleoNome: string }>();
    for (const turno of turniStorici as unknown as TurnoStoricoRaw[]) {
      const nucleoArray = turno.Nucleo;
      const nucleo = Array.isArray(nucleoArray) ? nucleoArray[0] : nucleoArray;
      const nucleoNome = nucleo?.nome || 'Sconosciuto';
      if (!patternPerNucleo.has(turno.nucleo_id)) {
        patternPerNucleo.set(turno.nucleo_id, { giorni: new Map(), nucleoNome });
      }
      const pattern = patternPerNucleo.get(turno.nucleo_id)!;
      const giorno = new Date(turno.data).getDay(); // 0=Dom, 1=Lun, ...
      const giornoIT = giorno === 0 ? 7 : giorno; // Converti a 1-7 (Lun-Dom)
      if (!pattern.giorni.has(giornoIT)) {
        pattern.giorni.set(giornoIT, []);
      }
      pattern.giorni.get(giornoIT)!.push(turno.num_collaboratori_richiesti);
    }

    const patternContext = patternPerNucleo.size > 0
      ? `## PATTERN TURNI STORICI (ultime 4 settimane)\n${Array.from(patternPerNucleo.entries())
          .map(([, data]) => {
            const giorniPattern = Array.from(data.giorni.entries())
              .map(([g, counts]) => {
                const avg = counts.reduce((a, b) => a + b, 0) / counts.length;
                return `${giorni[g]}: ~${avg.toFixed(0)} pers.`;
              })
              .join(', ');
            return `- ${data.nucleoNome}: ${giorniPattern}`;
          })
          .join('\n')}`
      : '';

    // Formatta le date della settimana in italiano leggibile
    const weekStartFormatted = formatDateItalian(weekStart || 'non specificato');
    const weekEndFormatted = formatDateItalian(weekEnd || 'non specificato');

    // Costruisci system prompt con data e ora corrente e vincoli operativi
    const systemPrompt = buildSystemPrompt(
      currentDate,
      currentTime,
      weekStartFormatted,
      weekEndFormatted,
      azienda.orario_apertura,
      weekStart // ISO format per calcolo festività
    );

    // Costruisci array di contesti (filtra quelli vuoti)
    const allContexts = [
      nucleiContext,
      criticitaContext,
      collaboratoriContext,
      periodiContext,
      riposiContext,
      oreLavorateContext,
      preferenzeContext,
      richiesteContext,
      patternContext,
    ].filter(Boolean);

    const contextMessage = {
      role: 'system',
      content: `${systemPrompt}\n\n---\n\n# CONTESTO AZIENDA: ${azienda.nome}\n\n${allContexts.join('\n\n')}`,
    };

    const apiKey = process.env.OPENROUTER_API_KEY?.trim();
    if (!apiKey) {
      return NextResponse.json(
        { error: 'OpenRouter API key not configured' },
        { status: 500 }
      );
    }

    // Chiamata OpenRouter
    const response = await fetch('https://openrouter.ai/api/v1/chat/completions', {
      method: 'POST',
      headers: {
        Authorization: `Bearer ${apiKey}`,
        'Content-Type': 'application/json',
        'HTTP-Referer': process.env.NEXT_PUBLIC_APP_URL || 'http://localhost:3000',
        'X-Title': 'Turnjob Planning',
      },
      body: JSON.stringify({
        model: model, // Modello dinamico dalla config
        messages: [contextMessage, ...messages],
        max_tokens: 1000, // Ridotto per risposte più brevi
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
    const assistantMessage =
      data.choices?.[0]?.message?.content ||
      'Mi dispiace, non ho ricevuto una risposta. Riprova.';

    // Estrai eventuali criticità dal messaggio (supporta sia ```criticita che ```json)
    const extractedCriticita: unknown[] = [];
    const extractedTurni: unknown[] = [];
    const extractedRiposi: RiposoGenerato[] = [];

    // Match blocchi ```criticita
    const criticitaMatches = assistantMessage.matchAll(/```criticita\s*([\s\S]*?)```/g);
    for (const match of criticitaMatches) {
      try {
        const parsed = JSON.parse(match[1]);
        if (parsed.tipo) extractedCriticita.push(parsed);
      } catch {
        console.warn('Failed to parse criticità JSON block');
      }
    }

    // Match blocchi ```turno
    const turnoMatches = assistantMessage.matchAll(/```turno\s*([\s\S]*?)```/g);
    for (const match of turnoMatches) {
      try {
        const parsed = JSON.parse(match[1]);
        // Verifica che sia un turno valido
        if (parsed.nucleo_nome && parsed.data && parsed.ora_inizio) {
          // Risolvi nucleo_nome a nucleo_id
          const nucleo = nuclei.find((n) => n.nome.toLowerCase() === parsed.nucleo_nome.toLowerCase());
          if (nucleo) {
            extractedTurni.push({
              ...parsed,
              nucleo_id: nucleo.id,
              nucleo_colore: nucleo.colore,
            });
          } else {
            console.warn(`Nucleo not found: ${parsed.nucleo_nome}`);
            extractedTurni.push(parsed); // Aggiungi comunque per mostrare all'utente
          }
        }
      } catch {
        console.warn('Failed to parse turno JSON block');
      }
    }

    // Match blocchi ```json (solo se contengono campi di criticità)
    const jsonMatches = assistantMessage.matchAll(/```json\s*([\s\S]*?)```/g);
    for (const match of jsonMatches) {
      try {
        const parsed = JSON.parse(match[1]);
        // Verifica che sia una criticità (ha campo tipo)
        if (parsed.tipo && parsed.nome) {
          extractedCriticita.push(parsed);
        }
        // Verifica che sia un turno
        if (parsed.nucleo_nome && parsed.data && parsed.ora_inizio) {
          const nucleo = nuclei.find((n) => n.nome.toLowerCase() === parsed.nucleo_nome.toLowerCase());
          if (nucleo) {
            extractedTurni.push({
              ...parsed,
              nucleo_id: nucleo.id,
              nucleo_colore: nucleo.colore,
            });
          } else {
            extractedTurni.push(parsed);
          }
        }
        // Verifica che sia un riposo
        if (parsed.collaboratore_nome && parsed.tipo_riposo && parsed.quantita) {
          // Process come blocco riposo
          processRiposoBlock(parsed);
        }
      } catch {
        console.warn('Failed to parse JSON block');
      }
    }

    // Match blocchi ```riposo
    const riposoMatches = assistantMessage.matchAll(/```riposo\s*([\s\S]*?)```/g);
    for (const match of riposoMatches) {
      try {
        const parsed = JSON.parse(match[1]);
        if (parsed.collaboratore_nome && parsed.tipo_riposo && parsed.quantita) {
          processRiposoBlock(parsed);
        }
      } catch {
        console.warn('Failed to parse riposo JSON block');
      }
    }

    // Funzione helper per processare blocchi riposo
    function processRiposoBlock(parsed: {
      collaboratore_nome: string;
      tipo_riposo: 'giorni_interi' | 'mezze_giornate' | 'ore';
      quantita: number;
      modalita?: 'auto' | 'specifico';
      giorni_specifici?: number[];
    }) {
      // Trova il collaboratore
      const collNome = parsed.collaboratore_nome.toLowerCase();
      const collaboratore = collaboratori.find(
        (c) => `${c.nome} ${c.cognome}`.toLowerCase() === collNome ||
               c.nome.toLowerCase() === collNome ||
               c.cognome.toLowerCase() === collNome
      );

      if (!collaboratore) {
        console.warn(`Collaboratore not found for riposo: ${parsed.collaboratore_nome}`);
        return;
      }

      // Prepara il contesto per l'assegnazione
      const assignmentContext: RiposiAssignmentContext = {
        collaboratori: collaboratori.map((c) => ({
          id: c.id,
          nome: c.nome,
          cognome: c.cognome,
          tipo_contratto: c.tipo_contratto as 'full_time' | 'part_time' | 'altro' | null,
          ore_settimanali: c.ore_settimanali || 40,
          ore_gia_assegnate: orePerCollaboratore.get(c.id) || 0,
          ore_residue: (c.ore_settimanali || 40) - (orePerCollaboratore.get(c.id) || 0),
          nuclei_appartenenza: (appartenenze as unknown[])
            .filter((a: unknown) => (a as { collaboratore_id: string }).collaboratore_id === c.id)
            .map((a: unknown) => (a as { nucleo_id: string }).nucleo_id),
          nuclei_nomi: [],
        })),
        nuclei: nuclei.map((n) => ({
          id: n.id,
          nome: n.nome,
          mansione: n.mansione || '',
          colore: n.colore || '#3b82f6',
          membri_richiesti_min: n.membri_richiesti_min || 1,
          membri_richiesti_max: n.membri_richiesti_max,
          membri: (appartenenze as unknown[])
            .filter((a: unknown) => (a as { nucleo_id: string }).nucleo_id === n.id)
            .map((a: unknown) => (a as { collaboratore_id: string }).collaboratore_id),
        })),
        criticita_continuative: criticita.map((c) => ({
          id: c.id,
          tipo: c.tipo,
          nome: c.nome,
          giorno_settimana: c.giorno_settimana,
          ora_inizio: c.ora_inizio,
          ora_fine: c.ora_fine,
          staff_extra: c.staff_extra || 0,
          moltiplicatore_staff: Number(c.moltiplicatore_staff) || 1,
        })),
        richieste_approvate: (richieste as unknown as RichiestaConCollaboratoreRaw[])
          .filter((r) => r.stato === 'approvata')
          .map((r) => ({
            collaboratore_id: r.collaboratore_id,
            tipo: r.tipo as 'ferie' | 'permesso' | 'riposo',
            data_inizio: r.data_inizio,
            data_fine: r.data_fine,
          })),
        riposi_gia_assegnati: riposi.map((r) => ({
          collaboratore_id: r.collaboratore_id,
          giorno_settimana: r.giorno_settimana,
          tipo_riposo: r.tipo_riposo as 'intero' | 'mezza_mattina' | 'mezza_pomeriggio',
        })),
        slot_occupati: new Map(),
      };

      // Se modalita specifico, crea riposi direttamente
      if (parsed.modalita === 'specifico' && parsed.giorni_specifici && parsed.giorni_specifici.length > 0) {
        const giorni = ['', 'Lunedì', 'Martedì', 'Mercoledì', 'Giovedì', 'Venerdì', 'Sabato', 'Domenica'];
        const weekDates = getWeekDatesArray(weekStart);

        for (const giorno of parsed.giorni_specifici) {
          const tipoRiposoDb = parsed.tipo_riposo === 'giorni_interi'
            ? 'intero'
            : parsed.tipo_riposo === 'mezze_giornate'
              ? 'mezza_mattina'
              : 'intero';

          extractedRiposi.push({
            collaboratore_id: collaboratore.id,
            nome_completo: `${collaboratore.nome} ${collaboratore.cognome}`,
            giorno_settimana: giorno,
            giorno_nome: giorni[giorno],
            tipo_riposo: tipoRiposoDb,
            data: weekDates[giorno - 1] || '',
            confidence: 0.9,
          });
        }
      } else {
        // Modalita auto: usa l'algoritmo
        const input: RiposiAssignmentInput = {
          collaboratore_id: collaboratore.id,
          nome_completo: `${collaboratore.nome} ${collaboratore.cognome}`,
          tipo_riposo: parsed.tipo_riposo,
          quantita: parsed.quantita,
          settimana_inizio: weekStart,
        };

        const result = assignRiposiAutomatici(input, assignmentContext);
        extractedRiposi.push(...result.riposi);

        if (result.warnings.length > 0) {
          console.log('[AI Planning] Riposi warnings:', result.warnings);
        }
      }
    }

    // Helper per generare date settimana
    function getWeekDatesArray(startDate: string): string[] {
      const dates: string[] = [];
      const start = new Date(startDate);
      for (let i = 0; i < 7; i++) {
        const date = new Date(start);
        date.setDate(start.getDate() + i);
        dates.push(date.toISOString().split('T')[0]);
      }
      return dates;
    }

    // Restituisci TUTTE le criticità estratte come array
    console.log('[AI Planning] Criticità estratte:', extractedCriticita.length);
    console.log('[AI Planning] Turni estratti:', extractedTurni.length);
    console.log('[AI Planning] Riposi estratti:', extractedRiposi.length);

    return NextResponse.json({
      message: assistantMessage,
      content: assistantMessage,
      // Restituisce array di tutte le criticità (retrocompatibilità: null se vuoto)
      extractedCriticita: extractedCriticita.length > 0 ? extractedCriticita : null,
      extractedTurni: extractedTurni.length > 0 ? extractedTurni : null,
      extractedRiposi: extractedRiposi.length > 0 ? extractedRiposi : null,
      model: model, // Modello usato per la risposta
      context: {
        criticitaContinuative: criticita.length,
        collaboratori: collaboratori.length,
        nuclei: nuclei.length,
        periodiCritici: periodiCritici.length,
        // Nuovi dati contesto esteso
        turniStorici: turniStorici.length,
        riposiSettimana: riposi.length,
        assegnazioniSettimana: assegnazioni.length,
        preferenzeSettimana: preferenze.length,
        richiesteSettimana: richieste.length,
        currentDate: currentDate,
        currentTime: currentTime,
        weekStart: weekStartFormatted,
        weekEnd: weekEndFormatted,
      },
    });
  } catch (error) {
    console.error('Error in planning chat:', error);
    return NextResponse.json(
      {
        error: 'Errore durante la generazione della risposta',
        details: error instanceof Error ? error.message : String(error),
      },
      { status: 500 }
    );
  }
}
