'use client';

import React, { useState } from 'react';
import type { WipViolation } from '../insightsApi';

interface WipMeterProps {
  violation: WipViolation;
}

// Ayni skill/palette dogrulamasi: sequential mavi (kapasite) + status kirmizi
// (limit asimi), 2px surface-gap ile ayrilan iki segment - bir "meter" formu.
const CAPACITY_SEGMENT = 'bg-[#2a78d6] dark:bg-[#3987e5]';
const OVERFLOW_SEGMENT = 'bg-[#d03b3b]';

export const WipMeter: React.FC<WipMeterProps> = ({ violation }) => {
  const [hovered, setHovered] = useState(false);
  const { columnName, cardCount, wipLimit } = violation;

  const capacityPct = Math.min((wipLimit / cardCount) * 100, 100);
  const overflowPct = 100 - capacityPct;

  return (
    <div
      className="p-3 rounded-lg border border-zinc-200 dark:border-zinc-800 bg-white dark:bg-zinc-900"
      onMouseEnter={() => setHovered(true)}
      onMouseLeave={() => setHovered(false)}
      onFocus={() => setHovered(true)}
      onBlur={() => setHovered(false)}
      tabIndex={0}
      role="img"
      aria-label={`${columnName}: ${cardCount} kart, WIP limiti ${wipLimit} - limit aşıldı`}
    >
      <div className="flex justify-between items-center mb-1.5">
        <span className="text-sm font-medium text-zinc-800 dark:text-zinc-100">{columnName}</span>
        <span className="text-xs text-zinc-500 dark:text-zinc-400">
          {cardCount} / {wipLimit} kart
        </span>
      </div>

      <div className="relative h-2.5 rounded-full bg-zinc-100 dark:bg-zinc-800/80 overflow-hidden flex">
        <div className={`h-full ${CAPACITY_SEGMENT}`} style={{ width: `${capacityPct}%` }} />
        {/* 2px surface-gap: dokunan iki segmenti ayirir */}
        <div className="h-full w-[2px] bg-white dark:bg-zinc-900" />
        <div className={`h-full rounded-r-full ${OVERFLOW_SEGMENT}`} style={{ width: `${overflowPct}%` }} />
      </div>

      {hovered && (
        <p className="mt-1.5 text-xs text-red-600 dark:text-red-400">
          Limitin {cardCount - wipLimit} kart üzerinde
        </p>
      )}
    </div>
  );
};
