'use client';

import { useCallback, useEffect } from 'react';
import { useDispatch } from 'react-redux';
import { useRouter } from 'next/navigation';
import { BellIcon } from '@heroicons/react/24/outline';
import { useSocket } from '@/lib/socket';
import { api } from '@/lib/api';
import {
  useGetNotificationsQuery,
  useGetUnreadCountQuery,
  useMarkAsReadMutation,
  useMarkAllAsReadMutation,
} from '@/features/notifications/notificationsApi';
import {
  useAcceptInvitationMutation,
  useDeclineInvitationMutation,
} from '@/features/organizations/organizationsApi';
import { toast } from "sonner";
import type { AppDispatch } from '@/lib/store';
import { Button } from '@/components/ui/button';
import { Badge } from '@/components/ui/badge';
import { Popover, PopoverContent, PopoverTrigger } from '@/components/ui/popover';

function timeAgo(dateStr: string): string {
  const diffMs = Date.now() - new Date(dateStr).getTime();
  const mins = Math.floor(diffMs / 60000);
  if (mins < 1) return 'az önce';
  if (mins < 60) return `${mins} dk önce`;
  const hours = Math.floor(mins / 60);
  if (hours < 24) return `${hours} sa önce`;
  const days = Math.floor(hours / 24);
  return `${days} gün önce`;
}

function parseMessage(message: string) {
  const orgIdMatch = message.match(/\[orgId:([^\]]+)\]/);
  const orgId = orgIdMatch ? orgIdMatch[1] : null;
  const cleanMessage = message.replace(/\s*\[orgId:[^\]]+\]/, '');
  return { cleanMessage, orgId };
}

export default function NotificationBell() {
  const router = useRouter();
  const { data: unreadCount = 0 } = useGetUnreadCountQuery();
  const { data: notifications = [] } = useGetNotificationsQuery();
  const [markAsRead] = useMarkAsReadMutation();
  const [markAllAsRead] = useMarkAllAsReadMutation();
  const [acceptInvitation] = useAcceptInvitationMutation();
  const [declineInvitation] = useDeclineInvitationMutation();
  const { on, off } = useSocket();
  const dispatch = useDispatch<AppDispatch>();

  const refresh = useCallback(
    () => {
      console.log("[NotificationBell] invalidateTags tag'leri invalidate ediyor");
      dispatch(api.util.invalidateTags(['Notification', 'Project', 'Card']));
    },
    [dispatch],
  );

  // Socket ile canlı bildirim ve güncellemeleri dinle
  useEffect(() => {
    console.log(`[NotificationBell] useEffect çalıştı — handler'lar register ediliyor`);

    const handleNew = () => {
      refresh();
    };

    on('notification:new', handleNew);
    on('notification:read', refresh);
    on('notification:all_read', refresh);
    on('org:member_added', refresh);
    on('org:member_removed', refresh);
    on('org:member_role_changed', refresh);
    on('project:created', refresh);
    on('project:updated', refresh);
    on('project:deleted', refresh);

    return () => {
      console.log("[NotificationBell] cleanup — handler'lar kaldırılıyor");
      off('notification:new', handleNew);
      off('notification:read', refresh);
      off('notification:all_read', refresh);
      off('org:member_added', refresh);
      off('org:member_removed', refresh);
      off('org:member_role_changed', refresh);
      off('project:created', refresh);
      off('project:updated', refresh);
      off('project:deleted', refresh);
    };
  }, [on, off, refresh]);

  const handleAccept = async (e: React.MouseEvent, invitationId: string) => {
    e.stopPropagation();
    try {
      await acceptInvitation(invitationId).unwrap();
      toast.success('Davet kabul edildi!');
    } catch {
      toast.error('Davet kabul edilemedi.');
    }
  };

  const handleDecline = async (e: React.MouseEvent, invitationId: string) => {
    e.stopPropagation();
    try {
      await declineInvitation(invitationId).unwrap();
      toast.success('Davet reddedildi.');
    } catch {
      toast.error('Davet reddedilemedi.');
    }
  };

  const handleNotificationClick = async (n: any) => {
    if (!n.read) {
      try {
        await markAsRead(n.id).unwrap();
      } catch (err) {
        console.error('Bildirim okundu olarak işaretlenirken hata:', err);
      }
    }

    const { orgId } = parseMessage(n.message);

    if (n.type === 'REQUEST_CREATED' && orgId) {
      router.push(`/projects?orgId=${orgId}&showRequests=true`);
      return;
    }

    if (n.card) {
      const cardId = n.card.id;
      const projectId = n.card.column?.projectId;
      const orgId = n.card.column?.project?.organizationId;
      if (projectId && orgId) {
        router.push(`/projects/${projectId}?orgId=${orgId}&openCard=${cardId}`);
      }
    }
  };

  return (
    <Popover onOpenChange={(open) => {
      if (open && unreadCount > 0) {
        markAllAsRead();
      }
    }}>
      <PopoverTrigger className="relative p-2 rounded-full hover:bg-muted transition focus:outline-none focus-visible:ring-2 focus-visible:ring-ring cursor-pointer">
        <BellIcon className="h-5 w-5 text-foreground/70" />
        {unreadCount > 0 && (
          <span className="absolute -top-0.5 -right-0.5 flex items-center justify-center min-w-[18px] h-[18px] px-1 text-[10px] font-semibold text-white bg-destructive rounded-full">
            {unreadCount > 9 ? '9+' : unreadCount}
          </span>
        )}
      </PopoverTrigger>
      <PopoverContent align="end" sideOffset={8} className="w-80 p-0 max-h-96 overflow-y-auto">
        <div className="flex items-center justify-between px-4 py-3 border-b border-border">
          <span className="text-sm font-semibold text-foreground">Bildirimler</span>
        </div>

        {notifications.length === 0 ? (
          <p className="px-4 py-6 text-sm text-muted-foreground text-center">Henüz bildirim yok.</p>
        ) : (
          <ul>
            {notifications.map((n) => (
              <li
                key={n.id}
                onClick={() => handleNotificationClick(n)}
                className={`px-4 py-3 text-sm border-b border-border last:border-0 cursor-pointer transition ${
                  n.read ? 'text-muted-foreground' : 'text-foreground bg-accent/30'
                }`}
              >
                <div className="flex items-start gap-2">
                  {!n.read && <span className="mt-1.5 w-1.5 h-1.5 rounded-full bg-primary shrink-0" />}
                  <div className="flex-1">
                    <p className={n.read ? '' : 'font-medium'}>{parseMessage(n.message).cleanMessage}</p>
                    <p className="text-xs text-muted-foreground mt-0.5">{timeAgo(n.createdAt)}</p>

                    {n.type === 'ORG_INVITE' && n.invitation?.status === 'PENDING' && (
                      <div className="flex gap-2 mt-2">
                        <Button size="xs" onClick={(e) => handleAccept(e, n.invitation!.id)}>
                          Kabul Et
                        </Button>
                        <Button size="xs" variant="outline" onClick={(e) => handleDecline(e, n.invitation!.id)}>
                          Reddet
                        </Button>
                      </div>
                    )}
                    {n.type === 'ORG_INVITE' && n.invitation?.status === 'ACCEPTED' && (
                      <Badge className="mt-1" variant="default">Kabul edildi</Badge>
                    )}
                    {n.type === 'ORG_INVITE' && n.invitation?.status === 'DECLINED' && (
                      <Badge className="mt-1" variant="secondary">Reddedildi</Badge>
                    )}
                  </div>
                </div>
              </li>
            ))}
          </ul>
        )}
      </PopoverContent>
    </Popover>
  );
}
