'use client';

import { useState, useCallback } from 'react';
import type { WeekGenerationResult } from '@/lib/ai/shift-generation';

interface UseGenerateWeekOptions {
  onSuccess?: (result: WeekGenerationResult) => void;
  onError?: (error: string) => void;
}

interface UseGenerateWeekReturn {
  generate: (weekStart: string, weekEnd: string) => Promise<WeekGenerationResult | null>;
  isGenerating: boolean;
  result: WeekGenerationResult | null;
  error: string | null;
  reset: () => void;
}

/**
 * Hook per generare turni settimanali con l'algoritmo AI
 */
export function useGenerateWeek(options: UseGenerateWeekOptions = {}): UseGenerateWeekReturn {
  const [isGenerating, setIsGenerating] = useState(false);
  const [result, setResult] = useState<WeekGenerationResult | null>(null);
  const [error, setError] = useState<string | null>(null);

  const generate = useCallback(
    async (weekStart: string, weekEnd: string): Promise<WeekGenerationResult | null> => {
      setIsGenerating(true);
      setError(null);

      try {
        const response = await fetch('/api/ai/generate-week', {
          method: 'POST',
          headers: {
            'Content-Type': 'application/json',
          },
          body: JSON.stringify({ weekStart, weekEnd }),
        });

        if (!response.ok) {
          const errorData = await response.json();
          throw new Error(errorData.error || 'Errore durante la generazione');
        }

        const data: WeekGenerationResult = await response.json();
        setResult(data);
        options.onSuccess?.(data);
        return data;
      } catch (err) {
        const errorMessage = err instanceof Error ? err.message : 'Errore sconosciuto';
        setError(errorMessage);
        options.onError?.(errorMessage);
        return null;
      } finally {
        setIsGenerating(false);
      }
    },
    [options]
  );

  const reset = useCallback(() => {
    setResult(null);
    setError(null);
  }, []);

  return {
    generate,
    isGenerating,
    result,
    error,
    reset,
  };
}
