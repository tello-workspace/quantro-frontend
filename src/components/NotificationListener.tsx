"use client";

import { useEffect } from "react";
import { useRealtimeNotifications } from "@/hooks/useRealtimeNotifications";

export default function NotificationListener() {
  const { isConnected } = useRealtimeNotifications();

  useEffect(() => {
    // Socket connected — real-time notifications active
  }, [isConnected]);

  return null;
}
