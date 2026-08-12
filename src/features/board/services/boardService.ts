// src/features/board/services/boardService.ts

const API_BASE_URL = process.env.NEXT_PUBLIC_API_URL || 'http://localhost:4000/api';

export function getAuthHeaders(): Record<string, string> {
  const headers: Record<string, string> = { 'Content-Type': 'application/json' };
  if (typeof window !== 'undefined') {
    const token = localStorage.getItem('token');
    if (token) headers['Authorization'] = `Bearer ${token}`;
  }
  return headers;
}

function extractData<T>(response: { success: boolean; data: T }): T {
  if (!response.success) throw new Error('API hatası');
  return response.data;
}

// Sunucunun anlatti hatayi kullaniciya gosterir. Onceden sabit bir metin
// firlatiliyordu ("Gorev guncellenemedi.") ve "Sadece adminler gorev atamasi
// yapabilir" gibi asil sebep kayboluyordu.
async function readApiError(res: Response, fallback: string): Promise<string> {
  try {
    const json = await res.json();
    const err = json?.error;
    if (typeof err === 'string') return err;

    // Dogrulama hatalarinda sunucu alan bazli sebepleri `fields` icinde
    // yolluyor ama message sabit "Geçersiz veri" oluyordu. Sadece message'i
    // okumak kullaniciyi da bizi de cikmaza sokuyordu: hangi alanin neden
    // reddedildigi hicbir yerde gorunmuyordu.
    if (err?.fields && typeof err.fields === 'object') {
      const detay = Object.entries(err.fields as Record<string, string>)
        .map(([alan, mesaj]) => `${alan}: ${mesaj}`)
        .join(' · ');
      if (detay) return err.message ? `${err.message} (${detay})` : detay;
    }

    if (err?.message) return err.message;
  } catch {
    // JSON olmayan cevap - fallback kullanilir
  }
  return fallback;
}

export interface TaskLabel {
  id: string;
  name: string;
  color: string;
}

export interface BadgeInfo {
  id: string;
  name: string;
  color: string;
  icon: string | null;
}

export interface TaskAssignee {
  id: string;
  name: string;
  avatarUrl?: string | null;
  badges?: BadgeInfo[];
}

export type DependencyRelationType = 'BLOCKS' | 'RELATES_TO' | 'DUPLICATES' | 'CLONES';

export interface DependencyCard {
  id: string;
  title: string;
  relationType?: DependencyRelationType;
}

export type Priority = 'LOW' | 'MEDIUM' | 'HIGH' | 'URGENT';
export type CardType = 'EPIC' | 'STORY' | 'TASK' | 'BUG' | 'SUBTASK';

export interface Task {
  id: string;
  /** Proje icinde artan kart numarasi. Gorunen anahtar: `${projectKey}-${number}` */
  number?: number;
  title: string;
  description?: string;
  dueDate?: string;
  startDate?: string;
  columnId: string;
  position?: number;
  priority?: Priority;
  type?: CardType;
  lastActivityAt?: string;
  assignees?: TaskAssignee[];
  labels?: TaskLabel[];
  blockedBy?: DependencyCard[]; // bu karti bloklayan kartlar
  blocking?: DependencyCard[]; // bu kartin blokladigi kartlar
  // Sadece board yuklemesinde gelir (checklist item metinleri degil, sadece
  // sayim) - tam liste TaskModal acilinca checklistApi'den ayrica cekilir.
  checklistTotal?: number;
  checklistDone?: number;
  /** Kartin ilk gorsel ekinin imzali URL'i - panoda kapak olarak gosterilir */
  coverUrl?: string | null;
  parentCardId?: string | null;
  parent?: { id: string; title: string } | null;
  subtasks?: { id: string; title: string; done: boolean }[];
  customFieldValues?: { fieldId: string; value: string | null }[];
  /** Efor tahmini - birimi BoardData.estimateUnit ("puan"/"saat") belirler */
  estimate?: number | null;
  /** Zaman takibi - estimate'ten AYRI eksen, gercek dakika (kaba puanlama degil) */
  estimateMinutes?: number | null;
  spentMinutes?: number;
}

