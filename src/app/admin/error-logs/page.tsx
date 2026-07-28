'use client';

import React, { useState } from 'react';
import Link from 'next/link';
import { AlertTriangle, ChevronDown, ChevronRight } from 'lucide-react';
import { useGetErrorLogsQuery, ErrorLogEntry } from '@/features/admin/errorLogsApi';
import { Card, CardContent } from '@/components/ui/card';
import { Badge } from '@/components/ui/badge';
import { Skeleton } from '@/components/ui/skeleton';

function timeAgo(iso: string): string {
  const diffMs = Date.now() - new Date(iso).getTime();
  const mins = Math.floor(diffMs / 60000);
  if (mins < 1) return 'az önce';
  if (mins < 60) return `${mins} dk önce`;
  const hours = Math.floor(mins / 60);
  if (hours < 24) return `${hours} sa önce`;
  const days = Math.floor(hours / 24);
  return `${days} gün önce`;
}

function LogRow({ log }: { log: ErrorLogEntry }) {
  const [open, setOpen] = useState(false);

  return (
    <Card size="sm" className="border-l-2 border-l-destructive">
      <CardContent>
        <button
          onClick={() => setOpen((o) => !o)}
          className="flex w-full items-start gap-2 text-left"
        >
          {open ? (
            <ChevronDown className="mt-0.5 h-4 w-4 shrink-0 text-muted-foreground" />
          ) : (
            <ChevronRight className="mt-0.5 h-4 w-4 shrink-0 text-muted-foreground" />
          )}
          <div className="flex-1 min-w-0">
            <div className="flex flex-wrap items-center gap-2">
              <Badge variant="outline" className="font-mono text-xs">
                {log.method}
              </Badge>
              <span className="font-mono text-xs text-muted-foreground truncate">{log.path}</span>
              <span className="ml-auto text-xs text-muted-foreground shrink-0">{timeAgo(log.createdAt)}</span>
            </div>
            <p className="mt-1 text-sm font-medium text-foreground line-clamp-2">{log.message}</p>
          </div>
        </button>

        {open && log.stack && (
          <pre className="mt-3 max-h-64 overflow-auto rounded-lg bg-muted p-3 text-xs text-muted-foreground whitespace-pre-wrap">
            {log.stack}
          </pre>
        )}
      </CardContent>
    </Card>
  );
}

export default function ErrorLogsPage() {
  const { data: logs, isLoading, isError, error } = useGetErrorLogsQuery();

  const forbidden =
    isError &&
    typeof error === 'object' &&
    error !== null &&
    'status' in error &&
    (error as { status?: number }).status === 403;

  return (
    <main className="min-h-screen bg-background p-6">
      <div className="max-w-3xl mx-auto space-y-6">
        <div className="flex items-center justify-between">
          <h1 className="flex items-center gap-2 text-2xl font-bold text-foreground">
            <AlertTriangle className="h-5 w-5 text-destructive" />
            Hata Kayıtları
          </h1>
          <Link href="/projects" className="text-sm text-primary hover:underline">
            ← Panoya dön
          </Link>
        </div>

        {isLoading && (
          <div className="space-y-2">
            <Skeleton className="h-16 w-full rounded-lg" />
            <Skeleton className="h-16 w-full rounded-lg" />
            <Skeleton className="h-16 w-full rounded-lg" />
          </div>
        )}

        {forbidden && (
          <p className="py-10 text-center text-sm text-muted-foreground">
            Bu sayfayı görüntülemek için en az bir organizasyonda admin olmanız gerekiyor.
          </p>
        )}

        {!isLoading && !isError && logs?.length === 0 && (
          <p className="py-10 text-center text-sm text-muted-foreground">
            Kayıtlı bir hata yok — sistem temiz görünüyor.
          </p>
        )}

        {!isLoading && !isError && logs && logs.length > 0 && (
          <div className="space-y-2">
            {logs.map((log) => (
              <LogRow key={log.id} log={log} />
            ))}
          </div>
        )}
      </div>
    </main>
  );
}
