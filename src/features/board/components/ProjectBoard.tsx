// src/features/board/components/ProjectBoard.tsx
'use client';

import React, { useState, useEffect, useCallback, useMemo, useRef } from 'react';
import { useDispatch } from 'react-redux';
import { api } from '@/lib/api';
import {
  closestCenter,
  DndContext,
  DragEndEvent,
  DragStartEvent,
  PointerSensor,
  useSensor,
  useSensors,
  DragOverlay,
  closestCorners,
  CollisionDetection,
} from '@dnd-kit/core';
import { BoardColumn } from './BoardColumn';
import { BoardCard, CardConflictInfo } from './BoardCard';
import { BoardFilters } from './BoardFilters';
import { ArchiveModal } from './ArchiveModal';
import { CardMoveModal } from './CardMoveModal';
import { BulkActionBar } from './BulkActionBar';
import { CardContextMenu, type CardContextMenuState } from './CardContextMenu';
import { TimelineView } from '@/features/roadmap/components/TimelineView';
import { CalendarView } from './CalendarView';
import { boardService, calculateFractionalPosition, getAuthHeaders, Task, BoardData, TaskAssignee, Priority } from '../services/boardService';
import { TaskModal } from '@/components/ui/TaskModal';
import { useGetOrganizationByIdQuery } from '@/features/organizations/organizationsApi';
import { useGetLabelsQuery, useAttachLabelMutation } from '@/features/labels/labelsApi';
import { useAddDependencyMutation } from '@/features/dependencies/dependenciesApi';
import { toast } from "sonner";
import { AIChatPanel } from '@/features/ai/AIChatPanel';
import { useCreateChangeRequestMutation } from '@/features/requests/requestsApi';
import { Bot, GripVerticalIcon, LayoutGrid, CalendarDays, Zap, Rocket, Table2, ListPlus, Inbox, Download, SlidersHorizontal, GanttChartSquare, Archive } from 'lucide-react';
import Link from 'next/link';
import { useRouter } from 'next/navigation';
import { useRealtimeBoard } from '@/hooks/useRealtimeNotifications';
import { useGetChangeRequestsQuery } from '@/features/requests/requestsApi';
import { TableView } from './TableView';
import { useGetTemplatesQuery, useCreateCardFromTemplateMutation } from '@/features/templates/templateApi';
import { useTranslation } from '@/hooks/useTranslation';

interface ProjectBoardProps {
  projectId: string;
  orgId: string;
  projectName?: string;
  // Org-genelinde arama sonucundan direkt bu karti acmak icin (bkz. OrgSearchDialog)
  initialOpenCardId?: string;
  // Insan-okunur anahtarla derin baglanti: /projects/x?card=QNT-42
  // Bu, elle yazilabilen/paylasilabilen adres bicimi - cuid'li olan degil.
  initialOpenCardKey?: string;
}

interface CardSocketPayload {
  id: string;
  title: string;
  description?: string | null;
  columnId: string;
  projectId: string;
  assignees?: TaskAssignee[];
  dueDate?: string | null;
  startDate?: string | null;
  position?: number;
}

interface CardMovedPayload {
  cardId: string;
  fromColumnId: string;
  toColumnId: string;
  projectId: string;
}

interface CardDeletedPayload {
  cardId: string;
  projectId: string;
}

interface ColumnSocketPayload {
  id: string;
  name: string;
  projectId: string;
  wipLimit: number | null;
  isDone: boolean;
}

interface ColumnDeletedPayload {
  columnId: string;
  projectId: string;
}

// Pano state'inde tek bir degismez kural var: bir kart id'si TUM sutunlar
// icinde toplam bir kez bulunur. Bu yardimci once id'yi her sutundan
// temizler, sonra hedefe tek kopya olarak yerlestirir.
//
// Onceden her yazan taraf kendi kontrolunu yapiyordu ve handleCardMoved
// karti yalnizca payload.fromColumnId'den siliyordu. Kart yerelde baska bir
// sutundaysa (bayat state) orada kaliyor, hedefe de eklenince ayni kart iki
// yerde birden gorunuyordu; ayni sutuna iki kez girdiginde React "two
// children with the same key" uyarisi veriyordu.
// Socket'ten gelen atanan listesini mevcut veriyle BIRLESTIRIR.
//
// Sebep: yayin gövdesi bir donem avatarUrl'i tasimiyordu ve frontend gelen
// listeyi oldugu gibi yerine koydugu icin, herhangi bir kart guncellemesi
// (baslik duzenleme, durum degisikligi, atama) TUM istemcilerde avatarlari
// bos harfe dusuruyordu. Sunucu tarafi duzeltildi; burasi ayni hatanin
// tekrar sizmasina karsi ikinci savunma: kimlik listesi daima yayindan
// gelir, ama bir alan yayinda yoksa elimizdeki deger korunur.
function mergeAssignees(
  gelen: TaskAssignee[] | undefined,
  mevcut: TaskAssignee[] | undefined,
): TaskAssignee[] | undefined {
  if (!gelen) return mevcut;
  const oncekiler = new Map((mevcut ?? []).map((a) => [a.id, a]));
  return gelen.map((a) => {
    const onceki = oncekiler.get(a.id);
    if (!onceki) return a;
    return {
      ...onceki,
      ...a,
      avatarUrl: a.avatarUrl ?? onceki.avatarUrl,
      badges: a.badges ?? onceki.badges,
    };
  });
}

function placeCard(
  columns: BoardData['columns'],
  cardId: string,
  targetColumnId: string,
  insertAt?: number,
): BoardData['columns'] {
  const next: BoardData['columns'] = {};

  for (const [colId, col] of Object.entries(columns)) {
    const temizlenmis = col.taskIds.filter((id) => id !== cardId);
    next[colId] = temizlenmis.length === col.taskIds.length ? col : { ...col, taskIds: temizlenmis };
  }

  const target = next[targetColumnId];
  if (!target) return next; // hedef sutun yoksa kart hicbir yere yazilmaz

  const taskIds = [...target.taskIds];
  const index = insertAt === undefined ? taskIds.length : Math.max(0, Math.min(insertAt, taskIds.length));
  taskIds.splice(index, 0, cardId);
  next[targetColumnId] = { ...target, taskIds };

  return next;
}

// Silme geri alma (undo) penceresi: kart(lar) hemen panodan kaldirilir ama
// gercek DELETE istegi bu sure dolana kadar gonderilmez - kullanici "Geri Al"
// derse hic sunucuya gitmez. Trello/Gmail'deki ayni davranis: yanlislikla
// silmenin bedeli confirm dialogundan sonra bile hala var, gercek bir geri
// donus yolu gerekiyordu.
const UNDO_MS = 10000;

// Bir kartin id'sini tum sutunlardan cikarir (silme ve kolon silme yollari icin)
function removeCard(columns: BoardData['columns'], cardId: string): BoardData['columns'] {
  const next: BoardData['columns'] = {};
  for (const [colId, col] of Object.entries(columns)) {
    const temizlenmis = col.taskIds.filter((id) => id !== cardId);
    next[colId] = temizlenmis.length === col.taskIds.length ? col : { ...col, taskIds: temizlenmis };
  }
  return next;
}

