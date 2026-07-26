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
      className={`flex flex-col w-80 shrink-0 bg-muted/50 rounded-xl p-4 border ${
        isLimitExceeded
          ? 'border-destructive/50 bg-destructive/5'
          : 'border-border'
      }`}
    >
      <div className="flex justify-between items-center mb-3">
        <div className="flex items-center gap-2">
          <h3 className="font-semibold text-foreground text-sm">{title}</h3>
          <Badge variant="secondary" className="text-xs">
            {totalCount !== undefined
              ? `${tasks.length} / ${totalCount}${wipLimit ? ` (limit ${wipLimit})` : ''}`
              : `${tasks.length}${wipLimit ? ` / ${wipLimit}` : ''}`}
          </Badge>
        </div>
      </div>

      <div className="flex flex-col gap-3 overflow-y-auto flex-1 min-h-[150px] pr-1">
        <SortableContext items={tasks.map((task) => task.id)} strategy={verticalListSortingStrategy}>
          {tasks.map((task) => (
            <BoardCard
              key={task.id}
              task={task}
              onClick={() => onTaskClick(task.id)}
            />
          ))}
        </SortableContext>
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
            className="flex items-center gap-1.5 text-xs font-medium text-muted-foreground hover:text-foreground w-full p-1.5 rounded-lg hover:bg-muted transition"
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
