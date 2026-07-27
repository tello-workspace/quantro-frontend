// src/features/board/components/BoardColumn.tsx
import React, { useState } from 'react';
import { useDroppable } from '@dnd-kit/core';
import { SortableContext, verticalListSortingStrategy } from '@dnd-kit/sortable';
import { BoardCard } from './BoardCard';
import { Task } from '../services/boardService';
import { PlusIcon } from '@heroicons/react/24/outline';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Badge } from '@/components/ui/badge';

interface BoardColumnProps {
  id: string;
  title: string;
  tasks: Task[];
  // Filtreleme aktifken gerçek (filtresiz) kart sayısı - WIP göstergesi
  // filtrelenmiş görünüme değil, sütunun gerçek doluluğuna göre hesaplanmalı
  totalCount?: number;
  wipLimit?: number | null;
  canAddTask: boolean;
  onAddTask: (columnId: string, title: string) => void;
  onTaskClick: (taskId: string) => void;
}

export const BoardColumn: React.FC<BoardColumnProps> = ({
  id,
  title,
  tasks,
  totalCount,
  wipLimit,
  canAddTask,
  onAddTask,
  onTaskClick,
}) => {
  const { setNodeRef } = useDroppable({ id });
  const [isAdding, setIsAdding] = useState(false);
  const [titleInput, setTitleInput] = useState('');

  const handleSubmit = (e: React.FormEvent) => {
    e.preventDefault();
    if (!titleInput.trim()) return;
    onAddTask(id, titleInput.trim());
    setTitleInput('');
    setIsAdding(false);
  };

  const realCount = totalCount ?? tasks.length;
  const isLimitExceeded = wipLimit !== undefined && wipLimit !== null && realCount >= wipLimit;

  return (
    <div
      ref={setNodeRef}
      className={`flex w-80 lg:w-[350px] shrink-0 flex-col rounded-2xl border bg-muted/40 p-3 transition-all duration-300 ${
        isLimitExceeded ? 'border-destructive/40 bg-destructive/5' : 'border-border/70'
      }`}
    >
      {/* Sutun basligi kaydirirken gorunur kalsin */}
      <div className="sticky top-0 z-10 mb-3 flex items-center justify-between gap-2 rounded-xl bg-muted/40 px-1 py-1 backdrop-blur-sm">
        <div className="flex min-w-0 items-center gap-2">
          <h3 className="truncate text-sm font-semibold text-foreground">{title}</h3>
          <Badge
            variant={isLimitExceeded ? 'destructive' : 'secondary'}
            className="shrink-0 text-[11px] tabular-nums"
          >
            {totalCount !== undefined
              ? `${tasks.length} / ${totalCount}${wipLimit ? ` (limit ${wipLimit})` : ''}`
              : `${tasks.length}${wipLimit ? ` / ${wipLimit}` : ''}`}
          </Badge>
        </div>
        {isLimitExceeded && (
          <span
            className="shrink-0 text-[11px] font-medium text-destructive"
            title="Bu sütun WIP limitine ulaştı"
          >
            limit doldu
          </span>
        )}
      </div>

      <div className="flex min-h-[150px] flex-1 flex-col gap-2.5 overflow-y-auto pr-1 no-scrollbar">
        <SortableContext items={tasks.map((task) => task.id)} strategy={verticalListSortingStrategy}>
          {tasks.map((task) => (
            <BoardCard
              key={task.id}
              task={task}
              isDoneColumn={title.toLowerCase() === 'done' || title.toLowerCase() === 'tamamlandı'}
              onClick={() => onTaskClick(task.id)}
            />
          ))}
        </SortableContext>

        {tasks.length === 0 && (
          <div className="flex flex-1 items-center justify-center rounded-xl border border-dashed border-border/70 px-3 py-6 text-center">
            <p className="text-xs text-muted-foreground">
              Bu sütun boş{canAddTask ? ' — aşağıdan kart ekleyebilirsin' : ''}
            </p>
          </div>
        )}
      </div>

      {canAddTask && (
      <div className="mt-3 pt-2 border-t border-border">
        {isAdding ? (
          <form onSubmit={handleSubmit} className="flex flex-col gap-2">
            <Input
              type="text"
              autoFocus
              value={titleInput}
              onChange={(e) => setTitleInput(e.target.value)}
              placeholder="Görev başlığı yazın..."
              className="text-sm"
            />
            <div className="flex justify-end gap-2">
              <Button
                type="button"
                variant="ghost"
                size="sm"
                onClick={() => setIsAdding(false)}
              >
                İptal
              </Button>
              <Button type="submit" size="sm">
                Ekle
              </Button>
            </div>
          </form>
        ) : (
          <button
            onClick={() => setIsAdding(true)}
            className="flex w-full cursor-pointer items-center gap-1.5 rounded-lg p-2 text-xs font-medium text-muted-foreground transition-colors duration-200 hover:bg-muted hover:text-foreground"
          >
            <PlusIcon className="h-4 w-4" />
            Yeni kart ekle
          </button>
        )}
      </div>
      )}
    </div>
  );
};
