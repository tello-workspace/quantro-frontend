// src/components/ui/TaskModal.tsx
'use client';

import React, { Fragment, useEffect, useState } from 'react';
import { Dialog, Transition } from '@headlessui/react';
import { XMarkIcon, CalendarDaysIcon, TrashIcon, TagIcon, LinkIcon } from '@heroicons/react/24/outline';
import { Task, TaskLabel, DependencyCard } from '@/features/board/services/boardService';
import { useGetOrganizationByIdQuery } from '@/features/organizations/organizationsApi';
import { useGetMeQuery } from '@/features/auth/meApi';
import {
  useGetLabelsQuery,
  useCreateLabelMutation,
  useAttachLabelMutation,
  useDetachLabelMutation,
} from '@/features/labels/labelsApi';
import {
  useGetCommentsQuery,
  useCreateCommentMutation,
  useUpdateCommentMutation,
  useDeleteCommentMutation,
} from '@/features/comments/commentsApi';
import { useAddDependencyMutation, useRemoveDependencyMutation } from '@/features/dependencies/dependenciesApi';
import { toast } from 'react-toastify';

const NEW_LABEL_COLORS = ['#EF4444', '#F59E0B', '#10B981', '#3B82F6', '#8B5CF6', '#EC4899'];

function timeAgo(dateStr: string): string {
  const diffMs = Date.now() - new Date(dateStr).getTime();
  const mins = Math.floor(diffMs / 60000);
  if (mins < 1) return 'az önce';
  if (mins < 60) return `${mins} dk önce`;
  const hours = Math.floor(mins / 60);
  if (hours < 24) return `${hours} sa önce`;
  const days = Math.floor(hours / 24);
  return `${days} gün önce`;
}

