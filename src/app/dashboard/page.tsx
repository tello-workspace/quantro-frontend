'use client';

import { useGetMyAssignedCardsQuery } from '@/features/dashboard/dashboardApi';
import { useGetWatchedCardsQuery, useUnwatchCardMutation } from '@/features/watchers/watchApi';
import { Skeleton } from '@/components/ui/skeleton';
import { AlertTriangle, Eye, EyeOff, ListChecks } from 'lucide-react';
import { toast } from 'sonner';
import { useTranslation } from '@/hooks/useTranslation';
import { DashboardCard } from '@/features/dashboard/DashboardCard';

// Listeden dogrudan abonelikten cikma. Aboneligi birakmak icin karti acip
// projeye gitmek gerekiyordu; abone olmanin kolay, birakmanin zor oldugu bir
// liste hizla cope donuyor.
//
// z-10: DashboardCard'in tamamini kaplayan mutlak konumlu link var, dugme
// onun USTUNDE olmali yoksa tiklama karti aciyor.
function IzlemeyiBirakDugmesi({ cardId }: { cardId: string }) {
  const { t } = useTranslation();
  const [unwatchCard, { isLoading }] = useUnwatchCardMutation();

  return (
    <button
      type="button"
      disabled={isLoading}
      onClick={async (e) => {
        e.preventDefault();
        e.stopPropagation();
        try {
          await unwatchCard(cardId).unwrap();
          toast.success(t('bulkUnwatchSuccess'));
        } catch {
          toast.error(t('watchToggleError'));
        }
      }}
      className="relative z-10 inline-flex items-center gap-1 rounded-md px-1.5 py-0.5 text-[11px] font-medium text-muted-foreground transition-colors hover:bg-accent hover:text-foreground disabled:opacity-50"
    >
      <EyeOff aria-hidden className="size-3" />
      {t('bulkUnwatch')}
    </button>
  );
}

function Yukleniyor() {
  return (
    <div className="space-y-3">
      {[1, 2, 3].map((i) => (
        <Skeleton key={i} className="h-24 w-full rounded-xl" />
      ))}
    </div>
  );
}

// Projeler arasi tek bir yerde "uzerimde ne var" sorusuna cevap: her proje
// ayri acilmadan tum organizasyonlardaki atanmis kartlar tek listede,
// teslim tarihine gore siralanmis halde.
//
// "Izlediklerim" ikinci bir soruya cevap veriyor: "uzerimde degil ama takip
// ettigim isler ne durumda". Izleme ozelliginin ilk surumu tam da bu ekran
// olmadigi icin kullanissiz bulunup kaldirilmisti - karta abone oluyordun
// ama abone oldugunu gorebilecegin hicbir yer yoktu.
export default function DashboardPage() {
  const { t } = useTranslation();
  const { data: cards = [], isLoading } = useGetMyAssignedCardsQuery();
  const { data: watched = [], isLoading: izlenenYukleniyor } = useGetWatchedCardsQuery();

  return (
    <div className="mx-auto max-w-5xl space-y-10 px-4 py-8 sm:px-6">
      <section>
        <div className="mb-6 flex items-center gap-2">
          <ListChecks className="size-5 text-primary" />
          <h1 className="text-xl font-semibold text-foreground">{t('assignedToMe')}</h1>
        </div>

        {isLoading ? (
          <Yukleniyor />
        ) : cards.length === 0 ? (
          <p className="text-sm text-muted-foreground">{t('dashboardNoCards')}</p>
        ) : (
          <div className="space-y-3">
            {cards.map((card) => (
              <DashboardCard
                key={card.id}
                cardId={card.id}
                title={card.title}
                priority={card.priority}
                dueDate={card.dueDate}
                projectId={card.projectId}
                projectName={card.projectName}
                organizationId={card.organizationId}
                onEk={card.organizationName}
                sonEk={card.columnName}
                altBilgi={
                  card.labels.length > 0 ? (
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
                  ) : null
                }
                ekRozet={
                  card.isBlocked ? (
                    <span className="flex items-center gap-1 text-xs text-amber-600 dark:text-amber-400">
                      <AlertTriangle className="size-3" /> {t('blocked')}
                    </span>
                  ) : null
                }
              />
            ))}
          </div>
        )}
      </section>

      <section>
        <div className="mb-2 flex items-center gap-2">
          <Eye className="size-5 text-primary" />
          <h2 className="text-xl font-semibold text-foreground">{t('watchedByMe')}</h2>
        </div>
        <p className="mb-6 text-sm text-muted-foreground">{t('watchedByMeDesc')}</p>

        {izlenenYukleniyor ? (
          <Yukleniyor />
        ) : watched.length === 0 ? (
          <p className="text-sm text-muted-foreground">{t('dashboardNoWatched')}</p>
        ) : (
          <div className="space-y-3">
            {watched.map((card) => (
              <DashboardCard
                key={card.id}
                cardId={card.id}
                title={card.title}
                priority={card.priority}
                dueDate={card.dueDate}
                projectId={card.projectId}
                projectName={card.projectName}
                organizationId={card.organizationId}
                sonEk={card.columnName}
                altBilgi={
                  // Izlenen kartta en cok merak edilen sey KIMDE oldugu - atanan
                  // sen degilsin. Atanmamis kart da acikca soylenmeli, yoksa
                  // "bilgi yuklenmedi mi" belirsizligi kaliyor.
                  <p className="mt-1.5 truncate text-xs text-muted-foreground">
                    {card.assignees.length > 0
                      ? `${t('assigneesLabel')}: ${card.assignees.map((a) => a.name).join(', ')}`
                      : t('watchedUnassigned')}
                  </p>
                }
                ekRozet={
                  <>
                    {card.isDone && (
                      <span className="text-xs font-medium text-emerald-600 dark:text-emerald-400">
                        {t('watchedDone')}
                      </span>
                    )}
                    <IzlemeyiBirakDugmesi cardId={card.id} />
                  </>
                }
              />
            ))}
          </div>
        )}
      </section>
    </div>
  );
}
