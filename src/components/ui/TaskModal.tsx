// src/components/ui/TaskModal.tsx
'use client';

import React, { useEffect, useState } from 'react';
import { XMarkIcon, CalendarDaysIcon, TrashIcon, TagIcon, LinkIcon, SparklesIcon, PaperClipIcon, ArrowDownTrayIcon, AdjustmentsHorizontalIcon } from '@heroicons/react/24/outline';
import { useSaveCardAsTemplateMutation } from '@/features/templates/templateApi';
import { BookmarkIcon } from '@heroicons/react/24/outline';
import { boardService, Task, TaskLabel, DependencyCard, DependencyRelationType } from '@/features/board/services/boardService';
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
import { useGetSprintsQuery } from '@/features/sprints/sprintsApi';
import { useGetCustomFieldsQuery, useSetCustomFieldValueMutation } from '@/features/customFields/customFieldsApi';
import { extractMentionQuery, filterMentionCandidates, insertMention } from '@/features/comments/mentionUtils';
import {
  useGetAttachmentsQuery,
  useUploadAttachmentMutation,
  useDeleteAttachmentMutation,
} from '@/features/attachments/attachmentsApi';
import { compressImageClient } from '@/features/attachments/imageCompression';
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
import { Markdown } from '@/components/ui/markdown';
import { Badge } from '@/components/ui/badge';
import { Avatar, AvatarImage, AvatarFallback } from '@/components/ui/avatar';
import { Alert, AlertTitle, AlertDescription } from '@/components/ui/alert';
import { FileUpload } from '@/components/ui/file-upload';
import { TriangleAlert as TriangleAlertIcon } from 'lucide-react';
import {
  Dialog,
  DialogContent,
  DialogHeader,
  DialogTitle,
  DialogDescription,
  DialogFooter,
} from '@/components/ui/dialog';
import { useTranslation } from '@/hooks/useTranslation';

const NEW_LABEL_COLORS = ['#EF4444', '#F59E0B', '#10B981', '#3B82F6', '#8B5CF6', '#EC4899'];

const RELATION_TYPE_LABELS: Record<DependencyRelationType, string> = {
  BLOCKS: 'Bloklar',
  RELATES_TO: 'İlişkili',
  DUPLICATES: 'Kopyası',
  CLONES: 'Klonu',
};

function timeAgo(dateStr: string, t: any): string {
  const diffMs = Date.now() - new Date(dateStr).getTime();
  const mins = Math.floor(diffMs / 60000);
  if (mins < 1) return t('justNow');
  if (mins < 60) return `${mins} ${t('minsAgo')}`;
  const hours = Math.floor(mins / 60);
  if (hours < 24) return `${hours} ${t('hoursAgo')}`;
  const days = Math.floor(hours / 24);
  return `${days} ${t('daysAgo')}`;
}

function initials(name: string): string {
  return name
    .split(' ')
    .filter(Boolean)
    .slice(0, 2)
    .map((p) => p[0]?.toUpperCase())
    .join('');
}

interface CommentMember {
  userId: string;
  user: { id: string; name: string };
}

