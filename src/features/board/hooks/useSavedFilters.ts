'use client';

import { useCallback, useEffect, useState } from 'react';
import type { Priority } from '../services/boardService';

export interface SavedFilter {
  id: string;
  name: string;
  search: string;
  priorities: Priority[];
  assigneeIds: string[];
  labelIds: string[];
}

// Kayitli filtreler localStorage'da tutuluyor, sunucuda degil: filtre secimi
// tamamen kisisel bir tercih (baskasinin "Bana atananlar"i benim isime
// yaramaz) ve boyle bir tercihi paylasilan veritabaninda tutmak hem gereksiz
// hem de senkronizasyon sorusu aciyor. Proje basina ayri anahtar.
const anahtar = (projectId: string) => `quantro:saved-filters:${projectId}`;

function oku(projectId: string): SavedFilter[] {
  if (typeof window === 'undefined') return [];
  try {
    const ham = window.localStorage.getItem(anahtar(projectId));
    if (!ham) return [];
    const veri = JSON.parse(ham);
    return Array.isArray(veri) ? veri : [];
  } catch {
    // Bozuk/elle duzenlenmis veri panoyu kirmasin
    return [];
  }
}

export function useSavedFilters(projectId: string) {
  const [filters, setFilters] = useState<SavedFilter[]>([]);

  // localStorage sunucuda yok; ilk render'dan sonra okuyoruz ki
  // hydration uyusmazligi olusmasin.
  useEffect(() => {
    setFilters(oku(projectId));
  }, [projectId]);

  const yaz = useCallback(
    (yeni: SavedFilter[]) => {
      setFilters(yeni);
      try {
        window.localStorage.setItem(anahtar(projectId), JSON.stringify(yeni));
      } catch {
        // Kota dolu / gizli mod - kaydetmemek panoyu kirmamali
      }
    },
    [projectId],
  );

  const saveFilter = useCallback(
    (name: string, snapshot: Omit<SavedFilter, 'id' | 'name'>) => {
      const temiz = name.trim();
      if (!temiz) return;
      // Ayni isim tekrar kaydedilirse ustune yaziliyor - kullanici genelde
      // mevcut bir gorunumu guncellemek istiyor, kopya olusturmak degil.
      const digerleri = filters.filter((f) => f.name.toLowerCase() !== temiz.toLowerCase());
      yaz([...digerleri, { id: crypto.randomUUID(), name: temiz, ...snapshot }]);
    },
    [filters, yaz],
  );

  const removeFilter = useCallback(
    (id: string) => yaz(filters.filter((f) => f.id !== id)),
    [filters, yaz],
  );

  return { filters, saveFilter, removeFilter };
}
