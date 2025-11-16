#!/usr/bin/env node

/**
 * Supabase MCP Server for Turnjob
 * Allows direct database management via MCP
 */

const { createClient } = require('@supabase/supabase-js');

const SUPABASE_URL = process.env.SUPABASE_URL;
const SUPABASE_SERVICE_ROLE_KEY = process.env.SUPABASE_SERVICE_ROLE_KEY;

if (!SUPABASE_URL || !SUPABASE_SERVICE_ROLE_KEY) {
  console.error('Missing SUPABASE_URL or SUPABASE_SERVICE_ROLE_KEY');
  process.exit(1);
}

const supabase = createClient(SUPABASE_URL, SUPABASE_SERVICE_ROLE_KEY, {
  auth: {
    autoRefreshToken: false,
    persistSession: false
  }
});

// MCP Server implementation
const server = {
  name: 'supabase-turnjob',
  version: '1.0.0',

  async executeSql(query) {
    try {
      const { data, error } = await supabase.rpc('exec_sql', { query });
      if (error) throw error;
      return { success: true, data };
    } catch (error) {
      return { success: false, error: error.message };
    }
  },

  async listTables() {
    try {
      const { data, error } = await supabase
        .from('information_schema.tables')
        .select('table_name')
        .eq('table_schema', 'public');

      if (error) throw error;
      return { success: true, tables: data };
    } catch (error) {
      return { success: false, error: error.message };
    }
  },

  async getTableSchema(tableName) {
    try {
      const { data, error } = await supabase
        .from('information_schema.columns')
        .select('*')
        .eq('table_name', tableName)
        .eq('table_schema', 'public');

      if (error) throw error;
      return { success: true, schema: data };
    } catch (error) {
      return { success: false, error: error.message };
    }
  }
};

// Handle MCP protocol
process.stdin.on('data', async (data) => {
  try {
    const request = JSON.parse(data.toString());
    let response;

    switch (request.method) {
      case 'executeSql':
        response = await server.executeSql(request.params.query);
        break;
      case 'listTables':
        response = await server.listTables();
        break;
      case 'getTableSchema':
        response = await server.getTableSchema(request.params.tableName);
        break;
      default:
        response = { success: false, error: 'Unknown method' };
    }

    process.stdout.write(JSON.stringify(response) + '\n');
  } catch (error) {
    process.stdout.write(JSON.stringify({ success: false, error: error.message }) + '\n');
  }
});

console.error('Supabase MCP Server started for Turnjob');
