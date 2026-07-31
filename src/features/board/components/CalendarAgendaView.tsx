// src/features/board/components/CalendarAgendaView.tsx
'use client';

import React, { useMemo } from 'react';
import type { Task, Priority } from '../services/boardService';

// BoardFilters'teki PRIORITIES ile aynı renk eşlemesi (tekrar etmemek için
// burada lokal tutuyoruz; BoardFilters kendi renkleriyle ayrı yaşıyor).
const PRIORITY_DOT: Record<Priority, string> = {
  URGENT: 'bg-red-500',
  HIGH: 'bg-orange-500',
  MEDIUM: 'bg-blue-500',
  LOW: 'bg-zinc-400',
};

function toDateKey(d: Date): string {
  return `${d.getFullYear()}-${String(d.getMonth() + 1).padStart(2, '0')}-${String(d.getDate()).padStart(2, '0')}`;
}

// Haftayı Pazartesi'den başlatır (CalendarView.startOfWeek ile aynı mantık).
function startOfWeek(d: Date): Date {
  const weekday = (d.getDay() + 6) % 7;
  return new Date(d.getFullYear(), d.getMonth(), d.getDate() - weekday);
}

function addDays(d: Date, n: number): Date {
  return new Date(d.getFullYear(), d.getMonth(), d.getDate() + n);
}

// Bugüne göre "Bugün", "Yarın", "3 gün sonra", "2 hafta içinde" gibi bağıl
// etiket. Kesin tarih stringi title attribute'unda verilir.
function relativeDayLabel(key: string, todayKey: string): string {
  const [y, m, d] = key.split('-').map(Number);
  const [ty, tm, td] = todayKey.split('-').map(Number);
  const a = Date.UTC(y, m - 1, d);
  const b = Date.UTC(ty, tm - 1, td);
  const diffDays = Math.round((a - b) / 86400000);

  if (diffDays === 0) return 'Bugün';
  if (diffDays === 1) return 'Yarın';
  if (diffDays === -1) return 'Dün';
  if (diffDays === 2) return '2 gün sonra';
  if (diffDays === -2) return '2 gün önce';

  const future = diffDays > 0;
  const abs = Math.abs(diffDays);
  if (abs < 7) return `${abs} gün ${future ? 'sonra' : 'önce'}`;
  const weeks = Math.round(abs / 7);
  if (weeks < 5) return `${weeks} hafta ${future ? 'sonra' : 'önce'}`;
  const months = Math.round(abs / 30);
  return `${months} ay ${future ? 'sonra' : 'önce'}`;
}

interface CalendarAgendaViewProps {
  tasks: Task[];
  doneColumnIds: Set<string>;
  onTaskClick: (taskId: string) => void;
}

interface AgendaSection {
  id: string;
  title: string;
  tasks: Task[];
}

