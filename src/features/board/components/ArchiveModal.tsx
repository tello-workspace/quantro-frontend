'use client';

import React, { useEffect, useState } from 'react';
import { toast } from 'sonner';
import {
  Dialog,
  DialogContent,
  DialogHeader,
  DialogTitle,
} from '@/components/ui/dialog';
import { Button } from '@/components/ui/button';
import { Avatar, AvatarImage, AvatarFallback } from '@/components/ui/avatar';
import { PriorityIcon } from './PriorityIcon';
import { MagnifyingGlassIcon, ArchiveBoxIcon, ArrowUturnLeftIcon } from '@heroicons/react/24/outline';
import { boardService, ArchivedTask } from '@/features/board/services/boardService';

interface ArchiveModalProps {
  isOpen: boolean;
  onClose: () => void;
  projectId: string;
  // Bir kart geri yuklendiginde board'un tazelenmesi gerekir - hangi kolona
  // dondugunu burada tekrar hesaplamak yerine, board verisini yeniden
  // cektiriyoruz (tek dogru kaynak).
  onRestored: () => void;
}

function initials(name: string): string {
  return name.split(' ').map((n) => n[0]).join('').toUpperCase();
}

export const ArchiveModal: React.FC<ArchiveModalProps> = ({ isOpen, onClose, projectId, onRestored }) => {
  const [cards, setCards] = useState<ArchivedTask[]>([]);
  const [loading, setLoading] = useState(false);
  const [search, setSearch] = useState('');
  const [restoringId, setRestoringId] = useState<string | null>(null);

  useEffect(() => {
    if (!isOpen) return;
    setLoading(true);
    boardService
      .getArchivedCards(projectId)
      .then(setCards)
      .catch(() => toast.error('Arşivlenen kartlar alınamadı.'))
      .finally(() => setLoading(false));
  }, [isOpen, projectId]);

  const handleRestore = async (card: ArchivedTask) => {
    setRestoringId(card.id);
    try {
      await boardService.restoreTask(card.id);
      setCards((prev) => prev.filter((c) => c.id !== card.id));
      toast.success(`"${card.title}" geri yüklendi.`);
      onRestored();
    } catch {
      toast.error('Kart geri yüklenemedi.');
    } finally {
      setRestoringId(null);
    }
  };

  const filtered = cards.filter((c) => c.title.toLowerCase().includes(search.toLowerCase()));

  return (
    <Dialog open={isOpen} onOpenChange={(open: boolean) => { if (!open) onClose(); }}>
      <DialogContent className="sm:max-w-lg w-full max-h-[80vh] overflow-y-auto no-scrollbar">
        <DialogHeader>
          <DialogTitle className="flex items-center gap-2">
            <ArchiveBoxIcon className="h-5 w-5" />
            Arşivlenen Kartlar
          </DialogTitle>
        </DialogHeader>

        <div className="relative">
          <MagnifyingGlassIcon className="absolute left-2.5 top-1/2 -translate-y-1/2 h-4 w-4 text-zinc-400" />
          <input
            type="text"
            value={search}
            onChange={(e) => setSearch(e.target.value)}
            placeholder="Arşivde ara..."
            className="pl-8 pr-3 py-1.5 text-sm w-full rounded-lg border border-border bg-background focus:outline-none focus:ring-1 focus:ring-ring"
          />
        </div>

        {loading ? (
          <div className="text-center py-10 text-sm text-muted-foreground">Yükleniyor...</div>
        ) : filtered.length === 0 ? (
          <div className="text-center py-10 text-sm text-muted-foreground">
            {cards.length === 0 ? 'Arşivde kart bulunamadı.' : 'Aramaya uyan kart yok.'}
          </div>
        ) : (
          <ul className="divide-y divide-border -mx-4">
            {filtered.map((card) => (
              <li key={card.id} className="flex items-center gap-3 px-4 py-2.5">
                <PriorityIcon priority={card.priority ?? 'MEDIUM'} className="h-4 w-4 shrink-0" />
                <div className="flex-1 min-w-0">
                  <p className="text-sm font-medium text-foreground truncate">{card.title}</p>
                  <p className="text-xs text-muted-foreground truncate">
                    {card.column.name}
                    {card.archivedAt && ` · ${new Date(card.archivedAt).toLocaleDateString('tr-TR', { day: '2-digit', month: 'short', year: 'numeric' })}`}
                    {card.archivedBy && ` · ${card.archivedBy.name}`}
                  </p>
                </div>
                {card.archivedBy && (
                  <Avatar className="h-6 w-6 shrink-0">
                    <AvatarImage src={card.archivedBy.avatarUrl ?? undefined} />
                    <AvatarFallback className="text-[10px]">{initials(card.archivedBy.name)}</AvatarFallback>
                  </Avatar>
                )}
                <Button
                  type="button"
                  variant="outline"
                  size="xs"
                  onClick={() => handleRestore(card)}
                  disabled={restoringId === card.id}
                  className="flex items-center gap-1 shrink-0"
                >
                  <ArrowUturnLeftIcon className="h-3.5 w-3.5" />
                  Geri Yükle
                </Button>
              </li>
            ))}
          </ul>
        )}
      </DialogContent>
    </Dialog>
  );
};
