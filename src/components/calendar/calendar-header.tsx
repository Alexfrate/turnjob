import { ChevronLeft, ChevronRight } from "lucide-react";
import { Button } from "@/components/ui/button";
import { useCalendar } from "@/hooks/use-calendar";
import { capitalize } from "@/lib/utils";

interface CalendarHeaderProps {
    currentDate: Date;
    nextMonth: () => void;
    prevMonth: () => void;
    goToToday: () => void;
    weekDays: string[];
    dateFnsLocale: any;
    format: any;
}

export function CalendarHeader({
    currentDate,
    nextMonth,
    prevMonth,
    goToToday,
    weekDays,
    dateFnsLocale,
    format
}: CalendarHeaderProps) {
    return (
        <div className="flex flex-col gap-4 mb-4">
            <div className="flex items-center justify-between">
                <h2 className="text-2xl font-bold text-neutral-900 dark:text-neutral-100">
                    {capitalize(format(currentDate, 'MMMM yyyy', { locale: dateFnsLocale }))}
                </h2>
                <div className="flex items-center gap-2">
                    <Button variant="outline" size="sm" onClick={goToToday}>
                        Oggi
                    </Button>
                    <div className="flex items-center rounded-md border border-neutral-200 dark:border-neutral-800 bg-white dark:bg-neutral-900">
                        <Button variant="ghost" size="icon" onClick={prevMonth} className="h-8 w-8 rounded-none rounded-l-md">
                            <ChevronLeft className="h-4 w-4" />
                        </Button>
                        <div className="w-[1px] h-4 bg-neutral-200 dark:bg-neutral-800" />
                        <Button variant="ghost" size="icon" onClick={nextMonth} className="h-8 w-8 rounded-none rounded-r-md">
                            <ChevronRight className="h-4 w-4" />
                        </Button>
                    </div>
                </div>
            </div>

            <div className="grid grid-cols-7 gap-1">
                {weekDays.map((day) => (
                    <div key={day} className="text-center text-sm font-medium text-neutral-500 dark:text-neutral-400 py-2">
                        {capitalize(day)}
                    </div>
                ))}
            </div>
        </div>
    );
}
