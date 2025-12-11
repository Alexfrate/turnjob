'use client';

import { useState, useCallback } from 'react';
import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogFooter,
  DialogHeader,
  DialogTitle,
} from '@/components/ui/dialog';
import { Button } from '@/components/ui/button';
import { FileDropzone, type UploadedFile } from './FileDropzone';
import { ImportPreview } from './ImportPreview';
import { parseCSV, parseExcel, type ParsedCollaboratore, type ParseResult } from '@/lib/import/csv-parser';
import { extractFromPDF } from '@/lib/import/pdf-extractor';
import { Loader2, Upload, CheckCircle, AlertCircle, ArrowLeft, ArrowRight } from 'lucide-react';
import { cn } from '@/lib/utils';

interface ImportDialogProps {
  open: boolean;
  onOpenChange: (open: boolean) => void;
  onImportComplete: (count: number) => void;
}

type ImportStep = 'upload' | 'preview' | 'importing' | 'complete';

export function ImportDialog({ open, onOpenChange, onImportComplete }: ImportDialogProps) {
  const [step, setStep] = useState<ImportStep>('upload');
  const [files, setFiles] = useState<UploadedFile[]>([]);
  const [parsedData, setParsedData] = useState<ParsedCollaboratore[]>([]);
  const [errors, setErrors] = useState<string[]>([]);
  const [warnings, setWarnings] = useState<string[]>([]);
  const [isProcessing, setIsProcessing] = useState(false);
  const [importResult, setImportResult] = useState<{ success: number; failed: number }>({
    success: 0,
    failed: 0,
  });

  const resetState = () => {
    setStep('upload');
    setFiles([]);
    setParsedData([]);
    setErrors([]);
    setWarnings([]);
    setIsProcessing(false);
    setImportResult({ success: 0, failed: 0 });
  };

  const handleClose = () => {
    resetState();
    onOpenChange(false);
  };

  const handleFilesAccepted = useCallback((acceptedFiles: UploadedFile[]) => {
    setFiles(acceptedFiles);
    setErrors([]);
    setWarnings([]);
  }, []);

  const processFiles = async () => {
    setIsProcessing(true);
    const allData: ParsedCollaboratore[] = [];
    const allErrors: string[] = [];
    const allWarnings: string[] = [];

    for (const uploadedFile of files) {
      let result: ParseResult;

      try {
        switch (uploadedFile.type) {
          case 'csv':
            result = await parseCSV(uploadedFile.file);
            break;
          case 'xlsx':
            result = await parseExcel(uploadedFile.file);
            break;
          case 'pdf':
            result = await extractFromPDF(uploadedFile.file);
            break;
          default:
            result = {
              success: false,
              data: [],
              errors: [`Tipo file non supportato: ${uploadedFile.file.name}`],
              warnings: [],
            };
        }

        if (result.data.length > 0) {
          allData.push(...result.data);
        }
        if (result.errors.length > 0) {
          allErrors.push(...result.errors.map((e) => `${uploadedFile.file.name}: ${e}`));
        }
        if (result.warnings.length > 0) {
          allWarnings.push(...result.warnings.map((w) => `${uploadedFile.file.name}: ${w}`));
        }
      } catch (error) {
        allErrors.push(
          `${uploadedFile.file.name}: ${error instanceof Error ? error.message : 'Errore sconosciuto'}`
        );
      }
    }

    setParsedData(allData);
    setErrors(allErrors);
    setWarnings(allWarnings);
    setIsProcessing(false);

    if (allData.length > 0) {
      setStep('preview');
    }
  };

  const handleImport = async () => {
    setStep('importing');

    // Filter valid data
    const validData = parsedData.filter((row) => row.nome && row.cognome && row.email);

    if (validData.length === 0) {
      setErrors(['Nessun collaboratore valido da importare']);
      setStep('preview');
      return;
    }

    try {
      const response = await fetch('/api/collaboratori/import', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ collaboratori: validData }),
      });

      const result = await response.json();

      if (!response.ok) {
        throw new Error(result.error || 'Errore durante l\'importazione');
      }

      setImportResult({
        success: result.created || 0,
        failed: result.failed || 0,
      });
      setStep('complete');

      if (result.created > 0) {
        onImportComplete(result.created);
      }
    } catch (error) {
      setErrors([error instanceof Error ? error.message : 'Errore durante l\'importazione']);
      setStep('preview');
    }
  };

  const getValidCount = () => {
    return parsedData.filter((row) => row.nome && row.cognome && row.email).length;
  };

  return (
    <Dialog open={open} onOpenChange={handleClose}>
      <DialogContent className="max-w-4xl max-h-[90vh] overflow-hidden flex flex-col">
        <DialogHeader>
          <DialogTitle className="flex items-center gap-2">
            <Upload className="h-5 w-5" />
            Importa Collaboratori
          </DialogTitle>
          <DialogDescription>
            {step === 'upload' && 'Carica file CSV, Excel o PDF per importare collaboratori in blocco'}
            {step === 'preview' && 'Verifica e modifica i dati prima dell\'importazione'}
            {step === 'importing' && 'Importazione in corso...'}
            {step === 'complete' && 'Importazione completata'}
          </DialogDescription>
        </DialogHeader>

        {/* Steps indicator */}
        <div className="flex items-center gap-2 py-2">
          {['upload', 'preview', 'complete'].map((s, i) => (
            <div key={s} className="flex items-center">
              <div
                className={cn(
                  'w-8 h-8 rounded-full flex items-center justify-center text-sm font-medium',
                  step === s || (s === 'complete' && step === 'importing')
                    ? 'bg-primary text-primary-foreground'
                    : i < ['upload', 'preview', 'complete'].indexOf(step)
                    ? 'bg-green-600 text-white'
                    : 'bg-muted text-muted-foreground'
                )}
              >
                {i < ['upload', 'preview', 'complete'].indexOf(step) ? (
                  <CheckCircle className="h-4 w-4" />
                ) : (
                  i + 1
                )}
              </div>
              {i < 2 && (
                <div
                  className={cn(
                    'w-12 h-0.5 mx-2',
                    i < ['upload', 'preview', 'complete'].indexOf(step)
                      ? 'bg-green-600'
                      : 'bg-muted'
                  )}
                />
              )}
            </div>
          ))}
        </div>

        {/* Content */}
        <div className="flex-1 overflow-auto py-4">
          {step === 'upload' && (
            <div className="space-y-4">
              <FileDropzone onFilesAccepted={handleFilesAccepted} maxFiles={5} disabled={isProcessing} />

              {errors.length > 0 && (
                <div className="bg-destructive/10 border border-destructive/50 rounded-lg p-3">
                  <div className="flex items-center gap-2 text-destructive text-sm font-medium mb-1">
                    <AlertCircle className="h-4 w-4" />
                    Errori
                  </div>
                  <ul className="text-xs text-destructive space-y-1">
                    {errors.map((e, i) => (
                      <li key={i}>• {e}</li>
                    ))}
                  </ul>
                </div>
              )}
            </div>
          )}

          {step === 'preview' && (
            <ImportPreview
              data={parsedData}
              onDataChange={setParsedData}
              errors={errors}
              warnings={warnings}
            />
          )}

          {step === 'importing' && (
            <div className="flex flex-col items-center justify-center py-12">
              <Loader2 className="h-12 w-12 animate-spin text-primary mb-4" />
              <p className="text-lg font-medium">Importazione in corso...</p>
              <p className="text-sm text-muted-foreground">
                Creazione di {getValidCount()} collaboratori
              </p>
            </div>
          )}

          {step === 'complete' && (
            <div className="flex flex-col items-center justify-center py-12">
              <CheckCircle className="h-12 w-12 text-green-600 mb-4" />
              <p className="text-lg font-medium">Importazione completata!</p>
              <div className="flex items-center gap-4 mt-4">
                <div className="text-center">
                  <p className="text-3xl font-bold text-green-600">{importResult.success}</p>
                  <p className="text-sm text-muted-foreground">Creati</p>
                </div>
                {importResult.failed > 0 && (
                  <div className="text-center">
                    <p className="text-3xl font-bold text-destructive">{importResult.failed}</p>
                    <p className="text-sm text-muted-foreground">Falliti</p>
                  </div>
                )}
              </div>
            </div>
          )}
        </div>

        {/* Footer */}
        <DialogFooter className="flex-shrink-0">
          {step === 'upload' && (
            <>
              <Button variant="outline" onClick={handleClose}>
                Annulla
              </Button>
              <Button
                onClick={processFiles}
                disabled={files.length === 0 || isProcessing}
              >
                {isProcessing ? (
                  <>
                    <Loader2 className="h-4 w-4 mr-2 animate-spin" />
                    Elaborazione...
                  </>
                ) : (
                  <>
                    Elabora file
                    <ArrowRight className="h-4 w-4 ml-2" />
                  </>
                )}
              </Button>
            </>
          )}

          {step === 'preview' && (
            <>
              <Button variant="outline" onClick={() => setStep('upload')}>
                <ArrowLeft className="h-4 w-4 mr-2" />
                Indietro
              </Button>
              <Button onClick={handleImport} disabled={getValidCount() === 0}>
                Importa {getValidCount()} collaboratori
                <ArrowRight className="h-4 w-4 ml-2" />
              </Button>
            </>
          )}

          {step === 'complete' && (
            <Button onClick={handleClose}>Chiudi</Button>
          )}
        </DialogFooter>
      </DialogContent>
    </Dialog>
  );
}
