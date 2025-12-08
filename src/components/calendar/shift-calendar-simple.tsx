'use client';

import { useState, useMemo } from 'react';
import { Calendar, dateFnsLocalizer, View, Views } from 'react-big-calendar';
import { format, parse, startOfWeek, getDay } from 'date-fns';
import { it } from 'date-fns/locale';
import 'react-big-calendar/lib/css/react-big-calendar.css';

import { Card } from '@/components/ui/card';
import { Badge } from '@/components/ui/badge';
import { Button } from '@/components/ui/button';
import { CalendarDays, Clock, User, Plus } from 'lucide-react';

// Localizer per italiano
const localizer = dateFnsLocalizer({
  format,
  parse,
  startOfWeek,
  getDay,
  locales: {
    it: it,
  },
});

// Tipi per gli eventi del calendario
interface CalendarEvent {
  id: string;
  title: string;
  start: Date;
  end: Date;
  resource: {
    type: 'shift' | 'absence' | 'request';
    userId: string;
    userName: string;
    position?: string;
    status?: string;
    notes?: string;
    tasks?: Array<{ description: string; completed: boolean }>;
    hours?: number;
  };
}

// Componente per renderizzare gli eventi
const EventComponent = ({ event }: { event: CalendarEvent }) => {
  const { resource } = event;

  const getStatusColor = (type: string, status?: string) => {
    switch (type) {
      case 'shift':
        return 'bg-blue-500 hover:bg-blue-600';
      case 'absence':
        switch (status) {
          case 'VACATION':
            return 'bg-green-500 hover:bg-green-600';
          case 'SICK_LEAVE':
            return 'bg-red-500 hover:bg-red-600';
          case 'PERMISSION':
            return 'bg-yellow-500 hover:bg-yellow-600';
          default:
            return 'bg-gray-500 hover:bg-gray-600';
        }
      case 'request':
        return 'bg-orange-500 hover:bg-orange-600';
      default:
        return 'bg-gray-500 hover:bg-gray-600';
    }
  };

  return (
    <div className={`p-1 rounded text-white text-xs ${getStatusColor(resource.type, resource.status)}`}>
      <div className="font-medium truncate">{resource.userName}</div>
      {resource.hours && (
        <div className="flex items-center gap-1">
          <Clock className="h-3 w-3" />
          {resource.hours}h
        </div>
      )}
    </div>
  );
};

// Componente principale calendario
export default function ShiftCalendar() {
  const [currentView, setCurrentView] = useState<View>(Views.MONTH);
  const [currentDate, setCurrentDate] = useState(new Date());

  // Mock data - sostituire con dati reali dal database
  const events: CalendarEvent[] = useMemo(() => [
    {
      id: '1',
      title: 'Marco Rossi - Turno Mattina',
      start: new Date(2024, 11, 23, 9, 0),
      end: new Date(2024, 11, 23, 17, 0),
      resource: {
        type: 'shift',
        userId: 'user1',
        userName: 'Marco Rossi',
        position: 'Cameriere',
        hours: 8,
        notes: 'Preparazione sala principale',
        tasks: [
          { description: 'Preparare tavoli', completed: true },
          { description: 'Controllare inventario', completed: false }
        ]
      }
    },
    {
      id: '2',
      title: 'Laura Bianchi - Ferie',
      start: new Date(2024, 11, 24),
      end: new Date(2024, 11, 28),
      resource: {
        type: 'absence',
        userId: 'user2',
        userName: 'Laura Bianchi',
        status: 'VACATION'
      }
    }
  ], []);

  const messages = {
    allDay: 'Tutto il giorno',
    previous: 'Precedente',
    next: 'Successivo',
    today: 'Oggi',
    month: 'Mese',
    week: 'Settimana',
    day: 'Giorno',
    agenda: 'Agenda',
    date: 'Data',
    time: 'Ora',
    event: 'Evento',
    noEventsInRange: 'Nessun turno in questo periodo',
    showMore: (total: number) => `+${total} altri`,
  };

  return (
    <div className="space-y-4">
      {/* Header con controlli */}
      <div className="flex items-center justify-between">
        <div className="flex items-center gap-2">
          <CalendarDays className="h-5 w-5" />
          <h2 className="text-lg font-semibold">Calendario Turni</h2>
        </div>
        <div className="flex items-center gap-2">
          <Button variant="outline" size="sm">
            <Plus className="h-4 w-4 mr-2" />
            Nuovo Turno
          </Button>
          <Button variant="outline" size="sm">
            Richiedi Turno
          </Button>
        </div>
      </div>

      {/* Legenda */}
      <Card className="p-4">
        <h3 className="font-medium mb-3">Legenda</h3>
        <div className="flex flex-wrap gap-4">
          <div className="flex items-center gap-2">
            <div className="w-4 h-4 bg-blue-500 rounded"></div>
            <span className="text-sm">Turno</span>
          </div>
          <div className="flex items-center gap-2">
            <div className="w-4 h-4 bg-green-500 rounded"></div>
            <span className="text-sm">Ferie</span>
          </div>
          <div className="flex items-center gap-2">
            <div className="w-4 h-4 bg-red-500 rounded"></div>
            <span className="text-sm">Malattia</span>
          </div>
          <div className="flex items-center gap-2">
            <div className="w-4 h-4 bg-yellow-500 rounded"></div>
            <span className="text-sm">Permesso</span>
          </div>
          <div className="flex items-center gap-2">
            <div className="w-4 h-4 bg-orange-500 rounded"></div>
            <span className="text-sm">Richiesta</span>
          </div>
        </div>
      </Card>

      {/* Calendario */}
      <Card className="p-4">
        <Calendar
          localizer={localizer}
          events={events}
          startAccessor="start"
          endAccessor="end"
          style={{ height: 600 }}
          view={currentView}
          onView={setCurrentView}
          date={currentDate}
          onNavigate={setCurrentDate}
          components={{
            event: EventComponent,
          }}
          messages={messages}
          culture="it"
          popup
          selectable
        />
      </Card>
    </div>
  );
}