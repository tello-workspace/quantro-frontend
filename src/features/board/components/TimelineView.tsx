// src/features/board/components/TimelineView.tsx
'use client';

import React, { useMemo, useState } from 'react';
import { ChevronLeft, ChevronRight, Link as LinkIcon } from 'lucide-react';
import type { Task, Column, Priority } from '../services/boardService';
import { toDateKey } from '../services/calendarService';

interface TimelineViewProps {
  tasks: Task[];
  columns: Record<string, Column>;
  onTaskClick: (taskId: string) => void;
}

const PRIORITY_BAR: Record<Priority, string> = {
  URGENT: 'bg-red-500',
  HIGH: 'bg-orange-500',
  MEDIUM: 'bg-blue-500',
  LOW: 'bg-zinc-400',
};

const VISIBLE_DAYS = 21;
const DAY_WIDTH = 36; // px

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

function daysBetween(a: Date, b: Date): number {
  const MS_PER_DAY = 24 * 60 * 60 * 1000;
  return Math.round((b.getTime() - a.getTime()) / MS_PER_DAY);
}

// Kartlari zaman ekseninde gosteren basit bir Gantt gorunumu (Asana/ClickUp'taki
// Timeline'dan esinlenildi). Tam bir Gantt'tan farkli olarak bagimlilik oklari
// yerine bloklanmis kartlarda kucuk bir gosterge/tooltip kullanir - karmasik
// SVG baglanti cizgileri olmadan da "bu kart neyi bekliyor" bilgisini verir.
export const TimelineView: React.FC<TimelineViewProps> = ({ tasks, columns, onTaskClick }) => {
  const [cursor, setCursor] = useState(() => addDays(new Date(), -3));

  const days = useMemo(
    () => Array.from({ length: VISIBLE_DAYS }, (_, i) => addDays(cursor, i)),
    [cursor],
  );

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

  const grouped = useMemo(() => {
    const map = new Map<string, typeof scheduledTasks>();
    for (const task of scheduledTasks) {
      const list = map.get(task.columnId) ?? [];
      list.push(task);
      map.set(task.columnId, list);
    }
    return map;
  }, [scheduledTasks]);

  const rangeStart = days[0];
  const rangeEnd = days[days.length - 1];

  return (
    <div className="flex-1 min-h-0 flex flex-col px-4 pb-4 overflow-hidden">
      <div className="flex items-center gap-2 mb-2 shrink-0">
        <button
          type="button"
          onClick={() => setCursor((c) => addDays(c, -7))}
          className="p-1 rounded-md hover:bg-muted text-muted-foreground"
        >
          <ChevronLeft className="size-4" />
        </button>
        <button
          type="button"
          onClick={() => setCursor((c) => addDays(c, 7))}
          className="p-1 rounded-md hover:bg-muted text-muted-foreground"
        >
          <ChevronRight className="size-4" />
        </button>
        <button
          type="button"
          onClick={() => setCursor(addDays(new Date(), -3))}
          className="text-xs px-2 py-1 rounded-md border border-border text-muted-foreground hover:text-foreground hover:bg-muted"
        >
          Bugün
        </button>
        {unscheduledCount > 0 && (
          <span className="text-xs text-muted-foreground ml-auto">
            {unscheduledCount} kart tarih içermediği için gösterilmiyor
          </span>
        )}
      </div>

      <div className="flex-1 min-h-0 overflow-auto border border-border rounded-lg">
        <div style={{ minWidth: 200 + days.length * DAY_WIDTH }}>
          {/* Gun basliklari */}
          <div className="flex sticky top-0 z-10 bg-background border-b border-border">
            <div className="w-[200px] shrink-0 px-2 py-1.5 text-xs font-medium text-muted-foreground border-r border-border">
              Kart
            </div>
            {days.map((day) => {
              const key = toDateKey(day);
              return (
                <div
                  key={key}
                  style={{ width: DAY_WIDTH }}
                  className={`shrink-0 px-1 py-1.5 text-center text-[10px] border-r border-border/50 ${
                    key === todayKey ? 'bg-primary/10 font-semibold text-primary' : 'text-muted-foreground'
                  }`}
                >
                  {day.getDate()}
                </div>
              );
            })}
          </div>

          {/* Sutun bazli gruplar */}
          {Array.from(grouped.entries()).map(([columnId, colTasks]) => (
            <div key={columnId}>
              <div className="flex bg-muted/40 border-b border-border">
                <div className="px-2 py-1 text-xs font-medium text-foreground">
                  {columns[columnId]?.title ?? '—'} ({colTasks.length})
                </div>
              </div>
              {colTasks.map((task) => {
                const blockedByOpen = (task.blockedBy ?? []).filter(
                  (b) => (b.relationType ?? 'BLOCKS') === 'BLOCKS',
                );
                const startOffset = Math.max(daysBetween(rangeStart, task.barStart), 0);
                const endOffset = Math.min(daysBetween(rangeStart, task.barEnd), days.length - 1);
                const visible = task.barEnd >= rangeStart && task.barStart <= rangeEnd;

                return (
                  <div key={task.id} className="flex border-b border-border/50 hover:bg-accent/30">
                    <button
                      type="button"
                      onClick={() => onTaskClick(task.id)}
                      className="w-[200px] shrink-0 px-2 py-2 text-left text-xs text-foreground truncate flex items-center gap-1"
                      title={task.title}
                    >
                      {blockedByOpen.length > 0 && (
                        <LinkIcon
                          className="size-3 text-amber-500 shrink-0"
                          aria-label={`Bekliyor: ${blockedByOpen.map((b) => b.title).join(', ')}`}
                        />
                      )}
                      <span className="truncate">{task.title}</span>
                    </button>
                    <div className="relative flex-1" style={{ height: 32 }}>
                      {visible && endOffset >= startOffset && (
                        <button
                          type="button"
                          onClick={() => onTaskClick(task.id)}
                          className={`absolute top-1.5 h-5 rounded-full ${PRIORITY_BAR[task.priority ?? 'MEDIUM']} opacity-80 hover:opacity-100 transition-opacity`}
                          style={{
                            left: startOffset * DAY_WIDTH + 2,
                            width: Math.max((endOffset - startOffset + 1) * DAY_WIDTH - 4, 8),
                          }}
                          title={`${task.title} (${task.barStart.toLocaleDateString('tr-TR')} - ${task.barEnd.toLocaleDateString('tr-TR')})`}
                        />
                      )}
                    </div>
                  </div>
                );
              })}
            </div>
          ))}

          {grouped.size === 0 && (
            <p className="text-sm text-muted-foreground text-center py-8">
              Başlangıç veya teslim tarihi olan kart yok.
            </p>
          )}
        </div>
      </div>
    </div>
  );
};
