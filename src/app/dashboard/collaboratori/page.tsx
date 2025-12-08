'use client';

import { useState } from 'react';
import { useCollaboratori } from '@/hooks/use-collaboratori';
import { useNuclei } from '@/hooks/use-nuclei';
import { Button } from '@/components/ui/button';
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select';
import {
    Dialog,
    DialogContent,
    DialogDescription,
    DialogFooter,
    DialogHeader,
    DialogTitle,
    DialogTrigger,
} from '@/components/ui/dialog';
import { Badge } from '@/components/ui/badge';
import { Plus, UserPlus, Pencil, Trash2, Loader2, Mail, Phone, Clock } from 'lucide-react';
import { useToast } from '@/hooks/use-toast';
import type { TipoOreContratto, TipoContratto } from '@/types/database';

interface CollaboratoreForm {
    nome: string;
    cognome: string;
    email: string;
    telefono: string;
    tipo_ore: TipoOreContratto;
    ore_settimanali: number | undefined;
    ore_min: number | undefined;
    ore_max: number | undefined;
    tipo_contratto: TipoContratto;
    nuclei_ids: string[];
}

const defaultForm: CollaboratoreForm = {
    nome: '',
    cognome: '',
    email: '',
    telefono: '',
    tipo_ore: 'settimanale_fisso',
    ore_settimanali: 40,
    ore_min: undefined,
    ore_max: undefined,
    tipo_contratto: 'full_time',
    nuclei_ids: [],
};

