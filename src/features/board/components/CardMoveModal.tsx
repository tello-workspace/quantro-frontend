'use client';

import React, { useEffect, useState } from 'react';
import { toast } from 'sonner';
import {
  Dialog,
  DialogContent,
  DialogHeader,
  DialogTitle,
  DialogFooter,
} from '@/components/ui/dialog';
import { Button } from '@/components/ui/button';
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select';
import { useGetProjectsQuery } from '@/features/projects/projectsApi';
import { boardService } from '@/features/board/services/boardService';

interface CardMoveModalProps {
  isOpen: boolean;
  onClose: () => void;
  cardId: string;
  cardTitle: string;
  orgId: string;
  /** Bu proje secim listesinden cikarilir - kart zaten burada */
  currentProjectId: string;
  onMoved: () => void;
}

export const CardMoveModal: React.FC<CardMoveModalProps> = ({
  isOpen,
  onClose,
  cardId,
  cardTitle,
  orgId,
  currentProjectId,
  onMoved,
}) => {
  const { data: projects = [] } = useGetProjectsQuery({ orgId }, { skip: !isOpen });
  const hedefProjeler = projects.filter((p) => p.id !== currentProjectId);

  const [targetProjectId, setTargetProjectId] = useState('');
  const [columns, setColumns] = useState<{ id: string; title: string }[]>([]);
  const [targetColumnId, setTargetColumnId] = useState('');
  const [loadingColumns, setLoadingColumns] = useState(false);
  const [moving, setMoving] = useState(false);

  // Modal her acilista temiz secim ile baslasin - onceki secimler kalirsa
  // farkli bir karti tasirken yanlislikla eski hedefe gonderilebilir.
  useEffect(() => {
    if (isOpen) {
      setTargetProjectId('');
      setColumns([]);
      setTargetColumnId('');
    }
  }, [isOpen]);

  useEffect(() => {
    if (!targetProjectId) {
      setColumns([]);
      setTargetColumnId('');
      return;
    }
    setLoadingColumns(true);
    boardService
      .getBoardData(targetProjectId)
      .then((data) => {
        const cols = data ? Object.values(data.columns).map((c) => ({ id: c.id, title: c.title })) : [];
        setColumns(cols);
        setTargetColumnId(cols[0]?.id ?? '');
      })
      .finally(() => setLoadingColumns(false));
  }, [targetProjectId]);

  const handleMove = async () => {
    if (!targetColumnId) return;
    setMoving(true);
    try {
      const result = await boardService.moveTaskToProject(cardId, targetColumnId);
      const dropped = [...result.droppedLabels, ...result.droppedCustomFields];
      if (dropped.length > 0) {
        toast.warning(`Kart taşındı. Hedef projede karşılığı olmayan alanlar düştü: ${dropped.join(', ')}`);
      } else {
        toast.success('Kart başka projeye taşındı.');
      }
      onMoved();
      onClose();
    } catch (err) {
      toast.error(err instanceof Error ? err.message : 'Kart taşınamadı.');
    } finally {
      setMoving(false);
    }
  };

  return (
    <Dialog open={isOpen} onOpenChange={(open: boolean) => { if (!open) onClose(); }}>
      <DialogContent className="sm:max-w-sm w-full">
        <DialogHeader>
          <DialogTitle>Kartı Başka Projeye Taşı</DialogTitle>
        </DialogHeader>

        <p className="text-sm text-muted-foreground truncate">&quot;{cardTitle}&quot;</p>

        <div className="space-y-3">
          <div>
            <label className="text-xs font-medium text-muted-foreground mb-1 block">Hedef proje</label>
            <Select value={targetProjectId} onValueChange={(v) => setTargetProjectId(v ?? '')}>
              <SelectTrigger className="w-full">
                <SelectValue placeholder="Proje seçin" />
              </SelectTrigger>
              <SelectContent>
                {hedefProjeler.map((p) => (
                  <SelectItem key={p.id} value={p.id}>{p.name}</SelectItem>
                ))}
              </SelectContent>
            </Select>
          </div>

          {targetProjectId && (
            <div>
              <label className="text-xs font-medium text-muted-foreground mb-1 block">Hedef kolon</label>
              <Select value={targetColumnId} onValueChange={(v) => setTargetColumnId(v ?? '')} disabled={loadingColumns}>
                <SelectTrigger className="w-full">
                  <SelectValue placeholder={loadingColumns ? 'Yükleniyor...' : 'Kolon seçin'} />
                </SelectTrigger>
                <SelectContent>
                  {columns.map((c) => (
                    <SelectItem key={c.id} value={c.id}>{c.title}</SelectItem>
                  ))}
                </SelectContent>
              </Select>
            </div>
          )}

          <p className="text-xs text-muted-foreground">
            Etiket ve özel alanlar proje bazlıdır - hedefte aynı isimle yoksa taşınmaz.
          </p>
        </div>

        <DialogFooter>
          <Button type="button" variant="outline" onClick={onClose}>İptal</Button>
          <Button type="button" onClick={handleMove} disabled={!targetColumnId || moving}>
            {moving ? 'Taşınıyor...' : 'Taşı'}
          </Button>
        </DialogFooter>
      </DialogContent>
    </Dialog>
  );
};
