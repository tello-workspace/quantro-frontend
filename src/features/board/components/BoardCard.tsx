// src/features/board/components/BoardCard.tsx
import React from 'react';
import { useSortable } from '@dnd-kit/sortable';
import { CSS } from '@dnd-kit/utilities';
import { Task } from '../services/boardService';
import { CalendarDaysIcon, UserIcon, ClockIcon, ExclamationTriangleIcon, CheckCircleIcon, CheckIcon } from '@heroicons/react/24/outline';
import { Badge } from '@/components/ui/badge';
import { Avatar, AvatarImage, AvatarFallback } from '@/components/ui/avatar';
import { useTranslation } from '@/hooks/useTranslation';

export interface CardConflictInfo {
  filePath: string;
  otherCardTitle: string;
  otherUserName: string;
}

interface BoardCardProps {
  task: Task;
  onClick: () => void;
  isDoneColumn?: boolean;
  conflict?: CardConflictInfo;
  /** Kart toplu islem icin secili mi */
  selected?: boolean;
  /** Panoda en az bir kart secili mi - secim modundayken kart govdesine
   *  tiklamak karti acmak yerine secimi degistirir (Trello/Linear davranisi;
   *  toplu secim yaparken yanlislikla kart acmayi onler) */
  selectionActive?: boolean;
  onToggleSelect?: () => void;
}

function initials(name: string): string {
  return name.split(' ').map((n) => n[0]).join('').toUpperCase();
}

const PRIORITY_BAR: Record<string, string> = {
  URGENT: 'bg-red-500',
  HIGH: 'bg-orange-500',
  MEDIUM: 'bg-blue-500',
  LOW: 'bg-muted-foreground/40',
};

const MAX_VISIBLE_ASSIGNEES = 3;
const STALE_DAYS = 7;
const VERY_STALE_DAYS = 14;

function staleDays(lastActivityAt?: string): number | null {
  if (!lastActivityAt) return null;
  const diffMs = Date.now() - new Date(lastActivityAt).getTime();
  return diffMs / (24 * 60 * 60 * 1000);
}

function formatDate(dateStr: string, lang: string): string {
  try {
    const date = new Date(dateStr);
    if (isNaN(date.getTime())) return dateStr;
    const locale = lang === 'en' ? 'en-US' : 'tr-TR';
    return date.toLocaleDateString(locale, { day: 'numeric', month: 'short', year: 'numeric' });
  } catch {
    return dateStr;
  }
}

