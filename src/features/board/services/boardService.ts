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

export interface DependencyCard {
  id: string;
  title: string;
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
  lastActivityAt?: string;
  assignees?: TaskAssignee[];
  labels?: TaskLabel[];
  blockedBy?: DependencyCard[]; // bu karti bloklayan kartlar
  blocking?: DependencyCard[]; // bu kartin blokladigi kartlar
}

// Backend /cards/:id (GET, PATCH) assignees/labels'i nested CardAssignee[]/
// CardLabel[] olarak dondurur - board endpoint'i ikisini de duz/basitlestirilmis
// dondurur. Task tipini tek tip tutmak icin burada normalize ediyoruz.
interface RawCard {
  id: string;
  title: string;
  description?: string | null;
  dueDate?: string | null;
  columnId: string;
  position?: number;
  priority?: Priority;
  lastActivityAt?: string;
  assignees?: { user: { id: string; name: string; badges?: { badge: BadgeInfo }[] } }[];
  labels?: { label: { id: string; name: string; color: string } }[];
  blockedBy?: { blocker: DependencyCard }[];
  blocking?: { blocked: DependencyCard }[];
}

function normalizeCard(raw: RawCard): Task {
  return {
    id: raw.id,
    title: raw.title,
    description: raw.description ?? undefined,
    dueDate: raw.dueDate ?? undefined,
    columnId: raw.columnId,
    position: raw.position,
    priority: raw.priority,
    lastActivityAt: raw.lastActivityAt,
    assignees: raw.assignees?.map((a) => ({
      ...a.user,
      badges: a.user.badges?.map((b) => b.badge) ?? [],
    })) ?? [],
    labels: raw.labels?.map((cl) => cl.label) ?? [],
    blockedBy: raw.blockedBy?.map((d) => d.blocker) ?? [],
    blocking: raw.blocking?.map((d) => d.blocked) ?? [],
  };
}

export interface Column {
  id: string;
  title: string;
  wipLimit: number | null;
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
    };

    // assigneeIds SADECE atama gercekten degistiyse gonderilir.
    // Backend'de assigneeIds alaninin varligi ADMIN sarti tetikliyor
    // (card.service: "Sadece adminler gorev atamasi yapabilir"), bu yuzden
    // her kaydetmede gondermek uyelerin baslik/aciklama duzenlemesini bile
    // 403'e dusuruyordu.
    if (options.includeAssignees && task.assignees !== undefined) {
      body.assigneeIds = task.assignees.map((a) => a.id);
    }

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

  async createColumn(orgId: string, projectId: string, name: string): Promise<Column> {
    const res = await fetch(`${API_BASE_URL}/organizations/${orgId}/projects/${projectId}/columns`, {
      method: 'POST',
      headers: getAuthHeaders(),
      body: JSON.stringify({ name }),
    });
    if (!res.ok) throw new Error(await readApiError(res, 'Sütun oluşturulamadı.'));
    const json = await res.json();
    const raw = extractData<{ id: string; name: string; wipLimit: number | null }>(json);
    return {
      id: raw.id,
      title: raw.name,
      wipLimit: raw.wipLimit,
      taskIds: [],
    };
  },
};
