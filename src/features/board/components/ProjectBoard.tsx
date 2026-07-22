// src/features/board/components/ProjectBoard.tsx
'use client';

import React, { useState, useEffect } from 'react';
import { 
  DndContext, 
  DragEndEvent, 
  DragStartEvent, 
  PointerSensor, 
  useSensor, 
  useSensors 
} from '@dnd-kit/core';
import { BoardColumn } from './BoardColumn';
import { boardService, Task, BoardData, TaskAssignee } from '../services/boardService';
import { TaskModal } from '@/components/ui/TaskModal';
import { useGetOrganizationByIdQuery } from '@/features/organizations/organizationsApi';
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

  const [isModalOpen, setIsModalOpen] = useState(false);
  const [selectedTaskId, setSelectedTaskId] = useState<string | null>(null);

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

    const sourceColumn = Object.values(boardData.columns).find((col) =>
      col.taskIds.includes(activeTaskId)
    );

    if (!sourceColumn) return;

    let targetColumnId = overId;
    const targetColumn = Object.values(boardData.columns).find((col) =>
      col.taskIds.includes(overId)
    );

    if (targetColumn) {
      targetColumnId = targetColumn.id;
    }

    const destinationColumn = boardData.columns[targetColumnId];

    if (!destinationColumn || sourceColumn.id === destinationColumn.id) return;

    if (
      destinationColumn.wipLimit && 
      destinationColumn.taskIds.length >= destinationColumn.wipLimit
    ) {
      alert(`Bu sütun için WIP limiti (${destinationColumn.wipLimit}) doludur!`);
      return;
    }

    const sourceTaskIds = sourceColumn.taskIds.filter((id) => id !== activeTaskId);
    const destTaskIds = [...destinationColumn.taskIds, activeTaskId];

    setBoardData((prev) => {
      if (!prev) return prev;
      return {
        ...prev,
        columns: {
          ...prev.columns,
          [sourceColumn.id]: { ...sourceColumn, taskIds: sourceTaskIds },
          [destinationColumn.id]: { ...destinationColumn, taskIds: destTaskIds },
        },
      };
    });

    try {
      await boardService.moveTask(projectId, activeTaskId, destinationColumn.id);
    } catch (error) {
      console.error("Kart taşınırken veritabanı hatası:", error);
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
      <DndContext 
        sensors={sensors} 
        onDragStart={handleDragStart} 
        onDragEnd={handleDragEnd}
      >
        <div className="flex gap-4 overflow-x-auto p-4 h-[calc(100vh-120px)]">
          {Object.values(boardData.columns).map((column) => {
            const columnTasks = column.taskIds
              .map((taskId) => boardData.tasks[taskId])
              .filter((task): task is Task => task !== undefined);

            return (
              <BoardColumn
                key={column.id}
                id={column.id}
                title={column.title}
                tasks={columnTasks}
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
        fetchTaskDetails={(id) => boardService.getTaskDetails(projectId, id)}
        onUpdateTask={handleUpdateTask}
        onDeleteTask={handleDeleteTask}
      />
    </>
  );
};