// Backend /cards/:id (GET, PATCH) assignees/labels'i nested CardAssignee[]/
// CardLabel[] olarak dondurur - board endpoint'i ikisini de duz/basitlestirilmis
// dondurur. Task tipini tek tip tutmak icin burada normalize ediyoruz.
export interface RawCard {
  id: string;
  number?: number;
  title: string;
  description?: string | null;
  dueDate?: string | null;
  startDate?: string | null;
  columnId: string;
  position?: number;
  priority?: Priority;
  type?: CardType;
  lastActivityAt?: string;
  assignees?: { user: { id: string; name: string; avatarUrl?: string | null; badges?: { badge: BadgeInfo }[] } }[];
  labels?: { label: { id: string; name: string; color: string } }[];
  blockedBy?: { blocker: DependencyCard; relationType?: DependencyRelationType }[];
  blocking?: { blocked: DependencyCard; relationType?: DependencyRelationType }[];
  parentCardId?: string | null;
  parent?: { id: string; title: string } | null;
  subtasks?: { id: string; title: string; column?: { isDone: boolean } }[];
  customFieldValues?: { fieldId: string; value: string | null }[];
  estimate?: number | null;
  estimateMinutes?: number | null;
  spentMinutes?: number;
}

export function normalizeCard(raw: RawCard): Task {
  return {
    id: raw.id,
    estimate: raw.estimate,
    estimateMinutes: raw.estimateMinutes,
    spentMinutes: raw.spentMinutes,
    number: raw.number,
    title: raw.title,
    description: raw.description ?? undefined,
    dueDate: raw.dueDate ?? undefined,
    startDate: raw.startDate ?? undefined,
    columnId: raw.columnId,
    position: raw.position,
    priority: raw.priority,
    type: raw.type,
    lastActivityAt: raw.lastActivityAt,
    assignees: raw.assignees?.map((a) => ({
      ...a.user,
      badges: a.user.badges?.map((b) => b.badge) ?? [],
    })) ?? [],
    labels: raw.labels?.map((cl) => cl.label) ?? [],
    blockedBy: raw.blockedBy?.map((d) => ({ ...d.blocker, relationType: d.relationType ?? 'BLOCKS' })) ?? [],
    blocking: raw.blocking?.map((d) => ({ ...d.blocked, relationType: d.relationType ?? 'BLOCKS' })) ?? [],
    parentCardId: raw.parentCardId,
    parent: raw.parent,
    subtasks: raw.subtasks?.map((s) => ({ id: s.id, title: s.title, done: s.column?.isDone ?? false })),
    customFieldValues: raw.customFieldValues,
  };
}

// Fractional indexing: komsu iki kartin position'u arasina yeni bir deger
// hesaplar (bkz. backend prisma/schema.prisma Card.position yorumu). Tek satir
// update yeter, kolonun geri kalanini yeniden numaralandirmaya gerek kalmaz.
export function calculateFractionalPosition(prevPos?: number, nextPos?: number): number {
  if (prevPos !== undefined && nextPos !== undefined) return (prevPos + nextPos) / 2;
  if (prevPos !== undefined) return prevPos + 1;
  if (nextPos !== undefined) return nextPos / 2;
  return 1;
}

export interface ArchivedTask {
  id: string;
  title: string;
  priority?: Priority;
  archivedAt: string | null;
  column: { id: string; name: string };
  archivedBy: { id: string; name: string; avatarUrl?: string | null } | null;
}

export type ColumnRuleMode = 'OFF' | 'WARN' | 'ENFORCE';

export interface Column {
  id: string;
  title: string;
  wipLimit: number | null;
  isDone: boolean;
  taskIds: string[];
  transitionMode: ColumnRuleMode;
  requireAssignee: boolean;
  requireChecklistComplete: boolean;
  requireDescription: boolean;
  requireNoOpenBlockers: boolean;
}

export interface BoardData {
  columns: Record<string, Column>;
  tasks: Record<string, Task>;
  myRole?: 'ADMIN' | 'MEMBER';
  /** Kart anahtari oneki ("QNT"). Kart numarasiyla birlesince QNT-42 olur. */
  projectKey?: string;
  /** Efor tahmini birimi - kolon basliginda "puan" mi "saat" mi yazacagini belirler */
  estimateUnit?: 'POINTS' | 'HOURS';
}

