'use client';

import React, { useEffect, useState } from 'react';
import Link from 'next/link';
import { Search } from 'lucide-react';
import { useLazySearchOrganizationQuery } from '@/features/organizations/organizationsApi';
import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogHeader,
  DialogTitle,
} from '@/components/ui/dialog';
import { Input } from '@/components/ui/input';
import { Badge } from '@/components/ui/badge';
import { Skeleton } from '@/components/ui/skeleton';
import { useTranslation } from '@/hooks/useTranslation';

interface OrgSearchDialogProps {
  orgId: string;
  open: boolean;
  onOpenChange: (open: boolean) => void;
}

const PRIORITY_LABEL: Record<string, string> = {
  LOW: 'Düşük',
  MEDIUM: 'Orta',
  HIGH: 'Yüksek',
  URGENT: 'Acil',
};

// Mevcut BoardFilters arama kutusu sadece o an ACIK olan panonun icini
// filtreler. Bu dialog org'daki TUM projelerin kartlarinda arar; "hangi
// projedeydi hatirlamiyorum" durumunu cozer.
export const OrgSearchDialog: React.FC<OrgSearchDialogProps> = ({ orgId, open, onOpenChange }) => {
  const { t } = useTranslation();
  const [q, setQ] = useState('');
  const [trigger, { data: results, isFetching }] = useLazySearchOrganizationQuery();

  // Yalnizca "bekle ve ara" kaldi. Kutuyu temizlemek bir OLAY (dialog
  // kapanmasi) sonucu; effect icinde setState cagirmak yerine kapanisi
  // isleyen handler'da yapiliyor.
  useEffect(() => {
    if (!open) return;
    const trimmed = q.trim();
    if (trimmed.length < 2) return;

    const handle = setTimeout(() => {
      trigger({ orgId, q: trimmed });
    }, 300);
    return () => clearTimeout(handle);
  }, [q, orgId, open, trigger]);

  const handleOpenChange = (next: boolean) => {
    if (!next) setQ('');
    onOpenChange(next);
  };

  return (
    <Dialog open={open} onOpenChange={handleOpenChange}>
      <DialogContent className="sm:max-w-lg w-full">
        <DialogHeader>
          <DialogTitle className="flex items-center gap-2">
            <Search className="h-4 w-4 text-primary" />
            Organizasyonda Ara
          </DialogTitle>
          <DialogDescription>
            Bu organizasyondaki tüm projelerin kartlarında başlık ve açıklamaya göre arar.
          </DialogDescription>
        </DialogHeader>

        <Input
          autoFocus
          value={q}
          onChange={(e) => setQ(e.target.value)}
          placeholder="En az 2 karakter yaz..."
        />

        <div className="max-h-80 overflow-y-auto flex flex-col gap-1.5">
          {isFetching && (
            <>
              <Skeleton className="h-14 w-full rounded-lg" />
              <Skeleton className="h-14 w-full rounded-lg" />
            </>
          )}

          {!isFetching && q.trim().length >= 2 && results?.length === 0 && (
            <p className="py-6 text-center text-sm text-muted-foreground">{t('noResultsFound')}</p>
          )}

          {!isFetching &&
            results?.map((card) => (
              <Link
                key={card.id}
                href={`/projects/${card.projectId}?orgId=${orgId}&openCard=${card.id}`}
                onClick={() => onOpenChange(false)}
                className="flex flex-col gap-1 rounded-lg border border-border p-2.5 text-sm transition-colors hover:bg-muted"
              >
                <div className="flex items-center justify-between gap-2">
                  <span className="font-medium text-foreground line-clamp-1">{card.title}</span>
                  <Badge variant="outline" className="shrink-0">
                    {PRIORITY_LABEL[card.priority] ?? card.priority}
                  </Badge>
                </div>
                <span className="text-xs text-muted-foreground">
                  {card.projectName} · {card.columnName}
                </span>
              </Link>
            ))}
        </div>
      </DialogContent>
    </Dialog>
  );
};
