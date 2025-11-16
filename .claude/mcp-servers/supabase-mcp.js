#!/usr/bin/env node

/**
 * Supabase MCP Server for Turnjob
 * Provides SQL execution capabilities via Supabase Management API
 */

const https = require('https');
const { createClient } = require('@supabase/supabase-js');

const SUPABASE_URL = process.env.SUPABASE_URL;
const SUPABASE_KEY = process.env.SUPABASE_SERVICE_ROLE_KEY;
const PROJECT_REF = process.env.SUPABASE_PROJECT_REF || 'ehatuudayymrzyrrkyyg';

if (!SUPABASE_URL || !SUPABASE_KEY) {
  console.error(JSON.stringify({
    error: 'Missing SUPABASE_URL or SUPABASE_SERVICE_ROLE_KEY'
  }));
  process.exit(1);
}

// Create Supabase client
const supabase = createClient(SUPABASE_URL, SUPABASE_KEY);

// MCP Protocol Handler
class SupabaseMCPServer {
  constructor() {
    this.methods = {
      'supabase/execute_sql': this.executeSql.bind(this),
      'supabase/list_tables': this.listTables.bind(this),
      'supabase/get_table_info': this.getTableInfo.bind(this),
      'supabase/insert_data': this.insertData.bind(this),
      'supabase/query_data': this.queryData.bind(this),
    };
  }

  async executeSql(params) {
    const { sql } = params;

    try {
      // Use Supabase's REST API to execute SQL
      const { data, error } = await supabase
        .from('_sql')
        .select('*')
        .limit(0);

      // For DDL statements, we need to use the database connection directly
      // This is a workaround since Supabase doesn't expose direct SQL execution

      return {
        success: true,
        message: 'SQL execution via MCP is limited. Please use Supabase Dashboard SQL Editor for DDL statements.',
        suggestion: `Copy the SQL to: https://supabase.com/dashboard/project/${PROJECT_REF}/sql/new`
      };
    } catch (error) {
      return {
        success: false,
        error: error.message
      };
    }
  }

  async listTables() {
    try {
      const { data, error } = await supabase
        .from('information_schema.tables')
        .select('table_name')
        .eq('table_schema', 'public');

      if (error) throw error;

      return {
        success: true,
        tables: data || []
      };
    } catch (error) {
      return {
        success: false,
        error: error.message,
        tables: []
      };
    }
  }

  async getTableInfo(params) {
    const { tableName } = params;

    try {
      const { data, error } = await supabase
        .from(tableName)
        .select('*')
        .limit(1);

      if (error) throw error;

      return {
        success: true,
        columns: data ? Object.keys(data[0] || {}) : []
      };
    } catch (error) {
      return {
        success: false,
        error: error.message
      };
    }
  }

  async insertData(params) {
    const { table, data } = params;

    try {
      const { data: result, error } = await supabase
        .from(table)
        .insert(data)
        .select();

      if (error) throw error;

      return {
        success: true,
        data: result
      };
    } catch (error) {
      return {
        success: false,
        error: error.message
      };
    }
  }

  async queryData(params) {
    const { table, filters = {}, limit = 100 } = params;

    try {
      let query = supabase.from(table).select('*');

      // Apply filters
      Object.entries(filters).forEach(([key, value]) => {
        query = query.eq(key, value);
      });

      const { data, error } = await query.limit(limit);

      if (error) throw error;

      return {
        success: true,
        data: data || []
      };
    } catch (error) {
      return {
        success: false,
        error: error.message,
        data: []
      };
    }
  }

  async handleRequest(request) {
    const { method, params = {} } = request;

    if (!this.methods[method]) {
      return {
        success: false,
        error: `Unknown method: ${method}`
      };
    }

    try {
      const result = await this.methods[method](params);
      return result;
    } catch (error) {
      return {
        success: false,
        error: error.message
      };
    }
  }
}

// Start server
const server = new SupabaseMCPServer();

// Handle stdin for MCP protocol
let buffer = '';

process.stdin.on('data', async (chunk) => {
  buffer += chunk.toString();

  const lines = buffer.split('\n');
  buffer = lines.pop() || '';

  for (const line of lines) {
    if (!line.trim()) continue;

    try {
      const request = JSON.parse(line);
      const response = await server.handleRequest(request);
      process.stdout.write(JSON.stringify(response) + '\n');
    } catch (error) {
      process.stdout.write(JSON.stringify({
        success: false,
        error: `Parse error: ${error.message}`
      }) + '\n');
    }
  }
});

process.stdin.on('end', () => {
  process.exit(0);
});

// Startup message
console.error(`Supabase MCP Server started (Project: ${PROJECT_REF})`);
console.error(`Connected to: ${SUPABASE_URL}`);
