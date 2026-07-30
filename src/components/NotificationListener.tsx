"use client";

import { useEffect } from "react";
import { useRealtimeNotifications } from "@/hooks/useRealtimeNotifications";

export default function NotificationListener() {
  const { isConnected } = useRealtimeNotifications();

  useEffect(() => {
    if (isConnected) {
      console.log("🔔 NotificationListener: Socket connected, listening for real-time notifications");
    }
  }, [isConnected]);

  return null;
}
