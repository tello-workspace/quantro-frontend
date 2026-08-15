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

  // Not: "acilista secimleri sifirla" effect'i kaldirildi. Cagiran taraf
  // modal'i kart id'sine bagli bir key ile render ediyor (bkz. ProjectBoard),
  // yani baska bir kart icin acilinca bilesen zaten sifirdan kuruluyor.
  //
  // Proje secili degilken kolon listesi de bos olmali; bunu effect icinde
  // state sifirlayarak degil, render sirasinda TURETEREK yapiyoruz -
  // "state'ten hesaplanabilen sey state olmamali".
  const gorunenColumns = targetProjectId ? columns : [];
  const secilenColumnId = targetProjectId ? targetColumnId : '';

  useEffect(() => {
    if (!targetProjectId) return;
    // setState'ler effect govdesinde senkron degil, async akista: senkron
    // cagri fazladan bir render turu uretiyordu. iptal bayragi, kullanici
    // hizlica baska bir proje secerse eski cevabin yeniyi ezmesini onler.
    let iptal = false;
    (async () => {
      setLoadingColumns(true);
      try {
        const data = await boardService.getBoardData(targetProjectId);
        if (iptal) return;
        const cols = data ? Object.values(data.columns).map((c) => ({ id: c.id, title: c.title })) : [];
        setColumns(cols);
        setTargetColumnId(cols[0]?.id ?? '');
      } finally {
        if (!iptal) setLoadingColumns(false);
      }
    })();
    return () => {
      iptal = true;
    };
  }, [targetProjectId]);

  const handleMove = async () => {
    if (!secilenColumnId) return;
    setMoving(true);
    try {
      const result = await boardService.moveTaskToProject(cardId, secilenColumnId);
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
              <Select value={secilenColumnId} onValueChange={(v) => setTargetColumnId(v ?? '')} disabled={loadingColumns}>
                <SelectTrigger className="w-full">
                  <SelectValue placeholder={loadingColumns ? 'Yükleniyor...' : 'Kolon seçin'} />
                </SelectTrigger>
                <SelectContent>
                  {gorunenColumns.map((c) => (
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
          <Button type="button" onClick={handleMove} disabled={!secilenColumnId || moving}>
            {moving ? 'Taşınıyor...' : 'Taşı'}
          </Button>
        </DialogFooter>
      </DialogContent>
    </Dialog>
  );
};
