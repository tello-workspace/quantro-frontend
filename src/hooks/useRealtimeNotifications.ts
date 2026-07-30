"use client";

import { useEffect, useCallback, useRef } from "react";
import { useSocket } from "@/lib/socket";
import type { CardPayload, CardMovedPayload, ColumnPayload, OrgEventPayload, ConflictPayload, ConflictResolvedPayload } from "@/lib/socket.tsx";
import { useDispatch } from "react-redux";
import { toast } from "sonner";
import { AppDispatch } from "@/lib/store";
import { api } from "@/lib/api";
import { setNotifications, addNotification, markNotificationAsRead, markAllNotificationsAsRead } from "@/features/notifications/notificationsSlice";

interface NotificationPayload {
  id: string;
  userId: string;
  type: string;
  message: string;
  cardId?: string;
  card?: { id: string; title: string };
  read: boolean;
  createdAt: string;
}

export function useRealtimeNotifications() {
  const { on, off, isConnected } = useSocket();
  const dispatch = useDispatch<AppDispatch>();
  const unsubscribeRef = useRef<(() => void)[]>([]);

  // Cleanup function
  const cleanup = useCallback(() => {
    unsubscribeRef.current.forEach((unsub) => unsub());
    unsubscribeRef.current = [];
  }, []);

  useEffect(() => {
    if (!isConnected) {
      console.log(`[RealtimeNotifications] isConnected=false, handler'lar register EDİLMEDİ`);
      return;
    }

    console.log(`[RealtimeNotifications] isConnected=true, handler'lar register ediliyor`);
    cleanup();

    // Listen for new notifications
    const handleNewNotification = (notification: NotificationPayload) => {
      console.log("[RealtimeNotifications] 🔔 notification:new alındı:", notification.type, notification.message);
      // Add to Redux store
      dispatch(addNotification(notification));

      // RTK Query cache'ini tazele (NotificationBell güncellensin)
      dispatch(api.util.invalidateTags(['Notification']));

      // Show toast based on notification type
      const getToastOptions = (type: string) => {
        switch (type) {
          case "ORG_JOINED":
            return { type: "success" as const, icon: "🎉" };
          case "ORG_REMOVED":
            return { type: "error" as const, icon: "🚫" };
          case "ROLE_CHANGED":
            return { type: "info" as const, icon: "⭐" };
          case "ASSIGNED":
            return { type: "info" as const, icon: "📋" };
          case "BLOCKER_RESOLVED":
            return { type: "success" as const, icon: "🔓" };
          case "DEADLINE_RISK":
            return { type: "warning" as const, icon: "⚠️" };
          case "STALE_CARD":
            return { type: "warning" as const, icon: "🕐" };
          case "WIP_EXCEEDED":
            return { type: "warning" as const, icon: "📊" };
          default:
            return { type: "default" as const, icon: "🔔" };
        }
      };

      const { type: toastType, icon } = getToastOptions(notification.type);
      const cleanMsg = notification.message.replace(/\s*\[orgId:[^\]]+\]/, '');

      switch (toastType) {
        case "success":
          toast.success(`${icon} ${cleanMsg}`);
          break;
        case "error":
          toast.error(`${icon} ${cleanMsg}`);
          break;
        case "warning":
          toast.warning(`${icon} ${cleanMsg}`);
          break;
        case "info":
          toast(`${icon} ${cleanMsg}`);
          break;
        default:
          toast(`${icon} ${cleanMsg}`);
      }
    };

    const handleNotificationRead = (data: { notificationId: string; read: boolean }) => {
      dispatch(markNotificationAsRead(data.notificationId));
    };

    const handleAllNotificationsRead = () => {
      dispatch(markAllNotificationsAsRead());
    };

    // Subscribe to events
    on("notification:new", handleNewNotification);
    unsubscribeRef.current.push(() => off("notification:new", handleNewNotification));

    on("notification:read", handleNotificationRead);
    unsubscribeRef.current.push(() => off("notification:read", handleNotificationRead));

    on("notification:all_read", handleAllNotificationsRead);
    unsubscribeRef.current.push(() => off("notification:all_read", handleAllNotificationsRead));

    // Cleanup on disconnect or unmount
    return () => {
      cleanup();
    };
  }, [isConnected, on, off, dispatch, cleanup]);

  return { isConnected };
}

