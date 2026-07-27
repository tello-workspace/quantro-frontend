'use client';

import React, { useState } from 'react';
import { Check, X, Inbox, Clock } from 'lucide-react';
import { toast } from 'react-toastify';
import {
  useGetChangeRequestsQuery,
  useReviewChangeRequestMutation,
  requestTypeLabel,
  type ChangeRequest,
} from '@/features/requests/requestsApi';
import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogHeader,
  DialogTitle,
} from '@/components/ui/dialog';
import { Button } from '@/components/ui/button';
import { Badge } from '@/components/ui/badge';
import { Input } from '@/components/ui/input';
import { Skeleton } from '@/components/ui/skeleton';

interface Props {
  orgId: string;
  isAdmin: boolean;
  open: boolean;
  onOpenChange: (open: boolean) => void;
}

const PRIORITY_LABEL: Record<string, string> = {
  URGENT: 'Acil',
  HIGH: 'Yüksek',
  MEDIUM: 'Orta',
  LOW: 'Düşük',
};

function zamanFarki(dateStr: string): string {
  const dk = Math.floor((Date.now() - new Date(dateStr).getTime()) / 60000);
  if (dk < 1) return 'az önce';
  if (dk < 60) return `${dk} dk önce`;
  const sa = Math.floor(dk / 60);
  if (sa < 24) return `${sa} sa önce`;
  return `${Math.floor(sa / 24)} gün önce`;
}

// Talebin ne istedigini okunabilir sekilde gosterir
function TalepIcerigi({ request }: { request: ChangeRequest }) {
  const p = request.payload ?? {};

  if (request.type === 'CARD_DELETE') {
    return (
      <p className="text-sm text-muted-foreground">
        <span className="font-medium text-foreground">{request.targetCard?.title ?? 'kart'}</span>{' '}
        silinsin{p.reason ? ` — ${p.reason}` : ''}
      </p>
    );
  }

  if (request.type === 'COLUMN_CREATE' || request.type === 'PROJECT_CREATE') {
    return (
      <p className="text-sm text-foreground">
        <span className="font-medium">{p.name}</span>
        {p.description && <span className="text-muted-foreground"> — {p.description}</span>}
      </p>
    );
  }

  // CARD_CREATE / CARD_UPDATE
  return (
    <div className="space-y-1">
      {request.type === 'CARD_UPDATE' && request.targetCard && (
        <p className="text-xs text-muted-foreground">
          Hedef kart: <span className="text-foreground">{request.targetCard.title}</span>
        </p>
      )}
      {p.title && <p className="text-sm font-medium text-foreground">{p.title}</p>}
      {p.description && (
        <p className="whitespace-pre-wrap text-sm text-muted-foreground">{p.description}</p>
      )}
      <div className="flex flex-wrap gap-1.5 pt-0.5">
        {p.priority && <Badge variant="secondary">Öncelik: {PRIORITY_LABEL[p.priority]}</Badge>}
        {p.dueDate && <Badge variant="secondary">Bitiş: {p.dueDate}</Badge>}
      </div>
    </div>
  );
}

