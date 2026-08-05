'use client';

import Link from 'next/link';
import { useGetMyAssignedCardsQuery } from '@/features/dashboard/dashboardApi';
import { Card, CardContent } from '@/components/ui/card';
import { Badge } from '@/components/ui/badge';
import { Skeleton } from '@/components/ui/skeleton';
import { AlertTriangle, CalendarClock, ListChecks, SquareArrowOutUpRight } from 'lucide-react';
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

// Projeler arasi tek bir yerde "uzerimde ne var" sorusuna cevap: her proje
// ayri acilmadan tum organizasyonlardaki atanmis kartlar tek listede,
// teslim tarihine gore siralanmis halde.
export default function DashboardPage() {
  const { t, lang } = useTranslation();
  const { data: cards = [], isLoading } = useGetMyAssignedCardsQuery();

  return (
    <div className="mx-auto max-w-5xl px-4 py-8 sm:px-6">
      <div className="mb-6 flex items-center gap-2">
        <ListChecks className="size-5 text-primary" />
        <h1 className="text-xl font-semibold text-foreground">{t('assignedToMe')}</h1>
      </div>

      {isLoading ? (
        <div className="space-y-3">
          {[1, 2, 3].map((i) => (
            <Skeleton key={i} className="h-24 w-full rounded-xl" />
          ))}
        </div>
      ) : cards.length === 0 ? (
        <p className="text-sm text-muted-foreground">{t('dashboardNoCards')}</p>
      ) : (
        <div className="space-y-3">
          {cards.map((card) => {
            const teslim = teslimDurumu(card.dueDate, lang);
            const kartYolu = `/projects/${card.projectId}?orgId=${card.organizationId}&openCard=${card.id}`;
            const projeYolu = `/projects/${card.projectId}?orgId=${card.organizationId}`;

            return (
              // Kartin TAMAMI tiklanabilir olmali ama icinde AYRI bir proje
              // linki de var. Ic ice <a> gecersiz HTML oldugu icin kartin
              // kendisi Link degil: asil link mutlak konumlu olarak karti
              // kapliyor, proje linki de onun USTUNDE (z-10) duruyor.
              <Card key={card.id} className="relative isolate transition-colors hover:border-primary/40">
                <CardContent className="p-4">
                  <Link
                    href={kartYolu}
                    aria-label={`${card.title} — ${t('openCard')}`}
                    className="absolute inset-0 rounded-xl focus-visible:outline-2 focus-visible:outline-offset-2 focus-visible:outline-primary"
                  />

                  <div className="flex items-start justify-between gap-3">
                    <div className="min-w-0">
                      <p className="truncate font-medium text-foreground">{card.title}</p>

                      <div className="mt-1 flex flex-wrap items-center gap-x-1.5 gap-y-1 text-xs text-muted-foreground">
                        <span className="truncate">{card.organizationName}</span>
                        <span aria-hidden>·</span>
                        {/* Projenin kendisine gitmek icin ayri yol: kart
                            detayina degil, panonun tamamina goturur. */}
                        <Link
                          href={projeYolu}
                          title={t('goToProject')}
                          className="relative z-10 inline-flex max-w-full items-center gap-1 rounded font-medium text-foreground underline-offset-2 hover:underline focus-visible:outline-2 focus-visible:outline-offset-2 focus-visible:outline-primary"
                        >
                          <span className="truncate">{card.projectName}</span>
                          <SquareArrowOutUpRight aria-hidden className="size-3 shrink-0 opacity-60" />
                        </Link>
                        <span aria-hidden>·</span>
                        <span className="truncate">{card.columnName}</span>
                      </div>

                      {card.labels.length > 0 && (
                        <div className="mt-1.5 flex flex-wrap gap-1">
                          {card.labels.map((l) => (
                            <span
                              key={l.id}
                              className="rounded-full px-1.5 py-0.5 text-[10px] text-white"
                              style={{ backgroundColor: l.color }}
                            >
                              {l.name}
                            </span>
                          ))}
                        </div>
                      )}
                    </div>

                    <div className="flex shrink-0 flex-col items-end gap-1">
                      <Badge className={`${PRIORITY_COLOR[card.priority]} gap-1 border-0`}>
                        <PriorityIcon priority={card.priority} />
                        {t(PRIORITY_KEY[card.priority])}
                      </Badge>

                      {/* Tarihin kendisi degil, KALAN SURE one cikiyor: "hangi
                          gun" degil "ne kadar vaktim var" sorusu soruluyor.
                          Tam tarih hemen altinda kaliyor.

                          Tarih YOKKEN de rozet gosteriliyor. Onceden bu durumda
                          hicbir sey cizilmiyordu ve sonuc yaniltici oluyordu:
                          kullanici "tarih ozelligi calismiyor" saniyordu, oysa
                          o kartlara hic tarih girilmemisti. Eksikligi gorunur
                          kilmak, sessizce bos birakmaktan iyi - karta tiklayip
                          tarihi oradan girebiliyor. */}
                      <span
                        title={teslim.tarih ?? t('noDueDateHint')}
                        className={`inline-flex items-center gap-1 rounded-full px-2 py-0.5 text-xs font-medium tabular-nums ${SEVIYE_STILI[teslim.seviye]}`}
                      >
                        <CalendarClock aria-hidden className="size-3" />
                        {teslim.metin}
                      </span>
                      {teslim.tarih && (
                        <span className="text-[11px] tabular-nums text-muted-foreground">
                          {teslim.tarih}
                        </span>
                      )}

                      {card.isBlocked && (
                        <span className="flex items-center gap-1 text-xs text-amber-600 dark:text-amber-400">
                          <AlertTriangle className="size-3" /> {t('blocked')}
                        </span>
                      )}
                    </div>
                  </div>
                </CardContent>
              </Card>
            );
          })}
        </div>
      )}
    </div>
  );
}
