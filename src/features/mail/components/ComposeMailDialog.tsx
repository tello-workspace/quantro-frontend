'use client';

import React, { useState } from 'react';
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
  useReplyMailMutation,
  useGetMailByIdQuery,
  useUploadMailAttachmentMutation,
  useDeleteMailAttachmentMutation,
  type RecipientGroup,
  type MailReplyMode,
} from '@/features/mail/mailApi';

interface MemberOption {
  userId: string;
  user: { id: string; name: string };
}
interface ProjectOption {
  id: string;
  name: string;
}

// Yanitlama/iletme baglami. Verildiginde dialog "yanit" kipine gecer:
// konu ve alinti govde SUNUCUDA uretilir (Yn:/İlt: oneki + ">" alintisi),
// bu yuzden konu alani gosterilmez. REPLY/REPLY_ALL'da alicilar da kaynak
// mesajdan turedigi icin alici secimi gizlenir; yalnizca FORWARD'da acilir.
export interface MailReplyContext {
  mailId: string;
  mode: MailReplyMode;
  // Kime gidecegini kullaniciya gostermek icin - yalnizca bilgilendirme.
  recipientPreview: string;
}

const REPLY_TITLES: Record<MailReplyMode, string> = {
  REPLY: 'Yanıtla',
  REPLY_ALL: 'Tümünü yanıtla',
  FORWARD: 'İlet',
};