export const BoardCard: React.FC<BoardCardProps> = ({
  task,
  onClick,
  isDoneColumn = false,
  conflict,
  selected = false,
  selectionActive = false,
  onToggleSelect,
}) => {
  const { t, lang } = useTranslation();
  const {
    attributes,
    listeners,
    setNodeRef,
    transform,
    transition,
    isDragging,
  } = useSortable({ id: task.id });

  const style = {
    transform: CSS.Translate.toString(transform),
    transition,
    opacity: isDragging ? 0.3 : 1,
  };

  // Bitmis (Done) kartlar hicbir zaman "bayat" sayilmaz - backend'in gece
  // taramasi da ayni sekilde column.isDone true olan kartlari atliyor
  // (bkz. scan.service.ts scanStaleCards). Bitmis bir kartin uzun suredir
  // hareketsiz olmasi beklenen bir durum, uyari degil.
  const days = isDoneColumn ? null : staleDays(task.lastActivityAt);
  const isVeryStale = days !== null && days >= VERY_STALE_DAYS;
  const isStale = days !== null && days >= STALE_DAYS;

  const priorityKey = task.priority ? `priority${task.priority.charAt(0).toUpperCase()}${task.priority.slice(1).toLowerCase()}` : '';
  const priorityLabel = priorityKey ? t(priorityKey as any) : '';

  return (
    <div
      ref={setNodeRef}
      style={style}
      {...attributes}
      {...listeners}
      onClick={selectionActive && onToggleSelect ? onToggleSelect : onClick}
      title={
        [
          task.priority ? `${t('priorityLabel')}: ${priorityLabel}` : null,
          isStale ? `${Math.floor(days!)} ${t('daysInactive')}` : null,
          conflict
            ? `${t('conflictRiskTitle')} ${conflict.filePath} ${t('conflictRiskDesc')}`
            : null,
        ]
          .filter(Boolean)
          .join(' · ') || undefined
      }
      className={`group relative cursor-pointer overflow-hidden rounded-xl border p-3 pl-4 transition-all duration-200 shrink-0 ${
        selected ? 'ring-2 ring-primary ring-offset-1 ring-offset-background' : ''
      } ${
        isDragging
          ? 'border-dashed border-primary/40 bg-muted/20 shadow-none'
          : `bg-card shadow-soft hover:-translate-y-0.5 hover:border-primary/60 hover:shadow-soft-md active:translate-y-0 ${
              isVeryStale
                ? 'border-destructive/60'
                : isStale
                  ? 'border-border opacity-75 hover:opacity-100'
                  : 'border-border'
            }`
      }`}
    >
      {/* Secim kutusu: normalde gizli, kartin uzerine gelince veya kart
          seciliyken gorunur. onPointerDown durduruluyor cunku surukleme
          dinleyicileri kok elemanda: durdurulmazsa kutuya tiklamak
          sürükleme baslatiyor. */}
      {onToggleSelect && (
        <button
          type="button"
          onPointerDown={(e) => e.stopPropagation()}
          onClick={(e) => {
            e.stopPropagation();
            onToggleSelect();
          }}
          aria-label={selected ? t('deselectCard') : t('selectCard')}
          aria-pressed={selected}
          className={`absolute right-2 top-2 z-10 flex size-4 items-center justify-center rounded border transition-all ${
            selected
              ? 'border-primary bg-primary text-primary-foreground'
              : 'border-border bg-card opacity-0 group-hover:opacity-100 focus-visible:opacity-100'
          }`}
        >
          {selected && <CheckIcon className="size-3" strokeWidth={3} />}
        </button>
      )}
      {/* Oncelik solda ince bir serit: nokta yerine kart taranirken
          uzaktan okunabilen bir sinyal veriyor. Done sütununda oncelik
          sinyali anlamsiz oldugundan yerine yesil "tamamlandi" seridi
          gosteriliyor. */}
      {isDoneColumn ? (
        <span aria-hidden className="absolute inset-y-0 left-0 w-1 bg-emerald-500" />
      ) : (
        task.priority && (
          <span aria-hidden className={`absolute inset-y-0 left-0 w-1 ${PRIORITY_BAR[task.priority]}`} />
        )
      )}

      {/* Kapak gorseli: kartin ilk gorsel eki. Kartin ic dolgusunu asmak icin
          negatif margin - gorsel kenarlara dayanmali, cerceve icinde
          yuzmemeli. Yuklenemezse (imzali URL suresi dolmus olabilir) eleman
          gizleniyor, kirik gorsel ikonu gosterilmiyor. */}
      {task.coverUrl && (
        // next/image kullanilmiyor: imzali URL her saat degistigi icin
        // optimizasyon onbellegi tutmaz ve her yeni imza yeni bir kaynak
        // sayilir - kazanc yerine ek yuk olurdu.
        // eslint-disable-next-line @next/next/no-img-element
        <img
          src={task.coverUrl}
          alt=""
          loading="lazy"
          onError={(e) => { e.currentTarget.style.display = 'none'; }}
          className="-mt-3 -mr-3 mb-2.5 -ml-4 h-28 w-[calc(100%+1.75rem)] object-cover"
        />
      )}

      {conflict && (
        <span
          aria-hidden
          className="absolute right-2 top-2 flex h-4 w-4 items-center justify-center rounded-full bg-orange-500 text-white shadow-sm animate-pulse"
        >
          <ExclamationTriangleIcon className="h-2.5 w-2.5" />
        </span>
      )}

      {task.labels && task.labels.length > 0 && (
        <div className="mb-1.5 flex flex-wrap gap-1">
          {task.labels.map((label) => (
            <Badge
              key={label.id}
              className="border-0 text-[10px] text-white"
              style={{ backgroundColor: label.color }}
            >
              {label.name}
            </Badge>
          ))}
        </div>
      )}

      {/* line-clamp: kartlarin boyu icerige gore savrulmasin. Basliksiz bir
          ust sinir yokken AI'nin urettigi uzun bir baslik (ornekte 631
          karakter) karti sutunun tamamina yayiyordu. Tam metin karti acinca
          gorunuyor; burada tooltip'te de var. */}
      <h4
        title={task.title}
        className="mb-1 line-clamp-2 text-sm font-medium leading-snug text-foreground transition-colors group-hover:text-primary"
      >
        {task.title}
      </h4>

      {isStale && (
        <span className="mb-1 inline-flex items-center gap-1 text-[10px] font-medium text-muted-foreground">
          <ClockIcon className="h-3 w-3" />
          {Math.floor(days!)} {t('daysInactive')}
        </span>
      )}

      {task.description && (
        // whitespace-pre-wrap kaldirildi: aciklama artik markdown ve satir
        // sonlari kartta uc satirlik onizlemeyi bosuna sisiriyordu. Tam metin
        // (bicimlendirilmis haliyle) kart acilinca gorunuyor.
        <p className="mb-2 line-clamp-3 text-xs text-muted-foreground">
          {task.description}
        </p>
      )}

      <div className="flex items-center justify-between mt-2 pt-2 border-t border-border text-[11px] text-muted-foreground">
        <div className="flex items-center gap-1">
          {task.dueDate && (() => {
            const date = new Date(task.dueDate);
            // Date.now() render sirasinda "saf olmayan" cagri sayiliyor, ama
            // burada sadece gorsel bir rozet icin an'lik karsilastirma
            // yapiliyor; degeri state'e tasimak bu rozet icin gereksiz
            // karmasiklik katardi.
            // eslint-disable-next-line react-hooks/purity
            const isOverdue = !isDoneColumn && date.getTime() < Date.now();
            return (
              <span className={`inline-flex items-center gap-1 px-1.5 py-0.5 rounded-md font-medium text-[10px] ${
                isDoneColumn 
                  ? 'bg-emerald-500/10 text-emerald-600 dark:text-emerald-400' 
                  : isOverdue 
                    ? 'bg-rose-500/10 text-rose-600 dark:text-rose-400' 
                    : 'bg-zinc-100 dark:bg-zinc-800 text-zinc-600 dark:text-zinc-400'
              }`}>
                <CalendarDaysIcon className="h-3.5 w-3.5" />
                <span>{formatDate(task.dueDate, lang)}</span>
              </span>
            );
          })()}

          {!!task.checklistTotal && (
            <span
              className={`inline-flex items-center gap-1 px-1.5 py-0.5 rounded-md font-medium text-[10px] ${
                task.checklistDone === task.checklistTotal
                  ? 'bg-emerald-500/10 text-emerald-600 dark:text-emerald-400'
                  : 'bg-zinc-100 dark:bg-zinc-800 text-zinc-600 dark:text-zinc-400'
              }`}
            >
              <CheckCircleIcon className="h-3.5 w-3.5" />
              <span>{task.checklistDone}/{task.checklistTotal}</span>
            </span>
          )}

        </div>

        {task.assignees && task.assignees.length > 0 ? (
          <div className="flex items-center -space-x-1.5">
            {task.assignees.slice(0, MAX_VISIBLE_ASSIGNEES).map((a) => {
              const badgeList = (a as any).badges?.length
                ? (a as any).badges.map((b: any) => {
                    const iconText = b.icon && (b.icon.startsWith('http') || b.icon.startsWith('data:')) ? '🏅' : (b.icon || '');
                    return `${iconText} ${b.name}`;
                  }).join(' · ')
                : '';
              return (
                <Avatar
                  key={a.id}
                  size="sm"
                  className="border-2 border-background"
                  title={badgeList ? `${a.name}\n${badgeList}` : a.name}
                >
                  {a.avatarUrl && <AvatarImage src={a.avatarUrl} alt={a.name} />}
                  <AvatarFallback className="bg-primary/10 text-primary text-[10px]">
                    {initials(a.name)}
                  </AvatarFallback>
                </Avatar>
              );
            })}
            {task.assignees.length > MAX_VISIBLE_ASSIGNEES && (
              <Avatar size="sm" className="border-2 border-background">
                <AvatarFallback className="text-[9px]">
                  +{task.assignees.length - MAX_VISIBLE_ASSIGNEES}
                </AvatarFallback>
              </Avatar>
            )}
          </div>
        ) : (
          <UserIcon className="h-3.5 w-3.5 text-muted-foreground/50" />
        )}
      </div>
    </div>
  );
};
