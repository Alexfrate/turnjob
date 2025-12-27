'use client';

import { useState } from 'react';
import { useTranslations } from 'next-intl';
import { Calendar, Settings, Check } from 'lucide-react';
import { Button } from '@/components/ui/button';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Badge } from '@/components/ui/badge';
import { cn } from '@/lib/utils';
import {
  useCriticitaContinuativeAttive,
} from '@/hooks/use-criticita-continuative';
import { CriticalitaSheet } from './CriticalitaSheet';

interface CriticalitaCompactCardProps {
  weekStart: string;
  weekEnd: string;
  excludedIds: string[];
  onExclusionsChange: (excludedIds: string[]) => void;
}

const CRITICITA_COLORS: Record<string, string> = {
  'SCARICO_MERCI': 'bg-amber-500',
  'ALTA_AFFLUENZA': 'bg-red-500',
  'PICCO_WEEKEND': 'bg-orange-500',
  'COPERTURA_MINIMA': 'bg-yellow-500',
  'ASSENZA_FERIE': 'bg-blue-500',
  'EVENTO_SPECIALE': 'bg-purple-500',
  'EVENTO_CRITICO': 'bg-red-600',
  'MANUTENZIONE': 'bg-gray-500',
  'FORMAZIONE': 'bg-green-500',
  'ALTRO': 'bg-slate-500',
};

export function CriticalitaCompactCard({
  weekStart,
  weekEnd,
  excludedIds,
  onExclusionsChange,
}: CriticalitaCompactCardProps) {
  const t = useTranslations();
  const [sheetOpen, setSheetOpen] = useState(false);

  const { data: continuative, isLoading } = useCriticitaContinuativeAttive();

  const totalCount = continuative?.length || 0;
  const activeCount = totalCount - excludedIds.length;
  const hasExclusions = excludedIds.length > 0;

  return (
    <>
      <Card className="flex-shrink-0">
        <CardHeader className="py-3 px-4">
          <div className="flex items-center justify-between">
            <CardTitle className="text-sm flex items-center gap-2">
              <Calendar className="h-4 w-4 text-primary" />
              {t('criticalities.title')}
              {totalCount > 0 && (
                <Badge
                  variant={hasExclusions ? "outline" : "secondary"}
                  className={cn(
                    "text-xs",
                    hasExclusions && "border-amber-500 text-amber-600"
                  )}
                >
                  {activeCount}/{totalCount}
                </Badge>
              )}
            </CardTitle>
            <Button
              variant="ghost"
              size="sm"
              className="h-7 px-2 text-xs"
              onClick={() => setSheetOpen(true)}
            >
              <Settings className="h-3.5 w-3.5 mr-1" />
              Gestisci
            </Button>
          </div>
        </CardHeader>
        <CardContent className="pt-0 pb-3 px-4">
          {isLoading ? (
            <div className="flex items-center gap-1">
              <div className="w-2 h-2 rounded-full bg-muted animate-pulse" />
              <div className="w-2 h-2 rounded-full bg-muted animate-pulse" />
              <div className="w-2 h-2 rounded-full bg-muted animate-pulse" />
            </div>
          ) : totalCount > 0 ? (
            <div className="space-y-1.5">
              {/* Preview dots - solo attive */}
              <div className="flex items-center gap-1.5">
                <div className="flex gap-1">
                  {continuative
                    ?.filter(c => !excludedIds.includes(c.id))
                    .slice(0, 6)
                    .map((c) => (
                      <div
                        key={c.id}
                        className={cn(
                          "w-2.5 h-2.5 rounded-full",
                          CRITICITA_COLORS[c.tipo] || 'bg-slate-500'
                        )}
                        title={c.nome}
                      />
                    ))}
                </div>
                {activeCount > 6 && (
                  <span className="text-xs text-muted-foreground">
                    +{activeCount - 6}
                  </span>
                )}
              </div>
              {/* Status message */}
              <div className="flex items-center gap-1 text-[10px]">
                <Check className="h-3 w-3 text-green-600" />
                <span className="text-muted-foreground">
                  {activeCount} nel contesto AI
                  {hasExclusions && ` (${excludedIds.length} escluse)`}
                </span>
              </div>
            </div>
          ) : (
            <p className="text-xs text-muted-foreground">
              Nessuna criticità configurata
            </p>
          )}
        </CardContent>
      </Card>

      <CriticalitaSheet
        open={sheetOpen}
        onOpenChange={setSheetOpen}
        weekStart={weekStart}
        weekEnd={weekEnd}
        excludedIds={excludedIds}
        onExclusionsChange={onExclusionsChange}
      />
    </>
  );
}
