'use client';

import React, { useState } from 'react';
import Link from 'next/link';
import { useParams, useSearchParams } from 'next/navigation';
import { toast } from 'sonner';
import { AlertTriangle, ArrowLeft, Download, FileText, Trash2, UploadCloud, X } from 'lucide-react';
import { useGetProjectByIdQuery } from '@/features/projects/projectsApi';
import { useGetOrganizationByIdQuery } from '@/features/organizations/organizationsApi';
import { useGetMeQuery } from '@/features/auth/meApi';
import {
  useGetDocumentsQuery,
  useUploadDocumentMutation,
  useDeleteDocumentMutation,
} from '@/features/documents/documentsApi';
import { useConfirm } from '@/hooks/useConfirm';
import { FileUpload } from '@/components/ui/file-upload';

const MAX_DOCUMENT_SIZE = 20 * 1024 * 1024; // 20MB — document-policy.ts (backend) ile ayni

function formatFileSize(bytes: number): string {
  if (bytes < 1024) return `${bytes} B`;
  if (bytes < 1024 * 1024) return `${(bytes / 1024).toFixed(1)} KB`;
  return `${(bytes / (1024 * 1024)).toFixed(1)} MB`;
}

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

export default function ProjectDocumentsPage() {
  const params = useParams();
  const searchParams = useSearchParams();
  const confirm = useConfirm();
  const projectId = params?.projectId as string;
  const orgId = searchParams.get('orgId') ?? '';

  const { data: project } = useGetProjectByIdQuery({ orgId, projectId }, { skip: !orgId });
  const { data: org } = useGetOrganizationByIdQuery({ orgId }, { skip: !orgId });
  const { data: me } = useGetMeQuery();
  const isAdmin = org?.myRole === 'ADMIN';

  const { data: documents = [], isLoading } = useGetDocumentsQuery(projectId, { skip: !projectId });
  const [uploadDocument, { isLoading: isUploading }] = useUploadDocumentMutation();
  const [deleteDocument] = useDeleteDocumentMutation();

  const [pendingFiles, setPendingFiles] = useState<File[]>([]);

  const isSameFile = (a: File, b: File) =>
    a.name === b.name && a.size === b.size && a.lastModified === b.lastModified;

  const handleFilesPicked = (files: File[]) => {
    if (files.length === 0) return;

    const oversized = files.filter((f) => f.size > MAX_DOCUMENT_SIZE);
    if (oversized.length > 0) {
      toast.error(`${oversized.map((f) => f.name).join(', ')}: en fazla 20MB olabilir.`);
    }

    const uploadable = files.filter((f) => f.size <= MAX_DOCUMENT_SIZE);
    setPendingFiles((prev) => [
      ...prev,
      ...uploadable.filter((f) => !prev.some((p) => isSameFile(p, f))),
    ]);
  };

  const removePendingFile = (file: File) => {
    setPendingFiles((prev) => prev.filter((f) => !isSameFile(f, file)));
  };

  const handleSavePendingFiles = async () => {
    if (pendingFiles.length === 0) return;

    let successCount = 0;
    const failed: File[] = [];
    for (const file of pendingFiles) {
      try {
        await uploadDocument({ projectId, file }).unwrap();
        successCount += 1;
      } catch (err: unknown) {
        const errData = (err as { data?: { error?: { message?: string } } })?.data?.error;
        toast.error(`${file.name}: ${errData?.message || 'Belge yüklenemedi.'}`);
        failed.push(file);
      }
    }

    setPendingFiles(failed);

    if (successCount > 0) {
      toast.success(
        successCount === 1
          ? 'Belge yüklendi. Claude artık MCP üzerinden bu belgeyi doğrudan okuyabilir.'
          : `${successCount} belge yüklendi. Claude artık MCP üzerinden bu belgeleri doğrudan okuyabilir.`,
      );
    }
  };

  const handleDelete = async (documentId: string) => {
    const ok = await confirm({
      title: 'Belgeyi Sil',
      description: 'Bu belgeyi silmek istediğine emin misin? Bu işlem geri alınamaz.',
      confirmText: 'Sil',
      cancelText: 'İptal',
      variant: 'destructive',
    });
    if (!ok) return;
    try {
      await deleteDocument({ projectId, documentId }).unwrap();
    } catch (err: unknown) {
      const errData = (err as { data?: { error?: { message?: string } } })?.data?.error;
      toast.error(errData?.message || 'Belge silinemedi.');
    }
  };

  return (
    <main className="min-h-screen bg-background p-6">
      <div className="max-w-3xl mx-auto space-y-6">
        <div className="flex items-center justify-between">
          <div>
            <h1 className="text-2xl font-bold text-foreground">İlgili Belgeler</h1>
            <p className="text-sm text-muted-foreground mt-0.5">{project?.name ?? 'Proje'}</p>
          </div>
          <Link
            href={`/projects/${projectId}?orgId=${orgId}`}
            className="inline-flex items-center gap-1 text-sm text-muted-foreground transition-colors hover:text-foreground"
          >
            <ArrowLeft className="size-3.5" />
            Panoya dön
          </Link>
        </div>

        <div className="rounded-2xl border border-border bg-card/40 p-4 sm:p-6 space-y-4">
          <div>
            <h2 className="text-sm font-semibold text-foreground">Belgeler</h2>
            <p className="text-xs text-muted-foreground mt-1">
              Buraya yüklenen belgeler (şartname, PRD, sözleşme vb.) Claude tarafından MCP
              üzerinden doğrudan okunabilir — her seferinde tekrar yapıştırmana gerek kalmaz.
            </p>
          </div>

          <div className="space-y-2">
            {isLoading && <p className="text-xs text-muted-foreground">Yükleniyor...</p>}
            {!isLoading && documents.length === 0 && (
              <p className="text-xs text-muted-foreground">Henüz belge yüklenmemiş.</p>
            )}
            {documents.map((d) => (
              <div
                key={d.id}
                className="flex items-center justify-between gap-2 rounded-lg border border-border px-2.5 py-1.5 text-sm"
              >
                <div className="flex min-w-0 items-center gap-2">
                  <FileText className="h-4 w-4 shrink-0 text-muted-foreground" />
                  <div className="min-w-0">
                    <p className="flex items-center gap-1.5 truncate font-medium text-foreground">
                      <span className="truncate">{d.fileName}</span>
                      {d.textStatus !== 'ok' && (
                        <span
                          title={
                            d.textStatus === 'unsupported'
                              ? 'Bu dosya türünden metin çıkarılamıyor — Claude MCP üzerinden sadece indirme linkine erişebilir.'
                              : 'Bu belgeden henüz metin çıkarılamadı (taranmış/bozuk olabilir) — Claude okumayı denediğinde otomatik tekrar denenir.'
                          }
                        >
                          <AlertTriangle className="h-3.5 w-3.5 shrink-0 text-amber-500" />
                        </span>
                      )}
                    </p>
                    <p className="text-xs text-muted-foreground">
                      {formatFileSize(d.fileSize)} · {d.uploader.name} · {timeAgo(d.createdAt)}
                    </p>
                  </div>
                </div>
                <div className="flex shrink-0 items-center gap-2">
                  {d.downloadUrl && (
                    <a
                      href={d.downloadUrl}
                      target="_blank"
                      rel="noopener noreferrer"
                      title="İndir"
                      className="text-muted-foreground hover:text-foreground"
                    >
                      <Download className="h-4 w-4" />
                    </a>
                  )}
                  {(d.uploaderId === me?.id || isAdmin) && (
                    <button
                      type="button"
                      onClick={() => handleDelete(d.id)}
                      title="Sil"
                      className="text-muted-foreground hover:text-destructive"
                    >
                      <Trash2 className="h-4 w-4" />
                    </button>
                  )}
                </div>
              </div>
            ))}
          </div>

          <FileUpload onChange={handleFilesPicked} multiple />

          {pendingFiles.length > 0 && (
            <div className="space-y-2">
              <div className="space-y-1.5">
                {pendingFiles.map((file, idx) => (
                  <div
                    key={`${file.name}-${file.size}-${idx}`}
                    className="flex items-center justify-between gap-2 rounded-lg border border-dashed border-border px-2.5 py-1.5 text-sm"
                  >
                    <div className="flex min-w-0 items-center gap-2">
                      <FileText className="h-4 w-4 shrink-0 text-muted-foreground" />
                      <div className="min-w-0">
                        <p className="truncate font-medium text-foreground">{file.name}</p>
                        <p className="text-xs text-muted-foreground">{formatFileSize(file.size)}</p>
                      </div>
                    </div>
                    <button
                      type="button"
                      onClick={() => removePendingFile(file)}
                      title="Kaldır"
                      disabled={isUploading}
                      className="shrink-0 text-muted-foreground hover:text-destructive disabled:opacity-50"
                    >
                      <X className="h-4 w-4" />
                    </button>
                  </div>
                ))}
              </div>

              <button
                type="button"
                onClick={handleSavePendingFiles}
                disabled={isUploading}
                className="inline-flex w-full items-center justify-center gap-2 rounded-lg bg-primary px-4 py-2 text-sm font-medium text-primary-foreground transition-colors hover:bg-primary/90 disabled:opacity-50"
              >
                <UploadCloud className="h-4 w-4" />
                {isUploading
                  ? 'Yükleniyor...'
                  : `${pendingFiles.length} belgeyi kaydet`}
              </button>
            </div>
          )}
        </div>
      </div>
    </main>
  );
}
