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
import { toast } from 'react-toastify';
import { Button, buttonVariants } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Bot } from 'lucide-react';

export default function ProjectDetailPage() {
  const params = useParams();
  const searchParams = useSearchParams();
  const router = useRouter();
  const projectId = params?.projectId as string;
  const orgId = searchParams.get('orgId') ?? '';

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
    if (!confirm('Bu projeyi silmek istediğine emin misin? Bu işlem geri alınamaz.')) return;
    try {
      await deleteProject({ orgId, projectId }).unwrap();
      toast.success('Proje silindi');
      router.push('/projects');
    } catch (err: unknown) {
      const errData = (err as { data?: { error?: string | { message?: string } } })?.data?.error;
      alert(typeof errData === 'string' ? errData : errData?.message || 'Silinemedi.');
    }
  };

  return (
    <main className="min-h-screen bg-background p-4 sm:p-6">
      <div className="mx-auto max-w-full">
        <div className="mb-6 flex flex-wrap items-center justify-between gap-3">
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
                <Button type="button" variant="ghost" onClick={() => setIsEditing(false)} size="sm">İptal</Button>
              </form>
            ) : (
              <h1 className="text-2xl font-bold text-foreground">
                {project?.name ?? 'Proje Panosu'}
              </h1>
            )}
            {errorMsg && <p className="text-xs text-destructive mt-1">{errorMsg}</p>}
          </div>

          {!isEditing && (
            <div className="flex items-center gap-2">
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
        <div className="flex gap-4 sm:gap-6">
          <div className="flex-1 min-w-0">
            <ProjectBoard projectId={projectId} orgId={orgId} />
          </div>

          {/* AI Chat sidebar (desktop) */}
          <div className="hidden sm:block shrink-0">
            <div className="sticky top-6 h-[calc(100vh-8rem)] w-80 lg:w-[420px] xl:w-[480px] transition-all duration-300">
              <AIChatPanel projectId={projectId} projectName={project?.name} />
            </div>
          </div>
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
