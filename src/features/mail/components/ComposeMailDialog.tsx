'use client';

import React, { useEffect, useState } from 'react';
import { toast } from 'sonner';
import { Paperclip, Trash2 } from 'lucide-react';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogFooter,
  DialogHeader,
  DialogTitle,
  DialogTrigger,
} from '@/components/ui/dialog';
import {
  useComposeMailMutation,
  useUpdateDraftMutation,
  useGetMailByIdQuery,
  useUploadMailAttachmentMutation,
  useDeleteMailAttachmentMutation,
  type RecipientGroup,
} from '@/features/mail/mailApi';

interface MemberOption {
  userId: string;
  user: { id: string; name: string };
}
interface ProjectOption {
  id: string;
  name: string;
}

interface ComposeMailDialogProps {
  orgId: string;
  currentUserId: string;
  members: MemberOption[];
  projects: ProjectOption[];
  draftId?: string;
  triggerLabel?: string;
  triggerVariant?: 'default' | 'outline' | 'ghost';
  onSent?: () => void;
}

// Iki asamali akis: yeni mesaj once TASLAK olarak kaydedilir (activeMailId
// bu andan sonra dolar), boylece ek dosya yuklenebilir - backend ekleri
// yalnizca mevcut bir mail'e (mailId'si olan) kabul ediyor. "Gonder"
// dogrudan da tiklanebilir, o zaman ek eklenmeden gider - hizli gonderim
// ek yonetiminden daha oncelikli.
export const ComposeMailDialog: React.FC<ComposeMailDialogProps> = ({
  orgId,
  currentUserId,
  members,
  projects,
  draftId,
  triggerLabel,
  triggerVariant = 'default',
  onSent,
}) => {
  // draftId verilmisse dialog DISARIDAN kontrol edilir: gorunur bir tetikleyici
  // yok, bu bilesen sadece ebeveyn onu render ettigi surece "acik" sayilir
  // (bkz. MailPage'deki editingDraftId). Kapanma niyeti onSent ile disariya
  // bildirilir, ebeveyn onu unmount ederek gercekten kapatir.
  const isControlled = draftId !== undefined;
  const [internalOpen, setInternalOpen] = useState(false);
  const open = isControlled ? true : internalOpen;
  const setOpen = (v: boolean) => {
    if (isControlled) {
      if (!v) onSent?.();
      return;
    }
    setInternalOpen(v);
  };
  const [subject, setSubject] = useState('');
  const [body, setBody] = useState('');
  const [selectedUserIds, setSelectedUserIds] = useState<string[]>([]);
  const [groupAll, setGroupAll] = useState(false);
  const [groupAdmins, setGroupAdmins] = useState(false);
  const [groupProjects, setGroupProjects] = useState<string[]>([]);
  const [activeMailId, setActiveMailId] = useState<string | undefined>(draftId);

  const { data: draft } = useGetMailByIdQuery(activeMailId ?? '', { skip: !activeMailId || !open });
  const [composeMail, { isLoading: composing }] = useComposeMailMutation();
  const [updateDraft, { isLoading: updating }] = useUpdateDraftMutation();
  const [uploadAttachment, { isLoading: uploading }] = useUploadMailAttachmentMutation();
  const [deleteAttachment] = useDeleteMailAttachmentMutation();

  useEffect(() => {
    if (draft) {
      setSubject(draft.subject);
      setBody(draft.body);
      setSelectedUserIds(draft.recipients.map((r) => r.userId));
    }
  }, [draft]);

  const sifirla = () => {
    setSubject('');
    setBody('');
    setSelectedUserIds([]);
    setGroupAll(false);
    setGroupAdmins(false);
    setGroupProjects([]);
    setActiveMailId(draftId);
  };

  const buildGroups = (): RecipientGroup[] => {
    const groups: RecipientGroup[] = [];
    if (groupAll) groups.push({ type: 'ORGANIZATION' });
    if (groupAdmins) groups.push({ type: 'ADMINS' });
    groupProjects.forEach((projectId) => groups.push({ type: 'PROJECT', projectId }));
    return groups;
  };

  const handleSave = async (send: boolean) => {
    if (!subject.trim() || !body.trim()) {
      toast.error('Konu ve mesaj gerekli');
      return;
    }
    try {
      if (activeMailId) {
        await updateDraft({
          mailId: activeMailId,
          orgId,
          subject: subject.trim(),
          body,
          recipientUserIds: selectedUserIds,
          recipientGroups: buildGroups(),
          send,
        }).unwrap();
      } else {
        const sonuc = await composeMail({
          orgId,
          subject: subject.trim(),
          body,
          recipientUserIds: selectedUserIds,
          recipientGroups: buildGroups(),
          isDraft: !send,
        }).unwrap();
        if (!send) setActiveMailId(sonuc.id);
      }

      if (send) {
        toast.success('Gönderildi');
        setOpen(false);
        onSent?.();
      } else {
        toast.success('Taslak kaydedildi');
      }
    } catch (err: any) {
      toast.error(err?.data?.error?.message || 'İşlem başarısız');
    }
  };

  const handleFileChange = async (e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0];
    if (!file || !activeMailId) return;
    try {
      await uploadAttachment({ mailId: activeMailId, file }).unwrap();
    } catch (err: any) {
      toast.error(err?.data?.error?.message || 'Dosya yüklenemedi');
    }
    e.target.value = '';
  };

  return (
    <Dialog
      open={open}
      onOpenChange={(v) => {
        setOpen(v);
        if (!v) sifirla();
      }}
    >
      {!isControlled && (
        <DialogTrigger render={<Button type="button" variant={triggerVariant} size="sm" />}>{triggerLabel}</DialogTrigger>
      )}
      <DialogContent className="max-h-[85vh] max-w-2xl overflow-y-auto sm:max-w-2xl">
        <DialogHeader>
          <DialogTitle>{activeMailId ? 'Taslağı düzenle' : 'Yeni mesaj'}</DialogTitle>
          <DialogDescription>Yalnızca bu organizasyonun üyeleri arasında gider.</DialogDescription>
        </DialogHeader>

        <div className="space-y-3">
          <Input value={subject} onChange={(e) => setSubject(e.target.value)} placeholder="Konu" maxLength={200} />
          <textarea
            value={body}
            onChange={(e) => setBody(e.target.value)}
            placeholder="Mesajınız…"
            rows={6}
            className="w-full rounded-md border border-input bg-transparent px-3 py-2 text-sm"
          />

          <div>
            <p className="mb-1.5 text-xs font-semibold text-muted-foreground">Gruplara gönder</p>
            <div className="flex flex-wrap gap-2">
              <button
                type="button"
                onClick={() => setGroupAll((v) => !v)}
                className={`rounded-full border px-3 py-1 text-xs font-medium transition-colors ${
                  groupAll ? 'border-primary bg-primary/10 text-primary' : 'border-border text-muted-foreground'
                }`}
              >
                Tüm organizasyon
              </button>
              <button
                type="button"
                onClick={() => setGroupAdmins((v) => !v)}
                className={`rounded-full border px-3 py-1 text-xs font-medium transition-colors ${
                  groupAdmins ? 'border-primary bg-primary/10 text-primary' : 'border-border text-muted-foreground'
                }`}
              >
                Sadece adminler
              </button>
              {projects.map((p) => (
                <button
                  key={p.id}
                  type="button"
                  onClick={() =>
                    setGroupProjects((prev) => (prev.includes(p.id) ? prev.filter((id) => id !== p.id) : [...prev, p.id]))
                  }
                  className={`rounded-full border px-3 py-1 text-xs font-medium transition-colors ${
                    groupProjects.includes(p.id) ? 'border-primary bg-primary/10 text-primary' : 'border-border text-muted-foreground'
                  }`}
                >
                  {p.name} ekibi
                </button>
              ))}
            </div>
          </div>

          <div>
            <p className="mb-1.5 text-xs font-semibold text-muted-foreground">Kişilere gönder</p>
            <div className="max-h-40 space-y-1 overflow-y-auto rounded-md border border-border p-2">
              {members.filter((m) => m.userId !== currentUserId).length === 0 && (
                <p className="text-xs text-muted-foreground">Organizasyonda başka üye yok.</p>
              )}
              {members
                .filter((m) => m.userId !== currentUserId)
                .map((m) => (
                  <label key={m.userId} className="flex items-center gap-2 text-sm">
                    <input
                      type="checkbox"
                      checked={selectedUserIds.includes(m.userId)}
                      onChange={(e) =>
                        setSelectedUserIds((prev) =>
                          e.target.checked ? [...prev, m.userId] : prev.filter((id) => id !== m.userId),
                        )
                      }
                    />
                    {m.user.name}
                  </label>
                ))}
            </div>
          </div>

          {activeMailId && (
            <div>
              <p className="mb-1.5 text-xs font-semibold text-muted-foreground">Ekler</p>
              <div className="space-y-1">
                {draft?.attachments.map((a) => (
                  <div key={a.id} className="flex items-center gap-2 rounded-md border border-border/50 px-2 py-1 text-xs">
                    <Paperclip className="size-3.5 shrink-0 text-muted-foreground" />
                    <span className="min-w-0 flex-1 truncate">{a.fileName}</span>
                    <Button
                      type="button"
                      variant="ghost"
                      size="icon-sm"
                      onClick={() => deleteAttachment({ mailId: activeMailId, attachmentId: a.id })}
                    >
                      <Trash2 className="size-3.5" />
                    </Button>
                  </div>
                ))}
              </div>
              <input type="file" onChange={handleFileChange} disabled={uploading} className="mt-1.5 text-xs" />
            </div>
          )}
        </div>

        <DialogFooter>
          <Button type="button" variant="outline" onClick={() => handleSave(false)} disabled={composing || updating}>
            Taslak kaydet
          </Button>
          <Button type="button" onClick={() => handleSave(true)} disabled={composing || updating}>
            Gönder
          </Button>
        </DialogFooter>
      </DialogContent>
    </Dialog>
  );
};
