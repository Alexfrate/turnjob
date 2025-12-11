'use client';

import { useState } from 'react';
import {
  Table,
  TableBody,
  TableCell,
  TableHead,
  TableHeader,
  TableRow,
} from '@/components/ui/table';
import { Input } from '@/components/ui/input';
import { Button } from '@/components/ui/button';
import { Badge } from '@/components/ui/badge';
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from '@/components/ui/select';
import { Checkbox } from '@/components/ui/checkbox';
import { Trash2, AlertCircle, CheckCircle } from 'lucide-react';
import type { ParsedCollaboratore } from '@/lib/import/csv-parser';

interface ImportPreviewProps {
  data: ParsedCollaboratore[];
  onDataChange: (data: ParsedCollaboratore[]) => void;
  errors: string[];
  warnings: string[];
}

export function ImportPreview({ data, onDataChange, errors, warnings }: ImportPreviewProps) {
  const [selectedRows, setSelectedRows] = useState<Set<number>>(
    new Set(data.map((_, i) => i))
  );

  const toggleRow = (index: number) => {
    const newSelected = new Set(selectedRows);
    if (newSelected.has(index)) {
      newSelected.delete(index);
    } else {
      newSelected.add(index);
    }
    setSelectedRows(newSelected);
  };

  const toggleAll = () => {
    if (selectedRows.size === data.length) {
      setSelectedRows(new Set());
    } else {
      setSelectedRows(new Set(data.map((_, i) => i)));
    }
  };

  const updateField = (
    index: number,
    field: keyof ParsedCollaboratore,
    value: string | number
  ) => {
    const newData = [...data];
    newData[index] = { ...newData[index], [field]: value };
    onDataChange(newData);
  };

  const removeRow = (index: number) => {
    const newData = data.filter((_, i) => i !== index);
    onDataChange(newData);
    const newSelected = new Set<number>();
    selectedRows.forEach((i) => {
      if (i < index) newSelected.add(i);
      else if (i > index) newSelected.add(i - 1);
    });
    setSelectedRows(newSelected);
  };

  const getSelectedData = () => {
    return data.filter((_, i) => selectedRows.has(i));
  };

  const hasRowError = (row: ParsedCollaboratore) => {
    return !row.nome || !row.cognome || !row.email;
  };

  return (
    <div className="space-y-4">
      {/* Summary */}
      <div className="flex items-center justify-between">
        <div className="flex items-center gap-4">
          <Badge variant="outline" className="text-sm">
            {data.length} collaboratori trovati
          </Badge>
          <Badge variant="secondary" className="text-sm">
            {selectedRows.size} selezionati
          </Badge>
        </div>
        {errors.length > 0 && (
          <Badge variant="destructive" className="text-sm">
            <AlertCircle className="h-3 w-3 mr-1" />
            {errors.length} errori
          </Badge>
        )}
        {warnings.length > 0 && (
          <Badge variant="outline" className="text-sm text-yellow-600 border-yellow-600">
            {warnings.length} avvisi
          </Badge>
        )}
      </div>

      {/* Errors */}
      {errors.length > 0 && (
        <div className="bg-destructive/10 border border-destructive/50 rounded-lg p-3">
          <p className="text-sm font-medium text-destructive mb-2">Errori:</p>
          <ul className="text-xs text-destructive space-y-1">
            {errors.slice(0, 5).map((error, i) => (
              <li key={i}>• {error}</li>
            ))}
            {errors.length > 5 && (
              <li className="text-muted-foreground">...e altri {errors.length - 5} errori</li>
            )}
          </ul>
        </div>
      )}

      {/* Warnings */}
      {warnings.length > 0 && (
        <div className="bg-yellow-500/10 border border-yellow-500/50 rounded-lg p-3">
          <p className="text-sm font-medium text-yellow-600 mb-2">Avvisi:</p>
          <ul className="text-xs text-yellow-600 space-y-1">
            {warnings.slice(0, 3).map((warning, i) => (
              <li key={i}>• {warning}</li>
            ))}
            {warnings.length > 3 && (
              <li className="text-muted-foreground">...e altri {warnings.length - 3} avvisi</li>
            )}
          </ul>
        </div>
      )}

      {/* Table */}
      <div className="border rounded-lg overflow-hidden">
        <div className="max-h-[400px] overflow-auto">
          <Table>
            <TableHeader className="sticky top-0 bg-muted/95 backdrop-blur">
              <TableRow>
                <TableHead className="w-10">
                  <Checkbox
                    checked={selectedRows.size === data.length}
                    onCheckedChange={toggleAll}
                  />
                </TableHead>
                <TableHead className="w-10">#</TableHead>
                <TableHead>Nome *</TableHead>
                <TableHead>Cognome *</TableHead>
                <TableHead>Email *</TableHead>
                <TableHead>Telefono</TableHead>
                <TableHead>Codice Fiscale</TableHead>
                <TableHead>Contratto</TableHead>
                <TableHead>Ore/Sett</TableHead>
                <TableHead className="w-10"></TableHead>
              </TableRow>
            </TableHeader>
            <TableBody>
              {data.map((row, index) => (
                <TableRow
                  key={index}
                  className={hasRowError(row) ? 'bg-destructive/5' : ''}
                >
                  <TableCell>
                    <Checkbox
                      checked={selectedRows.has(index)}
                      onCheckedChange={() => toggleRow(index)}
                    />
                  </TableCell>
                  <TableCell className="text-muted-foreground text-xs">
                    {index + 1}
                  </TableCell>
                  <TableCell>
                    <Input
                      value={row.nome || ''}
                      onChange={(e) => updateField(index, 'nome', e.target.value)}
                      className={`h-8 text-sm ${!row.nome ? 'border-destructive' : ''}`}
                      placeholder="Nome"
                    />
                  </TableCell>
                  <TableCell>
                    <Input
                      value={row.cognome || ''}
                      onChange={(e) => updateField(index, 'cognome', e.target.value)}
                      className={`h-8 text-sm ${!row.cognome ? 'border-destructive' : ''}`}
                      placeholder="Cognome"
                    />
                  </TableCell>
                  <TableCell>
                    <Input
                      value={row.email || ''}
                      onChange={(e) => updateField(index, 'email', e.target.value)}
                      className={`h-8 text-sm ${!row.email ? 'border-destructive' : ''}`}
                      placeholder="email@esempio.com"
                      type="email"
                    />
                  </TableCell>
                  <TableCell>
                    <Input
                      value={row.telefono || ''}
                      onChange={(e) => updateField(index, 'telefono', e.target.value)}
                      className="h-8 text-sm"
                      placeholder="+39..."
                    />
                  </TableCell>
                  <TableCell>
                    <Input
                      value={row.codice_fiscale || ''}
                      onChange={(e) =>
                        updateField(index, 'codice_fiscale', e.target.value.toUpperCase())
                      }
                      className="h-8 text-sm font-mono"
                      placeholder="RSSMRA80A01H501Z"
                      maxLength={16}
                    />
                  </TableCell>
                  <TableCell>
                    <Select
                      value={row.tipo_contratto || 'altro'}
                      onValueChange={(v) =>
                        updateField(index, 'tipo_contratto', v as 'full_time' | 'part_time' | 'altro')
                      }
                    >
                      <SelectTrigger className="h-8 text-sm w-[100px]">
                        <SelectValue />
                      </SelectTrigger>
                      <SelectContent>
                        <SelectItem value="full_time">Full-time</SelectItem>
                        <SelectItem value="part_time">Part-time</SelectItem>
                        <SelectItem value="altro">Altro</SelectItem>
                      </SelectContent>
                    </Select>
                  </TableCell>
                  <TableCell>
                    <Input
                      value={row.ore_settimanali || ''}
                      onChange={(e) =>
                        updateField(index, 'ore_settimanali', parseInt(e.target.value) || 0)
                      }
                      className="h-8 text-sm w-16"
                      type="number"
                      min={1}
                      max={60}
                    />
                  </TableCell>
                  <TableCell>
                    <Button
                      variant="ghost"
                      size="icon"
                      onClick={() => removeRow(index)}
                      className="h-8 w-8 text-muted-foreground hover:text-destructive"
                    >
                      <Trash2 className="h-4 w-4" />
                    </Button>
                  </TableCell>
                </TableRow>
              ))}
            </TableBody>
          </Table>
        </div>
      </div>

      {/* Valid count */}
      <div className="flex items-center gap-2 text-sm">
        <CheckCircle className="h-4 w-4 text-green-600" />
        <span>
          {getSelectedData().filter((r) => !hasRowError(r)).length} collaboratori pronti per
          l'importazione
        </span>
      </div>
    </div>
  );
}

// Export utility to get selected valid data
export function getValidSelectedData(
  data: ParsedCollaboratore[],
  selectedIndices: Set<number>
): ParsedCollaboratore[] {
  return data.filter(
    (row, i) => selectedIndices.has(i) && row.nome && row.cognome && row.email
  );
}