export const ChangeRequestsDialog: React.FC<Props> = ({ orgId, isAdmin, open, onOpenChange }) => {
  const { data: requests = [], isLoading } = useGetChangeRequestsQuery({ orgId }, { skip: !open });
  const [review, { isLoading: isReviewing }] = useReviewChangeRequestMutation();
  const [redNotu, setRedNotu] = useState<Record<string, string>>({});

  const bekleyenler = requests.filter((r) => r.status === 'PENDING');
  const gecmis = requests.filter((r) => r.status !== 'PENDING');

  const degerlendir = async (request: ChangeRequest, action: 'approve' | 'reject') => {
    try {
      await review({ orgId, requestId: request.id, action, note: redNotu[request.id] }).unwrap();
      toast.success(action === 'approve' ? 'Talep onaylandı ve uygulandı.' : 'Talep reddedildi.');
      setRedNotu((prev) => {
        const next = { ...prev };
        delete next[request.id];
        return next;
      });
    } catch (err) {
      const mesaj = (err as { data?: { error?: { message?: string } } })?.data?.error?.message;
      toast.error(mesaj || 'Talep değerlendirilemedi.');
    }
  };

  return (
    <Dialog open={open} onOpenChange={onOpenChange}>
      <DialogContent className="max-w-xl">
        <DialogHeader>
          <DialogTitle className="flex items-center gap-2">
            <Inbox className="size-4 text-primary" />
            {isAdmin ? 'Bekleyen Talepler' : 'Taleplerim'}
            {bekleyenler.length > 0 && <Badge>{bekleyenler.length}</Badge>}
          </DialogTitle>
          <DialogDescription>
            {isAdmin
              ? 'Üyelerin gönderdiği değişiklik talepleri. Onaylarsan değişiklik otomatik uygulanır.'
              : 'Gönderdiğin talepler ve sonuçları.'}
          </DialogDescription>
        </DialogHeader>

        <div className="max-h-[65vh] space-y-3 overflow-y-auto">
          {isLoading &&
            [0, 1].map((i) => <Skeleton key={i} className="h-28 rounded-xl" />)}

          {!isLoading && requests.length === 0 && (
            <div className="flex flex-col items-center rounded-xl border border-dashed border-border px-6 py-10 text-center">
              <span className="mb-3 flex size-11 items-center justify-center rounded-full bg-primary/10 text-primary">
                <Inbox className="size-5" />
              </span>
              <p className="text-sm font-medium text-foreground">Talep yok</p>
              <p className="mt-1 text-xs text-muted-foreground">
                {isAdmin
                  ? 'Üyeler değişiklik talebi gönderdiğinde burada görünür.'
                  : 'Kart düzenlemek istediğinde talep gönderebilirsin.'}
              </p>
            </div>
          )}

          {bekleyenler.map((request) => (
            <div key={request.id} className="rounded-xl border border-border bg-card p-3 shadow-soft">
              <div className="mb-2 flex flex-wrap items-center gap-2">
                <Badge variant="default">{requestTypeLabel(request.type)}</Badge>
                {request.project && (
                  <span className="text-xs text-muted-foreground">{request.project.name}</span>
                )}
                <span className="ml-auto flex items-center gap-1 text-xs text-muted-foreground">
                  <Clock className="size-3" />
                  {zamanFarki(request.createdAt)}
                </span>
              </div>

              <p className="mb-2 text-xs text-muted-foreground">
                <span className="font-medium text-foreground">{request.requestedBy.name}</span> gönderdi
              </p>

              <TalepIcerigi request={request} />

              {isAdmin && (
                <div className="mt-3 flex flex-wrap items-center gap-2 border-t border-border pt-3">
                  <Input
                    value={redNotu[request.id] ?? ''}
                    onChange={(e) =>
                      setRedNotu((prev) => ({ ...prev, [request.id]: e.target.value }))
                    }
                    placeholder="Not (opsiyonel)"
                    className="h-8 flex-1 text-xs"
                  />
                  <Button
                    size="sm"
                    className="cursor-pointer"
                    disabled={isReviewing}
                    onClick={() => degerlendir(request, 'approve')}
                  >
                    <Check className="size-3.5" />
                    Onayla
                  </Button>
                  <Button
                    size="sm"
                    variant="destructive"
                    className="cursor-pointer"
                    disabled={isReviewing}
                    onClick={() => degerlendir(request, 'reject')}
                  >
                    <X className="size-3.5" />
                    Reddet
                  </Button>
                </div>
              )}
            </div>
          ))}

          {gecmis.length > 0 && (
            <>
              <p className="pt-2 text-xs font-medium text-muted-foreground">Sonuçlananlar</p>
              {gecmis.map((request) => (
                <div
                  key={request.id}
                  className="rounded-xl border border-border/60 bg-muted/30 p-3 opacity-80"
                >
                  <div className="mb-1.5 flex flex-wrap items-center gap-2">
                    <Badge variant="secondary">{requestTypeLabel(request.type)}</Badge>
                    <Badge variant={request.status === 'APPROVED' ? 'default' : 'destructive'}>
                      {request.status === 'APPROVED' ? 'Onaylandı' : 'Reddedildi'}
                    </Badge>
                    <span className="ml-auto text-xs text-muted-foreground">
                      {request.reviewedAt ? zamanFarki(request.reviewedAt) : ''}
                    </span>
                  </div>
                  <TalepIcerigi request={request} />
                  {request.reviewNote && (
                    <p className="mt-1.5 text-xs italic text-muted-foreground">
                      Not: {request.reviewNote}
                    </p>
                  )}
                </div>
              ))}
            </>
          )}
        </div>
      </DialogContent>
    </Dialog>
  );
};
