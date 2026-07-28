"use client";

import { io, Socket } from "socket.io-client";
import { useEffect, useRef, useState, useCallback, createContext, useContext, ReactNode } from "react";

function getToken(): string | null {
  if (typeof window !== "undefined") {
    return localStorage.getItem("token");
  }
  return null;
}

export interface NotificationPayload {
  id: string;
  userId: string;
  type: string;
  message: string;
  cardId?: string;
  card?: { id: string; title: string };
  read: boolean;
  createdAt: string;
}

export interface OrgEventPayload {
  organizationId: string;
  userId: string;
  userName: string;
  role?: string;
  type?: string;
  message?: string;
  excludeUserId?: string;
  member?: {
    id: string;
    name: string;
    email: string;
    role: string;
  };
  addedBy?: string;
  removedBy?: string;
  changedBy?: string;
}

export interface ProjectPayload {
  id: string;
  name: string;
  description?: string;
  organizationId: string;
  ownerId: string;
}

export interface CardPayload {
  id: string;
  title: string;
  description?: string;
  columnId: string;
  projectId: string;
  assigneeId?: string;
  assignee?: { id: string; name: string };
  assignees?: { id: string; name: string }[];
  priority: string;
  dueDate?: string;
  position: number;
  columnName?: string;
}

export interface CardMovedPayload {
  cardId: string;
  fromColumnId: string;
  toColumnId: string;
  position: number;
  projectId: string;
}

export interface ColumnPayload {
  id: string;
  name: string;
  projectId: string;
  position: number;
  wipLimit?: number;
  isDone: boolean;
}

export interface CommentPayload {
  id: string;
  cardId: string;
  authorId: string;
  authorName: string;
  text: string;
  createdAt: string;
}

export interface ActivityPayload {
  id: string;
  projectId: string;
  cardId?: string;
  userId: string;
  userName: string;
  type: string;
  data?: Record<string, unknown>;
  createdAt: string;
}

export interface StaleCardPayload {
  cardId: string;
  cardTitle: string;
  columnName: string;
  daysInactive: number;
  assigneeId?: string;
  assigneeName?: string;
}

export interface WorkloadPayload {
  userId: string;
  userName: string;
  taskCount: number;
  weightedCount: number;
  threshold: number;
}

export interface DeadlineRiskPayload {
  cardId: string;
  cardTitle: string;
  dueDate: string;
  daysRemaining: number;
  assigneeId?: string;
  assigneeName?: string;
  reason: "stale" | "blocked" | "approaching";
}

export interface TypingPayload {
  userId: string;
  userName: string;
  cardId?: string;
  columnId?: string;
  projectId?: string;
  isTyping: boolean;
}

// Git Cakisma Erken Uyari: VSCode extension'dan gelen dosya-seviyesi presence
// kesisiminden turetilir. Satir/hunk analizi yok — "kesin cakisma" degil "risk".
export interface ConflictCardRef {
  id: string;
  title: string;
  projectId: string;
}

export interface ConflictUserRef {
  id: string;
  name: string;
}

export interface ConflictPayload {
  filePath: string;
  cardA: ConflictCardRef;
  userA: ConflictUserRef;
  cardB: ConflictCardRef;
  userB: ConflictUserRef;
}

// Taraflardan biri dosyadan ayrilinca / baglantisi kopunca / kaydi bayatlayinca
// gelir. filePath ile birlikte gelmesinin sebebi: ayni kartin BASKA bir
// dosyadaki hala aktif olan uyarisini yanlislikla silmemek.
export interface ConflictResolvedPayload {
  filePath: string;
  cardIds: [string, string];
}

