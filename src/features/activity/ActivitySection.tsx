'use client';

import React from 'react';
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
import { useGetCardActivitiesQuery, ActivityEntry, ActivityType } from '@/features/activity/activityApi';
import { useTranslation } from '@/hooks/useTranslation';

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

// TaskModal icinde kartin gecmisini (zaman cizelgesini) gosterir.
// Backend zaten her kart islemini Activity tablosuna logluyor; burada sadece
// karta ozel sorgu + render ediliyor.
export const ActivitySection: React.FC<{ cardId: string }> = ({ cardId }) => {
  const { t } = useTranslation();
  const { data: activities = [], isLoading } = useGetCardActivitiesQuery(cardId);

  return (
    <div className="mt-4">
      <label className="block text-sm font-medium text-muted-foreground mb-1.5">
        {t('activityLabel')} {activities.length > 0 && `(${activities.length})`}
      </label>

      {isLoading ? (
        <p className="text-xs text-muted-foreground">{t('loading')}</p>
      ) : activities.length === 0 ? (
        <p className="text-xs text-muted-foreground">{t('noActivities')}</p>
      ) : (
        <ol className="relative border-l border-border ml-2 space-y-3">
          {activities.map((entry) => {
            const Icon = ICONS[entry.type] ?? PencilSquareIcon;
            return (
              <li key={entry.id} className="ml-5">
                <span className="absolute flex items-center justify-center size-5 rounded-full bg-muted ring-4 ring-background -left-[13px]">
                  <Icon className="size-3 text-muted-foreground" />
                </span>
                <p className="text-xs text-foreground">{describeActivity(entry)}</p>
                <p className="text-[10px] text-muted-foreground">{timeAgo(entry.createdAt)}</p>
              </li>
            );
          })}
        </ol>
      )}
    </div>
  );
};
