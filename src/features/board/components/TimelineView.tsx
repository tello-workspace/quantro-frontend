// src/features/board/components/TimelineView.tsx
'use client';

import React, { useMemo, useState } from 'react';
import { ChevronLeft, ChevronRight, Link as LinkIcon } from 'lucide-react';
import type { Task, Column, Priority } from '../services/boardService';
import { toDateKey, buildWeekGrid } from '../services/calendarService';

interface TimelineViewProps {
  tasks: Task[];
  columns: Record<string, Column>;
  onTaskClick: (taskId: string) => void;
}

const PRIORITY_BORDER: Record<Priority, string> = {
  URGENT: 'border-l-red-500',
  HIGH: 'border-l-orange-500',
  MEDIUM: 'border-l-blue-500',
  LOW: 'border-l-zinc-400',
};

const PRIORITY_ORDER: Record<Priority, number> = { URGENT: 0, HIGH: 1, MEDIUM: 2, LOW: 3 };

function addDays(date: Date, n: number): Date {
  const d = new Date(date);
  d.setDate(d.getDate() + n);
  return d;
}

function parseLocalDate(dateStr: string): Date {
  // "YYYY-MM-DD" veya ISO string - saat dilimini karistirmadan sadece gun bazinda kars
  const key = dateStr.slice(0, 10);
  const [y, m, d] = key.split('-').map(Number);
  return new Date(y, (m ?? 1) - 1, d ?? 1);
}

