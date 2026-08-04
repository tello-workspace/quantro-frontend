'use client';

import React from 'react';
import { ChevronsUp, ChevronUp, Minus, ChevronDown } from 'lucide-react';
import type { Priority } from '../services/boardService';

// Oncelik rozetlerinin solunda duran, ONEM SIRASINI ifade eden ikon.
//
// Renk tek basina yetmiyordu: kirmizi/turuncu/mavi/gri bir SINIF ayrimi
// veriyor ama hangisinin daha onemli oldugunu ogrenmeyi gerektiriyor, ve
// renk korlugunde tamamen kayboluyor. Yon (cift yukari > yukari > duz >
// asagi) sirayi ogrenmeden okunur kiliyor ve renkten bagimsiz calisiyor -
// Jira'nin oncelik ikonlariyla ayni mantik.
const IKON: Record<Priority, React.ComponentType<{ className?: string }>> = {
  URGENT: ChevronsUp,
  HIGH: ChevronUp,
  MEDIUM: Minus,
  LOW: ChevronDown,
};

interface PriorityIconProps {
  priority: Priority;
  className?: string;
}

/**
 * Dekoratiftir: her zaman oncelik METNININ yaninda gosterilmesi beklenir,
 * bu yuzden aria-hidden. Tek basina (metinsiz) kullanilacaksa cagiran
 * tarafin erisilebilir bir etiket saglamasi gerekir.
 */
export const PriorityIcon: React.FC<PriorityIconProps> = ({ priority, className }) => {
  const Ikon = IKON[priority];
  if (!Ikon) return null;
  return <Ikon aria-hidden className={className ?? 'size-3.5 shrink-0'} />;
};
