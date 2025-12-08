'use client';

import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Badge } from '@/components/ui/badge';
import { Clock, Calendar, CheckCircle, AlertCircle } from 'lucide-react';
import { EmployeeStatus } from '@/hooks/use-calendar';

interface EmployeeStatusPanelProps {
  employees: EmployeeStatus[];
}

const getStatusConfig = (status: EmployeeStatus['status']) => {
  switch (status) {
    case 'WORKING':
      return {
        color: 'bg-green-500',
        label: 'In turno',
        icon: CheckCircle
      };
    case 'VACATION':
      return {
        color: 'bg-blue-500',
        label: 'In ferie',
        icon: Calendar
      };
    case 'SICK_LEAVE':
      return {
        color: 'bg-red-500',
        label: 'Malattia',
        icon: AlertCircle
      };
    case 'PERMISSION':
      return {
        color: 'bg-yellow-500',
        label: 'Permesso',
        icon: Clock
      };
    case 'DAY_OFF':
      return {
        color: 'bg-gray-500',
        label: 'Riposo',
        icon: Calendar
      };
    default:
      return {
        color: 'bg-gray-400',
        label: 'Fuori servizio',
        icon: Clock
      };
  }
};

export default function EmployeeStatusPanel({ employees }: EmployeeStatusPanelProps) {
  return (
    <Card>
      <CardHeader>
        <CardTitle className="flex items-center gap-2">
          <Clock className="h-5 w-5" />
          Stato Dipendenti
        </CardTitle>
      </CardHeader>
      <CardContent>
        <div className="space-y-4">
          {employees.map((employee) => {
            const statusConfig = getStatusConfig(employee.status);
            const StatusIcon = statusConfig.icon;

            return (
              <div key={employee.userId} className="flex items-center justify-between p-3 border rounded-lg">
                <div className="flex items-center gap-3">
                  <div className="h-8 w-8 rounded-full bg-primary-500 flex items-center justify-center text-white text-sm font-medium">
                    {employee.userName.split(' ').map(n => n[0]).join('')}
                  </div>
                  <div>
                    <p className="font-medium">{employee.userName}</p>
                    <div className="flex items-center gap-2 mt-1">
                      <Badge className={`${statusConfig.color} text-white text-xs`}>
                        <StatusIcon className="h-3 w-3 mr-1" />
                        {statusConfig.label}
                      </Badge>
                    </div>
                  </div>
                </div>

                <div className="text-right text-sm text-muted-foreground">
                  {employee.currentShift && (
                    <div>
                      <p className="font-medium text-foreground">
                        {employee.currentShift.startTime} - {employee.currentShift.endTime}
                      </p>
                      <p>{employee.currentShift.hours}h oggi</p>
                    </div>
                  )}
                  {employee.nextShift && !employee.currentShift && (
                    <div>
                      <p>Prossimo turno:</p>
                      <p className="font-medium text-foreground">
                        {new Date(employee.nextShift.date).toLocaleDateString('it-IT')}
                      </p>
                    </div>
                  )}
                  {!employee.currentShift && !employee.nextShift && (
                    <p>Nessun turno programmato</p>
                  )}
                </div>
              </div>
            );
          })}

          {employees.length === 0 && (
            <div className="text-center py-8 text-muted-foreground">
              <Clock className="h-12 w-12 mx-auto mb-2 opacity-50" />
              <p>Nessun dipendente trovato</p>
            </div>
          )}
        </div>
      </CardContent>
    </Card>
  );
}
