// src/features/board/components/CalendarView.tsx
'use client';

import React, { useMemo, useState } from 'react';
import { ChevronLeft, ChevronRight } from 'lucide-react';
import type { Task, Priority } from '../services/boardService';

const PRIORITY_DOT: Record<Priority, string> = {
  URGENT: 'bg-red-500',
  HIGH: 'bg-orange-500',
  MEDIUM: 'bg-blue-500',
  LOW: 'bg-zinc-400',
};

const WEEKDAY_LABELS = ['Pzt', 'Sal', 'Çar', 'Per', 'Cum', 'Cmt', 'Paz'];
const MAX_VISIBLE_PER_DAY = 3;

function toDateKey(d: Date): string {
  return `${d.getFullYear()}-${String(d.getMonth() + 1).padStart(2, '0')}-${String(d.getDate()).padStart(2, '0')}`;
}

function startOfMonth(d: Date): Date {
  return new Date(d.getFullYear(), d.getMonth(), 1);
}

interface CalendarViewProps {
  tasks: Task[];
  onTaskClick: (taskId: string) => void;
}

// Trello/Jira'daki "Calendar" görünümüne benzer: sadece dueDate'i olan
// kartlar günlerine yerleştirilir, tarihsiz kartlar hiç gösterilmez (pano
// zaten onları gösteriyor). Board endpoint'i dueDate'i "YYYY-MM-DD" olarak
// (saat/timezone olmadan) döndürüyor, bu yüzden gün eşleştirmesi basit bir
// string karşılaştırması.
export function CalendarView({ tasks, onTaskClick }: CalendarViewProps) {
  const [cursor, setCursor] = useState(() => startOfMonth(new Date()));

  const tasksByDay = useMemo(() => {
    const map = new Map<string, Task[]>();
    for (const task of tasks) {
      if (!task.dueDate) continue;
      const key = task.dueDate.slice(0, 10);
      const list = map.get(key);
      if (list) list.push(task);
      else map.set(key, [task]);
    }
    return map;
  }, [tasks]);

  const days = useMemo(() => {
    const year = cursor.getFullYear();
    const month = cursor.getMonth();
    const firstOfMonth = new Date(year, month, 1);
    // JS getDay(): 0=Pazar..6=Cmt. Haftayı Pazartesi'den başlatmak için kaydırıyoruz.
    const firstWeekday = (firstOfMonth.getDay() + 6) % 7;
    const gridStart = new Date(year, month, 1 - firstWeekday);

    return Array.from({ length: 42 }, (_, i) => new Date(gridStart.getFullYear(), gridStart.getMonth(), gridStart.getDate() + i));
  }, [cursor]);

  const todayKey = toDateKey(new Date());
  const monthLabel = cursor.toLocaleDateString('tr-TR', { month: 'long', year: 'numeric' });

  return (
    <div className="flex flex-col h-full min-h-0 px-4 pb-4">
      <div className="flex items-center justify-between py-2 shrink-0">
        <h2 className="text-base font-semibold text-foreground capitalize">{monthLabel}</h2>
        <div className="flex items-center gap-1">
          <button
            type="button"
            onClick={() => setCursor((c) => new Date(c.getFullYear(), c.getMonth() - 1, 1))}
            className="p-1.5 rounded-lg hover:bg-accent text-muted-foreground hover:text-foreground transition-colors"
            aria-label="Önceki ay"
          >
            <ChevronLeft className="size-4" />
          </button>
          <button
            type="button"
            onClick={() => setCursor(startOfMonth(new Date()))}
            className="px-2.5 py-1 text-xs font-medium rounded-lg hover:bg-accent text-muted-foreground hover:text-foreground transition-colors"
          >
            Bugün
          </button>
          <button
            type="button"
            onClick={() => setCursor((c) => new Date(c.getFullYear(), c.getMonth() + 1, 1))}
            className="p-1.5 rounded-lg hover:bg-accent text-muted-foreground hover:text-foreground transition-colors"
            aria-label="Sonraki ay"
          >
            <ChevronRight className="size-4" />
          </button>
        </div>
      </div>

      <div className="grid grid-cols-7 gap-px bg-border rounded-t-lg overflow-hidden shrink-0">
        {WEEKDAY_LABELS.map((label) => (
          <div
            key={label}
            className="bg-muted/50 py-1.5 text-center text-[11px] font-medium text-muted-foreground uppercase tracking-wide"
          >
            {label}
          </div>
        ))}
      </div>

      <div className="grid grid-cols-7 grid-rows-6 gap-px bg-border flex-1 min-h-0 rounded-b-lg overflow-hidden">
        {days.map((date) => {
          const key = toDateKey(date);
          const inMonth = date.getMonth() === cursor.getMonth();
          const dayTasks = tasksByDay.get(key) ?? [];
          const isToday = key === todayKey;

          return (
            <div
              key={key}
              className={`bg-background p-1.5 flex flex-col gap-1 min-h-0 overflow-hidden ${inMonth ? '' : 'opacity-40'}`}
            >
              <span
                className={
                  isToday
                    ? 'inline-flex items-center justify-center size-5 rounded-full bg-primary text-primary-foreground text-xs font-medium shrink-0'
                    : 'text-xs font-medium text-muted-foreground shrink-0'
                }
              >
                {date.getDate()}
              </span>
              <div className="flex flex-col gap-1 overflow-y-auto min-h-0 no-scrollbar">
                {dayTasks.slice(0, MAX_VISIBLE_PER_DAY).map((task) => (
                  <button
                    key={task.id}
                    type="button"
                    onClick={() => onTaskClick(task.id)}
                    title={task.title}
                    className="flex items-center gap-1.5 text-left rounded-md px-1.5 py-1 text-[11px] bg-accent/60 hover:bg-accent transition-colors truncate"
                  >
                    <span className={`size-1.5 rounded-full shrink-0 ${PRIORITY_DOT[task.priority ?? 'MEDIUM']}`} />
                    <span className="truncate text-foreground">{task.title}</span>
                  </button>
                ))}
                {dayTasks.length > MAX_VISIBLE_PER_DAY && (
                  <span className="text-[10px] text-muted-foreground px-1.5">
                    +{dayTasks.length - MAX_VISIBLE_PER_DAY} daha
                  </span>
                )}
              </div>
            </div>
          );
        })}
      </div>
    </div>
  );
}
