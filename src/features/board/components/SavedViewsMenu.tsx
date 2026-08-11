'use client';

import React, { useState } from 'react';
import { toast } from 'sonner';
import { Popover, PopoverContent, PopoverTrigger } from '@/components/ui/popover';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Bookmark, Trash2, Globe, Lock } from 'lucide-react';
import {
  useGetSavedViewsQuery,
  useCreateSavedViewMutation,
  useDeleteSavedViewMutation,
  type SavedViewFilters,
} from '@/features/board/savedViewsApi';
import { useGetMeQuery } from '@/features/auth/meApi';

interface SavedViewsMenuProps {
  projectId: string;
  currentFilters: SavedViewFilters;
  hasActiveFilters: boolean;
  onApply: (filters: SavedViewFilters) => void;
}

// "Bu haftaki gecikenler", "Bana atanan açık işler" gibi filtre kombinasyonlarını
// kaydedip tekrar tek tikla uygulama - BoardFilters'in kendisi ucucu (sayfa
// yenilenince gidiyor), bu onun uzerine kalici bir katman.
export const SavedViewsMenu: React.FC<SavedViewsMenuProps> = ({
  projectId,
  currentFilters,
  hasActiveFilters,
  onApply,
}) => {
  const { data: views = [] } = useGetSavedViewsQuery({ projectId });
  const [createSavedView, { isLoading: saving }] = useCreateSavedViewMutation();
  const [deleteSavedView] = useDeleteSavedViewMutation();
  const { data: me } = useGetMeQuery();
  const [open, setOpen] = useState(false);
  const [showSaveForm, setShowSaveForm] = useState(false);
  const [name, setName] = useState('');
  const [isShared, setIsShared] = useState(false);

  const handleSave = async () => {
    if (!name.trim()) return;
    try {
      await createSavedView({ projectId, name: name.trim(), filters: currentFilters, isShared }).unwrap();
      toast.success('Görünüm kaydedildi.');
      setShowSaveForm(false);
      setName('');
      setIsShared(false);
    } catch {
      toast.error('Görünüm kaydedilemedi.');
    }
  };

  const handleDelete = async (viewId: string) => {
    try {
      await deleteSavedView({ viewId, projectId }).unwrap();
    } catch {
      toast.error('Görünüm silinemedi.');
    }
  };

  return (
    <Popover
      open={open}
      onOpenChange={(o: boolean) => {
        setOpen(o);
        if (!o) setShowSaveForm(false);
      }}
    >
      <PopoverTrigger className="inline-flex items-center gap-1.5 px-2.5 py-1.5 rounded-lg border border-border text-xs font-medium text-muted-foreground hover:text-foreground hover:bg-accent/40 transition-colors shrink-0">
        <Bookmark className="size-3.5" /> Görünümler
      </PopoverTrigger>
      <PopoverContent align="start" className="w-64">
        {views.length === 0 ? (
          <p className="px-1 py-1 text-xs text-muted-foreground">Henüz kaydedilmiş görünüm yok.</p>
        ) : (
          <ul className="flex max-h-56 flex-col gap-0.5 overflow-y-auto">
            {views.map((v) => (
              <li key={v.id} className="group flex items-center gap-1">
                <button
                  type="button"
                  onClick={() => {
                    onApply(v.filters);
                    setOpen(false);
                  }}
                  className="flex min-w-0 flex-1 items-center gap-1.5 rounded-md px-2 py-1.5 text-left text-sm transition-colors hover:bg-accent/60"
                >
                  {v.isShared ? (
                    <Globe className="size-3 shrink-0 text-muted-foreground" />
                  ) : (
                    <Lock className="size-3 shrink-0 text-muted-foreground" />
                  )}
                  <span className="truncate">{v.name}</span>
                </button>
                {v.owner.id === me?.id && (
                  <button
                    type="button"
                    onClick={() => handleDelete(v.id)}
                    title="Sil"
                    className="shrink-0 rounded p-1 text-muted-foreground/50 opacity-0 transition group-hover:opacity-100 hover:text-destructive"
                  >
                    <Trash2 className="size-3" />
                  </button>
                )}
              </li>
            ))}
          </ul>
        )}

        <div className="mt-1 border-t border-border pt-2">
          {showSaveForm ? (
            <div className="flex flex-col gap-1.5">
              <Input
                autoFocus
                value={name}
                onChange={(e) => setName(e.target.value)}
                placeholder="Görünüm adı"
                className="h-8 text-sm"
                onKeyDown={(e) => {
                  if (e.key === 'Enter') handleSave();
                }}
              />
              <label className="flex cursor-pointer items-center gap-1.5 text-xs text-muted-foreground">
                <input
                  type="checkbox"
                  checked={isShared}
                  onChange={(e) => setIsShared(e.target.checked)}
                />
                Herkesle paylaş
              </label>
              <div className="flex gap-1.5">
                <Button
                  type="button"
                  size="xs"
                  variant="outline"
                  className="flex-1"
                  onClick={() => setShowSaveForm(false)}
                >
                  İptal
                </Button>
                <Button
                  type="button"
                  size="xs"
                  className="flex-1"
                  onClick={handleSave}
                  disabled={!name.trim() || saving}
                >
                  Kaydet
                </Button>
              </div>
            </div>
          ) : (
            <button
              type="button"
              onClick={() => setShowSaveForm(true)}
              disabled={!hasActiveFilters}
              title={!hasActiveFilters ? 'Önce bir filtre uygulayın' : undefined}
              className="w-full rounded-md px-2 py-1.5 text-left text-sm text-primary transition-colors hover:bg-accent/60 disabled:cursor-not-allowed disabled:opacity-40"
            >
              + Şu anki filtreyi kaydet
            </button>
          )}
        </div>
      </PopoverContent>
    </Popover>
  );
};
