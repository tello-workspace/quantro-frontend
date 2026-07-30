// src/components/ui/TaskModal.tsx
'use client';

import React, { useEffect, useState } from 'react';
import { XMarkIcon, CalendarDaysIcon, TrashIcon, TagIcon, LinkIcon, SparklesIcon, PaperClipIcon, ArrowDownTrayIcon, EyeIcon } from '@heroicons/react/24/outline';
import { EyeIcon as EyeIconSolid } from '@heroicons/react/24/solid';
import { useGetWatchStatusQuery, useWatchCardMutation, useUnwatchCardMutation } from '@/features/watchers/watchApi';
import { useSaveCardAsTemplateMutation } from '@/features/templates/templateApi';
import { BookmarkIcon } from '@heroicons/react/24/outline';
import { Task, TaskLabel, DependencyCard } from '@/features/board/services/boardService';
import { useGetOrganizationByIdQuery } from '@/features/organizations/organizationsApi';
import { useGetMeQuery } from '@/features/auth/meApi';
import { useFillCardWithAiMutation } from '@/features/ai/aiApi';
import { useCreateChangeRequestMutation } from '@/features/requests/requestsApi';
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
import {
  useGetAttachmentsQuery,
  useUploadAttachmentMutation,
  useDeleteAttachmentMutation,
} from '@/features/attachments/attachmentsApi';
import {
  useGetChecklistQuery,
  useCreateChecklistItemMutation,
  useUpdateChecklistItemMutation,
  useDeleteChecklistItemMutation,
} from '@/features/checklist/checklistApi';
import { toast } from "sonner";
import { useConfirm } from '@/hooks/useConfirm';
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

interface CommentMember {
  userId: string;
  user: { id: string; name: string };
}

const CommentsSection: React.FC<{ cardId: string; members: CommentMember[] }> = ({ cardId, members }) => {
  const confirm = useConfirm();
  const { data: me } = useGetMeQuery();
  const { data: comments = [] } = useGetCommentsQuery(cardId);
  const [createComment, { isLoading: isPosting }] = useCreateCommentMutation();
  const [updateComment] = useUpdateCommentMutation();
  const [deleteComment] = useDeleteCommentMutation();

  const [newText, setNewText] = useState('');
  const [editingId, setEditingId] = useState<string | null>(null);
  const [editText, setEditText] = useState('');

  // @Mention otomatik tamamlama: cursor'u tam takip etmek yerine metnin
  // SONUNDAKI "@kelime" parcasina bakiyoruz - tipik kullanim (yorumun
  // ortasina donup mention eklemek nadir) icin yeterli, tam bir editor
  // kutuphanesi kurmadan basit ve isiyor.
  const mentionMatch = /@([\wÀ-ÖØ-öø-ÿĞğİıŞşÇçÖöÜü]*)$/.exec(newText);
  const mentionQuery = mentionMatch?.[1]?.toLowerCase() ?? null;
  const mentionCandidates =
    mentionQuery !== null
      ? members.filter((m) => m.user.name.toLowerCase().includes(mentionQuery)).slice(0, 5)
      : [];

  const selectMention = (name: string) => {
    setNewText((t) => t.replace(/@([\wÀ-ÖØ-öø-ÿĞğİıŞşÇçÖöÜü]*)$/, `@${name} `));
  };

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
    const ok = await confirm({
      title: 'Yorumu Sil',
      description: 'Bu yorumu silmek istediğinizden emin misiniz?',
      confirmText: 'Sil',
      cancelText: 'İptal',
      variant: 'destructive',
    });
    if (!ok) return;
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

      <form onSubmit={handlePost} className="flex gap-2 relative">
        <Input
          type="text"
          value={newText}
          onChange={(e) => setNewText(e.target.value)}
          placeholder="Bir yorum yaz... (@ ile birini etiketle)"
          className="flex-1"
        />
        <Button type="submit" disabled={isPosting || !newText.trim()} size="sm">
          Gönder
        </Button>

        {mentionCandidates.length > 0 && (
          <div className="absolute bottom-full left-0 mb-1 w-56 rounded-lg border border-border bg-popover shadow-lg p-1 z-10">
            {mentionCandidates.map((m) => (
              <button
                key={m.userId}
                type="button"
                onClick={() => selectMention(m.user.name)}
                className="w-full text-left px-2 py-1.5 rounded-md text-sm text-foreground hover:bg-muted transition-colors"
              >
                {m.user.name}
              </button>
            ))}
          </div>
        )}
      </form>
    </div>
  );
};

