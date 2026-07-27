// src/components/ui/TaskModal.tsx
'use client';

import React, { useEffect, useState } from 'react';
import { XMarkIcon, CalendarDaysIcon, TrashIcon, TagIcon, LinkIcon, SparklesIcon } from '@heroicons/react/24/outline';
import { Task, TaskLabel, DependencyCard } from '@/features/board/services/boardService';
import { useGetOrganizationByIdQuery } from '@/features/organizations/organizationsApi';
import { useGetMeQuery } from '@/features/auth/meApi';
import { useFillCardWithAiMutation } from '@/features/ai/aiApi';
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
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Textarea } from '@/components/ui/textarea';
import { Badge } from '@/components/ui/badge';
import { Avatar, AvatarFallback } from '@/components/ui/avatar';
import {
  Dialog,
  DialogContent,
  DialogHeader,
  DialogTitle,
  DialogDescription,
  DialogFooter,
} from '@/components/ui/dialog';

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
      <label className="block text-sm font-medium text-muted-foreground mb-1.5">
        Yorumlar {comments.length > 0 && `(${comments.length})`}
      </label>

      <div className="space-y-3 max-h-56 overflow-y-auto mb-3 pr-1">
        {comments.length === 0 && (
          <p className="text-xs text-muted-foreground">Henüz yorum yok.</p>
        )}
        {comments.map((c) => (
          <div key={c.id} className="text-sm">
            <div className="flex items-center gap-2">
              <span className="font-medium text-foreground text-xs">{c.author.name}</span>
              <span className="text-xs text-muted-foreground">{timeAgo(c.createdAt)}</span>
            </div>

            {editingId === c.id ? (
              <div className="mt-1 space-y-1">
                <Textarea
                  value={editText}
                  onChange={(e) => setEditText(e.target.value)}
                  rows={2}
                />
                <div className="flex gap-2">
                  <Button size="xs" onClick={() => handleSaveEdit(c.id)}>
                    Kaydet
                  </Button>
                  <Button size="xs" variant="ghost" onClick={() => setEditingId(null)}>
                    İptal
                  </Button>
                </div>
              </div>
            ) : (
              <div className="flex items-start justify-between gap-2 mt-0.5">
                <p className="text-muted-foreground whitespace-pre-wrap">{c.text}</p>
                {c.authorId === me?.id && (
                  <div className="flex gap-1.5 shrink-0">
                    <button
                      type="button"
                      onClick={() => startEditing(c.id, c.text)}
                      className="text-xs text-muted-foreground hover:text-foreground"
                    >
                      Düzenle
                    </button>
                    <button
                      type="button"
                      onClick={() => handleDelete(c.id)}
                      className="text-xs text-muted-foreground hover:text-destructive"
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
        <Input
          type="text"
          value={newText}
          onChange={(e) => setNewText(e.target.value)}
          placeholder="Bir yorum yaz..."
          className="flex-1"
        />
        <Button type="submit" disabled={isPosting || !newText.trim()} size="sm">
          Gönder
        </Button>
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
  const [fillCardWithAi, { isLoading: isFilling }] = useFillCardWithAiMutation();

  const handleAiFill = async () => {
    if (!task || !task.title.trim()) return;
    try {
      const result = await fillCardWithAi({ projectId, title: task.title.trim() }).unwrap();
      const updatedFields: Partial<Task> = {
        description: result.description,
        priority: result.priority,
      };

      if (result.dueDate) {
        updatedFields.dueDate = result.dueDate;
      }

      if (result.suggestedAssigneeId) {
        const member = members.find((m) => m.userId === result.suggestedAssigneeId);
        if (member) {
          updatedFields.assignees = [{ id: member.userId, name: member.user.name }];
        }
      }

      setTask({
        ...task,
        ...updatedFields,
      });
      toast.success('AI doldurma başarılı!');
    } catch {
      toast.error('AI ile doldurma başarısız oldu.');
    }
  };

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
      await detachLabel({ cardId: task.id, labelId, projectId }).unwrap();
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

  return (
    <Dialog open={isOpen} onOpenChange={(open) => { if (!open) onClose(); }}>
      <DialogContent className="max-w-xl max-h-[90vh] overflow-y-auto">
        {loading ? (
          <div className="text-center py-10 text-muted-foreground">Yükleniyor...</div>
        ) : task ? (
          <>
            <DialogHeader>
              <div className="flex items-center justify-between gap-4">
                <div className="flex-1">
                  <input
                    type="text"
                    name="title"
                    value={task.title}
                    onChange={handleChange}
                    disabled={isFilling}
                    className="w-full text-lg font-semibold bg-transparent focus:outline-none focus:ring-1 focus:ring-ring rounded-md px-1 -mx-1 text-foreground"
                    placeholder="Görev Başlığı"
                  />
                </div>
                <Button
                  type="button"
                  variant="outline"
                  size="xs"
                  onClick={handleAiFill}
                  disabled={isFilling || !task.title?.trim()}
                  className="flex items-center gap-1.5 shrink-0 bg-blue-50 dark:bg-blue-950/40 text-blue-700 dark:text-blue-300 border-blue-200 dark:border-blue-800 hover:bg-blue-100 dark:hover:bg-blue-950/80 transition-all font-medium py-1 px-2.5 rounded-lg text-xs mr-6"
                >
                  {isFilling ? (
                    <>
                      <svg className="animate-spin h-3 w-3 text-blue-700 dark:text-blue-300" xmlns="http://www.w3.org/2000/svg" fill="none" viewBox="0 0 24 24">
                        <circle className="opacity-25" cx="12" cy="12" r="10" stroke="currentColor" strokeWidth="4"></circle>
                        <path className="opacity-75" fill="currentColor" d="M4 12a8 8 0 018-8V0C5.373 0 0 5.373 0 12h4zm2 5.291A7.962 7.962 0 014 12H0c0 3.042 1.135 5.824 3 7.938l3-2.647z"></path>
                      </svg>
                      <span>AI Dolduruyor...</span>
                    </>
                  ) : (
                    <>
                      <SparklesIcon className="h-3.5 w-3.5" />
                      <span>AI ile Doldur</span>
                    </>
                  )}
                </Button>
              </div>
            </DialogHeader>

            <div className="space-y-5">
              <div>
                <label className="block text-sm font-medium text-muted-foreground mb-1.5">
                  Etiketler
                </label>
                <div className="flex flex-wrap items-center gap-1.5">
                  {(task.labels ?? []).map((label) => (
                    <Badge
                      key={label.id}
                      className="flex items-center gap-1 pl-2 pr-1 text-white border-0"
                      style={{ backgroundColor: label.color }}
                    >
                      {label.name}
                      <button
                        type="button"
                        onClick={() => handleDetachLabel(label.id)}
                        className="hover:bg-black/20 rounded-sm p-0.5"
                        aria-label={`${label.name} etiketini kaldır`}
                      >
                        <XMarkIcon className="h-3 w-3" />
                      </button>
                    </Badge>
                  ))}

                  <div className="relative">
                    <Button
                      type="button"
                      variant="outline"
                      size="xs"
                      onClick={() => setShowLabelPicker((v) => !v)}
                      disabled={isFilling}
                    >
                      <TagIcon className="h-3 w-3" />
                      Etiket
                    </Button>

                    {showLabelPicker && (
                      <div className="absolute z-10 mt-2 w-56 rounded-lg border border-border bg-popover shadow-lg p-2">
                        <div className="max-h-32 overflow-y-auto space-y-1 mb-2">
                          {availableLabels
                            .filter((l) => !(task.labels ?? []).some((tl) => tl.id === l.id))
                            .map((label) => (
                              <button
                                key={label.id}
                                type="button"
                                onClick={() => handleAttachLabel(label)}
                                className="flex items-center gap-2 w-full px-2 py-1 rounded-md text-xs text-left hover:bg-muted"
                              >
                                <span className="w-3 h-3 rounded-full shrink-0" style={{ backgroundColor: label.color }} />
                                <span className="text-foreground">{label.name}</span>
                              </button>
                            ))}
                          {availableLabels.length === 0 && (
                            <p className="text-xs text-muted-foreground px-2 py-1">Henüz etiket yok.</p>
                          )}
                        </div>

                        <form onSubmit={handleCreateLabel} className="border-t border-border pt-2 space-y-1.5">
                          <Input
                            type="text"
                            value={newLabelName}
                            onChange={(e) => setNewLabelName(e.target.value)}
                            placeholder="Yeni etiket adı"
                            className="text-xs"
                          />
                          <div className="flex items-center justify-between gap-1">
                            <div className="flex gap-1">
                              {NEW_LABEL_COLORS.map((color) => (
                                <button
                                  key={color}
                                  type="button"
                                  onClick={() => setNewLabelColor(color)}
                                  className={`w-4 h-4 rounded-full ${newLabelColor === color ? 'ring-2 ring-offset-1 ring-ring' : ''}`}
                                  style={{ backgroundColor: color }}
                                  aria-label={color}
                                />
                              ))}
                            </div>
                            <Button
                              type="submit"
                              disabled={isCreatingLabel || !newLabelName.trim()}
                              size="xs"
                            >
                              Oluştur
                            </Button>
                          </div>
                        </form>
                      </div>
                    )}
                  </div>
                </div>
              </div>

              <div>
                <label className="block text-sm font-medium text-muted-foreground mb-1.5">
                  Bağımlılıklar
                </label>

                {(task.blockedBy ?? []).length > 0 && (
                  <div className="mb-2">
                    <p className="text-xs text-muted-foreground mb-1">Bunlar bitmeden başlanamaz:</p>
                    <div className="flex flex-wrap gap-1.5">
                      {(task.blockedBy ?? []).map((b) => (
                        <Badge
                          key={b.id}
                          variant="destructive"
                          className="flex items-center gap-1 pl-2 pr-1"
                        >
                          {b.title}
                          <button
                            type="button"
                            onClick={() => handleRemoveDependency(task.id, b.id)}
                            className="hover:bg-black/10 rounded-sm p-0.5"
                            aria-label={`${b.title} bağımlılığını kaldır`}
                          >
                            <XMarkIcon className="h-3 w-3" />
                          </button>
                        </Badge>
                      ))}
                    </div>
                  </div>
                )}

                {(task.blocking ?? []).length > 0 && (
                  <div className="mb-2">
                    <p className="text-xs text-muted-foreground mb-1">Bu kartı bekleyenler:</p>
                    <div className="flex flex-wrap gap-1.5">
                      {(task.blocking ?? []).map((b) => (
                        <Badge
                          key={b.id}
                          variant="secondary"
                          className="flex items-center gap-1 pl-2 pr-1"
                        >
                          {b.title}
                          <button
                            type="button"
                            onClick={() => handleRemoveDependency(b.id, task.id)}
                            className="hover:bg-black/10 rounded-sm p-0.5"
                            aria-label={`${b.title} bağımlılığını kaldır`}
                          >
                            <XMarkIcon className="h-3 w-3" />
                          </button>
                        </Badge>
                      ))}
                    </div>
                  </div>
                )}

                <div className="relative inline-block">
                  <Button
                    type="button"
                    variant="outline"
                    size="xs"
                    onClick={() => setShowDependencyPicker((v) => !v)}
                    disabled={isFilling}
                  >
                    <LinkIcon className="h-3 w-3" />
                    Bağımlılık ekle
                  </Button>

                  {showDependencyPicker && (
                    <div className="absolute z-10 mt-2 w-56 rounded-lg border border-border bg-popover shadow-lg p-2">
                      <p className="text-xs text-muted-foreground px-1 pb-1">
                        Hangi kart bitmeden bu başlamasın?
                      </p>
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
                              className="flex w-full px-2 py-1 rounded-md text-xs text-left text-foreground hover:bg-muted"
                            >
                              {c.title}
                            </button>
                          ))}
                        {availableCards.filter((c) => c.id !== task.id).length === 0 && (
                          <p className="text-xs text-muted-foreground px-2 py-1">Başka kart yok.</p>
                        )}
                      </div>
                    </div>
                  )}
                </div>
              </div>

              <div>
                <label htmlFor="description" className="block text-sm font-medium text-muted-foreground mb-1">
                  Açıklama
                </label>
                <div className="relative">
                  <Textarea
                    id="description"
                    name="description"
                    rows={5}
                    value={task.description || ''}
                    onChange={handleChange}
                    disabled={isFilling}
                    placeholder="Görev için bir açıklama ekleyin..."
                    className={isFilling ? "opacity-30" : ""}
                  />
                  {isFilling && (
                    <div className="absolute inset-0 flex flex-col items-center justify-center bg-background/60 rounded-md backdrop-blur-[1px] border border-dashed border-blue-300 dark:border-blue-800 animate-pulse">
                      <div className="flex items-center gap-2 text-blue-600 dark:text-blue-400 font-medium text-sm">
                        <SparklesIcon className="h-5 w-5 animate-bounce" />
                        <span>AI görevi detaylandırıyor...</span>
                      </div>
                      <span className="text-xs text-muted-foreground mt-1">İş yükü analizi ve açıklama oluşturuluyor</span>
                    </div>
                  )}
                </div>
              </div>

              <div className="grid grid-cols-2 gap-4 items-start">
                <div>
                  <label htmlFor="dueDate" className="block text-sm font-medium text-muted-foreground mb-1 flex items-center gap-1.5">
                    <CalendarDaysIcon className="h-4 w-4" />
                    Son Teslim Tarihi
                  </label>
                  <Input
                    type="date"
                    id="dueDate"
                    name="dueDate"
                    value={task.dueDate ? task.dueDate.split('T')[0] : ''}
                    onChange={handleChange}
                    disabled={isFilling}
                  />
                </div>

                <div>
                  <label className="block text-sm font-medium text-muted-foreground mb-1">
                    Atanan Kişiler
                  </label>

                  <div className="flex flex-wrap items-center gap-1.5">
                    {(task.assignees ?? []).map((a) => (
                      <Badge
                        key={a.id}
                        variant="secondary"
                        className="flex items-center gap-1 pl-2 pr-1"
                      >
                        {a.name}
                        {isAdmin && (
                          <button
                            type="button"
                            onClick={() => handleToggleAssignee(a.id)}
                            className="hover:bg-black/10 rounded-sm p-0.5"
                            aria-label={`${a.name} atamasını kaldır`}
                          >
                            <XMarkIcon className="h-3 w-3" />
                          </button>
                        )}
                      </Badge>
                    ))}

                    {isAdmin && (
                      <div className="relative">
                        <Button
                          type="button"
                          variant="outline"
                          size="xs"
                          onClick={() => setShowAssigneePicker((v) => !v)}
                          disabled={isFilling}
                        >
                          + Kişi
                        </Button>

                        {showAssigneePicker && (
                          <div className="absolute z-10 mt-2 w-48 rounded-lg border border-border bg-popover shadow-lg p-2 max-h-40 overflow-y-auto">
                            {members.map((m) => {
                              const checked = (task.assignees ?? []).some((a) => a.id === m.userId);
                              return (
                                <label
                                  key={m.userId}
                                  className="flex items-center gap-2 px-2 py-1 rounded-md text-xs cursor-pointer hover:bg-muted"
                                >
                                  <input
                                    type="checkbox"
                                    checked={checked}
                                    onChange={() => handleToggleAssignee(m.userId)}
                                    className="rounded-md"
                                  />
                                  <span className="text-foreground">{m.user.name}</span>
                                </label>
                              );
                            })}
                          </div>
                        )}
                      </div>
                    )}
                  </div>

                  {!isAdmin && (task.assignees ?? []).length === 0 && (
                    <p className="text-xs text-muted-foreground mt-1">Atanan yok</p>
                  )}
                  {!isAdmin && (
                    <p className="text-xs text-muted-foreground mt-1">Sadece adminler atama yapabilir</p>
                  )}
                </div>
              </div>

              <CommentsSection cardId={task.id} />

              <p className="text-xs text-muted-foreground font-mono">
                  ID: {task.id} | Sütun: {task.columnId}
              </p>
            </div>

            <DialogFooter className="mt-8 pt-4 border-t border-border">
              <Button
                type="button"
                variant="destructive"
                onClick={handleDelete}
                className="mr-auto"
                disabled={isFilling}
              >
                <TrashIcon className="h-4 w-4 mr-1" />
                Görevi Sil
              </Button>
              <Button type="button" variant="outline" onClick={onClose} disabled={isFilling}>
                İptal
              </Button>
              <Button type="button" onClick={handleSave} disabled={isFilling}>
                Değişiklikleri Kaydet
              </Button>
            </DialogFooter>
          </>
        ) : (
          <div className="text-center py-10 text-destructive">Görev yüklenemedi veya bulunamadı.</div>
        )}
      </DialogContent>
    </Dialog>
  );
};
