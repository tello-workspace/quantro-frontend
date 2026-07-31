'use client';

import React from 'react';

export interface LineSeries {
  label: string;
  color: string;
  values: number[];
  dashed?: boolean;
}

interface SimpleLineChartProps {
  labels: string[];
  series: LineSeries[];
  height?: number;
}

// Hafif, bagimliliksiz SVG cizgi grafik (recharts/d3 eklemek yerine).
// Burndown ve kumulatif akis gibi birkac seri/basit eksen yeten yerlerde
// yeterli - eksen etiketleri sadece ilk/orta/son noktada gosterilir.
export const SimpleLineChart: React.FC<SimpleLineChartProps> = ({ labels, series, height = 180 }) => {
  const width = 600;
  const padding = { top: 10, right: 10, bottom: 24, left: 32 };
  const innerW = width - padding.left - padding.right;
  const innerH = height - padding.top - padding.bottom;

  const allValues = series.flatMap((s) => s.values);
  const maxValue = Math.max(1, ...allValues);
  const n = labels.length;

  const toX = (i: number) => padding.left + (n <= 1 ? 0 : (i / (n - 1)) * innerW);
  const toY = (v: number) => padding.top + innerH - (v / maxValue) * innerH;

  const pathFor = (values: number[]) =>
    values.map((v, i) => `${i === 0 ? 'M' : 'L'} ${toX(i)} ${toY(v)}`).join(' ');

  return (
    <div className="w-full overflow-x-auto">
      <svg viewBox={`0 0 ${width} ${height}`} className="w-full h-auto" style={{ minWidth: 320 }}>
        {/* Y ekseni referans çizgileri */}
        {[0, 0.5, 1].map((t) => (
          <line
            key={t}
            x1={padding.left}
            x2={width - padding.right}
            y1={padding.top + innerH * (1 - t)}
            y2={padding.top + innerH * (1 - t)}
            stroke="currentColor"
            strokeOpacity={0.1}
          />
        ))}

        {series.map((s) => (
          <path
            key={s.label}
            d={pathFor(s.values)}
            fill="none"
            stroke={s.color}
            strokeWidth={2}
            strokeDasharray={s.dashed ? '4 3' : undefined}
          />
        ))}

        {labels.length > 0 && (
          <>
            <text x={toX(0)} y={height - 4} fontSize={10} fill="currentColor" opacity={0.6} textAnchor="start">
              {labels[0]}
            </text>
            <text
              x={toX(n - 1)}
              y={height - 4}
              fontSize={10}
              fill="currentColor"
              opacity={0.6}
              textAnchor="end"
            >
              {labels[n - 1]}
            </text>
          </>
        )}
      </svg>

      <div className="flex flex-wrap items-center gap-3 mt-1 px-1">
        {series.map((s) => (
          <div key={s.label} className="flex items-center gap-1.5 text-xs text-muted-foreground">
            <span className="w-3 h-0.5 rounded" style={{ backgroundColor: s.color }} />
            {s.label}
          </div>
        ))}
      </div>
    </div>
  );
};