export const ProjectBoard: React.FC<ProjectBoardProps> = ({ projectId, orgId, projectName, initialOpenCardId, initialOpenCardKey }) => {
  const { t, lang } = useTranslation();
  const dispatch = useDispatch();
  const [boardData, setBoardData] = useState<BoardData | null>(null);
  const [loading, setLoading] = useState<boolean>(true);
  // Excel uretimi 500 kartlik bir panoda birkac saniye surebiliyor - buton
  // geri bildirim vermezse kullanici tekrar tekrar tikliyor.
  const [isExporting, setIsExporting] = useState<boolean>(false);
  const [isArchiveModalOpen, setIsArchiveModalOpen] = useState<boolean>(false);
  const [activeId, setActiveId] = useState<string | null>(null);
  // Git Cakisma Erken Uyari: kartId -> "hangi dosyada, kim, hangi diger kart" bilgisi
  const [conflicts, setConflicts] = useState<Record<string, CardConflictInfo>>({});
  // Tekli silme geri-alma zamanlayicilari - kartId -> setTimeout handle'i.
  // Ref: her render'da sifirlanmamali, "Geri Al" tiklandiginda iptal edilecek.
  const pendingDeleteTimers = useRef<Map<string, ReturnType<typeof setTimeout>>>(new Map());

  // Real-time board updates
  const realtimeBoard = useRealtimeBoard(projectId);

  // Kart ekleme sadece ADMIN'e acik; suruklemeyi (kart tasima) herkes yapabilir.
  // Yetki TEK kaynaktan (org uyeligi) alinir; boardData.myRole'a guvenmez.
  // Tek kaynak olmasi kritik: board verisi gecikmeli/onbellegi olabilirken
  // org uyeligi her istekte guvenilirdir - iki kaynagi OR'lamak tutarsiz
  // durumda (biri cached digeri degil) yanlis yetki verebilir.
  const { data: org } = useGetOrganizationByIdQuery({ orgId }, { skip: !orgId });
  const isAdmin = org?.myRole === 'ADMIN';
  // Uye de kart ekleme formunu gorur; farki gonderdigi seyin talep olmasi
  const canAddTask = true;
  const [createChangeRequest] = useCreateChangeRequestMutation();
  const [attachLabel] = useAttachLabelMutation();
  const [addDependency] = useAddDependencyMutation();
  const members = org?.members ?? [];

  const { data: labels = [], refetch: refetchLabels } = useGetLabelsQuery({ orgId, projectId }, { skip: !orgId || !projectId });
  const { data: templates = [] } = useGetTemplatesQuery({ orgId, projectId }, { skip: !orgId || !projectId });
  const [createCardFromTemplate] = useCreateCardFromTemplateMutation();


  const [viewMode, setViewMode] = useState<'board' | 'calendar' | 'table' | 'timeline'>('board');
  // Swimlane: kartlari yatay seritlere ayirir. 'none' klasik tek satir pano.
  const [groupBy, setGroupBy] = useState<'none' | 'assignee' | 'priority' | 'epic'>('none');
  // Yonetim sayfasina giden butonda gosterilecek bekleyen triage sayisi
  const { data: changeRequests = [] } = useGetChangeRequestsQuery({ orgId }, { skip: !orgId || !isAdmin });
  const triagePendingCount = changeRequests.filter(
    (r) => r.status === 'PENDING' && r.type === 'CARD_CREATE' && r.projectId === projectId,
  ).length;
  const [isModalOpen, setIsModalOpen] = useState(false);
  const router = useRouter();
  const [selectedTaskId, setSelectedTaskId] = useState<string | null>(null);
  // Toplu islem secimi. Set kullaniliyor: secim kart basina sorgulaniyor
  // (her BoardCard render'inda) ve dizide arama kart sayisiyla buyurdu.
  const [selectedCardIds, setSelectedCardIds] = useState<Set<string>>(new Set());
  const [isBulkRunning, setIsBulkRunning] = useState(false);
  const [createRequestColumnId, setCreateRequestColumnId] = useState<string | null>(null);
  const [initialTitle, setInitialTitle] = useState('');
  // Takvimden boş güne tıklanınca yeni kartın önceden dolu geleceği tarih
  const [initialDueDate, setInitialDueDate] = useState('');

  const [search, setSearch] = useState('');
  const [isDesktopChatOpen, setIsDesktopChatOpen] = useState(false);
  const [isAddingColumn, setIsAddingColumn] = useState(false);
  const [newColumnName, setNewColumnName] = useState('');
  const [isCreatingColumn, setIsCreatingColumn] = useState(false);
  const [selectedPriorities, setSelectedPriorities] = useState<Set<Priority>>(new Set());
  const [selectedAssigneeIds, setSelectedAssigneeIds] = useState<Set<string>>(new Set());
  const [selectedLabelIds, setSelectedLabelIds] = useState<Set<string>>(new Set());

  const togglePriority = (p: Priority) => {
    setSelectedPriorities((prev) => {
      const next = new Set(prev);
      if (next.has(p)) next.delete(p);
      else next.add(p);
      return next;
    });
  };
  const toggleAssignee = (userId: string) => {
    setSelectedAssigneeIds((prev) => {
      const next = new Set(prev);
      if (next.has(userId)) next.delete(userId);
      else next.add(userId);
      return next;
    });
  };
  const toggleLabel = (labelId: string) => {
    setSelectedLabelIds((prev) => {
      const next = new Set(prev);
      if (next.has(labelId)) next.delete(labelId);
      else next.add(labelId);
      return next;
    });
  };

  const hasActiveFilters =
    search.trim().length > 0 ||
    selectedPriorities.size > 0 ||
    selectedAssigneeIds.size > 0 ||
    selectedLabelIds.size > 0;

  // Swimlane seritleri. Her serit bir anahtar + baslik + kartin o seride
  // olup olmadigini soyleyen bir yuklem. Kart birden fazla kisiye atanmis
  // olabilir; o durumda her atananin seridinde gorunur (Jira da boyle yapar)
  // - tek bir seride zorlamak "bu kart bende degil" izlenimi verirdi.
  const lanes = useMemo(() => {
    if (!boardData || groupBy === 'none') return null;

    if (groupBy === 'priority') {
      const sira: Priority[] = ['URGENT', 'HIGH', 'MEDIUM', 'LOW'];
      const etiket: Record<Priority, string> = {
        URGENT: 'Acil', HIGH: 'Yüksek', MEDIUM: 'Orta', LOW: 'Düşük',
      };
      return sira.map((p) => ({
        key: p,
        label: etiket[p],
        icerir: (task: Task) => (task.priority ?? 'MEDIUM') === p,
      }));
    }

    if (groupBy === 'assignee') {
      const seritler = members.map((m) => ({
        key: m.userId,
        label: m.user.name,
        icerir: (task: Task) => (task.assignees ?? []).some((a) => a.id === m.userId),
      }));
      return [
        ...seritler,
        { key: '__atanmamis__', label: 'Atanmamış', icerir: (task: Task) => (task.assignees ?? []).length === 0 },
      ];
    }

    // epic: ust karti olanlar o kartin basligi altinda toplanir
    const epicler = new Map<string, string>();
    for (const task of Object.values(boardData.tasks)) {
      if (task.parentCardId) {
        const ust = boardData.tasks[task.parentCardId];
        epicler.set(task.parentCardId, ust?.title ?? 'Üst kart');
      }
    }
    return [
      ...[...epicler].map(([id, baslik]) => ({
        key: id,
        label: baslik,
        icerir: (task: Task) => task.parentCardId === id,
      })),
      { key: '__bagimsiz__', label: 'Bağımsız', icerir: (task: Task) => !task.parentCardId },
    ];
  }, [boardData, groupBy, members]);

  const matchesFilters = (task: Task): boolean => {
    if (search.trim() && !task.title.toLowerCase().includes(search.trim().toLowerCase())) {
      return false;
    }
    if (selectedPriorities.size > 0 && (!task.priority || !selectedPriorities.has(task.priority))) {
      return false;
    }
    if (
      selectedAssigneeIds.size > 0 &&
      !(task.assignees ?? []).some((a) => selectedAssigneeIds.has(a.id))
    ) {
      return false;
    }
    if (
      selectedLabelIds.size > 0 &&
      !(task.labels ?? []).some((l) => selectedLabelIds.has(l.id))
    ) {
      return false;
    }
    return true;
  };

  const sensor = useSensor(PointerSensor, {
    activationConstraint: { distance: 5 },
  });

  // Kolon suruklemesi mi yoksa kart suruklemesi mi?
  const isColumnGrip = (id: string) => typeof id === 'string' && id.startsWith('col-grip-');
  const gripToColumnId = (gripId: string) => gripId.replace('col-grip-', '');

  // collision detection: kolon tasiniyorsa sadece col-drop hedeflerine bak,
  // kart tasiniyorsa normal closestCenter calissin.
  const collisionDetectionFn: CollisionDetection = useCallback((args) => {
    const { active, droppableContainers } = args;
    if (isColumnGrip(active.id as string)) {
      const filtered = droppableContainers.filter((c) =>
        String(c.id).startsWith('col-drop-')
      );
      return closestCorners({ ...args, droppableContainers: filtered });
    }
    return closestCenter(args);
  }, []);

  const sensors = useSensors(sensor);

  useEffect(() => {
    boardService.getBoardData(projectId)
      .then((data) => setBoardData(data))
      .catch((err) => console.error(err))
      .finally(() => setLoading(false));
  }, [projectId]);

  // Org-genelinde aramadan gelen deep-link: pano yuklenince o karti direkt ac.
  // Bagimliliklarda boardData var ve boardData HER kart isleminde (silme,
  // tasima, socket olayi) yeniden olusuyor. Guard olmadan bu efekt her
  // mutasyondan sonra tekrar calisip modali yeniden aciyordu: kart silindiyse
  // artik var olmayan bir id ile acilip "Görev yüklenemedi veya bulunamadı"
  // hatasi veriyordu - hem silme sonrasinda hem de sonraki her surukle-birak
  // sonrasinda. Deep-link kart basina yalnizca bir kez onurlandiriliyor.
  const acilanDeepLinkRef = useRef<string | null>(null);
  useEffect(() => {
    if (!boardData) return;

    // Iki derin baglanti bicimi var:
    //   ?openCard=<cuid>  - arama/bildirim gibi ic baglantilar uretir
    //   ?card=QNT-42      - insan yazar/paylasir (kart anahtari)
    // Anahtar panoda zaten yuklu veriden cozuluyor; ek bir istek atmiyoruz.
    let hedefId = initialOpenCardId ?? null;
    let anahtardanMi = false;

    if (!hedefId && initialOpenCardKey && boardData.projectKey) {
      const parcali = /^([A-Za-z][A-Za-z0-9]{1,4})-(\d+)$/.exec(initialOpenCardKey.trim());
      const onek = parcali?.[1]?.toUpperCase();
      const numara = parcali ? Number(parcali[2]) : NaN;
      if (onek === boardData.projectKey.toUpperCase() && Number.isFinite(numara)) {
        hedefId = Object.values(boardData.tasks).find((task) => task.number === numara)?.id ?? null;
      }
      anahtardanMi = true;
    }

    const izlenen = hedefId ?? (anahtardanMi ? `key:${initialOpenCardKey}` : null);
    if (!izlenen) return;
    if (acilanDeepLinkRef.current === izlenen) return;
    acilanDeepLinkRef.current = izlenen;

    if (hedefId) {
      setSelectedTaskId(hedefId);
      setIsModalOpen(true);
    } else {
      // Anahtar bu panoda bulunamadi: kart arsivlenmis, silinmis veya yanlis
      // proje. Sessizce yutmak yerine soyluyoruz - kullanici elle yazdigi
      // adresin neden bir sey acmadigini bilmeli.
      toast.error(t('cardKeyNotFound').replace('{key}', initialOpenCardKey ?? ''));
    }

    // Tuketilen parametreler URL'den siliniyor: kalirsa sayfa yenilendiginde
    // (kart bu arada silinmis olabilir) ayni hataya dusuluyor ve adres cubugu
    // artik dogru olmayan bir durumu gosteriyor.
    const kalanParams = new URLSearchParams(window.location.search);
    kalanParams.delete('openCard');
    kalanParams.delete('card');
    const sorgu = kalanParams.toString();
    router.replace(`/projects/${projectId}${sorgu ? `?${sorgu}` : ''}`, { scroll: false });
  }, [initialOpenCardId, initialOpenCardKey, boardData, projectId, router, t]);

  // Board'u ayni anda acmis diger kullanicilarin kart/kolon islemlerini anlik yansit.
  // Kendi eylemlerimiz zaten optimistic olarak uygulandigi icin handler'lar idempotent:
  // veri zaten mevcutsa (id/taskId eslesiyorsa) tekrar uygulanmaz.
  useEffect(() => {
    if (!boardData) return;

    const unsubscribeCardCreated = realtimeBoard.onCardCreated((payload) => {
      setBoardData((prev) => {
        if (!prev) return prev;
        const column = prev.columns[payload.columnId];
        if (!column) return prev;
        const existing = prev.tasks[payload.id];
        return {
          ...prev,
          tasks: {
            ...prev.tasks,
            [payload.id]: {
              ...existing,
              id: payload.id,
              title: payload.title,
              description: payload.description ?? undefined,
              dueDate: payload.dueDate ?? undefined,
              columnId: payload.columnId,
              position: payload.position,
              assignees: mergeAssignees(payload.assignees, existing?.assignees) ?? [],
              labels: existing?.labels ?? [],
            },
          },
          columns: placeCard(prev.columns, payload.id, payload.columnId),
        };
      });
    });

    const unsubscribeCardUpdated = realtimeBoard.onCardUpdated((payload) => {
      setBoardData((prev) => {
        const existing = prev?.tasks[payload.id];
        if (!prev || !existing) return prev;

        const targetColumnId = payload.columnId ?? existing.columnId;
        const needsMove =
          !!prev.columns[targetColumnId] &&
          !prev.columns[targetColumnId].taskIds.includes(payload.id);

        return {
          ...prev,
          tasks: {
            ...prev.tasks,
            [payload.id]: {
              ...existing,
              title: payload.title,
              description: payload.description ?? undefined,
              dueDate: payload.dueDate ?? undefined,
              startDate: payload.startDate ?? undefined,
              columnId: targetColumnId,
              assignees: mergeAssignees(payload.assignees, existing.assignees),
            },
          },
          columns: needsMove ? placeCard(prev.columns, payload.id, targetColumnId) : prev.columns,
        };
      });
    });

    const unsubscribeCardMoved = realtimeBoard.onCardMoved((payload) => {
      setBoardData((prev) => {
        if (!prev) return prev;
        if (!prev.columns[payload.toColumnId]) return prev;

        const existingTask = prev.tasks[payload.cardId];
        const alreadyInTarget = prev.columns[payload.toColumnId].taskIds.includes(payload.cardId);
        const duplicated =
          Object.values(prev.columns).filter((c) => c.taskIds.includes(payload.cardId)).length > 1;

        if (alreadyInTarget && !duplicated) return prev;

        return {
          ...prev,
          tasks: existingTask
            ? { ...prev.tasks, [payload.cardId]: { ...existingTask, columnId: payload.toColumnId } }
            : prev.tasks,
          columns: placeCard(prev.columns, payload.cardId, payload.toColumnId),
        };
      });
    });

    const unsubscribeCardDeleted = realtimeBoard.onCardDeleted((cardId) => {
      if (orgId && projectId) {
        refetchLabels();
      }
      setBoardData((prev) => {
        if (!prev || !prev.tasks[cardId]) return prev;
        const newTasks = { ...prev.tasks };
        delete newTasks[cardId];
        return { ...prev, tasks: newTasks, columns: removeCard(prev.columns, cardId) };
      });
      // Diger kullanicilar da RTK cache'lerini (roadmap/insight) guncellesin.
      // Board state'i yukarida socket ile guncelleniyor ama timeline gibi RTK
      // tabanli gorunumler bu olmadan bayat karta takili kalirdi.
      dispatch(api.util.invalidateTags(['Card', 'Insight']));
    });

    const unsubscribeColumnCreated = realtimeBoard.onColumnCreated((payload) => {
      setBoardData((prev) => {
        if (!prev || prev.columns[payload.id]) return prev;
        return {
          ...prev,
          columns: {
            ...prev.columns,
            [payload.id]: { id: payload.id, title: payload.name, wipLimit: payload.wipLimit ?? null, isDone: payload.isDone, taskIds: [] },
          },
        };
      });
    });

    const unsubscribeColumnUpdated = realtimeBoard.onColumnUpdated((payload) => {
      setBoardData((prev) => {
        const existing = prev?.columns[payload.id];
        if (!prev || !existing) return prev;
        return {
          ...prev,
          columns: {
            ...prev.columns,
            [payload.id]: { ...existing, title: payload.name, wipLimit: payload.wipLimit ?? null },
          },
        };
      });
    });

    const unsubscribeColumnDeleted = realtimeBoard.onColumnDeleted((payload) => {
      setBoardData((prev) => {
        if (!prev || !prev.columns[payload.columnId]) return prev;
        const newColumns = { ...prev.columns };
        delete newColumns[payload.columnId];
        return { ...prev, columns: newColumns };
      });
    });

    // Git Cakisma Erken Uyari: iki kartin da rozeti olsun diye her iki tarafi
    // da isliyoruz. Kesinlik degil, dosya-seviyesi bir risk sinyali.
    const unsubscribeConflictDetected = realtimeBoard.onConflictDetected((payload) => {
      setConflicts((prev) => ({
        ...prev,
        [payload.cardA.id]: {
          filePath: payload.filePath,
          otherCardTitle: payload.cardB.title,
          otherUserName: payload.userB.name,
        },
        [payload.cardB.id]: {
          filePath: payload.filePath,
          otherCardTitle: payload.cardA.title,
          otherUserName: payload.userA.name,
        },
      }));
    });

    // Taraflardan biri dosyadan ayrilinca uyari dusmeli. Ayni kartin BASKA bir
    // dosyadaki aktif uyarisini silmemek icin filePath eslesmesi araniyor.
    const unsubscribeConflictResolved = realtimeBoard.onConflictResolved((payload) => {
      setConflicts((prev) => {
        const next = { ...prev };
        let degisti = false;
        for (const cardId of payload.cardIds) {
          if (next[cardId]?.filePath === payload.filePath) {
            delete next[cardId];
            degisti = true;
          }
        }
        return degisti ? next : prev;
      });
    });

    return () => {
      unsubscribeCardCreated();
      unsubscribeCardUpdated();
      unsubscribeCardMoved();
      unsubscribeCardDeleted();
      unsubscribeColumnCreated();
      unsubscribeColumnUpdated();
      unsubscribeColumnDeleted();
      unsubscribeConflictDetected();
      unsubscribeConflictResolved();
    };
  }, [boardData, realtimeBoard, orgId, projectId, refetchLabels]);

  const handleDragStart = (event: DragStartEvent) => {
    setActiveId(event.active.id as string);
  };

  const handleDragEnd = async (event: DragEndEvent) => {
    const { active, over } = event;
    setActiveId(null);

    if (!over || !boardData) return;

    const activeIdStr = active.id as string;
    // Swimlane modunda sutunlarin droppable id'si "<columnId>::lane::<key>"
    // seklinde benzersizlestiriliyor (ayni sutun her seritte bir kez ciziliyor).
    // Buradan gercek sutun id'sini geri cikariyoruz; kart id'leri zaten
    // benzersiz oldugu icin kart uzerine birakma etkilenmiyor.
    const rawOverId = over.id as string;
    const overId = rawOverId.includes('::lane::') ? rawOverId.split('::lane::')[0] : rawOverId;
    if (activeIdStr === overId) return;

    // --- KOLON SÜRÜKLEME ---
    if (isColumnGrip(activeIdStr)) {
      const draggedColId = gripToColumnId(activeIdStr);
      // over bir kolon mu yoksa kolon drop zone'u mu?
      const overColId = overId.startsWith('col-drop-') ? overId.replace('col-drop-', '') : boardData.columns[overId] ? overId : null;
      if (!overColId || draggedColId === overColId) return;

      const colOrder = Object.keys(boardData.columns);
      const oldIndex = colOrder.indexOf(draggedColId);
      const newIndex = colOrder.indexOf(overColId);
      if (oldIndex === -1 || newIndex === -1) return;

      // Sıralamayı optimistic güncelle
      const newOrder = [...colOrder];
      newOrder.splice(oldIndex, 1);
      newOrder.splice(newIndex, 0, draggedColId);

      const reorderedColumns: BoardData['columns'] = {};
      newOrder.forEach((cid, idx) => {
        reorderedColumns[cid] = { ...boardData.columns[cid] };
      });

      const prevData = boardData;
      setBoardData((prev) => {
        if (!prev) return prev;
        const rebuilt: BoardData['columns'] = {};
        newOrder.forEach((cid) => {
          if (prev.columns[cid]) rebuilt[cid] = { ...prev.columns[cid] };
        });
        return { ...prev, columns: rebuilt };
      });

      try {
        await boardService.reorderColumns(orgId, projectId, newOrder);
      } catch (error) {
        console.error("Sütun sıralaması güncellenemedi, geri alınıyor:", error);
        setBoardData(prevData);
      }
      return;
    }

    // --- KART SÜRÜKLEME ---
    const activeTaskId = activeIdStr;
    if (!boardData.tasks[activeTaskId]) return;

    const sourceColumn = Object.values(boardData.columns).find((col) =>
      col.taskIds.includes(activeTaskId)
    );
    if (!sourceColumn) return;

    // over bir sütunun kendisi mi (boş alana bırakma) yoksa bir kart mı?
    const overIsColumn = !!boardData.columns[overId];
    const destinationColumn = overIsColumn
      ? boardData.columns[overId]
      : Object.values(boardData.columns).find((col) => col.taskIds.includes(overId));
    if (!destinationColumn) return;

    const isColumnChange = sourceColumn.id !== destinationColumn.id;

    // Suruklenen kart secimin parcasiysa TUM secim birlikte tasinir. Ayri bir
    // "Tasi" menusu yerine bu: kullanici zaten karti tutup birakiyor, ayni
    // hareketin secimin tamamina uygulanmasi beklenen davranis.
    // Yalnizca sutun degisiminde: ayni sutun icinde coklu yeniden siralama
    // kullanicinin ne beklediginin belirsiz oldugu bir durum.
    const cokluTasima =
      isColumnChange && effectiveSelectedIds.has(activeTaskId) && effectiveSelectedIds.size > 1;

    // Suruklenen kart basta, digerleri mevcut sirasini koruyarak arkasindan.
    const tasinacakIds = cokluTasima
      ? [
          activeTaskId,
          ...[...effectiveSelectedIds]
            .filter((id) => id !== activeTaskId && boardData.tasks[id])
            .sort((a, b) => (boardData.tasks[a].position ?? 0) - (boardData.tasks[b].position ?? 0)),
        ]
      : [activeTaskId];

    // WIP kontrolu tasinan kart sayisini hesaba katiyor: tek kart icin
    // "doluysa engelle", N kart icin "N tanesi sigmiyorsa engelle".
    const hedefeGirecekSayi = tasinacakIds.filter(
      (id) => !destinationColumn.taskIds.includes(id),
    ).length;

    if (
      isColumnChange &&
      destinationColumn.wipLimit &&
      destinationColumn.taskIds.length + hedefeGirecekSayi > destinationColumn.wipLimit
    ) {
      toast.warning(`Bu sütun için WIP limiti (${destinationColumn.wipLimit}) doludur!`);
      return;
    }

    // Kaynak sütundan çıkar; aynı sütun içi taşımada bu liste hedef listenin de tabanıdır
    const sourceTaskIds = sourceColumn.taskIds.filter((id) => id !== activeTaskId);
    const baseDestTaskIds = isColumnChange ? destinationColumn.taskIds : sourceTaskIds;

    const overIndex = overIsColumn ? baseDestTaskIds.length : baseDestTaskIds.indexOf(overId);
    const insertAt = overIndex === -1 ? baseDestTaskIds.length : overIndex;
    const destTaskIds = [...baseDestTaskIds];
    destTaskIds.splice(insertAt, 0, activeTaskId);

    // Komşu kartların position'larından fraksiyonel yeni position hesapla
    const newIndex = destTaskIds.indexOf(activeTaskId);
    const prevPos = newIndex > 0 ? boardData.tasks[destTaskIds[newIndex - 1]]?.position : undefined;
    const nextPos =
      newIndex < destTaskIds.length - 1 ? boardData.tasks[destTaskIds[newIndex + 1]]?.position : undefined;

    const newPosition = calculateFractionalPosition(prevPos, nextPos);

    const previousBoardData = boardData;

    if (cokluTasima) {
      // prevPos ile nextPos arasina N kart icin esit araliklı yuva aciyoruz;
      // tek kartlik calculateFractionalPosition bir orta nokta veriyor,
      // burada N tanesi gerekiyor ve aralarindaki sira korunmali.
      const pozisyonlar: Record<string, number> = {};
      const n = tasinacakIds.length;
      if (nextPos !== undefined && prevPos !== undefined) {
        const adim = (nextPos - prevPos) / (n + 1);
        tasinacakIds.forEach((id, i) => { pozisyonlar[id] = prevPos + adim * (i + 1); });
      } else if (prevPos !== undefined) {
        tasinacakIds.forEach((id, i) => { pozisyonlar[id] = prevPos + i + 1; });
      } else if (nextPos !== undefined) {
        const adim = nextPos / (n + 1);
        tasinacakIds.forEach((id, i) => { pozisyonlar[id] = adim * (i + 1); });
      } else {
        tasinacakIds.forEach((id, i) => { pozisyonlar[id] = i + 1; });
      }

      setBoardData((prev) => {
        if (!prev) return prev;
        const guncelHedef = prev.columns[destinationColumn.id];
        if (!guncelHedef) return prev;

        const hedefListe = guncelHedef.taskIds.filter((id) => !tasinacakIds.includes(id));
        const overIdx = overIsColumn ? hedefListe.length : hedefListe.indexOf(overId);
        const baslangic = overIdx === -1 ? hedefListe.length : overIdx;

        // Kartlari tek tek yerlestiriyoruz: placeCard her cagrida id'yi tum
        // sutunlardan temizleyip hedefe koydugu icin tekrar riski yok.
        let kolonlar = prev.columns;
        tasinacakIds.forEach((id, i) => {
          kolonlar = placeCard(kolonlar, id, destinationColumn.id, baslangic + i);
        });

        const gorevler = { ...prev.tasks };
        for (const id of tasinacakIds) {
          if (gorevler[id]) {
            gorevler[id] = { ...gorevler[id], columnId: destinationColumn.id, position: pozisyonlar[id] };
          }
        }

        return { ...prev, tasks: gorevler, columns: kolonlar };
      });

      try {
        const sonuc = await boardService.bulkCardAction(projectId, {
          cardIds: tasinacakIds,
          action: 'move',
          columnId: destinationColumn.id,
          positions: pozisyonlar,
        });

        if (sonuc.basarisiz.length > 0) {
          toast.error(`${sonuc.basarisiz.length} kart taşınamadı: ${sonuc.basarisiz[0].sebep}`);
          const taze = await boardService.getBoardData(projectId);
          if (taze) setBoardData(taze);
        } else {
          toast.success(`${sonuc.basarili.length} kart taşındı`);
        }
        clearSelection();
      } catch (error) {
        console.error('Toplu taşımada hata, değişiklik geri alınıyor:', error);
        setBoardData(previousBoardData);
        toast.error(error instanceof Error ? error.message : 'Kartlar taşınamadı.');
      }
      return;
    }

    setBoardData((prev) => {
      if (!prev) return prev;
      const existingTask = prev.tasks[activeTaskId];

      // Hedef indeksi guncel state uzerinden yeniden hesapliyoruz. Onceden
      // sutun nesneleri kapanistaki (bayat) boardData'dan spread ediliyordu;
      // surukleme sirasinda socket'ten bir degisiklik gelirse o degisiklik
      // eziliyor ya da kart iki sutunda birden gorunuyordu.
      const guncelHedef = prev.columns[destinationColumn.id];
      if (!guncelHedef) return prev;

      const hedefListe = guncelHedef.taskIds.filter((id) => id !== activeTaskId);
      const overIdx = overIsColumn ? hedefListe.length : hedefListe.indexOf(overId);
      const yerlestirilecekIndex = overIdx === -1 ? hedefListe.length : overIdx;

      return {
        ...prev,
        tasks: existingTask
          ? {
              ...prev.tasks,
              [activeTaskId]: { ...existingTask, columnId: destinationColumn.id, position: newPosition },
            }
          : prev.tasks,
        columns: placeCard(prev.columns, activeTaskId, destinationColumn.id, yerlestirilecekIndex),
      };
    });

    try {
      await boardService.moveTask(projectId, activeTaskId, destinationColumn.id, newPosition);
    } catch (error) {
      console.error("Kart taşınırken veritabanı hatası, değişiklik geri alınıyor:", error);
      setBoardData(previousBoardData);
    }
  };

  const handleAddTask = async (columnId: string, title: string) => {
    if (!isAdmin) {
      try {
        await createChangeRequest({
          orgId,
          body: {
            type: 'CARD_CREATE',
            targetColumnId: columnId,
            payload: {
              title,
              description: null,
              priority: 'MEDIUM',
              dueDate: null,
              assigneeIds: [],
            },
          },
        }).unwrap();
        toast.success('Kart ekleme talebi başarıyla oluşturuldu ve admin onayına gönderildi.');
      } catch (err) {
        const mesaj = (err as { data?: { error?: { message?: string } } })?.data?.error?.message;
        toast.error(mesaj || 'Talep oluşturulamadı.');
      }
      return;
    }

    // Direkt kart oluştur — Trello'daki gibi anında ekle
    try {
      const newTask = await boardService.createTask(projectId, columnId, title);
      if (!newTask) {
        toast.error('Kart oluşturulamadı.');
        return;
      }

      setBoardData((prev) => {
        if (!prev) return prev;
        const col = prev.columns[columnId];
        if (!col) return prev;
        return {
          ...prev,
          tasks: {
            ...prev.tasks,
            [newTask.id]: {
              id: newTask.id,
              title,
              columnId,
              assignees: [],
              labels: [],
              blockedBy: [],
              blocking: [],
            },
          },
          columns: placeCard(prev.columns, newTask.id, columnId),
        };
      });
    } catch (error) {
      console.error('Kart oluşturma hatası:', error);
      toast.error('Kart oluşturulamadı.');
    }
  };

  // Sablondan olusturulan kart CARD_CREATED socket event'ini de tetikliyor
  // (template.service.ts icinde cardService.createCard cagriliyor) - o event
  // zaten yukarida "onCardCreated" ile boardData'ya ekleniyor, burada ayrica
  // local state guncellemeye gerek yok.
  const handleCreateFromTemplate = async (templateId: string, columnId: string) => {
    try {
      await createCardFromTemplate({ templateId, columnId }).unwrap();
      toast.success('Kart şablondan oluşturuldu.');
    } catch (err: unknown) {
      const errData = (err as { data?: { error?: { message?: string } } })?.data?.error;
      toast.error(errData?.message || 'Şablondan kart oluşturulamadı.');
    }
  };

  const handleCreateTask = async (
    columnId: string,
    payload: {
      title: string;
      description?: string | null;
      priority?: Priority;
      dueDate?: string | null;
      assigneeIds?: string[];
      labelIds?: string[];
      blockerIds?: string[];
    }
  ) => {
    try {
      // Takvimden gelen dueDate (boş güne tıklama) daha oluşturma anında
      // gönderilir — kart o günde görünür, ayrı update gerekmez.
      const newTask = await boardService.createTask(projectId, columnId, payload.title, {
        dueDate: payload.dueDate ?? undefined,
      });
      if (!newTask) return;

      const updatedFields: Task = {
        id: newTask.id,
        columnId,
        title: payload.title,
        description: payload.description ?? undefined,
        priority: payload.priority ?? 'MEDIUM',
        dueDate: payload.dueDate ?? undefined,
        // avatarUrl da tasiniyor: yalnizca {id, name} yazmak yeni olusturulan
        // kartin avatarini bos harfe dusuruyordu.
        assignees: payload.assigneeIds?.map((id) => {
          const m = members.find((mem) => mem.userId === id);
          return {
            id,
            name: m?.user.name || 'Bilinmeyen',
            avatarUrl: m?.user.avatarUrl ?? null,
          };
        }) ?? [],
        labels: [],
        blockedBy: [],
        blocking: [],
      };

      await boardService.updateTask(projectId, updatedFields, { includeAssignees: true });

      if (payload.labelIds && payload.labelIds.length > 0) {
        const selectedLabels = labels.filter((label) => payload.labelIds?.includes(label.id));
        for (const label of selectedLabels) {
          await attachLabel({ cardId: newTask.id, labelId: label.id }).unwrap().catch(console.error);
        }
      }

      if (payload.blockerIds && payload.blockerIds.length > 0) {
        for (const blockerId of payload.blockerIds) {
          await addDependency({ cardId: newTask.id, blockerId }).unwrap().catch(console.error);
        }
      }

      toast.success('Kart başarıyla oluşturuldu.');
    } catch (err) {
      console.error(err);
      toast.error('Kart oluşturulamadı.');
    }
  };

  const handleTaskClick = (taskId: string) => {
    setSelectedTaskId(taskId);
    setIsModalOpen(true);
  };

  // Takvimde boş bir güne tıklanınca o tarih önceden dolu "yeni kart" formunu
  // açar. Hedef kolon ilk kolon; kullanıcı TaskModal'da değiştirebilir.
  const handleDayClick = (date: string) => {
    const firstColumn = Object.values(boardData?.columns ?? {})[0];
    if (!firstColumn) return;
    setCreateRequestColumnId(firstColumn.id);
    setInitialTitle('');
    setInitialDueDate(date);
    setSelectedTaskId('new');
    setIsModalOpen(true);
  };

  const handleUpdateTask = async (updatedTask: Task) => {
    try {
      // Atama listesi degismediyse assigneeIds hic gonderilmez: backend'de bu
      // alanin varligi ADMIN sarti tetikliyor, aksi halde uyeler kartin
      // basligini/aciklamasini bile degistiremiyordu.
      const previous = boardData?.tasks[updatedTask.id];
      const oncekiIdler = (previous?.assignees ?? []).map((a) => a.id);
      const yeniIdler = (updatedTask.assignees ?? []).map((a) => a.id);
      const atamaDegisti =
        oncekiIdler.length !== yeniIdler.length ||
        yeniIdler.some((id) => !oncekiIdler.includes(id));

      await boardService.updateTask(projectId, updatedTask, {
        includeAssignees: atamaDegisti,
      });
      setBoardData((prev) => {
        if (!prev) return prev;
        return {
          ...prev,
          tasks: {
            ...prev.tasks,
            [updatedTask.id]: updatedTask,
          },
        };
      });
    } catch (error) {
      console.error("Görev güncellenirken hata:", error);
      // Sessizce yutmak yerine sebebi kullaniciya soyle
      toast.error(error instanceof Error ? error.message : 'Görev güncellenemedi.');
    }
  };

  // Takvimde bir karti baska bir gune surukleyince cagrilir. Panonun kendi
  // surukleme mantigiyla ayni desen: once optimistik guncelle (surukleme
  // aninda kartin yeni gunde gorunmesi gecikmesin), API basarisiz olursa
  // geri al. columnId/position'a dokunulmaz, sadece dueDate degisir.
  const handleRescheduleTask = async (taskId: string, newDueDate: string) => {
    const previousTask = boardData?.tasks[taskId];
    if (!previousTask) return;

    const previousBoardData = boardData;
    setBoardData((prev) => {
      if (!prev || !prev.tasks[taskId]) return prev;
      return {
        ...prev,
        tasks: { ...prev.tasks, [taskId]: { ...prev.tasks[taskId], dueDate: newDueDate, startDate: previousTask.startDate ? newDueDate : undefined } },
      };
    });

    try {
      await boardService.updateTask(projectId, { ...previousTask, dueDate: newDueDate, startDate: previousTask.startDate ? newDueDate : undefined });
    } catch (error) {
      console.error("Kart tarihi güncellenirken hata:", error);
      toast.error(error instanceof Error ? error.message : 'Tarih güncellenemedi.');
      setBoardData(previousBoardData);
    }
  };

  const handleDeleteTask = (taskId: string) => {
    const task = boardData?.tasks[taskId];
    if (!task || !boardData) return;
    const originalColumnId = task.columnId;
    const originalIndex = boardData.columns[originalColumnId]?.taskIds.indexOf(taskId) ?? undefined;

    const geriGetir = () => {
      setBoardData((prev) => {
        if (!prev) return prev;
        return {
          ...prev,
          tasks: { ...prev.tasks, [taskId]: task },
          columns: placeCard(prev.columns, taskId, originalColumnId, originalIndex),
        };
      });
    };

    // Optimistic: kart hemen panodan kalkar, gercek silme UNDO_MS sonra.
    setBoardData((prev) => {
      if (!prev) return prev;
      const newColumns = removeCard(prev.columns, taskId);
      const newTasks = { ...prev.tasks };
      delete newTasks[taskId];
      return { ...prev, columns: newColumns, tasks: newTasks };
    });

    const timer = setTimeout(async () => {
      pendingDeleteTimers.current.delete(taskId);
      try {
        await boardService.deleteTask(projectId, taskId);
        refetchLabels();
        // RTK cache'lerini de gecersiz kil: board/roadmap/insight gibi
        // gorunumler kart silinince bayat kalmasin. BoardService plain fetch
        // kullandigi icin RTK bu silmeyi bilmiyor - bu olmadan timeline'da
        // silinen kart gorunmeye devam ediyordu.
        dispatch(api.util.invalidateTags(['Card', 'Insight']));
      } catch (error) {
        console.error("Görev silinirken hata:", error);
        toast.error(t('taskDeleteError'));
        geriGetir();
      }
    }, UNDO_MS);
    pendingDeleteTimers.current.set(taskId, timer);

    toast(`"${task.title}" silindi`, {
      duration: UNDO_MS,
      action: {
        label: 'Geri Al',
        onClick: () => {
          const bekleyen = pendingDeleteTimers.current.get(taskId);
          if (bekleyen) {
            clearTimeout(bekleyen);
            pendingDeleteTimers.current.delete(taskId);
          }
          geriGetir();
        },
      },
    });
  };

  const handleArchiveTask = async (taskId: string) => {
    try {
      await boardService.archiveTask(taskId);
      setBoardData((prev) => {
        if (!prev) return prev;
        const newColumns = removeCard(prev.columns, taskId);
        const newTasks = { ...prev.tasks };
        delete newTasks[taskId];
        return { ...prev, columns: newColumns, tasks: newTasks };
      });
    } catch (error) {
      console.error("Görev arşivlenirken hata:", error);
    }
  };

  // Board'u Excel (.xlsx) olarak indirir. Backend /export route'u auth +
  // erisim kontrolu yapar ve attachment olarak bicimlendirilmis calisma
  // kitabi doner (Gorevler + Ozet sayfalari).
  //
  // Dosya adi sunucudaki Content-Disposition ile ayni mantikla BURADA da
  // uretiliyor: CORS yapilandirmasi Content-Disposition'i exposedHeaders'a
  // koymadigi icin tarayici o basligi JS'e vermiyor, okumaya calismak
  // sessizce undefined donerdi.
  const handleExport = async () => {
    setIsExporting(true);
    try {
      const res = await fetch(
        `${process.env.NEXT_PUBLIC_API_URL}/projects/${projectId}/export?format=xlsx&lang=${lang}`,
        { headers: getAuthHeaders() },
      );
      if (!res.ok) throw new Error('Board dışa aktarılamadı.');
      const blob = await res.blob();
      const url = URL.createObjectURL(blob);
      const a = document.createElement('a');
      a.href = url;
      const tarih = new Date().toISOString().split('T')[0];
      const temizAd = (projectName || 'board').replace(/[\\/:*?"<>|]/g, '').trim() || 'board';
      a.download = `${temizAd}-${tarih}.xlsx`;
      document.body.appendChild(a);
      a.click();
      a.remove();
      URL.revokeObjectURL(url);
    } catch (error) {
      console.error('Board dışa aktarılırken hata:', error);
      toast.error(t('exportBoardError'));
    } finally {
      setIsExporting(false);
    }
  };

  const handleCreateColumn = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!newColumnName.trim() || isCreatingColumn) return;
    setIsCreatingColumn(true);
    try {
      const newCol = await boardService.createColumn(orgId, projectId, newColumnName.trim());
      
      setBoardData((prev) => {
        if (!prev) return prev;
        return {
          ...prev,
          columns: {
            ...prev.columns,
            [newCol.id]: {
              id: newCol.id,
              title: newCol.title,
              wipLimit: newCol.wipLimit,
              isDone: newCol.isDone,
              taskIds: [],
            },
          },
        };
      });
      
      toast.success(t('columnAddedSuccess'));
      setIsAddingColumn(false);
      setNewColumnName('');
    } catch (error: any) {
      toast.error(error?.message || t('columnAddError'));
    } finally {
      setIsCreatingColumn(false);
    }
  };

  // useCallback: inline arrow her render'da yeni referans üretir ve TaskModal'daki
  // açılış effect'ini sürekli tetikleyerek modalın "yükleniyor" ekranında
  // takılı kalmasına yol açar.
  const handleFetchTaskDetails = useCallback(
    (taskId: string) => boardService.getTaskDetails(projectId, taskId),
    [projectId],
  );

  // ─── Toplu islem ──────────────────────────────────────────────────

  const toggleCardSelection = useCallback((taskId: string) => {
    setSelectedCardIds((prev) => {
      const next = new Set(prev);
      if (next.has(taskId)) next.delete(taskId);
      else next.add(taskId);
      return next;
    });
  }, []);

  const clearSelection = useCallback(() => setSelectedCardIds(new Set()), []);

  // ─── Surukle-ciz (marquee) secim ──────────────────────────────
  // Kullanici kolonun BOS zeminine basip surukleyince bir dikdortgen cizilir,
  // bu dikdortgenle kesisen kartlar secilir. 20+ kartin tek tek tiklanmasini
  // gerektiren toplu secimler icin. Kolon KARTLARLA DOLUYSA bos zemin
  // kalmayabilir; o durumda kart uzerinden Shift+surukleme marquee baslatir
  // (kart tasima Shift'siz suruklemede kalir). Marquee surerken pointer
  // kolonun ust/alt kenarina yaklasinca kolon kendi icinde kayar
  // (auto-scroll) ve yeni gorunen kartlar da secime dahil olur.
  interface Marquee {
    startX: number;
    startY: number;
    endX: number;
    endY: number;
  }
  const [marquee, setMarquee] = useState<Marquee | null>(null);
  const marqueeRef = useRef<Marquee | null>(null);
  // Marquee baslarken kartlarin DOM rect'lerini topluyoruz; her
  // pointerMove'da getBoundingClientRect cagirmak scroll sirasinda layout
  // thrash yaratirdi. Auto-scroll kolonu kaydirdiginda rect'ler yeniden
  // toplanir; aksi halde baslangic anlik gorseli guvenilir.
  const marqueeCardRects = useRef<Map<string, DOMRect> | null>(null);
  // Auto-scroll: marquee aktifken son bilinen pointer Y + scroll container.
  // rAF dongusu pointer kenara yakin dururken kaymaya devam eder; kayma
  // olunca kart rect'leri tazelenir ki yeni gorunen kartlar secilsin.
  const marqueeClientY = useRef<number | null>(null);
  const marqueeZemin = useRef<HTMLElement | null>(null);
  const marqueeScrollRaf = useRef<number | null>(null);
  // handleMarqueeStart useCallback([]) ile sabit - secim modunu guncel
  // gorebilmesi icin secim set'ini senkron tutan bir ref. Boylece kart
  // uzerinden marquee baslatma karari (secim modu aktif mi) stale closure
  // olmaz.
  const selectedCardIdsRef = useRef<Set<string>>(new Set());
  selectedCardIdsRef.current = selectedCardIds;

  // Marquee baslangic noktasi + kartlar henuz toplanmadi. Move'da 5px esigi
  // gecilince gercek marquee baslar (pointer capture + rect toplama). Boylece
  // kart uzerindeki TIKLAMA (toggle) marquee'ye donup onClick'i oldurmez.
  const marqueePending = useRef<{ x: number; y: number } | null>(null);

  // Scroll container'daki kartlarin rect'lerini toplar. Auto-scroll kolonu
  // kaydirdiginda yeniden cagrilir - marquee kesişim hesabi guncel
  // konumlarla yapilsin.
  const kartlariTopla = (zemin: HTMLElement) => {
    const rectler = new Map<string, DOMRect>();
    zemin.querySelectorAll<HTMLElement>('[data-card-id]').forEach((el) => {
      const kimlik = el.dataset.cardId;
      if (kimlik) rectler.set(kimlik, el.getBoundingClientRect());
    });
    return rectler;
  };

  // Marquee aktifken pointer kolonun gorunur alaninin ust/alt kenarina
  // yaklasinca scroll container'i kaydirir ve yeni konumdaki kart
  // rect'lerini tazeler. rAF dongusu: pointer hareket etmese bile kenarda
  // dururken kaymaya devam eder, ta ki marquee bitene kadar.
  const scrollDongusu = () => {
    marqueeScrollRaf.current = null;
    const zemin = marqueeZemin.current;
    const y = marqueeClientY.current;
    if (!zemin || y === null || !marqueeRef.current) return;

    const rect = zemin.getBoundingClientRect();
    const KENAR = 48; // px - kenara girince scroll ramp baslar
    const MAX_HIZ = 16;
    let hiz = 0;
    if (y < rect.top + KENAR) {
      hiz = -Math.min(MAX_HIZ, (rect.top + KENAR - y) / 6);
    } else if (y > rect.bottom - KENAR) {
      hiz = Math.min(MAX_HIZ, (y - (rect.bottom - KENAR)) / 6);
    }

    if (hiz !== 0) {
      const onceki = zemin.scrollTop;
      zemin.scrollTop += hiz;
      if (zemin.scrollTop !== onceki) {
        // Kartlar kaydi; rect'leri tazele ki alan icinde kalanlar secilsin.
        marqueeCardRects.current = kartlariTopla(zemin);
      }
    }
    marqueeScrollRaf.current = requestAnimationFrame(scrollDongusu);
  };

  const handleMarqueeStart = useCallback((e: React.PointerEvent) => {
    // Sekme/yatay kaydirma icin orta tus veya kaydirma yuzeyi degil; sol
    // tusla baslansin.
    if (e.button !== 0) return;

    // Hedef kart ise: normal surukleme (shift yok) kart tasimasidir (dnd-kit).
    // Kolon KARTLARLA DOLU oldugunda bos zemin kalmaz, marquee zemin yokken
    // baslatilamaz (kullanici bunu bildirdi). Cozum:
    //   - bos zemin  -> marquee her zaman baslar
    //   - kart + Shift -> marquee (kart tasimayi bozmaz)
    //   - kart + secim modu aktif -> marquee (toplu secimde hizli yayilma)
    //   - kart + Shift'siz + secim yok -> kart tasima (dnd-kit)
    const hedef = e.target as HTMLElement;
    const karttaMi = !!hedef.closest('[data-card-id]');
    if (karttaMi) {
      const secimModuAktif = (selectedCardIdsRef.current?.size ?? 0) > 0;
      if (!e.shiftKey && !secimModuAktif) return;
    }

    // preventDefault YAPMA: karta tiklamak (bas + birak, hareket yok) onClick
    // ile toggle olsun. Marquee yalnizca 5px esigi asilinca baslar (Move'da).
    marqueePending.current = { x: e.clientX, y: e.clientY };
  }, []);

  // Marquee suruklemesi sirasinda tarayicinin native metin secimi araya
  // giriyor ve kart basliklari maviye boyaniyordu (kullanici bildirdi).
  // Kapsayiciya select-none veriyoruz ama esik asilana kadar gecen ilk
  // birkac pikselde secim baslamis olabilir; onu da burada dusuruyoruz.
  const natifSecimiDusur = () => {
    const secim = window.getSelection();
    if (secim && !secim.isCollapsed) secim.removeAllRanges();
  };

  const handleMarqueeMove = useCallback((e: React.PointerEvent) => {
    const baslangic = marqueeRef.current;
    const pending = marqueePending.current;
    if (!pending) return;

    const dx = e.clientX - pending.x;
    const dy = e.clientY - pending.y;
    // 5px esigini gecmediyse henuz surukleme yok - tiklamaya karismas.
    if (!baslangic && Math.abs(dx) < 5 && Math.abs(dy) < 5) return;

    natifSecimiDusur();

    if (!baslangic) {
      // Ilk kez esik asildi: pointer'i yakala + kart rect'lerini topla +
      // auto-scroll dongusunu baslat.
      e.currentTarget.setPointerCapture?.(e.pointerId);
      const nokta = { startX: pending.x, startY: pending.y, endX: e.clientX, endY: e.clientY };
      marqueeRef.current = nokta;
      setMarquee(nokta);

      const zemin = (e.currentTarget as HTMLElement);
      marqueeCardRects.current = kartlariTopla(zemin);
      marqueeZemin.current = zemin;
      marqueeClientY.current = e.clientY;
      if (marqueeScrollRaf.current === null) {
        marqueeScrollRaf.current = requestAnimationFrame(scrollDongusu);
      }
    } else {
      marqueeRef.current = { ...baslangic, endX: e.clientX, endY: e.clientY };
      setMarquee(marqueeRef.current);
      marqueeClientY.current = e.clientY;
    }
  }, []);

  const handleMarqueeEnd = useCallback((e: React.PointerEvent) => {
    const baslangic = marqueeRef.current;
    const rectler = marqueeCardRects.current;
    marqueeRef.current = null;
    marqueeCardRects.current = null;
    marqueePending.current = null;
    // Auto-scroll dongusunu durdur + ref'leri temizle.
    if (marqueeScrollRaf.current !== null) {
      cancelAnimationFrame(marqueeScrollRaf.current);
      marqueeScrollRaf.current = null;
    }
    marqueeZemin.current = null;
    marqueeClientY.current = null;
    setMarquee(null);
    // Pointer capture'i serbest birak (sadece yakalanmissa). Bir sonraki
    // marquee baslangicinda yeniden yakalanir.
    try {
      e.currentTarget.releasePointerCapture?.(e.pointerId);
    } catch {
      // Capture yoksa veya zaten birakildiysa sessizce gec.
    }
    if (!baslangic || !rectler) return;

    const minX = Math.min(baslangic.startX, baslangic.endX);
    const maxX = Math.max(baslangic.startX, baslangic.endX);
    const minY = Math.min(baslangic.startY, baslangic.endY);
    const maxY = Math.max(baslangic.startY, baslangic.endY);

    // Yeni secilecekler = marquee ile kesisen kartlar. Shift basiliyken var
    // olan secime ekle, degilse secimi bu kumeyle degistir.
    const secilecekler = new Set<string>();
    rectler.forEach((r, id) => {
      // Dikdortgen kesisimi: biri digerinin icinde veya tasiyorsa.
      const kesisti = r.left < maxX && r.right > minX && r.top < maxY && r.bottom > minY;
      if (kesisti) secilecekler.add(id);
    });

    setSelectedCardIds((prev) => {
      if (e.shiftKey) {
        const sonraki = new Set(prev);
        secilecekler.forEach((id) => sonraki.add(id));
        return sonraki;
      }
      return secilecekler;
    });
  }, []);

  // ─── Kart sag tik menusu ──────────────────────────────────────
  // Izleme ozelligi "karta girmeden izleyebilmek" istiyordu; tek kart icin
  // toplu secim cubuguna girmek zorunda kalmadan hizli yol.
  const [cardMenu, setCardMenu] = useState<CardContextMenuState | null>(null);
  const handleCardContextMenu = useCallback((taskId: string, e: React.MouseEvent) => {
    e.preventDefault();
    // Sag tik bir pointerdown de uretiyor; marquee'nin bekleyen baslangicini
    // temizlemezsek menu acikken fare hareketi marquee cizmeye baslardi.
    marqueePending.current = null;
    setCardMenu({ cardId: taskId, x: e.clientX, y: e.clientY });
  }, []);
  const closeCardMenu = useCallback(() => setCardMenu(null), []);

  const [moveModalCard, setMoveModalCard] = useState<{ id: string; title: string } | null>(null);

  const handleDuplicateCard = useCallback(async (taskId: string) => {
    try {
      const result = await boardService.duplicateTask(taskId, {});
      const dropped = [...result.droppedLabels, ...result.droppedCustomFields];
      if (dropped.length > 0) {
        toast.warning(`Kart kopyalandı. Düşen alanlar: ${dropped.join(', ')}`);
      } else {
        toast.success('Kart kopyalandı.');
      }
      boardService.getBoardData(projectId).then((data) => setBoardData(data));
    } catch (err) {
      toast.error(err instanceof Error ? err.message : 'Kart kopyalanamadı.');
    }
  }, [projectId]);

  // Panoda gercekten var olan secimler. State'i efektle budamak yerine
  // turetiyoruz: kart baska bir kullanici tarafindan silinip socket ile
  // dustugunde sayac var olmayan kartlari saymasin, ama bunun icin fazladan
  // bir render dongusu odemeyelim.
  const effectiveSelectedIds = useMemo(() => {
    if (selectedCardIds.size === 0 || !boardData) return selectedCardIds;
    const kalan = [...selectedCardIds].filter((id) => boardData.tasks[id]);
    return kalan.length === selectedCardIds.size ? selectedCardIds : new Set(kalan);
  }, [selectedCardIds, boardData]);

  // Escape secimi bosaltir: secim modundan cikmanin en hizli yolu ve
  // kullanicinin refleks olarak denedigi tus.
  useEffect(() => {
    if (effectiveSelectedIds.size === 0) return;
    const onKey = (e: KeyboardEvent) => {
      if (e.key === 'Escape') clearSelection();
    };
    window.addEventListener('keydown', onKey);
    return () => window.removeEventListener('keydown', onKey);
  }, [effectiveSelectedIds.size, clearSelection]);

  const runBulkAction = useCallback(
    async (payload: Parameters<typeof boardService.bulkCardAction>[1]) => {
      const ids = payload.cardIds;
      if (ids.length === 0) return;

      setIsBulkRunning(true);
      try {
        const sonuc = await boardService.bulkCardAction(projectId, payload);

        // Pano durumunu sunucudan tazeliyoruz. Optimistic guncelleme yerine
        // yeniden cekmenin sebebi: kismi basari mumkun (bazi kartlarda yetki
        // yetmeyebilir) ve hangi kartin gercekten degistigini tahmin etmek
        // yerine dogrusunu almak daha guvenli.
        const taze = await boardService.getBoardData(projectId);
        if (taze) setBoardData(taze);

        const basariliSayi = sonuc.basarili.length;
        const basarisizSayi = sonuc.basarisiz.length;

        if (basariliSayi > 0) toast.success(`${basariliSayi} kart güncellendi`);
        if (basarisizSayi > 0) {
          // Ilk hatanin sebebini gosteriyoruz - hepsini listelemek toast'i
          // okunmaz yapardi, sebep tipik olarak hepsinde ayni oluyor.
          toast.error(`${basarisizSayi} kart atlandı: ${sonuc.basarisiz[0].sebep}`);
        }

        clearSelection();
      } catch (error) {
        toast.error(error instanceof Error ? error.message : 'Toplu işlem uygulanamadı.');
      } finally {
        setIsBulkRunning(false);
      }
    },
    [projectId, clearSelection],
  );

  // Toplu silme runBulkAction'dan BILEREK ayri: digerleri (tasima/etiket/
  // atama) sunucudan hemen calisip panoyu tazeliyor, ama silme geri
  // donulemez - 20 kart secip yanlislikla silen kullanicinin elinde hicbir
  // sey kalmiyordu. Ayni UNDO_MS penceresi tekli silmeyle ayni mantikla:
  // optimistic kaldirma + gecikmeli gercek istek + "Geri Al" toast'u.
  const handleBulkDelete = useCallback((ids: string[]) => {
    if (ids.length === 0 || !boardData) return;

    const anlikBoard = boardData;
    const secim: { task: Task; columnId: string; index: number | undefined }[] = [];
    for (const id of ids) {
      const task = anlikBoard.tasks[id];
      if (!task) continue;
      const columnId = task.columnId;
      const index = anlikBoard.columns[columnId]?.taskIds.indexOf(id) ?? undefined;
      secim.push({ task, columnId, index });
    }
    if (secim.length === 0) return;

    const geriGetir = (hedefIdler?: Set<string>) => {
      setBoardData((prev) => {
        if (!prev) return prev;
        let columns = prev.columns;
        const tasks = { ...prev.tasks };
        // Sondan basa: basa eklenen bir kart sonraki eklemelerin index'ini
        // kaydirmasin diye orijinal sira tersten uygulaniyor.
        for (let i = secim.length - 1; i >= 0; i--) {
          const { task, columnId, index } = secim[i];
          if (hedefIdler && !hedefIdler.has(task.id)) continue;
          tasks[task.id] = task;
          columns = placeCard(columns, task.id, columnId, index);
        }
        return { ...prev, columns, tasks };
      });
    };

    setBoardData((prev) => {
      if (!prev) return prev;
      let columns = prev.columns;
      const tasks = { ...prev.tasks };
      for (const { task } of secim) {
        columns = removeCard(columns, task.id);
        delete tasks[task.id];
      }
      return { ...prev, columns, tasks };
    });
    clearSelection();

    const timer = setTimeout(async () => {
      try {
        const sonuc = await boardService.bulkCardAction(projectId, {
          cardIds: secim.map((s) => s.task.id),
          action: 'delete',
        });
        refetchLabels();
        dispatch(api.util.invalidateTags(['Card', 'Insight']));
        if (sonuc.basarisiz.length > 0) {
          toast.error(`${sonuc.basarisiz.length} kart silinemedi: ${sonuc.basarisiz[0].sebep}`);
          geriGetir(new Set(sonuc.basarisiz.map((b) => b.cardId)));
        }
      } catch (error) {
        toast.error(error instanceof Error ? error.message : 'Kartlar silinemedi.');
        geriGetir();
      }
    }, UNDO_MS);

    toast(`${secim.length} kart silindi`, {
      duration: UNDO_MS,
      action: {
        label: 'Geri Al',
        onClick: () => {
          clearTimeout(timer);
          geriGetir();
        },
      },
    });
  }, [boardData, projectId, clearSelection, dispatch, refetchLabels]);

  // Toplu izleme AYRI bir akis: runBulkAction islem sonrasi tum panoyu yeniden
  // cekiyor, ama izleme kartin kendisini degistirmiyor - bu kisisel bir
  // abonelik. Panoyu tazelemek buyuk bir panoda bosuna bir tur gidis-gelis
  // olurdu. Bunun yerine yalnizca dashboard'daki "Izlediklerim" listesi
  // gecersiz kilinuyor.
  const runWatchAction = useCallback(
    async (izle: boolean) => {
      const ids = [...effectiveSelectedIds];
      if (ids.length === 0) return;

      setIsBulkRunning(true);
      try {
        const sonuc = await boardService.bulkCardAction(projectId, {
          cardIds: ids,
          action: izle ? 'watch' : 'unwatch',
        });

        dispatch(api.util.invalidateTags(['WatchedCards']));
        // Kart detayindaki "Izle" dugmesinin sayaci da eskiyor.
        dispatch(
          api.util.invalidateTags(ids.map((id) => ({ type: 'Card' as const, id: `watch-${id}` }))),
        );

        if (sonuc.basarili.length > 0) {
          toast.success(izle ? t('bulkWatchSuccess') : t('bulkUnwatchSuccess'));
        }
        if (sonuc.basarisiz.length > 0) {
          toast.error(`${sonuc.basarisiz.length} kart atlandı: ${sonuc.basarisiz[0].sebep}`);
        }

        clearSelection();
      } catch (error) {
        toast.error(error instanceof Error ? error.message : t('watchToggleError'));
      } finally {
        setIsBulkRunning(false);
      }
    },
    [projectId, effectiveSelectedIds, clearSelection, dispatch, t],
  );

  const handleRenameColumn = useCallback(async (columnId: string, newName: string) => {
    if (!isAdmin) return;
    try {
      await boardService.updateColumn(columnId, { name: newName });
      setBoardData((prev) => {
        if (!prev || !prev.columns[columnId]) return prev;
        return {
          ...prev,
          columns: {
            ...prev.columns,
            [columnId]: { ...prev.columns[columnId], title: newName },
          },
        };
      });
    } catch (error: any) {
      toast.error(error?.message || t('columnRenameError'));
    }
  }, [isAdmin, t]);

  const handleDeleteColumn = useCallback(async (columnId: string) => {
    if (!isAdmin) return;
    try {
      await boardService.deleteColumn(columnId);
      setBoardData((prev) => {
        if (!prev || !prev.columns[columnId]) return prev;
        const newColumns = { ...prev.columns };
        delete newColumns[columnId];
        return { ...prev, columns: newColumns };
      });
      toast.success(t('columnDeletedSuccess'));
    } catch (error: any) {
      toast.error(error?.message || t('columnDeleteError'));
    }
  }, [isAdmin, t]);

  if (loading) {
    return <div className="p-8 text-center text-muted-foreground">{t('boardLoading')}</div>;
  }

  if (!boardData) {
    return <div className="p-8 text-center text-destructive">{t('boardLoadError')}</div>;
  }

  // Takvim gorunumu icin duz kart listesi: pano ile ayni filtreler gecerli
  // (arama/oncelik/kisi/etiket), sadece dueDate'i olan kartlar takvimde
  // yer alir - tarihsizler zaten panoda goruluyor.
  const allTasksFlat = Object.values(boardData.tasks);
  const calendarTasks = hasActiveFilters ? allTasksFlat.filter(matchesFilters) : allTasksFlat;
  const doneColumnIds = new Set(
    Object.values(boardData.columns).filter((c) => c.isDone).map((c) => c.id),
  );

  // Sutunlari cizer. Swimlane modunda her serit icin bir kez cagrilir:
  // laneTaskIds o seride ait kart id'leri, laneKey ise droppable id'lerini
  // benzersizlestirmek icin (ayni sutun her seritte tekrar ciziliyor).
  const renderColumns = (laneTaskIds?: Set<string>, laneKey?: string) => {
    if (!boardData) return null;

    return Object.values(boardData.columns).map((column) => {
      // Guvenlik agi: placeCard/removeCard zaten tekrari engelliyor ama
      // acik bir oturumda state bozulmussa React'in "same key" uyarisi
      // yerine kart tek kez cizilsin.
      const allColumnTasks = Array.from(new Set(column.taskIds))
        .map((taskId) => boardData.tasks[taskId])
        .filter((task): task is Task => task !== undefined);

      const filtrelenmis = hasActiveFilters
        ? allColumnTasks.filter(matchesFilters)
        : allColumnTasks;
      const columnTasks = laneTaskIds
        ? filtrelenmis.filter((task) => laneTaskIds.has(task.id))
        : filtrelenmis;

      return (
        <BoardColumn
          key={laneKey ? `${column.id}-${laneKey}` : column.id}
          id={column.id}
          title={column.title}
          tasks={columnTasks}
          totalCount={hasActiveFilters && !laneTaskIds ? allColumnTasks.length : undefined}
          wipLimit={column.wipLimit}
          isDone={column.isDone}
          canAddTask={canAddTask}
          isAdmin={!!isAdmin}
          onAddTask={handleAddTask}
          onTaskClick={handleTaskClick}
          onRenameColumn={isAdmin ? handleRenameColumn : undefined}
          onDeleteColumn={isAdmin ? handleDeleteColumn : undefined}
          conflicts={conflicts}
          templates={isAdmin ? templates : []}
          onCreateFromTemplate={handleCreateFromTemplate}
          selectedIds={effectiveSelectedIds}
          onToggleSelect={toggleCardSelection}
          onCardContextMenu={handleCardContextMenu}
          projectKey={boardData.projectKey}
          estimateUnit={boardData.estimateUnit}
          onMarqueeStart={handleMarqueeStart}
          onMarqueeMove={handleMarqueeMove}
          onMarqueeEnd={handleMarqueeEnd}
          laneKey={laneKey}
        />
      );
    });
  };

  // Toplu secim modundayken (en az 1 kart secili) veya marquee surerken
  // kart metinleri secilebilir olmasin. Sebep: bu iki durumda da kullanici
  // kartlarin UZERINDEN surukluyor ve tarayici metni maviye boyayip ekrani
  // kirli gosteriyor. Yalnizca kolon kapsayicisina veriliyor - modal ve
  // panel iceriginden metin kopyalamak calismaya devam etsin.
  const metinSecimiKapali = marquee !== null || effectiveSelectedIds.size > 0;

  return (
    <div className="flex flex-col h-full min-h-0">
      <div className="flex items-center gap-3 px-4 pt-1">
        <div className="inline-flex items-center rounded-lg border border-border bg-muted/40 p-0.5 shrink-0">
          <button
            type="button"
            onClick={() => setViewMode('board')}
            className={`flex items-center gap-1.5 px-2.5 py-1.5 rounded-md text-xs font-medium transition-colors ${
              viewMode === 'board' ? 'bg-background shadow-sm text-foreground' : 'text-muted-foreground hover:text-foreground'
            }`}
          >
            <LayoutGrid className="size-3.5" /> {t('boardView')}
          </button>
          <button
            type="button"
            onClick={() => setViewMode('calendar')}
            className={`flex items-center gap-1.5 px-2.5 py-1.5 rounded-md text-xs font-medium transition-colors ${
              viewMode === 'calendar' ? 'bg-background shadow-sm text-foreground' : 'text-muted-foreground hover:text-foreground'
            }`}
          >
            <CalendarDays className="size-3.5" /> {t('calendarView')}
          </button>
          <button
            type="button"
            onClick={() => setViewMode('table')}
            className={`flex items-center gap-1.5 px-2.5 py-1.5 rounded-md text-xs font-medium transition-colors ${
              viewMode === 'table' ? 'bg-background shadow-sm text-foreground' : 'text-muted-foreground hover:text-foreground'
            }`}
          >
            <Table2 className="size-3.5" /> Tablo
          </button>
          <button
            type="button"
            onClick={() => setViewMode('timeline')}
            className={`flex items-center gap-1.5 px-2.5 py-1.5 rounded-md text-xs font-medium transition-colors ${
              viewMode === 'timeline' ? 'bg-background shadow-sm text-foreground' : 'text-muted-foreground hover:text-foreground'
            }`}
          >
            <GanttChartSquare className="size-3.5" /> Zaman Çizelgesi
          </button>
        </div>

        {/* Swimlane: yalnizca pano gorunumunde anlamli */}
        {viewMode === 'board' && (
          <select
            value={groupBy}
            onChange={(e) => setGroupBy(e.target.value as typeof groupBy)}
            title={t('swimlaneToggleTitle')}
            className="shrink-0 rounded-lg border border-border bg-background px-2 py-1.5 text-xs font-medium text-muted-foreground outline-none transition-colors hover:text-foreground focus-visible:border-ring"
          >
            <option value="none">Gruplama yok</option>
            <option value="assignee">{t('byAssignee')}</option>
            <option value="priority">{t('byPriority')}</option>
            <option value="epic">{t('byEpic')}</option>
          </select>
        )}

        {/* Sprintler / Otomasyonlar / Ek Alanlar / Triage tek bir yonetim
            sayfasinda toplandi - ust bar bu dort butonla cok sikisiyordu. */}
        <Link
          href={`/projects/${projectId}/manage?orgId=${orgId}`}
          className="inline-flex items-center gap-1.5 px-2.5 py-1.5 rounded-lg border border-border text-xs font-medium text-muted-foreground hover:text-foreground hover:bg-accent/40 transition-colors shrink-0"
          title="Sprintler, otomasyonlar, ek alanlar ve triage"
        >
          <SlidersHorizontal className="size-3.5" /> Yönetim
          {triagePendingCount > 0 && (
            <span className="inline-flex items-center justify-center min-w-4 h-4 px-1 rounded-full bg-primary text-primary-foreground text-[10px] font-semibold">
              {triagePendingCount}
            </span>
          )}
        </Link>

        <button
          type="button"
          onClick={handleExport}
          disabled={isExporting}
          className="inline-flex items-center gap-1.5 px-2.5 py-1.5 rounded-lg border border-border text-xs font-medium text-muted-foreground hover:text-foreground hover:bg-accent/40 transition-colors shrink-0 disabled:opacity-60 disabled:cursor-not-allowed"
          title={t('exportBoardHint')}
        >
          <Download className="size-3.5" /> {isExporting ? t('exporting') : t('exportBoard')}
        </button>

        <button
          type="button"
          onClick={() => setIsArchiveModalOpen(true)}
          className="inline-flex items-center gap-1.5 px-2.5 py-1.5 rounded-lg border border-border text-xs font-medium text-muted-foreground hover:text-foreground hover:bg-accent/40 transition-colors shrink-0"
          title="Arşivlenen kartları görüntüle"
        >
          <Archive className="size-3.5" /> Arşiv
        </button>

        <div className="flex-1 min-w-0">
          <BoardFilters
            search={search}
            onSearchChange={setSearch}
            members={members}
            labels={labels}
            selectedPriorities={selectedPriorities}
            onTogglePriority={togglePriority}
            selectedAssigneeIds={selectedAssigneeIds}
            onToggleAssignee={toggleAssignee}
            selectedLabelIds={selectedLabelIds}
            onToggleLabel={toggleLabel}
            hasActiveFilters={hasActiveFilters}
            onClear={() => {
              setSearch('');
              setSelectedPriorities(new Set());
              setSelectedAssigneeIds(new Set());
              setSelectedLabelIds(new Set());
            }}
          />
        </div>
      </div>

      <div className="flex-1 min-h-0 flex gap-4 sm:gap-6 relative overflow-hidden">
        {viewMode === 'timeline' ? (
          <TimelineView projectId={projectId} onCardClick={handleTaskClick} canEdit={isAdmin} />
        ) : viewMode === 'table' ? (
          <TableView
            tasks={calendarTasks}
            columns={boardData.columns}
            onTaskClick={handleTaskClick}
            estimateUnit={boardData.estimateUnit}
          />
        ) : viewMode === 'calendar' ? (
          <CalendarView
            tasks={calendarTasks}
            columns={boardData.columns}
            doneColumnIds={doneColumnIds}
            onTaskClick={handleTaskClick}
            onTaskReschedule={handleRescheduleTask}
            onDayClick={handleDayClick}
          />
        ) : (
        <DndContext
          sensors={sensors}
          collisionDetection={collisionDetectionFn}
          onDragStart={handleDragStart}
          onDragEnd={handleDragEnd}
        >
          {/* Serit modunda seritler alt alta dizilir (dikey akis) ve her
              seridin kendi yatay kaydirmasi olur; klasik modda tek bir
              yatay sutun satiri var. */}
          <div
            className={`flex-1 min-h-0 pt-1 pb-4 px-4 no-scrollbar ${
              lanes ? 'overflow-auto' : 'flex gap-4 overflow-x-auto'
            } ${metinSecimiKapali ? 'select-none' : ''}`}
          >
            {lanes
              ? lanes.map((lane) => {
                  // Bos seritleri gizliyoruz: 12 uyeli bir organizasyonda
                  // atanana gore gruplarken cogu serit bos kalir ve panoyu
                  // okunmaz hale getirir.
                  const laneTasks = Object.values(boardData.tasks).filter(
                    (task) => lane.icerir(task) && (!hasActiveFilters || matchesFilters(task)),
                  );
                  if (laneTasks.length === 0) return null;
                  const laneTaskIds = new Set(laneTasks.map((task) => task.id));

                  return (
                    <div key={lane.key} className="mb-6 last:mb-0">
                      <div className="mb-2 flex items-center gap-2 px-1">
                        <h3 className="text-sm font-semibold text-foreground">{lane.label}</h3>
                        <span className="rounded-full bg-muted px-1.5 text-xs tabular-nums text-muted-foreground">
                          {laneTasks.length}
                        </span>
                        <span className="h-px flex-1 bg-border" />
                      </div>
                      <div className="flex gap-4">
                        {renderColumns(laneTaskIds, lane.key)}
                      </div>
                    </div>
                  );
                })
              : renderColumns()}

            {isAdmin && !lanes && (
              <div className="w-72 shrink-0 select-none">
                {isAddingColumn ? (
                  <form onSubmit={handleCreateColumn} className="bg-background/80 backdrop-blur-md rounded-xl p-3 border border-border/80 shadow-md space-y-2">
                    <input
                      type="text"
                      value={newColumnName}
                      onChange={(e) => setNewColumnName(e.target.value)}
                      placeholder={t('enterColumnTitle')}
                      className="w-full text-sm bg-transparent outline-none border-b border-muted-foreground/30 focus:border-primary px-1 py-1 text-foreground"
                      autoFocus
                      required
                    />
                    <div className="flex items-center gap-2 pt-1">
                      <button
                        type="submit"
                        disabled={isCreatingColumn}
                        className="px-3 py-1 bg-primary text-primary-foreground rounded-lg text-xs font-semibold hover:bg-primary/90 transition-all active:scale-95 disabled:opacity-50"
                      >
                        {isCreatingColumn ? t('addingColumn') : t('newColumnAdd')}
                      </button>
                      <button
                        type="button"
                        onClick={() => {
                          setIsAddingColumn(false);
                          setNewColumnName('');
                        }}
                        className="px-3 py-1 bg-muted hover:bg-muted/80 text-foreground rounded-lg text-xs font-semibold transition-all active:scale-95"
                      >
                        {t('cancel')}
                      </button>
                    </div>
                  </form>
                ) : (
                  <button
                    onClick={() => setIsAddingColumn(true)}
                    className="w-full h-12 flex items-center justify-center gap-2 rounded-xl border border-dashed border-border hover:border-primary/50 hover:bg-accent/40 text-muted-foreground hover:text-foreground transition-all duration-300 font-medium text-sm group cursor-pointer"
                  >
                    <span className="text-lg group-hover:scale-110 transition-transform">+</span>
                    <span>{t('addNewColumn')}</span>
                  </button>
                )}
              </div>
            )}
          </div>
          <DragOverlay>
            {activeId && boardData.tasks[activeId] ? (
              <div className="transform rotate-2 scale-[1.03] cursor-grabbing select-none shadow-2xl transition-transform duration-200">
                <BoardCard
                  task={boardData.tasks[activeId]}
                  onClick={() => {}}
                />
              </div>
            ) : null}
            {activeId && isColumnGrip(activeId as string) ? (
              <div className="w-80 lg:w-87.5 rounded-2xl border-2 border-primary/50 bg-primary/5 p-3 shadow-2xl backdrop-blur-sm cursor-grabbing">
                <div className="flex items-center gap-2 text-sm font-semibold text-foreground/70">
                  <GripVerticalIcon className="h-4 w-4 text-primary" />
                  {boardData.columns[gripToColumnId(activeId as string)]?.title || 'Sütun'}
                </div>
              </div>
            ) : null}
          </DragOverlay>
        </DndContext>
        )}

        {/* Surukle-ciz (marquee) secim kutusu. fixed: kart rect'leri viewport
            koordinatlarinda oldugundan overlay de viewport'a sabitleniyor;
            container scroll yapsa bile gorsel dogru yerde kalir. pointer-events-none
            sayesinde surukleme sonrasi etkilesimler (tik, tasima) engellenmez. */}
        {marquee && (
          <div
            className="pointer-events-none fixed z-30 rounded-md border-2 border-primary/60 bg-primary/10"
            style={{
              left: Math.min(marquee.startX, marquee.endX),
              top: Math.min(marquee.startY, marquee.endY),
              width: Math.abs(marquee.endX - marquee.startX),
              height: Math.abs(marquee.endY - marquee.startY),
            }}
          />
        )}

        {/* Kart sag tik menusu: karti acmadan izlemeye alma / secme */}
        {cardMenu && (
          <CardContextMenu
            state={cardMenu}
            selected={effectiveSelectedIds.has(cardMenu.cardId)}
            onClose={closeCardMenu}
            onOpenCard={() => {
              handleTaskClick(cardMenu.cardId);
              closeCardMenu();
            }}
            onToggleSelect={() => toggleCardSelection(cardMenu.cardId)}
            onDuplicate={isAdmin ? () => handleDuplicateCard(cardMenu.cardId) : undefined}
            onMove={isAdmin ? () => {
              const task = boardData.tasks[cardMenu.cardId];
              if (task) setMoveModalCard({ id: task.id, title: task.title });
            } : undefined}
          />
        )}

        {moveModalCard && (
          <CardMoveModal
            isOpen={!!moveModalCard}
            onClose={() => setMoveModalCard(null)}
            cardId={moveModalCard.id}
            cardTitle={moveModalCard.title}
            orgId={orgId}
            currentProjectId={projectId}
            onMoved={() => {
              boardService.getBoardData(projectId).then((data) => setBoardData(data));
            }}
          />
        )}

        {/* AI Chat drawer overlay (desktop) */}
        {isDesktopChatOpen && (
          <div className="hidden sm:block shrink-0 h-full pt-1 pb-4 pr-4 sm:pr-6 pl-0">
            <div className="h-full w-80 lg:w-105 xl:w-120 shadow-2xl rounded-xl overflow-hidden border border-border">
              <AIChatPanel
                projectId={projectId}
                projectName={projectName}
                onClose={() => setIsDesktopChatOpen(false)}
              />
            </div>
          </div>
        )}

        {/* Floating AI Chat Trigger Button (desktop only) */}
        {!isDesktopChatOpen && (
          <button
            onClick={() => setIsDesktopChatOpen(true)}
            className="hidden sm:flex fixed bottom-6 right-6 z-40 items-center justify-center rounded-full bg-primary hover:bg-primary/95 text-primary-foreground shadow-2xl transition-all duration-300 w-14 h-14 hover:scale-110 active:scale-95 animate-pop-in cursor-pointer hover:shadow-primary/30 hover:shadow-lg"
            title={t('aiAssistantOpen')}
          >
            <Bot className="h-6 w-6" />
          </button>
        )}

        <style>{`
          @keyframes slideIn {
            from {
              transform: translateX(100%);
              opacity: 0.9;
            }
            to {
              transform: translateX(0);
              opacity: 1;
            }
          }
          @keyframes popIn {
            from {
              transform: scale(0.8) translateY(20px);
              opacity: 0;
            }
            to {
              transform: scale(1) translateY(0);
              opacity: 1;
            }
          }
          .animate-slide-in {
            animation: slideIn 0.28s cubic-bezier(0.16, 1, 0.3, 1) forwards;
          }
          .animate-pop-in {
            animation: popIn 0.25s cubic-bezier(0.34, 1.56, 0.64, 1) forwards;
          }
        `}</style>
      </div>

      <BulkActionBar
        selectedCount={effectiveSelectedIds.size}
        members={members}
        labels={labels}
        isAdmin={!!isAdmin}
        isRunning={isBulkRunning}
        onAssign={(assigneeIds) =>
          runBulkAction({ cardIds: [...effectiveSelectedIds], action: 'assign', assigneeIds })
        }
        onLabel={(labelId) =>
          runBulkAction({ cardIds: [...effectiveSelectedIds], action: 'label', labelId })
        }
        onArchive={() => runBulkAction({ cardIds: [...effectiveSelectedIds], action: 'archive' })}
        onDelete={() => handleBulkDelete([...effectiveSelectedIds])}
        onWatch={runWatchAction}
        onClear={clearSelection}
      />

      <TaskModal
        isOpen={isModalOpen}
        onClose={() => {
          setIsModalOpen(false);
          setSelectedTaskId(null);
          setCreateRequestColumnId(null);
          setInitialTitle('');
          setInitialDueDate('');
        }}
        taskId={selectedTaskId}
        orgId={orgId}
        projectId={projectId}
        availableCards={Object.values(boardData.tasks).map((t) => ({ id: t.id, title: t.title }))}
        fetchTaskDetails={handleFetchTaskDetails}
        onUpdateTask={handleUpdateTask}
        onDeleteTask={handleDeleteTask}
        onArchiveTask={isAdmin ? handleArchiveTask : undefined}
        columnId={createRequestColumnId}
        projectKey={boardData.projectKey}
        estimateUnit={boardData.estimateUnit}
        initialTitle={initialTitle}
        initialDueDate={initialDueDate}
        onCreateTask={handleCreateTask}
        conflict={selectedTaskId ? conflicts[selectedTaskId] : undefined}
      />

      <ArchiveModal
        isOpen={isArchiveModalOpen}
        onClose={() => setIsArchiveModalOpen(false)}
        projectId={projectId}
        onRestored={() => {
          boardService.getBoardData(projectId).then((data) => setBoardData(data));
        }}
      />

    </div>
  );
};
