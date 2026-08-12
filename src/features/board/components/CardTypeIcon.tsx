'use client';

import React from 'react';
import { Rocket, BookOpen, CheckSquare, Bug, ListTree } from 'lucide-react';
import type { CardType } from '../services/boardService';

// Jira'daki is tipi ikonlariyla ayni mantik: her tip kendi rengi+sekliyle
// aninda ayirt edilsin, PriorityIcon.tsx ile ayni desen.
const IKON: Record<CardType, React.ComponentType<{ className?: string }>> = {
  EPIC: Rocket,
  STORY: BookOpen,
  TASK: CheckSquare,
  BUG: Bug,
  SUBTASK: ListTree,
};

const RENK: Record<CardType, string> = {
  EPIC: 'text-violet-500',
  STORY: 'text-emerald-500',
  TASK: 'text-blue-500',
  BUG: 'text-rose-500',
  SUBTASK: 'text-muted-foreground',
};

interface CardTypeIconProps {
  type: CardType;
  className?: string;
}

/** Dekoratiftir - PriorityIcon.tsx ile ayni: her zaman tip METNININ yaninda gosterilir. */
export const CardTypeIcon: React.FC<CardTypeIconProps> = ({ type, className }) => {
  const Ikon = IKON[type];
  if (!Ikon) return null;
  return <Ikon aria-hidden className={className ?? `size-3.5 shrink-0 ${RENK[type]}`} />;
};
