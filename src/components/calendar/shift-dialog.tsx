'use client';

import { useState } from 'react';
import { useForm } from 'react-hook-form';
import { zodResolver } from '@hookform/resolvers/zod';
import * as z from 'zod';
import { format } from 'date-fns';
import { it } from 'date-fns/locale';

import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogFooter,
  DialogHeader,
  DialogTitle,
} from '@/components/ui/dialog';
import {
  Form,
  FormControl,
  FormField,
  FormItem,
  FormLabel,
  FormMessage,
} from '@/components/ui/form';
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from '@/components/ui/select';
import { Input } from '@/components/ui/input';
import { Button } from '@/components/ui/button';
import { Textarea } from '@/components/ui/textarea';
import { Badge } from '@/components/ui/badge';
import { CalendarIcon, Clock, Plus, X } from 'lucide-react';
import { CalendarShift } from '@/hooks/use-calendar';

// Schema di validazione
const shiftSchema = z.object({
  date: z.string().min(1, 'Seleziona una data'),
  startTime: z.string().min(1, 'Inserisci ora inizio'),
  endTime: z.string().min(1, 'Inserisci ora fine'),
  userId: z.string().min(1, 'Seleziona un dipendente'),
  position: z.string().optional(),
  notes: z.string().optional(),
  tasks: z.array(z.object({
    description: z.string().min(1, 'Descrizione obbligatoria'),
    completed: z.boolean().default(false)
  })).default([])
});

type ShiftFormData = z.infer<typeof shiftSchema>;

interface ShiftDialogProps {
  open: boolean;
  onOpenChange: (open: boolean) => void;
  shift?: CalendarShift;
  selectedDate?: Date;
  onSave: (data: ShiftFormData) => void;
}

// Mock data per dipendenti - sostituire con dati reali
const mockEmployees = [
  { id: '1', name: 'Marco Rossi', position: 'Cameriere' },
  { id: '2', name: 'Laura Bianchi', position: 'Barista' },
  { id: '3', name: 'Giovanni Verdi', position: 'Cuoco' }
];

