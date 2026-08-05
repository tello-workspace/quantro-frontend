'use client';

import Link from 'next/link';
import { Card, CardContent } from '@/components/ui/card';
import { Badge } from '@/components/ui/badge';
import { CalendarClock, SquareArrowOutUpRight } from 'lucide-react';
import type { Priority } from '@/features/board/services/boardService';
import { PriorityIcon } from '@/features/board/components/PriorityIcon';
import { useTranslation } from '@/hooks/useTranslation';
import { SEVIYE_STILI, teslimDurumu } from '@/features/dashboard/deadline';
import type { TranslationKey } from '@/hooks/useTranslation';

const PRIORITY_KEY: Record<Priority, TranslationKey> = {
  LOW: 'priorityLow',
  MEDIUM: 'priorityMedium',
  HIGH: 'priorityHigh',
  URGENT: 'priorityUrgent',
};

const PRIORITY_COLOR: Record<Priority, string> = {
  LOW: 'bg-zinc-500/10 text-zinc-600 dark:text-zinc-400',
  MEDIUM: 'bg-blue-500/10 text-blue-600 dark:text-blue-400',
  HIGH: 'bg-orange-500/10 text-orange-600 dark:text-orange-400',
  URGENT: 'bg-red-500/10 text-red-600 dark:text-red-400',
};

interface DashboardCardProps {
  cardId: string;
  title: string;
  priority: Priority;
  dueDate: string | null;
  projectId: string;
  projectName: string;
  organizationId: string;
  /** Proje adindan ONCE gosterilen kirinti (organizasyon adi gibi). */
  onEk?: string;
  /** Proje adindan SONRA gosterilen kirinti (kolon adi gibi). */
  sonEk?: string;
  /** Basligin altindaki serbest alan: etiketler, atananlar... */
  altBilgi?: React.ReactNode;
  /** Sag sutunun altina eklenen rozetler: "bloke" gibi. */
  ekRozet?: React.ReactNode;
}

/**
 * Dashboard'daki kart satiri. "Bana atananlar" ve "Izlediklerim" ayni gorunumu
 * paylasiyor - iki listenin gorsel olarak ayrismasi kullaniciya hicbir sey
 * kazandirmaz, bakim maliyetini ikiye katlardi.
 */
export function DashboardCard({
  cardId,
  title,
  priority,
  dueDate,
  projectId,
  projectName,
  organizationId,
  onEk,
  sonEk,
  altBilgi,
  ekRozet,
}: DashboardCardProps) {
  const { t, lang } = useTranslation();
  const teslim = teslimDurumu(dueDate, lang);
  const kartYolu = `/projects/${projectId}?orgId=${organizationId}&openCard=${cardId}`;
  const projeYolu = `/projects/${projectId}?orgId=${organizationId}`;

  return (
    // Kartin TAMAMI tiklanabilir olmali ama icinde AYRI bir proje linki de var.
    // Ic ice <a> gecersiz HTML oldugu icin kartin kendisi Link degil: asil link
    // mutlak konumlu olarak karti kapliyor, proje linki de onun USTUNDE (z-10).
    <Card className="relative isolate transition-colors hover:border-primary/40">
      <CardContent className="p-4">
        <Link
          href={kartYolu}
          aria-label={`${title} — ${t('openCard')}`}
          className="absolute inset-0 rounded-xl focus-visible:outline-2 focus-visible:outline-offset-2 focus-visible:outline-primary"
        />

        <div className="flex items-start justify-between gap-3">
          <div className="min-w-0">
            <p className="truncate font-medium text-foreground">{title}</p>

            <div className="mt-1 flex flex-wrap items-center gap-x-1.5 gap-y-1 text-xs text-muted-foreground">
              {onEk && (
                <>
                  <span className="truncate">{onEk}</span>
                  <span aria-hidden>·</span>
                </>
              )}
              {/* Projenin kendisine gitmek icin ayri yol: kart detayina degil,
                  panonun tamamina goturur. */}
              <Link
                href={projeYolu}
                title={t('goToProject')}
                className="relative z-10 inline-flex max-w-full items-center gap-1 rounded font-medium text-foreground underline-offset-2 hover:underline focus-visible:outline-2 focus-visible:outline-offset-2 focus-visible:outline-primary"
              >
                <span className="truncate">{projectName}</span>
                <SquareArrowOutUpRight aria-hidden className="size-3 shrink-0 opacity-60" />
              </Link>
              {sonEk && (
                <>
                  <span aria-hidden>·</span>
                  <span className="truncate">{sonEk}</span>
                </>
              )}
            </div>

            {altBilgi}
          </div>

          <div className="flex shrink-0 flex-col items-end gap-1">
            <Badge className={`${PRIORITY_COLOR[priority]} gap-1 border-0`}>
              <PriorityIcon priority={priority} />
              {t(PRIORITY_KEY[priority])}
            </Badge>

            {/* Tarihin kendisi degil, KALAN SURE one cikiyor: "hangi gun" degil
                "ne kadar vaktim var" sorusu soruluyor. Tam tarih hemen altinda.

                Tarih YOKKEN de rozet gosteriliyor. Onceden bu durumda hicbir sey
                cizilmiyordu ve sonuc yaniltici oluyordu: kullanici "tarih
                ozelligi calismiyor" saniyordu, oysa o kartlara hic tarih
                girilmemisti. */}
            <span
              title={teslim.tarih ?? t('noDueDateHint')}
              className={`inline-flex items-center gap-1 rounded-full px-2 py-0.5 text-xs font-medium tabular-nums ${SEVIYE_STILI[teslim.seviye]}`}
            >
              <CalendarClock aria-hidden className="size-3" />
              {teslim.metin}
            </span>
            {teslim.tarih && (
              <span className="text-[11px] tabular-nums text-muted-foreground">{teslim.tarih}</span>
            )}

            {ekRozet}
          </div>
        </div>
      </CardContent>
    </Card>
  );
}
