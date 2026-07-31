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
import { ChevronLeft, ChevronRight, List, Link as LinkIcon } from 'lucide-react';
import type { Task, Priority, Column } from '../services/boardService';
import { toDateKey, buildMonthGrid, buildWeekGrid } from '../services/calendarService';
import { CalendarAgendaView } from './CalendarAgendaView';
import { useTranslation } from '@/hooks/useTranslation';

const PRIORITY_DOT: Record<Priority, string> = {
  URGENT: 'bg-red-500',
  HIGH: 'bg-orange-500',
  MEDIUM: 'bg-blue-500',
  LOW: 'bg-zinc-400',
};

const PRIORITY_BORDER: Record<Priority, string> = {
  URGENT: 'border-l-red-500',
  HIGH: 'border-l-orange-500',
  MEDIUM: 'border-l-blue-500',
  LOW: 'border-l-zinc-400',
};

const MAX_VISIBLE_PER_DAY = 3;
const DAY_DROPPABLE_PREFIX = 'cal-day-';

// "YYYY-MM-DD" -> "31 Tem" gibi kisa etiket. new Date("YYYY-MM-DD") kullanmiyoruz
// cunku bu ISO tarih-only formu UTC gece yarisi olarak yorumlanir ve yerel saat
// diliminde bir gun kaymaya (Timeline'da yasanan hata) yol acabilirdi.
function formatDayMonth(dateKey: string): string {
  const [y, m, d] = dateKey.split('-').map(Number);
  return new Date(y, (m ?? 1) - 1, d ?? 1).toLocaleDateString('tr-TR', { day: 'numeric', month: 'short' });
}

type CalendarMode = 'month' | 'week' | 'agenda';

