'use client';

import { useState, useEffect } from 'react';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { Badge } from '@/components/ui/badge';
import { CalendarDays, Plus, Users, BarChart3, Clock, TrendingUp, Download } from 'lucide-react';
import { useCalendar, CalendarShift } from '@/hooks/use-calendar';
import MobileCalendar from './mobile-calendar';
import ShiftDialog from './shift-dialog';
import { useCompany } from '@/hooks/use-company';
import { useUser } from '@/hooks/use-user';
import { generateWeeklyShiftsPDF } from '@/lib/pdf-generator';

export default function ShiftCalendar() {
  const { shifts, absences, employeeStatuses, isLoading } = useCalendar();
  const { data: company } = useCompany();
  const { user } = useUser();
  const [isMobile, setIsMobile] = useState(false);
  const [showShiftDialog, setShowShiftDialog] = useState(false);
  const [selectedDate, setSelectedDate] = useState<Date | undefined>();
  const [selectedShift, setSelectedShift] = useState<CalendarShift | undefined>();
  const [mobileTab, setMobileTab] = useState<'calendar' | 'employees'>('calendar');

  // Detect mobile screen - ottimizzato per evitare re-renders
  useEffect(() => {
    const checkMobile = () => {
      const mobile = window.innerWidth < 768;
      setIsMobile(mobile);
    };

    // Check iniziale
    checkMobile();

    // Debounced resize handler
    let timeoutId: NodeJS.Timeout;
    const handleResize = () => {
      clearTimeout(timeoutId);
      timeoutId = setTimeout(checkMobile, 100);
    };

    window.addEventListener('resize', handleResize);
    return () => {
      clearTimeout(timeoutId);
      window.removeEventListener('resize', handleResize);
    };
  }, []);

  const handleAddShift = (date?: Date) => {
    setSelectedDate(date);
    setSelectedShift(undefined);
    setShowShiftDialog(true);
  };

  const handleEditShift = (shift: CalendarShift) => {
    setSelectedShift(shift);
    setSelectedDate(undefined);
    setShowShiftDialog(true);
  };

  const handleDayClick = (date: Date) => {
    setSelectedDate(date);
    // On mobile, tapping a day opens the add shift dialog
    if (isMobile) {
      handleAddShift(date);
    }
  };

  const handleSaveShift = (data: any) => {
    // TODO: Implement save logic
    console.log('Save shift:', data);
    setShowShiftDialog(false);
  };

  if (isLoading) {
    return (
      <div className="flex items-center justify-center min-h-[60vh]">
        <div className="text-center">
          <CalendarDays className="h-16 w-16 text-muted-foreground mx-auto mb-4 animate-pulse" />
          <p>Caricamento calendario...</p>
        </div>
      </div>
    );
  }

  // Statistiche per il dashboard
  const totalShifts = shifts.length;
  const totalHours = shifts.reduce((sum, shift) => sum + shift.hours, 0);
  const activeEmployees = employeeStatuses.filter(s => s.status === 'WORKING').length;

  if (isMobile) {
    return (
      <div className="flex flex-col h-screen bg-background">
        {/* Header compatto */}
        <div className="sticky top-0 z-10 bg-background border-b px-4 py-3">
          <div className="flex items-center justify-between mb-3">
            <div className="flex items-center gap-2">
              <CalendarDays className="h-6 w-6" />
              <h1 className="text-lg font-bold">Calendario Turni</h1>
            </div>
            <div className="flex items-center">
              <Button
                variant="outline"
                size="sm"
                onClick={() => handleAddShift()}
                className="h-8 px-3"
              >
                <Plus className="h-4 w-4 mr-1" />
                Nuovo
              </Button>
              {user?.role === 'ADMIN' || true ? (
                <Button
                  variant="outline"
                  size="sm"
                  onClick={() => {
                    if (company) {
                      const pdfBlob = generateWeeklyShiftsPDF(shifts, new Date(), company.name);
                      const url = URL.createObjectURL(pdfBlob as Blob);
                      const a = document.createElement('a');
                      a.href = url;
                      a.download = 'turni_settimanali.pdf';
                      a.click();
                      URL.revokeObjectURL(url);
                    }
                  }}
                  className="h-8 px-3 ml-2"
                >
                  <Download className="h-4 w-4 mr-1" />
                  PDF
                </Button>
              ) : null}
            </div>
          </div>

          {/* Statistiche compatte */}
          <div className="grid grid-cols-3 gap-2">
            <div className="text-center">
              <div className="text-lg font-bold text-primary">{totalShifts}</div>
              <div className="text-xs text-muted-foreground">Turni</div>
            </div>
            <div className="text-center">
              <div className="text-lg font-bold text-green-600">{totalHours}h</div>
              <div className="text-xs text-muted-foreground">Ore</div>
            </div>
            <div className="text-center">
              <div className="text-lg font-bold text-purple-600">{activeEmployees}</div>
              <div className="text-xs text-muted-foreground">Attivi</div>
            </div>
          </div>
        </div>

        {/* Contenuto principale */}
        <div className="flex-1 overflow-hidden pt-32">
          {mobileTab === 'calendar' ? (
            <div className="h-full overflow-y-auto">
              <MobileCalendar
                onShiftClick={handleEditShift}
                onDayClick={handleDayClick}
                onAddShift={handleAddShift}
              />
            </div>
          ) : (
            <div className="h-full overflow-y-auto p-4">
              <div className="space-y-4">
                <div className="flex items-center justify-between">
                  <h2 className="text-xl font-bold flex items-center gap-2">
                    <Users className="h-5 w-5" />
                    Stato Dipendenti
                  </h2>
                  <Badge variant="secondary">{employeeStatuses.length}</Badge>
                </div>

                <div className="space-y-3">
                  {employeeStatuses.map((employee) => (
                    <Card key={employee.userId} className="p-4">
                      <div className="flex items-center justify-between">
                        <div className="flex items-center gap-3 flex-1 min-w-0">
                          <div className="w-12 h-12 rounded-full bg-primary/10 flex items-center justify-center flex-shrink-0">
                            <span className="text-sm font-medium">
                              {employee.userName.split(' ').map(n => n[0]).join('')}
                            </span>
                          </div>
                          <div className="flex-1 min-w-0">
                            <p className="font-semibold truncate text-base">{employee.userName}</p>
                            <p className="text-sm text-muted-foreground capitalize">
                              {employee.status === 'WORKING' ? 'In turno' :
                               employee.status === 'VACATION' ? 'In ferie' :
                               employee.status === 'SICK_LEAVE' ? 'Malattia' :
                               employee.status === 'PERMISSION' ? 'Permesso' :
                               employee.status === 'DAY_OFF' ? 'Riposo' : 'Fuori servizio'}
                            </p>
                          </div>
                        </div>
                        {employee.currentShift && (
                          <Badge variant="secondary" className="ml-3">
                            {employee.currentShift.hours}h
                          </Badge>
                        )}
                      </div>
                    </Card>
                  ))}
                </div>
              </div>
            </div>
          )}
        </div>

        {/* Tab bar fissa in basso */}
        <div className="sticky bottom-0 z-20 bg-card shadow-2xl border-t">
          <div className="grid grid-cols-2">
            <button
              onClick={() => setMobileTab('calendar')}
              className={`flex flex-col items-center justify-center py-3 px-4 transition-colors ${
                mobileTab === 'calendar'
                  ? 'text-primary border-t-2 border-primary'
                  : 'text-muted-foreground'
              }`}
            >
              <CalendarDays className="h-5 w-5 mb-1" />
              <span className="text-xs font-medium">Calendario</span>
            </button>
            <button
              onClick={() => setMobileTab('employees')}
              className={`flex flex-col items-center justify-center py-3 px-4 transition-colors ${
                mobileTab === 'employees'
                  ? 'text-primary border-t-2 border-primary'
                  : 'text-muted-foreground'
              }`}
            >
              <Users className="h-5 w-5 mb-1" />
              <span className="text-xs font-medium">Dipendenti</span>
            </button>
          </div>
        </div>

        {/* Dialog per creare/modificare turni */}
        <ShiftDialog
          open={showShiftDialog}
          onOpenChange={setShowShiftDialog}
          shift={selectedShift}
          selectedDate={selectedDate}
          onSave={handleSaveShift}
        />
      </div>
    );
  }

  // Desktop layout (rimane invariato)
  return (
    <div className="space-y-6">
      {/* Header con statistiche e azioni */}
      <div className="grid grid-cols-1 md:grid-cols-4 gap-4">
        <Card>
          <CardContent className="p-4">
            <div className="flex items-center gap-3">
              <div className="w-10 h-10 bg-blue-100 dark:bg-blue-900/20 rounded-lg flex items-center justify-center">
                <CalendarDays className="h-5 w-5 text-blue-600" />
              </div>
              <div>
                <p className="text-2xl font-bold">{totalShifts}</p>
                <p className="text-sm text-muted-foreground">Turni totali</p>
              </div>
            </div>
          </CardContent>
        </Card>

        <Card>
          <CardContent className="p-4">
            <div className="flex items-center gap-3">
              <div className="w-10 h-10 bg-green-100 dark:bg-green-900/20 rounded-lg flex items-center justify-center">
                <Clock className="h-5 w-5 text-green-600" />
              </div>
              <div>
                <p className="text-2xl font-bold">{totalHours}h</p>
                <p className="text-sm text-muted-foreground">Ore lavorate</p>
              </div>
            </div>
          </CardContent>
        </Card>

        <Card>
          <CardContent className="p-4">
            <div className="flex items-center gap-3">
              <div className="w-10 h-10 bg-purple-100 dark:bg-purple-900/20 rounded-lg flex items-center justify-center">
                <Users className="h-5 w-5 text-purple-600" />
              </div>
              <div>
                <p className="text-2xl font-bold">{activeEmployees}</p>
                <p className="text-sm text-muted-foreground">In turno ora</p>
              </div>
            </div>
          </CardContent>
        </Card>

        <Card>
          <CardContent className="p-4">
            <div className="flex items-center gap-3">
              <div className="w-10 h-10 bg-orange-100 dark:bg-orange-900/20 rounded-lg flex items-center justify-center">
                <TrendingUp className="h-5 w-5 text-orange-600" />
              </div>
              <div>
                <p className="text-2xl font-bold">98%</p>
                <p className="text-sm text-muted-foreground">Copertura turni</p>
              </div>
            </div>
          </CardContent>
        </Card>
      </div>

      {/* Header principale con azioni */}
      <div className="flex flex-col sm:flex-row items-start sm:items-center justify-between gap-4">
        <div className="flex items-center gap-2">
          <CalendarDays className="h-6 w-6" />
          <h2 className="text-2xl sm:text-3xl font-bold">Calendario Turni</h2>
        </div>
        <div className="flex items-center gap-2 w-full sm:w-auto">
          <Button
            variant="outline"
            size="sm"
            onClick={() => handleAddShift()}
            className="flex-1 sm:flex-none"
          >
            <Plus className="h-4 w-4 mr-2" />
            Nuovo Turno
          </Button>
          <Button
            variant="outline"
            size="sm"
            className="flex-1 sm:flex-none"
          >
            Richiedi Turno
          </Button>
          {user?.role === 'ADMIN' || true ? (
            <Button
              variant="outline"
              size="sm"
              onClick={() => {
                if (company) {
                  const pdfBlob = generateWeeklyShiftsPDF(shifts, new Date(), company.name);
                  const url = URL.createObjectURL(pdfBlob as Blob);
                  const a = document.createElement('a');
                  a.href = url;
                  a.download = 'turni_settimanali.pdf';
                  a.click();
                  URL.revokeObjectURL(url);
                }
              }}
              className="h-8 px-3"
            >
              <Download className="h-4 w-4 mr-1" />
              PDF
            </Button>
          ) : null}
        </div>
      </div>

      {/* Layout principale */}
      <div className="grid grid-cols-1 xl:grid-cols-4 gap-6">
        {/* Calendario - occupa 3 colonne su desktop, tutto su mobile */}
        <div className="xl:col-span-3">
          <Card className="p-6">
            <MobileCalendar
              onShiftClick={handleEditShift}
              onDayClick={handleDayClick}
              onAddShift={handleAddShift}
            />
          </Card>
        </div>

        {/* Sidebar destra - solo su desktop xl */}
        <div className="hidden xl:block xl:col-span-1 space-y-6">
          {/* Stato Dipendenti */}
          <Card>
            <CardHeader className="pb-3">
              <CardTitle className="flex items-center gap-2 text-lg">
                <Users className="h-5 w-5" />
                Stato Dipendenti
              </CardTitle>
            </CardHeader>
            <CardContent className="space-y-3">
              {employeeStatuses.slice(0, 5).map((employee) => (
                <div key={employee.userId} className="flex items-center justify-between p-3 border rounded-lg hover:bg-muted/50 transition-colors">
                  <div className="flex items-center gap-3 flex-1 min-w-0">
                    <div className="w-8 h-8 rounded-full bg-primary/10 flex items-center justify-center flex-shrink-0">
                      <span className="text-sm font-medium">
                        {employee.userName.split(' ').map(n => n[0]).join('')}
                      </span>
                    </div>
                    <div className="flex-1 min-w-0">
                      <p className="font-medium text-sm truncate">{employee.userName}</p>
                      <p className="text-xs text-muted-foreground capitalize">
                        {employee.status === 'WORKING' ? 'In turno' :
                         employee.status === 'VACATION' ? 'In ferie' :
                         employee.status === 'SICK_LEAVE' ? 'Malattia' :
                         employee.status === 'PERMISSION' ? 'Permesso' :
                         employee.status === 'DAY_OFF' ? 'Riposo' : 'Fuori servizio'}
                      </p>
                    </div>
                  </div>
                  {employee.currentShift && (
                    <Badge variant="secondary" className="text-xs ml-2">
                      {employee.currentShift.hours}h
                    </Badge>
                  )}
                </div>
              ))}
              {employeeStatuses.length > 5 && (
                <p className="text-sm text-muted-foreground text-center py-2">
                  +{employeeStatuses.length - 5} altri dipendenti
                </p>
              )}
            </CardContent>
          </Card>

          {/* Azioni rapide */}
          <Card>
            <CardHeader className="pb-3">
              <CardTitle className="flex items-center gap-2 text-lg">
                <BarChart3 className="h-5 w-5" />
                Azioni Rapide
              </CardTitle>
            </CardHeader>
            <CardContent className="space-y-2">
              <Button variant="outline" size="sm" className="w-full justify-start">
                <Plus className="h-4 w-4 mr-2" />
                Aggiungi turno urgente
              </Button>
              <Button variant="outline" size="sm" className="w-full justify-start">
                <Users className="h-4 w-4 mr-2" />
                Gestisci sostituzioni
              </Button>
              <Button variant="outline" size="sm" className="w-full justify-start">
                <CalendarDays className="h-4 w-4 mr-2" />
                Copia settimana scorsa
              </Button>
            </CardContent>
          </Card>
        </div>
      </div>

      {/* Dialog per creare/modificare turni */}
      <ShiftDialog
        open={showShiftDialog}
        onOpenChange={setShowShiftDialog}
        shift={selectedShift}
        selectedDate={selectedDate}
        onSave={handleSaveShift}
      />
    </div>
  );
}