export const boardService = {
  async getBoardData(projectId: string): Promise<BoardData | null> {
    try {
      const res = await fetch(`${API_BASE_URL}/projects/${projectId}/board`, {
        method: 'GET',
        headers: getAuthHeaders(),
      });
      if (!res.ok) {
        console.warn("Backend'e ulaşılamadı, yerel veriler kullanılıyor.");
        return null;
      }
      const json = await res.json();
      return extractData(json);
    } catch (error) {
      console.warn("Ağ hatası: Backend çalışmıyor olabilir.", error);
      return null;
    }
  },

  // options.dueDate: takvimden "boş güne tıklayınca kart oluştur" akışı kartın
  // o güne oturması için dueDate'i daha oluşturma anında gönderir. Backend
  // route'u (POST /projects/:id/tasks) dueDate'i zaten kabul ediyor; burada
  // sadece iletiyoruz.
  async createTask(
    projectId: string,
    columnId: string,
    title: string,
    options?: { dueDate?: string },
  ): Promise<Task | null> {
    try {
      const res = await fetch(`${API_BASE_URL}/projects/${projectId}/tasks`, {
        method: 'POST',
        headers: getAuthHeaders(),
        body: JSON.stringify({
          columnId,
          title,
          ...(options?.dueDate && { dueDate: options.dueDate }),
        }),
      });
      if (!res.ok) throw new Error('Kart oluşturulamadı.');
      const json = await res.json();
      return extractData(json);
    } catch {
      return null;
    }
  },

  async moveTask(
    projectId: string,
    taskId: string,
    targetColumnId: string,
    position: number,
    force?: boolean,
  ): Promise<RawCard & { transitionWarnings?: string[] }> {
    const res = await fetch(`${API_BASE_URL}/cards/${taskId}`, {
      method: 'PATCH',
      headers: getAuthHeaders(),
      // force: hedef kolonda ENFORCE modunda bir gecis kurali ihlal edilmisse
      // ve kullanici (admin) "yine de tasi" derse - bkz. handleDragEnd.
      body: JSON.stringify({ columnId: targetColumnId, position, ...(force ? { force } : {}) }),
    });
    // Genel bir metin yerine backend'in asil sebebini (ornegin "Atanan kisi
    // yok") gosteriyoruz - kullanici NEDEN reddedildigini gormeden "yine de
    // tasi" secenegini degerlendiremez.
    if (!res.ok) throw new Error(await readApiError(res, 'Kart taşınamadı.'));
    const json = await res.json();
    return extractData(json);
  },

  // Bir kartin ust gorevini (parentCardId) tek basina degistirir - hem "bu
  // kartin ust gorevini sec" hem de "baska bir karti bunun alt gorevi yap"
  // (o zaman hedef karta cagrilir) icin kullanilir.
  async setCardParent(cardId: string, parentCardId: string | null): Promise<void> {
    const res = await fetch(`${API_BASE_URL}/cards/${cardId}`, {
      method: 'PATCH',
      headers: getAuthHeaders(),
      body: JSON.stringify({ parentCardId }),
    });
    if (!res.ok) throw new Error(await readApiError(res, 'Üst görev güncellenemedi.'));
  },

  async getTaskDetails(projectId: string, taskId: string): Promise<Task> {
    const res = await fetch(`${API_BASE_URL}/cards/${taskId}`, {
      method: 'GET',
      headers: getAuthHeaders(),
    });
    if (!res.ok) throw new Error('Görev detayları yüklenemedi.');
    const json = await res.json();
    const raw = extractData<RawCard>(json);
    return normalizeCard(raw);
  },

  async updateTask(
    projectId: string,
    task: Task,
    options: { includeAssignees?: boolean } = {},
  ): Promise<Task> {
    const body: Record<string, unknown> = {
      title: task.title,
      description: task.description,
      dueDate: task.dueDate || null,
      startDate: task.startDate || null,
      columnId: task.columnId,
      // priority eskiden gonderilmiyordu: AI'nin onerdigi (ya da elle
      // secilen) oncelik kaydedilmis gibi gorunup sessizce kayboluyordu
      priority: task.priority,
      type: task.type,
    };

    // assigneeIds SADECE atama gercekten degistiyse gonderilir.
    // Backend'de assigneeIds alaninin varligi ADMIN sarti tetikliyor
    // (card.service: "Sadece adminler gorev atamasi yapabilir"), bu yuzden
    // her kaydetmede gondermek uyelerin baslik/aciklama duzenlemesini bile
    // 403'e dusuruyordu.
    if (options.includeAssignees && task.assignees !== undefined) {
      body.assigneeIds = task.assignees.map((a) => a.id);
    }

    // undefined = bu Task bu alani hic fetch etmedi (orn. board listesi) ->
    // gonderme, mevcut degeri koru. null/string = kullanici gercekten
    // degistirdi (ya da fetch edilmis mevcut deger) -> gonder.
    if (task.parentCardId !== undefined) body.parentCardId = task.parentCardId;
    if (task.estimate !== undefined) body.estimate = task.estimate;
    if (task.estimateMinutes !== undefined) body.estimateMinutes = task.estimateMinutes;

    const res = await fetch(`${API_BASE_URL}/cards/${task.id}`, {
      method: 'PATCH',
      headers: getAuthHeaders(),
      body: JSON.stringify(body),
    });
    if (!res.ok) throw new Error(await readApiError(res, 'Görev güncellenemedi.'));
    const json = await res.json();
    const raw = extractData<RawCard>(json);
    return normalizeCard(raw);
  },

  async deleteTask(projectId: string, taskId: string): Promise<void> {
    const res = await fetch(`${API_BASE_URL}/cards/${taskId}`, {
      method: 'DELETE',
      headers: getAuthHeaders(),
    });
    if (!res.ok) throw new Error('Görev silinemedi.');
  },

  // Karti arsivle (soft-delete): veri silinmez, board'dan gizlenir.
  async archiveTask(taskId: string): Promise<void> {
    const res = await fetch(`${API_BASE_URL}/cards/${taskId}/archive`, {
      method: 'POST',
      headers: getAuthHeaders(),
    });
    if (!res.ok) throw new Error('Görev arşivlenemedi.');
  },

  // Arsivlenen karti geri yukler - board'a tekrar gorunur olur.
  async restoreTask(taskId: string): Promise<void> {
    const res = await fetch(`${API_BASE_URL}/cards/${taskId}/restore`, {
      method: 'POST',
      headers: getAuthHeaders(),
    });
    if (!res.ok) throw new Error('Görev geri yüklenemedi.');
  },

  // Proje genelinde arsivlenen kartlari getirir (Arsiv ekrani).
  async getArchivedCards(projectId: string): Promise<ArchivedTask[]> {
    const res = await fetch(`${API_BASE_URL}/projects/${projectId}/cards/archived`, {
      headers: getAuthHeaders(),
    });
    if (!res.ok) throw new Error('Arşivlenen kartlar alınamadı.');
    const json = await res.json();
    return extractData<ArchivedTask[]>(json);
  },

  // Karti kopyalar. targetColumnId verilmezse ayni kolona kopyalar.
  // droppedLabels/droppedCustomFields: hedef baska bir projeyse ve karsiligi
  // yoksa sessizce degil, burada bildirilerek dusurulen alanlar.
  async duplicateTask(
    taskId: string,
    options: { targetColumnId?: string } = {},
  ): Promise<{ card: RawCard; droppedLabels: string[]; droppedCustomFields: string[] }> {
    const res = await fetch(`${API_BASE_URL}/cards/${taskId}/duplicate`, {
      method: 'POST',
      headers: getAuthHeaders(),
      body: JSON.stringify(options),
    });
    if (!res.ok) throw new Error(await readApiError(res, 'Kart kopyalanamadı.'));
    const json = await res.json();
    return extractData(json);
  },

  // Karti BASKA BIR PROJENIN kolonuna tasir. updateTask'in columnId alanindan
  // ayri: hedef proje degisince proje-bazli veri (etiket/ozel alan) dusebilir.
  async moveTaskToProject(
    taskId: string,
    targetColumnId: string,
  ): Promise<{ card: RawCard; droppedLabels: string[]; droppedCustomFields: string[] }> {
    const res = await fetch(`${API_BASE_URL}/cards/${taskId}/move`, {
      method: 'POST',
      headers: getAuthHeaders(),
      body: JSON.stringify({ targetColumnId }),
    });
    if (!res.ok) throw new Error(await readApiError(res, 'Kart taşınamadı.'));
    const json = await res.json();
    return extractData(json);
  },

  // Toplu islem: tek istek, kart basina bagimsiz sonuc. Basarili/basarisiz
  // ayrimi doniyor cunku secimdeki bazi kartlarda yetki yetmeyebilir
  // (orn. uye icin silme) ve kismi basariyi gizlemek yaniltici olur.
  async bulkCardAction(
    projectId: string,
    payload: {
      cardIds: string[];
      action: 'move' | 'assign' | 'label' | 'archive' | 'delete' | 'watch' | 'unwatch';
      columnId?: string;
      assigneeIds?: string[];
      labelId?: string;
      /** Tasima icin kart basina hedef pozisyon; verilmezse sutunun sonuna eklenir */
      positions?: Record<string, number>;
    },
  ): Promise<{ basarili: string[]; basarisiz: { cardId: string; sebep: string }[] }> {
    const res = await fetch(`${API_BASE_URL}/projects/${projectId}/cards/bulk`, {
      method: 'POST',
      headers: getAuthHeaders(),
      body: JSON.stringify(payload),
    });
    if (!res.ok) throw new Error(await readApiError(res, 'Toplu işlem uygulanamadı.'));
    const json = await res.json();
    return json.data;
  },

  async updateColumn(columnId: string, data: {
    name?: string;
    wipLimit?: number | null;
    transitionMode?: ColumnRuleMode;
    requireAssignee?: boolean;
    requireChecklistComplete?: boolean;
    requireDescription?: boolean;
    requireNoOpenBlockers?: boolean;
  }): Promise<void> {
    const res = await fetch(`${API_BASE_URL}/columns/${columnId}`, {
      method: 'PATCH',
      headers: getAuthHeaders(),
      body: JSON.stringify(data),
    });
    if (!res.ok) throw new Error(await readApiError(res, 'Sütun güncellenemedi.'));
  },

  async deleteColumn(columnId: string): Promise<void> {
    const res = await fetch(`${API_BASE_URL}/columns/${columnId}`, {
      method: 'DELETE',
      headers: getAuthHeaders(),
    });
    if (!res.ok) throw new Error(await readApiError(res, 'Sütun silinemedi.'));
  },

  async reorderColumns(orgId: string, projectId: string, columnIds: string[]): Promise<void> {
    const res = await fetch(`${API_BASE_URL}/organizations/${orgId}/projects/${projectId}/columns/reorder`, {
      method: 'PUT',
      headers: getAuthHeaders(),
      body: JSON.stringify({ columnIds }),
    });
    if (!res.ok) {
      const errMsg = await readApiError(res, 'Sütunlar yeniden sıralanamadı.');
      console.error(`[reorderColumns] ${res.status} ${res.statusText}: ${errMsg}`);
      throw new Error(errMsg);
    }
  },

  async createColumn(orgId: string, projectId: string, name: string): Promise<Column> {
    const res = await fetch(`${API_BASE_URL}/organizations/${orgId}/projects/${projectId}/columns`, {
      method: 'POST',
      headers: getAuthHeaders(),
      body: JSON.stringify({ name }),
    });
    if (!res.ok) throw new Error(await readApiError(res, 'Sütun oluşturulamadı.'));
    const json = await res.json();
    const raw = extractData<{ id: string; name: string; wipLimit: number | null; isDone: boolean }>(json);
    return {
      id: raw.id,
      title: raw.name,
      wipLimit: raw.wipLimit,
      isDone: raw.isDone,
      taskIds: [],
      transitionMode: 'OFF',
      requireAssignee: false,
      requireChecklistComplete: false,
      requireDescription: false,
      requireNoOpenBlockers: false,
    };
  },
};