// Hook for real-time board updates (cards, columns, etc.)
export function useRealtimeBoard(projectId: string) {
  const { on, off, isConnected, joinProject, leaveProject } = useSocket();
  const unsubscribeRef = useRef<(() => void)[]>([]);

  const cleanup = useCallback(() => {
    unsubscribeRef.current.forEach((unsub) => unsub());
    unsubscribeRef.current = [];
    leaveProject(projectId);
  }, [leaveProject, projectId]);

  useEffect(() => {
    if (!isConnected || !projectId) return;

    joinProject(projectId);

    return () => {
      cleanup();
    };
  }, [isConnected, projectId, joinProject, cleanup]);

  const onCardCreated = useCallback(
    (callback: (card: CardPayload) => void) => {
      on("card:created", callback);
      const unsubscribe = () => {
        off("card:created", callback);
        unsubscribeRef.current = unsubscribeRef.current.filter((fn) => fn !== unsubscribe);
      };
      unsubscribeRef.current.push(unsubscribe);
      return unsubscribe;
    },
    [on, off]
  );

  const onCardUpdated = useCallback(
    (callback: (card: CardPayload) => void) => {
      on("card:updated", callback);
      const unsubscribe = () => {
        off("card:updated", callback);
        unsubscribeRef.current = unsubscribeRef.current.filter((fn) => fn !== unsubscribe);
      };
      unsubscribeRef.current.push(unsubscribe);
      return unsubscribe;
    },
    [on, off]
  );

  const onCardMoved = useCallback(
    (callback: (data: CardMovedPayload) => void) => {
      on("card:moved", callback);
      const unsubscribe = () => {
        off("card:moved", callback);
        unsubscribeRef.current = unsubscribeRef.current.filter((fn) => fn !== unsubscribe);
      };
      unsubscribeRef.current.push(unsubscribe);
      return unsubscribe;
    },
    [on, off]
  );

  const onCardDeleted = useCallback(
    (callback: (cardId: string) => void) => {
      on("card:deleted", callback);
      const unsubscribe = () => {
        off("card:deleted", callback);
        unsubscribeRef.current = unsubscribeRef.current.filter((fn) => fn !== unsubscribe);
      };
      unsubscribeRef.current.push(unsubscribe);
      return unsubscribe;
    },
    [on, off]
  );

  const onColumnCreated = useCallback(
    (callback: (column: ColumnPayload) => void) => {
      on("column:created", callback);
      const unsubscribe = () => {
        off("column:created", callback);
        unsubscribeRef.current = unsubscribeRef.current.filter((fn) => fn !== unsubscribe);
      };
      unsubscribeRef.current.push(unsubscribe);
      return unsubscribe;
    },
    [on, off]
  );

  const onColumnUpdated = useCallback(
    (callback: (column: ColumnPayload) => void) => {
      on("column:updated", callback);
      const unsubscribe = () => {
        off("column:updated", callback);
        unsubscribeRef.current = unsubscribeRef.current.filter((fn) => fn !== unsubscribe);
      };
      unsubscribeRef.current.push(unsubscribe);
      return unsubscribe;
    },
    [on, off]
  );

  const onColumnDeleted = useCallback(
    (callback: (data: { columnId: string; projectId: string; deletedBy: string }) => void) => {
      on("column:deleted", callback);
      const unsubscribe = () => {
        off("column:deleted", callback);
        unsubscribeRef.current = unsubscribeRef.current.filter((fn) => fn !== unsubscribe);
      };
      unsubscribeRef.current.push(unsubscribe);
      return unsubscribe;
    },
    [on, off]
  );

  const onConflictDetected = useCallback(
    (callback: (data: ConflictPayload) => void) => {
      on("conflict:detected", callback);
      const unsubscribe = () => {
        off("conflict:detected", callback);
        unsubscribeRef.current = unsubscribeRef.current.filter((fn) => fn !== unsubscribe);
      };
      unsubscribeRef.current.push(unsubscribe);
      return unsubscribe;
    },
    [on, off]
  );

  const onConflictResolved = useCallback(
    (callback: (data: ConflictResolvedPayload) => void) => {
      on("conflict:resolved", callback);
      const unsubscribe = () => {
        off("conflict:resolved", callback);
        unsubscribeRef.current = unsubscribeRef.current.filter((fn) => fn !== unsubscribe);
      };
      unsubscribeRef.current.push(unsubscribe);
      return unsubscribe;
    },
    [on, off]
  );
  return {
    onCardCreated,
    onCardUpdated,
    onCardMoved,
    onCardDeleted,
    onColumnCreated,
    onColumnUpdated,
    onColumnDeleted,
    onConflictDetected,
    onConflictResolved,
  };
}

// Hook for organization real-time events
export function useRealtimeOrganization(organizationId: string) {
  const { on, off, isConnected, emit } = useSocket();
  const unsubscribeRef = useRef<(() => void)[]>([]);

  const cleanup = useCallback(() => {
    unsubscribeRef.current.forEach((unsub) => unsub());
    unsubscribeRef.current = [];
  }, []);

  useEffect(() => {
    if (!isConnected) return;

    return () => {
      cleanup();
    };
  }, [isConnected, cleanup]);

  const onMemberAdded = useCallback(
    (callback: (data: OrgEventPayload) => void) => {
      on("org:member_added", callback);
      unsubscribeRef.current.push(() => off("org:member_added", callback));
    },
    [on, off]
  );

  const onMemberRemoved = useCallback(
    (callback: (data: OrgEventPayload) => void) => {
      on("org:member_removed", callback);
      unsubscribeRef.current.push(() => off("org:member_removed", callback));
    },
    [on, off]
  );

  const onMemberRoleChanged = useCallback(
    (callback: (data: OrgEventPayload) => void) => {
      on("org:member_role_changed", callback);
      unsubscribeRef.current.push(() => off("org:member_role_changed", callback));
    },
    [on, off]
  );

  return {
    onMemberAdded,
    onMemberRemoved,
    onMemberRoleChanged,
  };
}