const CommentsSection: React.FC<{ cardId: string }> = ({ cardId }) => {
  const { data: me } = useGetMeQuery();
  const { data: comments = [] } = useGetCommentsQuery(cardId);
  const [createComment, { isLoading: isPosting }] = useCreateCommentMutation();
  const [updateComment] = useUpdateCommentMutation();
  const [deleteComment] = useDeleteCommentMutation();

  const [newText, setNewText] = useState('');
  const [editingId, setEditingId] = useState<string | null>(null);
  const [editText, setEditText] = useState('');

  const handlePost = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!newText.trim()) return;
    try {
      await createComment({ cardId, text: newText.trim() }).unwrap();
      setNewText('');
    } catch {
      toast.error('Yorum eklenemedi.');
    }
  };

  const startEditing = (commentId: string, text: string) => {
    setEditingId(commentId);
    setEditText(text);
  };

  const handleSaveEdit = async (commentId: string) => {
    if (!editText.trim()) return;
    try {
      await updateComment({ commentId, cardId, text: editText.trim() }).unwrap();
      setEditingId(null);
    } catch {
      toast.error('Yorum güncellenemedi.');
    }
  };

  const handleDelete = async (commentId: string) => {
    if (!window.confirm('Bu yorumu silmek istediğinizden emin misiniz?')) return;
    try {
      await deleteComment({ commentId, cardId }).unwrap();
    } catch {
      toast.error('Yorum silinemedi.');
    }
  };

  return (
    <div>
      <label className="block text-sm font-medium text-zinc-600 dark:text-zinc-400 mb-1.5">
        Yorumlar {comments.length > 0 && `(${comments.length})`}
      </label>

      <div className="space-y-3 max-h-56 overflow-y-auto mb-3 pr-1">
        {comments.length === 0 && (
          <p className="text-xs text-zinc-400">Henüz yorum yok.</p>
        )}
        {comments.map((c) => (
          <div key={c.id} className="text-sm">
            <div className="flex items-center gap-2">
              <span className="font-medium text-zinc-700 dark:text-zinc-200 text-xs">{c.author.name}</span>
              <span className="text-xs text-zinc-400">{timeAgo(c.createdAt)}</span>
            </div>

            {editingId === c.id ? (
              <div className="mt-1 space-y-1">
                <textarea
                  value={editText}
                  onChange={(e) => setEditText(e.target.value)}
                  rows={2}
                  className="w-full text-sm p-2 rounded-lg border border-zinc-300 dark:border-zinc-700 bg-zinc-50 dark:bg-zinc-900 text-zinc-800 dark:text-zinc-100 focus:outline-none focus:ring-1 focus:ring-blue-500 resize-none"
                />
                <div className="flex gap-2">
                  <button
                    type="button"
                    onClick={() => handleSaveEdit(c.id)}
                    className="text-xs font-medium text-blue-600 hover:underline"
                  >
                    Kaydet
                  </button>
                  <button
                    type="button"
                    onClick={() => setEditingId(null)}
                    className="text-xs text-zinc-500 hover:underline"
                  >
                    İptal
                  </button>
                </div>
              </div>
            ) : (
              <div className="flex items-start justify-between gap-2 mt-0.5">
                <p className="text-zinc-700 dark:text-zinc-300 whitespace-pre-wrap">{c.text}</p>
                {c.authorId === me?.id && (
                  <div className="flex gap-1.5 shrink-0">
                    <button
                      type="button"
                      onClick={() => startEditing(c.id, c.text)}
                      className="text-xs text-zinc-400 hover:text-zinc-600 dark:hover:text-zinc-200"
                    >
                      Düzenle
                    </button>
                    <button
                      type="button"
                      onClick={() => handleDelete(c.id)}
                      className="text-xs text-zinc-400 hover:text-red-500"
                    >
                      Sil
                    </button>
                  </div>
                )}
              </div>
            )}
          </div>
        ))}
      </div>

      <form onSubmit={handlePost} className="flex gap-2">
        <input
          type="text"
          value={newText}
          onChange={(e) => setNewText(e.target.value)}
          placeholder="Bir yorum yaz..."
          className="flex-1 text-sm px-3 py-1.5 rounded-lg border border-zinc-300 dark:border-zinc-700 bg-zinc-50 dark:bg-zinc-900 text-zinc-800 dark:text-zinc-100 focus:outline-none focus:ring-1 focus:ring-blue-500"
        />
        <button
          type="submit"
          disabled={isPosting || !newText.trim()}
          className="px-3 py-1.5 text-sm font-medium text-white bg-blue-600 rounded-lg hover:bg-blue-700 disabled:opacity-50"
        >
          Gönder
        </button>
      </form>
    </div>
  );
};

interface TaskModalProps {
  taskId: string | null;
  isOpen: boolean;
  onClose: () => void;
  orgId: string;
  projectId: string;
  onUpdateTask: (task: Task) => void;
  onDeleteTask: (taskId: string) => void;
  fetchTaskDetails: (taskId: string) => Promise<Task>;
  availableCards?: DependencyCard[];
}

