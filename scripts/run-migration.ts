import { createClient } from '@supabase/supabase-js';
import * as fs from 'fs';
import * as path from 'path';

const supabaseUrl = process.env.NEXT_PUBLIC_SUPABASE_URL!;
const supabaseServiceKey = process.env.SUPABASE_SERVICE_ROLE_KEY!;

const supabase = createClient(supabaseUrl, supabaseServiceKey, {
    auth: {
        autoRefreshToken: false,
        persistSession: false
    }
});

async function runMigration() {
    console.log('🚀 Avvio migrazione database Turnjob...\n');

    // Leggi file SQL
    const schemaPath = path.join(process.cwd(), 'schema_italiano.sql');
    const migrationV2Path = path.join(process.cwd(), 'migration_v2_ore_flessibili.sql');

    // Verifica esistenza file
    if (!fs.existsSync(schemaPath)) {
        console.error('❌ File schema_italiano.sql non trovato!');
        process.exit(1);
    }

    const schemaSQL = fs.readFileSync(schemaPath, 'utf-8');

    console.log('📝 Applicando schema italiano...');

    // Esegui schema principale via RPC o query diretta
    // Supabase non supporta query multi-statement dirette,
    // quindi usiamo la funzione exec_sql se disponibile
    // o splittiamo le query

    // Splitta le query per semicolon (semplificato)
    const queries = schemaSQL
        .split(/;[\s\n]+(?=(?:--|CREATE|DROP|ALTER|INSERT|UPDATE|DELETE|DO|COMMIT|BEGIN))/i)
        .map(q => q.trim())
        .filter(q => q.length > 0 && !q.startsWith('--'));

    console.log(`📊 Trovate ${queries.length} query da eseguire...\n`);

    let successCount = 0;
    let errorCount = 0;

    for (let i = 0; i < queries.length; i++) {
        const query = queries[i];
        const shortQuery = query.substring(0, 60).replace(/\n/g, ' ');

        try {
            // Esegui query usando RPC exec_sql se disponibile
            const { data, error } = await supabase.rpc('exec_sql', {
                sql_query: query + ';'
            });

            if (error) {
                // Se exec_sql non esiste, prova con query diretta
                // (funziona solo per alcune operazioni)
                console.log(`⚠️  Query ${i + 1}: ${shortQuery}...`);
                console.log(`   Errore: ${error.message}`);
                errorCount++;
            } else {
                console.log(`✅ Query ${i + 1}/${queries.length}: ${shortQuery}...`);
                successCount++;
            }
        } catch (err) {
            console.log(`❌ Query ${i + 1}: ${shortQuery}...`);
            console.log(`   Errore: ${err}`);
            errorCount++;
        }
    }

    console.log('\n📊 Risultato migrazione:');
    console.log(`   ✅ Successo: ${successCount}`);
    console.log(`   ❌ Errori: ${errorCount}`);

    if (errorCount > 0) {
        console.log('\n⚠️  Alcuni errori potrebbero essere normali (es: IF NOT EXISTS)');
        console.log('   Verifica manualmente le tabelle create.');
    }

    // Verifica tabelle create
    console.log('\n🔍 Verifico tabelle create...');
    const { data: tables } = await supabase
        .from('Azienda')
        .select('id')
        .limit(1);

    if (tables !== null) {
        console.log('✅ Tabella Azienda esiste!');
    } else {
        console.log('❌ Tabella Azienda non trovata - migrazione fallita');
    }
}

runMigration().catch(console.error);
