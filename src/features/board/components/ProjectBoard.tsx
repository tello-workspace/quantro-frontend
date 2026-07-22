// src/features/board/components/ProjectBoard.tsx
'use client';

import React, { useState, useEffect } from 'react';
import {
  closestCenter,
  DndContext,
  DragEndEvent,
  DragStartEvent,
  PointerSensor,
  useSensor,
  useSensors
} from '@dnd-kit/core';
import { BoardColumn } from './BoardColumn';
import { BoardFilters } from './BoardFilters';
import { boardService, Task, BoardData, TaskAssignee, Priority } from '../services/boardService';
import { TaskModal } from '@/components/ui/TaskModal';
import { useGetOrganizationByIdQuery } from '@/features/organizations/organizationsApi';
import { useGetLabelsQuery } from '@/features/labels/labelsApi';
import { getSocket } from '@/lib/socket';

interface ProjectBoardProps {
  projectId: string;
  orgId: string;
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

export const ProjectBoard: React.FC<ProjectBoardProps> = ({ projectId, orgId }) => {
  const [boardData, setBoardData] = useState<BoardData | null>(null);
  const [loading, setLoading] = useState<boolean>(true);
  const [, setActiveId] = useState<string | null>(null);

  // Kart ekleme sadece ADMIN'e acik; suruklemeyi (kart tasima) herkes yapabilir
  const { data: org } = useGetOrganizationByIdQuery({ orgId }, { skip: !orgId });
  const canAddTask = org?.myRole === 'ADMIN';
  const members = org?.members ?? [];

  const { data: labels = [] } = useGetLabelsQuery({ orgId, projectId }, { skip: !orgId || !projectId });

  const [isModalOpen, setIsModalOpen] = useState(false);
  const [selectedTaskId, setSelectedTaskId] = useState<string | null>(null);

  const [search, setSearch] = useState('');
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

  const sensors = useSensors(
    useSensor(PointerSensor, {
      activationConstraint: { distance: 5 },
    })
  );

  useEffect(() => {
    boardService.getBoardData(projectId)
      .then((data) => setBoardData(data))
      .catch((err) => console.error(err))
      .finally(() => setLoading(false));
  }, [projectId]);

  // Board'u ayni anda acmis diger kullanicilarin kart/kolon islemlerini anlik yansit.
  // Kendi eylemlerimiz zaten optimistic olarak uygulandigi icin handler'lar idempotent:
  // veri zaten mevcutsa (id/taskId eslesiyorsa) tekrar uygulanmaz.
  useEffect(() => {
    const socket = getSocket();
    if (!socket) return;

    socket.emit('join:project', projectId);

    const handleCardCreated = (payload: CardSocketPayload) => {
      if (payload.projectId !== projectId) return;
      setBoardData((prev) => {
        if (!prev || prev.tasks[payload.id]) return prev;
        const column = prev.columns[payload.columnId];
        if (!column) return prev;
        return {
          ...prev,
          tasks: {
            ...prev.tasks,
            [payload.id]: {
              id: payload.id,
              title: payload.title,
              description: payload.description ?? undefined,
              dueDate: payload.dueDate ?? undefined,
              columnId: payload.columnId,
              position: payload.position,
              assignees: payload.assignees ?? [],
              labels: [],
            },
          },
          columns: {
            ...prev.columns,
            [payload.columnId]: { ...column, taskIds: [...column.taskIds, payload.id] },
          },
        };
      });
    };

    const handleCardUpdated = (payload: CardSocketPayload) => {
      if (payload.projectId !== projectId) return;
      setBoardData((prev) => {
        const existing = prev?.tasks[payload.id];
        if (!prev || !existing) return prev;
        return {
          ...prev,
          tasks: {
            ...prev.tasks,
            [payload.id]: {
              ...existing,
              title: payload.title,
              description: payload.description ?? undefined,
              dueDate: payload.dueDate ?? undefined,
              assignees: payload.assignees ?? existing.assignees,
            },
          },
        };
      });
    };

    const handleCardMoved = (payload: CardMovedPayload) => {
      if (payload.projectId !== projectId) return;
      setBoardData((prev) => {
        if (!prev) return prev;
        const from = prev.columns[payload.fromColumnId];
        const to = prev.columns[payload.toColumnId];
        if (!from || !to || to.taskIds.includes(payload.cardId)) return prev;
        const existingTask = prev.tasks[payload.cardId];
        return {
          ...prev,
          tasks: existingTask
            ? { ...prev.tasks, [payload.cardId]: { ...existingTask, columnId: payload.toColumnId } }
            : prev.tasks,
          columns: {
            ...prev.columns,
            [from.id]: { ...from, taskIds: from.taskIds.filter((id) => id !== payload.cardId) },
            [to.id]: { ...to, taskIds: [...to.taskIds, payload.cardId] },
          },
        };
      });
    };

    const handleCardDeleted = (payload: CardDeletedPayload) => {
      if (payload.projectId !== projectId) return;
      setBoardData((prev) => {
        if (!prev || !prev.tasks[payload.cardId]) return prev;
        const newTasks = { ...prev.tasks };
        delete newTasks[payload.cardId];
        const newColumns = { ...prev.columns };
        for (const colId of Object.keys(newColumns)) {
          if (newColumns[colId].taskIds.includes(payload.cardId)) {
            newColumns[colId] = {
              ...newColumns[colId],
              taskIds: newColumns[colId].taskIds.filter((id) => id !== payload.cardId),
            };
          }
        }
        return { ...prev, tasks: newTasks, columns: newColumns };
      });
    };

    const handleColumnCreated = (payload: ColumnSocketPayload) => {
      if (payload.projectId !== projectId) return;
      setBoardData((prev) => {
        if (!prev || prev.columns[payload.id]) return prev;
        return {
          ...prev,
          columns: {
            ...prev.columns,
            [payload.id]: { id: payload.id, title: payload.name, wipLimit: payload.wipLimit, taskIds: [] },
          },
        };
      });
    };

    const handleColumnUpdated = (payload: ColumnSocketPayload) => {
      if (payload.projectId !== projectId) return;
      setBoardData((prev) => {
        const existing = prev?.columns[payload.id];
        if (!prev || !existing) return prev;
        return {
          ...prev,
          columns: {
            ...prev.columns,
            [payload.id]: { ...existing, title: payload.name, wipLimit: payload.wipLimit },
          },
        };
      });
    };

    const handleColumnDeleted = (payload: ColumnDeletedPayload) => {
      if (payload.projectId !== projectId) return;
      setBoardData((prev) => {
        if (!prev || !prev.columns[payload.columnId]) return prev;
        const newColumns = { ...prev.columns };
        delete newColumns[payload.columnId];
        return { ...prev, columns: newColumns };
      });
    };

    socket.on('card:created', handleCardCreated);
    socket.on('card:updated', handleCardUpdated);
    socket.on('card:moved', handleCardMoved);
    socket.on('card:deleted', handleCardDeleted);
    socket.on('column:created', handleColumnCreated);
    socket.on('column:updated', handleColumnUpdated);
    socket.on('column:deleted', handleColumnDeleted);

    return () => {
      socket.emit('leave:project', projectId);
      socket.off('card:created', handleCardCreated);
      socket.off('card:updated', handleCardUpdated);
      socket.off('card:moved', handleCardMoved);
      socket.off('card:deleted', handleCardDeleted);
      socket.off('column:created', handleColumnCreated);
      socket.off('column:updated', handleColumnUpdated);
      socket.off('column:deleted', handleColumnDeleted);
    };
  }, [projectId]);

  const handleDragStart = (event: DragStartEvent) => {
    setActiveId(event.active.id as string);
  };

  const handleDragEnd = async (event: DragEndEvent) => {
    const { active, over } = event;
    setActiveId(null);

    if (!over || !boardData) return;

    const activeTaskId = active.id as string;
    const overId = over.id as string;
    if (activeTaskId === overId) return;

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
      alert(`Bu sütun için WIP limiti (${destinationColumn.wipLimit}) doludur!`);
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

    let newPosition: number;
    if (prevPos !== undefined && nextPos !== undefined) newPosition = (prevPos + nextPos) / 2;
    else if (prevPos !== undefined) newPosition = prevPos + 1;
    else if (nextPos !== undefined) newPosition = nextPos / 2;
    else newPosition = 1;

    const previousBoardData = boardData;

    setBoardData((prev) => {
      if (!prev) return prev;
      const existingTask = prev.tasks[activeTaskId];
      return {
        ...prev,
        tasks: existingTask
          ? {
              ...prev.tasks,
              [activeTaskId]: { ...existingTask, columnId: destinationColumn.id, position: newPosition },
            }
          : prev.tasks,
        columns: {
          ...prev.columns,
          [sourceColumn.id]: { ...sourceColumn, taskIds: sourceTaskIds },
          [destinationColumn.id]: { ...destinationColumn, taskIds: destTaskIds },
        },
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
    try {
      const newTask = await boardService.createTask(projectId, columnId, title);
      if (!newTask) return;

      setBoardData((prev) => {
        if (!prev) return prev;
        const column = prev.columns[columnId];
        // card:created socket eventi REST cevabindan once gelmis olabilir
        // (uzak DB nedeniyle REST daha yavas donebiliyor) - tekrar eklemeyi onle
        if (column.taskIds.includes(newTask.id)) return prev;
        return {
          ...prev,
          tasks: {
            ...prev.tasks,
            [newTask.id]: newTask,
          },
          columns: {
            ...prev.columns,
            [columnId]: {
              ...column,
              taskIds: [...column.taskIds, newTask.id],
            },
          },
        };
      });
    } catch (error) {
      console.error("Kart eklenirken hata oluştu:", error);
    }
  };

  const handleTaskClick = (taskId: string) => {
    setSelectedTaskId(taskId);
    setIsModalOpen(true);
  };

  const handleUpdateTask = async (updatedTask: Task) => {
    try {
      await boardService.updateTask(projectId, updatedTask);
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
    }
  };

  const handleDeleteTask = async (taskId: string) => {
    try {
      await boardService.deleteTask(projectId, taskId);
      setBoardData((prev) => {
        if (!prev) return prev;
        
        const newColumns = { ...prev.columns };
        for (const colId of Object.keys(newColumns)) {
          newColumns[colId] = {
            ...newColumns[colId],
            taskIds: newColumns[colId].taskIds.filter((id) => id !== taskId),
          };
        }

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

  if (loading) {
    return <div className="p-8 text-center text-zinc-500">Board yükleniyor...</div>;
  }

  if (!boardData) {
    return <div className="p-8 text-center text-red-500">Veriler yüklenemedi.</div>;
  }

  return (
    <>
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

      <DndContext
        sensors={sensors}
        collisionDetection={closestCenter}
        onDragStart={handleDragStart}
        onDragEnd={handleDragEnd}
      >
        <div className="flex gap-4 overflow-x-auto p-4 h-[calc(100vh-170px)]">
          {Object.values(boardData.columns).map((column) => {
            const allColumnTasks = column.taskIds
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
                canAddTask={!!canAddTask}
                onAddTask={handleAddTask}
                onTaskClick={handleTaskClick}
              />
            );
          })}
        </div>
      </DndContext>

      <TaskModal
        isOpen={isModalOpen}
        onClose={() => setIsModalOpen(false)}
        taskId={selectedTaskId}
        orgId={orgId}
        projectId={projectId}
        availableCards={Object.values(boardData.tasks).map((t) => ({ id: t.id, title: t.title }))}
        fetchTaskDetails={(id) => boardService.getTaskDetails(projectId, id)}
        onUpdateTask={handleUpdateTask}
        onDeleteTask={handleDeleteTask}
      />
    </>
  );
};
