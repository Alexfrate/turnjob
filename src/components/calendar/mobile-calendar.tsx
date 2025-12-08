'use client';

import { useState, useEffect, useMemo } from 'react';
import { format, startOfWeek, endOfWeek, eachDayOfInterval, addWeeks, subWeeks, isSameDay, isToday, startOfMonth, endOfMonth, addDays, subDays } from 'date-fns';
import { it } from 'date-fns/locale';
import { ChevronLeft, ChevronRight, Plus, Calendar as CalendarIcon, Clock, User, CalendarDays } from 'lucide-react';
import { Card, CardContent } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { Badge } from '@/components/ui/badge';
import { useCalendar, CalendarShift, CalendarAbsence } from '@/hooks/use-calendar';

interface MobileCalendarProps {
  onShiftClick?: (shift: CalendarShift) => void;
  onDayClick?: (date: Date) => void;
  onAddShift?: (date: Date) => void;
}

export default function MobileCalendar({ onShiftClick, onDayClick, onAddShift }: MobileCalendarProps) {
  const [currentDate, setCurrentDate] = useState<Date | null>(null);
  const [viewMode, setViewMode] = useState<'day' | 'week' | 'month'>('day');
  const { shifts, absences, employeeStatuses, isLoading } = useCalendar();

  // Imposta la data corrente lato client per evitare hydration mismatch
  useEffect(() => {
    setCurrentDate(new Date());
  }, []);

  // Touch gestures
  const [touchStart, setTouchStart] = useState<number | null>(null);
  const [touchEnd, setTouchEnd] = useState<number | null>(null);

  // Calcola i giorni da mostrare
  const weekDays = useMemo(() => {
    if (!currentDate) return [];
    const start = startOfWeek(currentDate, { weekStartsOn: 1 });
    const end = endOfWeek(currentDate, { weekStartsOn: 1 });
    return eachDayOfInterval({ start, end });
  }, [currentDate]);

  const monthDays = useMemo(() => {
    if (!currentDate) return [];
    const start = startOfMonth(currentDate);
    const end = endOfMonth(currentDate);
    return eachDayOfInterval({ start, end });
  }, [currentDate]);

  // Vista giorno singolo
  const currentDay = useMemo(() => {
    return currentDate ? [currentDate] : [];
  }, [currentDate]);

  // Eventi per giorno
  const getDayEvents = (date: Date) => {
    const dayShifts = shifts.filter(shift => isSameDay(new Date(shift.date), date));
    const dayAbsences = absences.filter(absence => {
      const absenceStart = new Date(absence.startDate);
      const absenceEnd = new Date(absence.endDate);
      return date >= absenceStart && date <= absenceEnd;
    });

    return { shifts: dayShifts, absences: dayAbsences };
  };

  // Navigazione
  const navigateDay = (direction: 'prev' | 'next') => {
    setCurrentDate(prev => prev ? (direction === 'next' ? addDays(prev, 1) : subDays(prev, 1)) : new Date());
  };

  const navigateWeek = (direction: 'prev' | 'next') => {
    setCurrentDate(prev => prev ? (direction === 'next' ? addWeeks(prev, 1) : subWeeks(prev, 1)) : new Date());
  };

  const navigateMonth = (direction: 'prev' | 'next') => {
    setCurrentDate(prev => {
      if (!prev) return new Date();
      const newDate = new Date(prev);
      newDate.setMonth(newDate.getMonth() + (direction === 'next' ? 1 : -1));
      return newDate;
    });
  };

  const handleTouchStart = (e: React.TouchEvent) => {
    setTouchEnd(null);
    setTouchStart(e.targetTouches[0].clientX);
  };

  const handleTouchMove = (e: React.TouchEvent) => {
    setTouchEnd(e.targetTouches[0].clientX);
  };

  const handleTouchEnd = () => {
    if (!touchStart || !touchEnd) return;

    const distance = touchStart - touchEnd;
    const isLeftSwipe = distance > 50;
    const isRightSwipe = distance < -50;

    if (isLeftSwipe) {
      if (viewMode === 'day') navigateDay('next');
      else if (viewMode === 'week') navigateWeek('next');
      else navigateMonth('next');
    }
    if (isRightSwipe) {
      if (viewMode === 'day') navigateDay('prev');
      else if (viewMode === 'week') navigateWeek('prev');
      else navigateMonth('prev');
    }
  };

  // Non renderizzare fino a quando la data non è impostata
  if (!currentDate) {
    return (
      <div className="flex items-center justify-center min-h-[60vh]">
        <div className="text-center">
          <CalendarIcon className="h-16 w-16 text-muted-foreground mx-auto mb-4 animate-pulse" />
          <p className="text-base">Caricamento calendario...</p>
        </div>
      </div>
    );
  }

  if (isLoading || !currentDate) {
    return (
      <div className="space-y-6 pb-24 px-4">
        <div className="flex items-center justify-between pt-2">
          <div className="h-12 w-12 bg-muted rounded-full animate-pulse" />
          <div className="h-12 w-32 bg-muted rounded-xl mx-4 animate-pulse" />
          <div className="h-12 w-12 bg-muted rounded-full animate-pulse" />
        </div>
        <div className="flex justify-center py-6">
          <div className="h-10 w-32 bg-muted rounded-xl animate-pulse" />
        </div>
        <div className="space-y-4">
          {Array.from({ length: 3 }).map((_, i) => (
            <div key={i} className="h-64 w-full bg-muted rounded-xl animate-pulse" />
          ))}
        </div>
      </div>
    );
  }

  return (
    <div className="space-y-8 pt-8 pb-40 px-4">
      {/* Header con navigazione */}
      <div className="flex items-center justify-between pt-4">
        <Button
          variant="outline"
          size="lg"
          className="h-12 w-12 p-0"
          aria-label={`Navigazione precedente (${viewMode === 'day' ? 'giorno' : viewMode === 'week' ? 'settimana' : 'mese'})`}
          onClick={() => {
            if (viewMode === 'day') navigateDay('prev');
            else if (viewMode === 'week') navigateWeek('prev');
            else navigateMonth('prev');
          }}
        >
          <ChevronLeft className="h-5 w-5" />
        </Button>

        <div className="flex flex-col items-center px-4">
          <h2 className="text-lg font-bold text-center leading-tight">
            {viewMode === 'day'
              ? format(currentDate, 'EEEE dd MMMM yyyy', { locale: it })
              : viewMode === 'week'
              ? `${format(weekDays[0], 'dd MMM', { locale: it })} - ${format(weekDays[6], 'dd MMM yyyy', { locale: it })}`
              : format(currentDate, 'MMMM yyyy', { locale: it })
            }
          </h2>
          <p className="text-sm text-muted-foreground mt-1">
            Scorri per navigare
          </p>
        </div>

        <Button
          variant="outline"
          size="lg"
          className="h-12 w-12 p-0"
          aria-label={`Navigazione successiva (${viewMode === 'day' ? 'giorno' : viewMode === 'week' ? 'settimana' : 'mese'})`}
          onClick={() => {
            if (viewMode === 'day') navigateDay('next');
            else if (viewMode === 'week') navigateWeek('next');
            else navigateMonth('next');
          }}
        >
          <ChevronRight className="h-5 w-5" />
        </Button>
      </div>

      {/* Toggle vista */}
      <div className="flex justify-center py-8">
        <div className="bg-muted p-1 rounded-xl shadow-sm">
          <Button
            variant={viewMode === 'day' ? 'default' : 'ghost'}
            size="sm"
            className="px-4 py-2 text-sm font-medium"
            onClick={() => setViewMode('day')}
            aria-label="Cambia vista a Giorno"
          >
            Giorno
          </Button>
          <Button
            variant={viewMode === 'week' ? 'default' : 'ghost'}
            size="sm"
            className="px-4 py-2 text-sm font-medium"
            onClick={() => setViewMode('week')}
            aria-label="Cambia vista a Settimana"
          >
            Settimana
          </Button>
          <Button
            variant={viewMode === 'month' ? 'default' : 'ghost'}
            size="sm"
            className="px-4 py-2 text-sm font-medium"
            onClick={() => setViewMode('month')}
            aria-label="Cambia vista a Mese"
          >
            Mese
          </Button>
        </div>
      </div>

      {/* Calendario */}
      <div
        className="touch-pan-y"
        onTouchStart={handleTouchStart}
        onTouchMove={handleTouchMove}
        onTouchEnd={handleTouchEnd}
      >
        {viewMode === 'day' ? (
          // Vista giornaliera ottimizzata
          <div className="space-y-4">
            {currentDay.map((day) => {
              const { shifts: dayShifts, absences: dayAbsences } = getDayEvents(day);
              const isCurrentDay = isToday(day);

              return (
                <Card
                  key={day.toISOString()}
                  role="button"
                  tabIndex={0}
                  className={`cursor-pointer transition-all duration-200 hover:shadow-lg active:scale-[0.98] ${
                    isCurrentDay ? 'ring-2 ring-primary shadow-lg bg-primary/5' : 'shadow-sm'
                  }`}
                  onClick={() => onDayClick?.(day)}
                  onKeyDown={(e) => {
                    if (e.key === 'Enter' || e.key === ' ') {
                      e.preventDefault();
                      onDayClick?.(day);
                    }
                  }}
                  aria-label={`Giorno ${format(day, 'EEEE dd MMMM yyyy', { locale: it })}`}
                >
                  <CardContent className="p-8">
                    {/* Header del giorno */}
                    <div className="flex items-start justify-between mb-6">
                      <div className="flex items-center gap-4 flex-1">
                        <div className={`w-16 h-16 rounded-xl flex items-center justify-center text-xl font-bold ${
                          isCurrentDay
                            ? 'bg-primary text-primary-foreground shadow-lg'
                            : 'bg-muted text-muted-foreground'
                        }`}>
                          <time dateTime={day.toISOString().split('T')[0]}>
                            {format(day, 'dd')}
                          </time>
                        </div>
                        <div className="flex-1">
                          <h3 className={`text-lg font-bold truncate mb-1 ${isCurrentDay ? 'text-primary' : ''}`}>
                            <time dateTime={day.toISOString().split('T')[0]}>
                              {format(day, 'EEEE', { locale: it })}
                            </time>
                          </h3>
                          <time dateTime={day.toISOString().split('T')[0]} className="text-base text-muted-foreground font-medium">
                            {format(day, 'dd MMMM yyyy', { locale: it })}
                          </time>
                          {isCurrentDay && (
                            <Badge variant="secondary" className="text-xs px-2 py-1 mt-1">
                              Oggi
                            </Badge>
                          )}
                        </div>
                      </div>

                      <Button
                        variant="ghost"
                        size="sm"
                        className="h-10 w-10 p-0 ml-3 flex-shrink-0"
                        onClick={(e) => {
                          e.stopPropagation();
                          onAddShift?.(day);
                        }}
                      >
                        <Plus className="h-5 w-5" />
                      </Button>
                    </div>

                    {/* Eventi del giorno */}
                    <div className="space-y-4">
                      {dayShifts.map((shift) => (
                        <div
                          key={shift.id}
                          className="flex items-center justify-between p-4 bg-blue-50 dark:bg-blue-900 rounded-lg cursor-pointer hover:bg-blue-100 dark:hover:bg-blue-900 active:scale-[0.98] transition-all duration-150 border border-blue-100 dark:border-blue-800"
                          onClick={(e) => {
                            e.stopPropagation();
                            onShiftClick?.(shift);
                          }}
                        >
                          <div className="flex items-center gap-3 flex-1 min-w-0">
                            <div className="w-10 h-10 bg-blue-500 rounded-full flex items-center justify-center flex-shrink-0">
                              <Clock className="h-5 w-5 text-white" />
                            </div>
                            <div className="flex-1 min-w-0">
                              <p className="font-semibold text-base truncate mb-1">{shift.userName}</p>
                              <p className="text-sm text-muted-foreground">
                                {shift.startTime} - {shift.endTime}
                              </p>
                              {shift.position && (
                                <p className="text-sm text-muted-foreground">{shift.position}</p>
                              )}
                            </div>
                          </div>
                          <Badge variant="secondary" className="text-sm px-3 py-1 font-semibold ml-3 flex-shrink-0">
                            {shift.hours}h
                          </Badge>
                        </div>
                      ))}

                      {dayAbsences.map((absence) => (
                        <div
                          key={absence.id}
                          className={`flex items-center gap-3 p-4 rounded-lg border ${
                            absence.type === 'VACATION'
                              ? 'bg-green-50 dark:bg-green-900 border-green-100 dark:border-green-800'
                              : absence.type === 'SICK_LEAVE'
                              ? 'bg-red-50 dark:bg-red-900 border-red-100 dark:border-red-800'
                              : 'bg-yellow-50 dark:bg-yellow-900 border-yellow-100 dark:border-yellow-800'
                          }`}
                        >
                          <div className={`w-10 h-10 rounded-full flex items-center justify-center flex-shrink-0 ${
                            absence.type === 'VACATION'
                              ? 'bg-green-500'
                              : absence.type === 'SICK_LEAVE'
                              ? 'bg-red-500'
                              : 'bg-yellow-500'
                          }`}>
                            <User className="h-5 w-5 text-white" />
                          </div>
                          <div className="flex-1 min-w-0">
                            <p className="font-semibold text-base truncate mb-1">{absence.userName}</p>
                            <p className="text-sm text-muted-foreground capitalize">
                              {absence.type === 'VACATION' ? 'Ferie' :
                               absence.type === 'SICK_LEAVE' ? 'Malattia' :
                               absence.type === 'PERMISSION' ? 'Permesso' : 'Assenza'}
                            </p>
                            {absence.notes && (
                              <p className="text-sm text-muted-foreground mt-1">{absence.notes}</p>
                            )}
                          </div>
                        </div>
                      ))}

                      {dayShifts.length === 0 && dayAbsences.length === 0 && (
                        <div className="text-center py-12">
                          <CalendarDays className="h-16 w-16 text-muted-foreground mx-auto mb-4 opacity-50" />
                          <p className="text-lg text-muted-foreground font-medium mb-2">
                            Nessun turno programmato
                          </p>
                          <p className="text-base text-muted-foreground">
                            Tocca il pulsante + per aggiungere un turno
                          </p>
                        </div>
                      )}
                    </div>
                  </CardContent>
                </Card>
              );
            })}
          </div>
        ) : viewMode === 'week' ? (
          // Vista settimanale ottimizzata
          <div className="space-y-4">
            {weekDays.map((day) => {
              const { shifts: dayShifts, absences: dayAbsences } = getDayEvents(day);
              const isCurrentDay = isToday(day);

              return (
                <Card
                  key={day.toISOString()}
                  role="button"
                  tabIndex={0}
                  className={`cursor-pointer transition-all duration-200 hover:shadow-lg active:scale-[0.98] ${
                    isCurrentDay ? 'ring-2 ring-primary shadow-lg' : 'shadow-sm'
                  }`}
                  onClick={() => onDayClick?.(day)}
                  onKeyDown={(e) => {
                    if (e.key === 'Enter' || e.key === ' ') {
                      e.preventDefault();
                      onDayClick?.(day);
                    }
                  }}
                  aria-label={`Giorno ${format(day, 'EEEE dd MMM', { locale: it })}`}
                >
                  <CardContent className="p-5">
                    {/* Header del giorno */}
                    <div className="flex items-start justify-between mb-4">
                      <div className="flex items-center gap-3 flex-1">
                        <div className={`w-14 h-14 rounded-lg flex items-center justify-center text-lg font-bold ${
                          isCurrentDay
                            ? 'bg-primary text-primary-foreground shadow-lg'
                            : 'bg-muted text-muted-foreground'
                        }`}>
                          <time dateTime={day.toISOString().split('T')[0]}>
                            {format(day, 'dd')}
                          </time>
                        </div>
                        <div className="flex-1 min-w-0">
                          <h3 className={`text-base font-bold truncate mb-1 ${isCurrentDay ? 'text-primary' : ''}`}>
                            <time dateTime={day.toISOString().split('T')[0]}>
                              {format(day, 'EEEE', { locale: it })}
                            </time>
                          </h3>
                          <time dateTime={day.toISOString().split('T')[0]} className="text-sm text-muted-foreground font-medium">
                            {format(day, 'dd MMM yyyy', { locale: it })}
                          </time>
                        </div>
                      </div>

                      <Button
                        variant="ghost"
                        size="sm"
                        className="h-9 w-9 p-0 ml-2 flex-shrink-0"
                        onClick={(e) => {
                          e.stopPropagation();
                          onAddShift?.(day);
                        }}
                      >
                        <Plus className="h-4 w-4" />
                      </Button>
                    </div>

                    {/* Eventi del giorno */}
                    <div className="space-y-3">
                      {dayShifts.map((shift) => (
                        <div
                          key={shift.id}
                          className="flex items-center justify-between p-3 bg-blue-50 dark:bg-blue-900 rounded-lg cursor-pointer hover:bg-blue-100 dark:hover:bg-blue-900 active:scale-[0.98] transition-all duration-150 border border-blue-100 dark:border-blue-800"
                          onClick={(e) => {
                            e.stopPropagation();
                            onShiftClick?.(shift);
                          }}
                        >
                          <div className="flex items-center gap-3 flex-1 min-w-0">
                            <div className="w-9 h-9 bg-blue-500 rounded-full flex items-center justify-center flex-shrink-0">
                              <Clock className="h-4 w-4 text-white" />
                            </div>
                            <div className="flex-1 min-w-0">
                              <p className="font-semibold text-sm truncate">{shift.userName}</p>
                              <p className="text-xs text-muted-foreground">
                                {shift.startTime} - {shift.endTime}
                              </p>
                            </div>
                          </div>
                          <Badge variant="secondary" className="text-xs px-2 py-1 font-semibold ml-2 flex-shrink-0">
                            {shift.hours}h
                          </Badge>
                        </div>
                      ))}

                      {dayAbsences.map((absence) => (
                        <div
                          key={absence.id}
                          className={`flex items-center gap-3 p-3 rounded-lg border ${
                            absence.type === 'VACATION'
                              ? 'bg-green-50 dark:bg-green-900 border-green-100 dark:border-green-800'
                              : absence.type === 'SICK_LEAVE'
                              ? 'bg-red-50 dark:bg-red-900 border-red-100 dark:border-red-800'
                              : 'bg-yellow-50 dark:bg-yellow-900 border-yellow-100 dark:border-yellow-800'
                          }`}
                        >
                          <div className={`w-9 h-9 rounded-full flex items-center justify-center flex-shrink-0 ${
                            absence.type === 'VACATION'
                              ? 'bg-green-500'
                              : absence.type === 'SICK_LEAVE'
                              ? 'bg-red-500'
                              : 'bg-yellow-500'
                          }`}>
                            <User className="h-4 w-4 text-white" />
                          </div>
                          <div className="flex-1 min-w-0">
                            <p className="font-semibold text-sm truncate">{absence.userName}</p>
                            <p className="text-xs text-muted-foreground capitalize">
                              {absence.type === 'VACATION' ? 'Ferie' :
                               absence.type === 'SICK_LEAVE' ? 'Malattia' :
                               absence.type === 'PERMISSION' ? 'Permesso' : 'Assenza'}
                            </p>
                          </div>
                        </div>
                      ))}

                      {dayShifts.length === 0 && dayAbsences.length === 0 && (
                        <div className="text-center py-8">
                          <CalendarIcon className="h-12 w-12 text-muted-foreground mx-auto mb-3 opacity-50" />
                          <p className="text-base text-muted-foreground font-medium mb-1">
                            Nessun turno programmato
                          </p>
                          <p className="text-sm text-muted-foreground">
                            Tocca il pulsante + per aggiungere un turno
                          </p>
                        </div>
                      )}
                    </div>
                  </CardContent>
                </Card>
              );
            })}
          </div>
        ) : (
          // Vista mese semplificata
          <div className="grid grid-cols-7 gap-2">
            {/* Header giorni settimana */}
            {['Lun', 'Mar', 'Mer', 'Gio', 'Ven', 'Sab', 'Dom'].map((day) => (
              <div key={day} className="p-3 text-center text-sm font-bold text-muted-foreground">
                {day}
              </div>
            ))}

            {/* Giorni del mese */}
            {monthDays.map((day) => {
              const { shifts: dayShifts, absences: dayAbsences } = getDayEvents(day);
              const isCurrentDay = isToday(day);
              const isCurrentMonth = day.getMonth() === currentDate.getMonth();

              return (
                <div
                  key={day.toISOString()}
                  role="button"
                  tabIndex={0}
                  className={`min-h-[80px] p-2 border rounded-lg cursor-pointer transition-all duration-150 active:scale-95 ${
                    isCurrentDay ? 'bg-primary text-primary-foreground shadow-lg' :
                    !isCurrentMonth ? 'text-muted-foreground bg-muted/30' : 'hover:bg-muted/50'
                  }`}
                  onClick={() => onDayClick?.(day)}
                  onKeyDown={(e) => {
                    if (e.key === 'Enter' || e.key === ' ') {
                      e.preventDefault();
                      onDayClick?.(day);
                    }
                  }}
                  aria-label={`Giorno ${format(day, 'dd MMMM yyyy', { locale: it })}`}
                >
                  <time dateTime={day.toISOString().split('T')[0]} className="text-lg font-bold mb-2">
                    {format(day, 'd')}
                  </time>
                  <div className="space-y-1">
                    {dayShifts.slice(0, 2).map((shift) => (
                      <div
                        key={shift.id}
                        className="text-xs bg-blue-500 text-white rounded px-2 py-1 truncate font-medium"
                        onClick={(e) => {
                          e.stopPropagation();
                          onShiftClick?.(shift);
                        }}
                      >
                        {shift.userName}
                      </div>
                    ))}
                    {dayAbsences.slice(0, 1).map((absence) => (
                      <div
                        key={absence.id}
                        className={`text-xs rounded px-2 py-1 truncate font-medium ${
                          absence.type === 'VACATION' ? 'bg-green-500 text-white' :
                          absence.type === 'SICK_LEAVE' ? 'bg-red-500 text-white' :
                          'bg-yellow-500 text-black'
                        }`}
                      >
                        {absence.userName}
                      </div>
                    ))}
                    {(dayShifts.length > 2 || dayAbsences.length > 1) && (
                      <div className="text-xs text-muted-foreground font-medium">
                        +{dayShifts.length - 2 + dayAbsences.length - 1}
                      </div>
                    )}
                  </div>
                </div>
              );
            })}
          </div>
        )}
      </div>

      {/* Legenda */}
      <div className="mt-8">
        <Card className="bg-card shadow-md p-6 mx-2">
          <h3 className="font-bold text-lg mb-4 text-center">Legenda</h3>
          <div className="grid grid-cols-2 gap-4">
            <div className="flex items-center gap-3">
              <div className="w-4 h-4 bg-blue-500 rounded-full"></div>
              <span className="text-base font-medium">Turno</span>
            </div>
            <div className="flex items-center gap-3">
              <div className="w-4 h-4 bg-green-500 rounded-full"></div>
              <span className="text-base font-medium">Ferie</span>
            </div>
            <div className="flex items-center gap-3">
              <div className="w-4 h-4 bg-red-500 rounded-full"></div>
              <span className="text-base font-medium">Malattia</span>
            </div>
            <div className="flex items-center gap-3">
              <div className="w-4 h-4 bg-yellow-500 rounded-full"></div>
              <span className="text-base font-medium">Permesso</span>
            </div>
          </div>
        </Card>
      </div>
    </div>
  );
}