export const CalendarAgendaView: React.FC<CalendarAgendaViewProps> = ({
  tasks,
  doneColumnIds,
  onTaskClick,
}) => {
  const today = new Date();
  const todayKey = toDateKey(today);
  const tomorrowKey = toDateKey(addDays(today, 1));
  // Bu haftanın sonu (Pazar) — Pazartesi başlangıçlı.
  const weekEndKey = toDateKey(addDays(startOfWeek(today), 6));

  const sections: AgendaSection[] = useMemo(() => {
    const bucket = {
      overdue: [] as Task[],
      today: [] as Task[],
      tomorrow: [] as Task[],
      thisWeek: [] as Task[],
      future: [] as Task[],
      noDate: [] as Task[],
    };

    for (const task of tasks) {
      const key = task.dueDate?.slice(0, 10);
      if (!key) {
        bucket.noDate.push(task);
        continue;
      }
      const isDone = doneColumnIds.has(task.columnId);
      if (!isDone && key < todayKey) {
        bucket.overdue.push(task);
      } else if (key === todayKey) {
        bucket.today.push(task);
      } else if (key === tomorrowKey) {
        bucket.tomorrow.push(task);
      } else if (key > todayKey && key <= weekEndKey) {
        bucket.thisWeek.push(task);
      } else if (key > weekEndKey) {
        bucket.future.push(task);
      }
      // Geçmişte bitmiş bir kart (isDone) hiçbir bölümde görünmez — zaten panoda.
    }

    const sortByDue = (a: Task, b: Task) =>
      (a.dueDate ?? '').localeCompare(b.dueDate ?? '');

    const out: AgendaSection[] = [];
    if (bucket.overdue.length > 0)
      out.push({ id: 'overdue', title: 'Gecikmiş', tasks: bucket.overdue.sort(sortByDue) });
    out.push({ id: 'today', title: 'Bugün', tasks: bucket.today.sort(sortByDue) });
    out.push({ id: 'tomorrow', title: 'Yarın', tasks: bucket.tomorrow.sort(sortByDue) });
    if (bucket.thisWeek.length > 0)
      out.push({ id: 'thisWeek', title: 'Bu hafta', tasks: bucket.thisWeek.sort(sortByDue) });
    if (bucket.future.length > 0)
      out.push({ id: 'future', title: 'Gelecek', tasks: bucket.future.sort(sortByDue) });
    if (bucket.noDate.length > 0)
      out.push({ id: 'noDate', title: 'Tarihsiz', tasks: bucket.noDate });

    return out;
  }, [tasks, doneColumnIds, todayKey, tomorrowKey, weekEndKey]);

  const emptyMessage = tasks.length === 0
    ? 'Henüz kart yok. Boş bir güne tıklayarak kart oluşturabilirsin.'
    : 'Bu görünümde gösterilecek kart yok.';

  return (
    <div className="flex flex-col h-full min-h-0 w-full flex-1 px-4 pb-4 overflow-y-auto">
      <div className="py-2 shrink-0">
        <h2 className="text-base font-semibold text-foreground">Liste</h2>
      </div>

      {sections.length === 0 ? (
        <p className="text-sm text-muted-foreground py-8 text-center">{emptyMessage}</p>
      ) : (
        <div className="space-y-5 pb-2">
          {sections.map((section) => (
            <div key={section.id}>
              <div className="flex items-center gap-2 mb-1.5">
                <h3
                  className={`text-xs font-semibold uppercase tracking-wide ${
                    section.id === 'overdue' ? 'text-red-600 dark:text-red-400' : 'text-muted-foreground'
                  }`}
                >
                  {section.title}
                </h3>
                <span className="text-[10px] font-medium px-1.5 py-0.5 rounded-full bg-muted text-muted-foreground">
                  {section.tasks.length}
                </span>
                {section.id === 'overdue' && (
                  <span className="text-[10px] text-red-500/80 font-medium">— bitmesi gerekiyordu</span>
                )}
              </div>

              <div className="space-y-0.5">
                {section.tasks.map((task) => {
                  const isDone = doneColumnIds.has(task.columnId);
                  return (
                    <button
                      key={task.id}
                      type="button"
                      onClick={() => onTaskClick(task.id)}
                      title={`${task.title} — ${task.dueDate ?? 'tarih yok'}`}
                      className={`group w-full flex items-center gap-2 rounded-lg px-2 py-1.5 text-left text-sm transition-colors hover:bg-accent/50 ${
                        isDone ? 'opacity-60' : ''
                      }`}
                    >
                      <span className={`size-2 rounded-full shrink-0 ${PRIORITY_DOT[task.priority ?? 'MEDIUM']}`} />
                      <span
                        className={`flex-1 min-w-0 truncate ${
                          isDone
                            ? 'text-muted-foreground line-through'
                            : section.id === 'overdue'
                              ? 'text-red-700 dark:text-red-400'
                              : 'text-foreground'
                        }`}
                      >
                        {task.title}
                      </span>
                      {task.dueDate && (
                        <span className="shrink-0 text-[10px] text-muted-foreground">
                          {relativeDayLabel(task.dueDate.slice(0, 10), todayKey)}
                        </span>
                      )}
                    </button>
                  );
                })}
              </div>
            </div>
          ))}
        </div>
      )}
    </div>
  );
};
