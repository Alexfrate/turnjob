import { NextRequest, NextResponse } from 'next/server';
import { createClient } from '@/lib/supabase/server';
import { z } from 'zod';

const collaboratoreSchema = z.object({
  nome: z.string().min(1, 'Nome obbligatorio'),
  cognome: z.string().min(1, 'Cognome obbligatorio'),
  email: z.string().email('Email non valida'),
  telefono: z.string().optional(),
  codice_fiscale: z.string().length(16).optional().nullable(),
  tipo_contratto: z.enum(['full_time', 'part_time', 'altro']).optional().default('altro'),
  ore_settimanali: z.number().min(1).max(60).optional().nullable(),
  data_assunzione: z.string().optional().nullable(),
  iban: z.string().optional().nullable(),
  indirizzo: z.string().optional().nullable(),
  note: z.string().optional().nullable(),
});

const importSchema = z.object({
  collaboratori: z.array(collaboratoreSchema).min(1, 'Almeno un collaboratore richiesto'),
});

export async function POST(request: NextRequest) {
  try {
    const supabase = await createClient();

    // Verify authentication
    const { data: { user }, error: authError } = await supabase.auth.getUser();

    if (authError || !user) {
      return NextResponse.json(
        { error: 'Non autenticato' },
        { status: 401 }
      );
    }

    // Get user's azienda
    const { data: adminUser, error: adminError } = await supabase
      .from('AdminUser')
      .select('azienda_id')
      .eq('id', user.id)
      .single();

    if (adminError || !adminUser?.azienda_id) {
      return NextResponse.json(
        { error: 'Azienda non trovata' },
        { status: 400 }
      );
    }

    const body = await request.json();
    const validation = importSchema.safeParse(body);

    if (!validation.success) {
      return NextResponse.json(
        { error: 'Dati non validi', details: validation.error.errors },
        { status: 400 }
      );
    }

    const { collaboratori } = validation.data;
    const results = {
      created: 0,
      failed: 0,
      errors: [] as string[],
    };

    // Check for existing emails to avoid duplicates
    const emails = collaboratori.map((c) => c.email.toLowerCase());
    const { data: existingCollaboratori } = await supabase
      .from('Collaboratore')
      .select('email')
      .eq('azienda_id', adminUser.azienda_id)
      .in('email', emails);

    const existingEmails = new Set(
      existingCollaboratori?.map((c) => c.email.toLowerCase()) || []
    );

    // Process each collaboratore
    for (const collab of collaboratori) {
      const emailLower = collab.email.toLowerCase();

      // Skip if email already exists
      if (existingEmails.has(emailLower)) {
        results.failed++;
        results.errors.push(`Email già esistente: ${collab.email}`);
        continue;
      }

      // Create collaboratore
      const { error: insertError } = await supabase.from('Collaboratore').insert({
        azienda_id: adminUser.azienda_id,
        nome: collab.nome,
        cognome: collab.cognome,
        email: emailLower,
        telefono: collab.telefono || null,
        codice_fiscale: collab.codice_fiscale || null,
        tipo_contratto: collab.tipo_contratto || 'altro',
        ore_settimanali: collab.ore_settimanali || null,
        data_assunzione: collab.data_assunzione || null,
        iban: collab.iban || null,
        indirizzo: collab.indirizzo || null,
        note: collab.note || null,
        attivo: true,
      });

      if (insertError) {
        results.failed++;
        results.errors.push(`${collab.nome} ${collab.cognome}: ${insertError.message}`);
      } else {
        results.created++;
        // Add to existing emails to prevent duplicates within same batch
        existingEmails.add(emailLower);
      }
    }

    return NextResponse.json({
      success: true,
      created: results.created,
      failed: results.failed,
      errors: results.errors.length > 0 ? results.errors : undefined,
    });
  } catch (error) {
    console.error('Error importing collaboratori:', error);
    return NextResponse.json(
      { error: error instanceof Error ? error.message : 'Errore durante l\'importazione' },
      { status: 500 }
    );
  }
}
