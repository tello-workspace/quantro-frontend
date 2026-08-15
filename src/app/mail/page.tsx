'use client';

import React, { useState } from 'react';
import { useSearchParams } from 'next/navigation';
import { toast } from 'sonner';
import { Trash2, Paperclip, MailOpen } from 'lucide-react';
import { Tabs, TabsContent, TabsList, TabsTrigger } from '@/components/ui/tabs';
import { Button } from '@/components/ui/button';
import { useGetMeQuery } from '@/features/auth/meApi';
import { useGetOrganizationByIdQuery } from '@/features/organizations/organizationsApi';
import { useGetProjectsQuery } from '@/features/projects/projectsApi';
import { useListMailQuery, useDeleteMailMutation, type MailFolder, type MailListItem } from '@/features/mail/mailApi';
import { ComposeMailDialog } from '@/features/mail/components/ComposeMailDialog';
import { MailDetailDialog } from '@/features/mail/components/MailDetailDialog';

const FOLDER_LABELS: Record<MailFolder, string> = {
  inbox: 'Gelen Kutusu',
  sent: 'Gönderilenler',
  drafts: 'Taslaklar',
};

export default function MailPage() {
  const searchParams = useSearchParams();
  const orgId = searchParams.get('orgId') ?? '';
  const [folder, setFolder] = useState<MailFolder>('inbox');
  const [openMailId, setOpenMailId] = useState<string | null>(null);
  const [editingDraftId, setEditingDraftId] = useState<string | null>(null);

  const { data: me } = useGetMeQuery();
  const { data: org } = useGetOrganizationByIdQuery({ orgId }, { skip: !orgId });
  const { data: projects = [] } = useGetProjectsQuery({ orgId }, { skip: !orgId });
  const { data: mails = [], isLoading } = useListMailQuery({ orgId, folder }, { skip: !orgId });
  const [deleteMail] = useDeleteMailMutation();

  const members = org?.members ?? [];

  const handleDelete = async (mailId: string, e: React.MouseEvent) => {
    e.stopPropagation();
    try {
      await deleteMail({ mailId, orgId }).unwrap();
      toast.success(folder === 'drafts' ? 'Taslak silindi' : 'Silindi');
    } catch {
      toast.error('Silinemedi');
    }
  };

  const handleRowClick = (mail: MailListItem) => {
    if (folder === 'drafts') setEditingDraftId(mail.id);
    else setOpenMailId(mail.id);
  };

  if (!orgId) {
    return (
      <main className="min-h-[calc(100vh-56px)] bg-background p-6">
        <p className="text-sm text-muted-foreground">Bir organizasyon seçmelisin.</p>
      </main>
    );
  }

  return (
    <main className="min-h-[calc(100vh-56px)] bg-background px-4 py-6 sm:px-6">
      <div className="mx-auto w-full max-w-4xl">
        <div className="mb-6 flex items-center justify-between">
          <h1 className="text-2xl font-bold text-foreground">Mailbox</h1>
          {me && (
            <ComposeMailDialog orgId={orgId} currentUserId={me.id} members={members} projects={projects} triggerLabel="Yeni mesaj" />
          )}
        </div>

        <Tabs value={folder} onValueChange={(v) => setFolder(v as MailFolder)}>
          <TabsList className="grid w-full grid-cols-3">
            {(['inbox', 'sent', 'drafts'] as MailFolder[]).map((f) => (
              <TabsTrigger key={f} value={f} className="h-9">
                {FOLDER_LABELS[f]}
              </TabsTrigger>
            ))}
          </TabsList>

          <TabsContent value={folder} className="mt-5">
            {isLoading && <p className="text-sm text-muted-foreground">Yükleniyor…</p>}

            {!isLoading && mails.length === 0 && (
              <div className="rounded-lg border border-dashed border-border p-8 text-center">
                <MailOpen className="mx-auto mb-2 size-5 text-muted-foreground" />
                <p className="text-sm text-muted-foreground">
                  {folder === 'inbox' ? 'Gelen kutun boş.' : folder === 'sent' ? 'Henüz mesaj göndermedin.' : 'Taslak yok.'}
                </p>
              </div>
            )}

            <div className="space-y-1.5">
              {mails.map((mail) => (
                <button
                  key={mail.id}
                  type="button"
                  onClick={() => handleRowClick(mail)}
                  className={`flex w-full items-center gap-3 rounded-lg border border-border p-3 text-left transition-colors hover:bg-muted/50 ${
                    folder === 'inbox' && !mail.read ? 'bg-primary/5' : ''
                  }`}
                >
                  <div className="min-w-0 flex-1">
                    <div className="flex items-center gap-2">
                      <p className={`truncate text-sm ${folder === 'inbox' && !mail.read ? 'font-semibold' : 'font-medium'}`}>
                        {mail.subject}
                      </p>
                      {mail._count.attachments > 0 && <Paperclip className="size-3 shrink-0 text-muted-foreground" />}
                    </div>
                    <p className="truncate text-xs text-muted-foreground">
                      {folder === 'sent' ? 'Sen' : mail.sender.name} · {mail.body.slice(0, 80)}
                    </p>
                  </div>
                  <span className="shrink-0 text-xs text-muted-foreground">
                    {new Date(mail.sentAt ?? mail.createdAt).toLocaleDateString()}
                  </span>
                  <Button
                    type="button"
                    variant="ghost"
                    size="icon-sm"
                    className="shrink-0 text-destructive hover:text-destructive"
                    onClick={(e) => handleDelete(mail.id, e)}
                    title="Sil"
                  >
                    <Trash2 className="size-3.5" />
                  </Button>
                </button>
              ))}
            </div>
          </TabsContent>
        </Tabs>
      </div>

      {me && (
        <MailDetailDialog
          mailId={openMailId}
          onClose={() => setOpenMailId(null)}
          orgId={orgId}
          currentUserId={me.id}
          members={members}
          projects={projects}
        />
      )}

      {editingDraftId && me && (
        <ComposeMailDialog
          orgId={orgId}
          currentUserId={me.id}
          members={members}
          projects={projects}
          draftId={editingDraftId}
          onSent={() => setEditingDraftId(null)}
        />
      )}
    </main>
  );
}
