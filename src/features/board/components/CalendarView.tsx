// src/features/board/components/CalendarView.tsx
'use client';

import React, { useMemo, useState } from 'react';
import {
  DndContext,
  DragEndEvent,
  DragOverlay,
  DragStartEvent,
  PointerSensor,
  useDraggable,
  useDroppable,
  useSensor,
  useSensors,
} from '@dnd-kit/core';
import { CSS } from '@dnd-kit/utilities';
import { ChevronLeft, ChevronRight } from 'lucide-react';
import type { Task, Priority } from '../services/boardService';
import { toDateKey, buildMonthGrid, buildWeekGrid } from '../services/calendarService';

const PRIORITY_DOT: Record<Priority, string> = {
  URGENT: 'bg-red-500',
  HIGH: 'bg-orange-500',
  MEDIUM: 'bg-blue-500',
  LOW: 'bg-zinc-400',
};

const WEEKDAY_LABELS = ['Pzt', 'Sal', 'Çar', 'Per', 'Cum', 'Cmt', 'Paz'];
const MAX_VISIBLE_PER_DAY = 3;
const DAY_DROPPABLE_PREFIX = 'cal-day-';

type CalendarMode = 'month' | 'week';

interface CalendarViewProps {
  tasks: Task[];
  doneColumnIds: Set<string>;
  onTaskClick: (taskId: string) => void;
  onTaskReschedule: (taskId: string, newDueDate: string) => void;
}

interface TaskChipProps {
  task: Task;
  isDone: boolean;
  isOverdue: boolean;
  onClick: () => void;
}

function TaskChip({ task, isDone, isOverdue, onClick }: TaskChipProps) {
  const { attributes, listeners, setNodeRef, transform, isDragging } = useDraggable({ id: task.id });

  const style: React.CSSProperties = {
    transform: CSS.Translate.toString(transform),
    zIndex: isDragging ? 20 : undefined,
  };

  return (
    <button
      ref={setNodeRef}
      style={style}
      {...listeners}
      {...attributes}
      type="button"
      onClick={onClick}
      title={task.title}
      className={`flex items-center gap-1.5 text-left rounded-md px-1.5 py-1 text-[11px] transition-colors truncate cursor-grab active:cursor-grabbing touch-none shrink-0 ${
        isDragging ? 'opacity-30' : ''
      } ${
        isDone
          ? 'bg-muted/60 hover:bg-muted'
          : isOverdue
            ? 'bg-red-500/10 hover:bg-red-500/20 border border-red-500/30'
            : 'bg-accent/60 hover:bg-accent'
      }`}
    >
      <span className={`size-1.5 rounded-full shrink-0 ${PRIORITY_DOT[task.priority ?? 'MEDIUM']}`} />
      <span className={`truncate ${isDone ? 'text-muted-foreground line-through' : isOverdue ? 'text-red-700 dark:text-red-400' : 'text-foreground'}`}>
        {task.title}
      </span>
    </button>
  );
}

interface DayCellProps {
  date: Date;
  variant: CalendarMode;
  inMonth: boolean;
  isToday: boolean;
  dayTasks: Task[];
  doneColumnIds: Set<string>;
  todayKey: string;
  onTaskClick: (taskId: string) => void;
}

function DayCell({ date, variant, inMonth, isToday, dayTasks, doneColumnIds, todayKey, onTaskClick }: DayCellProps) {
  const key = toDateKey(date);
  const { setNodeRef, isOver } = useDroppable({ id: `${DAY_DROPPABLE_PREFIX}${key}` });
  // Ay gorunumunde 6 satir sabit yukseklige sigmali (fazlasi "+N daha"), hafta
  // gorunumunde ise gunluk sutun icerige gore asagi dogru buyuyebilir - o
  // yuzden sadece ay gorunumunde MAX_VISIBLE_PER_DAY ile kesiyoruz.
  const visibleTasks = variant === 'month' ? dayTasks.slice(0, MAX_VISIBLE_PER_DAY) : dayTasks;
  const hiddenCount = variant === 'month' ? dayTasks.length - MAX_VISIBLE_PER_DAY : 0;

  return (
    <div
      ref={setNodeRef}
      className={`p-1.5 flex flex-col gap-1 transition-colors ${
        variant === 'month' ? 'min-h-0 overflow-hidden' : 'min-h-[7rem]'
      } ${isOver ? 'bg-primary/10' : 'bg-background'} ${inMonth ? '' : 'opacity-40'}`}
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
      <div className={`flex flex-col gap-1 ${variant === 'month' ? 'overflow-y-auto min-h-0 no-scrollbar' : ''}`}>
        {visibleTasks.map((task) => {
          const isDone = doneColumnIds.has(task.columnId);
          const isOverdue = !isDone && key < todayKey;
          return (
            <TaskChip
              key={task.id}
              task={task}
              isDone={isDone}
              isOverdue={isOverdue}
              onClick={() => onTaskClick(task.id)}
            />
          );
        })}
        {hiddenCount > 0 && (
          <span className="text-[10px] text-muted-foreground px-1.5">+{hiddenCount} daha</span>
        )}
      </div>
    </div>
  );
}

