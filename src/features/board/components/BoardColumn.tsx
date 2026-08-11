// src/features/board/components/BoardColumn.tsx
import React, { useState, useRef, useEffect } from 'react';
import { useDroppable, useDraggable } from '@dnd-kit/core';
import { SortableContext, verticalListSortingStrategy } from '@dnd-kit/sortable';
import { BoardCard, CardConflictInfo } from './BoardCard';
import { Task } from '../services/boardService';
import { PlusIcon, GripVerticalIcon, PencilIcon, Trash2Icon, BookmarkIcon } from 'lucide-react';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Badge } from '@/components/ui/badge';
import { useConfirm } from '@/hooks/useConfirm';
import type { CardTemplate } from '@/features/templates/templateApi';
import { useTranslation } from '@/hooks/useTranslation';

interface BoardColumnProps {
  id: string;
  title: string;
  tasks: Task[];
  totalCount?: number;
  wipLimit?: number | null;
  isDone?: boolean;
  canAddTask: boolean;
  isAdmin?: boolean;
  onAddTask: (columnId: string, title: string) => void;
  onTaskClick: (taskId: string) => void;
  onRenameColumn?: (columnId: string, newName: string) => void;
  onDeleteColumn?: (columnId: string) => void;
  conflicts?: Record<string, CardConflictInfo>;
  templates?: CardTemplate[];
  onCreateFromTemplate?: (templateId: string, columnId: string) => void;
  /** Toplu islem icin secili kart id'leri */
  selectedIds?: Set<string>;
  onToggleSelect?: (taskId: string) => void;
  /** Kart uzerinde sag tik: karti acmadan izleme/secim menusu */
  onCardContextMenu?: (taskId: string, e: React.MouseEvent) => void;
  /** Kart anahtari oneki ("QNT") - kartlarda QNT-42 olarak gosterilir */
  projectKey?: string;
  /** Efor tahmini toplaminin yanindaki birim etiketi ("puan"/"saat") */
  estimateUnit?: 'POINTS' | 'HOURS';
  /** Surukle-ciz (marquee) seciminin kolon zemininden baslatilmasini ister.
   *  Bu pointer olaylari yalnizca kart DISINDAKI zeminde calisir; kart
   *  uzerindeki surukleme dnd-kit'in sorumlulugunda kalmaya devam eder. */
  onMarqueeStart?: (e: React.PointerEvent) => void;
  onMarqueeMove?: (e: React.PointerEvent) => void;
  onMarqueeEnd?: (e: React.PointerEvent) => void;
  /** Swimlane modunda ayni sutun birden fazla seritte cizilir; dnd-kit
   *  droppable id'leri benzersiz olmak zorunda oldugu icin serit anahtari
   *  id'ye ekleniyor. Verilmezse sade sutun id'si kullanilir. */
  laneKey?: string;
  /** Swimlane basliginda kolon basligi tekrar etmesin diye gizlenebilir */
  hideHeader?: boolean;
}

