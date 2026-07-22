'use client';

import React from 'react';
import Link from 'next/link';
import { useParams } from 'next/navigation';
import {
  PlusCircleIcon,
  PencilSquareIcon,
  ArrowRightIcon,
  UserPlusIcon,
  CheckCircleIcon,
  ChatBubbleLeftIcon,
  LinkIcon,
  UsersIcon,
} from '@heroicons/react/24/outline';
import { useGetProjectActivitiesQuery, ActivityEntry, ActivityType } from '@/features/activity/activityApi';

const ICONS: Record<ActivityType, React.ComponentType<{ className?: string }>> = {
  CARD_CREATED: PlusCircleIcon,
  CARD_UPDATED: PencilSquareIcon,
  CARD_MOVED: ArrowRightIcon,
  CARD_ASSIGNED: UserPlusIcon,
  CARD_COMPLETED: CheckCircleIcon,
  COMMENT_ADDED: ChatBubbleLeftIcon,
  MEMBER_JOINED: UsersIcon,
  DEPENDENCY_ADDED: LinkIcon,
};

function timeAgo(iso: string): string {
  const diffMs = Date.now() - new Date(iso).getTime();
  const mins = Math.floor(diffMs / 60000);
  if (mins < 1) return 'az önce';
  if (mins < 60) return `${mins} dk önce`;
  const hours = Math.floor(mins / 60);
  if (hours < 24) return `${hours} sa önce`;
  const days = Math.floor(hours / 24);
  return `${days} gün önce`;
}

function describeActivity(entry: ActivityEntry): string {
  const userName = entry.user.name;
  const cardTitle = entry.card?.title;
  const data = entry.data ?? {};

  switch (entry.type) {
    case 'CARD_CREATED':
      return `${userName}, "${cardTitle}" kartını oluşturdu`;
    case 'CARD_UPDATED':
      return `${userName}, "${cardTitle}" kartını güncelledi`;
    case 'CARD_MOVED':
      return `${userName}, "${cardTitle}" kartını ${data.from ?? '?'} → ${data.to ?? '?'} taşıdı`;
    case 'CARD_ASSIGNED': {
      const names = Array.isArray(data.assignedTo) ? (data.assignedTo as string[]).join(', ') : '';
      return `${userName}, "${cardTitle}" kartını ${names} kişisine atadı`;
    }
    case 'CARD_COMPLETED':
      return `${userName}, "${cardTitle}" kartını tamamladı`;
    case 'COMMENT_ADDED':
      return `${userName}, "${cardTitle}" kartına yorum yaptı: "${data.preview ?? ''}"`;
    case 'DEPENDENCY_ADDED':
      return `${userName}, "${data.blockedTitle ?? cardTitle}" kartını "${data.blockerTitle ?? ''}" kartına bağımlı yaptı`;
    case 'MEMBER_JOINED':
      return `${userName} projeye katıldı`;
    default:
      return `${userName} bir işlem yaptı`;
  }
}

export default function ProjectActivityPage() {
  const params = useParams();
  const projectId = params?.projectId as string;

  const { data: activities, isLoading } = useGetProjectActivitiesQuery({ projectId });

  return (
    <main className="min-h-screen bg-zinc-50 dark:bg-zinc-950 p-6">
      <div className="max-w-2xl mx-auto space-y-6">
        <div className="flex items-center justify-between">
          <h1 className="text-2xl font-bold text-zinc-900 dark:text-zinc-50">Aktivite Akışı</h1>
          <Link href={`/projects/${projectId}`} className="text-sm text-blue-600 hover:underline">
            ← Panoya dön
          </Link>
        </div>

        {isLoading ? (
          <p className="text-sm text-zinc-400">Yükleniyor...</p>
        ) : !activities || activities.length === 0 ? (
          <p className="text-sm text-zinc-400">Henüz hiçbir aktivite yok.</p>
        ) : (
          <ol className="relative border-l border-zinc-200 dark:border-zinc-800 ml-3">
            {activities.map((entry) => {
              const Icon = ICONS[entry.type] ?? PencilSquareIcon;
              return (
                <li key={entry.id} className="mb-4 ml-6">
                  <span className="absolute flex items-center justify-center w-6 h-6 rounded-full bg-zinc-100 dark:bg-zinc-800 ring-4 ring-zinc-50 dark:ring-zinc-950 -left-3">
                    <Icon className="w-3.5 h-3.5 text-zinc-500 dark:text-zinc-400" />
                  </span>
                  <p className="text-sm text-zinc-700 dark:text-zinc-300">{describeActivity(entry)}</p>
                  <p className="text-xs text-zinc-400 dark:text-zinc-500">{timeAgo(entry.createdAt)}</p>
                </li>
              );
            })}
          </ol>
        )}
      </div>
    </main>
  );
}
