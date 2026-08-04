'use client';

import Link from 'next/link';
import { useGetMyAssignedCardsQuery } from '@/features/dashboard/dashboardApi';
import { Card, CardContent } from '@/components/ui/card';
import { Badge } from '@/components/ui/badge';
import { Skeleton } from '@/components/ui/skeleton';
import { AlertTriangle, ListChecks } from 'lucide-react';
import type { Priority } from '@/features/board/services/boardService';
import { useTranslation } from '@/hooks/useTranslation';

const PRIORITY_LABEL: Record<Priority, string> = { LOW: 'Düşük', MEDIUM: 'Orta', HIGH: 'Yüksek', URGENT: 'Acil' };
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
  const { t } = useTranslation();
  const { data: cards = [], isLoading } = useGetMyAssignedCardsQuery();

  return (
    <div className="max-w-5xl mx-auto px-4 sm:px-6 py-8">
      <div className="flex items-center gap-2 mb-6">
        <ListChecks className="size-5 text-primary" />
        <h1 className="text-xl font-semibold text-foreground">Bana Atananlar</h1>
      </div>

      {isLoading ? (
        <div className="space-y-3">
          {[1, 2, 3].map((i) => (
            <Skeleton key={i} className="h-20 w-full rounded-xl" />
          ))}
        </div>
      ) : cards.length === 0 ? (
        <p className="text-sm text-muted-foreground">{t('dashboardNoCards')}</p>
      ) : (
        <div className="space-y-3">
          {cards.map((card) => (
            <Link key={card.id} href={`/projects/${card.projectId}?orgId=${card.organizationId}&openCard=${card.id}`}>
              <Card className="hover:border-primary/40 transition-colors cursor-pointer">
                <CardContent className="p-4">
                  <div className="flex items-start justify-between gap-3">
                    <div className="min-w-0">
                      <p className="font-medium text-foreground truncate">{card.title}</p>
                      <p className="text-xs text-muted-foreground mt-0.5">
                        {card.organizationName} · {card.projectName} · {card.columnName}
                      </p>
                      {card.labels.length > 0 && (
                        <div className="flex flex-wrap gap-1 mt-1.5">
                          {card.labels.map((l) => (
                            <span
                              key={l.id}
                              className="text-[10px] px-1.5 py-0.5 rounded-full text-white"
                              style={{ backgroundColor: l.color }}
                            >
                              {l.name}
                            </span>
                          ))}
                        </div>
                      )}
                    </div>
                    <div className="flex flex-col items-end gap-1 shrink-0">
                      <Badge className={`${PRIORITY_COLOR[card.priority]} border-0`}>
                        {PRIORITY_LABEL[card.priority]}
                      </Badge>
                      {card.dueDate && (
                        <span className="text-xs text-muted-foreground">
                          {new Date(card.dueDate).toLocaleDateString('tr-TR')}
                        </span>
                      )}
                      {card.isBlocked && (
                        <span className="flex items-center gap-1 text-xs text-amber-600 dark:text-amber-400">
                          <AlertTriangle className="size-3" /> Bloklu
                        </span>
                      )}
                    </div>
                  </div>
                </CardContent>
              </Card>
            </Link>
          ))}
        </div>
      )}
    </div>
  );
}