const MAX_ATTACHMENT_SIZE = 10 * 1024 * 1024;

function formatFileSize(bytes: number): string {
  if (bytes < 1024) return `${bytes} B`;
  if (bytes < 1024 * 1024) return `${(bytes / 1024).toFixed(1)} KB`;
  return `${(bytes / (1024 * 1024)).toFixed(1)} MB`;
}

const WatchToggle: React.FC<{ cardId: string }> = ({ cardId }) => {
  const { data: status } = useGetWatchStatusQuery(cardId);
  const [watchCard, { isLoading: isWatching }] = useWatchCardMutation();
  const [unwatchCard, { isLoading: isUnwatching }] = useUnwatchCardMutation();

  const handleToggle = async () => {
    try {
      if (status?.isWatching) {
        await unwatchCard(cardId).unwrap();
      } else {
        await watchCard(cardId).unwrap();
      }
    } catch {
      toast.error('İzleme durumu değiştirilemedi.');
    }
  };

  return (
    <button
      type="button"
      onClick={handleToggle}
      disabled={isWatching || isUnwatching}
      title={status?.isWatching ? 'Bu kartı izlemeyi bırak' : 'Bu kartı izle - yorum/taşıma olunca bildirim al'}
      className={`flex items-center gap-1.5 shrink-0 text-xs font-medium py-1 px-2.5 rounded-lg border transition-colors ${
        status?.isWatching
          ? 'bg-primary/10 text-primary border-primary/30'
          : 'text-muted-foreground border-border hover:bg-accent/40'
      }`}
    >
      {status?.isWatching ? <EyeIconSolid className="h-3.5 w-3.5" /> : <EyeIcon className="h-3.5 w-3.5" />}
      <span>{status?.isWatching ? 'İzleniyor' : 'İzle'}</span>
      {!!status?.watcherCount && <span className="opacity-70">({status.watcherCount})</span>}
    </button>
  );
};

const ChecklistSection: React.FC<{ cardId: string }> = ({ cardId }) => {
  const { data: items = [] } = useGetChecklistQuery(cardId);
  const [createItem, { isLoading: isAdding }] = useCreateChecklistItemMutation();
  const [updateItem] = useUpdateChecklistItemMutation();
  const [deleteItem] = useDeleteChecklistItemMutation();
  const [newText, setNewText] = useState('');

  const doneCount = items.filter((i) => i.done).length;
  const progressPct = items.length > 0 ? Math.round((doneCount / items.length) * 100) : 0;

  const handleAdd = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!newText.trim()) return;
    try {
      await createItem({ cardId, text: newText.trim() }).unwrap();
      setNewText('');
    } catch {
      toast.error('Madde eklenemedi.');
    }
  };

  const handleToggle = async (itemId: string, done: boolean) => {
    try {
      await updateItem({ cardId, itemId, done: !done }).unwrap();
    } catch {
      toast.error('Madde güncellenemedi.');
    }
  };

  const handleDelete = async (itemId: string) => {
    try {
      await deleteItem({ cardId, itemId }).unwrap();
    } catch {
      toast.error('Madde silinemedi.');
    }
  };

  return (
    <div>
      <label className="block text-sm font-medium text-muted-foreground mb-1.5">
        Kontrol Listesi {items.length > 0 && `(${doneCount}/${items.length})`}
      </label>

      {items.length > 0 && (
        <div className="mb-2 h-1.5 w-full rounded-full bg-muted overflow-hidden">
          <div
            className="h-full rounded-full bg-primary transition-all"
            style={{ width: `${progressPct}%` }}
          />
        </div>
      )}

      <div className="space-y-1 mb-2">
        {items.map((item) => (
          <div
            key={item.id}
            className="group flex items-center gap-2 rounded-lg px-1.5 py-1 text-sm hover:bg-muted/50"
          >
            <input
              type="checkbox"
              checked={item.done}
              onChange={() => handleToggle(item.id, item.done)}
              className="rounded-md shrink-0"
            />
            <span className={`flex-1 min-w-0 truncate ${item.done ? 'text-muted-foreground line-through' : 'text-foreground'}`}>
              {item.text}
            </span>
            <button
              type="button"
              onClick={() => handleDelete(item.id)}
              className="shrink-0 text-muted-foreground hover:text-destructive opacity-0 group-hover:opacity-100 transition-opacity"
            >
              <TrashIcon className="h-3.5 w-3.5" />
            </button>
          </div>
        ))}
      </div>

      <form onSubmit={handleAdd} className="flex items-center gap-2">
        <Input
          value={newText}
          onChange={(e) => setNewText(e.target.value)}
          placeholder="Yeni madde ekle..."
          className="h-8 text-sm"
        />
        <Button type="submit" size="sm" disabled={isAdding || !newText.trim()}>
          Ekle
        </Button>
      </form>
    </div>
  );
};

