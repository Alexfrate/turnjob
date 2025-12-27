/**
 * API Generate Week
 *
 * POST /api/ai/generate-week - Genera turni per l'intera settimana usando l'algoritmo AI
 *
 * Body: { weekStart: string, weekEnd: string }
 * Response: { turni, coverage_stats, workload_distribution, warnings, confidence_average }
 */

import { createClient } from '@/lib/supabase/server';
import { NextRequest, NextResponse } from 'next/server';
import { getUserAzienda } from '@/lib/auth/get-user-azienda';
import { generateWeekShifts } from '@/lib/ai/shift-generation';
import type {
  GenerationContext,
  CollaboratoreDisponibilita,
  NucleoInfo,
  CriticitaContinuativa,
  PeriodoCritico,
  RiposoAssegnato,
  PreferenzaCollaboratore,
  RichiestaApprovata,
  PatternStorico,
} from '@/lib/ai/shift-generation';
import { getClosedDays, isHoliday } from '@/lib/utils/closed-days';

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

    const { weekStart, weekEnd } = await req.json();

    if (!weekStart || !weekEnd) {
      return NextResponse.json(
        { error: 'weekStart e weekEnd sono obbligatori' },
        { status: 400 }
      );
    }

    // Calcola date per contesto storico (ultime 4 settimane)
    const fourWeeksAgo = new Date(new Date(weekStart).getTime() - 28 * 24 * 60 * 60 * 1000)
      .toISOString()
      .split('T')[0];

    // Carica tutti i dati necessari
    const [
      collaboratoriRes,
      nucleiRes,
      appartenenzaRes,
      criticitaRes,
      periodiCriticiRes,
      riposiRes,
      assegnazioniRes,
      preferenzeRes,
      richiesteRes,
      turniStoriciRes,
    ] = await Promise.all([
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
        .select('collaboratore_id, nucleo_id')
        .is('data_fine', null),
      supabase
        .from('CriticitaContinuativa')
        .select('id, tipo, nome, giorno_settimana, ora_inizio, ora_fine, staff_extra, moltiplicatore_staff')
        .eq('azienda_id', azienda.id)
        .eq('attivo', true),
      supabase
        .from('PeriodoCritico')
        .select('id, nome, data_inizio, data_fine, ora_inizio, ora_fine, staff_minimo, moltiplicatore_staff')
        .eq('azienda_id', azienda.id)
        .eq('attivo', true)
        .gte('data_fine', weekStart)
        .lte('data_inizio', weekEnd),
      supabase
        .from('RiposoSettimanale')
        .select('collaboratore_id, giorno_settimana, tipo_riposo')
        .eq('azienda_id', azienda.id)
        .eq('settimana_inizio', weekStart),
      supabase
        .from('Assegnazione_Turno')
        .select('collaboratore_id, Turno!inner(data, ora_inizio, ora_fine)')
        .gte('Turno.data', weekStart)
        .lte('Turno.data', weekEnd),
      supabase
        .from('PreferenzaTurno')
        .select('collaboratore_id, data, ora_inizio, ora_fine, tipo')
        .gte('data', weekStart)
        .lte('data', weekEnd),
      supabase
        .from('Richiesta')
        .select('collaboratore_id, tipo, data_inizio, data_fine')
        .or(`data_inizio.lte.${weekEnd},data_fine.gte.${weekStart}`)
        .eq('stato', 'approvata'),
      supabase
        .from('Turno')
        .select('id, nucleo_id, data, ora_inizio, ora_fine, num_collaboratori_richiesti, Nucleo(nome)')
        .gte('data', fourWeeksAgo)
        .lt('data', weekStart)
        .order('data', { ascending: false })
        .limit(100),
    ]);

    // Estrai dati
    const collaboratoriRaw = collaboratoriRes.data || [];
    const nucleiRaw = nucleiRes.data || [];
    const appartenenze = (appartenenzaRes.data || []) as { collaboratore_id: string; nucleo_id: string }[];
    const criticitaRaw = criticitaRes.data || [];
    const periodiCriticiRaw = periodiCriticiRes.data || [];
    const riposiRaw = riposiRes.data || [];
    interface AssegnazioneRaw {
      collaboratore_id: string;
      Turno: Array<{ data: string; ora_inizio: string; ora_fine: string }>;
    }
    const assegnazioniRaw = (assegnazioniRes.data || []) as unknown as AssegnazioneRaw[];
    const preferenzeRaw = preferenzeRes.data || [];
    const richiesteRaw = richiesteRes.data || [];
    interface TurnoStoricoRaw {
      id: string;
      nucleo_id: string;
      data: string;
      ora_inizio: string;
      ora_fine: string;
      num_collaboratori_richiesti: number;
      Nucleo: Array<{ nome: string }> | null;
    }
    const turniStoriciRaw = (turniStoriciRes.data || []) as unknown as TurnoStoricoRaw[];

    // Calcola ore già assegnate per ogni collaboratore
    const orePerCollaboratore = new Map<string, number>();
    for (const ass of assegnazioniRaw) {
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

    // Costruisci collaboratori con disponibilità
    const collaboratori: CollaboratoreDisponibilita[] = collaboratoriRaw.map((c) => {
      const nucleiAppartenenza = appartenenze
        .filter((a) => a.collaboratore_id === c.id)
        .map((a) => a.nucleo_id);
      const nucleiNomi = nucleiAppartenenza
        .map((nid) => nucleiRaw.find((n) => n.id === nid)?.nome || '')
        .filter(Boolean);
      const oreGiaAssegnate = orePerCollaboratore.get(c.id) || 0;
      const oreSettimanali = c.ore_settimanali || 40;

      return {
        id: c.id,
        nome: c.nome,
        cognome: c.cognome,
        tipo_contratto: c.tipo_contratto,
        ore_settimanali: oreSettimanali,
        ore_gia_assegnate: oreGiaAssegnate,
        ore_residue: Math.max(0, oreSettimanali - oreGiaAssegnate),
        nuclei_appartenenza: nucleiAppartenenza,
        nuclei_nomi: nucleiNomi,
      };
    });

    // Costruisci nuclei con membri
    const nuclei: NucleoInfo[] = nucleiRaw.map((n) => {
      const membri = appartenenze.filter((a) => a.nucleo_id === n.id).map((a) => a.collaboratore_id);
      return {
        id: n.id,
        nome: n.nome,
        mansione: n.mansione || '',
        colore: n.colore || '#3b82f6',
        membri_richiesti_min: n.membri_richiesti_min || 1,
        membri_richiesti_max: n.membri_richiesti_max,
        orario_specifico: n.orario_specifico as NucleoInfo['orario_specifico'],
        membri,
      };
    });

    // Costruisci criticità continuative
    const criticitaContinuative: CriticitaContinuativa[] = criticitaRaw.map((c) => ({
      id: c.id,
      tipo: c.tipo,
      nome: c.nome,
      giorno_settimana: c.giorno_settimana,
      ora_inizio: c.ora_inizio,
      ora_fine: c.ora_fine,
      staff_extra: c.staff_extra || 0,
      moltiplicatore_staff: Number(c.moltiplicatore_staff) || 1,
    }));

    // Costruisci periodi critici
    const periodiCritici: PeriodoCritico[] = periodiCriticiRaw.map((p) => ({
      id: p.id,
      nome: p.nome,
      data_inizio: p.data_inizio,
      data_fine: p.data_fine,
      ora_inizio: p.ora_inizio,
      ora_fine: p.ora_fine,
      staff_minimo: p.staff_minimo,
      moltiplicatore_staff: Number(p.moltiplicatore_staff) || 1,
    }));

    // Costruisci riposi
    const riposi: RiposoAssegnato[] = riposiRaw.map((r) => ({
      collaboratore_id: r.collaboratore_id,
      giorno_settimana: r.giorno_settimana,
      tipo_riposo: r.tipo_riposo as RiposoAssegnato['tipo_riposo'],
    }));

    // Costruisci preferenze
    const preferenze: PreferenzaCollaboratore[] = preferenzeRaw.map((p) => ({
      collaboratore_id: p.collaboratore_id,
      data: p.data,
      ora_inizio: p.ora_inizio,
      ora_fine: p.ora_fine,
      tipo: p.tipo as PreferenzaCollaboratore['tipo'],
    }));

    // Costruisci richieste approvate
    const richiesteApprovate: RichiestaApprovata[] = richiesteRaw.map((r) => ({
      collaboratore_id: r.collaboratore_id,
      tipo: r.tipo as RichiestaApprovata['tipo'],
      data_inizio: r.data_inizio,
      data_fine: r.data_fine,
    }));

    // Analizza pattern storici
    const patternMap = new Map<
      string,
      { nucleo_id: string; nucleo_nome: string; giorni: Map<number, number[]> }
    >();
    for (const turno of turniStoriciRaw) {
      const nucleoNome = turno.Nucleo?.[0]?.nome || 'Sconosciuto';
      if (!patternMap.has(turno.nucleo_id)) {
        patternMap.set(turno.nucleo_id, {
          nucleo_id: turno.nucleo_id,
          nucleo_nome: nucleoNome,
          giorni: new Map(),
        });
      }
      const pattern = patternMap.get(turno.nucleo_id)!;
      const giorno = new Date(turno.data).getDay();
      const giornoIT = giorno === 0 ? 7 : giorno;
      if (!pattern.giorni.has(giornoIT)) {
        pattern.giorni.set(giornoIT, []);
      }
      pattern.giorni.get(giornoIT)!.push(turno.num_collaboratori_richiesti);
    }

    const patternStorici: PatternStorico[] = [];
    for (const [, data] of patternMap) {
      for (const [giorno, counts] of data.giorni) {
        patternStorici.push({
          nucleo_id: data.nucleo_id,
          nucleo_nome: data.nucleo_nome,
          giorno_settimana: giorno,
          media_collaboratori: counts.reduce((a, b) => a + b, 0) / counts.length,
        });
      }
    }

    // Costruisci contesto completo
    const context: GenerationContext = {
      azienda_id: azienda.id,
      week_start: weekStart,
      week_end: weekEnd,
      collaboratori,
      nuclei,
      criticita_continuative: criticitaContinuative,
      periodi_critici: periodiCritici,
      riposi,
      preferenze,
      richieste_approvate: richiesteApprovate,
      pattern_storici: patternStorici,
    };

    // Ottieni giorni di chiusura dall'orario_apertura
    const closedDays = getClosedDays(azienda.orario_apertura);
    console.log('[Generate Week] Closed days:', closedDays);

    // Genera turni
    console.log('[Generate Week] Generating shifts for', weekStart, '-', weekEnd);
    console.log('[Generate Week] Context:', {
      collaboratori: collaboratori.length,
      nuclei: nuclei.length,
      criticita: criticitaContinuative.length,
      periodi: periodiCritici.length,
      riposi: riposi.length,
      preferenze: preferenze.length,
      richieste: richiesteApprovate.length,
      pattern: patternStorici.length,
    });

    const result = generateWeekShifts(context);

    // Filtra turni per escludere giorni di chiusura e festività
    const turniFiltered = result.turni.filter((turno) => {
      const turnoDate = new Date(turno.data);
      const dayOfWeek = turnoDate.getDay();
      const dayOfWeekISO = dayOfWeek === 0 ? 7 : dayOfWeek; // Converti 0=Dom a 7

      // Escludi giorni di chiusura aziendale
      if (closedDays.includes(dayOfWeekISO)) {
        console.log(`[Generate Week] Filtered out shift on closed day: ${turno.data} (day ${dayOfWeekISO})`);
        return false;
      }

      // Escludi festività
      const holiday = isHoliday(turnoDate);
      if (holiday.isHoliday) {
        console.log(`[Generate Week] Filtered out shift on holiday: ${turno.data} (${holiday.name})`);
        return false;
      }

      return true;
    });

    // Aggiorna risultato con turni filtrati
    const filteredResult = {
      ...result,
      turni: turniFiltered,
    };

    // Aggiungi warning se sono stati filtrati turni
    const numFiltered = result.turni.length - turniFiltered.length;
    if (numFiltered > 0) {
      filteredResult.warnings = [
        ...result.warnings,
        {
          tipo: 'spostamento_suggerito' as const,
          messaggio: `${numFiltered} turni esclusi perché pianificati in giorni di chiusura o festività`,
          severita: 'info' as const,
        },
      ];
    }

    console.log('[Generate Week] Result:', {
      turni: filteredResult.turni.length,
      filteredOut: numFiltered,
      warnings: filteredResult.warnings.length,
      confidence: filteredResult.confidence_average.toFixed(2),
    });

    return NextResponse.json(filteredResult);
  } catch (error) {
    console.error('Error generating week shifts:', error);
    return NextResponse.json(
      {
        error: 'Errore durante la generazione dei turni',
        details: error instanceof Error ? error.message : String(error),
      },
      { status: 500 }
    );
  }
}
