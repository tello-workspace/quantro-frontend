// src/features/board/components/ProjectBoard.tsx
'use client';

import React, { useState, useEffect, useCallback, useMemo } from 'react';
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
import { boardService, calculateFractionalPosition, Task, BoardData, TaskAssignee, Priority } from '../services/boardService';
import { TaskModal } from '@/components/ui/TaskModal';
import { useGetOrganizationByIdQuery } from '@/features/organizations/organizationsApi';
import { useGetLabelsQuery, useAttachLabelMutation } from '@/features/labels/labelsApi';
import { useAddDependencyMutation } from '@/features/dependencies/dependenciesApi';
import { toast } from "sonner";
import { AIChatPanel } from '@/features/ai/AIChatPanel';
import { useCreateChangeRequestMutation } from '@/features/requests/requestsApi';
import { Bot, GripVerticalIcon } from 'lucide-react';
import { useRealtimeBoard } from '@/hooks/useRealtimeNotifications';

interface ProjectBoardProps {
  projectId: string;
  orgId: string;
  projectName?: string;
  // Org-genelinde arama sonucundan direkt bu karti acmak icin (bkz. OrgSearchDialog)
  initialOpenCardId?: string;
}

interface CardSocketPayload {
  id: string;
  title: string;
  description?: string | null;
  columnId: string;
  projectId: string;
  assignees?: TaskAssignee[];
  dueDate?: string | null;
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

// Bir kartin id'sini tum sutunlardan cikarir (silme ve kolon silme yollari icin)
function removeCard(columns: BoardData['columns'], cardId: string): BoardData['columns'] {
  const next: BoardData['columns'] = {};
  for (const [colId, col] of Object.entries(columns)) {
    const temizlenmis = col.taskIds.filter((id) => id !== cardId);
    next[colId] = temizlenmis.length === col.taskIds.length ? col : { ...col, taskIds: temizlenmis };
  }
  return next;
}

export const ProjectBoard: React.FC<ProjectBoardProps> = ({ projectId, orgId, projectName, initialOpenCardId }) => {
  const [boardData, setBoardData] = useState<BoardData | null>(null);
  const [loading, setLoading] = useState<boolean>(true);
  const [activeId, setActiveId] = useState<string | null>(null);
  // Git Cakisma Erken Uyari: kartId -> "hangi dosyada, kim, hangi diger kart" bilgisi
  const [conflicts, setConflicts] = useState<Record<string, CardConflictInfo>>({});

  // Real-time board updates
  const realtimeBoard = useRealtimeBoard(projectId);

  // Kart ekleme sadece ADMIN'e acik; suruklemeyi (kart tasima) herkes yapabilir
  const { data: org } = useGetOrganizationByIdQuery({ orgId }, { skip: !orgId });
  const isAdmin = boardData?.myRole === 'ADMIN' || org?.myRole === 'ADMIN';
  // Uye de kart ekleme formunu gorur; farki gonderdigi seyin talep olmasi
  const canAddTask = true;
  const [createChangeRequest] = useCreateChangeRequestMutation();
  const [attachLabel] = useAttachLabelMutation();
  const [addDependency] = useAddDependencyMutation();
  const members = org?.members ?? [];

  const { data: labels = [], refetch: refetchLabels } = useGetLabelsQuery({ orgId, projectId }, { skip: !orgId || !projectId });

  const [isModalOpen, setIsModalOpen] = useState(false);
  const [selectedTaskId, setSelectedTaskId] = useState<string | null>(null);
  const [createRequestColumnId, setCreateRequestColumnId] = useState<string | null>(null);
  const [initialTitle, setInitialTitle] = useState('');

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

  // Org-genelinde aramadan gelen deep-link: pano yuklenince o karti direkt ac
  useEffect(() => {
    if (!initialOpenCardId || !boardData) return;
    setSelectedTaskId(initialOpenCardId);
    setIsModalOpen(true);
  }, [initialOpenCardId, boardData]);

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
              assignees: payload.assignees ?? existing?.assignees ?? [],
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
              columnId: targetColumnId,
              assignees: payload.assignees ?? existing.assignees,
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
    });

    const unsubscribeColumnCreated = realtimeBoard.onColumnCreated((payload) => {
      setBoardData((prev) => {
        if (!prev || prev.columns[payload.id]) return prev;
        return {
          ...prev,
          columns: {
            ...prev.columns,
            [payload.id]: { id: payload.id, title: payload.name, wipLimit: payload.wipLimit ?? null, taskIds: [] },
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
    const overId = over.id as string;
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

    if (
      isColumnChange &&
      destinationColumn.wipLimit &&
      destinationColumn.taskIds.length >= destinationColumn.wipLimit
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

  const handleCreateTask = async (
    columnId: string,
    payload: {
      title: string;
      description?: string | null;
      priority?: string;
      dueDate?: string | null;
      assigneeIds?: string[];
      labels?: any[];
      blockers?: any[];
    }
  ) => {
    try {
      const newTask = await boardService.createTask(projectId, columnId, payload.title);
      if (!newTask) return;

      const updatedFields: any = {
        id: newTask.id,
        columnId,
        title: payload.title,
        description: payload.description || undefined,
        priority: payload.priority as any,
        dueDate: payload.dueDate || undefined,
        assignees: payload.assigneeIds?.map((id) => {
          const m = members.find((mem) => mem.userId === id);
          return { id, name: m?.user.name || 'Bilinmeyen' };
        }) ?? [],
      };

      await boardService.updateTask(projectId, updatedFields, { includeAssignees: true });

      if (payload.labels && payload.labels.length > 0) {
        for (const label of payload.labels) {
          await attachLabel({ cardId: newTask.id, labelId: label.id }).unwrap().catch(console.error);
        }
      }

      if (payload.blockers && payload.blockers.length > 0) {
        for (const blocker of payload.blockers) {
          await addDependency({ cardId: newTask.id, blockerId: blocker.id }).unwrap().catch(console.error);
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

  const handleDeleteTask = async (taskId: string) => {
    try {
      await boardService.deleteTask(projectId, taskId);
      refetchLabels();
      setBoardData((prev) => {
        if (!prev) return prev;
        
        const newColumns = removeCard(prev.columns, taskId);

        const newTasks = { ...prev.tasks };
        delete newTasks[taskId];

        return {
          ...prev,
          columns: newColumns,
          tasks: newTasks,
        };
      });
    } catch (error) {
      console.error("Görev silinirken hata:", error);
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
              taskIds: [],
            },
          },
        };
      });
      
      toast.success('Yeni sütun başarıyla eklendi');
      setIsAddingColumn(false);
      setNewColumnName('');
    } catch (error: any) {
      toast.error(error?.message || 'Sütun eklenemedi');
    } finally {
      setIsCreatingColumn(false);
    }
  };

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
      toast.error(error?.message || 'Sütun adı güncellenemedi.');
    }
  }, [isAdmin]);

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
      toast.success('Sütun silindi.');
    } catch (error: any) {
      toast.error(error?.message || 'Sütun silinemedi.');
    }
  }, [isAdmin]);

  if (loading) {
    return <div className="p-8 text-center text-muted-foreground">Board yükleniyor...</div>;
  }

  if (!boardData) {
    return <div className="p-8 text-center text-destructive">Veriler yüklenemedi.</div>;
  }

  return (
    <div className="flex flex-col h-full min-h-0">
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

      <div className="flex-1 min-h-0 flex gap-4 sm:gap-6 relative overflow-hidden">
        <DndContext
          sensors={sensors}
          collisionDetection={collisionDetectionFn}
          onDragStart={handleDragStart}
          onDragEnd={handleDragEnd}
        >
          <div className="flex-1 min-h-0 flex gap-4 overflow-x-auto pt-1 pb-4 px-4 no-scrollbar">
            {Object.values(boardData.columns).map((column) => {
              // Guvenlik agi: placeCard/removeCard zaten tekrari engelliyor ama
              // acik bir oturumda state bozulmussa React'in "same key" uyarisi
              // yerine kart tek kez cizilsin.
              const allColumnTasks = Array.from(new Set(column.taskIds))
                .map((taskId) => boardData.tasks[taskId])
                .filter((task): task is Task => task !== undefined);
              const columnTasks = hasActiveFilters
                ? allColumnTasks.filter(matchesFilters)
                : allColumnTasks;

              return (
                <BoardColumn
                  key={column.id}
                  id={column.id}
                  title={column.title}
                  tasks={columnTasks}
                  totalCount={hasActiveFilters ? allColumnTasks.length : undefined}
                  wipLimit={column.wipLimit}
                  canAddTask={canAddTask}
                  isAdmin={!!isAdmin}
                  onAddTask={handleAddTask}
                  onTaskClick={handleTaskClick}
                  onRenameColumn={isAdmin ? handleRenameColumn : undefined}
                  onDeleteColumn={isAdmin ? handleDeleteColumn : undefined}
                  conflicts={conflicts}
                />
              );
            })}

            {isAdmin && (
              <div className="w-72 shrink-0 select-none">
                {isAddingColumn ? (
                  <form onSubmit={handleCreateColumn} className="bg-background/80 backdrop-blur-md rounded-xl p-3 border border-border/80 shadow-md space-y-2">
                    <input
                      type="text"
                      value={newColumnName}
                      onChange={(e) => setNewColumnName(e.target.value)}
                      placeholder="Sütun başlığı girin..."
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
                        {isCreatingColumn ? 'Ekleniyor...' : 'Sütun Ekle'}
                      </button>
                      <button
                        type="button"
                        onClick={() => {
                          setIsAddingColumn(false);
                          setNewColumnName('');
                        }}
                        className="px-3 py-1 bg-muted hover:bg-muted/80 text-foreground rounded-lg text-xs font-semibold transition-all active:scale-95"
                      >
                        İptal
                      </button>
                    </div>
                  </form>
                ) : (
                  <button
                    onClick={() => setIsAddingColumn(true)}
                    className="w-full h-12 flex items-center justify-center gap-2 rounded-xl border border-dashed border-border hover:border-primary/50 hover:bg-accent/40 text-muted-foreground hover:text-foreground transition-all duration-300 font-medium text-sm group cursor-pointer"
                  >
                    <span className="text-lg group-hover:scale-110 transition-transform">+</span>
                    <span>Yeni Sütun Ekle</span>
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
              <div className="w-80 lg:w-[350px] rounded-2xl border-2 border-primary/50 bg-primary/5 p-3 shadow-2xl backdrop-blur-sm cursor-grabbing">
                <div className="flex items-center gap-2 text-sm font-semibold text-foreground/70">
                  <GripVerticalIcon className="h-4 w-4 text-primary" />
                  {boardData.columns[gripToColumnId(activeId as string)]?.title || 'Sütun'}
                </div>
              </div>
            ) : null}
          </DragOverlay>
        </DndContext>

        {/* AI Chat drawer overlay (desktop) */}
        {isDesktopChatOpen && (
          <div className="hidden sm:block shrink-0 h-full pt-1 pb-4 pr-4 sm:pr-6 pl-0">
            <div className="h-full w-80 lg:w-[420px] xl:w-[480px] shadow-2xl rounded-xl overflow-hidden border border-border">
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
            title="AI Asistanı Aç"
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

      <TaskModal
        isOpen={isModalOpen}
        onClose={() => {
          setIsModalOpen(false);
          setSelectedTaskId(null);
          setCreateRequestColumnId(null);
          setInitialTitle('');
        }}
        taskId={selectedTaskId}
        orgId={orgId}
        projectId={projectId}
        availableCards={Object.values(boardData.tasks).map((t) => ({ id: t.id, title: t.title }))}
        fetchTaskDetails={(id) => boardService.getTaskDetails(projectId, id)}
        onUpdateTask={handleUpdateTask}
        onDeleteTask={handleDeleteTask}
        columnId={createRequestColumnId}
        initialTitle={initialTitle}
        onCreateTask={handleCreateTask}
        conflict={selectedTaskId ? conflicts[selectedTaskId] : undefined}
      />
    </div>
  );
};
