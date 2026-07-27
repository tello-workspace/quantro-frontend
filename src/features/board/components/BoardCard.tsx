// src/features/board/components/BoardCard.tsx
import React from 'react';
import { useSortable } from '@dnd-kit/sortable';
import { CSS } from '@dnd-kit/utilities';
import { Task } from '../services/boardService';
import { CalendarDaysIcon, UserIcon, ClockIcon } from '@heroicons/react/24/outline';
import { Badge } from '@/components/ui/badge';
import { Avatar, AvatarFallback } from '@/components/ui/avatar';

interface BoardCardProps {
  task: Task;
  onClick: () => void;
  isDoneColumn?: boolean;
}

function initials(name: string): string {
  return name.split(' ').map((n) => n[0]).join('').toUpperCase();
}

const PRIORITY_BAR: Record<string, string> = {
  URGENT: 'bg-red-500',
  HIGH: 'bg-orange-500',
  MEDIUM: 'bg-blue-500',
  LOW: 'bg-muted-foreground/40',
};

const PRIORITY_LABEL: Record<string, string> = {
  URGENT: 'Acil',
  HIGH: 'Yüksek',
  MEDIUM: 'Orta',
  LOW: 'Düşük',
};

const MAX_VISIBLE_ASSIGNEES = 3;
const STALE_DAYS = 7;
const VERY_STALE_DAYS = 14;

function staleDays(lastActivityAt?: string): number | null {
  if (!lastActivityAt) return null;
  const diffMs = Date.now() - new Date(lastActivityAt).getTime();
  return diffMs / (24 * 60 * 60 * 1000);
}

function formatDate(dateStr: string): string {
  try {
    const date = new Date(dateStr);
    if (isNaN(date.getTime())) return dateStr;
    return date.toLocaleDateString('tr-TR', { day: 'numeric', month: 'short', year: 'numeric' });
  } catch {
    return dateStr;
  }
}

export const BoardCard: React.FC<BoardCardProps> = ({ task, onClick, isDoneColumn = false }) => {
  const {
    attributes,
    listeners,
    setNodeRef,
    transform,
    transition,
    isDragging,
  } = useSortable({ id: task.id });

  const style = {
    transform: CSS.Translate.toString(transform),
    transition,
    opacity: isDragging ? 0.3 : 1,
  };

  const days = staleDays(task.lastActivityAt);
  const isVeryStale = days !== null && days >= VERY_STALE_DAYS;
  const isStale = days !== null && days >= STALE_DAYS;

  return (
    <div
      ref={setNodeRef}
      style={style}
      {...attributes}
      {...listeners}
      onClick={onClick}
      title={
        [
          task.priority ? `Öncelik: ${PRIORITY_LABEL[task.priority]}` : null,
          isStale ? `${Math.floor(days!)} gündür hareketsiz` : null,
        ]
          .filter(Boolean)
          .join(' · ') || undefined
      }
      className={`group relative cursor-pointer overflow-hidden rounded-xl border p-3 pl-4 transition-all duration-200 shrink-0 ${
        isDragging
          ? 'border-dashed border-primary/40 bg-muted/20 shadow-none'
          : `bg-card shadow-soft hover:-translate-y-0.5 hover:border-primary/60 hover:shadow-soft-md active:translate-y-0 ${
              isVeryStale
                ? 'border-destructive/60'
                : isStale
                  ? 'border-border opacity-75 hover:opacity-100'
                  : 'border-border'
            }`
      }`}
    >
      {/* Oncelik solda ince bir serit: nokta yerine kart taranirken
          uzaktan okunabilen bir sinyal veriyor */}
      {task.priority && (
        <span
          aria-hidden
          className={`absolute inset-y-0 left-0 w-1 ${PRIORITY_BAR[task.priority]}`}
        />
      )}

      {task.labels && task.labels.length > 0 && (
        <div className="mb-1.5 flex flex-wrap gap-1">
          {task.labels.map((label) => (
            <Badge
              key={label.id}
              className="border-0 text-[10px] text-white"
              style={{ backgroundColor: label.color }}
            >
              {label.name}
            </Badge>
          ))}
        </div>
      )}

      <h4 className="mb-1 flex items-start gap-1.5 text-sm font-medium leading-snug text-foreground transition-colors group-hover:text-primary">
        {task.title}
      </h4>

      {isStale && (
        <span className="mb-1 inline-flex items-center gap-1 text-[10px] font-medium text-muted-foreground">
          <ClockIcon className="h-3 w-3" />
          {Math.floor(days!)} gündür hareketsiz
        </span>
      )}

      {task.description && (
        <p className="text-xs text-muted-foreground whitespace-pre-wrap mb-2">
          {task.description}
        </p>
      )}

      <div className="flex items-center justify-between mt-2 pt-2 border-t border-border text-[11px] text-muted-foreground">
        <div className="flex items-center gap-1">
          {task.dueDate && (() => {
            const date = new Date(task.dueDate);
            const isOverdue = !isDoneColumn && date.getTime() < Date.now();
            return (
              <span className={`inline-flex items-center gap-1 px-1.5 py-0.5 rounded-md font-medium text-[10px] ${
                isDoneColumn 
                  ? 'bg-emerald-500/10 text-emerald-600 dark:text-emerald-400' 
                  : isOverdue 
                    ? 'bg-rose-500/10 text-rose-600 dark:text-rose-400' 
                    : 'bg-zinc-100 dark:bg-zinc-800 text-zinc-600 dark:text-zinc-400'
              }`}>
                <CalendarDaysIcon className="h-3.5 w-3.5" />
                <span>{formatDate(task.dueDate)}</span>
              </span>
            );
          })()}
        </div>

        {task.assignees && task.assignees.length > 0 ? (
          <div className="flex items-center -space-x-1.5">
            {task.assignees.slice(0, MAX_VISIBLE_ASSIGNEES).map((a) => {
              const badgeList = (a as any).badges?.length
                ? (a as any).badges.map((b: any) => `${b.icon || ''} ${b.name}`).join(' · ')
                : '';
              return (
                <Avatar
                  key={a.id}
                  size="sm"
                  className="border-2 border-background"
                  title={badgeList ? `${a.name}\n${badgeList}` : a.name}
                >
                  <AvatarFallback className="bg-primary/10 text-primary text-[10px]">
                    {initials(a.name)}
                  </AvatarFallback>
                </Avatar>
              );
            })}
            {task.assignees.length > MAX_VISIBLE_ASSIGNEES && (
              <Avatar size="sm" className="border-2 border-background">
                <AvatarFallback className="text-[9px]">
                  +{task.assignees.length - MAX_VISIBLE_ASSIGNEES}
                </AvatarFallback>
              </Avatar>
            )}
          </div>
        ) : (
          <UserIcon className="h-3.5 w-3.5 text-muted-foreground/50" />
        )}
      </div>
    </div>
  );
};
