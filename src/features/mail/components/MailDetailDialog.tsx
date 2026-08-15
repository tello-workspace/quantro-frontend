'use client';

import React, { useState } from 'react';
import { Paperclip, Download, Reply, ReplyAll, Forward } from 'lucide-react';
import { Button } from '@/components/ui/button';
import { Dialog, DialogContent, DialogFooter, DialogHeader, DialogTitle } from '@/components/ui/dialog';
import { useGetMailByIdQuery, type MailReplyMode } from '@/features/mail/mailApi';
import { ComposeMailDialog } from '@/features/mail/components/ComposeMailDialog';

interface MemberOption {
  userId: string;
  user: { id: string; name: string };
}
interface ProjectOption {
  id: string;
  name: string;
}

interface MailDetailDialogProps {
  mailId: string | null;
  onClose: () => void;
  orgId: string;
  currentUserId: string;
  members: MemberOption[];
  projects: ProjectOption[];
}

export const MailDetailDialog: React.FC<MailDetailDialogProps> = ({
  mailId,
  onClose,
  orgId,
  currentUserId,
  members,
  projects,
}) => {
  const { data: mail, isLoading } = useGetMailByIdQuery(mailId ?? '', { skip: !mailId });
  const [replyMode, setReplyMode] = useState<MailReplyMode | null>(null);

  // "Tumunu yanitla" yalnizca gercekten baska bir muhatap varken anlamli:
  // tek alicili bir mesajda REPLY ile ayni sonucu verirdi. Kendim disindaki
  // alicilar + gonderen sayilir.
  const digerMuhataplar = mail
    ? [mail.senderId, ...mail.recipients.map((r) => r.userId)].filter((id) => id !== currentUserId)
    : [];
  const tumunuYanitlaGorunur = new Set(digerMuhataplar).size > 1;

  // Yanit alicilarinin kullaniciya gosterilecek onizlemesi (sunucu ayni
  // kumeyi kendisi turetiyor; bu yalnizca bilgilendirme).
  const isimBul = (userId: string) =>
    userId === mail?.senderId
      ? mail.sender.name
      : mail?.recipients.find((r) => r.userId === userId)?.user.name ?? 'Bilinmeyen';

  const recipientPreview =
    replyMode === 'REPLY'
      ? mail?.sender.name ?? ''
      : Array.from(new Set(digerMuhataplar)).map(isimBul).join(', ');

  const handleReplySent = () => {
    setReplyMode(null);
    onClose();
  };

  return (
    <>
      <Dialog open={!!mailId && replyMode === null} onOpenChange={(v) => !v && onClose()}>
        <DialogContent className="max-h-[85vh] max-w-2xl overflow-y-auto sm:max-w-2xl">
          {isLoading && <p className="text-sm text-muted-foreground">Yükleniyor…</p>}
          {mail && (
            <>
              <DialogHeader>
                <DialogTitle>{mail.subject}</DialogTitle>
              </DialogHeader>
              <div className="space-y-3 text-sm">
                <div className="flex flex-wrap items-center gap-x-2 text-xs text-muted-foreground">
                  <span className="font-medium text-foreground">{mail.sender.name}</span>
                  <span>→</span>
                  <span>{mail.recipients.map((r) => r.user.name).join(', ') || '—'}</span>
                  {mail.sentAt && <span className="ml-auto">{new Date(mail.sentAt).toLocaleString()}</span>}
                </div>
                <p className="whitespace-pre-wrap">{mail.body}</p>

                {mail.attachments.length > 0 && (
                  <div className="space-y-1 border-t border-border pt-3">
                    {mail.attachments.map((a) => (
                      <a
                        key={a.id}
                        href={a.downloadUrl ?? undefined}
                        target="_blank"
                        rel="noreferrer"
                        className="flex items-center gap-2 rounded-md border border-border/50 px-2 py-1.5 text-xs hover:bg-muted/50"
                      >
                        <Paperclip className="size-3.5 shrink-0 text-muted-foreground" />
                        <span className="min-w-0 flex-1 truncate">{a.fileName}</span>
                        <Download className="size-3.5 shrink-0 text-muted-foreground" />
                      </a>
                    ))}
                  </div>
                )}

                {/* Konusmanin geri kalani: yalnizca kullanicinin gorme hakki
                    olan mesajlar sunucudan geliyor. */}
                {mail.thread.length > 0 && (
                  <div className="space-y-2 border-t border-border pt-3">
                    <p className="text-xs font-semibold text-muted-foreground">
                      Konuşma ({mail.thread.length} mesaj)
                    </p>
                    {mail.thread.map((m) => (
                      <div key={m.id} className="rounded-md border border-border/50 px-3 py-2">
                        <div className="flex flex-wrap items-center gap-x-2 text-xs text-muted-foreground">
                          <span className="font-medium text-foreground">{m.sender.name}</span>
                          {m._count.attachments > 0 && <Paperclip className="size-3" />}
                          {m.sentAt && <span className="ml-auto">{new Date(m.sentAt).toLocaleString()}</span>}
                        </div>
                        <p className="mt-1 whitespace-pre-wrap text-xs">{m.body}</p>
                      </div>
                    ))}
                  </div>
                )}
              </div>

              <DialogFooter>
                <Button type="button" variant="outline" size="sm" onClick={() => setReplyMode('REPLY')}>
                  <Reply className="size-4" />
                  Yanıtla
                </Button>
                {tumunuYanitlaGorunur && (
                  <Button type="button" variant="outline" size="sm" onClick={() => setReplyMode('REPLY_ALL')}>
                    <ReplyAll className="size-4" />
                    Tümünü yanıtla
                  </Button>
                )}
                <Button type="button" variant="outline" size="sm" onClick={() => setReplyMode('FORWARD')}>
                  <Forward className="size-4" />
                  İlet
                </Button>
              </DialogFooter>
            </>
          )}
        </DialogContent>
      </Dialog>

      {mail && replyMode && (
        <ComposeMailDialog
          orgId={orgId}
          currentUserId={currentUserId}
          members={members}
          projects={projects}
          replyTo={{ mailId: mail.id, mode: replyMode, recipientPreview }}
          onSent={handleReplySent}
        />
      )}
    </>
  );
};
