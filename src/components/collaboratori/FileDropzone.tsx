'use client';

import { useCallback, useState } from 'react';
import { useDropzone } from 'react-dropzone';
import { Upload, File, X, FileSpreadsheet, FileText } from 'lucide-react';
import { cn } from '@/lib/utils';
import { Button } from '@/components/ui/button';

export interface UploadedFile {
  file: File;
  preview?: string;
  type: 'csv' | 'xlsx' | 'pdf';
}

interface FileDropzoneProps {
  onFilesAccepted: (files: UploadedFile[]) => void;
  maxFiles?: number;
  disabled?: boolean;
}

const ACCEPTED_TYPES = {
  'text/csv': ['.csv'],
  'application/vnd.openxmlformats-officedocument.spreadsheetml.sheet': ['.xlsx'],
  'application/vnd.ms-excel': ['.xls'],
  'application/pdf': ['.pdf'],
};

export function FileDropzone({ onFilesAccepted, maxFiles = 5, disabled = false }: FileDropzoneProps) {
  const [files, setFiles] = useState<UploadedFile[]>([]);

  const getFileType = (file: File): 'csv' | 'xlsx' | 'pdf' => {
    if (file.type === 'text/csv' || file.name.endsWith('.csv')) return 'csv';
    if (file.type === 'application/pdf' || file.name.endsWith('.pdf')) return 'pdf';
    return 'xlsx';
  };

  const onDrop = useCallback((acceptedFiles: File[]) => {
    const newFiles: UploadedFile[] = acceptedFiles.map(file => ({
      file,
      type: getFileType(file),
    }));

    const updatedFiles = [...files, ...newFiles].slice(0, maxFiles);
    setFiles(updatedFiles);
    onFilesAccepted(updatedFiles);
  }, [files, maxFiles, onFilesAccepted]);

  const removeFile = (index: number) => {
    const updatedFiles = files.filter((_, i) => i !== index);
    setFiles(updatedFiles);
    onFilesAccepted(updatedFiles);
  };

  const { getRootProps, getInputProps, isDragActive } = useDropzone({
    onDrop,
    accept: ACCEPTED_TYPES,
    maxFiles: maxFiles - files.length,
    disabled: disabled || files.length >= maxFiles,
  });

  const getFileIcon = (type: 'csv' | 'xlsx' | 'pdf') => {
    switch (type) {
      case 'csv':
      case 'xlsx':
        return <FileSpreadsheet className="h-5 w-5 text-green-600" />;
      case 'pdf':
        return <FileText className="h-5 w-5 text-red-600" />;
      default:
        return <File className="h-5 w-5" />;
    }
  };

  const formatFileSize = (bytes: number) => {
    if (bytes < 1024) return `${bytes} B`;
    if (bytes < 1024 * 1024) return `${(bytes / 1024).toFixed(1)} KB`;
    return `${(bytes / (1024 * 1024)).toFixed(1)} MB`;
  };

  return (
    <div className="space-y-4">
      <div
        {...getRootProps()}
        className={cn(
          'border-2 border-dashed rounded-lg p-8 text-center cursor-pointer transition-colors',
          isDragActive && 'border-primary bg-primary/5',
          disabled && 'opacity-50 cursor-not-allowed',
          !isDragActive && !disabled && 'border-muted-foreground/25 hover:border-primary/50'
        )}
      >
        <input {...getInputProps()} />
        <Upload className="h-10 w-10 mx-auto text-muted-foreground mb-4" />
        {isDragActive ? (
          <p className="text-primary font-medium">Rilascia i file qui...</p>
        ) : (
          <>
            <p className="text-sm font-medium">
              Trascina qui i file o clicca per caricare
            </p>
            <p className="text-xs text-muted-foreground mt-2">
              CSV, Excel (.xlsx), PDF (buste paga)
            </p>
            <p className="text-xs text-muted-foreground">
              Max {maxFiles} file
            </p>
          </>
        )}
      </div>

      {/* Lista file caricati */}
      {files.length > 0 && (
        <div className="space-y-2">
          <p className="text-sm font-medium">File caricati ({files.length}/{maxFiles})</p>
          <div className="space-y-2">
            {files.map((uploadedFile, index) => (
              <div
                key={index}
                className="flex items-center justify-between p-3 bg-muted rounded-lg"
              >
                <div className="flex items-center gap-3">
                  {getFileIcon(uploadedFile.type)}
                  <div>
                    <p className="text-sm font-medium truncate max-w-[200px]">
                      {uploadedFile.file.name}
                    </p>
                    <p className="text-xs text-muted-foreground">
                      {formatFileSize(uploadedFile.file.size)} • {uploadedFile.type.toUpperCase()}
                    </p>
                  </div>
                </div>
                <Button
                  variant="ghost"
                  size="icon"
                  onClick={() => removeFile(index)}
                  disabled={disabled}
                >
                  <X className="h-4 w-4" />
                </Button>
              </div>
            ))}
          </div>
        </div>
      )}
    </div>
  );
}
