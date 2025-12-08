"use client";

import { useCalendar } from "@/hooks/use-calendar";
import { CalendarHeader } from "./calendar-header";
import { CalendarDay } from "./calendar-day";

export function CalendarView() {
    const {
        currentDate,
        dateRange,
        handleDateSelect,
        nextMonth,
        prevMonth,
        goToToday,
        daysInMonth,
        weekDays,
        dateFnsLocale,
        format,
        getDayStatus
    } = useCalendar();

    return (
        <div className="flex flex-col h-full">
            <CalendarHeader
                currentDate={currentDate}
                nextMonth={nextMonth}
                prevMonth={prevMonth}
                goToToday={goToToday}
                weekDays={weekDays}
                dateFnsLocale={dateFnsLocale}
                format={format}
            />

            <div className="grid grid-cols-7 gap-px bg-neutral-200 dark:bg-neutral-800 border border-neutral-200 dark:border-neutral-800 rounded-lg overflow-hidden">
                {daysInMonth.map((day, index) => (
                    <CalendarDay
                        key={day.toISOString()}
                        day={day}
                        currentDate={currentDate}
                        dateRange={dateRange}
                        onSelect={handleDateSelect}
                        dateFnsLocale={dateFnsLocale}
                        status={getDayStatus(day)}
                    />
                ))}
            </div>
        </div>
    );
}
