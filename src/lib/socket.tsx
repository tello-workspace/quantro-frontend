"use client";

import { io, Socket } from "socket.io-client";
import { useEffect, useRef, useState, useCallback, useMemo, createContext, useContext, ReactNode } from "react";

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
  assignees?: { id: string; name: string }[];
  priority: string;
  dueDate?: string;
  startDate?: string | null;
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
// Organizasyon sohbeti. Bu olaylar SocketEventMap'te tanimli olmadigi icin
// OrgChatPanel provider'i atlayip modul seviyesindeki globalSocket'i acmak
// zorunda kaliyordu; o soket auth:changed/storage yolunda kapanmadigindan
// baska sekmede cikis yapildiktan sonra bile sohbet trafigini almaya devam
// ediyordu. Tipleri buraya tasiyarak panel tek sokete baglanabiliyor.
export interface ChatMessagePayload {
  id: string;
  organizationId: string;
  authorId: string;
  authorName: string;
  text: string;
  createdAt: string;
}

export interface ChatTypingPayload {
  organizationId: string;
  // Sunucudan gelen yayinda dolu; istemci gonderirken yalnizca
  // organizationId + isTyping yollar, kimligi sunucu ekler.
  userId?: string;
  userName?: string;
  isTyping: boolean;
}

/** join:org / join:project / join:card icin sunucunun dondugu onay. */
export interface JoinAck {
  ok: boolean;
  reason?: "FORBIDDEN" | "INVALID";
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

  // Sirket ici mailbox
  "mail:new": (data: { mailId: string; subject: string; senderName: string }) => void;

  // Organizasyon sohbeti
  "chat:message": (message: ChatMessagePayload) => void;
  "chat:typing": (data: ChatTypingPayload) => void;

  // Custom room events. join:* ISTEGE BAGLI bir ack callback'i alir; sunucu
  // katilimin kabul mu red mi edildigini oradan bildirir.
  "join:org": (organizationId: string, ack?: (sonuc: JoinAck) => void) => void;
  "join:project": (projectId: string, ack?: (sonuc: JoinAck) => void) => void;
  "leave:project": (projectId: string) => void;
  "join:card": (cardId: string, ack?: (sonuc: JoinAck) => void) => void;
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
  // Acik soketin HANGI token ile yetkilendirildigi. connect() "zaten bagli"
  // diye erken donuyordu ama baglantinin KIME ait oldugunu sormuyordu; tam
  // sayfa yenilemesi olmadan baska bir hesaba gecildiginde soket onceki
  // kullanici olarak bagli kaliyor, bildirimler ve canli guncellemeler o
  // kullanici icin akmaya devam ediyordu.
  const socketTokenRef = useRef<string | null>(null);
  const [isConnected, setIsConnected] = useState(false);
  // Context'e VERILEN soket. socketRef callback'lerin kararli kalmasi icin
  // gerekli (ref degisimi render tetiklemez), ama render ciktisinda ref
  // okumak yanlis: ref degistiginde tuketiciler yeniden cizilmedigi icin
  // bayat bir soket gorurlerdi. Bu yuzden render'a giden deger ayri bir
  // state olarak tutuluyor; ikisi createSocket/disconnect icinde birlikte
  // guncelleniyor.
  const [socket, setSocket] = useState<Socket | null>(null);
  // Aktif olarak dinlenen tum handler'larin listesi
  const listenersRef = useRef<Map<string, Set<(...args: never[]) => void>>>(new Map());

  // Tum aktif handler'lari socket baglaninca/yetkilendirilince gercek socket'a ekler (idempotent)
  const syncSocketListeners = useCallback((socket: Socket) => {
    listenersRef.current.forEach((callbacks, event) => {
      callbacks.forEach((cb) => {
        (socket.off as (event: string, cb: (...args: never[]) => void) => void)(event, cb);
        (socket.on as (event: string, cb: (...args: never[]) => void) => void)(event, cb);
      });
    });
  }, []);

  const createSocket = useCallback((token: string) => {
    if (!isRealtimeEnabled()) {
      setIsConnected(false);
      return;
    }
    // Socket.io dogrudan HTTP server'a bagli, /api prefix'i yok
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
      setIsConnected(true);
      socket.emit("authenticate", token);
    });

    socket.on("disconnect", () => {
      setIsConnected(false);
    });

    socket.on("connect_error", (error) => {
      console.error("Socket connection error:", error.message);
      setIsConnected(false);
    });

    socket.on("authenticated", () => {
      syncSocketListeners(socket);
    });