export const BoardColumn: React.FC<BoardColumnProps> = ({
  id,
  title,
  tasks,
  totalCount,
  wipLimit,
  isDone,
  canAddTask,
  isAdmin = true,
  onAddTask,
  onTaskClick,
  onRenameColumn,
  onDeleteColumn,
  conflicts,
  templates = [],
  onCreateFromTemplate,
  selectedIds,
  onToggleSelect,
  onCardContextMenu,
  projectKey,
  estimateUnit,
  onMarqueeStart,
  onMarqueeMove,
  onMarqueeEnd,
  laneKey,
  hideHeader = false,
}) => {
  const { t } = useTranslation();
  // Card drop zone — main column body
  // Serit anahtari varsa droppable id'si ona gore benzersizlesiyor.
  // handleDragEnd bu id'yi ayristirip gercek sutun id'sini cikariyor.
  const cardDropId = laneKey ? `${id}::lane::${laneKey}` : id;
  const { setNodeRef: cardDropRef, isOver: cardIsOver } = useDroppable({ id: cardDropId });
  // Column drop zone — separate element in the header area
  const { setNodeRef: colDropRef, isOver: colIsOver } = useDroppable({ id: `col-drop-${id}`, disabled: !!laneKey });
  // Column grip drag handle
  const { attributes, listeners, setNodeRef: dragRef, isDragging } = useDraggable({
    id: `col-grip-${id}`,
  });

  // Sutun katlama (Jira'daki gibi): tutamaca cift tiklayinca sutun dar bir
  // seride donusuyor. Durum bilerek YEREL - katlama gecici bir gorunum
  // tercihi, panonun kalici bir ozelligi degil; sunucuya veya localStorage'a
  // yazmak bir kullanicinin gecici tercihini kalici veri haline getirirdi.
  const [katli, setKatli] = useState(false);

  const [isAdding, setIsAdding] = useState(false);
  const [titleInput, setTitleInput] = useState('');
  const [showTemplatePicker, setShowTemplatePicker] = useState(false);
  const [isRenaming, setIsRenaming] = useState(false);
  const [renameInput, setRenameInput] = useState(title);
  const renameRef = useRef<HTMLInputElement>(null);

  useEffect(() => {
    if (isRenaming && renameRef.current) {
      renameRef.current.focus();
      renameRef.current.select();
    }
  }, [isRenaming]);

  const confirm = useConfirm();

  const handleSubmit = (e: React.FormEvent) => {
    e.preventDefault();
    if (!titleInput.trim()) return;
    onAddTask(id, titleInput.trim());
    setTitleInput('');
    setIsAdding(false);
  };

  const handleRenameSubmit = () => {
    const trimmed = renameInput.trim();
    if (trimmed && trimmed !== title && onRenameColumn) {
      onRenameColumn(id, trimmed);
    }
    setIsRenaming(false);
  };

  const handleRenameKeyDown = (e: React.KeyboardEvent) => {
    if (e.key === 'Enter') {
      e.preventDefault();
      handleRenameSubmit();
    } else if (e.key === 'Escape') {
      setRenameInput(title);
      setIsRenaming(false);
    }
  };

  const handleDelete = async () => {
    const ok = await confirm({
      title: t('deleteColumnTitle'),
      description: t('deleteColumnDesc'),
      confirmText: t('delete'),
      cancelText: t('cancel'),
      variant: 'destructive',
    });
    if (ok) {
      onDeleteColumn?.(id);
    }
  };

  const realCount = totalCount ?? tasks.length;
  const isLimitExceeded = wipLimit !== undefined && wipLimit !== null && realCount >= wipLimit;
  // WIP limiti kart SAYISINI olcuyor ama "3 kart" ile "3 puan" cok farkli
  // seyler - hic tahmini olmayan kolonlarda (0) rozet hic gosterilmiyor,
  // gereksiz gurultu yapmasin.
  const estimateSum = tasks.reduce((sum, task) => sum + (task.estimate ?? 0), 0);
  const estimateLabel = estimateUnit === 'HOURS' ? 'sa' : 'p';

  return (
    <div className="relative shrink-0">
      {/* Column drop zone — invisible strip between columns */}
      <div
        ref={colDropRef}
        className={`absolute inset-y-0 -left-2 w-4 z-20 transition-colors rounded-lg ${
          colIsOver ? 'bg-primary/20 ring-2 ring-primary scale-x-125' : ''
        }`}
      />
      {katli ? (
        <div
          ref={cardDropRef}
          onDoubleClick={() => setKatli(false)}
          className={`flex h-full w-12 cursor-pointer flex-col items-center gap-3 rounded-2xl border bg-muted/40 p-2 transition-all duration-300 ${
            cardIsOver ? 'bg-accent/30' : ''
          } ${isLimitExceeded ? 'border-destructive/40 bg-destructive/5' : 'border-border/70'}`}
          title={t('doubleClickToExpand')}
        >
          <span
            ref={isAdmin ? dragRef : undefined}
            {...(isAdmin ? attributes : {})}
            {...(isAdmin ? listeners : {})}
            onDoubleClick={(e) => {
              // Disaridaki kapsayici da cift tigi dinliyor; ikisi birden
              // calisirsa sutun acilip aninda tekrar kapaniyor.
              e.stopPropagation();
              setKatli(false);
            }}
            className="flex shrink-0 touch-none items-center text-muted-foreground/40 transition-colors hover:text-muted-foreground"
          >
            <GripVerticalIcon className="h-4 w-4" />
          </span>
          <Badge
            variant={isLimitExceeded ? 'destructive' : 'secondary'}
            className="shrink-0 px-1.5 text-[11px] tabular-nums"
          >
            {realCount}
          </Badge>
          {/* Dikey baslik: dar seritte yatay metin sigmiyor. */}
          <span className="min-h-0 flex-1 truncate text-sm font-semibold text-foreground [writing-mode:vertical-rl]">
            {title}
          </span>
        </div>
      ) : (
      <div
        ref={cardDropRef}
        className={`flex w-80 lg:w-[350px] flex-col rounded-2xl border bg-muted/40 p-3 transition-all duration-300 h-full ${
          isDragging ? 'opacity-50 ring-2 ring-primary scale-[0.97]' : ''
        } ${
          cardIsOver ? 'bg-accent/30' : ''
        } ${
          isLimitExceeded ? 'border-destructive/40 bg-destructive/5' : 'border-border/70'
        }`}
      >
      {/* Sutun basligi — drag handle (sadece admin), inline rename, delete */}
      <div className="sticky top-0 z-10 mb-3 flex items-center justify-between gap-1 rounded-xl bg-muted/40 py-1 pl-1 pr-1 backdrop-blur-sm">
        <div className="flex min-w-0 items-center gap-1.5">
          {/* Tutamac artik HERKESE gorunuyor: katlama kisisel bir gorunum
              tercihi ve yalnizca adminlere acik olmasi icin bir sebep yok.
              Surukleyip siralama yine admin'e ozel - listeners/attributes
              sadece admin'e baglaniyor. */}
          <span
            ref={isAdmin ? dragRef : undefined}
            {...(isAdmin ? attributes : {})}
            {...(isAdmin ? listeners : {})}
            onDoubleClick={() => setKatli((o) => !o)}
            className={`flex shrink-0 touch-none items-center text-muted-foreground/40 hover:text-muted-foreground transition-colors ${
              isAdmin ? 'cursor-grab active:cursor-grabbing' : 'cursor-pointer'
            }`}
            title={isAdmin ? `${t('dragToReorder')} · ${t('doubleClickToCollapse')}` : t('doubleClickToCollapse')}
          >
            <GripVerticalIcon className="h-4 w-4" />
          </span>
          {isRenaming ? (
            <Input
              ref={renameRef}
              value={renameInput}
              onChange={(e) => setRenameInput(e.target.value)}
              onBlur={handleRenameSubmit}
              onKeyDown={handleRenameKeyDown}
              className="h-7 min-w-0 max-w-[160px] text-sm font-semibold px-1.5"
            />
          ) : (
            <div className="flex items-center gap-1.5 min-w-0">
              <h3
                className="truncate text-sm font-semibold text-foreground cursor-pointer hover:text-primary transition-colors"
                onClick={() => isAdmin && setIsRenaming(true)}
                title={isAdmin ? t('clickToRename') : title}
              >
                {title}
              </h3>
            </div>
          )}
          <Badge
            variant={isLimitExceeded ? 'destructive' : 'secondary'}
            className="shrink-0 text-[11px] tabular-nums"
          >
            {totalCount !== undefined
              ? `${tasks.length} / ${totalCount}${wipLimit ? ` (limit ${wipLimit})` : ''}`
              : `${tasks.length}${wipLimit ? ` / ${wipLimit}` : ''}`}
          </Badge>
          {estimateSum > 0 && (
            <Badge variant="outline" className="shrink-0 text-[11px] tabular-nums" title="Kolon efor tahmini toplamı">
              {estimateSum} {estimateLabel}
            </Badge>
          )}
        </div>
        <div className="flex items-center gap-0.5 shrink-0">
          {isLimitExceeded && (
            <span
              className="text-[11px] font-medium text-destructive mr-1"
              title={t('wipLimitExceeded')}
            >
              {t('wipLimitFull')}
            </span>
          )}
          {isAdmin && (
            <button
              onClick={handleDelete}
              className="flex shrink-0 items-center justify-center rounded-md p-1 text-muted-foreground/30 hover:text-destructive hover:bg-destructive/10 transition-colors cursor-pointer"
              title={t('deleteColumn')}
            >
              <Trash2Icon className="h-3.5 w-3.5" />
            </button>
          )}
        </div>
      </div>

      <div
        className="flex min-h-[150px] flex-1 flex-col gap-2.5 overflow-y-auto pr-1 no-scrollbar"
        onPointerDown={onMarqueeStart}
        onPointerMove={onMarqueeMove}
        onPointerUp={onMarqueeEnd}
        onPointerCancel={onMarqueeEnd}
      >
        <SortableContext items={tasks.map((task) => task.id)} strategy={verticalListSortingStrategy}>
          {tasks.map((task) => (
            <BoardCard
              key={task.id}
              data-card-id={task.id}
              task={task}
              isDoneColumn={isDone ?? (title.toLowerCase() === 'done' || title.toLowerCase() === 'tamamlandı')}
              onClick={() => onTaskClick(task.id)}
              conflict={conflicts?.[task.id]}
              selected={selectedIds?.has(task.id) ?? false}
              selectionActive={(selectedIds?.size ?? 0) > 0}
              onToggleSelect={onToggleSelect ? () => onToggleSelect(task.id) : undefined}
              onContextMenu={
                onCardContextMenu ? (e) => onCardContextMenu(task.id, e) : undefined
              }
              projectKey={projectKey}
            />
          ))}
        </SortableContext>

        {tasks.length === 0 && (
          <div className="flex flex-1 items-center justify-center rounded-xl border border-dashed border-border/70 px-3 py-6 text-center">
            <p className="text-xs text-muted-foreground">
              {canAddTask ? t('emptyColumnDesc') : t('emptyColumnDescNoAdd')}
            </p>
          </div>
        )}
      </div>

      {canAddTask && (
      <div className="mt-3 pt-2 border-t border-border">
        {isAdding ? (
          <form onSubmit={handleSubmit} className="flex flex-col gap-2">
            <Input
              type="text"
              autoFocus
              value={titleInput}
              onChange={(e) => setTitleInput(e.target.value)}
              placeholder={isAdmin ? t('taskTitlePlaceholder') : t('taskRequestTitlePlaceholder')}
              className="text-sm"
            />
            <div className="flex justify-end gap-2">
              <Button
                type="button"
                variant="ghost"
                size="sm"
                onClick={() => setIsAdding(false)}
              >
                {t('cancel')}
              </Button>
              <Button type="submit" size="sm">
                {isAdmin ? t('add') : t('sendRequestBtn')}
              </Button>
            </div>
          </form>
        ) : (
          <div className="flex items-center gap-1">
            <button
              onClick={() => setIsAdding(true)}
              className="flex flex-1 cursor-pointer items-center gap-1.5 rounded-lg p-2 text-xs font-medium text-muted-foreground transition-colors duration-200 hover:bg-muted hover:text-foreground"
            >
              <PlusIcon className="h-4 w-4" />
              {isAdmin ? t('addCardBtn') : t('addCardRequestBtn')}
            </button>

            {isAdmin && templates.length > 0 && (
              <div className="relative shrink-0">
                <button
                  onClick={() => setShowTemplatePicker((v) => !v)}
                  title={t('createFromTemplate')}
                  className="flex items-center justify-center rounded-lg p-2 text-muted-foreground transition-colors duration-200 hover:bg-muted hover:text-foreground"
                >
                  <BookmarkIcon className="h-4 w-4" />
                </button>

                {showTemplatePicker && (
                  <div className="absolute bottom-full right-0 z-10 mb-1 w-56 rounded-lg border border-border bg-popover shadow-lg p-1 max-h-48 overflow-y-auto">
                    {templates.map((t) => (
                      <button
                        key={t.id}
                        type="button"
                        onClick={() => {
                          onCreateFromTemplate?.(t.id, id);
                          setShowTemplatePicker(false);
                        }}
                        className="w-full text-left px-2 py-1.5 rounded-md text-sm text-foreground hover:bg-muted transition-colors truncate"
                      >
                        {t.name}
                      </button>
                    ))}
                  </div>
                )}
              </div>
            )}
          </div>
        )}
      </div>
      )}
    </div>
      )}
    </div>
  );
};