const AttachmentsSection: React.FC<{ cardId: string; isAdmin: boolean }> = ({ cardId, isAdmin }) => {
  const confirm = useConfirm();
  const { data: me } = useGetMeQuery();
  const { data: attachments = [] } = useGetAttachmentsQuery(cardId);
  const [uploadAttachment, { isLoading: isUploading }] = useUploadAttachmentMutation();
  const [deleteAttachment] = useDeleteAttachmentMutation();
  const fileInputRef = React.useRef<HTMLInputElement>(null);

  const handleFileSelect = async (e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0];
    e.target.value = '';
    if (!file) return;

    if (file.size > MAX_ATTACHMENT_SIZE) {
      toast.error('Dosya en fazla 10MB olabilir.');
      return;
    }

    try {
      await uploadAttachment({ cardId, file }).unwrap();
    } catch (err: unknown) {
      const errData = (err as { data?: { error?: { message?: string } } })?.data?.error;
      toast.error(errData?.message || 'Dosya yüklenemedi.');
    }
  };

  const handleDelete = async (attachmentId: string) => {
    const ok = await confirm({
      title: 'Eki Sil',
      description: 'Bu eki silmek istediğinizden emin misiniz?',
      confirmText: 'Sil',
      cancelText: 'İptal',
      variant: 'destructive',
    });
    if (!ok) return;
    try {
      await deleteAttachment({ cardId, attachmentId }).unwrap();
    } catch (err: unknown) {
      const errData = (err as { data?: { error?: { message?: string } } })?.data?.error;
      toast.error(errData?.message || 'Ek silinemedi.');
    }
  };

  return (
    <div>
      <label className="block text-sm font-medium text-muted-foreground mb-1.5">
        Ekler {attachments.length > 0 && `(${attachments.length})`}
      </label>

      <div className="space-y-2 mb-3">
        {attachments.length === 0 && (
          <p className="text-xs text-muted-foreground">Henüz ek dosya yok.</p>
        )}
        {attachments.map((a) => (
          <div
            key={a.id}
            className="flex items-center justify-between gap-2 rounded-lg border border-border px-2.5 py-1.5 text-sm"
          >
            <div className="flex min-w-0 items-center gap-2">
              <PaperClipIcon className="h-4 w-4 shrink-0 text-muted-foreground" />
              <div className="min-w-0">
                <p className="truncate font-medium text-foreground">{a.fileName}</p>
                <p className="text-xs text-muted-foreground">
                  {formatFileSize(a.fileSize)} · {a.uploader.name} · {timeAgo(a.createdAt)}
                </p>
              </div>
            </div>
            <div className="flex shrink-0 items-center gap-2">
              {a.downloadUrl && (
                <a
                  href={a.downloadUrl}
                  target="_blank"
                  rel="noopener noreferrer"
                  title="İndir"
                  className="text-muted-foreground hover:text-foreground"
                >
                  <ArrowDownTrayIcon className="h-4 w-4" />
                </a>
              )}
              {(a.uploaderId === me?.id || isAdmin) && (
                <button
                  type="button"
                  onClick={() => handleDelete(a.id)}
                  title="Sil"
                  className="text-muted-foreground hover:text-destructive"
                >
                  <TrashIcon className="h-4 w-4" />
                </button>
              )}
            </div>
          </div>
        ))}
      </div>

      <input ref={fileInputRef} type="file" onChange={handleFileSelect} className="hidden" />
      <Button
        type="button"
        variant="outline"
        size="sm"
        disabled={isUploading}
        onClick={() => fileInputRef.current?.click()}
      >
        <PaperClipIcon className="h-4 w-4" />
        {isUploading ? 'Yükleniyor...' : 'Dosya Ekle'}
      </Button>
    </div>
  );
};

