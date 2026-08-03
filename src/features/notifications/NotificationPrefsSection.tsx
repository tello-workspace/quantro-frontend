'use client';

import React from 'react';
import { toast } from 'sonner';
import {
  useGetNotificationPrefsQuery,
  useSetNotificationPrefMutation,
} from '@/features/notifications/notificationsApi';
import { useTranslation } from '@/hooks/useTranslation';

// Bildirim tiplerinin gorunur adlari. Backend NotificationType enum'iyla
// birebir eslestirilir; yeni bir tip eklendiginde buraya da eklenmeli.
const NOTIFICATION_TYPE_LABELS: Record<string, string> = {
  ASSIGNED: 'Bana kart atandığında',
  BLOCKER_RESOLVED: 'Bloklayan kart tamamlandığında',
  DEADLINE_RISK: 'Deadline riski tespit edildiğinde',
  STALE_CARD: 'Kart 7+ gün hareketsiz kaldığında',
  WIP_EXCEEDED: 'Sütun WIP limitini aştığında',
  ORG_INVITE: 'Organizasyon daveti geldiğinde',
  ORG_JOINED: 'Organizasyona eklendiğimde',
  ORG_REMOVED: 'Organizasyondan çıkarıldığımda',
  PROJECT_CREATED: 'Yeni proje oluşturulduğunda',
  PROJECT_DELETED: 'Bir proje silindiğinde',
  ROLE_CHANGED: 'Rolüm değiştirildiğinde',
  REQUEST_CREATED: 'Değişiklik talebi gönderildiğinde',
  REQUEST_APPROVED: 'Talebim onaylandığında',
  REQUEST_REJECTED: 'Talebim reddedildiğinde',
  MENTIONED: 'Bir yorumda @isim ile etiketlendiğimde',
  AUTOMATION: 'Bir otomasyon kuralı bilgilendirdiğinde',
  WATCHED_CARD_ACTIVITY: 'İzlediğim kartta hareket olduğunda',
};

// Kullanici profilindeki "Bildirim Tercihleri" sekmesi. Her bildirim tipi
// icin acik/kapali toggle gosterir; kapali tipler icin backend artık
// bildirim olusturmaz (skip-creation).
export const NotificationPrefsSection: React.FC = () => {
  const { t } = useTranslation();
  const { data: prefs = [], isLoading } = useGetNotificationPrefsQuery();
  const [setPref] = useSetNotificationPrefMutation();

  // Kapali tipler: prefs listesinde enabled=false olanlar
  const mutedTypes = React.useMemo(
    () => new Set(prefs.filter((p) => !p.enabled).map((p) => p.type)),
    [prefs],
  );

  const handleToggle = async (type: string, enabled: boolean) => {
    try {
      await setPref({ type, enabled }).unwrap();
    } catch {
      toast.error(t('notificationPrefsError'));
    }
  };

  if (isLoading) {
    return <p className="text-sm text-muted-foreground">{t('loading')}</p>;
  }

  return (
    <div className="space-y-1">
      {Object.entries(NOTIFICATION_TYPE_LABELS).map(([type, label]) => {
        const isMuted = mutedTypes.has(type);
        return (
          <div
            key={type}
            className="flex items-center justify-between gap-3 rounded-lg border border-border px-3 py-2"
          >
            <div>
              <p className="text-sm font-medium text-foreground">{label}</p>
            </div>
            <button
              type="button"
              role="switch"
              aria-checked={!isMuted}
              onClick={() => handleToggle(type, isMuted)}
              className={`relative inline-flex h-5 w-9 shrink-0 cursor-pointer items-center rounded-full transition-colors ${
                isMuted ? 'bg-muted' : 'bg-emerald-500'
              }`}
            >
              <span
                className={`inline-block size-4 transform rounded-full bg-white shadow transition-transform ${
                  isMuted ? 'translate-x-0.5' : 'translate-x-[18px]'
                }`}
              />
            </button>
          </div>
        );
      })}
    </div>
  );
};
