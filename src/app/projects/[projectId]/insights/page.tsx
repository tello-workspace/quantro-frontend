'use client';

import React from 'react';
import Link from 'next/link';
import { useParams, useSearchParams } from 'next/navigation';
import {
  useGetProjectInsightsQuery,
  useGetWeeklySummaryQuery,
} from '@/features/insights/insightsApi';
import { WorkloadBarChart } from '@/features/insights/components/WorkloadBarChart';
import { WipMeter } from '@/features/insights/components/WipMeter';
import { CardTypeIcon } from '@/features/board/components/CardTypeIcon';
import { useTranslation } from '@/hooks/useTranslation';

function timeAgo(iso: string): string {
  const days = Math.floor((Date.now() - new Date(iso).getTime()) / (24 * 60 * 60 * 1000));
  if (days <= 0) return 'bugün';
  return `${days} gün önce`;
}

function daysUntil(iso: string): string {
  const days = Math.ceil((new Date(iso).getTime() - Date.now()) / (24 * 60 * 60 * 1000));
  if (days < 0) return `${Math.abs(days)} gün geçti`;
  if (days === 0) return 'bugün';
  return `${days} gün kaldı`;
}

export default function ProjectInsightsPage() {
  const { t } = useTranslation();
  const params = useParams();
  const searchParams = useSearchParams();
  const projectId = params?.projectId as string;
  const orgId = searchParams.get('orgId') ?? '';

  const { data: insights, isLoading: insightsLoading } = useGetProjectInsightsQuery({ projectId });
  const { data: summary, isLoading: summaryLoading } = useGetWeeklySummaryQuery({ projectId });

  return (
    <main className="min-h-screen bg-zinc-50 dark:bg-zinc-950 p-6">
      <div className="max-w-5xl mx-auto space-y-8">
        <div className="flex items-center justify-between">
          <h1 className="text-2xl font-bold text-zinc-900 dark:text-zinc-50">{t('insightsTitle')}</h1>
          <Link
            href={`/projects/${projectId}?orgId=${orgId}`}
            className="text-sm text-blue-600 hover:underline"
          >
            ← Panoya dön
          </Link>
        </div>

        {/* Haftalık özet */}
        <section>
          <h2 className="text-sm font-semibold text-zinc-500 dark:text-zinc-400 uppercase mb-3">
            Bu Hafta
          </h2>
          {summaryLoading ? (
            <p className="text-sm text-zinc-400">{t('loading')}</p>
          ) : summary ? (
            <div className="grid grid-cols-2 sm:grid-cols-4 gap-3">
              <div className="p-4 rounded-xl border border-zinc-200 dark:border-zinc-800 bg-white dark:bg-zinc-900">
                <p className="text-2xl font-bold text-zinc-900 dark:text-zinc-50">{summary.cardsCreated}</p>
                <p className="text-xs text-zinc-500 dark:text-zinc-400">{t('cardsOpened')}</p>
              </div>
              <div className="p-4 rounded-xl border border-zinc-200 dark:border-zinc-800 bg-white dark:bg-zinc-900">
                <p className="text-2xl font-bold text-zinc-900 dark:text-zinc-50">{summary.cardsCompleted}</p>
                <p className="text-xs text-zinc-500 dark:text-zinc-400">Biten kart</p>
              </div>
              <div className="p-4 rounded-xl border border-zinc-200 dark:border-zinc-800 bg-white dark:bg-zinc-900">
                <p className="text-2xl font-bold text-zinc-900 dark:text-zinc-50">{summary.commentsAdded}</p>
                <p className="text-xs text-zinc-500 dark:text-zinc-400">Yeni yorum</p>
              </div>
              <div className="p-4 rounded-xl border border-zinc-200 dark:border-zinc-800 bg-white dark:bg-zinc-900">
                <p className="text-sm font-semibold text-zinc-900 dark:text-zinc-50 truncate">
                  {summary.mostActiveMember?.userName ?? '—'}
                </p>
                <p className="text-xs text-zinc-500 dark:text-zinc-400">{t('mostActiveMember')}</p>
              </div>
            </div>
          ) : null}
        </section>

        {insightsLoading ? (
          <p className="text-sm text-zinc-400">{t('loading')}</p>
        ) : insights ? (
          <>
            {/* WIP ihlalleri */}
            <section>
              <h2 className="text-sm font-semibold text-zinc-500 dark:text-zinc-400 uppercase mb-3">
                Darboğazlar {insights.wipViolations.length > 0 && `(${insights.wipViolations.length})`}
              </h2>
              {insights.wipViolations.length === 0 ? (
                <p className="text-sm text-zinc-400">{t('noWipExceeded')}</p>
              ) : (
                <div className="space-y-2">
                  {insights.wipViolations.map((w) => (
                    <WipMeter key={w.columnId} violation={w} />
                  ))}
                </div>
              )}
            </section>

            {/* İş yükü dağılımı */}
            <section>
              <h2 className="text-sm font-semibold text-zinc-500 dark:text-zinc-400 uppercase mb-3">
                İş Yükü Dağılımı
              </h2>
              <WorkloadBarChart workload={insights.workload} />
            </section>

            {/* İş tipi kırılımı: aktif (Done disindaki) kartlarin CardType'a gore sayisi */}
            <section>
              <h2 className="text-sm font-semibold text-zinc-500 dark:text-zinc-400 uppercase mb-3">
                İş Tipi Kırılımı
              </h2>
              <div className="grid grid-cols-5 gap-3">
                {(['EPIC', 'STORY', 'TASK', 'BUG', 'SUBTASK'] as const).map((tip) => (
                  <div
                    key={tip}
                    className="p-4 rounded-xl border border-zinc-200 dark:border-zinc-800 bg-white dark:bg-zinc-900 flex flex-col items-center gap-1.5"
                  >
                    <CardTypeIcon type={tip} className="size-4" />
                    <p className="text-2xl font-bold text-zinc-900 dark:text-zinc-50">
                      {insights.typeBreakdown[tip]}
                    </p>
                    <p className="text-xs text-zinc-500 dark:text-zinc-400">
                      {t(`type${tip.charAt(0)}${tip.slice(1).toLowerCase()}` as Parameters<typeof t>[0])}
                    </p>
                  </div>
                ))}
              </div>
            </section>

            {/* Deadline riskleri */}
            <section>
              <h2 className="text-sm font-semibold text-zinc-500 dark:text-zinc-400 uppercase mb-3">
                Deadline Riskleri {insights.deadlineRisks.length > 0 && `(${insights.deadlineRisks.length})`}
              </h2>
              {insights.deadlineRisks.length === 0 ? (
                <p className="text-sm text-zinc-400">Riskli kart yok.</p>
              ) : (
                <div className="space-y-2">
                  {insights.deadlineRisks.map((c) => (
                    <div
                      key={c.id}
                      className="p-3 rounded-lg border border-red-300 dark:border-red-700 bg-red-50 dark:bg-red-950/30 text-sm flex justify-between items-center"
                    >
                      <div>
                        <p className="font-medium text-zinc-800 dark:text-zinc-100">{c.title}</p>
                        <p className="text-xs text-zinc-500 dark:text-zinc-400">{c.columnName}</p>
                      </div>
                      <span className="text-red-700 dark:text-red-400 text-xs font-medium shrink-0">
                        {daysUntil(c.dueDate)}
                      </span>
                    </div>
                  ))}
                </div>
              )}
            </section>

            {/* Stale kartlar */}
            <section>
              <h2 className="text-sm font-semibold text-zinc-500 dark:text-zinc-400 uppercase mb-3">
                Bayatlayan Kartlar {insights.staleCards.length > 0 && `(${insights.staleCards.length})`}
              </h2>
              {insights.staleCards.length === 0 ? (
                <p className="text-sm text-zinc-400">Hareketsiz kalan kart yok.</p>
              ) : (
                <div className="space-y-2">
                  {insights.staleCards.map((c) => (
                    <div
                      key={c.id}
                      className="p-3 rounded-lg border border-zinc-200 dark:border-zinc-800 bg-white dark:bg-zinc-900 text-sm flex justify-between items-center"
                    >
                      <div>
                        <p className="font-medium text-zinc-800 dark:text-zinc-100">{c.title}</p>
                        <p className="text-xs text-zinc-500 dark:text-zinc-400">{c.columnName}</p>
                      </div>
                      <span className="text-xs text-zinc-500 dark:text-zinc-400 shrink-0">
                        {timeAgo(c.lastActivityAt)}
                      </span>
                    </div>
                  ))}
                </div>
              )}
            </section>
          </>
        ) : null}
      </div>
    </main>
  );
}
