'use client';

import React from 'react';
import { Paperclip, Download } from 'lucide-react';
import { Button } from '@/components/ui/button';
import { Dialog, DialogContent, DialogHeader, DialogTitle } from '@/components/ui/dialog';
import { useGetMailByIdQuery } from '@/features/mail/mailApi';

interface MailDetailDialogProps {
  mailId: string | null;
  onClose: () => void;
}

export const MailDetailDialog: React.FC<MailDetailDialogProps> = ({ mailId, onClose }) => {
  const { data: mail, isLoading } = useGetMailByIdQuery(mailId ?? '', { skip: !mailId });

  return (
    <Dialog open={!!mailId} onOpenChange={(v) => !v && onClose()}>
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
            </div>
          </>
        )}
      </DialogContent>
    </Dialog>
  );
};
