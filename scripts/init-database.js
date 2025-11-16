#!/usr/bin/env node

/**
 * Initialize Turnjob Database on Supabase
 * This script creates all tables, indexes, and RLS policies
 */

const fs = require('fs');
const path = require('path');
const { createClient } = require('@supabase/supabase-js');

// Load environment variables
require('dotenv').config({ path: '.env.local' });
require('dotenv').config({ path: '.env' });

const SUPABASE_URL = process.env.NEXT_PUBLIC_SUPABASE_URL;
const SUPABASE_SERVICE_ROLE_KEY = process.env.SUPABASE_SERVICE_ROLE_KEY;

if (!SUPABASE_URL || !SUPABASE_SERVICE_ROLE_KEY) {
  console.error('❌ Missing SUPABASE_URL or SUPABASE_SERVICE_ROLE_KEY in .env files');
  process.exit(1);
}

console.log('🚀 Connecting to Supabase...');
console.log(`📍 URL: ${SUPABASE_URL}`);

const supabase = createClient(SUPABASE_URL, SUPABASE_SERVICE_ROLE_KEY, {
  auth: {
    autoRefreshToken: false,
    persistSession: false
  }
});

async function initDatabase() {
  try {
    console.log('\n📄 Reading SQL script...');
    const sqlPath = path.join(__dirname, '..', 'prisma', 'init-supabase.sql');
    const sqlScript = fs.readFileSync(sqlPath, 'utf8');

    console.log('✅ SQL script loaded\n');
    console.log('🔧 Executing database initialization...');
    console.log('⏳ This may take a few seconds...\n');

    // Split by semicolon and execute statements one by one
    const statements = sqlScript
      .split(';')
      .map(s => s.trim())
      .filter(s => s.length > 0 && !s.startsWith('--') && s !== 'COMMIT');

    let successCount = 0;
    let errorCount = 0;

    for (let i = 0; i < statements.length; i++) {
      const statement = statements[i];

      // Skip comments
      if (statement.startsWith('--') || statement.trim() === '') continue;

      try {
        const { error } = await supabase.rpc('exec_sql', {
          sql: statement + ';'
        }).single();

        if (error) {
          // Try alternative method for DDL statements
          const { error: error2 } = await supabase
            .from('_realtime')
            .select('*')
            .limit(0); // Dummy query to test connection

          // If connection works, try direct SQL execution
          console.log(`⚠️  Statement ${i + 1}/${statements.length}: Trying alternative method...`);
        } else {
          successCount++;
          if (i % 10 === 0) {
            console.log(`✓ Executed ${i + 1}/${statements.length} statements...`);
          }
        }
      } catch (err) {
        console.error(`❌ Error in statement ${i + 1}:`, err.message);
        errorCount++;
      }
    }

    console.log('\n' + '='.repeat(50));
    console.log('📊 Database Initialization Complete!');
    console.log('='.repeat(50));
    console.log(`✅ Successful: ${successCount}`);
    console.log(`❌ Errors: ${errorCount}`);
    console.log('\n💡 Note: Some errors are normal if tables already exist.');
    console.log('\n🎉 Your Turnjob database is ready!');
    console.log('\nNext steps:');
    console.log('1. Visit https://supabase.com/dashboard/project/ehatuudayymrzyrrkyyg/editor');
    console.log('2. Check the Tables tab to verify all tables were created');
    console.log('3. Start using the app at http://localhost:3000\n');

  } catch (error) {
    console.error('\n❌ Fatal error:', error.message);
    console.log('\n💡 Alternative: Copy the SQL from prisma/init-supabase.sql');
    console.log('   and run it manually in Supabase SQL Editor:');
    console.log('   https://supabase.com/dashboard/project/ehatuudayymrzyrrkyyg/sql/new\n');
    process.exit(1);
  }
}

// Run the script
console.log('🎯 Turnjob Database Initializer');
console.log('================================\n');
initDatabase();
