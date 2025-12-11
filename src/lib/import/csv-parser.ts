import * as XLSX from 'xlsx';

export interface ParsedCollaboratore {
  nome: string;
  cognome: string;
  email: string;
  telefono?: string;
  codice_fiscale?: string;
  tipo_contratto?: 'full_time' | 'part_time' | 'altro';
  ore_settimanali?: number;
  data_assunzione?: string;
  iban?: string;
  indirizzo?: string;
  note?: string;
  // Per tracking errori/warning
  _rowIndex?: number;
  _errors?: string[];
  _warnings?: string[];
}

export interface ParseResult {
  success: boolean;
  data: ParsedCollaboratore[];
  errors: string[];
  warnings: string[];
}

// Mapping colonne comuni (case-insensitive)
const COLUMN_MAPPINGS: Record<string, keyof ParsedCollaboratore> = {
  // Nome
  'nome': 'nome',
  'first_name': 'nome',
  'firstname': 'nome',
  'name': 'nome',
  // Cognome
  'cognome': 'cognome',
  'last_name': 'cognome',
  'lastname': 'cognome',
  'surname': 'cognome',
  // Email
  'email': 'email',
  'e-mail': 'email',
  'mail': 'email',
  'posta elettronica': 'email',
  // Telefono
  'telefono': 'telefono',
  'phone': 'telefono',
  'tel': 'telefono',
  'cellulare': 'telefono',
  'mobile': 'telefono',
  // Codice Fiscale
  'codice_fiscale': 'codice_fiscale',
  'codice fiscale': 'codice_fiscale',
  'cf': 'codice_fiscale',
  'fiscal_code': 'codice_fiscale',
  // Tipo contratto
  'tipo_contratto': 'tipo_contratto',
  'tipo contratto': 'tipo_contratto',
  'contratto': 'tipo_contratto',
  'contract_type': 'tipo_contratto',
  // Ore
  'ore_settimanali': 'ore_settimanali',
  'ore settimanali': 'ore_settimanali',
  'ore': 'ore_settimanali',
  'hours': 'ore_settimanali',
  'weekly_hours': 'ore_settimanali',
  // Data assunzione
  'data_assunzione': 'data_assunzione',
  'data assunzione': 'data_assunzione',
  'assunzione': 'data_assunzione',
  'hire_date': 'data_assunzione',
  // IBAN
  'iban': 'iban',
  'conto': 'iban',
  'bank_account': 'iban',
  // Indirizzo
  'indirizzo': 'indirizzo',
  'address': 'indirizzo',
  'via': 'indirizzo',
  // Note
  'note': 'note',
  'notes': 'note',
  'commenti': 'note',
};

function normalizeColumnName(name: string): string {
  return name.toLowerCase().trim().replace(/\s+/g, ' ');
}

function mapColumnToField(columnName: string): keyof ParsedCollaboratore | null {
  const normalized = normalizeColumnName(columnName);
  return COLUMN_MAPPINGS[normalized] || null;
}

function parseContractType(value: string): 'full_time' | 'part_time' | 'altro' {
  const normalized = value.toLowerCase().trim();
  if (normalized.includes('full') || normalized.includes('tempo pieno') || normalized === 'ft') {
    return 'full_time';
  }
  if (normalized.includes('part') || normalized.includes('tempo parziale') || normalized === 'pt') {
    return 'part_time';
  }
  return 'altro';
}

function validateEmail(email: string): boolean {
  return /^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(email);
}

function validateCodiceFiscale(cf: string): boolean {
  // Basic validation: 16 alphanumeric characters
  return /^[A-Z0-9]{16}$/i.test(cf);
}