interface CalendarViewProps {
  tasks: Task[];
  columns: Record<string, Column>;
  doneColumnIds: Set<string>;
  onTaskClick: (taskId: string) => void;
  onTaskReschedule: (taskId: string, newDueDate: string) => void;
  // Takvimde boş bir güne tıklanınca çağrılır (arg: "YYYY-MM-DD").
  // Yeni kart formunu o tarih dolu açmak için parent'a bildirir.
  onDayClick?: (date: string) => void;
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
      onClick={(e) => {
        // Çipe tıklamak gün hücresinin onDayClick'ini tetiklememeli —
        // kartı açmak istiyoruz, o güne yeni kart eklemek değil.
        e.stopPropagation();
        onClick();
      }}
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

interface WeekTaskChipProps {
  task: Task;
  isDone: boolean;
  isOverdue: boolean;
  columnTitle: string;
  rangeLabel: string | null;
  onClick: () => void;
}

// Hafta gorunumune ozel, daha genis kart: sadece dueDate degil startDate->dueDate
// araligini da (varsa) ve hangi pano sutununda oldugunu gosterir. Onceden ayri
// bir "Zaman Cizelgesi" view'inde vardi - kullanicinin bu stili begenmesi
// uzerine hafta gorunumune tasindi, ayri view kaldirildi.
function WeekTaskChip({ task, isDone, isOverdue, columnTitle, rangeLabel, onClick }: WeekTaskChipProps) {
  const { attributes, listeners, setNodeRef, transform, isDragging } = useDraggable({ id: task.id });
  const blockedByOpen = (task.blockedBy ?? []).filter((b) => (b.relationType ?? 'BLOCKS') === 'BLOCKS');

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
      onClick={(e) => {
        e.stopPropagation();
        onClick();
      }}
      title={task.title}
      className={`w-full text-left rounded-lg border-l-[6px] bg-background border border-border/60 px-3 py-2.5 shadow-sm hover:shadow-md transition-shadow cursor-grab active:cursor-grabbing touch-none shrink-0 ${
        PRIORITY_BORDER[task.priority ?? 'MEDIUM']
      } ${isDragging ? 'opacity-30' : ''}`}
    >
      <div className="flex items-start gap-1.5">
        {blockedByOpen.length > 0 && (
          <LinkIcon
            className="size-3 text-amber-500 shrink-0 mt-0.5"
            aria-label={`Bekliyor: ${blockedByOpen.map((b) => b.title).join(', ')}`}
          />
        )}
        <span
          className={`text-sm font-medium line-clamp-2 ${
            isDone ? 'text-muted-foreground line-through' : isOverdue ? 'text-red-700 dark:text-red-400' : 'text-foreground'
          }`}
        >
          {task.title}
        </span>
      </div>
      <div className="text-xs text-muted-foreground mt-1 truncate">
        {columnTitle}
        {rangeLabel && ` · ${rangeLabel}`}
      </div>
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
  columns: Record<string, Column>;
  onTaskClick: (taskId: string) => void;
  onDayClick?: (date: string) => void;
}

function DayCell({ date, variant, inMonth, isToday, dayTasks, doneColumnIds, todayKey, columns, onTaskClick, onDayClick }: DayCellProps) {
  const { t, lang } = useTranslation();
  const key = toDateKey(date);
  const { setNodeRef, isOver } = useDroppable({ id: `${DAY_DROPPABLE_PREFIX}${key}` });
  // Ay gorunumunde 6 satir sabit yukseklige sigmali (fazlasi "+N daha"), hafta
  // gorunumunde ise gunluk sutun icerige gore asagi dogru buyuyebilir - o
  // yuzden sadece ay gorunumunde MAX_VISIBLE_PER_DAY ile kesiyoruz.
  const visibleTasks = variant === 'month' ? dayTasks.slice(0, MAX_VISIBLE_PER_DAY) : dayTasks;
  const hiddenCount = variant === 'month' ? dayTasks.length - MAX_VISIBLE_PER_DAY : 0;

  const ariaLabelText = onDayClick
    ? (lang === 'en'
      ? `Add card to day ${date.getDate()}`
      : `${date.getDate()} gününe kart ekle`)
    : undefined;

  return (
    <div
      ref={setNodeRef}
      onClick={() => onDayClick?.(key)}
      role={onDayClick ? 'button' : undefined}
      aria-label={ariaLabelText}
      className={`transition-colors cursor-default ${
        variant === 'month'
          ? 'p-1.5 flex flex-col gap-1 min-h-0 overflow-hidden'
          : `p-3 flex flex-col gap-2 h-full min-h-0 rounded-xl border ${isToday ? 'border-primary/40' : 'border-border'}`
      } ${isOver ? 'bg-primary/10' : 'bg-background'} ${inMonth ? '' : 'opacity-40'} ${
        onDayClick ? 'hover:bg-accent/40 cursor-pointer' : ''
      }`}
    >
      {variant === 'week' ? (
        <div className="flex items-center gap-2 shrink-0">
          <span
            className={
              isToday
                ? 'inline-flex items-center justify-center size-8 rounded-full bg-primary text-primary-foreground text-base font-semibold shrink-0'
                : 'inline-flex items-center justify-center size-8 rounded-full text-base font-semibold text-foreground shrink-0'
            }
          >
            {date.getDate()}
          </span>
          <span className="text-xs text-muted-foreground capitalize">
            {date.toLocaleDateString('tr-TR', { weekday: 'long' })}
          </span>
        </div>
      ) : (
        <span
          className={
            isToday
              ? 'inline-flex items-center justify-center size-5 rounded-full bg-primary text-primary-foreground text-xs font-medium shrink-0'
              : 'text-xs font-medium text-muted-foreground shrink-0'
          }
        >
          {date.getDate()}
        </span>
      )}
      <div
        className={`flex flex-col gap-2 min-h-0 overflow-y-auto ${
          variant === 'month' ? 'no-scrollbar gap-1' : 'flex-1 pr-0.5'
        }`}
      >
        {visibleTasks.map((task) => {
          const isDone = doneColumnIds.has(task.columnId);
          const isOverdue = !isDone && key < todayKey;

          if (variant === 'week') {
            const dueKey = task.dueDate?.slice(0, 10);
            const startKey = task.startDate?.slice(0, 10);
            const isMultiDay = !!startKey && !!dueKey && startKey !== dueKey;
            const rangeLabel = isMultiDay ? `${formatDayMonth(startKey!)} → ${formatDayMonth(dueKey!)}` : null;
            return (
              <WeekTaskChip
                key={task.id}
                task={task}
                isDone={isDone}
                isOverdue={isOverdue}
                columnTitle={columns[task.columnId]?.title ?? '—'}
                rangeLabel={rangeLabel}
                onClick={() => onTaskClick(task.id)}
              />
            );
          }

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
          <span className="text-[10px] text-muted-foreground px-1.5">+{hiddenCount} {t('moreTasks')}</span>
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
export function CalendarView({ tasks, columns, doneColumnIds, onTaskClick, onTaskReschedule, onDayClick }: CalendarViewProps) {
  const { t, lang } = useTranslation();
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

  // Hafta gorunumu ay gorunumunden farkli olarak startDate->dueDate araligini
  // da hesaba katar: bir kart birden fazla gune yayiliyorsa aralik icindeki
  // HER gun sutununda gorunur. "YYYY-MM-DD" string karsilastirmasi kullanilir
  // (Date nesnesi araligina hic girilmez) - Timeline'daki saat/timezone
  // kaymasi hatasinin tekrarlanmamasi icin bilerek boyle.
  const weekTasksByDay = useMemo(() => {
    const map = new Map<string, Task[]>();
    for (const day of weekDays) {
      const key = toDateKey(day);
      const dayTasks = tasks.filter((task) => {
        if (!task.dueDate) return false;
        const due = task.dueDate.slice(0, 10);
        const start = task.startDate ? task.startDate.slice(0, 10) : due;
        const from = start <= due ? start : due;
        const to = start <= due ? due : start;
        return key >= from && key <= to;
      });
      map.set(key, dayTasks);
    }
    return map;
  }, [weekDays, tasks]);

  const days = mode === 'month' ? monthDays : weekDays;

  const todayKey = toDateKey(new Date());
  const activeTask = activeTaskId ? tasksById.get(activeTaskId) : undefined;

  const periodLabel = useMemo(() => {
    if (mode === 'agenda') return t('viewModeList');
    const locale = lang === 'en' ? 'en-US' : 'tr-TR';
    if (mode === 'month') {
      return cursor.toLocaleDateString(locale, { month: 'long', year: 'numeric' });
    }
    const start = weekDays[0];
    const end = weekDays[6];
    const sameMonth = start.getMonth() === end.getMonth();
    const startLabel = start.toLocaleDateString(locale, { day: 'numeric', month: sameMonth ? undefined : 'short' });
    const endLabel = end.toLocaleDateString(locale, { day: 'numeric', month: 'short', year: 'numeric' });
    return `${startLabel} – ${endLabel}`;
  }, [mode, cursor, weekDays, lang, t]);

  const weekdayLabels = lang === 'en'
    ? ['Mon', 'Tue', 'Wed', 'Thu', 'Fri', 'Sat', 'Sun']
    : ['Pzt', 'Sal', 'Çar', 'Per', 'Cum', 'Cmt', 'Paz'];

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
                {t('calendarModeMonth')}
              </button>
              <button
                type="button"
                onClick={() => setMode('week')}
                className={`px-2.5 py-1 rounded-md text-xs font-medium transition-colors ${
                  mode === 'week' ? 'bg-background shadow-sm text-foreground' : 'text-muted-foreground hover:text-foreground'
                }`}
              >
                {t('calendarModeWeek')}
              </button>
              <button
                type="button"
                onClick={() => setMode('agenda')}
                className={`flex items-center gap-1 px-2.5 py-1 rounded-md text-xs font-medium transition-colors ${
                  mode === 'agenda' ? 'bg-background shadow-sm text-foreground' : 'text-muted-foreground hover:text-foreground'
                }`}
              >
                <List className="size-3.5" />
                {t('viewModeList')}
              </button>
            </div>

            {mode !== 'agenda' && (
              <div className="flex items-center gap-1">
                <button
                  type="button"
                  onClick={goPrev}
                  className="p-1.5 rounded-lg hover:bg-accent text-muted-foreground hover:text-foreground transition-colors"
                  aria-label={mode === 'month' ? t('calendarPrevMonth') : t('calendarPrevWeek')}
                >
                  <ChevronLeft className="size-4" />
                </button>
                <button
                  type="button"
                  onClick={() => setCursor(new Date())}
                  className="px-2.5 py-1 text-xs font-medium rounded-lg hover:bg-accent text-muted-foreground hover:text-foreground transition-colors"
                >
                  {t('calendarToday')}
                </button>
                <button
                  type="button"
                  onClick={goNext}
                  className="p-1.5 rounded-lg hover:bg-accent text-muted-foreground hover:text-foreground transition-colors"
                  aria-label={mode === 'month' ? t('calendarNextMonth') : t('calendarNextWeek')}
                >
                  <ChevronRight className="size-4" />
                </button>
              </div>
            )}
          </div>
        </div>

        {mode === 'agenda' ? (
          <CalendarAgendaView
            tasks={tasks}
            doneColumnIds={doneColumnIds}
            onTaskClick={onTaskClick}
          />
        ) : (
          <>
            {mode === 'month' && (
              <div className="grid grid-cols-7 gap-px bg-border rounded-t-lg overflow-hidden shrink-0 sticky top-0 z-[1]">
                {weekdayLabels.map((label) => (
                  <div
                    key={label}
                    className="bg-muted/50 py-1.5 text-center text-[11px] font-medium text-muted-foreground uppercase tracking-wide"
                  >
                    {label}
                  </div>
                ))}
              </div>
            )}

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
                      columns={columns}
                      onTaskClick={onTaskClick}
                      onDayClick={onDayClick}
                    />
                  );
                })}
              </div>
            ) : (
              // Hafta gorunumu: TUM sutunlar sabit (viewport'a esit) yukseklikte -
              // sayfa/disaridaki konteyner asla scroll olmaz. Cok karti olan tek
              // bir gun varsa sadece O SUTUN kendi icinde kayar (DayCell'in ic
              // listesi flex-1 min-h-0 overflow-y-auto), digerleri bos kalir ama
              // ayni yukseklikte durur - onceden hepsi birlikte uzayip sayfayi
              // kaydirmaya zorluyordu.
              <div className="flex-1 min-h-0">
                <div className="grid grid-cols-7 gap-3 h-full">
                  {days.map((date) => {
                    const key = toDateKey(date);
                    return (
                      <DayCell
                        key={key}
                        date={date}
                        variant="week"
                        inMonth
                        isToday={key === todayKey}
                        dayTasks={weekTasksByDay.get(key) ?? []}
                        doneColumnIds={doneColumnIds}
                        todayKey={todayKey}
                        columns={columns}
                        onTaskClick={onTaskClick}
                        onDayClick={onDayClick}
                      />
                    );
                  })}
                </div>
              </div>
            )}
          </>
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