type SocketEventMap = {
  // Auth
  authenticate: (token: string) => void;
  authenticated: (user: { id: string; name: string; email: string }) => void;
  auth_error: (message: string) => void;

  // Notifications
  "notification:new": (notification: NotificationPayload) => void;
  "notification:read": (data: { notificationId: string; read: boolean }) => void;
  "notification:all_read": (data: { success: boolean }) => void;

  // Organization
  "org:member_added": (data: OrgEventPayload) => void;
  "org:member_removed": (data: OrgEventPayload) => void;
  "org:member_role_changed": (data: OrgEventPayload) => void;

  // Project
  "project:created": (data: { project: ProjectPayload; createdBy: string }) => void;
  "project:updated": (data: { projectId: string; project: ProjectPayload; updatedBy: string }) => void;
  "project:deleted": (data: { projectId: string; projectName: string; deletedBy: string }) => void;

  // Card
  "card:created": (card: CardPayload) => void;
  "card:updated": (card: CardPayload) => void;
  "card:moved": (data: CardMovedPayload) => void;
  "card:deleted": (cardId: string) => void;
  "card:assigned": (data: {
    cardId: string;
    cardTitle: string;
    assigneeId: string;
    assigneeName: string;
    assignedById: string;
    assignedByName: string;
  }) => void;

  // Column
  "column:created": (column: ColumnPayload) => void;
  "column:updated": (column: ColumnPayload) => void;
  "column:deleted": (data: { columnId: string; projectId: string; deletedBy: string }) => void;
  "column:wip_exceeded": (data: { columnId: string; count: number; limit: number }) => void;

  // Comment
  "comment:added": (comment: CommentPayload) => void;
  "comment:updated": (comment: CommentPayload) => void;
  "comment:deleted": (commentId: string) => void;

  // Activity
  "activity:new": (activity: ActivityPayload) => void;

  // Insights/Proactive
  "insight:stale_card": (data: StaleCardPayload) => void;
  "insight:workload_imbalance": (data: WorkloadPayload) => void;
  "insight:deadline_risk": (data: DeadlineRiskPayload) => void;

  // Presence
  "presence:online": (userId: string) => void;
  "presence:offline": (userId: string) => void;
  "presence:typing": (data: TypingPayload) => void;

  // Git Cakisma Erken Uyari
  "conflict:detected": (data: ConflictPayload) => void;
  "conflict:resolved": (data: ConflictResolvedPayload) => void;

  // Custom room events
  "join:project": (projectId: string) => void;
  "leave:project": (projectId: string) => void;
  "join:card": (cardId: string) => void;
  "leave:card": (cardId: string) => void;
};

type EventName = keyof SocketEventMap;
type EventCallback<K extends EventName> = SocketEventMap[K];

interface SocketContextType {
  socket: Socket | null;
  isConnected: boolean;
  connect: () => void;
  disconnect: () => void;
  on: <K extends EventName>(event: K, callback: EventCallback<K>) => void;
  off: <K extends EventName>(event: K, callback: EventCallback<K>) => void;
  emit: <K extends EventName>(event: K, ...args: Parameters<EventCallback<K>>) => void;
  joinProject: (projectId: string) => void;
  leaveProject: (projectId: string) => void;
  joinCard: (cardId: string) => void;
  leaveCard: (cardId: string) => void;
}

const SocketContext = createContext<SocketContextType | null>(null);

export function useSocket(): SocketContextType {
  const context = useContext(SocketContext);
  if (!context) {
    throw new Error("useSocket must be used within a SocketProvider");
  }
  return context;
}

interface SocketProviderProps {
  children: ReactNode;
}

function isRealtimeEnabled(): boolean {
  return process.env.NEXT_PUBLIC_ENABLE_REALTIME !== "false";
}

function getSocketUrl(): string {
  const configured = process.env.NEXT_PUBLIC_SOCKET_URL;
  if (configured) return configured;

  const apiUrl = process.env.NEXT_PUBLIC_API_URL || "http://localhost:3001/api";
  return apiUrl.replace(/\/api$/, "");
}

