'use client';

import React, { useState } from 'react';
import { UserPlus, Tag, Archive, Trash2, X } from 'lucide-react';
import { Button } from '@/components/ui/button';
import {
  Popover,
  PopoverContent,
  PopoverTrigger,
} from '@/components/ui/popover';
import { useConfirm } from '@/hooks/useConfirm';
import { useTranslation } from '@/hooks/useTranslation';

interface Uye {
  userId: string;
  user: { id: string; name: string };
}

interface Etiket {
  id: string;
  name: string;
  color: string;
}

interface Props {
  selectedCount: number;
  members: Uye[];
  labels: Etiket[];
  isAdmin: boolean;
  isRunning: boolean;
  onAssign: (assigneeIds: string[]) => void;
  onLabel: (labelId: string) => void;
  onArchive: () => void;
  onDelete: () => void;
  onClear: () => void;
}

// Secim yapilinca ekranin altinda beliren islem cubugu. Sabit konumlu:
// kullanici panoyu kaydirirken secim baglami kaybolmasin.
export const BulkActionBar: React.FC<Props> = ({
  selectedCount,
  members,
  labels,
  isAdmin,
  isRunning,
  onAssign,
  onLabel,
  onArchive,
  onDelete,
  onClear,
}) => {
  const { t } = useTranslation();
  const confirm = useConfirm();
  const [acikMenu, setAcikMenu] = useState<'assign' | 'label' | null>(null);

  if (selectedCount === 0) return null;

  const handleDelete = async () => {
    const ok = await confirm({
      title: t('bulkDeleteTitle'),
      description: t('bulkDeleteDesc').replace('{count}', String(selectedCount)),
      confirmText: t('delete'),
      cancelText: t('cancel'),
      variant: 'destructive',
    });
    if (ok) onDelete();
  };

  const handleArchive = async () => {
    const ok = await confirm({
      title: t('bulkArchiveTitle'),
      description: t('bulkArchiveDesc').replace('{count}', String(selectedCount)),
      confirmText: t('archive'),
      cancelText: t('cancel'),
    });
    if (ok) onArchive();
  };

  const kapatVeCalistir = (fn: () => void) => {
    setAcikMenu(null);
    fn();
  };

  return (
    <div className="pointer-events-none fixed inset-x-0 bottom-4 z-40 flex justify-center px-4">
      <div className="pointer-events-auto flex flex-wrap items-center gap-1.5 rounded-xl border border-border bg-popover p-1.5 shadow-soft-xl">
        <span className="px-2 text-sm font-medium tabular-nums text-foreground">
          {selectedCount} {t('cardsSelected')}
        </span>

        <span className="mx-0.5 h-5 w-px bg-border" aria-hidden />

        {/* Ata - yalnizca admin, backend de ayni kurali uyguluyor */}
        {isAdmin && (
          <Popover open={acikMenu === 'assign'} onOpenChange={(a) => setAcikMenu(a ? 'assign' : null)}>
            <PopoverTrigger
              render={
                <Button variant="ghost" size="sm" disabled={isRunning}>
                  <UserPlus className="size-3.5" /> {t('bulkAssign')}
                </Button>
              }
            />
            <PopoverContent className="w-52 p-1" align="center">
              <div className="max-h-64 overflow-y-auto">
                <button
                  type="button"
                  onClick={() => kapatVeCalistir(() => onAssign([]))}
                  className="w-full rounded-md px-2 py-1.5 text-left text-sm text-muted-foreground transition-colors hover:bg-accent"
                >
                  {t('bulkUnassign')}
                </button>
                {members.map((m) => (
                  <button
                    key={m.userId}
                    type="button"
                    onClick={() => kapatVeCalistir(() => onAssign([m.userId]))}
                    className="w-full truncate rounded-md px-2 py-1.5 text-left text-sm transition-colors hover:bg-accent"
                  >
                    {m.user.name}
                  </button>
                ))}
              </div>
            </PopoverContent>
          </Popover>
        )}

        {/* Etiket */}
        {labels.length > 0 && (
          <Popover open={acikMenu === 'label'} onOpenChange={(a) => setAcikMenu(a ? 'label' : null)}>
            <PopoverTrigger
              render={
                <Button variant="ghost" size="sm" disabled={isRunning}>
                  <Tag className="size-3.5" /> {t('bulkLabel')}
                </Button>
              }
            />
            <PopoverContent className="w-52 p-1" align="center">
              <div className="max-h-64 overflow-y-auto">
                {labels.map((l) => (
                  <button
                    key={l.id}
                    type="button"
                    onClick={() => kapatVeCalistir(() => onLabel(l.id))}
                    className="flex w-full items-center gap-2 rounded-md px-2 py-1.5 text-left text-sm transition-colors hover:bg-accent"
                  >
                    <span
                      className="size-2.5 shrink-0 rounded-full"
                      style={{ backgroundColor: l.color }}
                      aria-hidden
                    />
                    <span className="truncate">{l.name}</span>
                  </button>
                ))}
              </div>
            </PopoverContent>
          </Popover>
        )}

        {isAdmin && (
          <>
            <Button variant="ghost" size="sm" onClick={handleArchive} disabled={isRunning}>
              <Archive className="size-3.5" /> {t('archive')}
            </Button>
            <Button
              variant="ghost"
              size="sm"
              onClick={handleDelete}
              disabled={isRunning}
              className="text-destructive hover:text-destructive"
            >
              <Trash2 className="size-3.5" /> {t('delete')}
            </Button>
          </>
        )}

        <span className="mx-0.5 h-5 w-px bg-border" aria-hidden />

        <Button variant="ghost" size="icon-sm" onClick={onClear} title={t('clearSelection')}>
          <X className="size-3.5" />
        </Button>
      </div>
    </div>
  );
};
