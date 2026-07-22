'use client';

import React, { useState } from 'react';
import type { WorkloadEntry } from '../insightsApi';

interface WorkloadBarChartProps {
  workload: WorkloadEntry[];
}

// Emphasis formu: hikaye "kim asiri yuklu" oldugu icin normal barlar notr gri,
// sadece asiri yuklu olanlar status-kirmizi ile vurgulanir (dataviz skill,
// choosing-a-form.md → emphasis). Kirmizi, validate_palette.js ile hem light
// hem dark yuzeyde WCAG kontrasti dogrulandi (3:1+).
const NORMAL_BAR = 'bg-zinc-300 dark:bg-zinc-600';
const OVERLOADED_BAR = 'bg-[#d03b3b]';

export const WorkloadBarChart: React.FC<WorkloadBarChartProps> = ({ workload }) => {
  const [hoveredId, setHoveredId] = useState<string | null>(null);

  if (workload.length === 0) {
    return <p className="text-sm text-zinc-400">Henüz atanmış aktif kart yok.</p>;
  }

  const maxLoad = Math.max(...workload.map((w) => w.weightedLoad));

  return (
    <div>
      {/* Status rengi tek basina anlam tasimiyor - ikon + etiket her zaman yanında */}
      <div className="flex items-center gap-1.5 mb-3 text-xs text-zinc-500 dark:text-zinc-400">
        <span className={`inline-block w-2.5 h-2.5 rounded-full ${OVERLOADED_BAR}`} />
        ⚠ Kırmızı = aşırı yüklü (ortalamanın 1.5 katından fazla)
      </div>

      <div className="space-y-2.5">
        {workload.map((w) => {
          const widthPct = maxLoad > 0 ? (w.weightedLoad / maxLoad) * 100 : 0;
          const isHovered = hoveredId === w.userId;

          return (
            <div key={w.userId} className="flex items-center gap-3">
              <span className="w-28 text-sm text-zinc-700 dark:text-zinc-300 truncate shrink-0">
                {w.userName}
              </span>

              <div className="relative flex-1 h-6 flex items-center">
                {/* Track */}
                <div className="w-full h-2.5 rounded-full bg-zinc-100 dark:bg-zinc-800/80" />
                {/* Bar - baseline'dan buyur, 4px yuvarlak uc */}
                <div
                  role="img"
                  aria-label={`${w.userName}: ${w.weightedLoad} ağırlıklı yük, ${w.cardCount} kart${w.overloaded ? ', aşırı yüklü' : ''}`}
                  tabIndex={0}
                  onMouseEnter={() => setHoveredId(w.userId)}
                  onMouseLeave={() => setHoveredId(null)}
                  onFocus={() => setHoveredId(w.userId)}
                  onBlur={() => setHoveredId(null)}
                  className={`absolute left-0 h-2.5 rounded-full transition-[width] outline-none focus-visible:ring-2 focus-visible:ring-offset-2 focus-visible:ring-offset-white dark:focus-visible:ring-offset-zinc-950 focus-visible:ring-zinc-400 ${
                    w.overloaded ? OVERLOADED_BAR : NORMAL_BAR
                  }`}
                  style={{ width: `${Math.max(widthPct, 3)}%` }}
                />

                {/* Tooltip */}
                {isHovered && (
                  <div
                    className="absolute -top-9 left-0 z-10 whitespace-nowrap rounded-md bg-zinc-900 dark:bg-zinc-100 px-2 py-1 text-xs shadow-lg"
                    style={{ left: `${Math.min(Math.max(widthPct, 3), 85)}%` }}
                  >
                    <span className="font-semibold text-white dark:text-zinc-900">{w.weightedLoad}</span>
                    <span className="text-zinc-300 dark:text-zinc-600"> ağırlıklı yük · {w.cardCount} kart</span>
                  </div>
                )}
              </div>

              {/* Deger ucta - direct label */}
              <span className="w-28 text-xs text-zinc-500 dark:text-zinc-400 shrink-0 flex items-center gap-1">
                {w.cardCount} kart
                {w.overloaded && <span aria-hidden="true">⚠</span>}
              </span>
            </div>
          );
        })}
      </div>
    </div>
  );
};
