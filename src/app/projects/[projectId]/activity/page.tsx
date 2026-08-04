'use client';

import React, { useMemo, useState } from 'react';
import Link from 'next/link';
import { useParams, useSearchParams } from 'next/navigation';
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
import { ArrowLeft, ChevronDown } from 'lucide-react';
import { Avatar, AvatarFallback, AvatarImage } from '@/components/ui/avatar';
import { Skeleton } from '@/components/ui/skeleton';
import { useGetProjectActivitiesQuery, ActivityEntry, ActivityType } from '@/features/activity/activityApi';
import { useTranslation } from '@/hooks/useTranslation';

// Ilk ekranda gosterilecek kayit sayisi. Gerisi "Daha eskilerini goster"
// arkasinda duruyor - akis 50 kayda kadar cikabiliyor ve tamami birden
// basildiginda sayfa okunaksiz uzunlukta oluyordu.
const INITIAL_VISIBLE = 12;

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

// Tasarim sistemi semantik renkleri "yalnizca durum gostergeleri icin"
// ayiriyor. Bu yuzden akisin tamami notr; sadece gercek bir durum degisikligi
// olan tamamlanma ve akisi engelleyen bagimlilik renk aliyor.
const ICON_TONE: Partial<Record<ActivityType, string>> = {
  CARD_COMPLETED: 'text-emerald-600 dark:text-emerald-400',
  DEPENDENCY_ADDED: 'text-amber-600 dark:text-amber-500',
  CARD_CREATED: 'text-primary',
};

function initials(name: string) {
  return name
    .split(' ')
    .filter(Boolean)
    .slice(0, 2)
    .map((p) => p[0]?.toUpperCase())
    .join('');
}

// Gun basligi: bugun/dun ozel olarak adlandiriliyor, digerleri tam tarih.
function dayLabel(iso: string): string {
  const date = new Date(iso);
  const today = new Date();
  const dun = new Date();
  dun.setDate(today.getDate() - 1);

  const ayniGun = (a: Date, b: Date) =>
    a.getFullYear() === b.getFullYear() && a.getMonth() === b.getMonth() && a.getDate() === b.getDate();

  if (ayniGun(date, today)) return 'Bugün';
  if (ayniGun(date, dun)) return 'Dün';
  return date.toLocaleDateString('tr-TR', { day: 'numeric', month: 'long', year: 'numeric' });
}

function timeLabel(iso: string): string {
  return new Date(iso).toLocaleTimeString('tr-TR', { hour: '2-digit', minute: '2-digit' });
}

// Aktivite metni iki parcaya ayriliyor: baslik ve (varsa) detay. Kisi adi
// basliktan cikarildi cunku islemi yapan zaten altta avatariyla gosteriliyor.
function describeActivity(entry: ActivityEntry): { title: string; detail?: string } {
  const cardTitle = entry.card?.title ?? 'kart';
  const data = entry.data ?? {};

  switch (entry.type) {
    case 'CARD_CREATED':
      return { title: `"${cardTitle}" kartını oluşturdu` };
    case 'CARD_UPDATED':
      return { title: `"${cardTitle}" kartını güncelledi` };
    case 'CARD_MOVED':
      return {
        title: `"${cardTitle}" kartını taşıdı`,
        detail: `${data.from ?? '?'} → ${data.to ?? '?'}`,
      };
    case 'CARD_ASSIGNED': {
      const names = Array.isArray(data.assignedTo) ? (data.assignedTo as string[]).join(', ') : '';
      return { title: `"${cardTitle}" kartını atadı`, detail: names || undefined };
    }
    case 'CARD_COMPLETED':
      return { title: `"${cardTitle}" kartını tamamladı` };
    case 'COMMENT_ADDED':
      return {
        title: `"${cardTitle}" kartına yorum yaptı`,
        detail: typeof data.preview === 'string' && data.preview ? `"${data.preview}"` : undefined,
      };
    case 'DEPENDENCY_ADDED':
      return {
        title: `"${data.blockedTitle ?? cardTitle}" kartını bağımlı yaptı`,
        detail: data.blockerTitle ? `Engelleyen: "${data.blockerTitle}"` : undefined,
      };
    case 'MEMBER_JOINED':
      return { title: 'Projeye katıldı' };
    default:
      return { title: 'Bir işlem yaptı' };
  }
}

interface TimelineItemProps {
  entry: ActivityEntry;
  projectId: string;
  orgId: string;
  isLast: boolean;
}

