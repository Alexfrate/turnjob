'use client';

import { useState } from 'react';
import { useNuclei } from '@/hooks/use-nuclei';
import { Button } from '@/components/ui/button';
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
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
import { Plus, Users, Pencil, Trash2, Loader2 } from 'lucide-react';
import { useToast } from '@/hooks/use-toast';

const COLORI_PREDEFINITI = [
    '#3b82f6', '#ef4444', '#22c55e', '#f59e0b',
    '#8b5cf6', '#ec4899', '#06b6d4', '#f97316',
];

interface NucleoForm {
    nome: string;
    mansione: string;
    descrizione: string;
    colore: string;
    membri_richiesti_min: number;
}

const defaultForm: NucleoForm = {
    nome: '',
    mansione: '',
    descrizione: '',
    colore: '#3b82f6',
    membri_richiesti_min: 1,
};

export default function NucleiPage() {
    const { nuclei, isLoading, createNucleo, updateNucleo, deleteNucleo, isCreating, isUpdating, isDeleting } = useNuclei();
    const { toast } = useToast();

    const [isDialogOpen, setIsDialogOpen] = useState(false);
    const [editingId, setEditingId] = useState<string | null>(null);
    const [form, setForm] = useState<NucleoForm>(defaultForm);

    const handleOpenCreate = () => {
        setForm(defaultForm);
        setEditingId(null);
        setIsDialogOpen(true);
    };

    const handleOpenEdit = (nucleo: typeof nuclei[0]) => {
        setForm({
            nome: nucleo.nome,
            mansione: nucleo.mansione,
            descrizione: nucleo.descrizione || '',
            colore: nucleo.colore,
            membri_richiesti_min: nucleo.membri_richiesti_min,
        });
        setEditingId(nucleo.id);
        setIsDialogOpen(true);
    };

    const handleSubmit = async (e: React.FormEvent) => {
        e.preventDefault();

        if (!form.nome || !form.mansione) {
            toast({
                title: 'Errore',
                description: 'Nome e mansione sono obbligatori',
                variant: 'destructive',
            });
            return;
        }

        try {
            if (editingId) {
                updateNucleo(
                    { id: editingId, updates: form },
                    {
                        onSuccess: () => {
                            toast({ title: 'Nucleo aggiornato' });
                            setIsDialogOpen(false);
                        },
                        onError: () => {
                            toast({ title: 'Errore', description: 'Impossibile aggiornare il nucleo', variant: 'destructive' });
                        },
                    }
                );
            } else {
                createNucleo(form, {
                    onSuccess: () => {
                        toast({ title: 'Nucleo creato' });
                        setIsDialogOpen(false);
                    },
                    onError: () => {
                        toast({ title: 'Errore', description: 'Impossibile creare il nucleo', variant: 'destructive' });
                    },
                });
            }
        } catch {
            toast({ title: 'Errore', variant: 'destructive' });
        }
    };

    const handleDelete = (id: string, nome: string) => {
        if (confirm(`Sei sicuro di voler eliminare il nucleo "${nome}"?`)) {
            deleteNucleo(id, {
                onSuccess: () => {
                    toast({ title: 'Nucleo eliminato' });
                },
                onError: () => {
                    toast({ title: 'Errore', description: 'Impossibile eliminare il nucleo', variant: 'destructive' });
                },
            });
        }
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
                    <h1 className="text-2xl font-bold">Nuclei</h1>
                    <p className="text-muted-foreground">
                        Gestisci i nuclei/reparti della tua azienda
                    </p>
                </div>

                <Dialog open={isDialogOpen} onOpenChange={setIsDialogOpen}>
                    <DialogTrigger asChild>
                        <Button onClick={handleOpenCreate}>
                            <Plus className="mr-2 h-4 w-4" />
                            Nuovo Nucleo
                        </Button>
                    </DialogTrigger>

                    <DialogContent>
                        <form onSubmit={handleSubmit}>
                            <DialogHeader>
                                <DialogTitle>
                                    {editingId ? 'Modifica Nucleo' : 'Nuovo Nucleo'}
                                </DialogTitle>
                                <DialogDescription>
                                    {editingId
                                        ? 'Modifica i dati del nucleo'
                                        : 'Crea un nuovo nucleo/reparto'}
                                </DialogDescription>
                            </DialogHeader>

                            <div className="grid gap-4 py-4">
                                <div className="grid gap-2">
                                    <Label htmlFor="nome">Nome *</Label>
                                    <Input
                                        id="nome"
                                        placeholder="es. Cucina"
                                        value={form.nome}
                                        onChange={(e) => setForm({ ...form, nome: e.target.value })}
                                    />
                                </div>

                                <div className="grid gap-2">
                                    <Label htmlFor="mansione">Mansione *</Label>
                                    <Input
                                        id="mansione"
                                        placeholder="es. Cuoco, Chef"
                                        value={form.mansione}
                                        onChange={(e) => setForm({ ...form, mansione: e.target.value })}
                                    />
                                </div>

                                <div className="grid gap-2">
                                    <Label htmlFor="descrizione">Descrizione</Label>
                                    <Input
                                        id="descrizione"
                                        placeholder="Descrizione opzionale"
                                        value={form.descrizione}
                                        onChange={(e) => setForm({ ...form, descrizione: e.target.value })}
                                    />
                                </div>

                                <div className="grid gap-2">
                                    <Label>Colore</Label>
                                    <div className="flex gap-2 flex-wrap">
                                        {COLORI_PREDEFINITI.map((colore) => (
                                            <button
                                                key={colore}
                                                type="button"
                                                className={`w-8 h-8 rounded-full border-2 transition-all ${form.colore === colore ? 'border-foreground scale-110' : 'border-transparent'
                                                    }`}
                                                style={{ backgroundColor: colore }}
                                                onClick={() => setForm({ ...form, colore })}
                                            />
                                        ))}
                                    </div>
                                </div>

                                <div className="grid gap-2">
                                    <Label htmlFor="membri_min">Membri minimi per turno</Label>
                                    <Input
                                        id="membri_min"
                                        type="number"
                                        min={1}
                                        value={form.membri_richiesti_min}
                                        onChange={(e) => setForm({ ...form, membri_richiesti_min: parseInt(e.target.value) || 1 })}
                                    />
                                </div>
                            </div>

                            <DialogFooter>
                                <Button
                                    type="button"
                                    variant="outline"
                                    onClick={() => setIsDialogOpen(false)}
                                >
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

            {/* Lista Nuclei */}
            {nuclei.length === 0 ? (
                <Card>
                    <CardContent className="flex flex-col items-center justify-center py-12">
                        <Users className="h-12 w-12 text-muted-foreground mb-4" />
                        <h3 className="text-lg font-medium">Nessun nucleo</h3>
                        <p className="text-muted-foreground text-center max-w-sm mt-1">
                            Crea il primo nucleo per iniziare a organizzare i tuoi collaboratori
                        </p>
                        <Button className="mt-4" onClick={handleOpenCreate}>
                            <Plus className="mr-2 h-4 w-4" />
                            Crea Nucleo
                        </Button>
                    </CardContent>
                </Card>
            ) : (
                <div className="grid gap-4 md:grid-cols-2 lg:grid-cols-3">
                    {nuclei.map((nucleo) => (
                        <Card key={nucleo.id}>
                            <CardHeader className="pb-3">
                                <div className="flex items-start justify-between">
                                    <div className="flex items-center gap-2">
                                        <div
                                            className="w-4 h-4 rounded-full"
                                            style={{ backgroundColor: nucleo.colore }}
                                        />
                                        <CardTitle className="text-lg">{nucleo.nome}</CardTitle>
                                    </div>
                                    <div className="flex gap-1">
                                        <Button
                                            variant="ghost"
                                            size="icon"
                                            onClick={() => handleOpenEdit(nucleo)}
                                        >
                                            <Pencil className="h-4 w-4" />
                                        </Button>
                                        <Button
                                            variant="ghost"
                                            size="icon"
                                            onClick={() => handleDelete(nucleo.id, nucleo.nome)}
                                            disabled={isDeleting}
                                        >
                                            <Trash2 className="h-4 w-4 text-destructive" />
                                        </Button>
                                    </div>
                                </div>
                                <CardDescription>{nucleo.mansione}</CardDescription>
                            </CardHeader>
                            <CardContent>
                                {nucleo.descrizione && (
                                    <p className="text-sm text-muted-foreground mb-3">
                                        {nucleo.descrizione}
                                    </p>
                                )}
                                <div className="flex items-center gap-2">
                                    <Badge variant="secondary">
                                        Min {nucleo.membri_richiesti_min} per turno
                                    </Badge>
                                </div>
                            </CardContent>
                        </Card>
                    ))}
                </div>
            )}
        </div>
    );
}