export default function CollaboratoriPage() {
    const { collaboratori, isLoading, createCollaboratore, updateCollaboratore, deleteCollaboratore, assignToNucleo, removeFromNucleo, isCreating, isUpdating, isDeleting } = useCollaboratori();
    const { nuclei } = useNuclei();
    const { toast } = useToast();

    const [isDialogOpen, setIsDialogOpen] = useState(false);
    const [editingId, setEditingId] = useState<string | null>(null);
    const [form, setForm] = useState<CollaboratoreForm>(defaultForm);
    const [filtroAttivi, setFiltroAttivi] = useState(true);
    // Per tracciare i nuclei originali in modifica (per calcolare diff)
    const [originalNucleiData, setOriginalNucleiData] = useState<{ nucleoId: string; appartenenzaId: string }[]>([]);

    const collaboratoriFiltrati = filtroAttivi
        ? collaboratori.filter(c => c.attivo)
        : collaboratori;

    const handleOpenCreate = () => {
        setForm(defaultForm);
        setEditingId(null);
        setIsDialogOpen(true);
    };

    const handleOpenEdit = (collaboratore: typeof collaboratori[0]) => {
        // Estrai i nuclei attivi (senza data_fine)
        const nucleiAttivi = (collaboratore.Appartenenza_Nucleo || [])
            .filter((app: { data_fine?: string | null }) => !app.data_fine)
            .map((app: { id: string; Nucleo?: { id: string } }) => ({
                nucleoId: app.Nucleo?.id || '',
                appartenenzaId: app.id,
            }))
            .filter((item: { nucleoId: string }) => item.nucleoId);

        setOriginalNucleiData(nucleiAttivi);

        setForm({
            nome: collaboratore.nome,
            cognome: collaboratore.cognome,
            email: collaboratore.email,
            telefono: collaboratore.telefono || '',
            tipo_ore: collaboratore.tipo_ore || 'settimanale_fisso',
            ore_settimanali: collaboratore.ore_settimanali ?? 40,
            ore_min: collaboratore.ore_min ?? undefined,
            ore_max: collaboratore.ore_max ?? undefined,
            tipo_contratto: collaboratore.tipo_contratto || 'full_time',
            nuclei_ids: nucleiAttivi.map((n: { nucleoId: string }) => n.nucleoId),
        });
        setEditingId(collaboratore.id);
        setIsDialogOpen(true);
    };

    const handleSubmit = async (e: React.FormEvent) => {
        e.preventDefault();

        if (!form.nome || !form.cognome || !form.email) {
            toast({
                title: 'Errore',
                description: 'Nome, cognome ed email sono obbligatori',
                variant: 'destructive',
            });
            return;
        }

        // Payload per Collaboratore (senza nuclei_ids che non è una colonna della tabella)
        const payload = {
            nome: form.nome,
            cognome: form.cognome,
            email: form.email,
            telefono: form.telefono || undefined,
            tipo_ore: form.tipo_ore,
            ore_settimanali: form.tipo_ore === 'settimanale_fisso' ? form.ore_settimanali : undefined,
            ore_min: form.tipo_ore === 'flessibile' ? form.ore_min : undefined,
            ore_max: form.tipo_ore === 'flessibile' ? form.ore_max : undefined,
            tipo_contratto: form.tipo_contratto,
            attivo: true,
        };

        try {
            if (editingId) {
                updateCollaboratore(
                    { id: editingId, updates: payload },
                    {
                        onSuccess: () => {
                            // Gestisci i cambiamenti ai nuclei
                            const originalNucleiIds = originalNucleiData.map(n => n.nucleoId);
                            const newNucleiIds = form.nuclei_ids;

                            // Nuclei da aggiungere (presenti in form ma non in originali)
                            const toAdd = newNucleiIds.filter(id => !originalNucleiIds.includes(id));
                            // Nuclei da rimuovere (presenti in originali ma non in form)
                            const toRemove = originalNucleiData.filter(n => !newNucleiIds.includes(n.nucleoId));

                            // Aggiungi nuovi nuclei
                            toAdd.forEach((nucleoId) => {
                                assignToNucleo(
                                    { collaboratoreId: editingId, nucleoId },
                                    { onError: (err) => console.error('Errore aggiunta nucleo:', err) }
                                );
                            });

                            // Rimuovi nuclei deselezionati
                            toRemove.forEach((item) => {
                                removeFromNucleo(item.appartenenzaId, {
                                    onError: (err) => console.error('Errore rimozione nucleo:', err),
                                });
                            });

                            const hasChanges = toAdd.length > 0 || toRemove.length > 0;
                            toast({
                                title: hasChanges
                                    ? 'Collaboratore e nuclei aggiornati'
                                    : 'Collaboratore aggiornato'
                            });
                            setIsDialogOpen(false);
                        },
                        onError: (error) => {
                            console.error('Update error:', error);
                            toast({ title: 'Errore', description: 'Impossibile aggiornare', variant: 'destructive' });
                        },
                    }
                );
            } else {
                createCollaboratore(payload, {
                    onSuccess: (data) => {
                        // Assegna il collaboratore ai nuclei selezionati
                        if (form.nuclei_ids.length > 0 && data?.id) {
                            const collaboratoreId = data.id;
                            form.nuclei_ids.forEach((nucleoId) => {
                                assignToNucleo(
                                    { collaboratoreId, nucleoId },
                                    {
                                        onError: (err) => {
                                            console.error('Errore assegnazione nucleo:', err);
                                        },
                                    }
                                );
                            });
                            toast({ title: 'Collaboratore creato e assegnato ai nuclei' });
                        } else {
                            toast({ title: 'Collaboratore creato' });
                        }
                        setIsDialogOpen(false);
                    },
                    onError: (error) => {
                        console.error('Create error:', error);
                        toast({ title: 'Errore', description: 'Impossibile creare', variant: 'destructive' });
                    },
                });
            }
        } catch {
            toast({ title: 'Errore', variant: 'destructive' });
        }
    };

    const handleDelete = (id: string, nome: string) => {
        if (confirm(`Sei sicuro di voler disattivare "${nome}"?`)) {
            deleteCollaboratore(id, {
                onSuccess: () => {
                    toast({ title: 'Collaboratore disattivato' });
                },
                onError: () => {
                    toast({ title: 'Errore', description: 'Impossibile disattivare', variant: 'destructive' });
                },
            });
        }
    };

    const renderOreInfo = (collab: typeof collaboratori[0]) => {
        if (collab.tipo_ore === 'flessibile') {
            return `${collab.ore_min || 0}-${collab.ore_max || 0}h/sett`;
        }
        if (collab.tipo_ore === 'mensile') {
            return `${collab.ore_mensili || 0}h/mese`;
        }
        return `${collab.ore_settimanali || 0}h/sett`;
    };

    if (isLoading) {
        return (
            <div className="flex items-center justify-center h-64">
                <Loader2 className="h-8 w-8 animate-spin text-muted-foreground" />
            </div>
        );
    }

    return (
        <div className="space-y-6">
            {/* Header */}
            <div className="flex items-center justify-between">
                <div>
                    <h1 className="text-2xl font-bold">Collaboratori</h1>
                    <p className="text-muted-foreground">
                        Gestisci i collaboratori della tua azienda
                    </p>
                </div>

                <div className="flex gap-2">
                    <Select
                        value={filtroAttivi ? 'attivi' : 'tutti'}
                        onValueChange={(v) => setFiltroAttivi(v === 'attivi')}
                    >
                        <SelectTrigger className="w-32">
                            <SelectValue />
                        </SelectTrigger>
                        <SelectContent>
                            <SelectItem value="attivi">Attivi</SelectItem>
                            <SelectItem value="tutti">Tutti</SelectItem>
                        </SelectContent>
                    </Select>

                    <Dialog open={isDialogOpen} onOpenChange={setIsDialogOpen}>
                        <DialogTrigger asChild>
                            <Button onClick={handleOpenCreate}>
                                <Plus className="mr-2 h-4 w-4" />
                                Nuovo
                            </Button>
                        </DialogTrigger>

                        <DialogContent className="max-w-md">
                            <form onSubmit={handleSubmit}>
                                <DialogHeader>
                                    <DialogTitle>
                                        {editingId ? 'Modifica Collaboratore' : 'Nuovo Collaboratore'}
                                    </DialogTitle>
                                    <DialogDescription>
                                        {editingId ? 'Modifica i dati' : 'Aggiungi un nuovo collaboratore'}
                                    </DialogDescription>
                                </DialogHeader>

                                <div className="grid gap-4 py-4 max-h-96 overflow-y-auto">
                                    <div className="grid grid-cols-2 gap-4">
                                        <div className="grid gap-2">
                                            <Label htmlFor="nome">Nome *</Label>
                                            <Input
                                                id="nome"
                                                value={form.nome}
                                                onChange={(e) => setForm({ ...form, nome: e.target.value })}
                                            />
                                        </div>
                                        <div className="grid gap-2">
                                            <Label htmlFor="cognome">Cognome *</Label>
                                            <Input
                                                id="cognome"
                                                value={form.cognome}
                                                onChange={(e) => setForm({ ...form, cognome: e.target.value })}
                                            />
                                        </div>
                                    </div>

                                    <div className="grid gap-2">
                                        <Label htmlFor="email">Email *</Label>
                                        <Input
                                            id="email"
                                            type="email"
                                            value={form.email}
                                            onChange={(e) => setForm({ ...form, email: e.target.value })}
                                            disabled={!!editingId}
                                        />
                                    </div>

                                    <div className="grid gap-2">
                                        <Label htmlFor="telefono">Telefono</Label>
                                        <Input
                                            id="telefono"
                                            value={form.telefono}
                                            onChange={(e) => setForm({ ...form, telefono: e.target.value })}
                                        />
                                    </div>

                                    <div className="grid gap-2">
                                        <Label>Gestione Ore</Label>
                                        <Select
                                            value={form.tipo_ore}
                                            onValueChange={(v) => setForm({ ...form, tipo_ore: v as TipoOreContratto })}
                                        >
                                            <SelectTrigger>
                                                <SelectValue />
                                            </SelectTrigger>
                                            <SelectContent>
                                                <SelectItem value="settimanale_fisso">Ore settimanali fisse</SelectItem>
                                                <SelectItem value="mensile">Ore mensili</SelectItem>
                                                <SelectItem value="flessibile">Ore flessibili (min/max)</SelectItem>
                                            </SelectContent>
                                        </Select>
                                    </div>

                                    {form.tipo_ore === 'settimanale_fisso' && (
                                        <div className="grid gap-2">
                                            <Label htmlFor="ore_sett">Ore settimanali</Label>
                                            <Input
                                                id="ore_sett"
                                                type="number"
                                                min={1}
                                                max={60}
                                                value={form.ore_settimanali || ''}
                                                onChange={(e) => setForm({ ...form, ore_settimanali: parseInt(e.target.value) || undefined })}
                                            />
                                        </div>
                                    )}

                                    {form.tipo_ore === 'flessibile' && (
                                        <div className="grid grid-cols-2 gap-4">
                                            <div className="grid gap-2">
                                                <Label htmlFor="ore_min">Ore min</Label>
                                                <Input
                                                    id="ore_min"
                                                    type="number"
                                                    min={1}
                                                    value={form.ore_min || ''}
                                                    onChange={(e) => setForm({ ...form, ore_min: parseInt(e.target.value) || undefined })}
                                                />
                                            </div>
                                            <div className="grid gap-2">
                                                <Label htmlFor="ore_max">Ore max</Label>
                                                <Input
                                                    id="ore_max"
                                                    type="number"
                                                    min={1}
                                                    value={form.ore_max || ''}
                                                    onChange={(e) => setForm({ ...form, ore_max: parseInt(e.target.value) || undefined })}
                                                />
                                            </div>
                                        </div>
                                    )}

                                    <div className="grid gap-2">
                                        <Label>Contratto</Label>
                                        <Select
                                            value={form.tipo_contratto}
                                            onValueChange={(v) => setForm({ ...form, tipo_contratto: v as TipoContratto })}
                                        >
                                            <SelectTrigger>
                                                <SelectValue />
                                            </SelectTrigger>
                                            <SelectContent>
                                                <SelectItem value="full_time">Full Time</SelectItem>
                                                <SelectItem value="part_time">Part Time</SelectItem>
                                                <SelectItem value="altro">Altro</SelectItem>
                                            </SelectContent>
                                        </Select>
                                    </div>

                                    {nuclei.length > 0 && (
                                        <div className="grid gap-2">
                                            <Label>Nuclei (mansioni)</Label>
                                            <div className="flex flex-wrap gap-2">
                                                {nuclei.map((nucleo) => (
                                                    <Badge
                                                        key={nucleo.id}
                                                        variant={form.nuclei_ids.includes(nucleo.id) ? 'default' : 'outline'}
                                                        className="cursor-pointer transition-all"
                                                        style={form.nuclei_ids.includes(nucleo.id) ? { backgroundColor: nucleo.colore } : {}}
                                                        onClick={() => {
                                                            if (form.nuclei_ids.includes(nucleo.id)) {
                                                                setForm({
                                                                    ...form,
                                                                    nuclei_ids: form.nuclei_ids.filter(id => id !== nucleo.id),
                                                                });
                                                            } else {
                                                                setForm({
                                                                    ...form,
                                                                    nuclei_ids: [...form.nuclei_ids, nucleo.id],
                                                                });
                                                            }
                                                        }}
                                                    >
                                                        {nucleo.nome}
                                                    </Badge>
                                                ))}
                                            </div>
                                            <p className="text-xs text-muted-foreground">
                                                Clicca per selezionare/deselezionare i nuclei
                                            </p>
                                        </div>
                                    )}
                                </div>

                                <DialogFooter>
                                    <Button type="button" variant="outline" onClick={() => setIsDialogOpen(false)}>
                                        Annulla
                                    </Button>
                                    <Button type="submit" disabled={isCreating || isUpdating}>
                                        {(isCreating || isUpdating) && <Loader2 className="mr-2 h-4 w-4 animate-spin" />}
                                        {editingId ? 'Salva' : 'Crea'}
                                    </Button>
                                </DialogFooter>
                            </form>
                        </DialogContent>
                    </Dialog>
                </div>
            </div>

            {/* Lista */}
            {collaboratoriFiltrati.length === 0 ? (
                <Card>
                    <CardContent className="flex flex-col items-center justify-center py-12">
                        <UserPlus className="h-12 w-12 text-muted-foreground mb-4" />
                        <h3 className="text-lg font-medium">Nessun collaboratore</h3>
                        <p className="text-muted-foreground text-center max-w-sm mt-1">
                            Aggiungi il primo collaboratore per iniziare
                        </p>
                        <Button className="mt-4" onClick={handleOpenCreate}>
                            <Plus className="mr-2 h-4 w-4" />
                            Aggiungi
                        </Button>
                    </CardContent>
                </Card>
            ) : (
                <div className="grid gap-4 md:grid-cols-2 lg:grid-cols-3">
                    {collaboratoriFiltrati.map((collab) => (
                        <Card key={collab.id} className={!collab.attivo ? 'opacity-60' : ''}>
                            <CardHeader className="pb-3">
                                <div className="flex items-start justify-between">
                                    <div>
                                        <CardTitle className="text-lg">
                                            {collab.nome} {collab.cognome}
                                        </CardTitle>
                                        <CardDescription className="flex items-center gap-1 mt-1">
                                            <Mail className="h-3 w-3" />
                                            {collab.email}
                                        </CardDescription>
                                    </div>
                                    <div className="flex gap-1">
                                        <Button variant="ghost" size="icon" onClick={() => handleOpenEdit(collab)}>
                                            <Pencil className="h-4 w-4" />
                                        </Button>
                                        {collab.attivo && (
                                            <Button
                                                variant="ghost"
                                                size="icon"
                                                onClick={() => handleDelete(collab.id, `${collab.nome} ${collab.cognome}`)}
                                                disabled={isDeleting}
                                            >
                                                <Trash2 className="h-4 w-4 text-destructive" />
                                            </Button>
                                        )}
                                    </div>
                                </div>
                            </CardHeader>
                            <CardContent>
                                <div className="flex flex-wrap gap-2 mb-3">
                                    {collab.telefono && (
                                        <Badge variant="outline" className="gap-1">
                                            <Phone className="h-3 w-3" />
                                            {collab.telefono}
                                        </Badge>
                                    )}
                                    <Badge variant="secondary" className="gap-1">
                                        <Clock className="h-3 w-3" />
                                        {renderOreInfo(collab)}
                                    </Badge>
                                    {!collab.attivo && (
                                        <Badge variant="destructive">Disattivato</Badge>
                                    )}
                                </div>
                                {/* Nuclei assegnati */}
                                {collab.Appartenenza_Nucleo && collab.Appartenenza_Nucleo.length > 0 && (
                                    <div className="flex flex-wrap gap-1">
                                        {collab.Appartenenza_Nucleo
                                            .filter((app: { data_fine?: string | null }) => !app.data_fine)
                                            .map((app: { id: string; Nucleo?: { id: string; nome: string; colore: string } }) => (
                                                <Badge
                                                    key={app.id}
                                                    variant="outline"
                                                    style={{ borderColor: app.Nucleo?.colore, color: app.Nucleo?.colore }}
                                                >
                                                    {app.Nucleo?.nome}
                                                </Badge>
                                            ))}
                                    </div>
                                )}
                            </CardContent>
                        </Card>
                    ))}
                </div>
            )}
        </div>
    );
}
