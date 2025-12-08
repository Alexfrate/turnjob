import { Metadata } from "next";
import { CalendarView } from "@/components/calendar/calendar-view";

export const metadata: Metadata = {
    title: "Turnjob - Calendario",
};

export default function CalendarPage() {
    return (
        <div className="h-[calc(100vh-8rem)] flex flex-col">
            <div className="mb-6">
                <h1 className="text-3xl font-bold tracking-tight">Calendario</h1>
                <p className="text-muted-foreground">
                    Gestisci i turni e visualizza le disponibilità del team.
                </p>
            </div>

            <div className="flex-1 min-h-0">
                <CalendarView />
            </div>
        </div>
    );
}
