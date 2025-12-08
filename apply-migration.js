const { createClient } = require('@supabase/supabase-js');
const fs = require('fs');

const supabaseUrl = 'https://ehatuudayymrzyrrkyyg.supabase.co';
const supabaseKey = 'eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9.eyJpc3MiOiJzdXBhYmFzZSIsInJlZiI6ImVoYXR1dWRheXltcnp5cnJreXlnIiwicm9sZSI6InNlcnZpY2Vfcm9sZSIsImlhdCI6MTc2MzMwMjU0MSwiZXhwIjoyMDc4ODc4NTQxfQ.RGSlj11F3dHNlEiXH1NWl8eQ0kCDbm3h2XtIU6vU74s';

const supabase = createClient(supabaseUrl, supabaseKey);

async function applyMigration() {
  try {
    const sql = fs.readFileSync('migration.sql', 'utf8');
    console.log('Applying migration...');

    const { data, error } = await supabase.rpc('exec_sql', { sql });

    if (error) {
      console.error('Error applying migration:', error);
    } else {
      console.log('Migration applied successfully');
    }
  } catch (err) {
    console.error('Error:', err);
  }
}

applyMigration();