export async function parseCSV(file: File): Promise<ParseResult> {
  return new Promise((resolve) => {
    const reader = new FileReader();

    reader.onload = (e) => {
      try {
        const text = e.target?.result as string;
        const lines = text.split(/\r?\n/).filter(line => line.trim());

        if (lines.length < 2) {
          resolve({
            success: false,
            data: [],
            errors: ['Il file CSV deve contenere almeno una riga di intestazione e una riga di dati'],
            warnings: [],
          });
          return;
        }

        // Parse header
        const headerLine = lines[0];
        const separator = headerLine.includes(';') ? ';' : ',';
        const headers = headerLine.split(separator).map(h => h.trim().replace(/^"|"$/g, ''));

        // Map columns
        const columnMap: Record<number, keyof ParsedCollaboratore | null> = {};
        headers.forEach((header, index) => {
          columnMap[index] = mapColumnToField(header);
        });

        // Check required columns
        const mappedFields = Object.values(columnMap).filter(Boolean);
        const hasNome = mappedFields.includes('nome');
        const hasCognome = mappedFields.includes('cognome');
        const hasEmail = mappedFields.includes('email');

        const errors: string[] = [];
        const warnings: string[] = [];

        if (!hasNome) errors.push('Colonna "nome" non trovata');
        if (!hasCognome) errors.push('Colonna "cognome" non trovata');
        if (!hasEmail) errors.push('Colonna "email" non trovata');

        if (errors.length > 0) {
          resolve({ success: false, data: [], errors, warnings });
          return;
        }

        // Parse data rows
        const data: ParsedCollaboratore[] = [];

        for (let i = 1; i < lines.length; i++) {
          const line = lines[i];
          if (!line.trim()) continue;

          const values = line.split(separator).map(v => v.trim().replace(/^"|"$/g, ''));
          const row: Partial<ParsedCollaboratore> = {
            _rowIndex: i + 1,
            _errors: [],
            _warnings: [],
          };

          values.forEach((value, index) => {
            const field = columnMap[index];
            if (!field || !value) return;

            switch (field) {
              case 'tipo_contratto':
                row.tipo_contratto = parseContractType(value);
                break;
              case 'ore_settimanali':
                const hours = parseInt(value);
                if (!isNaN(hours) && hours > 0 && hours <= 60) {
                  row.ore_settimanali = hours;
                }
                break;
              case 'email':
                if (validateEmail(value)) {
                  row.email = value.toLowerCase();
                } else {
                  row._errors?.push(`Email non valida: ${value}`);
                }
                break;
              case 'codice_fiscale':
                const cfUpper = value.toUpperCase();
                if (validateCodiceFiscale(cfUpper)) {
                  row.codice_fiscale = cfUpper;
                } else {
                  row._warnings?.push(`Codice fiscale potenzialmente non valido: ${value}`);
                  row.codice_fiscale = cfUpper;
                }
                break;
              default:
                (row as Record<string, unknown>)[field] = value;
            }
          });

          // Validate required fields
          if (!row.nome) row._errors?.push('Nome mancante');
          if (!row.cognome) row._errors?.push('Cognome mancante');
          if (!row.email) row._errors?.push('Email mancante');

          data.push(row as ParsedCollaboratore);
        }

        // Collect all errors/warnings
        data.forEach(row => {
          if (row._errors?.length) {
            errors.push(`Riga ${row._rowIndex}: ${row._errors.join(', ')}`);
          }
          if (row._warnings?.length) {
            warnings.push(`Riga ${row._rowIndex}: ${row._warnings.join(', ')}`);
          }
        });

        // Filter out rows with critical errors (missing required fields)
        const validData = data.filter(row =>
          row.nome && row.cognome && row.email && row._errors?.length === 0
        );

        resolve({
          success: validData.length > 0,
          data: validData,
          errors,
          warnings,
        });

      } catch (error) {
        resolve({
          success: false,
          data: [],
          errors: [`Errore parsing CSV: ${error instanceof Error ? error.message : 'Errore sconosciuto'}`],
          warnings: [],
        });
      }
    };

    reader.readAsText(file);
  });
}