export const TaskModal: React.FC<TaskModalProps> = ({
  taskId,
  isOpen,
  onClose,
  orgId,
  projectId,
  onUpdateTask,
  onDeleteTask,
  fetchTaskDetails,
  availableCards = [],
}) => {
  const [task, setTask] = useState<Task | null>(null);
  const [loading, setLoading] = useState(false);
  const [showLabelPicker, setShowLabelPicker] = useState(false);
  const [newLabelName, setNewLabelName] = useState('');
  const [newLabelColor, setNewLabelColor] = useState(NEW_LABEL_COLORS[0]);
  const [showAssigneePicker, setShowAssigneePicker] = useState(false);
  const [showDependencyPicker, setShowDependencyPicker] = useState(false);

  const { data: org } = useGetOrganizationByIdQuery({ orgId }, { skip: !orgId || !isOpen });
  const members = org?.members ?? [];
  const isAdmin = org?.myRole === 'ADMIN';

  const { data: availableLabels = [] } = useGetLabelsQuery(
    { orgId, projectId },
    { skip: !orgId || !projectId || !isOpen },
  );
  const [createLabel, { isLoading: isCreatingLabel }] = useCreateLabelMutation();
  const [attachLabel] = useAttachLabelMutation();
  const [detachLabel] = useDetachLabelMutation();
  const [addDependency] = useAddDependencyMutation();
  const [removeDependency] = useRemoveDependencyMutation();

  useEffect(() => {
    if (taskId && isOpen) {
      setLoading(true);
      fetchTaskDetails(taskId)
        .then((data) => setTask(data))
        .catch((err) => console.error('Görev detayları yüklenemedi:', err))
        .finally(() => setLoading(false));
    } else if (!isOpen) {
      setTask(null);
    }
  }, [taskId, isOpen, fetchTaskDetails]);

  const handleChange = (e: React.ChangeEvent<HTMLInputElement | HTMLTextAreaElement | HTMLSelectElement>) => {
    if (!task) return;
    const { name, value } = e.target;
    setTask({ ...task, [name]: value });
  };

  const handleToggleAssignee = (userId: string) => {
    if (!task) return;
    const current = task.assignees ?? [];
    const isAssigned = current.some((a) => a.id === userId);

    if (isAssigned) {
      setTask({ ...task, assignees: current.filter((a) => a.id !== userId) });
      return;
    }

    const member = members.find((m) => m.userId === userId);
    if (!member) return;
    setTask({ ...task, assignees: [...current, { id: userId, name: member.user.name }] });
  };

  const handleSave = () => {
    if (task) {
      onUpdateTask(task);
      onClose();
    }
  };

  const handleAttachLabel = async (label: TaskLabel) => {
    if (!task) return;
    try {
      await attachLabel({ cardId: task.id, labelId: label.id }).unwrap();
      setTask({ ...task, labels: [...(task.labels ?? []), label] });
      setShowLabelPicker(false);
    } catch {
      toast.error('Etiket eklenemedi.');
    }
  };

  const handleDetachLabel = async (labelId: string) => {
    if (!task) return;
    try {
      await detachLabel({ cardId: task.id, labelId }).unwrap();
      setTask({ ...task, labels: (task.labels ?? []).filter((l) => l.id !== labelId) });
    } catch {
      toast.error('Etiket kaldırılamadı.');
    }
  };

  const handleCreateLabel = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!task || !newLabelName.trim()) return;
    try {
      const label = await createLabel({
        orgId,
        projectId,
        name: newLabelName.trim(),
        color: newLabelColor,
      }).unwrap();
      await handleAttachLabel(label);
      setNewLabelName('');
    } catch {
      toast.error('Etiket oluşturulamadı.');
    }
  };

  const handleAddDependency = async (blockerId: string) => {
    if (!task) return;
    try {
      await addDependency({ cardId: task.id, blockerId }).unwrap();
      const refreshed = await fetchTaskDetails(task.id);
      setTask(refreshed);
      setShowDependencyPicker(false);
    } catch (err) {
      const apiError = err as { data?: { error?: { message?: string } } };
      toast.error(apiError?.data?.error?.message || 'Bağımlılık eklenemedi.');
    }
  };

  const handleRemoveDependency = async (cardId: string, blockerId: string) => {
    if (!task) return;
    try {
      await removeDependency({ cardId, blockerId }).unwrap();
      const refreshed = await fetchTaskDetails(task.id);
      setTask(refreshed);
    } catch {
      toast.error('Bağımlılık kaldırılamadı.');
    }
  };

  const handleDelete = () => {
    if (task && window.confirm('Bu görevi silmek istediğinizden emin misiniz?')) {
      onDeleteTask(task.id);
      onClose();
    }
  };

  if (!isOpen) return null;

  return (
    <Transition appear show={isOpen} as={Fragment}>
      <Dialog as="div" className="relative z-50" onClose={onClose}>
        <Transition.Child
          as={Fragment}
          enter="ease-out duration-300"
          enterFrom="opacity-0"
          enterTo="opacity-100"
          leave="ease-in duration-200"
          leaveFrom="opacity-100"
          leaveTo="opacity-0"
        >
          <div className="fixed inset-0 bg-black/60" aria-hidden="true" />
        </Transition.Child>

        <div className="fixed inset-0 overflow-y-auto">
          <div className="flex min-h-full items-center justify-center p-4 text-center">
            <Transition.Child
              as={Fragment}
              enter="ease-out duration-300"
              enterFrom="opacity-0 scale-95"
              enterTo="opacity-100 scale-100"
              leave="ease-in duration-200"
              leaveFrom="opacity-100 scale-100"
              leaveTo="opacity-0 scale-95"
            >
              <Dialog.Panel className="w-full max-w-xl transform overflow-hidden rounded-2xl bg-white dark:bg-zinc-950 p-6 text-left align-middle shadow-xl transition-all border border-zinc-200 dark:border-zinc-800">
                {loading ? (
                  <div className="text-center py-10 text-zinc-500">Yükleniyor...</div>
                ) : task ? (
                  <>
                    <div className="flex justify-between items-start mb-5">
                      <Dialog.Title as="h3" className="text-lg font-semibold leading-6 text-zinc-900 dark:text-zinc-50 w-full mr-4">
                        <input
                          type="text"
                          name="title"
                          value={task.title}
                          onChange={handleChange}
                          className="w-full bg-transparent focus:outline-none focus:ring-1 focus:ring-blue-500 rounded px-1 -mx-1"
                          placeholder="Görev Başlığı"
                        />
                      </Dialog.Title>
                      <button
                        type="button"
                        className="rounded-full p-1 text-zinc-400 hover:text-zinc-600 dark:hover:text-zinc-300"
                        onClick={onClose}
                      >
                        <XMarkIcon className="h-6 w-6" aria-hidden="true" />
                      </button>
                    </div>

                    <div className="mt-4 space-y-6">
                      <div>
                        <label className="block text-sm font-medium text-zinc-600 dark:text-zinc-400 mb-1.5">
                          Etiketler
                        </label>
                        <div className="flex flex-wrap items-center gap-1.5">
                          {(task.labels ?? []).map((label) => (
                            <span
                              key={label.id}
                              className="flex items-center gap-1 pl-2 pr-1 py-0.5 rounded text-xs font-medium text-white"
                              style={{ backgroundColor: label.color }}
                            >
                              {label.name}
                              <button
                                type="button"
                                onClick={() => handleDetachLabel(label.id)}
                                className="hover:bg-black/20 rounded p-0.5"
                                aria-label={`${label.name} etiketini kaldır`}
                              >
                                <XMarkIcon className="h-3 w-3" />
                              </button>
                            </span>
                          ))}

                          <div className="relative">
                            <button
                              type="button"
                              onClick={() => setShowLabelPicker((v) => !v)}
                              className="flex items-center gap-1 px-2 py-0.5 rounded text-xs font-medium text-zinc-500 dark:text-zinc-400 border border-dashed border-zinc-300 dark:border-zinc-700 hover:border-zinc-400"
                            >
                              <TagIcon className="h-3 w-3" />
                              Etiket
                            </button>

                            {showLabelPicker && (
                              <div className="absolute z-10 mt-2 w-56 rounded-lg border border-zinc-200 dark:border-zinc-700 bg-white dark:bg-zinc-900 shadow-lg p-2">
                                <div className="max-h-32 overflow-y-auto space-y-1 mb-2">
                                  {availableLabels
                                    .filter((l) => !(task.labels ?? []).some((tl) => tl.id === l.id))
                                    .map((label) => (
                                      <button
                                        key={label.id}
                                        type="button"
                                        onClick={() => handleAttachLabel(label)}
                                        className="flex items-center gap-2 w-full px-2 py-1 rounded text-xs text-left hover:bg-zinc-100 dark:hover:bg-zinc-800"
                                      >
                                        <span className="w-3 h-3 rounded-full shrink-0" style={{ backgroundColor: label.color }} />
                                        <span className="text-zinc-700 dark:text-zinc-200">{label.name}</span>
                                      </button>
                                    ))}
                                  {availableLabels.length === 0 && (
                                    <p className="text-xs text-zinc-400 px-2 py-1">Henüz etiket yok.</p>
                                  )}
                                </div>

                                <form onSubmit={handleCreateLabel} className="border-t border-zinc-100 dark:border-zinc-800 pt-2 space-y-1.5">
                                  <input
                                    type="text"
                                    value={newLabelName}
                                    onChange={(e) => setNewLabelName(e.target.value)}
                                    placeholder="Yeni etiket adı"
                                    className="w-full text-xs px-2 py-1 rounded border border-zinc-300 dark:border-zinc-700 bg-zinc-50 dark:bg-zinc-800 text-zinc-800 dark:text-zinc-100"
                                  />
                                  <div className="flex items-center justify-between gap-1">
                                    <div className="flex gap-1">
                                      {NEW_LABEL_COLORS.map((color) => (
                                        <button
                                          key={color}
                                          type="button"
                                          onClick={() => setNewLabelColor(color)}
                                          className={`w-4 h-4 rounded-full ${newLabelColor === color ? 'ring-2 ring-offset-1 ring-zinc-400' : ''}`}
                                          style={{ backgroundColor: color }}
                                          aria-label={color}
                                        />
                                      ))}
                                    </div>
                                    <button
                                      type="submit"
                                      disabled={isCreatingLabel || !newLabelName.trim()}
                                      className="text-xs font-medium text-blue-600 hover:underline disabled:opacity-50"
                                    >
                                      Oluştur
                                    </button>
                                  </div>
                                </form>
                              </div>
                            )}
                          </div>
                        </div>
                      </div>

                      <div>
                        <label htmlFor="description" className="block text-sm font-medium text-zinc-600 dark:text-zinc-400 mb-1">
                          Açıklama
                        </label>
                        <textarea
                          id="description"
                          name="description"
                          rows={5}
                          value={task.description || ''}
                          onChange={handleChange}
                          className="w-full text-sm p-3 rounded-lg border border-zinc-300 dark:border-zinc-700 bg-zinc-50 dark:bg-zinc-900 text-zinc-800 dark:text-zinc-100 focus:outline-none focus:ring-1 focus:ring-blue-500 resize-none"
                          placeholder="Görev için bir açıklama ekleyin..."
                        />
                      </div>

                      <div className="grid grid-cols-2 gap-4 items-center">
                        <div>
                          <label htmlFor="dueDate" className="block text-sm font-medium text-zinc-600 dark:text-zinc-400 mb-1 flex items-center gap-1.5">
                            <CalendarDaysIcon className="h-4 w-4" />
                            Son Teslim Tarihi
                          </label>
                          <input
                            type="date"
                            id="dueDate"
                            name="dueDate"
                            value={task.dueDate || ''}
                            onChange={handleChange}
                            className="w-full text-sm p-2 rounded-lg border border-zinc-300 dark:border-zinc-700 bg-zinc-50 dark:bg-zinc-900 text-zinc-800 dark:text-zinc-100 focus:outline-none focus:ring-1 focus:ring-blue-500"
                          />
                        </div>

                        <div>
                          <label className="block text-sm font-medium text-zinc-600 dark:text-zinc-400 mb-1">
                            Atanan Kişiler
                          </label>

                          <div className="flex flex-wrap items-center gap-1.5">
                            {(task.assignees ?? []).map((a) => (
                              <span
                                key={a.id}
                                className="flex items-center gap-1 pl-2 pr-1 py-0.5 rounded-full text-xs font-medium bg-blue-100 dark:bg-blue-950 text-blue-700 dark:text-blue-300"
                              >
                                {a.name}
                                {isAdmin && (
                                  <button
                                    type="button"
                                    onClick={() => handleToggleAssignee(a.id)}
                                    className="hover:bg-black/10 rounded p-0.5"
                                    aria-label={`${a.name} atamasını kaldır`}
                                  >
                                    <XMarkIcon className="h-3 w-3" />
                                  </button>
                                )}
                              </span>
                            ))}

                            {isAdmin && (
                              <div className="relative">
                                <button
                                  type="button"
                                  onClick={() => setShowAssigneePicker((v) => !v)}
                                  className="px-2 py-0.5 rounded-full text-xs font-medium text-zinc-500 dark:text-zinc-400 border border-dashed border-zinc-300 dark:border-zinc-700 hover:border-zinc-400"
                                >
                                  + Kişi
                                </button>

                                {showAssigneePicker && (
                                  <div className="absolute z-10 mt-2 w-48 rounded-lg border border-zinc-200 dark:border-zinc-700 bg-white dark:bg-zinc-900 shadow-lg p-2 max-h-40 overflow-y-auto">
                                    {members.map((m) => {
                                      const checked = (task.assignees ?? []).some((a) => a.id === m.userId);
                                      return (
                                        <label
                                          key={m.userId}
                                          className="flex items-center gap-2 px-2 py-1 rounded text-xs cursor-pointer hover:bg-zinc-100 dark:hover:bg-zinc-800"
                                        >
                                          <input
                                            type="checkbox"
                                            checked={checked}
                                            onChange={() => handleToggleAssignee(m.userId)}
                                            className="rounded"
                                          />
                                          <span className="text-zinc-700 dark:text-zinc-200">{m.user.name}</span>
                                        </label>
                                      );
                                    })}
                                  </div>
                                )}
                              </div>
                            )}
                          </div>

                          {!isAdmin && (task.assignees ?? []).length === 0 && (
                            <p className="text-xs text-zinc-400 mt-1">Atanan yok</p>
                          )}
                          {!isAdmin && (
                            <p className="text-xs text-zinc-400 mt-1">Sadece adminler atama yapabilir</p>
                          )}
                        </div>
                      </div>

                      <div>
                        <label className="block text-sm font-medium text-zinc-600 dark:text-zinc-400 mb-1.5">
                          Bağımlılıklar
                        </label>

                        {(task.blockedBy ?? []).length > 0 && (
                          <div className="mb-2">
                            <p className="text-xs text-zinc-500 mb-1">Bunlar bitmeden başlanamaz:</p>
                            <div className="flex flex-wrap gap-1.5">
                              {(task.blockedBy ?? []).map((b) => (
                                <span
                                  key={b.id}
                                  className="flex items-center gap-1 pl-2 pr-1 py-0.5 rounded text-xs font-medium bg-orange-100 dark:bg-orange-950 text-orange-700 dark:text-orange-300"
                                >
                                  {b.title}
                                  <button
                                    type="button"
                                    onClick={() => handleRemoveDependency(task.id, b.id)}
                                    className="hover:bg-black/10 rounded p-0.5"
                                    aria-label={`${b.title} bağımlılığını kaldır`}
                                  >
                                    <XMarkIcon className="h-3 w-3" />
                                  </button>
                                </span>
                              ))}
                            </div>
                          </div>
                        )}

                        {(task.blocking ?? []).length > 0 && (
                          <div className="mb-2">
                            <p className="text-xs text-zinc-500 mb-1">Bu kartı bekleyenler:</p>
                            <div className="flex flex-wrap gap-1.5">
                              {(task.blocking ?? []).map((b) => (
                                <span
                                  key={b.id}
                                  className="flex items-center gap-1 pl-2 pr-1 py-0.5 rounded text-xs font-medium bg-zinc-100 dark:bg-zinc-800 text-zinc-600 dark:text-zinc-300"
                                >
                                  {b.title}
                                  <button
                                    type="button"
                                    onClick={() => handleRemoveDependency(b.id, task.id)}
                                    className="hover:bg-black/10 rounded p-0.5"
                                    aria-label={`${b.title} bağımlılığını kaldır`}
                                  >
                                    <XMarkIcon className="h-3 w-3" />
                                  </button>
                                </span>
                              ))}
                            </div>
                          </div>
                        )}

                        <div className="relative inline-block">
                          <button
                            type="button"
                            onClick={() => setShowDependencyPicker((v) => !v)}
                            className="flex items-center gap-1 px-2 py-0.5 rounded text-xs font-medium text-zinc-500 dark:text-zinc-400 border border-dashed border-zinc-300 dark:border-zinc-700 hover:border-zinc-400"
                          >
                            <LinkIcon className="h-3 w-3" />
                            Bağımlılık ekle
                          </button>

                          {showDependencyPicker && (
                            <div className="absolute z-10 mt-2 w-56 rounded-lg border border-zinc-200 dark:border-zinc-700 bg-white dark:bg-zinc-900 shadow-lg p-2">
                              <p className="text-xs text-zinc-400 px-1 pb-1">Hangi kart bitmeden bu başlamasın?</p>
                              <div className="max-h-40 overflow-y-auto space-y-1">
                                {availableCards
                                  .filter(
                                    (c) =>
                                      c.id !== task.id &&
                                      !(task.blockedBy ?? []).some((b) => b.id === c.id),
                                  )
                                  .map((c) => (
                                    <button
                                      key={c.id}
                                      type="button"
                                      onClick={() => handleAddDependency(c.id)}
                                      className="flex w-full px-2 py-1 rounded text-xs text-left hover:bg-zinc-100 dark:hover:bg-zinc-800 text-zinc-700 dark:text-zinc-200"
                                    >
                                      {c.title}
                                    </button>
                                  ))}
                                {availableCards.filter((c) => c.id !== task.id).length === 0 && (
                                  <p className="text-xs text-zinc-400 px-2 py-1">Başka kart yok.</p>
                                )}
                              </div>
                            </div>
                          )}
                        </div>
                      </div>

                      <CommentsSection cardId={task.id} />

                      <p className="text-xs text-zinc-500 dark:text-zinc-600 font-mono">
                          ID: {task.id} | Sütun: {task.columnId}
                      </p>
                    </div>

                    <div className="mt-8 flex justify-between items-center pt-4 border-t border-zinc-100 dark:border-zinc-800">
                      <button
                        type="button"
                        onClick={handleDelete}
                        className="inline-flex items-center gap-1.5 rounded-lg px-3 py-2 text-sm font-medium text-red-500 hover:bg-red-50 dark:hover:bg-red-950/50 transition"
                      >
                        <TrashIcon className="h-4 w-4" />
                        Görevi Sil
                      </button>
                      <div className="flex gap-3">
                          <button
                              type="button"
                              onClick={onClose}
                              className="inline-flex justify-center rounded-lg border border-zinc-300 dark:border-zinc-700 bg-white dark:bg-zinc-950 px-4 py-2 text-sm font-medium text-zinc-700 dark:text-zinc-300 hover:bg-zinc-100 dark:hover:bg-zinc-900 transition"
                          >
                              İptal
                          </button>
                          <button
                              type="button"
                              onClick={handleSave}
                              className="inline-flex justify-center rounded-lg border border-transparent bg-blue-600 px-4 py-2 text-sm font-medium text-white hover:bg-blue-700 transition"
                          >
                              Değişiklikleri Kaydet
                          </button>
                      </div>
                    </div>
                  </>
                ) : (
                  <div className="text-center py-10 text-red-500">Görev yüklenemedi veya bulunamadı.</div>
                )}
              </Dialog.Panel>
            </Transition.Child>
          </div>
        </div>
      </Dialog>
    </Transition>
  );
};