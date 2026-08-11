'use client';

import React, { useEffect, useRef, useState } from 'react';
import { MagnifyingGlassIcon, XMarkIcon } from '@heroicons/react/24/outline';
import type { Priority } from '../services/boardService';
import { PriorityIcon } from './PriorityIcon';
import type { Label } from '@/features/labels/labelsApi';
import { useTranslation } from '@/hooks/useTranslation';

// Renkli nokta yerine yon ikonu: nokta yalnizca kategori ayirt ediyordu,
// ikon onem SIRASINI da gosteriyor (bkz. PriorityIcon).
const PRIORITIES: { value: Priority; label: string; renk: string }[] = [
  { value: 'URGENT', label: 'Acil', renk: 'text-red-500' },
  { value: 'HIGH', label: 'Yüksek', renk: 'text-orange-500' },
  { value: 'MEDIUM', label: 'Orta', renk: 'text-blue-500' },
  { value: 'LOW', label: 'Düşük', renk: 'text-zinc-400' },
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
  const { t } = useTranslation();

  // Arama kutusu kapaliyken yalnizca bir daire; acilinca bara genisliyor.
  // Filtre satirinda surekli 192px yer kapliyordu, oysa cogu zaman bos
  // duruyor - kazanilan yer oncelik/kisi/etiket filtrelerine gidiyor.
  const [aramaAcik, setAramaAcik] = useState(false);
  const aramaRef = useRef<HTMLInputElement>(null);

  // Kayitli gorunum yuklendiginde arama disaridan dolabiliyor: dolu bir
  // filtrenin daire arkasinda gizli kalmasi, kullanicinin panoyu neden
  // eksik gordugunu anlamamasi demek. Doluyken her zaman acik.
  const acik = aramaAcik || search.length > 0;

  useEffect(() => {
    if (aramaAcik) aramaRef.current?.focus();
  }, [aramaAcik]);

  return (
    <div className="flex flex-wrap items-center gap-3 px-4 py-1.5 shrink-0">
      <div
        className={`relative flex h-8 shrink-0 items-center transition-[width] duration-200 ease-out ${
          acik ? 'w-48' : 'w-8'
        }`}
      >
        {/* Kapaliyken tiklama hedefi bu daire. Acikken input'un altinda
            kalan bir ikon olarak duruyor: pointer/tab disi, yoksa
            kutunun icine tiklamak kutuyu kapatmaya calisirdi. */}
        <button
          type="button"
          onClick={() => setAramaAcik(true)}
          aria-label="Kart ara"
          aria-expanded={acik}
          tabIndex={acik ? -1 : 0}
          className={`absolute left-0 flex size-8 items-center justify-center rounded-full border transition-colors ${
            acik
              ? 'pointer-events-none border-transparent'
              : 'border-zinc-300 bg-white hover:border-zinc-400 dark:border-zinc-700 dark:bg-zinc-900'
          }`}
        >
          <MagnifyingGlassIcon className="h-4 w-4 text-zinc-400" />
        </button>

        <input
          ref={aramaRef}
          type="text"
          value={search}
          onChange={(e) => onSearchChange(e.target.value)}
          // Escape aramayi temizleyip kapatiyor - kapatirken metni birakmak
          // gorunmez bir filtre birakirdi.
          onKeyDown={(e) => {
            if (e.key === 'Escape') {
              onSearchChange('');
              setAramaAcik(false);
              e.currentTarget.blur();
            }
          }}
          // Bos ise odak kaybinda kendiliginden toparlaniyor; doluyken
          // acik kaliyor (bkz. yukaridaki `acik`).
          onBlur={() => setAramaAcik(false)}
          placeholder="Kart ara..."
          tabIndex={acik ? 0 : -1}
          className={`h-8 w-full rounded-full border border-zinc-300 bg-white pl-8 text-sm text-zinc-900 transition-opacity focus:outline-none focus:ring-1 focus:ring-blue-500 dark:border-zinc-700 dark:bg-zinc-900 dark:text-zinc-100 ${
            search ? 'pr-8' : 'pr-3'
          } ${acik ? 'opacity-100' : 'pointer-events-none opacity-0'}`}
        />

        {acik && search && (
          <button
            type="button"
            // onMouseDown: input'un blur'undan once calissin, yoksa once
            // blur olup buton fareyle bulusamadan yer degistirebiliyor.
            onMouseDown={(e) => e.preventDefault()}
            // Temizledikten sonra ACIK kaliyor: aksi halde metin varken
            // odak disina cikilmis bir kutuda X'e basmak kutuyu daireye
            // dondururken odagi gorunmez input'ta birakiyor, kullanicinin
            // yazdigi bir daha goremeyecegi bir aramaya gidiyordu.
            onClick={() => {
              onSearchChange('');
              setAramaAcik(true);
            }}
            aria-label="Aramayı temizle"
            className="absolute right-2 text-zinc-400 transition-colors hover:text-zinc-600 dark:hover:text-zinc-200"
          >
            <XMarkIcon className="h-4 w-4" />
          </button>
        )}
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
              <PriorityIcon priority={p.value} className={`size-3.5 shrink-0 ${p.renk}`} />
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