function TimelineItem({ entry, projectId, orgId, isLast }: TimelineItemProps) {
  const Icon = ICONS[entry.type] ?? PencilSquareIcon;
  const { title, detail } = describeActivity(entry);
  const href = entry.card
    ? `/projects/${projectId}?orgId=${orgId}&openCard=${entry.card.id}`
    : null;

  const content = (
    <div className="flex gap-x-3">
      {/* Ikon sutunu: dikey baglanti cizgisi ::after ile ciziliyor, son
          kayitta bosluga sarkmamasi icin gizleniyor. */}
      <div
        className={`relative ${
          isLast
            ? ''
            : 'after:absolute after:top-8 after:bottom-0 after:start-3.5 after:-translate-x-[0.5px] after:border-s after:border-border'
        }`}
      >
        <div className="relative z-10 flex size-7 items-center justify-center rounded-full border border-border bg-card">
          {/* stroke-2: tasarim sistemi ikon konturunu tipografinin gorsel
              agirligiyla esitliyor (heroicons varsayilani 1.5). */}
          <Icon className={`size-3.5 stroke-2 ${ICON_TONE[entry.type] ?? 'text-muted-foreground'}`} />
        </div>
      </div>

      <div className="grow pb-5">
        <h3 className="text-sm leading-5 font-medium text-foreground">{title}</h3>

        {detail && (
          <p className="mt-1 line-clamp-2 text-sm leading-5 text-muted-foreground">{detail}</p>
        )}

        <div className="mt-2 flex items-center gap-x-2 text-xs leading-4 text-muted-foreground">
          <Avatar size="sm">
            {entry.user.avatarUrl && <AvatarImage src={entry.user.avatarUrl} alt={entry.user.name} />}
            <AvatarFallback className="text-[10px]">{initials(entry.user.name)}</AvatarFallback>
          </Avatar>
          <span className="font-medium text-foreground/80">{entry.user.name}</span>
          <span aria-hidden>·</span>
          <time dateTime={entry.createdAt}>{timeLabel(entry.createdAt)}</time>
        </div>
      </div>
    </div>
  );

  // Karta baglanabilen kayitlar satir olarak tiklanabilir; hover geri
  // bildirimi tasarim sisteminin liste davranisi.
  return href ? (
    <Link
      href={href}
      className="-mx-2 block rounded-lg px-2 pt-2 transition-colors hover:bg-muted/60"
    >
      {content}
    </Link>
  ) : (
    <div className="-mx-2 px-2 pt-2">{content}</div>
  );
}

export default function ProjectActivityPage() {
  const { t } = useTranslation();
  const params = useParams();
  const searchParams = useSearchParams();
  const projectId = params?.projectId as string;
  const orgId = searchParams.get('orgId') ?? '';

  const { data: activities, isLoading } = useGetProjectActivitiesQuery({ projectId });
  const [showAll, setShowAll] = useState(false);

  // Kayitlar gune gore gruplaniyor; API zaten createdAt'e gore azalan
  // sirada donduruyor, o yuzden ek bir siralamaya gerek yok.
  const groups = useMemo(() => {
    const visible = showAll ? activities ?? [] : (activities ?? []).slice(0, INITIAL_VISIBLE);
    const map = new Map<string, ActivityEntry[]>();
    for (const entry of visible) {
      const key = dayLabel(entry.createdAt);
      const bucket = map.get(key);
      if (bucket) bucket.push(entry);
      else map.set(key, [entry]);
    }
    return [...map.entries()];
  }, [activities, showAll]);

  const total = activities?.length ?? 0;
  const hasMore = !showAll && total > INITIAL_VISIBLE;

  return (
    <main className="mx-auto w-full max-w-2xl p-4 sm:p-8">
      <div className="mb-6">
        <Link
          href={`/projects/${projectId}${orgId ? `?orgId=${orgId}` : ''}`}
          className="inline-flex items-center gap-1 text-xs text-muted-foreground transition-colors hover:text-foreground"
        >
          <ArrowLeft className="size-3.5" />
          Panoya dön
        </Link>
        <h1 className="mt-1 text-2xl leading-8 font-semibold tracking-[-0.01em] text-foreground">
          Aktivite Akışı
        </h1>
        <p className="mt-1 text-sm text-muted-foreground">
          Projede yapılan son {total > 0 ? total : ''} işlem
        </p>
      </div>

      {/* Level 1 yuzey: 1px kenarlik, golgesiz - tasarim sistemi hiyerarsiyi
          golgeyle degil tonal katmanlamayla kuruyor. */}
      <section className="rounded-xl border border-border bg-card p-4 sm:p-6">
        {isLoading ? (
          <div className="space-y-4">
            {Array.from({ length: 5 }).map((_, i) => (
              <div key={i} className="flex gap-x-3">
                <Skeleton className="size-7 shrink-0 rounded-full" />
                <div className="grow space-y-2 pb-4">
                  <Skeleton className="h-4 w-2/3" />
                  <Skeleton className="h-3 w-1/3" />
                </div>
              </div>
            ))}
          </div>
        ) : total === 0 ? (
          <div className="py-12 text-center">
            <p className="text-sm text-foreground">{t('noActivityYet')}</p>
            <p className="mt-1 text-sm text-muted-foreground">
              Kart oluşturup taşıdıkça buraya düşecek.
            </p>
          </div>
        ) : (
          <div className="w-full">
            {groups.map(([label, entries], groupIndex) => (
              <React.Fragment key={label}>
                {/* label-bold: 12px/700/0.02em - tasarim sistemi bolum
                    basliklarini bu sekilde "metadata" olarak isaretliyor. */}
                <div className="mb-2 ps-1 not-first:mt-4">
                  <h2 className="text-xs leading-4 font-bold tracking-[0.02em] uppercase text-muted-foreground">
                    {label}
                  </h2>
                </div>
                {entries.map((entry, index) => (
                  <TimelineItem
                    key={entry.id}
                    entry={entry}
                    projectId={projectId}
                    orgId={orgId}
                    // Cizgi yalnizca en son grubun en son kaydinda kesiliyor;
                    // gruplar arasinda akisin devam ettigi gorunmeli.
                    isLast={
                      !hasMore && groupIndex === groups.length - 1 && index === entries.length - 1
                    }
                  />
                ))}
              </React.Fragment>
            ))}

            {hasMore && (
              <button
                type="button"
                onClick={() => setShowAll(true)}
                className="ms-10 inline-flex items-center gap-x-1.5 rounded-md border border-border px-3 py-1 text-xs leading-4 font-medium text-muted-foreground transition-colors hover:bg-muted hover:text-foreground"
              >
                <ChevronDown className="size-3.5 shrink-0" />
                Daha eskilerini göster ({total - INITIAL_VISIBLE})
              </button>
            )}
          </div>
        )}
      </section>
    </main>
  );
}
