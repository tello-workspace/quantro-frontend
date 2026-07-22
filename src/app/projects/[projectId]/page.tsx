'use client';

import React, { useState } from 'react';
import Link from 'next/link';
import { useParams, useSearchParams, useRouter } from 'next/navigation';
import { ProjectBoard } from '@/features/board/components/ProjectBoard';
import {
  useGetProjectByIdQuery,
  useUpdateProjectMutation,
  useDeleteProjectMutation,
} from '@/features/projects/projectsApi';
import { useGetOrganizationByIdQuery } from '@/features/organizations/organizationsApi';
import { toast } from 'react-toastify';

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
    } catch (err: any) {
      const errData = err?.data?.error;
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
    } catch (err: any) {
      const errData = err?.data?.error;
      alert(typeof errData === 'string' ? errData : errData?.message || 'Silinemedi.');
    }
  };

  return (
    <main className="min-h-screen bg-zinc-50 dark:bg-zinc-950 p-6">
      <div className="max-w-7xl mx-auto">
        <div className="mb-6 flex items-center justify-between">
          <div>
            {isEditing ? (
              <form onSubmit={handleRename} className="flex items-center gap-2">
                <input
                  type="text"
                  value={name}
                  onChange={(e) => setName(e.target.value)}
                  className="text-2xl font-bold text-zinc-900 dark:text-zinc-50 bg-white dark:bg-zinc-900 border border-zinc-300 dark:border-zinc-700 rounded px-2 py-1"
                  autoFocus
                />
                <button type="submit" disabled={isUpdating} className="text-sm text-blue-600 hover:underline">
                  Kaydet
                </button>
                <button type="button" onClick={() => setIsEditing(false)} className="text-sm text-zinc-500 hover:underline">
                  İptal
                </button>
              </form>
            ) : (
              <h1 className="text-2xl font-bold text-zinc-900 dark:text-zinc-50">
                {project?.name ?? 'Proje Panosu'}
              </h1>
            )}
            {errorMsg && <p className="text-xs text-red-500 mt-1">{errorMsg}</p>}
          </div>

          {!isEditing && (
            <div className="flex gap-2 items-center">
              <Link
                href={`/projects/${projectId}/insights`}
                className="px-3 py-1.5 text-sm border border-zinc-300 dark:border-zinc-700 rounded-md hover:bg-zinc-100 dark:hover:bg-zinc-800"
              >
                İçgörüler
              </Link>
              <Link
                href={`/projects/${projectId}/activity`}
                className="px-3 py-1.5 text-sm border border-zinc-300 dark:border-zinc-700 rounded-md hover:bg-zinc-100 dark:hover:bg-zinc-800"
              >
                Aktivite
              </Link>
              {orgId && isAdmin && (
                <>
                  <button
                    onClick={startEditing}
                    className="px-3 py-1.5 text-sm border border-zinc-300 dark:border-zinc-700 rounded-md hover:bg-zinc-100 dark:hover:bg-zinc-800"
                  >
                    Yeniden Adlandır
                  </button>
                  <button
                    onClick={handleDelete}
                    disabled={isDeleting}
                    className="px-3 py-1.5 text-sm border border-red-300 text-red-600 rounded-md hover:bg-red-50 disabled:opacity-50"
                  >
                    Sil
                  </button>
                </>
              )}
            </div>
          )}
        </div>

        <ProjectBoard projectId={projectId} orgId={orgId} />
      </div>
    </main>
  );
}