interface ComposeMailDialogProps {
  orgId: string;
  currentUserId: string;
  members: MemberOption[];
  projects: ProjectOption[];
  draftId?: string;
  replyTo?: MailReplyContext;
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
  replyTo,
  triggerLabel,
  triggerVariant = 'default',
  onSent,
}) => {
  // draftId veya replyTo verilmisse dialog DISARIDAN kontrol edilir: gorunur
  // bir tetikleyici yok, bu bilesen sadece ebeveyn onu render ettigi surece
  // "acik" sayilir (bkz. MailPage'deki editingDraftId, MailDetailDialog'daki
  // replyTo). Kapanma niyeti onSent ile disariya bildirilir, ebeveyn onu
  // unmount ederek gercekten kapatir.
  const isControlled = draftId !== undefined || replyTo !== undefined;
  const isReply = replyTo !== undefined;
  const isForward = replyTo?.mode === 'FORWARD';
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
  const [replyMail, { isLoading: replying }] = useReplyMailMutation();
  const [uploadAttachment, { isLoading: uploading }] = useUploadMailAttachmentMutation();
  const [deleteAttachment] = useDeleteMailAttachmentMutation();

  // Sunucudan gelen taslagi forma BIR KEZ doldur. Effect + setState yerine
  // "render sirasinda degisimi yakala" deseni: React bu durumda mevcut
  // render'i atip yenisini calistirir, DOM'a fazladan bir tur cizilmez
  // (bkz. react.dev "You Might Not Need an Effect" - adjusting state when
  // a prop changes). Kullanicinin sonraki duzenlemeleri ezilmesin diye
  // yalnizca taslak KIMLIGI degistiginde doluyor.
  const [hydratedDraftId, setHydratedDraftId] = useState<string | null>(null);
  if (draft && draft.id !== hydratedDraftId) {
    setHydratedDraftId(draft.id);
    setSubject(draft.subject);
    setBody(draft.body);
    setSelectedUserIds(draft.recipients.map((r) => r.userId));
  }

  const sifirla = () => {
    setSubject('');
    setBody('');
    setSelectedUserIds([]);
    setGroupAll(false);
    setGroupAdmins(false);
    setGroupProjects([]);
    setActiveMailId(draftId);
    // Dialog tekrar acildiginda taslak yeniden doldurulabilsin.
    setHydratedDraftId(null);
  };

  const buildGroups = (): RecipientGroup[] => {
    const groups: RecipientGroup[] = [];
    if (groupAll) groups.push({ type: 'ORGANIZATION' });
    if (groupAdmins) groups.push({ type: 'ADMINS' });
    groupProjects.forEach((projectId) => groups.push({ type: 'PROJECT', projectId }));
    return groups;
  };

  const handleSave = async (send: boolean) => {
    // Yanit kipinde konu sunucuda uretiliyor, kullanicidan yalnizca govde
    // isteniyor - bu yuzden konu zorunlulugu burada gecerli degil.
    if (!body.trim() || (!isReply && !subject.trim())) {
      toast.error(isReply ? 'Mesaj gerekli' : 'Konu ve mesaj gerekli');
      return;
    }

    // Yanit/iletme ilk kaydinda ozel uca gidiyor: zincir baglantisini
    // (parentMailId/threadId) ve alici turetmesini sunucu kuruyor. Taslak
    // olarak kaydedildiyse artik siradan bir taslaktir; sonraki kayitlar
    // asagidaki updateDraft dalindan gecer ve zincir korunur.
    if (isReply && !activeMailId) {
      try {
        const sonuc = await replyMail({
          mailId: replyTo.mailId,
          orgId,
          mode: replyTo.mode,
          body,
          recipientUserIds: isForward ? selectedUserIds : [],
          recipientGroups: isForward ? buildGroups() : [],
          isDraft: !send,
        }).unwrap();

        if (send) {
          toast.success('Gönderildi');
          setOpen(false);
          onSent?.();
        } else {
          setActiveMailId(sonuc.id);
          setSubject(sonuc.subject);
          toast.success('Taslak kaydedildi');
        }
      } catch (err: any) {
        toast.error(err?.data?.error?.message || 'İşlem başarısız');
      }
      return;
    }

    try {
      if (activeMailId) {
        // REPLY/REPLY_ALL taslaginda alici alanlari BILEREK gonderilmiyor:
        // backend recipientUserIds'i gorunce mevcut alicilari silip yeniden
        // yaziyor. Alicilar kaynak mesajdan turetilmisti ve bu formda
        // secili degiller - gondermek onlari sifirlardi.
        const aliciAlanlari =
          isReply && !isForward
            ? {}
            : { recipientUserIds: selectedUserIds, recipientGroups: buildGroups() };

        await updateDraft({
          mailId: activeMailId,
          orgId,
          subject: subject.trim(),
          body,
          ...aliciAlanlari,
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
          <DialogTitle>
            {isReply ? REPLY_TITLES[replyTo.mode] : activeMailId ? 'Taslağı düzenle' : 'Yeni mesaj'}
          </DialogTitle>
          <DialogDescription>
            {isReply && !isForward
              ? `Alıcılar: ${replyTo.recipientPreview}`
              : 'Yalnızca bu organizasyonun üyeleri arasında gider.'}
          </DialogDescription>
        </DialogHeader>

        <div className="space-y-3">
          {/* Yanit kipinde konu sunucuda uretiliyor (Yn:/İlt: oneki), bu yuzden
              alan gosterilmez; taslak kaydedildikten sonra salt-okunur gorunur. */}
          {isReply ? (
            subject && <p className="text-sm font-medium text-muted-foreground">{subject}</p>
          ) : (
            <Input value={subject} onChange={(e) => setSubject(e.target.value)} placeholder="Konu" maxLength={200} />
          )}
          <textarea
            value={body}
            onChange={(e) => setBody(e.target.value)}
            placeholder="Mesajınız…"
            rows={6}
            className="w-full rounded-md border border-input bg-transparent px-3 py-2 text-sm"
          />

          {/* REPLY/REPLY_ALL'da alicilar kaynak mesajdan turetiliyor - secim
              yok. FORWARD yeni bir kitleye acmak demek, o yuzden acik. */}
          {(!isReply || isForward) && (
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
          )}

          {(!isReply || isForward) && (
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
          )}

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
          <Button type="button" variant="outline" onClick={() => handleSave(false)} disabled={composing || updating || replying}>
            Taslak kaydet
          </Button>
          <Button type="button" onClick={() => handleSave(true)} disabled={composing || updating || replying}>
            Gönder
          </Button>
        </DialogFooter>
      </DialogContent>
    </Dialog>
  );
};
