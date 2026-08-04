// src/features/board/components/TableView.tsx
'use client';

import React, { useMemo, useState } from 'react';
import { ArrowUpDown, ArrowUp, ArrowDown } from 'lucide-react';
import type { Task, Column, Priority } from '../services/boardService';
import { PriorityIcon } from './PriorityIcon';

interface TableViewProps {
  tasks: Task[];
  columns: Record<string, Column>;
  onTaskClick: (taskId: string) => void;
}

type SortKey = 'title' | 'columnId' | 'priority' | 'dueDate';
type SortDir = 'asc' | 'desc';

const PRIORITY_ORDER: Record<Priority, number> = { LOW: 0, MEDIUM: 1, HIGH: 2, URGENT: 3 };
const PRIORITY_LABEL: Record<Priority, string> = { LOW: 'Düşük', MEDIUM: 'Orta', HIGH: 'Yüksek', URGENT: 'Acil' };
const PRIORITY_COLOR: Record<Priority, string> = {
  LOW: 'text-zinc-500',
  MEDIUM: 'text-blue-500',
  HIGH: 'text-orange-500',
  URGENT: 'text-red-500',
};
// Satir arka planinda hafif oncelik tonu - acil/yuksek oncelikli kartlar
// tabloyu tarayan goze aralarindan sivrilsin diye (dusuk/orta icin fark
// gozle secilecek kadar guclu degil, sadece acil/yuksek vurgulanir).
const PRIORITY_ROW_BG: Record<Priority, string> = {
  LOW: '',
  MEDIUM: '',
  HIGH: 'bg-orange-500/5 hover:bg-orange-500/10',
  URGENT: 'bg-red-500/5 hover:bg-red-500/10',
};

// Jira/Trello'daki "List/Table" gorunumu: pano gibi surukle-birak degil,
// tum kartlari tek bir siralanabilir tabloda gosterir - buyuk backlog'larda
// hizli tarama/siralama icin Kanban'dan daha uygun.
export const TableView: React.FC<TableViewProps> = ({ tasks, columns, onTaskClick }) => {
  const [sortKey, setSortKey] = useState<SortKey>('dueDate');
  const [sortDir, setSortDir] = useState<SortDir>('asc');

  const toggleSort = (key: SortKey) => {
    if (sortKey === key) {
      setSortDir((d) => (d === 'asc' ? 'desc' : 'asc'));
    } else {
      setSortKey(key);
      setSortDir('asc');
    }
  };

  const sorted = useMemo(() => {
    const dirMul = sortDir === 'asc' ? 1 : -1;
    return [...tasks].sort((a, b) => {
      switch (sortKey) {
        case 'title':
          return a.title.localeCompare(b.title) * dirMul;
        case 'columnId': {
          const an = columns[a.columnId]?.title ?? '';
          const bn = columns[b.columnId]?.title ?? '';
          return an.localeCompare(bn) * dirMul;
        }
        case 'priority':
          return ((PRIORITY_ORDER[a.priority ?? 'MEDIUM']) - (PRIORITY_ORDER[b.priority ?? 'MEDIUM'])) * dirMul;
        case 'dueDate': {
          const ad = a.dueDate ? new Date(a.dueDate).getTime() : Infinity;
          const bd = b.dueDate ? new Date(b.dueDate).getTime() : Infinity;
          return (ad - bd) * dirMul;
        }
        default:
          return 0;
      }
    });
  }, [tasks, sortKey, sortDir, columns]);

  const SortIcon = ({ active }: { active: boolean }) =>
    !active ? (
      <ArrowUpDown className="size-3 opacity-40" />
    ) : sortDir === 'asc' ? (
      <ArrowUp className="size-3" />
    ) : (
      <ArrowDown className="size-3" />
    );

  const headers: { key: SortKey; label: string }[] = [
    { key: 'title', label: 'Başlık' },
    { key: 'columnId', label: 'Sütun' },
    { key: 'priority', label: 'Öncelik' },
    { key: 'dueDate', label: 'Teslim Tarihi' },
  ];

  return (
    <div className="flex-1 min-h-0 overflow-auto px-4 pb-4">
      <table className="w-full text-sm border-collapse">
        <thead className="sticky top-0 bg-background z-10">
          <tr className="border-b border-border">
            {headers.map((h) => (
              <th key={h.key} className="text-left py-2 px-2 font-medium text-muted-foreground">
                <button
                  type="button"
                  onClick={() => toggleSort(h.key)}
                  className="inline-flex items-center gap-1 hover:text-foreground"
                >
                  {h.label} <SortIcon active={sortKey === h.key} />
                </button>
              </th>
            ))}
            <th className="text-left py-2 px-2 font-medium text-muted-foreground">Atananlar</th>
          </tr>
        </thead>
        <tbody>
          {sorted.map((task) => (
            <tr
              key={task.id}
              onClick={() => onTaskClick(task.id)}
              className={`border-b border-border/60 cursor-pointer transition-colors ${
                PRIORITY_ROW_BG[task.priority ?? 'MEDIUM'] || 'hover:bg-accent/40'
              }`}
            >
              <td className="py-2 px-2 text-foreground max-w-xs truncate">{task.title}</td>
              <td className="py-2 px-2 text-muted-foreground">{columns[task.columnId]?.title ?? '—'}</td>
              <td className={`py-2 px-2 font-medium ${PRIORITY_COLOR[task.priority ?? 'MEDIUM']}`}>
                <span className="inline-flex items-center gap-1">
                  <PriorityIcon priority={task.priority ?? 'MEDIUM'} />
                  {PRIORITY_LABEL[task.priority ?? 'MEDIUM']}
                </span>
              </td>
              <td className="py-2 px-2 text-muted-foreground">
                {task.dueDate ? new Date(task.dueDate).toLocaleDateString('tr-TR') : '—'}
              </td>
              <td className="py-2 px-2 text-muted-foreground">
                {(task.assignees ?? []).map((a) => a.name).join(', ') || '—'}
              </td>
            </tr>
          ))}
          {sorted.length === 0 && (
            <tr>
              <td colSpan={6} className="py-8 text-center text-muted-foreground">
                Gösterilecek kart yok.
              </td>
            </tr>
          )}
        </tbody>
      </table>
    </div>
  );
};
