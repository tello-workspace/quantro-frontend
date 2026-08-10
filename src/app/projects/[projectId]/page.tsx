'use client';

import React, { useState } from 'react';
import Link from 'next/link';
import { useParams, useSearchParams, useRouter } from 'next/navigation';
import { ProjectBoard } from '@/features/board/components/ProjectBoard';
import { AIChatPanel } from '@/features/ai/AIChatPanel';
import {
  useGetProjectByIdQuery,
  useUpdateProjectMutation,
  useDeleteProjectMutation,
} from '@/features/projects/projectsApi';
import { useGetOrganizationByIdQuery } from '@/features/organizations/organizationsApi';
import { toast } from "sonner";
import { useConfirm } from '@/hooks/useConfirm';
import { Button, buttonVariants } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { ArrowLeft, Bot } from 'lucide-react';
import { useTranslation } from '@/hooks/useTranslation';

export default function ProjectDetailPage() {
  const { t } = useTranslation();
  const params = useParams();
  const searchParams = useSearchParams();
  const router = useRouter();
  const confirm = useConfirm();
  const projectId = params?.projectId as string;
  const orgId = searchParams.get('orgId') ?? '';
  const openCard = searchParams.get('openCard') ?? undefined;
  // ?card=QNT-42 - insan-okunur anahtarla derin baglanti. Commit mesajina,
  // Slack'e, e-postaya yapistirilabilen adres bicimi bu.
  const openCardKey = searchParams.get('card') ?? undefined;

  const { data: project } = useGetProjectByIdQuery({ orgId, projectId }, { skip: !orgId });
  const { data: org } = useGetOrganizationByIdQuery({ orgId }, { skip: !orgId });
  const isAdmin = org?.myRole === 'ADMIN';

  const [isEditing, setIsEditing] = useState(false);
  const [name, setName] = useState('');
  const [errorMsg, setErrorMsg] = useState('');
  const [mobileChatOpen, setMobileChatOpen] = useState(false);

  const [updateProject, { isLoading: isUpdating }] = useUpdateProjectMutation();
  const [deleteProject, { isLoading: isDeleting }] = useDeleteProjectMutation();

  const startEditing = () => {
    setName(project?.name ?? '');
    setIsEditing(true);
  };

  const handleRename = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!orgId || !name.trim()) return;
    try {
      await updateProject({ orgId, projectId, name: name.trim() }).unwrap();
      toast.success('Proje yeniden adlandırıldı');
      setIsEditing(false);
    } catch (err: unknown) {
      const errData = (err as { data?: { error?: string | { message?: string } } })?.data?.error;
      setErrorMsg(typeof errData === 'string' ? errData : errData?.message || 'Güncellenemedi.');
    }
  };

  const handleDelete = async () => {
    if (!orgId) return;
    const ok = await confirm({
      title: 'Projeyi Sil',
      description: 'Bu projeyi silmek istediğinize emin misin? Bu işlem geri alınamaz.',
      confirmText: 'Sil',
      cancelText: 'İptal',
      variant: 'destructive',
    });
    if (!ok) return;
    try {
      await deleteProject({ orgId, projectId }).unwrap();
      toast.success('Proje silindi');
      router.push('/projects');
    } catch (err: unknown) {
      const errData = (err as { data?: { error?: string | { message?: string } } })?.data?.error;
      toast.error(typeof errData === 'string' ? errData : errData?.message || 'Silinemedi.');
    }
  };

  return (
    <main className="h-[calc(100vh-56px)] bg-background flex flex-col overflow-hidden pt-2 pb-4 px-4 sm:px-6">
      <div className="flex flex-col flex-1 min-h-0 max-w-full">
        <div className="mb-2.5 flex flex-wrap items-center justify-between gap-3 shrink-0">
          <div>
            {isEditing ? (
              <form onSubmit={handleRename} className="flex items-center gap-2">
                <Input
                  type="text"
                  value={name}
                  onChange={(e) => setName(e.target.value)}
                  className="text-2xl font-bold h-auto py-1 px-2"
                  autoFocus
                />
                <Button type="submit" disabled={isUpdating} size="sm">Kaydet</Button>
                <Button type="button" variant="ghost" onClick={() => setIsEditing(false)} size="sm">{t('cancel')}</Button>
              </form>
            ) : (
              <>
                {/* Projeye girince organizasyona donus yolu yoktu; sidebar'i
                    acmadan tek tikla org sekmesine donmek icin kirinti. */}
                <Link
                  href={`/projects${orgId ? `?orgId=${orgId}` : ''}`}
                  className="inline-flex items-center gap-1 text-xs text-muted-foreground transition-colors hover:text-foreground"
                >
                  <ArrowLeft className="size-3.5" />
                  {org?.name ?? 'Organizasyon'}
                </Link>
                <h1 className="text-2xl font-bold text-foreground">
                  {project?.name ?? 'Proje Panosu'}
                </h1>
              </>
            )}
            {errorMsg && <p className="text-xs text-destructive mt-1">{errorMsg}</p>}
          </div>

          {!isEditing && (
            <div className="flex items-center gap-2 shrink-0">
              <Link
                href={`/projects/${projectId}/insights?orgId=${orgId}`}
                className={buttonVariants({ variant: 'outline', size: 'sm' })}
              >
                İçgörüler
              </Link>
              <Link
                href={`/projects/${projectId}/activity?orgId=${orgId}`}
                className={buttonVariants({ variant: 'outline', size: 'sm' })}
              >
                Aktivite
              </Link>
              <Link
                href={`/projects/${projectId}/documents?orgId=${orgId}`}
                className={buttonVariants({ variant: 'outline', size: 'sm' })}
              >
                İlgili Belgeler
              </Link>
              {orgId && isAdmin && (
                <>
                  <Button variant="outline" size="sm" onClick={startEditing}>
                    Yeniden Adlandır
                  </Button>
                  <Button variant="destructive" size="sm" disabled={isDeleting} onClick={handleDelete}>
                    Sil
                  </Button>
                </>
              )}
            </div>
          )}
        </div>

        {/* Board + AI Chat side-by-side */}
        <div className="flex-1 min-h-0">
          <ProjectBoard projectId={projectId} orgId={orgId} projectName={project?.name} initialOpenCardId={openCard} initialOpenCardKey={openCardKey} />
        </div>

        {/* Mobile floating AI button */}
        {!mobileChatOpen && (
          <button
            onClick={() => setMobileChatOpen(true)}
            className="fixed bottom-6 right-6 z-40 flex items-center gap-2 rounded-full bg-primary px-4 py-3 text-primary-foreground shadow-lg hover:opacity-90 transition-all sm:hidden"
          >
            <Bot className="h-5 w-5" />
            <span className="text-sm font-medium">AI Asistan</span>
          </button>
        )}

        {/* Mobile AI chat overlay */}
        {mobileChatOpen && (
          <div className="fixed inset-0 z-50 sm:hidden">
            <AIChatPanel
              projectId={projectId}
              projectName={project?.name}
              isMobile={true}
              onClose={() => setMobileChatOpen(false)}
            />
          </div>
        )}
      </div>
    </main>
  );
}
