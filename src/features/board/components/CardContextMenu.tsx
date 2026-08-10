// src/features/board/components/CardContextMenu.tsx
// Pano kartina sag tiklaninca acilan kucuk menu.
//
// Neden var: izleme ozelligi "karta girmeden izleyebilmek" istiyordu -
// eskiden bir karti izlemek icin karti acmak (TaskModal) sarttti. Sag tik
// menusu, toplu secim cubugunun tamamlayicisi: tek bir kart icin secim
// moduna girmeden hizli yol.
import React, { useEffect, useRef, useState } from 'react';
import { Eye, EyeOff, SquareCheck, ExternalLink, Copy, FolderInput } from 'lucide-react';
import { toast } from 'sonner';
import {
  useGetWatchStatusQuery,
  useWatchCardMutation,
  useUnwatchCardMutation,
} from '@/features/watchers/watchApi';
import { useTranslation } from '@/hooks/useTranslation';

export interface CardContextMenuState {
  cardId: string;
  x: number;
  y: number;
}

interface CardContextMenuProps {
  state: CardContextMenuState;
  /** Kart panoda secili mi - menu "Seç"/"Seçimi kaldır" yazsin diye */
  selected: boolean;
  onClose: () => void;
  onOpenCard: () => void;
  onToggleSelect: () => void;
  /** Sadece adminlere gosterilir - backend de kopyalama/tasimayi ADMIN'e kisitliyor */
  onDuplicate?: () => void;
  onMove?: () => void;
}

const MENU_GENISLIK = 208; // px - w-52
const MENU_YUKSEKLIK = 200; // px - en fazla 5 satir + dolgu (yaklasik; sadece kenar payi icin)

export const CardContextMenu: React.FC<CardContextMenuProps> = ({
  state,
  selected,
  onClose,
  onOpenCard,
  onToggleSelect,
  onDuplicate,
  onMove,
}) => {
  const { t } = useTranslation();
  const menuRef = useRef<HTMLDivElement>(null);
  const { data: watchStatus, isLoading } = useGetWatchStatusQuery(state.cardId);
  const [watchCard, { isLoading: izleniyorMu }] = useWatchCardMutation();
  const [unwatchCard, { isLoading: birakiliyorMu }] = useUnwatchCardMutation();
  const bekliyor = izleniyorMu || birakiliyorMu;

  // Menu viewport disina tasmasin: sag/alt kenara yakin acilirsa ice al.
  // Sag tik cogunlukla kolonun sag kenarinda oluyor, kirpilma somut bir risk.
  const [konum] = useState(() => ({
    left: Math.min(state.x, window.innerWidth - MENU_GENISLIK - 8),
    top: Math.min(state.y, window.innerHeight - MENU_YUKSEKLIK - 8),
  }));

  useEffect(() => {
    const disariTiklandi = (e: MouseEvent) => {
      if (!menuRef.current?.contains(e.target as Node)) onClose();
    };
    const tusaBasildi = (e: KeyboardEvent) => {
      if (e.key === 'Escape') onClose();
    };
    // capture: kartin kendi onClick'i menuye tiklamayi yutmasin diye
    // dokuman seviyesinde ve yakalama fazinda dinliyoruz.
    document.addEventListener('mousedown', disariTiklandi, true);
    document.addEventListener('keydown', tusaBasildi);
    // Kaydirma menuyu kartin uzerinden kaydirir; konum sabit oldugundan
    // menuyu kapatmak dogru davranis.
    window.addEventListener('scroll', onClose, true);
    return () => {
      document.removeEventListener('mousedown', disariTiklandi, true);
      document.removeEventListener('keydown', tusaBasildi);
      window.removeEventListener('scroll', onClose, true);
    };
  }, [onClose]);

  const izlemeyiDegistir = async () => {
    if (bekliyor || isLoading) return;
    try {
      if (watchStatus?.isWatching) {
        await unwatchCard(state.cardId).unwrap();
        toast.success(t('bulkUnwatchSuccess'));
      } else {
        await watchCard(state.cardId).unwrap();
        toast.success(t('watchStarted'));
      }
      onClose();
    } catch {
      toast.error(t('watchToggleError'));
    }
  };

  const satirSinifi =
    'flex w-full items-center gap-2 px-3 py-2 text-left text-xs text-foreground transition-colors hover:bg-accent disabled:opacity-50 disabled:hover:bg-transparent';

  return (
    <div
      ref={menuRef}
      role="menu"
      style={{ left: konum.left, top: konum.top }}
      className="fixed z-50 w-52 overflow-hidden rounded-lg border border-border bg-popover py-1 shadow-lg"
    >
      <button type="button" role="menuitem" className={satirSinifi} onClick={onOpenCard}>
        <ExternalLink className="size-3.5 text-muted-foreground" />
        {t('cardMenuOpen')}
      </button>
      <button
        type="button"
        role="menuitem"
        className={satirSinifi}
        onClick={izlemeyiDegistir}
        disabled={isLoading || bekliyor}
      >
        {watchStatus?.isWatching ? (
          <EyeOff className="size-3.5 text-muted-foreground" />
        ) : (
          <Eye className="size-3.5 text-muted-foreground" />
        )}
        {watchStatus?.isWatching ? t('bulkUnwatch') : t('bulkWatch')}
      </button>
      <button
        type="button"
        role="menuitem"
        className={satirSinifi}
        onClick={() => {
          onToggleSelect();
          onClose();
        }}
      >
        <SquareCheck className="size-3.5 text-muted-foreground" />
        {selected ? t('deselectCard') : t('selectCard')}
      </button>
      {onDuplicate && (
        <button
          type="button"
          role="menuitem"
          className={satirSinifi}
          onClick={() => {
            onDuplicate();
            onClose();
          }}
        >
          <Copy className="size-3.5 text-muted-foreground" />
          Kopyala
        </button>
      )}
      {onMove && (
        <button
          type="button"
          role="menuitem"
          className={satirSinifi}
          onClick={() => {
            onMove();
            onClose();
          }}
        >
          <FolderInput className="size-3.5 text-muted-foreground" />
          Başka Projeye Taşı
        </button>
      )}
    </div>
  );
};
