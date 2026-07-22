// src/features/board/components/BoardColumn.tsx
import React, { useState } from 'react';
import { useDroppable } from '@dnd-kit/core';
import { SortableContext, verticalListSortingStrategy } from '@dnd-kit/sortable';
import { BoardCard } from './BoardCard';
import { Task } from '../services/boardService';
import { PlusIcon } from '@heroicons/react/24/outline';

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
      className={`flex flex-col w-80 shrink-0 bg-zinc-100 dark:bg-zinc-900 rounded-xl p-4 border ${
        isLimitExceeded 
          ? 'border-amber-500/50 bg-amber-50/50 dark:bg-amber-950/10' 
          : 'border-zinc-200 dark:border-zinc-800'
      }`}
    >
      <div className="flex justify-between items-center mb-3">
        <div className="flex items-center gap-2">
          <h3 className="font-semibold text-zinc-800 dark:text-zinc-200 text-sm">{title}</h3>
          <span className="text-xs font-medium px-2 py-0.5 rounded-full bg-zinc-200 dark:bg-zinc-800 text-zinc-600 dark:text-zinc-400">
            {totalCount !== undefined
              ? `${tasks.length} / ${totalCount}${wipLimit ? ` (limit ${wipLimit})` : ''}`
              : `${tasks.length}${wipLimit ? ` / ${wipLimit}` : ''}`}
          </span>
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
      <div className="mt-3 pt-2 border-t border-zinc-200 dark:border-zinc-800">
        {isAdding ? (
          <form onSubmit={handleSubmit} className="flex flex-col gap-2">
            <input
              type="text"
              autoFocus
              value={titleInput}
              onChange={(e) => setTitleInput(e.target.value)}
              placeholder="Görev başlığı yazın..."
              className="w-full text-sm p-2 rounded-lg border border-zinc-300 dark:border-zinc-700 bg-white dark:bg-zinc-950 text-zinc-900 dark:text-zinc-100 focus:outline-none focus:ring-1 focus:ring-blue-500"
            />
            <div className="flex justify-end gap-2">
              <button
                type="button"
                onClick={() => setIsAdding(false)}
                className="px-3 py-1 text-xs text-zinc-600 dark:text-zinc-400 hover:bg-zinc-200 dark:hover:bg-zinc-800 rounded"
              >
                İptal
              </button>
              <button
                type="submit"
                className="px-3 py-1 text-xs bg-blue-600 text-white rounded hover:bg-blue-700"
              >
                Ekle
              </button>
            </div>
          </form>
        ) : (
          <button
            onClick={() => setIsAdding(true)}
            className="flex items-center gap-1.5 text-xs font-medium text-zinc-600 dark:text-zinc-400 hover:text-zinc-900 dark:hover:text-zinc-100 w-full p-1.5 rounded-lg hover:bg-zinc-200/50 dark:hover:bg-zinc-800/50 transition"
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