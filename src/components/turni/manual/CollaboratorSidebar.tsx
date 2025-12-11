'use client';

import { useState, useMemo } from 'react';
import { useTranslations } from 'next-intl';
import { Search, Users, Filter, ChevronDown, ChevronRight } from 'lucide-react';
import { Input } from '@/components/ui/input';
import { Button } from '@/components/ui/button';
import { ScrollArea } from '@/components/ui/scroll-area';
import { Badge } from '@/components/ui/badge';
import {
  Collapsible,
  CollapsibleContent,
  CollapsibleTrigger,
} from '@/components/ui/collapsible';
import { CollaboratorDragItemCompact } from './CollaboratorDragItem';
import { useCollaboratori, type CollaboratoreConNuclei } from '@/hooks/use-collaboratori';
import { useNuclei } from '@/hooks/use-nuclei';
import { cn } from '@/lib/utils';
import type { Turno } from '@/hooks/use-turni';

interface CollaboratorSidebarProps {
  turni: Turno[];
  selectedDate?: string;
  selectedTimeSlot?: string;
  onValidateAssignment?: (collaboratoreId: string, date: string, timeSlot: string) => {
    valid: boolean;
    message?: string;
  };
}

export function CollaboratorSidebar({
  turni,
  selectedDate,
  selectedTimeSlot,
  onValidateAssignment,
}: CollaboratorSidebarProps) {
  const t = useTranslations();
  const [searchQuery, setSearchQuery] = useState('');
  const [showOnlyAvailable, setShowOnlyAvailable] = useState(false);
  const [expandedNuclei, setExpandedNuclei] = useState<string[]>([]);

  const { collaboratoriAttivi, isLoading } = useCollaboratori();
  const { nuclei } = useNuclei();

  // Get assigned collaborator IDs for current date/slot
  const assignedCollaboratoriIds = useMemo(() => {
    if (!selectedDate || !selectedTimeSlot) return new Set<string>();

    return new Set(
      turni
        .filter((turno) => {
          if (turno.data !== selectedDate) return false;
          const turnoHour = parseInt(turno.ora_inizio.split(':')[0]);
          let slotId = 'morning';
          if (turnoHour >= 14 && turnoHour < 22) slotId = 'afternoon';
          else if (turnoHour >= 22 || turnoHour < 6) slotId = 'evening';
          return slotId === selectedTimeSlot;
        })
        .flatMap((turno) => turno.Assegnazione_Turno?.map((a) => a.collaboratore_id) || [])
    );
  }, [turni, selectedDate, selectedTimeSlot]);

  // Get all assigned collaborator IDs for the day (for conflict detection)
  const dayAssignments = useMemo(() => {
    if (!selectedDate) return new Map<string, string[]>();

    const assignments = new Map<string, string[]>();

    turni
      .filter((turno) => turno.data === selectedDate)
      .forEach((turno) => {
        turno.Assegnazione_Turno?.forEach((a) => {
          const existing = assignments.get(a.collaboratore_id) || [];
          existing.push(`${turno.ora_inizio}-${turno.ora_fine}`);
          assignments.set(a.collaboratore_id, existing);
        });
      });

    return assignments;
  }, [turni, selectedDate]);

  // Group collaboratori by nucleo
  const collaboratoriByNucleo = useMemo(() => {
    const grouped: Record<string, CollaboratoreConNuclei[]> = {
      unassigned: [],
    };

    nuclei?.forEach((nucleo) => {
      grouped[nucleo.id] = [];
    });

    collaboratoriAttivi.forEach((collaboratore) => {
      const activeAppartenenza = collaboratore.Appartenenza_Nucleo?.find(
        (a) => !a.data_fine
      );

      if (activeAppartenenza?.Nucleo?.id) {
        const nucleoId = activeAppartenenza.Nucleo.id;
        if (!grouped[nucleoId]) grouped[nucleoId] = [];
        grouped[nucleoId].push(collaboratore);
      } else {
        grouped.unassigned.push(collaboratore);
      }
    });

    return grouped;
  }, [collaboratoriAttivi, nuclei]);

  // Filter collaboratori based on search and availability
  const filteredCollaboratori = useMemo(() => {
    let filtered = collaboratoriAttivi;

    // Search filter
    if (searchQuery) {
      const query = searchQuery.toLowerCase();
      filtered = filtered.filter(
        (c) =>
          c.nome.toLowerCase().includes(query) ||
          c.cognome.toLowerCase().includes(query) ||
          c.email?.toLowerCase().includes(query)
      );
    }

    // Available only filter
    if (showOnlyAvailable && selectedDate && selectedTimeSlot) {
      filtered = filtered.filter(
        (c) => !assignedCollaboratoriIds.has(c.id)
      );
    }

    return filtered;
  }, [collaboratoriAttivi, searchQuery, showOnlyAvailable, selectedDate, selectedTimeSlot, assignedCollaboratoriIds]);

  // Check if collaboratore has conflict
  const hasConflict = (collaboratoreId: string): { conflict: boolean; message?: string } => {
    if (!selectedDate || !selectedTimeSlot) return { conflict: false };

    // Check if already assigned to this slot
    if (assignedCollaboratoriIds.has(collaboratoreId)) {
      return { conflict: true, message: 'Già assegnato a questo turno' };
    }

    // Custom validation
    if (onValidateAssignment) {
      const result = onValidateAssignment(collaboratoreId, selectedDate, selectedTimeSlot);
      if (!result.valid) {
        return { conflict: true, message: result.message };
      }
    }

    // Check day assignments (max shifts per day)
    const dayShifts = dayAssignments.get(collaboratoreId);
    if (dayShifts && dayShifts.length >= 2) {
      return { conflict: true, message: 'Max 2 turni al giorno' };
    }

    return { conflict: false };
  };

  const toggleNucleo = (nucleoId: string) => {
    setExpandedNuclei((prev) =>
      prev.includes(nucleoId)
        ? prev.filter((id) => id !== nucleoId)
        : [...prev, nucleoId]
    );
  };

  if (isLoading) {
    return (
      <div className="p-4 text-sm text-muted-foreground">
        Caricamento collaboratori...
      </div>
    );
  }

  return (
    <div className="flex flex-col h-full border-r bg-card">
      {/* Header */}
      <div className="p-3 border-b space-y-3">
        <div className="flex items-center gap-2">
          <Users className="h-4 w-4 text-muted-foreground" />
          <span className="text-sm font-medium">Collaboratori</span>
          <Badge variant="secondary" className="ml-auto text-xs">
            {filteredCollaboratori.length}
          </Badge>
        </div>

        {/* Search */}
        <div className="relative">
          <Search className="absolute left-2 top-1/2 -translate-y-1/2 h-3.5 w-3.5 text-muted-foreground" />
          <Input
            placeholder="Cerca..."
            value={searchQuery}
            onChange={(e) => setSearchQuery(e.target.value)}
            className="pl-8 h-8 text-sm"
          />
        </div>

        {/* Filter */}
        {selectedDate && selectedTimeSlot && (
          <Button
            variant={showOnlyAvailable ? 'secondary' : 'outline'}
            size="sm"
            className="w-full text-xs h-7"
            onClick={() => setShowOnlyAvailable(!showOnlyAvailable)}
          >
            <Filter className="h-3 w-3 mr-1" />
            {showOnlyAvailable ? 'Mostra tutti' : 'Solo disponibili'}
          </Button>
        )}
      </div>

      {/* Collaboratori List */}
      <ScrollArea className="flex-1">
        <div className="p-2 space-y-2">
          {/* Grouped by nucleo */}
          {nuclei?.map((nucleo) => {
            const nucleoCollaboratori = collaboratoriByNucleo[nucleo.id] || [];
            const filteredNucleo = nucleoCollaboratori.filter((c) =>
              filteredCollaboratori.some((fc) => fc.id === c.id)
            );

            if (filteredNucleo.length === 0) return null;

            const isExpanded = expandedNuclei.includes(nucleo.id);

            return (
              <Collapsible
                key={nucleo.id}
                open={isExpanded}
                onOpenChange={() => toggleNucleo(nucleo.id)}
              >
                <CollapsibleTrigger asChild>
                  <Button
                    variant="ghost"
                    size="sm"
                    className="w-full justify-start h-7 px-2"
                  >
                    {isExpanded ? (
                      <ChevronDown className="h-3 w-3 mr-1" />
                    ) : (
                      <ChevronRight className="h-3 w-3 mr-1" />
                    )}
                    <div
                      className="w-2 h-2 rounded-full mr-2"
                      style={{ backgroundColor: nucleo.colore }}
                    />
                    <span className="text-xs font-medium truncate">
                      {nucleo.nome}
                    </span>
                    <Badge
                      variant="secondary"
                      className="ml-auto text-[10px] h-4 px-1"
                    >
                      {filteredNucleo.length}
                    </Badge>
                  </Button>
                </CollapsibleTrigger>
                <CollapsibleContent className="space-y-1 mt-1 ml-2">
                  {filteredNucleo.map((collaboratore) => {
                    const conflictCheck = hasConflict(collaboratore.id);
                    return (
                      <CollaboratorDragItemCompact
                        key={collaboratore.id}
                        collaboratore={collaboratore}
                        isAssigned={assignedCollaboratoriIds.has(collaboratore.id)}
                        hasConflict={conflictCheck.conflict}
                        conflictMessage={conflictCheck.message}
                      />
                    );
                  })}
                </CollapsibleContent>
              </Collapsible>
            );
          })}

          {/* Unassigned collaboratori */}
          {collaboratoriByNucleo.unassigned.length > 0 && (
            <Collapsible
              open={expandedNuclei.includes('unassigned')}
              onOpenChange={() => toggleNucleo('unassigned')}
            >
              <CollapsibleTrigger asChild>
                <Button
                  variant="ghost"
                  size="sm"
                  className="w-full justify-start h-7 px-2"
                >
                  {expandedNuclei.includes('unassigned') ? (
                    <ChevronDown className="h-3 w-3 mr-1" />
                  ) : (
                    <ChevronRight className="h-3 w-3 mr-1" />
                  )}
                  <div className="w-2 h-2 rounded-full mr-2 bg-gray-400" />
                  <span className="text-xs font-medium">Senza nucleo</span>
                  <Badge
                    variant="secondary"
                    className="ml-auto text-[10px] h-4 px-1"
                  >
                    {collaboratoriByNucleo.unassigned.length}
                  </Badge>
                </Button>
              </CollapsibleTrigger>
              <CollapsibleContent className="space-y-1 mt-1 ml-2">
                {collaboratoriByNucleo.unassigned
                  .filter((c) => filteredCollaboratori.some((fc) => fc.id === c.id))
                  .map((collaboratore) => {
                    const conflictCheck = hasConflict(collaboratore.id);
                    return (
                      <CollaboratorDragItemCompact
                        key={collaboratore.id}
                        collaboratore={collaboratore}
                        isAssigned={assignedCollaboratoriIds.has(collaboratore.id)}
                        hasConflict={conflictCheck.conflict}
                        conflictMessage={conflictCheck.message}
                      />
                    );
                  })}
              </CollapsibleContent>
            </Collapsible>
          )}

          {/* Empty state */}
          {filteredCollaboratori.length === 0 && (
            <div className="text-center py-8 text-sm text-muted-foreground">
              {searchQuery
                ? 'Nessun collaboratore trovato'
                : 'Nessun collaboratore attivo'}
            </div>
          )}
        </div>
      </ScrollArea>

      {/* Info footer */}
      {selectedDate && selectedTimeSlot && (
        <div className="p-2 border-t bg-muted/30">
          <p className="text-[10px] text-muted-foreground text-center">
            Trascina un collaboratore su un turno per assegnarlo
          </p>
        </div>
      )}
    </div>
  );
}