// Gantt cubuklari/koordinat hesabi kafa karistirici bulundugu icin (Asana'nin
// Timeline'i yerine) daha basit bir "gun sutunu" duzenine gecildi: her gun
// kendi dikey sutunu, o araliga denk gelen kartlar altinda kucuk kartlar
// halinde listeleniyor. Bir kart birden fazla gune (baslangic->bitis) denk
// geliyorsa, ARALIKTAKI HER SUTUNDA belirir - konum/genislik matematigi
// yerine "hangi sutunlarda goruldugu" tek basina sureyi anlatir.
export const TimelineView: React.FC<TimelineViewProps> = ({ tasks, columns, onTaskClick }) => {
  const [cursor, setCursor] = useState(() => new Date());

  const days = useMemo(() => buildWeekGrid(cursor), [cursor]);
  const todayKey = toDateKey(new Date());

  const { scheduledTasks, unscheduledCount } = useMemo(() => {
    const scheduled: (Task & { barStart: Date; barEnd: Date })[] = [];
    let unscheduled = 0;
    for (const task of tasks) {
      if (!task.startDate && !task.dueDate) {
        unscheduled += 1;
        continue;
      }
      const start = task.startDate ? parseLocalDate(task.startDate) : parseLocalDate(task.dueDate!);
      const end = task.dueDate ? parseLocalDate(task.dueDate) : parseLocalDate(task.startDate!);
      scheduled.push({ ...task, barStart: start <= end ? start : end, barEnd: start <= end ? end : start });
    }
    return { scheduledTasks: scheduled, unscheduledCount: unscheduled };
  }, [tasks]);

  // Her gun sutunu icin: o araliga (barStart..barEnd) denk gelen kartlar,
  // once oncelige gore siralanmis.
  const tasksByDay = useMemo(() => {
    const map = new Map<string, typeof scheduledTasks>();
    for (const day of days) {
      const key = toDateKey(day);
      const dayTasks = scheduledTasks
        .filter((t) => t.barStart <= day && t.barEnd >= day)
        .sort((a, b) => PRIORITY_ORDER[a.priority ?? 'MEDIUM'] - PRIORITY_ORDER[b.priority ?? 'MEDIUM']);
      map.set(key, dayTasks);
    }
    return map;
  }, [days, scheduledTasks]);

  const weekLabel = `${days[0].toLocaleDateString('tr-TR', { day: 'numeric', month: 'long' })} – ${days[6].toLocaleDateString('tr-TR', { day: 'numeric', month: 'long' })}`;

  return (
    <div className="flex-1 min-h-0 flex flex-col px-4 pb-4 overflow-hidden">
      <div className="flex items-center gap-2 mb-2 shrink-0">
        <button
          type="button"
          onClick={() => setCursor((c) => addDays(c, -7))}
          className="p-1 rounded-md hover:bg-muted text-muted-foreground"
          aria-label="Önceki hafta"
        >
          <ChevronLeft className="size-4" />
        </button>
        <button
          type="button"
          onClick={() => setCursor((c) => addDays(c, 7))}
          className="p-1 rounded-md hover:bg-muted text-muted-foreground"
          aria-label="Sonraki hafta"
        >
          <ChevronRight className="size-4" />
        </button>
        <button
          type="button"
          onClick={() => setCursor(new Date())}
          className="text-xs px-2 py-1 rounded-md border border-border text-muted-foreground hover:text-foreground hover:bg-muted"
        >
          Bugün
        </button>
        <span className="text-sm font-medium text-foreground ml-1">{weekLabel}</span>
        {unscheduledCount > 0 && (
          <span className="text-xs text-muted-foreground ml-auto">
            {unscheduledCount} kart tarih içermediği için gösterilmiyor
          </span>
        )}
      </div>

      <div className="flex-1 min-h-0 overflow-auto">
        <div className="grid grid-cols-7 gap-2 min-w-[840px] h-full">
          {days.map((day) => {
            const key = toDateKey(day);
            const dayTasks = tasksByDay.get(key) ?? [];
            const isToday = key === todayKey;

            return (
              <div
                key={key}
                className={`flex flex-col rounded-lg border ${
                  isToday ? 'border-primary/50 bg-primary/5' : 'border-border bg-muted/20'
                }`}
              >
                <div
                  className={`px-2 py-1.5 text-center border-b ${
                    isToday ? 'border-primary/30' : 'border-border'
                  }`}
                >
                  <div className="text-[10px] text-muted-foreground">
                    {day.toLocaleDateString('tr-TR', { weekday: 'short' })}
                  </div>
                  <div className={`text-sm font-semibold ${isToday ? 'text-primary' : 'text-foreground'}`}>
                    {day.getDate()}
                  </div>
                </div>

                <div className="flex-1 min-h-0 overflow-y-auto p-1.5 space-y-1.5">
                  {dayTasks.map((task) => {
                    const isMultiDay = task.barStart.getTime() !== task.barEnd.getTime();
                    const blockedByOpen = (task.blockedBy ?? []).filter(
                      (b) => (b.relationType ?? 'BLOCKS') === 'BLOCKS',
                    );

                    return (
                      <button
                        key={task.id}
                        type="button"
                        onClick={() => onTaskClick(task.id)}
                        className={`w-full text-left rounded-md border-l-4 bg-background border border-border/60 px-2 py-1.5 shadow-sm hover:shadow transition-shadow ${
                          PRIORITY_BORDER[task.priority ?? 'MEDIUM']
                        }`}
                      >
                        <div className="flex items-start gap-1">
                          {blockedByOpen.length > 0 && (
                            <LinkIcon
                              className="size-3 text-amber-500 shrink-0 mt-0.5"
                              aria-label={`Bekliyor: ${blockedByOpen.map((b) => b.title).join(', ')}`}
                            />
                          )}
                          <span className="text-xs text-foreground line-clamp-2">{task.title}</span>
                        </div>
                        <div className="text-[10px] text-muted-foreground mt-0.5 truncate">
                          {columns[task.columnId]?.title ?? '—'}
                          {isMultiDay &&
                            ` · ${task.barStart.toLocaleDateString('tr-TR', { day: 'numeric', month: 'short' })} → ${task.barEnd.toLocaleDateString('tr-TR', { day: 'numeric', month: 'short' })}`}
                        </div>
                      </button>
                    );
                  })}
                  {dayTasks.length === 0 && (
                    <p className="text-[11px] text-muted-foreground/60 text-center py-2">—</p>
                  )}
                </div>
              </div>
            );
          })}
        </div>
      </div>
    </div>
  );
};
