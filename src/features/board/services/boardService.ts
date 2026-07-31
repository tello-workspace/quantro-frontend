// src/features/board/services/boardService.ts

const API_BASE_URL = process.env.NEXT_PUBLIC_API_URL || 'http://localhost:4000/api';

function getAuthHeaders(): Record<string, string> {
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
  badges?: BadgeInfo[];
}

export type DependencyRelationType = 'BLOCKS' | 'RELATES_TO' | 'DUPLICATES' | 'CLONES';

export interface DependencyCard {
  id: string;
  title: string;
  relationType?: DependencyRelationType;
}

export type Priority = 'LOW' | 'MEDIUM' | 'HIGH' | 'URGENT';

export interface Task {
  id: string;
  title: string;
  description?: string;
  dueDate?: string;
  columnId: string;
  position?: number;
  priority?: Priority;
  storyPoints?: number | null;
  lastActivityAt?: string;
  assignees?: TaskAssignee[];
  labels?: TaskLabel[];
  blockedBy?: DependencyCard[]; // bu karti bloklayan kartlar
  blocking?: DependencyCard[]; // bu kartin blokladigi kartlar
  // Sadece board yuklemesinde gelir (checklist item metinleri degil, sadece
  // sayim) - tam liste TaskModal acilinca checklistApi'den ayrica cekilir.
  checklistTotal?: number;
  checklistDone?: number;
  // undefined = bu Task'i doldururken backend'den hic secilmedi (orn. board
  // liste endpoint'i), null = secildi ama deger yok. Bu ayrim onemli:
  // sprintId'yi kasitsizce null'a cevirip mevcut atamayi silmemek icin
  // updateTask sadece "undefined degil" durumunda bu alani govdeye ekler.
  sprintId?: string | null;
  parentCardId?: string | null;
  parent?: { id: string; title: string } | null;
  subtasks?: { id: string; title: string; done: boolean }[];
  customFieldValues?: { fieldId: string; value: string | null }[];
}

// Backend /cards/:id (GET, PATCH) assignees/labels'i nested CardAssignee[]/
// CardLabel[] olarak dondurur - board endpoint'i ikisini de duz/basitlestirilmis
// dondurur. Task tipini tek tip tutmak icin burada normalize ediyoruz.
export interface RawCard {
  id: string;
  title: string;
  description?: string | null;
  dueDate?: string | null;
  columnId: string;
  position?: number;
  priority?: Priority;
  storyPoints?: number | null;
  lastActivityAt?: string;
  assignees?: { user: { id: string; name: string; badges?: { badge: BadgeInfo }[] } }[];
  labels?: { label: { id: string; name: string; color: string } }[];
  blockedBy?: { blocker: DependencyCard; relationType?: DependencyRelationType }[];
  blocking?: { blocked: DependencyCard; relationType?: DependencyRelationType }[];
  sprintId?: string | null;
  parentCardId?: string | null;
  parent?: { id: string; title: string } | null;
  subtasks?: { id: string; title: string; column?: { isDone: boolean } }[];
  customFieldValues?: { fieldId: string; value: string | null }[];
}

export function normalizeCard(raw: RawCard): Task {
  return {
    id: raw.id,
    title: raw.title,
    description: raw.description ?? undefined,
    dueDate: raw.dueDate ?? undefined,
    columnId: raw.columnId,
    position: raw.position,
    priority: raw.priority,
    storyPoints: raw.storyPoints,
    lastActivityAt: raw.lastActivityAt,
    assignees: raw.assignees?.map((a) => ({
      ...a.user,
      badges: a.user.badges?.map((b) => b.badge) ?? [],
    })) ?? [],
    labels: raw.labels?.map((cl) => cl.label) ?? [],
    blockedBy: raw.blockedBy?.map((d) => ({ ...d.blocker, relationType: d.relationType ?? 'BLOCKS' })) ?? [],
    blocking: raw.blocking?.map((d) => ({ ...d.blocked, relationType: d.relationType ?? 'BLOCKS' })) ?? [],
    sprintId: raw.sprintId,
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

export interface Column {
  id: string;
  title: string;
  wipLimit: number | null;
  isDone: boolean;
  taskIds: string[];
}

export interface BoardData {
  columns: Record<string, Column>;
  tasks: Record<string, Task>;
  myRole?: 'ADMIN' | 'MEMBER';
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

  async createTask(projectId: string, columnId: string, title: string): Promise<Task | null> {
    try {
      const res = await fetch(`${API_BASE_URL}/projects/${projectId}/tasks`, {
        method: 'POST',
        headers: getAuthHeaders(),
        body: JSON.stringify({ columnId, title }),
      });
      if (!res.ok) throw new Error('Kart oluşturulamadı.');
      const json = await res.json();
      return extractData(json);
    } catch {
      return null;
    }
  },

  async moveTask(projectId: string, taskId: string, targetColumnId: string, position: number) {
    const res = await fetch(`${API_BASE_URL}/cards/${taskId}`, {
      method: 'PATCH',
      headers: getAuthHeaders(),
      body: JSON.stringify({ columnId: targetColumnId, position }),
    });
    if (!res.ok) throw new Error('Kart taşınamadı.');
    return await res.json();
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
      columnId: task.columnId,
      // priority eskiden gonderilmiyordu: AI'nin onerdigi (ya da elle
      // secilen) oncelik kaydedilmis gibi gorunup sessizce kayboluyordu
      priority: task.priority,
      storyPoints: task.storyPoints ?? null,
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
    if (task.sprintId !== undefined) body.sprintId = task.sprintId;
    if (task.parentCardId !== undefined) body.parentCardId = task.parentCardId;

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

  async updateColumn(columnId: string, data: { name?: string; wipLimit?: number | null }): Promise<void> {
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
    };
  },
};
