'use client';

import { useSearchParams } from 'next/navigation';
import { useMemo } from 'react';
import { PlanningChat } from '@/components/turni/chat';

// Utility functions for week calculations
function getWeekStart(date: Date): Date {
  const d = new Date(date);
  const day = d.getDay();
  const diff = d.getDate() - day + (day === 0 ? -6 : 1);
  d.setDate(diff);
  d.setHours(0, 0, 0, 0);
  return d;
}

function getWeekEnd(date: Date): Date {
  const start = getWeekStart(date);
  const end = new Date(start);
  end.setDate(start.getDate() + 6);
  return end;
}

export default function AITurniPage() {
  const searchParams = useSearchParams();
  const weekParam = searchParams.get('week');

  const { weekStart, weekEnd } = useMemo(() => {
    let baseDate = new Date();

    if (weekParam) {
      const parsed = new Date(weekParam);
      if (!isNaN(parsed.getTime())) {
        baseDate = parsed;
      }
    }

    const start = getWeekStart(baseDate);
    const end = getWeekEnd(baseDate);

    return {
      weekStart: start.toISOString().split('T')[0],
      weekEnd: end.toISOString().split('T')[0],
    };
  }, [weekParam]);

  return <PlanningChat weekStart={weekStart} weekEnd={weekEnd} />;
}