// Trello/Jira'daki "Calendar" görünümüne benzer: sadece dueDate'i olan
// kartlar günlerine yerleştirilir, tarihsiz kartlar hiç gösterilmez (pano
// zaten onları gösteriyor). Board endpoint'i dueDate'i "YYYY-MM-DD" olarak
// (saat/timezone olmadan) döndürüyor, bu yüzden gün eşleştirmesi basit bir
// string karşılaştırması.
//
// Ay/Hafta gorunumu: Ay gorunumu 6x7 sabit grid (hucre basina en fazla 3
// kart + "+N daha"). Hafta gorunumunda tek sira 7 gun var ve her gun sutunu
// TUM kartlarini gosterip icerige gore asagi buyuyor - sutun cok uzarsa
// disaridaki konteyner (overflow-y-auto) kayar, sayfa sonsuza kadar uzamaz.
//
// Sürükle-bırak: bir kartı başka bir güne bırakınca dueDate'i o güne
// güncellenir (columnId/position'a dokunulmaz) - panodaki sürükleme
// deneyiminin takvim karşılığı. Optimistik guncelleme + hata durumunda geri
// alma parent'taki onTaskReschedule'da yapılır (panonun kendi drag mantığıyla
// aynı desen).
export function CalendarView({ tasks, doneColumnIds, onTaskClick, onTaskReschedule }: CalendarViewProps) {
  const [mode, setMode] = useState<CalendarMode>('month');
  const [cursor, setCursor] = useState(() => new Date());
  const [activeTaskId, setActiveTaskId] = useState<string | null>(null);

  const sensors = useSensors(useSensor(PointerSensor, { activationConstraint: { distance: 5 } }));

  const tasksById = useMemo(() => {
    const map = new Map<string, Task>();
    for (const task of tasks) map.set(task.id, task);
    return map;
  }, [tasks]);

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

  const monthDays = useMemo(() => buildMonthGrid(cursor), [cursor]);

  const weekDays = useMemo(() => buildWeekGrid(cursor), [cursor]);

  const days = mode === 'month' ? monthDays : weekDays;

  const todayKey = toDateKey(new Date());
  const activeTask = activeTaskId ? tasksById.get(activeTaskId) : undefined;

  const periodLabel = useMemo(() => {
    if (mode === 'month') {
      return cursor.toLocaleDateString('tr-TR', { month: 'long', year: 'numeric' });
    }
    const start = weekDays[0];
    const end = weekDays[6];
    const sameMonth = start.getMonth() === end.getMonth();
    const startLabel = start.toLocaleDateString('tr-TR', { day: 'numeric', month: sameMonth ? undefined : 'short' });
    const endLabel = end.toLocaleDateString('tr-TR', { day: 'numeric', month: 'short', year: 'numeric' });
    return `${startLabel} – ${endLabel}`;
  }, [mode, cursor, weekDays]);

  const goPrev = () => {
    if (mode === 'month') {
      setCursor((c) => new Date(c.getFullYear(), c.getMonth() - 1, 1));
    } else {
      setCursor((c) => new Date(c.getFullYear(), c.getMonth(), c.getDate() - 7));
    }
  };

  const goNext = () => {
    if (mode === 'month') {
      setCursor((c) => new Date(c.getFullYear(), c.getMonth() + 1, 1));
    } else {
      setCursor((c) => new Date(c.getFullYear(), c.getMonth(), c.getDate() + 7));
    }
  };

  const handleDragStart = (event: DragStartEvent) => {
    setActiveTaskId(String(event.active.id));
  };

  const handleDragEnd = (event: DragEndEvent) => {
    setActiveTaskId(null);
    const { active, over } = event;
    if (!over) return;
    const overId = String(over.id);
    if (!overId.startsWith(DAY_DROPPABLE_PREFIX)) return;

    const newDueDate = overId.slice(DAY_DROPPABLE_PREFIX.length);
    const task = tasksById.get(String(active.id));
    if (!task || task.dueDate?.slice(0, 10) === newDueDate) return;

    onTaskReschedule(task.id, newDueDate);
  };

  return (
    <DndContext sensors={sensors} onDragStart={handleDragStart} onDragEnd={handleDragEnd}>
      <div className="flex flex-col h-full min-h-0 w-full flex-1 px-4 pb-4">
        <div className="flex items-center justify-between py-2 shrink-0 gap-3">
          <h2 className="text-base font-semibold text-foreground capitalize truncate">{periodLabel}</h2>
          <div className="flex items-center gap-2 shrink-0">
            <div className="inline-flex items-center rounded-lg border border-border bg-muted/40 p-0.5">
              <button
                type="button"
                onClick={() => setMode('month')}
                className={`px-2.5 py-1 rounded-md text-xs font-medium transition-colors ${
                  mode === 'month' ? 'bg-background shadow-sm text-foreground' : 'text-muted-foreground hover:text-foreground'
                }`}
              >
                Ay
              </button>
              <button
                type="button"
                onClick={() => setMode('week')}
                className={`px-2.5 py-1 rounded-md text-xs font-medium transition-colors ${
                  mode === 'week' ? 'bg-background shadow-sm text-foreground' : 'text-muted-foreground hover:text-foreground'
                }`}
              >
                Hafta
              </button>
            </div>

            <div className="flex items-center gap-1">
              <button
                type="button"
                onClick={goPrev}
                className="p-1.5 rounded-lg hover:bg-accent text-muted-foreground hover:text-foreground transition-colors"
                aria-label={mode === 'month' ? 'Önceki ay' : 'Önceki hafta'}
              >
                <ChevronLeft className="size-4" />
              </button>
              <button
                type="button"
                onClick={() => setCursor(new Date())}
                className="px-2.5 py-1 text-xs font-medium rounded-lg hover:bg-accent text-muted-foreground hover:text-foreground transition-colors"
              >
                Bugün
              </button>
              <button
                type="button"
                onClick={goNext}
                className="p-1.5 rounded-lg hover:bg-accent text-muted-foreground hover:text-foreground transition-colors"
                aria-label={mode === 'month' ? 'Sonraki ay' : 'Sonraki hafta'}
              >
                <ChevronRight className="size-4" />
              </button>
            </div>
          </div>
        </div>

        <div className="grid grid-cols-7 gap-px bg-border rounded-t-lg overflow-hidden shrink-0 sticky top-0 z-[1]">
          {WEEKDAY_LABELS.map((label) => (
            <div
              key={label}
              className="bg-muted/50 py-1.5 text-center text-[11px] font-medium text-muted-foreground uppercase tracking-wide"
            >
              {label}
            </div>
          ))}
        </div>

        {mode === 'month' ? (
          <div className="grid grid-cols-7 grid-rows-6 gap-px bg-border flex-1 min-h-0 rounded-b-lg overflow-hidden">
            {days.map((date) => {
              const key = toDateKey(date);
              return (
                <DayCell
                  key={key}
                  date={date}
                  variant="month"
                  inMonth={date.getMonth() === cursor.getMonth()}
                  isToday={key === todayKey}
                  dayTasks={tasksByDay.get(key) ?? []}
                  doneColumnIds={doneColumnIds}
                  todayKey={todayKey}
                  onTaskClick={onTaskClick}
                />
              );
            })}
          </div>
        ) : (
          // Hafta gorunumu: gun sutunlari icerige gore asagi buyur, disaridaki
          // konteyner (flex-1 min-h-0 + overflow-y-auto) tasan kismi kaydirir -
          // sayfa sonsuza kadar uzamiyor, "en kotu" durumda scroll devreye girer.
          <div className="flex-1 min-h-0 overflow-y-auto rounded-b-lg border border-t-0 border-border">
            <div className="grid grid-cols-7 gap-px bg-border">
              {days.map((date) => {
                const key = toDateKey(date);
                return (
                  <DayCell
                    key={key}
                    date={date}
                    variant="week"
                    inMonth
                    isToday={key === todayKey}
                    dayTasks={tasksByDay.get(key) ?? []}
                    doneColumnIds={doneColumnIds}
                    todayKey={todayKey}
                    onTaskClick={onTaskClick}
                  />
                );
              })}
            </div>
          </div>
        )}
      </div>

      <DragOverlay>
        {activeTask ? (
          <div className="flex items-center gap-1.5 rounded-md px-2 py-1.5 text-[11px] bg-background border border-border shadow-lg">
            <span className={`size-1.5 rounded-full shrink-0 ${PRIORITY_DOT[activeTask.priority ?? 'MEDIUM']}`} />
            <span className="truncate text-foreground max-w-40">{activeTask.title}</span>
          </div>
        ) : null}
      </DragOverlay>
    </DndContext>
  );
}