const CommentsSection: React.FC<{ cardId: string; members: CommentMember[] }> = ({ cardId, members }) => {
  const confirm = useConfirm();
  const { t } = useTranslation();
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
  const mentionQuery = extractMentionQuery(newText);
  const mentionCandidates =
    mentionQuery !== null ? filterMentionCandidates(members, mentionQuery) : [];

  const selectMention = (name: string) => {
    setNewText((t) => insertMention(t, name));
  };

  const handlePost = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!newText.trim()) return;
    try {
      await createComment({ cardId, text: newText.trim() }).unwrap();
      setNewText('');
    } catch {
      toast.error(t('commentPostError'));
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
      toast.error(t('commentUpdateError'));
    }
  };

  const handleDelete = async (commentId: string) => {
    const ok = await confirm({
      title: t('deleteCommentTitle'),
      description: t('deleteCommentDesc'),
      confirmText: t('delete'),
      cancelText: t('cancel'),
      variant: 'destructive',
    });
    if (!ok) return;
    try {
      await deleteComment({ commentId, cardId }).unwrap();
    } catch {
      toast.error(t('commentDeleteError'));
    }
  };

  return (
    <div>
      <label className="block text-sm font-medium text-muted-foreground mb-1.5">
        {t('commentsCountLabel')} {comments.length > 0 && `(${comments.length})`}
      </label>

      <div className="space-y-3 max-h-56 overflow-y-auto mb-3 pr-1">
        {comments.length === 0 && (
          <p className="text-xs text-muted-foreground">{t('noComments')}</p>
        )}
        {comments.map((c) => (
          <div key={c.id} className="text-sm">
            <div className="flex items-center gap-2">
              <Avatar size="sm" className="border border-border">
                {c.author.avatarUrl && <AvatarImage src={c.author.avatarUrl} alt={c.author.name} />}
                <AvatarFallback className="text-[9px]">{initials(c.author.name)}</AvatarFallback>
              </Avatar>
              <span className="font-medium text-foreground text-xs">{c.author.name}</span>
              <span className="text-xs text-muted-foreground">{timeAgo(c.createdAt, t)}</span>
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
                    {t('save')}
                  </Button>
                  <Button size="xs" variant="ghost" onClick={() => setEditingId(null)}>
                    {t('cancel')}
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
                      {t('edit')}
                    </button>
                    <button
                      type="button"
                      onClick={() => handleDelete(c.id)}
                      className="text-xs text-muted-foreground hover:text-destructive"
                    >
                      {t('delete')}
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
          placeholder={t('commentInputPlaceholder')}
          className="flex-1"
        />
        <Button type="submit" disabled={isPosting || !newText.trim()} size="sm">
          {t('commentPostBtn')}
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


const ChecklistSection: React.FC<{ cardId: string }> = ({ cardId }) => {
  const { t } = useTranslation();
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
      toast.error(t('checklistAddError'));
    }
  };

  const handleToggle = async (itemId: string, done: boolean) => {
    try {
      await updateItem({ cardId, itemId, done: !done }).unwrap();
    } catch {
      toast.error(t('checklistUpdateError'));
    }
  };

  const handleDelete = async (itemId: string) => {
    try {
      await deleteItem({ cardId, itemId }).unwrap();
    } catch {
      toast.error(t('checklistDeleteError'));
    }
  };

  return (
    <div>
      <label className="block text-sm font-medium text-muted-foreground mb-1.5">
        {t('checklistCountLabel')} {items.length > 0 && `(${doneCount}/${items.length})`}
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
          placeholder={t('checklistInputPlaceholder')}
          className="h-8 text-sm"
        />
        <Button type="submit" size="sm" disabled={isAdding || !newText.trim()}>
          {t('add')}
        </Button>
      </form>
    </div>
  );
};

const AttachmentsSection: React.FC<{ cardId: string; isAdmin: boolean }> = ({ cardId, isAdmin }) => {
  const confirm = useConfirm();
  const { t } = useTranslation();
  const { data: me } = useGetMeQuery();
  const { data: attachments = [] } = useGetAttachmentsQuery(cardId);
  const [uploadAttachment, { isLoading: isUploading }] = useUploadAttachmentMutation();
  const [deleteAttachment] = useDeleteAttachmentMutation();

  const handleFilesPicked = async (files: File[]) => {
    const file = files[0];
    if (!file) return;

    // On-sikistirma: jpeg/png ve 1.5MB+ ise tarayicida WebP'e cevirip
    // yuklemeden once boyutu azalt. Fayda yoksa orijinal dosya doner.
    const processed = await compressImageClient(file);

    if (processed.size > MAX_ATTACHMENT_SIZE) {
      toast.error(t('attachmentLimitError'));
      return;
    }

    try {
      await uploadAttachment({ cardId, file: processed }).unwrap();
    } catch (err: unknown) {
      const errData = (err as { data?: { error?: { message?: string } } })?.data?.error;
      toast.error(errData?.message || t('attachmentUploadError'));
    }
  };

  const handleDelete = async (attachmentId: string) => {
    const ok = await confirm({
      title: t('deleteAttachmentTitle'),
      description: t('deleteAttachmentDesc'),
      confirmText: t('delete'),
      cancelText: t('cancel'),
      variant: 'destructive',
    });
    if (!ok) return;
    try {
      await deleteAttachment({ cardId, attachmentId }).unwrap();
    } catch (err: unknown) {
      const errData = (err as { data?: { error?: { message?: string } } })?.data?.error;
      toast.error(errData?.message || t('attachmentDeleteError'));
    }
  };

  return (
    <div>
      <label className="block text-sm font-medium text-muted-foreground mb-1.5">
        {t('attachmentsCountLabel')} {attachments.length > 0 && `(${attachments.length})`}
      </label>

      <div className="space-y-2 mb-3">
        {attachments.length === 0 && (
          <p className="text-xs text-muted-foreground">{t('noAttachments')}</p>
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
                  {formatFileSize(a.fileSize)} · {a.uploader.name} · {timeAgo(a.createdAt, t)}
                </p>
              </div>
            </div>
            <div className="flex shrink-0 items-center gap-2">
              {a.downloadUrl && (
                <a
                  href={a.downloadUrl}
                  target="_blank"
                  rel="noopener noreferrer"
                  title={t('download')}
                  className="text-muted-foreground hover:text-foreground"
                >
                  <ArrowDownTrayIcon className="h-4 w-4" />
                </a>
              )}
              {(a.uploaderId === me?.id || isAdmin) && (
                <button
                  type="button"
                  onClick={() => handleDelete(a.id)}
                  title={t('delete')}
                  className="text-muted-foreground hover:text-destructive"
                >
                  <TrashIcon className="h-4 w-4" />
                </button>
              )}
            </div>
          </div>
        ))}
      </div>

      <FileUpload onChange={handleFilesPicked} />
      {isUploading && <p className="mt-2 text-xs text-muted-foreground">{t('uploading')}</p>}
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
  onArchiveTask?: (taskId: string) => void;
  fetchTaskDetails: (taskId: string) => Promise<Task>;
  availableCards?: DependencyCard[];
  columnId?: string | null;
  initialTitle?: string;
  initialDueDate?: string;
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
  onArchiveTask,
  fetchTaskDetails,
  availableCards = [],
  columnId,
  initialTitle,
  initialDueDate,
  onCreateTask,
  conflict,
}) => {
  const confirm = useConfirm();
  const { t, lang } = useTranslation();
  const [task, setTask] = useState<Task | null>(null);
  const [loading, setLoading] = useState(false);
  const [showLabelPicker, setShowLabelPicker] = useState(false);
  const [newLabelName, setNewLabelName] = useState('');
  const [newLabelColor, setNewLabelColor] = useState(NEW_LABEL_COLORS[0]);
  const [showAssigneePicker, setShowAssigneePicker] = useState(false);
  const [showDependencyPicker, setShowDependencyPicker] = useState(false);
  const [dependencyRelationType, setDependencyRelationType] = useState<DependencyRelationType>('BLOCKS');
  const [showSaveTemplate, setShowSaveTemplate] = useState(false);
  // Aciklama markdown: yazma / onizleme kipi
  const [descPreview, setDescPreview] = useState(false);
  // Kart detayinda ayar bolumleri (etiket/bagimlilik/ozel alan/checklist/ek)
  // varsayilan olarak gizli; yalnizca baslik + aciklama + tarih/atanan gorunur.
  // Cark (ayarlar) butonuyla acilir.
  const [showSettings, setShowSettings] = useState(false);
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
  const { data: sprints = [] } = useGetSprintsQuery(
    { orgId, projectId },
    { skip: !orgId || !projectId || !isOpen },
  );
  const { data: customFields = [] } = useGetCustomFieldsQuery(
    { orgId, projectId },
    { skip: !orgId || !projectId || !isOpen },
  );
  const [setCustomFieldValue] = useSetCustomFieldValueMutation();
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
      toast.success(t('saveTemplateSuccess'));
      setShowSaveTemplate(false);
      setTemplateName('');
    } catch (err: unknown) {
      const errData = (err as { data?: { error?: { message?: string } } })?.data?.error;
      toast.error(errData?.message || t('saveTemplateError'));
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
      toast.success(t('aiFillSuccess'));
    } catch {
      toast.error(t('aiFillError'));
    }
  };

  useEffect(() => {
    if (isOpen) {
      if (taskId && taskId !== 'new') {
        setLoading(true);
        fetchTaskDetails(taskId)
          .then((data) => setTask(data))
          .catch((err) => console.error(t('taskLoadError'), err))
          .finally(() => setLoading(false));
      } else if (taskId === 'new') {
        setLoading(false);
        setTask({
          id: 'new',
          columnId: columnId || '',
          title: initialTitle || '',
          description: '',
          priority: 'MEDIUM',
          dueDate: initialDueDate || '',
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
  }, [taskId, isOpen, fetchTaskDetails, columnId, initialTitle, initialDueDate, t]);

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
          toast.success(lang === 'en' ? 'Card creation request successfully created and sent for admin approval.' : 'Kart ekleme talebi başarıyla oluşturuldu ve admin onayına gönderildi.');
          onClose();
        } catch (err) {
          const mesaj = (err as { data?: { error?: { message?: string } } })?.data?.error?.message;
          toast.error(mesaj || (lang === 'en' ? 'Request could not be created.' : 'Talep oluşturulamadı.'));
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
        } catch {
          toast.error(lang === 'en' ? 'Card could not be created.' : 'Kart oluşturulamadı.');
        }
      }
      return;
    }

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
        toast.success(lang === 'en' ? 'Your change request has been sent to admins.' : 'Değişiklik talebin adminlere gönderildi.');
        onClose();
      } catch (err) {
        const mesaj = (err as { data?: { error?: { message?: string } } })?.data?.error?.message;
        toast.error(mesaj || t('deleteRequestError'));
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
      toast.error(lang === 'en' ? 'Could not add label.' : 'Etiket eklenemedi.');
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
      toast.error(lang === 'en' ? 'Could not remove label.' : 'Etiket kaldırılamadı.');
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
      toast.error(lang === 'en' ? 'Could not create label.' : 'Etiket oluşturulamadı.');
    }
  };

  const handleAddDependency = async (blockerId: string) => {
    if (!task) return;
    if (taskId === 'new') {
      const blockerCard = availableCards.find((c) => c.id === blockerId);
      if (blockerCard) {
        setTask({
          ...task,
          blockedBy: [
            ...(task.blockedBy ?? []),
            { id: blockerId, title: blockerCard.title, relationType: dependencyRelationType },
          ],
        });
      }
      setShowDependencyPicker(false);
      return;
    }
    try {
      await addDependency({ cardId: task.id, blockerId, relationType: dependencyRelationType }).unwrap();
      const refreshed = await fetchTaskDetails(task.id);
      setTask(refreshed);
      setShowDependencyPicker(false);
    } catch (err) {
      const apiError = err as { data?: { error?: { message?: string } } };
      toast.error(apiError?.data?.error?.message || t('dependencyAddError'));
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
      toast.error(t('dependencyRemoveError'));
    }
  };

  const [showParentPicker, setShowParentPicker] = useState(false);
  const [showSubtaskPicker, setShowSubtaskPicker] = useState(false);

  const handleSetParent = async (parentId: string | null) => {
    if (!task || taskId === 'new') return;
    const parentCard = parentId ? availableCards.find((c) => c.id === parentId) : null;
    setTask({ ...task, parentCardId: parentId, parent: parentCard ? { id: parentCard.id, title: parentCard.title } : null });
    setShowParentPicker(false);
    try {
      await boardService.setCardParent(task.id, parentId);
    } catch (err) {
      toast.error(err instanceof Error ? err.message : 'Üst görev güncellenemedi.');
    }
  };

  const handleAddSubtask = async (childId: string) => {
    if (!task || taskId === 'new') return;
    setShowSubtaskPicker(false);
    try {
      await boardService.setCardParent(childId, task.id);
      const refreshed = await fetchTaskDetails(task.id);
      setTask(refreshed);
    } catch (err) {
      toast.error(err instanceof Error ? err.message : 'Alt görev eklenemedi.');
    }
  };

  const handleRemoveSubtask = async (childId: string) => {
    if (!task) return;
    try {
      await boardService.setCardParent(childId, null);
      const refreshed = await fetchTaskDetails(task.id);
      setTask(refreshed);
    } catch {
      toast.error('Alt görev kaldırılamadı.');
    }
  };

  const handleSetCustomFieldValue = async (fieldId: string, value: string | null) => {
    if (!task || taskId === 'new') return;
    const prevValues = task.customFieldValues ?? [];
    const nextValues = [
      ...prevValues.filter((v) => v.fieldId !== fieldId),
      { fieldId, value },
    ];
    setTask({ ...task, customFieldValues: nextValues });
    try {
      await setCustomFieldValue({ cardId: task.id, fieldId, value }).unwrap();
    } catch {
      toast.error('Alan kaydedilemedi.');
    }
  };

  const handleDelete = async () => {
    if (!task) return;

    if (!isAdmin) {
      const ok = await confirm({
        title: t('deleteRequestTitle'),
        description: t('deleteRequestDesc'),
        confirmText: lang === 'en' ? 'Continue' : 'Devam Et',
        cancelText: t('cancel'),
      });
      if (!ok) return;
      try {
        await createChangeRequest({
          orgId,
          body: { type: 'CARD_DELETE', targetCardId: task.id },
        }).unwrap();
        toast.success(t('deleteRequestSuccess'));
        onClose();
      } catch (err) {
        const mesaj = (err as { data?: { error?: { message?: string } } })?.data?.error?.message;
        toast.error(mesaj || t('deleteRequestError'));
      }
      return;
    }

    const ok = await confirm({
      title: t('deleteTaskTitle'),
      description: t('deleteTaskDesc'),
      confirmText: t('delete'),
      cancelText: t('cancel'),
      variant: 'destructive',
    });
    if (ok) {
      onDeleteTask(task.id);
      onClose();
    }
  };

  const handleArchive = async () => {
    if (!task) return;
    if (!isAdmin) {
      toast.error(t('archiveRequiresAdmin'));
      return;
    }
    const ok = await confirm({
      title: t('archiveTaskTitle'),
      description: t('archiveTaskDesc'),
      confirmText: t('archive'),
      cancelText: t('cancel'),
      variant: 'destructive',
    });
    if (ok) {
      onArchiveTask?.(task.id);
      onClose();
    }
  };

  const removeLabelAria = (labelName: string) => {
    return lang === 'en' ? `Remove label ${labelName}` : `${labelName} etiketini kaldır`;
  };

  const removeDependencyAria = (title: string) => {
    return lang === 'en' ? `Remove dependency ${title}` : `${title} bağımlılığını kaldır`;
  };

  const removeAssigneeAria = (name: string) => {
    return lang === 'en' ? `Remove assignment for ${name}` : `${name} atamasını kaldır`;
  };

  return (
    <Dialog open={isOpen} onOpenChange={(open: boolean) => { if (!open) onClose(); }}>
      <DialogContent className="sm:max-w-3xl w-full max-h-[90vh] overflow-y-auto overflow-x-hidden">
        {loading ? (
          <div className="text-center py-10 text-muted-foreground">{t('loading')}</div>
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
                    placeholder={t('taskTitleLabel')}
                  />
                </div>
                {/* Sag ust eylem kumesi: AI + ayarlar carki yan yana, kapat (X)
                    butonunun altina girmesin diye sagdan (mr-7) bosluk birakilir. */}
                <div className="flex items-center gap-1.5 shrink-0 mr-7">
                  <Button
                    type="button"
                    variant="outline"
                    size="xs"
                    onClick={handleAiFill}
                    disabled={isFilling || !task.title?.trim()}
                    className="flex items-center gap-1.5 bg-blue-50 dark:bg-blue-950/40 text-blue-700 dark:text-blue-300 border-blue-200 dark:border-blue-800 hover:bg-blue-100 dark:hover:bg-blue-950/80 transition-all font-medium py-1 px-2.5 rounded-lg text-xs"
                  >
                    {isFilling ? (
                      <>
                        <svg className="animate-spin h-3 w-3 text-blue-700 dark:text-blue-300" xmlns="http://www.w3.org/2000/svg" fill="none" viewBox="0 0 24 24">
                          <circle className="opacity-25" cx="12" cy="12" r="10" stroke="currentColor" strokeWidth="4"></circle>
                          <path className="opacity-75" fill="currentColor" d="M4 12a8 8 0 018-8V0C5.373 0 0 5.373 0 12h4zm2 5.291A7.962 7.962 0 014 12H0c0 3.042 1.135 5.824 3 7.938l3-2.647z"></path>
                        </svg>
                        <span>{t('aiFilling')}</span>
                      </>
                    ) : (
                      <>
                        <SparklesIcon className="h-3.5 w-3.5" />
                        <span>{t('aiFillBtn')}</span>
                      </>
                    )}
                  </Button>

                  {/* Ayar bolumlerini ac/kapat (etiket, bagimlilik, ozel alan vb.) */}
                  <Button
                    type="button"
                    variant="ghost"
                    size="icon-sm"
                    onClick={() => setShowSettings((v) => !v)}
                    title={showSettings ? t('hideSettings') : t('showSettings')}
                    aria-label={showSettings ? t('hideSettings') : t('showSettings')}
                  >
                    <AdjustmentsHorizontalIcon className="h-3.5 w-3.5" />
                  </Button>
                </div>
              </div>
            </DialogHeader>

            {conflict && (
              <Alert variant="warning">
                <TriangleAlertIcon />
                <AlertTitle>{t('conflictWarningTitle')}</AlertTitle>
                <AlertDescription>
                  {lang === 'en' ? (
                    <>
                      File <code className="font-mono">{conflict.filePath}</code> is currently also being edited by{' '}
                      <strong>{conflict.otherUserName}</strong> on card &ldquo;{conflict.otherCardTitle}&rdquo;. This is
                      a file-based risk signal — it is recommended to communicate early to avoid merge conflicts.
                    </>
                  ) : (
                    <>
                      <code className="font-mono">{conflict.filePath}</code> dosyası şu an{' '}
                      <strong>{conflict.otherUserName}</strong> tarafından &ldquo;{conflict.otherCardTitle}&rdquo; kartı
                      üzerinde de düzenleniyor. Bu bir kesinlik değil, dosya bazlı bir risk sinyalidir — merge sırasında
                      çakışma yaşamamak için erken iletişime geçmeniz önerilir.
                    </>
                  )}
                </AlertDescription>
              </Alert>
            )}

            <div className="space-y-5">
              {/* AYAR BOLUMLERI: yalnizca cark (ayarlar) butonuna basilinca
                  gorunur. Varsayilan gorunum: baslik + aciklama + tarih/atanan. */}
              {showSettings && (
              <>
              <div>
                <label className="block text-sm font-medium text-muted-foreground mb-1.5">
                  {t('labelsLabel')}
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
                        aria-label={removeLabelAria(label.name)}
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
                      {t('labelBtn')}
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
                            <p className="text-xs text-muted-foreground px-2 py-1">{t('noLabelsYet')}</p>
                          )}
                        </div>

                        <form onSubmit={handleCreateLabel} className="border-t border-border pt-2 space-y-1.5">
                          <Input
                            type="text"
                            value={newLabelName}
                            onChange={(e) => setNewLabelName(e.target.value)}
                            placeholder={t('newLabelPlaceholder')}
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
                              {t('createLabelBtn')}
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
                  {t('dependenciesLabel')}
                </label>

                {(task.blockedBy ?? []).filter((b) => (b.relationType ?? 'BLOCKS') === 'BLOCKS').length > 0 && (
                  <div className="mb-2">
                    <p className="text-xs text-muted-foreground mb-1">{t('dependencyBlockedByDesc')}</p>
                    <div className="flex flex-wrap gap-1.5">
                      {(task.blockedBy ?? [])
                        .filter((b) => (b.relationType ?? 'BLOCKS') === 'BLOCKS')
                        .map((b) => (
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
                            aria-label={removeDependencyAria(b.title)}
                          >
                            <XMarkIcon className="h-3 w-3" />
                          </button>
                        </Badge>
                      ))}
                    </div>
                  </div>
                )}

                {(task.blocking ?? []).filter((b) => (b.relationType ?? 'BLOCKS') === 'BLOCKS').length > 0 && (
                  <div className="mb-2">
                    <p className="text-xs text-muted-foreground mb-1">{t('dependencyBlockingDesc')}</p>
                    <div className="flex flex-wrap gap-1.5">
                      {(task.blocking ?? [])
                        .filter((b) => (b.relationType ?? 'BLOCKS') === 'BLOCKS')
                        .map((b) => (
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
                            aria-label={removeDependencyAria(b.title)}
                          >
                            <XMarkIcon className="h-3 w-3" />
                          </button>
                        </Badge>
                      ))}
                    </div>
                  </div>
                )}

                {(() => {
                  const related = [
                    ...(task.blockedBy ?? []).filter((b) => (b.relationType ?? 'BLOCKS') !== 'BLOCKS'),
                    ...(task.blocking ?? []).filter((b) => (b.relationType ?? 'BLOCKS') !== 'BLOCKS'),
                  ];
                  if (related.length === 0) return null;
                  return (
                    <div className="mb-2">
                      <p className="text-xs text-muted-foreground mb-1">İlişkili kartlar:</p>
                      <div className="flex flex-wrap gap-1.5">
                        {related.map((b) => (
                          <Badge
                            key={b.id}
                            variant="outline"
                            className="flex items-center gap-1 pl-2 pr-1"
                          >
                            {RELATION_TYPE_LABELS[b.relationType ?? 'BLOCKS']}: {b.title}
                            <button
                              type="button"
                              onClick={() =>
                                (task.blockedBy ?? []).some((d) => d.id === b.id)
                                  ? handleRemoveDependency(task.id, b.id)
                                  : handleRemoveDependency(b.id, task.id)
                              }
                              className="hover:bg-black/10 rounded-sm p-0.5"
                              aria-label={`${b.title} ilişkisini kaldır`}
                            >
                              <XMarkIcon className="h-3 w-3" />
                            </button>
                          </Badge>
                        ))}
                      </div>
                    </div>
                  );
                })()}

                <div className="relative inline-block">
                  <Button
                    type="button"
                    variant="outline"
                    size="xs"
                    onClick={() => setShowDependencyPicker((v) => !v)}
                    disabled={isFilling}
                  >
                    <LinkIcon className="h-3 w-3" />
                    {t('addDependencyBtn')}
                  </Button>

                  {showDependencyPicker && (
                    <div className="absolute z-10 mt-2 w-64 rounded-lg border border-border bg-popover shadow-lg p-2">
                      <div className="flex flex-wrap gap-1 mb-2 pb-2 border-b border-border">
                        {(Object.keys(RELATION_TYPE_LABELS) as DependencyRelationType[]).map((type) => (
                          <button
                            key={type}
                            type="button"
                            onClick={() => setDependencyRelationType(type)}
                            className={`px-1.5 py-0.5 rounded text-[11px] border ${
                              dependencyRelationType === type
                                ? 'bg-primary text-primary-foreground border-primary'
                                : 'border-border text-muted-foreground hover:bg-muted'
                            }`}
                          >
                            {RELATION_TYPE_LABELS[type]}
                          </button>
                        ))}
                      </div>
                      <p className="text-xs text-muted-foreground px-1 pb-1">
                        {dependencyRelationType === 'BLOCKS'
                          ? t('addDependencyPlaceholder')
                          : 'Hangi kartla ilişkilendirilsin?'}
                      </p>
                      <div className="max-h-40 overflow-y-auto space-y-1">
                        {availableCards
                          .filter(
                            (c) =>
                              c.id !== task.id &&
                              !(task.blockedBy ?? []).some((b) => b.id === c.id) &&
                              !(task.blocking ?? []).some((b) => b.id === c.id),
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
                          <p className="text-xs text-muted-foreground px-2 py-1">{t('noOtherCards')}</p>
                        )}
                      </div>
                    </div>
                  )}
                </div>
              </div>

              {taskId !== 'new' && (
                <div>
                  <label className="block text-sm font-medium text-muted-foreground mb-1.5">
                    Üst Görev / Alt Görevler
                  </label>

                  {task.parent ? (
                    <div className="mb-2">
                      <p className="text-xs text-muted-foreground mb-1">Üst görev:</p>
                      <Badge variant="outline" className="flex items-center gap-1 pl-2 pr-1 w-fit">
                        {task.parent.title}
                        <button
                          type="button"
                          onClick={() => handleSetParent(null)}
                          className="hover:bg-black/10 rounded-sm p-0.5"
                          aria-label="Üst görevi kaldır"
                        >
                          <XMarkIcon className="h-3 w-3" />
                        </button>
                      </Badge>
                    </div>
                  ) : (
                    <div className="relative inline-block mb-2">
                      <Button type="button" variant="outline" size="xs" onClick={() => setShowParentPicker((v) => !v)}>
                        + Üst görev seç
                      </Button>
                      {showParentPicker && (
                        <div className="absolute z-10 mt-2 w-56 rounded-lg border border-border bg-popover shadow-lg p-2">
                          <div className="max-h-40 overflow-y-auto space-y-1">
                            {availableCards
                              .filter((c) => c.id !== task.id)
                              .map((c) => (
                                <button
                                  key={c.id}
                                  type="button"
                                  onClick={() => handleSetParent(c.id)}
                                  className="flex w-full px-2 py-1 rounded-md text-xs text-left text-foreground hover:bg-muted"
                                >
                                  {c.title}
                                </button>
                              ))}
                          </div>
                        </div>
                      )}
                    </div>
                  )}

                  {(task.subtasks ?? []).length > 0 && (
                    <div className="mb-2">
                      <p className="text-xs text-muted-foreground mb-1">
                        Alt görevler ({(task.subtasks ?? []).filter((s) => s.done).length}/{(task.subtasks ?? []).length}):
                      </p>
                      <div className="flex flex-wrap gap-1.5">
                        {(task.subtasks ?? []).map((s) => (
                          <Badge
                            key={s.id}
                            variant={s.done ? 'secondary' : 'outline'}
                            className="flex items-center gap-1 pl-2 pr-1"
                          >
                            {s.done && '✓ '}{s.title}
                            <button
                              type="button"
                              onClick={() => handleRemoveSubtask(s.id)}
                              className="hover:bg-black/10 rounded-sm p-0.5"
                              aria-label={`${s.title} alt görevini kaldır`}
                            >
                              <XMarkIcon className="h-3 w-3" />
                            </button>
                          </Badge>
                        ))}
                      </div>
                    </div>
                  )}

                  <div className="relative inline-block">
                    <Button type="button" variant="outline" size="xs" onClick={() => setShowSubtaskPicker((v) => !v)}>
                      + Alt görev ekle
                    </Button>
                    {showSubtaskPicker && (
                      <div className="absolute z-10 mt-2 w-56 rounded-lg border border-border bg-popover shadow-lg p-2">
                        <div className="max-h-40 overflow-y-auto space-y-1">
                          {availableCards
                            .filter(
                              (c) => c.id !== task.id && !(task.subtasks ?? []).some((s) => s.id === c.id),
                            )
                            .map((c) => (
                              <button
                                key={c.id}
                                type="button"
                                onClick={() => handleAddSubtask(c.id)}
                                className="flex w-full px-2 py-1 rounded-md text-xs text-left text-foreground hover:bg-muted"
                              >
                                {c.title}
                              </button>
                            ))}
                        </div>
                      </div>
                    )}
                  </div>
                </div>
              )}

              {taskId !== 'new' && customFields.length > 0 && (
                <div>
                  <label className="block text-sm font-medium text-muted-foreground mb-1.5">
                    Ek Alanlar
                  </label>
                  <div className="space-y-2">
                    {customFields.map((field) => {
                      const current = (task.customFieldValues ?? []).find((v) => v.fieldId === field.id)?.value ?? '';
                      if (field.type === 'CHECKBOX') {
                        return (
                          <label key={field.id} className="flex items-center gap-2 text-sm text-foreground">
                            <input
                              type="checkbox"
                              checked={current === 'true'}
                              onChange={(e) => handleSetCustomFieldValue(field.id, e.target.checked ? 'true' : 'false')}
                            />
                            {field.name}
                          </label>
                        );
                      }
                      if (field.type === 'SELECT') {
                        return (
                          <div key={field.id}>
                            <label className="block text-xs text-muted-foreground mb-1">{field.name}</label>
                            <select
                              value={current}
                              onChange={(e) => handleSetCustomFieldValue(field.id, e.target.value || null)}
                              className="flex h-9 w-full rounded-md border border-input bg-transparent px-2 text-sm text-foreground"
                            >
                              <option value="" className="bg-popover">Seç...</option>
                              {field.options.map((opt) => (
                                <option key={opt} value={opt} className="bg-popover">{opt}</option>
                              ))}
                            </select>
                          </div>
                        );
                      }
                      return (
                        <div key={field.id}>
                          <label className="block text-xs text-muted-foreground mb-1">{field.name}</label>
                          <Input
                            type={field.type === 'NUMBER' ? 'number' : field.type === 'DATE' ? 'date' : 'text'}
                            defaultValue={current}
                            onBlur={(e) => handleSetCustomFieldValue(field.id, e.target.value || null)}
                          />
                        </div>
                      );
                    })}
                  </div>
                </div>
              )}

              </>
              )}

              <div>
                <div className="mb-1 flex items-center justify-between gap-2">
                  <label htmlFor="description" className="block text-sm font-medium text-muted-foreground">
                    {t('descriptionLabel')}
                  </label>
                  {/* Yaz / Onizle: aciklama artik markdown. Onizleme yalnizca
                      icerik varsa anlamli, bos aciklamada dugmeyi gostermiyoruz. */}
                  {(task.description ?? '').trim().length > 0 && (
                    <div className="flex gap-0.5 rounded-md border border-border p-0.5">
                      <button
                        type="button"
                        onClick={() => setDescPreview(false)}
                        className={`rounded px-2 py-0.5 text-xs font-medium transition-colors ${
                          !descPreview ? 'bg-muted text-foreground' : 'text-muted-foreground hover:text-foreground'
                        }`}
                      >
                        {t('descWrite')}
                      </button>
                      <button
                        type="button"
                        onClick={() => setDescPreview(true)}
                        className={`rounded px-2 py-0.5 text-xs font-medium transition-colors ${
                          descPreview ? 'bg-muted text-foreground' : 'text-muted-foreground hover:text-foreground'
                        }`}
                      >
                        {t('descPreview')}
                      </button>
                    </div>
                  )}
                </div>
                <div className="relative">
                  {descPreview && (task.description ?? '').trim().length > 0 ? (
                    <div className="min-h-16 rounded-lg border border-input px-2.5 py-2">
                      <Markdown>{task.description ?? ''}</Markdown>
                    </div>
                  ) : (
                  <Textarea
                    id="description"
                    name="description"
                    rows={5}
                    value={task.description || ''}
                    onChange={handleChange}
                    disabled={isFilling}
                    placeholder={t('descriptionPlaceholder')}
                    className={isFilling ? "opacity-30" : ""}
                  />
                  )}
                  {isFilling && (
                    <div className="absolute inset-0 flex flex-col items-center justify-center bg-background/60 rounded-md backdrop-blur-[1px] border border-dashed border-blue-300 dark:border-blue-800 animate-pulse">
                      <div className="flex items-center gap-2 text-blue-600 dark:text-blue-400 font-medium text-sm">
                        <SparklesIcon className="h-5 w-5 animate-bounce" />
                        <span>{t('aiFillingDetails')}</span>
                      </div>
                      <span className="text-xs text-muted-foreground mt-1">{t('aiFillingDesc')}</span>
                    </div>
                  )}
                </div>
              </div>

              <div className="grid grid-cols-2 gap-4 items-start">
                <div className="space-y-4">
                  <div>
                    <label htmlFor="startDate" className="block text-sm font-medium text-muted-foreground mb-1 flex items-center gap-1.5">
                      <CalendarDaysIcon className="h-4 w-4" />
                      Başlangıç Tarihi
                    </label>
                    <Input
                      type="date"
                      id="startDate"
                      name="startDate"
                      value={task.startDate ? task.startDate.split('T')[0] : ''}
                      onChange={handleChange}
                      disabled={isFilling}
                    />
                  </div>

                  <div>
                    <label htmlFor="dueDate" className="block text-sm font-medium text-muted-foreground mb-1 flex items-center gap-1.5">
                      <CalendarDaysIcon className="h-4 w-4" />
                      {t('dueDateLabel')}
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
                      {t('priorityLabel')}
                    </label>
                    <select
                      id="priority"
                      name="priority"
                      value={task.priority || ''}
                      onChange={handleChange}
                      disabled={isFilling}
                      className="flex h-9 w-full rounded-md border border-input bg-transparent px-3 py-1 text-sm shadow-sm transition-colors file:border-0 file:bg-transparent file:text-sm file:font-medium placeholder:text-muted-foreground focus-visible:outline-none focus-visible:ring-1 focus-visible:ring-ring disabled:cursor-not-allowed disabled:opacity-50 text-foreground"
                    >
                      <option value="" className="text-foreground bg-popover">{t('priorityNone')}</option>
                      <option value="LOW" className="text-foreground bg-popover">{t('priorityLow')}</option>
                      <option value="MEDIUM" className="text-foreground bg-popover">{t('priorityMedium')}</option>
                      <option value="HIGH" className="text-foreground bg-popover">{t('priorityHigh')}</option>
                      <option value="URGENT" className="text-foreground bg-popover">{t('priorityUrgent')}</option>
                    </select>
                  </div>

                  <div>
                    <label htmlFor="storyPoints" className="block text-sm font-medium text-muted-foreground mb-1">
                      {t('storyPointsLabel')}
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
                      placeholder={t('priorityNone')}
                      disabled={isFilling}
                    />
                  </div>

                  {taskId !== 'new' && sprints.length > 0 && (
                    <div>
                      <label htmlFor="sprintId" className="block text-sm font-medium text-muted-foreground mb-1">
                        Sprint
                      </label>
                      <select
                        id="sprintId"
                        value={task.sprintId ?? ''}
                        onChange={(e) => setTask({ ...task, sprintId: e.target.value || null })}
                        disabled={isFilling}
                        className="flex h-9 w-full rounded-md border border-input bg-transparent px-3 py-1 text-sm shadow-sm text-foreground"
                      >
                        <option value="" className="bg-popover">Sprint yok</option>
                        {sprints.map((s) => (
                          <option key={s.id} value={s.id} className="bg-popover">
                            {s.name} ({s.status === 'ACTIVE' ? 'Aktif' : s.status === 'COMPLETED' ? 'Tamamlandı' : 'Planlandı'})
                          </option>
                        ))}
                      </select>
                    </div>
                  )}
                </div>

                <div>
                  <label className="block text-sm font-medium text-muted-foreground mb-1">
                    {t('assigneesLabel')}
                  </label>

                  <div className="flex flex-wrap items-center gap-1.5">
                    {(task.assignees ?? []).map((a) => (
                      <Badge
                        key={a.id}
                        variant="secondary"
                        className="flex items-center gap-1 pl-1.5 pr-1"
                      >
                        <span className="flex size-4 items-center justify-center overflow-hidden rounded-full bg-primary/10">
                          {a.avatarUrl ? (
                            // eslint-disable-next-line @next/next/no-img-element
                            <img src={a.avatarUrl} alt={a.name} className="size-4 object-cover" />
                          ) : (
                            <span className="text-[8px] font-medium text-primary">{initials(a.name)}</span>
                          )}
                        </span>
                        {a.name}
                        <button
                          type="button"
                          onClick={() => handleToggleAssignee(a.id)}
                          className="hover:bg-black/10 rounded-sm p-0.5"
                          aria-label={removeAssigneeAria(a.name)}
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
                        onClick={() => setShowAssigneePicker((v) => !v)}
                        disabled={isFilling}
                      >
                        {t('addPerson')}
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
                      {t('assigneeRequestHelp')}
                    </p>
                  )}
                </div>
              </div>

              {showSettings && taskId !== 'new' && (
                <ChecklistSection cardId={task.id} />
              )}

              {showSettings && taskId !== 'new' && (
                <AttachmentsSection cardId={task.id} isAdmin={isAdmin} />
              )}

              {showSettings && taskId !== 'new' && (
                <CommentsSection cardId={task.id} members={members} />
              )}

              <p className="text-xs text-muted-foreground font-mono">
                {taskId === 'new'
                  ? `${t('newCardRequestTitle')} | ${lang === 'en' ? 'Column' : 'Sütun'} ID: ${columnId}`
                  : `ID: ${task.id} | ${lang === 'en' ? 'Column' : 'Sütun'}: ${task.columnId}`}
              </p>
            </div>

            {taskId !== 'new' && isAdmin && showSaveTemplate && (
              <form onSubmit={handleSaveAsTemplate} className="flex items-center gap-2 pt-2">
                <Input
                  value={templateName}
                  onChange={(e) => setTemplateName(e.target.value)}
                  placeholder={t('templateNamePlaceholder')}
                  className="h-8 text-sm"
                  autoFocus
                />
                <Button type="submit" size="sm" disabled={isSavingTemplate || !templateName.trim()}>{t('save')}</Button>
                <Button type="button" size="sm" variant="ghost" onClick={() => setShowSaveTemplate(false)}>{t('cancel')}</Button>
              </form>
            )}

            {/* sticky: modal uzun icerikte kaydirilirken Kaydet/Iptal her zaman
                gorunur kalsin. mb-0, DialogFooter'in -mb-4 tasmasini iptal
                ederek bottom-0'in scroll kabinin altina oturmasini saglar. */}
            <DialogFooter className="sticky bottom-0 z-10 mt-8 mb-0 flex-wrap border-t border-border bg-popover pt-4">
              {taskId !== 'new' && (
                <Button
                  type="button"
                  variant="destructive"
                  onClick={handleDelete}
                  className="mr-auto"
                  disabled={isFilling}
                >
                  <TrashIcon className="h-4 w-4 mr-1" />
                  {isAdmin ? t('deleteTaskTitle') : (lang === 'en' ? 'Send Delete Request' : 'Silme Talebi Gönder')}
                </Button>
              )}
              {taskId !== 'new' && isAdmin && onArchiveTask && (
                <Button type="button" variant="outline" size="sm" onClick={handleArchive} disabled={isFilling}>
                  {t('archive')}
                </Button>
              )}
              {taskId !== 'new' && isAdmin && !showSaveTemplate && (
                <Button type="button" variant="outline" size="sm" onClick={() => setShowSaveTemplate(true)}>
                  <BookmarkIcon className="h-3.5 w-3.5 mr-1" /> {t('saveTemplateBtn')}
                </Button>
              )}
              <Button type="button" variant="outline" onClick={onClose} disabled={isFilling || isRequesting}>
                {t('cancel')}
              </Button>
              <Button type="button" onClick={handleSave} disabled={isFilling || isRequesting}>
                {taskId === 'new'
                  ? isAdmin
                    ? t('createCardBtn')
                    : t('createRequestBtn')
                  : isAdmin
                  ? t('saveChangesBtn')
                  : t('sendRequestBtn')}
              </Button>
            </DialogFooter>
          </>
        ) : (
          <div className="text-center py-10 text-destructive">{t('taskLoadError')}</div>
        )}
      </DialogContent>
    </Dialog>
  );
};
