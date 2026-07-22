'use client';

import React from 'react';
import { MagnifyingGlassIcon, XMarkIcon } from '@heroicons/react/24/outline';
import type { Priority } from '../services/boardService';
import type { Label } from '@/features/labels/labelsApi';

const PRIORITIES: { value: Priority; label: string; dot: string }[] = [
  { value: 'URGENT', label: 'Acil', dot: 'bg-red-500' },
  { value: 'HIGH', label: 'Yüksek', dot: 'bg-orange-500' },
  { value: 'MEDIUM', label: 'Orta', dot: 'bg-blue-500' },
  { value: 'LOW', label: 'Düşük', dot: 'bg-zinc-400' },
];

interface Member {
  userId: string;
  user: { id: string; name: string };
}

interface BoardFiltersProps {
  search: string;
  onSearchChange: (value: string) => void;
  members: Member[];
  labels: Label[];
  selectedPriorities: Set<Priority>;
  onTogglePriority: (priority: Priority) => void;
  selectedAssigneeIds: Set<string>;
  onToggleAssignee: (userId: string) => void;
  selectedLabelIds: Set<string>;
  onToggleLabel: (labelId: string) => void;
  hasActiveFilters: boolean;
  onClear: () => void;
}

function initials(name: string): string {
  return name.split(' ').map((n) => n[0]).join('').toUpperCase();
}

export const BoardFilters: React.FC<BoardFiltersProps> = ({
  search,
  onSearchChange,
  members,
  labels,
  selectedPriorities,
  onTogglePriority,
  selectedAssigneeIds,
  onToggleAssignee,
  selectedLabelIds,
  onToggleLabel,
  hasActiveFilters,
  onClear,
}) => {
  return (
    <div className="flex flex-wrap items-center gap-3 px-4 pt-4 pb-2">
      <div className="relative">
        <MagnifyingGlassIcon className="absolute left-2.5 top-1/2 -translate-y-1/2 h-4 w-4 text-zinc-400" />
        <input
          type="text"
          value={search}
          onChange={(e) => onSearchChange(e.target.value)}
          placeholder="Kart ara..."
          className="pl-8 pr-3 py-1.5 text-sm w-48 rounded-lg border border-zinc-300 dark:border-zinc-700 bg-white dark:bg-zinc-900 text-zinc-900 dark:text-zinc-100 focus:outline-none focus:ring-1 focus:ring-blue-500"
        />
      </div>

      <div className="flex items-center gap-1">
        {PRIORITIES.map((p) => {
          const active = selectedPriorities.has(p.value);
          return (
            <button
              key={p.value}
              type="button"
              onClick={() => onTogglePriority(p.value)}
              className={`flex items-center gap-1.5 px-2.5 py-1 rounded-full text-xs font-medium border transition ${
                active
                  ? 'border-blue-500 bg-blue-50 dark:bg-blue-950/50 text-blue-700 dark:text-blue-300'
                  : 'border-zinc-300 dark:border-zinc-700 text-zinc-600 dark:text-zinc-400 hover:border-zinc-400'
              }`}
            >
              <span className={`w-1.5 h-1.5 rounded-full ${p.dot}`} />
              {p.label}
            </button>
          );
        })}
      </div>

      {members.length > 0 && (
        <div className="flex items-center gap-1">
          {members.map((m) => {
            const active = selectedAssigneeIds.has(m.userId);
            return (
              <button
                key={m.userId}
                type="button"
                onClick={() => onToggleAssignee(m.userId)}
                title={m.user.name}
                className={`flex items-center justify-center w-7 h-7 rounded-full text-[10px] font-semibold border-2 transition ${
                  active
                    ? 'border-blue-500 bg-blue-100 dark:bg-blue-950 text-blue-700 dark:text-blue-300'
                    : 'border-transparent bg-zinc-100 dark:bg-zinc-800 text-zinc-500 dark:text-zinc-400 hover:border-zinc-300 dark:hover:border-zinc-600'
                }`}
              >
                {initials(m.user.name)}
              </button>
            );
          })}
        </div>
      )}

      {labels.length > 0 && (
        <div className="flex items-center gap-1">
          {labels.map((label) => {
            const active = selectedLabelIds.has(label.id);
            return (
              <button
                key={label.id}
                type="button"
                onClick={() => onToggleLabel(label.id)}
                className="flex items-center gap-1.5 px-2.5 py-1 rounded-full text-xs font-medium border transition"
                style={{
                  borderColor: active ? label.color : 'transparent',
                  backgroundColor: active ? `${label.color}22` : undefined,
                  color: active ? label.color : undefined,
                }}
              >
                <span className="w-1.5 h-1.5 rounded-full" style={{ backgroundColor: label.color }} />
                <span className={active ? '' : 'text-zinc-600 dark:text-zinc-400'}>{label.name}</span>
              </button>
            );
          })}
        </div>
      )}

      {hasActiveFilters && (
        <button
          type="button"
          onClick={onClear}
          className="flex items-center gap-1 text-xs text-zinc-500 dark:text-zinc-400 hover:text-zinc-800 dark:hover:text-zinc-200"
        >
          <XMarkIcon className="h-3.5 w-3.5" />
          Filtreleri temizle
        </button>
      )}
    </div>
  );
};
