'use client';

import React, { useEffect, useMemo, useRef, useState } from 'react';
import { useRouter } from 'next/navigation';
import {
  LayoutGrid,
  ListChecks,
  UserCircle,
  SlidersHorizontal,
  Activity,
  BarChart3,
  Search,
  CornerDownLeft,
} from 'lucide-react';
import { Dialog, DialogContent, DialogTitle } from '@/components/ui/dialog';
import { useLazySearchOrganizationQuery } from '@/features/organizations/organizationsApi';
import { useTranslation } from '@/hooks/useTranslation';

interface Props {
  open: boolean;
  onOpenChange: (open: boolean) => void;
  orgId?: string;
  /** Proje sayfasindaysak proje-kapsamli komutlar da listelenir */
  projectId?: string;
}

interface Komut {
  id: string;
  label: string;
  hint?: string;
  icon: React.ComponentType<{ className?: string }>;
  href: string;
}

const PRIORITY_LABEL: Record<string, string> = {
  LOW: 'Düşük',
  MEDIUM: 'Orta',
  HIGH: 'Yüksek',
  URGENT: 'Acil',
};

export const CommandPalette: React.FC<Props> = ({ open, onOpenChange, orgId, projectId }) => {
  const { t } = useTranslation();
  const router = useRouter();
  const [q, setQ] = useState('');
  const [secili, setSecili] = useState(0);
  const listRef = useRef<HTMLDivElement>(null);

  const [ara, { data: kartlar = [], isFetching }] = useLazySearchOrganizationQuery();

  const orgSuffix = orgId ? `?orgId=${orgId}` : '';

  const komutlar: Komut[] = useMemo(() => {
    const temel: Komut[] = [
      { id: 'boards', label: t('myBoards'), icon: LayoutGrid, href: `/projects${orgSuffix}` },
      { id: 'assigned', label: t('assignedToMe'), icon: ListChecks, href: '/dashboard' },
      { id: 'profile', label: t('myProfile'), icon: UserCircle, href: '/profile' },
    ];

    if (!projectId) return temel;

    // Proje sayfasindayken o projeye ait sayfalar da erisilebilir olmali;
    // komut paletinin degeri "aradigin yere tek tusla gitmek".
    return [
      { id: 'manage', label: t('management'), hint: t('currentProject'), icon: SlidersHorizontal, href: `/projects/${projectId}/manage${orgSuffix}` },
      { id: 'insights', label: t('insights'), hint: t('currentProject'), icon: BarChart3, href: `/projects/${projectId}/insights${orgSuffix}` },
      { id: 'activity', label: t('activityFeed'), hint: t('currentProject'), icon: Activity, href: `/projects/${projectId}/activity${orgSuffix}` },
      ...temel,
    ];
  }, [projectId, orgSuffix, t]);

  const eslesenKomutlar = useMemo(() => {
    const terim = q.trim().toLowerCase();
    if (!terim) return komutlar;
    return komutlar.filter((k) => k.label.toLowerCase().includes(terim));
  }, [komutlar, q]);

  // Kart aramasi sunucuya gidiyor, bu yuzden geciktiriliyor. Komutlar yerel
  // oldugu icin aninda filtreleniyor - iki liste farkli hizda dolabiliyor.
  useEffect(() => {
    const terim = q.trim();
    if (terim.length < 2 || !orgId) return;
    const zaman = setTimeout(() => ara({ orgId, q: terim }), 250);
    return () => clearTimeout(zaman);
  }, [q, orgId, ara]);

  const gosterilecekKartlar = q.trim().length >= 2 ? kartlar : [];
  const toplam = eslesenKomutlar.length + gosterilecekKartlar.length;

  // Arama degisince secim basa donmeli, aksi halde imlec listenin disinda kalir
  useEffect(() => setSecili(0), [q]);

  useEffect(() => {
    if (!open) {
      setQ('');
      setSecili(0);
    }
  }, [open]);

  const git = (href: string) => {
    onOpenChange(false);
    router.push(href);
  };

  const secileniCalistir = () => {
    if (secili < eslesenKomutlar.length) {
      git(eslesenKomutlar[secili].href);
      return;
    }
    const kart = gosterilecekKartlar[secili - eslesenKomutlar.length];
    if (kart && orgId) {
      git(`/projects/${kart.projectId}?orgId=${orgId}&openCard=${kart.id}`);
    }
  };

  const tusIsle = (e: React.KeyboardEvent) => {
    if (e.key === 'ArrowDown') {
      e.preventDefault();
      setSecili((s) => (toplam === 0 ? 0 : (s + 1) % toplam));
    } else if (e.key === 'ArrowUp') {
      e.preventDefault();
      setSecili((s) => (toplam === 0 ? 0 : (s - 1 + toplam) % toplam));
    } else if (e.key === 'Enter') {
      e.preventDefault();
      secileniCalistir();
    }
  };

  // Klavyeyle gezerken secili satir gorunur kalsin
  useEffect(() => {
    listRef.current
      ?.querySelector<HTMLElement>(`[data-index="${secili}"]`)
      ?.scrollIntoView({ block: 'nearest' });
  }, [secili]);

  const satirSinifi = (aktif: boolean) =>
    `flex w-full items-center gap-2.5 rounded-lg px-2.5 py-2 text-left text-sm transition-colors ${
      aktif ? 'bg-accent text-accent-foreground' : 'text-foreground hover:bg-accent/50'
    }`;

  return (
    <Dialog open={open} onOpenChange={onOpenChange}>
      <DialogContent className="top-[15%] w-full translate-y-0 gap-0 p-0 sm:max-w-lg" showCloseButton={false}>
        <DialogTitle className="sr-only">{t('commandPalette')}</DialogTitle>

        <div className="flex items-center gap-2.5 border-b border-border px-3.5 py-3">
          <Search className="size-4 shrink-0 text-muted-foreground" />
          <input
            autoFocus
            value={q}
            onChange={(e) => setQ(e.target.value)}
            onKeyDown={tusIsle}
            placeholder={t('commandPalettePlaceholder')}
            className="w-full bg-transparent text-sm outline-none placeholder:text-muted-foreground"
          />
          {isFetching && (
            <span className="size-3.5 shrink-0 animate-spin rounded-full border-2 border-muted-foreground/40 border-t-transparent" />
          )}
        </div>

        <div ref={listRef} className="max-h-80 overflow-y-auto p-1.5">
          {toplam === 0 && (
            <p className="px-2.5 py-6 text-center text-sm text-muted-foreground">{t('noResults')}</p>
          )}

          {eslesenKomutlar.length > 0 && (
            <div className="mb-1">
              <p className="px-2.5 py-1 text-[11px] font-semibold uppercase tracking-wide text-muted-foreground">
                {t('goTo')}
              </p>
              {eslesenKomutlar.map((k, i) => (
                <button
                  key={k.id}
                  type="button"
                  data-index={i}
                  onMouseEnter={() => setSecili(i)}
                  onClick={() => git(k.href)}
                  className={satirSinifi(secili === i)}
                >
                  <k.icon className="size-4 shrink-0 text-muted-foreground" />
                  <span className="flex-1 truncate">{k.label}</span>
                  {k.hint && <span className="shrink-0 text-xs text-muted-foreground">{k.hint}</span>}
                  {secili === i && <CornerDownLeft className="size-3.5 shrink-0 text-muted-foreground" />}
                </button>
              ))}
            </div>
          )}

          {gosterilecekKartlar.length > 0 && (
            <div>
              <p className="px-2.5 py-1 text-[11px] font-semibold uppercase tracking-wide text-muted-foreground">
                {t('cards')}
              </p>
              {gosterilecekKartlar.map((kart, i) => {
                const idx = eslesenKomutlar.length + i;
                return (
                  <button
                    key={kart.id}
                    type="button"
                    data-index={idx}
                    onMouseEnter={() => setSecili(idx)}
                    onClick={() => orgId && git(`/projects/${kart.projectId}?orgId=${orgId}&openCard=${kart.id}`)}
                    className={satirSinifi(secili === idx)}
                  >
                    <span className="flex min-w-0 flex-1 flex-col">
                      <span className="truncate font-medium">{kart.title}</span>
                      <span className="truncate text-xs text-muted-foreground">
                        {kart.projectName} · {kart.columnName}
                      </span>
                    </span>
                    <span className="shrink-0 rounded-full border border-border px-1.5 py-0.5 text-[10px] text-muted-foreground">
                      {PRIORITY_LABEL[kart.priority] ?? kart.priority}
                    </span>
                  </button>
                );
              })}
            </div>
          )}
        </div>

        <div className="flex items-center gap-3 border-t border-border px-3.5 py-2 text-[11px] text-muted-foreground">
          <span className="flex items-center gap-1">
            <kbd className="rounded border border-border px-1">↑</kbd>
            <kbd className="rounded border border-border px-1">↓</kbd> {t('navigate')}
          </span>
          <span className="flex items-center gap-1">
            <kbd className="rounded border border-border px-1">↵</kbd> {t('open')}
          </span>
          <span className="flex items-center gap-1">
            <kbd className="rounded border border-border px-1">esc</kbd> {t('close')}
          </span>
        </div>
      </DialogContent>
    </Dialog>
  );
};
