'use client';

import { useCallback, useEffect } from 'react';
import { useDispatch } from 'react-redux';
import { BellIcon } from '@heroicons/react/24/outline';
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
import { toast } from 'react-toastify';
import { api } from '@/lib/api';
import type { AppDispatch } from '@/lib/store';
import { getSocket } from '@/lib/socket';
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

export default function NotificationBell() {
  const dispatch = useDispatch<AppDispatch>();
  const { data: unreadCount = 0 } = useGetUnreadCountQuery(undefined, { pollingInterval: 30000 });
  const { data: notifications = [] } = useGetNotificationsQuery();
  const [markAsRead] = useMarkAsReadMutation();
  const [markAllAsRead] = useMarkAllAsReadMutation();
  const [acceptInvitation] = useAcceptInvitationMutation();
  const [declineInvitation] = useDeclineInvitationMutation();

  const refresh = useCallback(
    () => dispatch(api.util.invalidateTags(['Notification', 'Project', 'Card'])),
    [dispatch],
  );

  useEffect(() => {
    const socket = getSocket();
    if (!socket) return;

    const handleNew = (notification: { message?: string }) => {
      refresh();
      if (notification?.message) toast.info(notification.message);
    };

    socket.on('notification:new', handleNew);
    socket.on('notification:read', refresh);
    socket.on('notification:all_read', refresh);
    socket.on('org:member_added', refresh);
    socket.on('org:member_removed', refresh);
    socket.on('org:member_role_changed', refresh);
    socket.on('project:created', refresh);
    socket.on('project:updated', refresh);
    socket.on('project:deleted', refresh);

    return () => {
      socket.off('notification:new', handleNew);
      socket.off('notification:read', refresh);
      socket.off('notification:all_read', refresh);
      socket.off('org:member_added', refresh);
      socket.off('org:member_removed', refresh);
      socket.off('org:member_role_changed', refresh);
      socket.off('project:created', refresh);
      socket.off('project:updated', refresh);
      socket.off('project:deleted', refresh);
    };
  }, [refresh]);

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

  return (
    <Popover>
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
          {unreadCount > 0 && (
            <button
              onClick={() => markAllAsRead()}
              className="text-xs text-primary hover:underline"
            >
              Tümünü okundu işaretle
            </button>
          )}
        </div>

        {notifications.length === 0 ? (
          <p className="px-4 py-6 text-sm text-muted-foreground text-center">Henüz bildirim yok.</p>
        ) : (
          <ul>
            {notifications.map((n) => (
              <li
                key={n.id}
                onClick={() => !n.read && markAsRead(n.id)}
                className={`px-4 py-3 text-sm border-b border-border last:border-0 cursor-pointer transition ${
                  n.read ? 'text-muted-foreground' : 'text-foreground bg-accent/30'
                }`}
              >
                <div className="flex items-start gap-2">
                  {!n.read && <span className="mt-1.5 w-1.5 h-1.5 rounded-full bg-primary shrink-0" />}
                  <div className="flex-1">
                    <p className={n.read ? '' : 'font-medium'}>{n.message}</p>
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