export default function ShiftDialog({
  open,
  onOpenChange,
  shift,
  selectedDate,
  onSave
}: ShiftDialogProps) {
  const [newTask, setNewTask] = useState('');

  const form = useForm<ShiftFormData>({
    resolver: zodResolver(shiftSchema),
    defaultValues: {
      date: selectedDate ? format(selectedDate, 'yyyy-MM-dd') : '',
      startTime: shift?.startTime || '09:00',
      endTime: shift?.endTime || '17:00',
      userId: shift?.userId || '',
      position: shift?.position || '',
      notes: shift?.notes || '',
      tasks: shift?.tasks || []
    }
  });

  const tasks = form.watch('tasks');

  const onSubmit = (data: ShiftFormData) => {
    onSave(data);
    onOpenChange(false);
    form.reset();
  };

  const addTask = () => {
    if (newTask.trim()) {
      const currentTasks = form.getValues('tasks');
      form.setValue('tasks', [...currentTasks, { description: newTask.trim(), completed: false }]);
      setNewTask('');
    }
  };

  const removeTask = (index: number) => {
    const currentTasks = form.getValues('tasks');
    form.setValue('tasks', currentTasks.filter((_, i) => i !== index));
  };

  const toggleTask = (index: number) => {
    const currentTasks = form.getValues('tasks');
    const updatedTasks = currentTasks.map((task, i) =>
      i === index ? { ...task, completed: !task.completed } : task
    );
    form.setValue('tasks', updatedTasks);
  };

  return (
    <Dialog open={open} onOpenChange={onOpenChange}>
      <DialogContent className="sm:max-w-[500px]">
        <DialogHeader>
          <DialogTitle className="flex items-center gap-2">
            <Clock className="h-5 w-5" />
            {shift ? 'Modifica Turno' : 'Nuovo Turno'}
          </DialogTitle>
          <DialogDescription>
            {shift ? 'Modifica i dettagli del turno' : 'Crea un nuovo turno per un dipendente'}
          </DialogDescription>
        </DialogHeader>

        <Form {...form}>
          <form onSubmit={form.handleSubmit(onSubmit)} className="space-y-4">
            <div className="grid grid-cols-2 gap-4">
              <FormField
                control={form.control}
                name="date"
                render={({ field }) => (
                  <FormItem>
                    <FormLabel>Data</FormLabel>
                    <FormControl>
                      <Input type="date" {...field} />
                    </FormControl>
                    <FormMessage />
                  </FormItem>
                )}
              />

              <FormField
                control={form.control}
                name="userId"
                render={({ field }) => (
                  <FormItem>
                    <FormLabel>Dipendente</FormLabel>
                    <Select onValueChange={field.onChange} defaultValue={field.value}>
                      <FormControl>
                        <SelectTrigger>
                          <SelectValue placeholder="Seleziona dipendente" />
                        </SelectTrigger>
                      </FormControl>
                      <SelectContent>
                        {mockEmployees.map((employee) => (
                          <SelectItem key={employee.id} value={employee.id}>
                            {employee.name} - {employee.position}
                          </SelectItem>
                        ))}
                      </SelectContent>
                    </Select>
                    <FormMessage />
                  </FormItem>
                )}
              />
            </div>

            <div className="grid grid-cols-2 gap-4">
              <FormField
                control={form.control}
                name="startTime"
                render={({ field }) => (
                  <FormItem>
                    <FormLabel>Ora Inizio</FormLabel>
                    <FormControl>
                      <Input type="time" {...field} />
                    </FormControl>
                    <FormMessage />
                  </FormItem>
                )}
              />

              <FormField
                control={form.control}
                name="endTime"
                render={({ field }) => (
                  <FormItem>
                    <FormLabel>Ora Fine</FormLabel>
                    <FormControl>
                      <Input type="time" {...field} />
                    </FormControl>
                    <FormMessage />
                  </FormItem>
                )}
              />
            </div>

            <FormField
              control={form.control}
              name="position"
              render={({ field }) => (
                <FormItem>
                  <FormLabel>Posizione (opzionale)</FormLabel>
                  <FormControl>
                    <Input placeholder="es. Cameriere, Barista..." {...field} />
                  </FormControl>
                  <FormMessage />
                </FormItem>
              )}
            />

            <FormField
              control={form.control}
              name="notes"
              render={({ field }) => (
                <FormItem>
                  <FormLabel>Note (opzionale)</FormLabel>
                  <FormControl>
                    <Textarea
                      placeholder="Note specifiche per questo turno..."
                      className="resize-none"
                      {...field}
                    />
                  </FormControl>
                  <FormMessage />
                </FormItem>
              )}
            />

            {/* Task Section */}
            <div className="space-y-2">
              <FormLabel>Task del turno</FormLabel>
              <div className="flex gap-2">
                <Input
                  placeholder="Aggiungi un task..."
                  value={newTask}
                  onChange={(e) => setNewTask(e.target.value)}
                  onKeyPress={(e) => e.key === 'Enter' && (e.preventDefault(), addTask())}
                />
                <Button type="button" variant="outline" size="sm" onClick={addTask}>
                  <Plus className="h-4 w-4" />
                </Button>
              </div>
              <div className="space-y-2 max-h-32 overflow-y-auto">
                {tasks.map((task, index) => (
                  <div key={index} className="flex items-center gap-2 p-2 border rounded">
                    <input
                      type="checkbox"
                      checked={task.completed}
                      onChange={() => toggleTask(index)}
                      className="rounded"
                    />
                    <span className={`flex-1 ${task.completed ? 'line-through text-muted-foreground' : ''}`}>
                      {task.description}
                    </span>
                    <Button
                      type="button"
                      variant="ghost"
                      size="sm"
                      onClick={() => removeTask(index)}
                    >
                      <X className="h-4 w-4" />
                    </Button>
                  </div>
                ))}
              </div>
            </div>

            <DialogFooter>
              <Button type="button" variant="outline" onClick={() => onOpenChange(false)}>
                Annulla
              </Button>
              <Button type="submit">
                {shift ? 'Salva Modifiche' : 'Crea Turno'}
              </Button>
            </DialogFooter>
          </form>
        </Form>
      </DialogContent>
    </Dialog>
  );
}