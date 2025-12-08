import { cn } from "@/lib/utils";
import { format, isSameMonth, isToday, isSameDay, isWithinInterval } from "date-fns";
import { DateRange } from "@/hooks/use-calendar";

interface CalendarDayProps {
    day: Date;
    currentDate: Date;
    dateRange: DateRange;
    onSelect: (date: Date) => void;
    dateFnsLocale: any;
    status?: { type: 'full' | 'partial' | 'free', label: string };
}

export function CalendarDay({
    day,
    currentDate,
    dateRange,
    onSelect,
    dateFnsLocale,
    status
}: CalendarDayProps) {
    const isCurrentMonth = isSameMonth(day, currentDate);
    const isTodayDate = isToday(day);

    const isSelectedStart = dateRange.from ? isSameDay(day, dateRange.from) : false;
    const isSelectedEnd = dateRange.to ? isSameDay(day, dateRange.to) : false;
    const isSelected = isSelectedStart || isSelectedEnd;

    const isInRange = dateRange.from && dateRange.to
        ? isWithinInterval(day, { start: dateRange.from, end: dateRange.to })
        : false;

    return (
        <div
            onClick={() => onSelect(day)}
            className={cn(
                "min-h-[120px] p-2 border border-neutral-200 dark:border-neutral-800 bg-white dark:bg-neutral-900 transition-colors cursor-pointer hover:bg-neutral-50 dark:hover:bg-neutral-800/50 relative",
                !isCurrentMonth && "bg-neutral-50/50 dark:bg-neutral-900/50 text-neutral-400 dark:text-neutral-600",
                isInRange && "bg-primary-50 dark:bg-primary-900/20",
                isSelected && "bg-primary-100 dark:bg-primary-900/40 z-10",
            )}
        >
            <div className="flex justify-between items-start relative z-20">
                <span
                    className={cn(
                        "text-sm font-medium h-7 w-7 flex items-center justify-center rounded-full",
                        isTodayDate && !isSelected && "bg-neutral-200 dark:bg-neutral-700",
                        isSelected
                            ? "bg-primary-600 text-white"
                            : "text-neutral-700 dark:text-neutral-300"
                    )}
                >
                    {format(day, 'd')}
                </span>

                {status && (
                    <div className={cn(
                        "h-2 w-2 rounded-full",
                        status.type === 'full' && "bg-red-500",
                        status.type === 'partial' && "bg-yellow-500",
                        status.type === 'free' && "bg-green-500",
                    )} />
                )}
            </div>

            {status && (
                <div className="mt-2 space-y-1 relative z-20">
                    <div className={cn(
                        "text-xs px-1 py-0.5 rounded truncate",
                        status.type === 'full' && "bg-red-100 text-red-700 dark:bg-red-900/30 dark:text-red-400",
                        status.type === 'partial' && "bg-yellow-100 text-yellow-700 dark:bg-yellow-900/30 dark:text-yellow-400",
                        status.type === 'free' && "bg-green-100 text-green-700 dark:bg-green-900/30 dark:text-green-400",
                    )}>
                        {status.label}
                    </div>
                </div>
            )}
        </div>
    );
}