interface TaskModalConflictInfo {
  filePath: string;
  otherCardTitle: string;
  otherUserName: string;
}

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
  columnId?: string | null;
  initialTitle?: string;
  onCreateTask?: (columnId: string, payload: any) => Promise<void>;
  conflict?: TaskModalConflictInfo;
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
  columnId,
  initialTitle,
  onCreateTask,
  conflict,
}) => {
  const confirm = useConfirm();
  const [task, setTask] = useState<Task | null>(null);
  const [loading, setLoading] = useState(false);
  const [showLabelPicker, setShowLabelPicker] = useState(false);
  const [newLabelName, setNewLabelName] = useState('');
  const [newLabelColor, setNewLabelColor] = useState(NEW_LABEL_COLORS[0]);
  const [showAssigneePicker, setShowAssigneePicker] = useState(false);
  const [showDependencyPicker, setShowDependencyPicker] = useState(false);
  const [showSaveTemplate, setShowSaveTemplate] = useState(false);
  const [templateName, setTemplateName] = useState('');

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
  const [createChangeRequest, { isLoading: isRequesting }] = useCreateChangeRequestMutation();
  const [saveCardAsTemplate, { isLoading: isSavingTemplate }] = useSaveCardAsTemplateMutation();

  const handleSaveAsTemplate = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!task || !templateName.trim()) return;
    try {
      await saveCardAsTemplate({ cardId: task.id, projectId, name: templateName.trim() }).unwrap();
      toast.success('Şablon olarak kaydedildi.');
      setShowSaveTemplate(false);
      setTemplateName('');
    } catch (err: unknown) {
      const errData = (err as { data?: { error?: { message?: string } } })?.data?.error;
      toast.error(errData?.message || 'Şablon kaydedilemedi.');
    }
  };

  const handleAiFill = async () => {
    if (!task || !task.title?.trim()) return;
    try {
      const result = await fillCardWithAi({ projectId, title: task.title.trim() }).unwrap();
      const updatedFields: Partial<Task> = {
        description: result.description,
        priority: result.priority as any,
      };

      if (result.dueDate && result.dueDate !== 'null' && result.dueDate !== 'undefined') {
        updatedFields.dueDate = result.dueDate;
      }

      if (result.suggestedAssigneeId && result.suggestedAssigneeId !== 'null') {
        const targetId = result.suggestedAssigneeId.trim().toLowerCase();
        const member = members.find(
          (m) =>
            m.userId.trim().toLowerCase() === targetId ||
            m.user.id.trim().toLowerCase() === targetId
        );
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
    if (isOpen) {
      if (taskId && taskId !== 'new') {
        setLoading(true);
        fetchTaskDetails(taskId)
          .then((data) => setTask(data))
          .catch((err) => console.error('Görev detayları yüklenemedi:', err))
          .finally(() => setLoading(false));
      } else if (taskId === 'new') {
        setTask({
          id: 'new',
          columnId: columnId || '',
          title: initialTitle || '',
          description: '',
          priority: 'MEDIUM',
          dueDate: '',
          assignees: [],
          labels: [],
          blockedBy: [],
          blocking: [],
          lastActivityAt: new Date().toISOString(),
        });
      }
    } else {
      setTask(null);
    }
  }, [taskId, isOpen, fetchTaskDetails, columnId, initialTitle]);

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

  const handleSave = async () => {
    if (!task) return;

    if (taskId === 'new') {
      if (!task.title.trim() || !columnId) return;

      if (!isAdmin) {
        try {
          await createChangeRequest({
            orgId,
            body: {
              type: 'CARD_CREATE',
              targetColumnId: columnId,
              payload: {
                title: task.title.trim(),
                description: task.description?.trim() || null,
                priority: task.priority,
                dueDate: task.dueDate || null,
                assigneeIds: task.assignees?.map((a) => a.id) ?? [],
                labelIds: task.labels?.map((l) => l.id) ?? [],
                blockerIds: task.blockedBy?.map((b) => b.id) ?? [],
              },
            },
          }).unwrap();
          toast.success('Kart ekleme talebi başarıyla oluşturuldu ve admin onayına gönderildi.');
          onClose();
        } catch (err) {
          const mesaj = (err as { data?: { error?: { message?: string } } })?.data?.error?.message;
          toast.error(mesaj || 'Talep oluşturulamadı.');
        }
        return;
      }

      if (onCreateTask) {
        try {
          await onCreateTask(columnId, {
            title: task.title.trim(),
            description: task.description?.trim() || null,
            priority: task.priority,
            dueDate: task.dueDate || null,
            assigneeIds: task.assignees?.map((a) => a.id) ?? [],
            labelIds: task.labels?.map((l) => l.id) ?? [],
            blockerIds: task.blockedBy?.map((b) => b.id) ?? [],
          });
          onClose();
        } catch (err) {
          toast.error('Kart oluşturulamadı.');
        }
      }
      return;
    }

    // Admin dogrudan kaydeder. Uye kart icerigini dogrudan degistiremedigi
    // icin ayni veriyi degisiklik talebi olarak gonderir; admin onaylayinca
    // sistem uygular, reddederse bu veri kullanilmaz.
    if (!isAdmin) {
      try {
        await createChangeRequest({
          orgId,
          body: {
            type: 'CARD_UPDATE',
            targetCardId: task.id,
            payload: {
              title: task.title,
              description: task.description ?? null,
              priority: task.priority,
              dueDate: task.dueDate ?? null,
              assigneeIds: task.assignees?.map((a) => a.id) ?? [],
            },
          },
        }).unwrap();
        toast.success('Değişiklik talebin adminlere gönderildi.');
        onClose();
      } catch (err) {
        const mesaj = (err as { data?: { error?: { message?: string } } })?.data?.error?.message;
        toast.error(mesaj || 'Talep gönderilemedi.');
      }
      return;
    }

    onUpdateTask(task);
    onClose();
  };

  const handleAttachLabel = async (label: TaskLabel) => {
    if (!task) return;
    if (taskId === 'new') {
      setTask({ ...task, labels: [...(task.labels ?? []), label] });
      setShowLabelPicker(false);
      return;
    }
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
    if (taskId === 'new') {
      setTask({ ...task, labels: (task.labels ?? []).filter((l) => l.id !== labelId) });
      return;
    }
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
      if (taskId === 'new') {
        setTask({ ...task, labels: [...(task.labels ?? []), label] });
        setShowLabelPicker(false);
        setNewLabelName('');
        return;
      }
      await handleAttachLabel(label);
      setNewLabelName('');
    } catch {
      toast.error('Etiket oluşturulamadı.');
    }
  };

  const handleAddDependency = async (blockerId: string) => {
    if (!task) return;
    if (taskId === 'new') {
      const blockerCard = availableCards.find((c) => c.id === blockerId);
      if (blockerCard) {
        setTask({
          ...task,
          blockedBy: [...(task.blockedBy ?? []), { id: blockerId, title: blockerCard.title }],
        });
      }
      setShowDependencyPicker(false);
      return;
    }
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
    if (taskId === 'new') {
      setTask({
        ...task,
        blockedBy: (task.blockedBy ?? []).filter((b) => b.id !== blockerId),
      });
      return;
    }
    try {
      await removeDependency({ cardId, blockerId }).unwrap();
      const refreshed = await fetchTaskDetails(task.id);
      setTask(refreshed);
    } catch {
      toast.error('Bağımlılık kaldırılamadı.');
    }
  };

  const handleDelete = async () => {
    if (!task) return;

    if (!isAdmin) {
      const ok = await confirm({
        title: 'Silme Talebi',
        description: 'Bu kartın silinmesi için admin onayı istenecek. Devam edilsin mi?',
        confirmText: 'Devam Et',
        cancelText: 'İptal',
      });
      if (!ok) return;
      try {
        await createChangeRequest({
          orgId,
          body: { type: 'CARD_DELETE', targetCardId: task.id },
        }).unwrap();
        toast.success('Silme talebin adminlere gönderildi.');
        onClose();
      } catch (err) {
        const mesaj = (err as { data?: { error?: { message?: string } } })?.data?.error?.message;
        toast.error(mesaj || 'Talep gönderilemedi.');
      }
      return;
    }

    const ok = await confirm({
      title: 'Görevi Sil',
      description: 'Bu görevi silmek istediğinizden emin misiniz?',
      confirmText: 'Sil',
      cancelText: 'İptal',
      variant: 'destructive',
    });
    if (ok) {
      onDeleteTask(task.id);
      onClose();
    }
  };

  return (
    <Dialog open={isOpen} onOpenChange={(open) => { if (!open) onClose(); }}>
      <DialogContent className="sm:max-w-xl w-full max-h-[90vh] overflow-y-auto overflow-x-hidden">
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
                {taskId !== 'new' && <WatchToggle cardId={task.id} />}
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

            {conflict && (
              <div className="flex items-start gap-2 rounded-lg border border-orange-300 bg-orange-50 dark:border-orange-800 dark:bg-orange-950/40 px-3 py-2 text-xs text-orange-800 dark:text-orange-300">
                <span className="mt-0.5">⚠️</span>
                <span>
                  <strong>Kod Çakışması Riski:</strong> <code className="font-mono">{conflict.filePath}</code> dosyası
                  şu an <strong>{conflict.otherUserName}</strong> tarafından &ldquo;{conflict.otherCardTitle}&rdquo;
                  kartı üzerinde de düzenleniyor. Bu bir kesinlik değil, dosya bazlı bir risk sinyalidir —
                  merge sırasında çakışma yaşamamak için erken iletişime geçmeniz önerilir.
                </span>
              </div>
            )}

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
                <div className="space-y-4">
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
                    <label htmlFor="priority" className="block text-sm font-medium text-muted-foreground mb-1 flex items-center gap-1.5">
                      Öncelik
                    </label>
                    <select
                      id="priority"
                      name="priority"
                      value={task.priority || ''}
                      onChange={handleChange}
                      disabled={isFilling}
                      className="flex h-9 w-full rounded-md border border-input bg-transparent px-3 py-1 text-sm shadow-sm transition-colors file:border-0 file:bg-transparent file:text-sm file:font-medium placeholder:text-muted-foreground focus-visible:outline-none focus-visible:ring-1 focus-visible:ring-ring disabled:cursor-not-allowed disabled:opacity-50 text-foreground"
                    >
                      <option value="" className="text-foreground bg-popover">Belirtilmemiş</option>
                      <option value="LOW" className="text-foreground bg-popover">Düşük</option>
                      <option value="MEDIUM" className="text-foreground bg-popover">Orta</option>
                      <option value="HIGH" className="text-foreground bg-popover">Yüksek</option>
                      <option value="URGENT" className="text-foreground bg-popover">Acil</option>
                    </select>
                  </div>

                  <div>
                    <label htmlFor="storyPoints" className="block text-sm font-medium text-muted-foreground mb-1">
                      Story Point (Tahmini Efor)
                    </label>
                    <Input
                      type="number"
                      id="storyPoints"
                      name="storyPoints"
                      min={0}
                      max={999}
                      value={task.storyPoints ?? ''}
                      onChange={(e) => {
                        const raw = e.target.value;
                        setTask({ ...task, storyPoints: raw === '' ? null : Number(raw) });
                      }}
                      placeholder="Belirtilmemiş"
                      disabled={isFilling}
                    />
                  </div>
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
                        <button
                          type="button"
                          onClick={() => handleToggleAssignee(a.id)}
                          className="hover:bg-black/10 rounded-sm p-0.5"
                          aria-label={`${a.name} atamasını kaldır`}
                        >
                          <XMarkIcon className="h-3 w-3" />
                        </button>
                      </Badge>
                    ))}

                    {/* Uye de atama secebilir; kaydederken degisiklik talebine donusur */}
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
                        <div className="absolute right-0 z-10 mt-2 w-48 rounded-lg border border-border bg-popover shadow-lg p-2 max-h-40 overflow-y-auto">
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
                  </div>

                  {!isAdmin && (
                    <p className="text-[10px] text-muted-foreground mt-1.5">
                      Atamalar değişiklik talebi olarak admin onayına sunulur.
                    </p>
                  )}
                </div>
              </div>

              {taskId !== 'new' && (
                <ChecklistSection cardId={task.id} />
              )}

              {taskId !== 'new' && (
                <AttachmentsSection cardId={task.id} isAdmin={isAdmin} />
              )}

              {taskId !== 'new' && (
                <CommentsSection cardId={task.id} members={members} />
              )}

              <p className="text-xs text-muted-foreground font-mono">
                {taskId === 'new' ? `Yeni Görev Talebi | Sütun ID: ${columnId}` : `ID: ${task.id} | Sütun: ${task.columnId}`}
              </p>
            </div>

            {taskId !== 'new' && isAdmin && showSaveTemplate && (
              <form onSubmit={handleSaveAsTemplate} className="flex items-center gap-2 pt-2">
                <Input
                  value={templateName}
                  onChange={(e) => setTemplateName(e.target.value)}
                  placeholder="Şablon adı (örn: Bug Report)"
                  className="h-8 text-sm"
                  autoFocus
                />
                <Button type="submit" size="sm" disabled={isSavingTemplate || !templateName.trim()}>Kaydet</Button>
                <Button type="button" size="sm" variant="ghost" onClick={() => setShowSaveTemplate(false)}>İptal</Button>
              </form>
            )}

            <DialogFooter className="mt-8 pt-4 border-t border-border">
              {taskId !== 'new' && (
                <Button
                  type="button"
                  variant="destructive"
                  onClick={handleDelete}
                  className="mr-auto"
                  disabled={isFilling}
                >
                  <TrashIcon className="h-4 w-4 mr-1" />
                  {isAdmin ? 'Görevi Sil' : 'Silme Talebi Gönder'}
                </Button>
              )}
              {taskId !== 'new' && isAdmin && !showSaveTemplate && (
                <Button type="button" variant="outline" size="sm" onClick={() => setShowSaveTemplate(true)}>
                  <BookmarkIcon className="h-3.5 w-3.5 mr-1" /> Şablon Olarak Kaydet
                </Button>
              )}
              <Button type="button" variant="outline" onClick={onClose} disabled={isFilling || isRequesting}>
                İptal
              </Button>
              <Button type="button" onClick={handleSave} disabled={isFilling || isRequesting}>
                {taskId === 'new'
                  ? isAdmin
                    ? 'Kartı Oluştur'
                    : 'Talebi Oluştur'
                  : isAdmin
                  ? 'Değişiklikleri Kaydet'
                  : 'Talep Gönder'}
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