    socket.on("auth_error", (message) => {
      console.error("Socket auth error:", message);
    });
    socketRef.current = socket;
    socketTokenRef.current = token;
    setSocket(socket);
  }, [syncSocketListeners]);

  // connect()'ten ONCE tanimli olmali: connect'in bagimlilik dizisi disconnect'e
  // referans veriyor ve bu dizi render sirasinda degerlendiriliyor.
  const disconnect = useCallback(() => {
    if (socketRef.current) {
      socketRef.current.disconnect();
      socketRef.current = null;
      socketTokenRef.current = null;
      setSocket(null);
      setIsConnected(false);
    }
  }, []);

  const connect = useCallback(() => {
    if (!isRealtimeEnabled()) {
      disconnect();
      return;
    }
    const token = getToken();
    if (!token) return;

    // Token degistiyse (baska hesaba gecildi) acik soket ARTIK YANLIS kisiye
    // ait - yeniden kullanma, kapat ve sifirdan kur. Bu kontrol olmadan
    // asagidaki "zaten bagli" kisayolu onceki kullanicinin soketini ayakta
    // tutuyordu.
    if (socketRef.current && socketTokenRef.current !== token) {
      disconnect();
    }

    if (socketRef.current?.connected) return;

    if (socketRef.current) {
      socketRef.current.auth = { token };
      socketTokenRef.current = token;
      socketRef.current.connect();
      return;
    }

    createSocket(token);
  }, [createSocket, disconnect]);

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

  // on/off, socket.io nesnesine BAGLANTI DURUMUNDAN BAGIMSIZ olarak yazar.
  //
  // Eskiden ikisi de "socket?.connected" kosuluna baglıydi. socket.io istemcisi
  // disconnect sirasinda kullanici callback'lerini TEMIZLEMEZ - ayni Socket
  // ornegi yeniden baglandiginda ayni _callbacks listesiyle devam eder. Bu
  // yuzden kopukken yapilan off() cagrisi dinleyiciyi sokemiyordu; sadece
  // listenersRef haritasindan siliyordu. syncSocketListeners ise yalnizca
  // HARITADAKI handler'lari yeniden bagladigi icin haritadan cikmis eski
  // handler'a hic dokunmuyor, o da sonsuza dek sokete asili kaliyordu.
  //
  // Somut sonuc: wifi 10 sn kopup geri gelince useRealtimeNotifications
  // effect'i yeni bir closure kaydediyor, eskisi de duruyordu - her atama
  // bildirimi iki kez toast'laniyor, her kopmada bir kopya daha ekleniyordu.
  const on = useCallback(<K extends EventName>(event: K, callback: EventCallback<K>) => {
    const cb = callback as (...args: never[]) => void;
    if (!listenersRef.current.has(event as string)) {
      listenersRef.current.set(event as string, new Set());
    }
    listenersRef.current.get(event as string)!.add(cb);

    const socket = socketRef.current;
    if (socket) {
      // off+on: ayni handler iki kez kaydedilmesin (idempotent).
      (socket.off as (event: string, cb: (...args: never[]) => void) => void)(event, cb);
      (socket.on as (event: string, cb: (...args: never[]) => void) => void)(event, cb);
    }
  }, []);

  const off = useCallback(<K extends EventName>(event: K, callback: EventCallback<K>) => {
    const cb = callback as (...args: never[]) => void;
    listenersRef.current.get(event as string)?.delete(cb);

    // Kopuk soketten de sokulebilir; "connected" kosulu tam olarak sizintiyi
    // uretiyordu.
    (socketRef.current?.off as ((event: string, cb: (...args: never[]) => void) => void) | undefined)?.(event, cb);
  }, []);

  const emit = useCallback(<K extends EventName>(event: K, ...args: Parameters<EventCallback<K>>) => {
    socketRef.current?.emit(event, ...args);
  }, []);

  // Sunucu join:* icin ack donuyor. Ack olmadan reddedilen bir katilim
  // istemcide TAMAMEN sessizdi: kullanici "canli guncelleme gelmiyor" ile
  // "bu odaya girmeme izin verilmedi" arasindaki farki goremiyordu (ikisi de
  // ayni sekilde, hicbir olay gelmemesi olarak yasaniyor). Artik red
  // konsola acikca yaziliyor.
  const katilimiBildir = useCallback((oda: string, id: string, sonuc?: { ok: boolean; reason?: string }) => {
    if (sonuc && !sonuc.ok) {
      console.warn(`[socket] ${oda} odasina katilim reddedildi (${sonuc.reason ?? "bilinmiyor"}): ${id}`);
    }
  }, []);

  const joinProject = useCallback((projectId: string) => {
    socketRef.current?.emit("join:project", projectId, (sonuc: { ok: boolean; reason?: string }) =>
      katilimiBildir("project", projectId, sonuc),
    );
  }, [katilimiBildir]);

  const leaveProject = useCallback((projectId: string) => {
    socketRef.current?.emit("leave:project", projectId);
  }, []);

  const joinCard = useCallback((cardId: string) => {
    socketRef.current?.emit("join:card", cardId, (sonuc: { ok: boolean; reason?: string }) =>
      katilimiBildir("card", cardId, sonuc),
    );
  }, [katilimiBildir]);

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

  // Her render'da yeni bir nesne uretmek, degerin kendisi degismese bile
  // TUM tuketicileri yeniden cizdirir - context'in en bilinen tuzagi.
  const value = useMemo(
    () => ({
      socket,
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
    }),
    [socket, isConnected, connect, disconnect, on, off, emit, joinProject, leaveProject, joinCard, leaveCard],
  );

  return (
    <SocketContext.Provider value={value}>
      {children}
    </SocketContext.Provider>
  );
}
let globalSocket: Socket | null = null;

export function getSocket(): Socket | null {
  if (typeof window === 'undefined') return null;

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
