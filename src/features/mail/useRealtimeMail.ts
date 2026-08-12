'use client';

import { useEffect } from 'react';
import { useDispatch } from 'react-redux';
import { useSocket } from '@/lib/socket';
import { api } from '@/lib/api';
import type { AppDispatch } from '@/lib/store';

// Toast/zil bildirimi NOTIFICATION_NEW uzerinden zaten geliyor (bkz.
// useRealtimeNotifications - backend mail.service.ts ikisini birlikte
// yayinliyor). Bu hook SADECE Mail sayfasindaki listeleri ve kenar
// cubugundaki okunmamis rozetini anlik tazelemek icin var - ayrica toast
// gostermez, aksi halde ayni mesaj icin iki bildirim cikardi.
export function useRealtimeMail() {
  const { on, off, isConnected } = useSocket();
  const dispatch = useDispatch<AppDispatch>();

  useEffect(() => {
    if (!isConnected) return;

    const handleMailNew = () => {
      dispatch(api.util.invalidateTags(['Mail']));
    };

    on('mail:new', handleMailNew);
    return () => off('mail:new', handleMailNew);
  }, [isConnected, on, off, dispatch]);
}