export async function parseExcel(file: File): Promise<ParseResult> {
  return new Promise((resolve) => {
    const reader = new FileReader();

    reader.onload = (e) => {
      try {
        const data = new Uint8Array(e.target?.result as ArrayBuffer);
        const workbook = XLSX.read(data, { type: 'array' });

        // Get first sheet
        const sheetName = workbook.SheetNames[0];
        const sheet = workbook.Sheets[sheetName];

        // Convert to JSON (header: 1 returns array of arrays)
        const jsonData = XLSX.utils.sheet_to_json<unknown[]>(sheet, { header: 1 });

        if (jsonData.length < 2) {
          resolve({
            success: false,
            data: [],
            errors: ['Il file Excel deve contenere almeno una riga di intestazione e una riga di dati'],
            warnings: [],
          });
          return;
        }

        // Parse header
        const headers = (jsonData[0] as unknown[]).map(h => String(h || '').trim());

        // Map columns
        const columnMap: Record<number, keyof ParsedCollaboratore | null> = {};
        headers.forEach((header, index) => {
          columnMap[index] = mapColumnToField(header);
        });

        // Check required columns
        const mappedFields = Object.values(columnMap).filter(Boolean);
        const hasNome = mappedFields.includes('nome');
        const hasCognome = mappedFields.includes('cognome');
        const hasEmail = mappedFields.includes('email');

        const errors: string[] = [];
        const warnings: string[] = [];

        if (!hasNome) errors.push('Colonna "nome" non trovata');
        if (!hasCognome) errors.push('Colonna "cognome" non trovata');
        if (!hasEmail) errors.push('Colonna "email" non trovata');

        if (errors.length > 0) {
          resolve({ success: false, data: [], errors, warnings });
          return;
        }

        // Parse data rows
        const parsedData: ParsedCollaboratore[] = [];

        for (let i = 1; i < jsonData.length; i++) {
          const rowData = jsonData[i] as unknown[];
          if (!rowData || rowData.every(cell => !cell)) continue;

          const row: Partial<ParsedCollaboratore> = {
            _rowIndex: i + 1,
            _errors: [],
            _warnings: [],
          };

          rowData.forEach((value, index) => {
            const field = columnMap[index];
            if (!field || value === null || value === undefined) return;

            const strValue = String(value).trim();
            if (!strValue) return;

            switch (field) {
              case 'tipo_contratto':
                row.tipo_contratto = parseContractType(strValue);
                break;
              case 'ore_settimanali':
                const hours = parseInt(strValue);
                if (!isNaN(hours) && hours > 0 && hours <= 60) {
                  row.ore_settimanali = hours;
                }
                break;
              case 'email':
                if (validateEmail(strValue)) {
                  row.email = strValue.toLowerCase();
                } else {
                  row._errors?.push(`Email non valida: ${strValue}`);
                }
                break;
              case 'codice_fiscale':
                const cfUpper = strValue.toUpperCase();
                if (validateCodiceFiscale(cfUpper)) {
                  row.codice_fiscale = cfUpper;
                } else {
                  row._warnings?.push(`Codice fiscale potenzialmente non valido: ${strValue}`);
                  row.codice_fiscale = cfUpper;
                }
                break;
              default:
                (row as Record<string, unknown>)[field] = strValue;
            }
          });

          // Validate required fields
          if (!row.nome) row._errors?.push('Nome mancante');
          if (!row.cognome) row._errors?.push('Cognome mancante');
          if (!row.email) row._errors?.push('Email mancante');

          parsedData.push(row as ParsedCollaboratore);
        }

        // Collect all errors/warnings
        parsedData.forEach(row => {
          if (row._errors?.length) {
            errors.push(`Riga ${row._rowIndex}: ${row._errors.join(', ')}`);
          }
          if (row._warnings?.length) {
            warnings.push(`Riga ${row._rowIndex}: ${row._warnings.join(', ')}`);
          }
        });

        // Filter out rows with critical errors
        const validData = parsedData.filter(row =>
          row.nome && row.cognome && row.email && row._errors?.length === 0
        );

        resolve({
          success: validData.length > 0,
          data: validData,
          errors,
          warnings,
        });

      } catch (error) {
        resolve({
          success: false,
          data: [],
          errors: [`Errore parsing Excel: ${error instanceof Error ? error.message : 'Errore sconosciuto'}`],
          warnings: [],
        });
      }
    };

    reader.readAsArrayBuffer(file);
  });
}

export async function parseFile(file: File, fileType: 'csv' | 'xlsx' | 'pdf'): Promise<ParseResult> {
  switch (fileType) {
    case 'csv':
      return parseCSV(file);
    case 'xlsx':
      return parseExcel(file);
    case 'pdf':
      // PDF parsing will be handled by AI extraction
      return {
        success: false,
        data: [],
        errors: ['I file PDF richiedono estrazione AI'],
        warnings: [],
      };
    default:
      return {
        success: false,
        data: [],
        errors: ['Tipo file non supportato'],
        warnings: [],
      };
  }
}