export function SocketProvider({ children }: SocketProviderProps) {
  const socketRef = useRef<Socket | null>(null);
  const [isConnected, setIsConnected] = useState(false);
  // Socket bağlanana kadar bekleyen handler'lar
  const pendingRef = useRef<Map<string, Set<(...args: never[]) => void>>>(new Map());

  // Bekleyen handler'ları socket bağlanınca gerçek socket'a ekle
  const flushPending = useCallback((socket: Socket) => {
    pendingRef.current.forEach((callbacks, event) => {
      console.log(`[SOCKET] flushPending: "${event}" için ${callbacks.size} handler socket'a ekleniyor`);
      callbacks.forEach((cb) => {
        (socket.on as (event: string, cb: (...args: never[]) => void) => void)(event, cb);
      });
    });
  }, []);

  const createSocket = useCallback((token: string) => {
    if (!isRealtimeEnabled()) {
      setIsConnected(false);
      return;
    }

    // Socket.io doğrudan HTTP server'a bağlı, /api prefix'i yok
    const socketUrl = getSocketUrl();
    const socket = io(socketUrl, {
      path: "/socket.io",
      transports: ["polling", "websocket"],
      autoConnect: true,
      auth: {
        token,
      },
      reconnection: true,
      reconnectionAttempts: 10,
      reconnectionDelay: 1000,
      reconnectionDelayMax: 5000,
      timeout: 20000,
    });

    socket.on("connect", () => {
      console.log("✅ Socket connected:", socket.id);
      setIsConnected(true);
      socket.emit("authenticate", token);
      // Yeniden bağlanınca bekleyen handler'ları tekrar ekle
      flushPending(socket);
    });

    socket.on("disconnect", (reason) => {
      console.log("❌ Socket disconnected:", reason);
      setIsConnected(false);
    });

    socket.on("connect_error", (error) => {
      // Vercel gibi serverless ortamlarda Socket.io sunucusu olmadigi icin
      // "xhr poll error" normaldir — kullaniciyi rahatsiz etmeden sessizce yönet.
      if (error.message === "xhr poll error") {
        console.warn("[SOCKET] Socket.io sunucusu bulunamadi. Realtime özellikler devre disi.");
      } else {
        console.warn("[SOCKET] Baglanti hatasi:", error.message);
      }
      setIsConnected(false);
    });

    socket.on("authenticated", (user) => {
      console.log("🔐 Socket authenticated:", user.name);
    });

    socket.on("auth_error", (message) => {
      console.error("🔐 Socket auth error:", message);
    });

    socketRef.current = socket;
  }, [flushPending]);

  const connect = useCallback(() => {
    if (!isRealtimeEnabled()) {
      disconnect();
      return;
    }

    const token = getToken();
    if (!token) return;

    if (socketRef.current?.connected) return;

    if (socketRef.current) {
      socketRef.current.auth = { token };
      socketRef.current.connect();
      return;
    }

    createSocket(token);
  }, [createSocket]);

  const disconnect = useCallback(() => {
    if (socketRef.current) {
      socketRef.current.disconnect();
      socketRef.current = null;
      setIsConnected(false);
    }
  }, []);

  const syncConnection = useCallback(() => {
    if (!isRealtimeEnabled()) {
      disconnect();
      return;
    }

    const token = getToken();

    if (!token) {
      disconnect();
      return;
    }

    connect();
  }, [connect, disconnect]);

  const on = useCallback(<K extends EventName>(event: K, callback: EventCallback<K>) => {
    const cb = callback as (...args: never[]) => void;
    const socket = socketRef.current;
    if (socket?.connected) {
      console.log(`[SOCKET] on("${event}") — socket bağlı, direkt ekleniyor`);
      (socket.on as (event: string, cb: (...args: never[]) => void) => void)(event, cb);
    } else {
      console.log(`[SOCKET] on("${event}") — socket BAĞLI DEĞİL (connected: ${socket?.connected}), kuyruğa ekleniyor`);
      if (!pendingRef.current.has(event as string)) {
        pendingRef.current.set(event as string, new Set());
      }
      pendingRef.current.get(event as string)!.add(cb);
    }
  }, []);

  const off = useCallback(<K extends EventName>(event: K, callback: EventCallback<K>) => {
    const cb = callback as (...args: never[]) => void;
    const socket = socketRef.current;
    if (socket?.connected) {
      console.log(`[SOCKET] off("${event}") — socket'tan kaldırılıyor`);
      (socket.off as (event: string, cb: (...args: never[]) => void) => void)(event, cb);
    }
    // Bekleyen kuyruktan da çıkar
    pendingRef.current.get(event as string)?.delete(cb);
  }, []);

  const emit = useCallback(<K extends EventName>(event: K, ...args: Parameters<EventCallback<K>>) => {
    socketRef.current?.emit(event, ...args);
  }, []);

  const joinProject = useCallback((projectId: string) => {
    socketRef.current?.emit("join:project", projectId);
  }, []);

  const leaveProject = useCallback((projectId: string) => {
    socketRef.current?.emit("leave:project", projectId);
  }, []);

  const joinCard = useCallback((cardId: string) => {
    socketRef.current?.emit("join:card", cardId);
  }, []);

  const leaveCard = useCallback((cardId: string) => {
    socketRef.current?.emit("leave:card", cardId);
  }, []);

  // Connect on mount when token is available
  useEffect(() => {
    syncConnection();

    const handleAuthChanged = () => {
      syncConnection();
    };

    window.addEventListener("auth:changed", handleAuthChanged);
    window.addEventListener("storage", handleAuthChanged);

    return () => {
      window.removeEventListener("auth:changed", handleAuthChanged);
      window.removeEventListener("storage", handleAuthChanged);
      disconnect();
    };
  }, [syncConnection, disconnect]);

  return (
    <SocketContext.Provider
      value={{
        socket: socketRef.current,
        isConnected,
        connect,
        disconnect,
        on,
        off,
        emit,
        joinProject,
        leaveProject,
        joinCard,
        leaveCard,
      }}
    >
      {children}
    </SocketContext.Provider>
  );
}

let globalSocket: Socket | null = null;

export function getSocket(): Socket | null {
  if (typeof window === 'undefined') return null;
  if (!isRealtimeEnabled()) return null;

  const token = localStorage.getItem('token');
  if (!token) return null;

  if (globalSocket && globalSocket.connected) return globalSocket;

  if (!globalSocket) {
    const configured = process.env.NEXT_PUBLIC_SOCKET_URL;
    const socketUrl = configured || (process.env.NEXT_PUBLIC_API_URL || 'http://localhost:3001/api').replace(/\/api\/?$/, '');

    globalSocket = io(socketUrl, {
      auth: { token },
      autoConnect: false,
    });
  }

  if (!globalSocket.connected) {
    globalSocket.auth = { token };
    globalSocket.connect();
  }

  return globalSocket;
}

export function disconnectSocket() {
  globalSocket?.disconnect();
  globalSocket = null;
}
