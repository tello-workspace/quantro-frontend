import React, { useState, useEffect } from 'react';
import { Check, X, Inbox, Clock, Edit2, ArrowRight, Calendar, Users, AlignLeft, AlertCircle } from 'lucide-react';
import { toast } from "sonner";
import { useGetOrganizationByIdQuery } from '@/features/organizations/organizationsApi';
import { useGetLabelsQuery } from '@/features/labels/labelsApi';
import { boardService } from '@/features/board/services/boardService';
import { Textarea } from '@/components/ui/textarea';
import {
  useGetChangeRequestsQuery,
  useReviewChangeRequestMutation,
  requestTypeLabel,
  type ChangeRequest,
  type ChangeRequestType,
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
import { useTranslation } from '@/hooks/useTranslation';

interface BodyProps {
  orgId: string;
  isAdmin: boolean;
  // Ikisi de opsiyonel: doluysa "Triage" moduna gecer - sadece bu
  // projeye/turedeki talepleri gosterir (orn. proje yonetim sayfasindaki
  // Triage sekmesi bu projenin CARD_CREATE taleplerini gormek icin verir).
  projectFilter?: string;
  typeFilter?: ChangeRequestType;
  // Baslik cagirana birakildi: dialog surumu DialogHeader, sayfa surumu duz
  // baslik ciziyor (DialogTitle bir Dialog kokunun disinda kullanilamaz).
  renderHeader?: (info: { pendingCount: number; isTriage: boolean }) => React.ReactNode;
  listClassName?: string;
}

interface Props extends Omit<BodyProps, 'renderHeader' | 'listClassName'> {
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

function RequestLabels({ orgId, projectId, labelIds }: { orgId: string; projectId: string; labelIds?: string[] }) {
  const { data: labels = [] } = useGetLabelsQuery(
    { orgId, projectId },
    { skip: !orgId || !projectId || !labelIds || labelIds.length === 0 },
  );

  if (!labelIds || labelIds.length === 0) return null;

  return (
    <div className="flex flex-wrap gap-1 mt-1.5 items-center">
      <span className="text-xs text-muted-foreground mr-1">Etiketler:</span>
      {labelIds.map((id) => {
        const lbl = labels.find((l) => l.id === id);
        return (
          <span
            key={id}
            style={{ backgroundColor: lbl?.color || '#94a3b8' }}
            className="text-[10px] text-white px-1.5 py-0.5 rounded font-medium shadow-sm"
          >
            {lbl?.name || '...'}
          </span>
        );
      })}
    </div>
  );
}

function RequestDependencies({ projectId, blockerIds }: { projectId: string; blockerIds?: string[] }) {
  const [titles, setTitles] = useState<Record<string, string>>({});

  useEffect(() => {
    if (!blockerIds || blockerIds.length === 0 || !projectId) return;
    blockerIds.forEach(async (id) => {
      try {
        const details = await boardService.getTaskDetails(projectId, id);
        setTitles((prev) => ({ ...prev, [id]: details.title }));
      } catch {
        setTitles((prev) => ({ ...prev, [id]: `Kart ID: ${id}` }));
      }
    });
  }, [blockerIds, projectId]);

  if (!blockerIds || blockerIds.length === 0) return null;

  return (
    <div className="flex flex-wrap gap-1 mt-1.5 items-center">
      <span className="text-xs text-muted-foreground text-amber-500 font-medium mr-1">
        Bağımlılıklar ({blockerIds.length}):
      </span>
      {blockerIds.map((id) => (
        <span
          key={id}
          className="text-[10px] px-1.5 py-0.5 rounded border border-amber-300 text-amber-600 bg-amber-50 dark:bg-amber-950/20 font-medium shadow-sm"
        >
          {titles[id] || 'Yükleniyor...'}
        </span>
      ))}
    </div>
  );
}

function RequestDiff({
  projectId,
  cardId,
  payload,
  members = [],
}: {
  projectId: string;
  cardId: string;
  payload: any;
  members?: any[];
}) {
  const [current, setCurrent] = useState<any>(null);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    let cancelled = false;
    setLoading(true);
    boardService.getTaskDetails(projectId, cardId).then((card) => {
      if (!cancelled) {
        setCurrent(card);
        setLoading(false);
      }
    }).catch(() => {
      if (!cancelled) setLoading(false);
    });
    return () => { cancelled = true; };
  }, [projectId, cardId]);

  if (loading) return <Skeleton className="h-20 rounded-lg" />;
  if (!current) return null;

  const changes: { field: string; oldVal: string; newVal: string }[] = [];

  if (payload.title && payload.title !== current.title) {
    changes.push({ field: 'Başlık', oldVal: current.title, newVal: payload.title });
  }
  if (payload.description !== undefined && payload.description !== (current.description ?? '')) {
    changes.push({
      field: 'Açıklama',
      oldVal: current.description || '(boş)',
      newVal: payload.description || '(boş)',
    });
  }
  if (payload.priority && payload.priority !== current.priority) {
    changes.push({
      field: 'Öncelik',
      oldVal: PRIORITY_LABEL[current.priority] ?? current.priority,
      newVal: PRIORITY_LABEL[payload.priority] ?? payload.priority,
    });
  }
  if (payload.dueDate !== undefined) {
    const oldDate = current.dueDate ? current.dueDate.split('T')[0] : '';
    const newDate = payload.dueDate ? payload.dueDate.split('T')[0] : '';
    if (newDate !== oldDate) {
      changes.push({ field: 'Bitiş', oldVal: oldDate || '(yok)', newVal: newDate || '(yok)' });
    }
  }
  if (payload.assigneeIds) {
    const oldNames = (current.assignees || []).map((a: any) => a.name).sort().join(', ') || '(yok)';
    const newNames = payload.assigneeIds
      .map((id: string) => members.find((m: any) => m.userId === id)?.user.name ?? '?')
      .sort().join(', ') || '(yok)';
    if (oldNames !== newNames) {
      changes.push({ field: 'Atananlar', oldVal: oldNames, newVal: newNames });
    }
  }
  if (payload.labelIds) {
    // etiketler async, karsilastirmayi basit tut
    changes.push({ field: 'Etiketler', oldVal: '(mevcut)', newVal: `${payload.labelIds.length} etiket` });
  }
  if (payload.blockerIds) {
    const oldBlockers = (current.blockedBy || []).length;
    if (oldBlockers !== payload.blockerIds.length) {
      changes.push({ field: 'Bağımlılıklar', oldVal: `${oldBlockers} adet`, newVal: `${payload.blockerIds.length} adet` });
    }
  }

  if (changes.length === 0) return null;

  return (
    <div className="space-y-1.5 mt-2">
      {changes.map((c, i) => (
        <div key={i} className="flex items-start gap-2 rounded-lg bg-amber-50/60 dark:bg-amber-950/10 px-3 py-2 text-xs">
          <span className="shrink-0 font-semibold text-muted-foreground min-w-[72px]">{c.field}:</span>
          <span className="line-through text-muted-foreground/60">{c.oldVal}</span>
          <ArrowRight className="size-3 shrink-0 text-amber-500 mt-0.5" />
          <span className="font-medium text-foreground">{c.newVal}</span>
        </div>
      ))}
    </div>
  );
}

const getPriorityColor = (prio: string) => {
  switch (prio) {
    case 'URGENT': return 'bg-destructive/10 text-destructive border-destructive/20';
    case 'HIGH': return 'bg-orange-500/10 text-orange-500 border-orange-500/20';
    case 'MEDIUM': return 'bg-blue-500/10 text-blue-500 border-blue-500/20';
    case 'LOW': return 'bg-slate-500/10 text-slate-500 border-slate-500/20';
    default: return 'bg-muted text-muted-foreground border-transparent';
  }
};

const getPriorityText = (prio: string) => {
  return PRIORITY_LABEL[prio] || prio;
};

// Talebin ne istedigini okunabilir ve gorsel sekilde gosterir
function TalepIcerigi({
  request,
  editedPayload,
  members = [],
}: {
  request: ChangeRequest;
  editedPayload?: any;
  members?: any[];
}) {
  const { t } = useTranslation();
  const p = editedPayload ?? request.payload ?? {};

  if (request.type === 'CARD_DELETE') {
    return (
      <div className="flex items-center gap-2.5 rounded-xl border border-destructive/20 bg-destructive/5 p-3.5 text-sm text-destructive w-full">
        <AlertCircle className="size-4 shrink-0" />
        <div className="flex-1 min-w-0">
          <p className="font-semibold truncate">{request.targetCard?.title ?? 'Silinecek Kart'}</p>
          <p className="text-xs text-destructive/80 mt-0.5">Bu kart tamamen silinecektir.</p>
          {p.reason && (
            <p className="text-xs italic text-destructive/70 mt-1 border-t border-destructive/10 pt-1">
              Sebep: {p.reason}
            </p>
          )}
        </div>
      </div>
    );
  }

  if (request.type === 'COLUMN_CREATE' || request.type === 'PROJECT_CREATE') {
    return (
      <div className="flex items-start gap-2.5 rounded-xl border border-border bg-background p-3.5 text-sm w-full shadow-sm">
        <div className="size-8 rounded-lg bg-primary/10 text-primary flex items-center justify-center shrink-0">
          <Inbox className="size-4" />
        </div>
        <div className="flex-1 min-w-0">
          <p className="font-semibold text-foreground truncate">{p.name || 'İsimsiz Sütun'}</p>
          {p.description && (
            <p className="text-xs text-muted-foreground mt-1 leading-relaxed">
              {p.description}
            </p>
          )}
          <p className="text-[10px] text-muted-foreground/60 mt-1 uppercase font-semibold tracking-wider">
            {request.type === 'COLUMN_CREATE' ? 'Yeni Sütun Oluşturma' : 'Yeni Proje Oluşturma'}
          </p>
        </div>
      </div>
    );
  }

  // CARD_CREATE / CARD_UPDATE
  return (
    <div className="space-y-3 text-left w-full">
      {request.type === 'CARD_UPDATE' && request.targetCard && (
        <div className="flex items-center gap-1.5 text-xs text-muted-foreground bg-muted/40 px-3 py-1.5 rounded-lg border border-border/40 w-fit">
          <span className="font-semibold text-foreground/80">Hedef Kart:</span>
          <span>{request.targetCard.title}</span>
        </div>
      )}

      {/* Visual Card representation */}
      <div className="rounded-xl border border-border/80 bg-background/50 backdrop-blur-xs p-4 shadow-sm space-y-3 w-full">
        {/* Card Header: Title & Priority */}
        <div className="flex items-start justify-between gap-3">
          <h4 className="font-semibold text-sm text-foreground tracking-tight leading-snug">
            {p.title || 'Başlıksız Görev'}
          </h4>
          {p.priority && (
            <span className={`text-[11px] font-semibold px-2 py-0.5 rounded-full border shrink-0 ${getPriorityColor(p.priority)}`}>
              {getPriorityText(p.priority)}
            </span>
          )}
        </div>

        {/* Card Body: Description */}
        {p.description ? (
          <div className="flex gap-2 rounded-lg bg-muted/40 p-2.5 text-xs text-muted-foreground border border-border/30">
            <AlignLeft className="size-3.5 shrink-0 mt-0.5 text-muted-foreground/60" />
            <p className="whitespace-pre-wrap leading-relaxed">{p.description}</p>
          </div>
        ) : (
          <div className="flex gap-2 text-xs italic text-muted-foreground/45 px-1">
            <AlignLeft className="size-3.5 shrink-0 text-muted-foreground/30" />
            <span>{t('noDescriptionGiven')}</span>
          </div>
        )}

        {/* Card Footer: Metadata Rows */}
        <div className="grid grid-cols-1 sm:grid-cols-2 gap-2 pt-1 border-t border-border/40 text-xs">
          {/* Due date */}
          {p.dueDate && (
            <div className="flex items-center gap-2 text-muted-foreground">
              <Calendar className="size-3.5 text-primary/70 shrink-0" />
              <span>{t('dueLabelShort')}<strong className="text-foreground/90 font-medium">{p.dueDate.split('T')[0]}</strong></span>
            </div>
          )}
          
          {/* Assignees */}
          {p.assigneeIds && p.assigneeIds.length > 0 && (
            <div className="flex items-center gap-2 text-muted-foreground">
              <Users className="size-3.5 text-primary/70 shrink-0" />
              <span className="truncate">
                Atananlar:{' '}
                <strong className="text-foreground/90 font-medium">
                  {p.assigneeIds
                    .map((id: string) => members.find((m) => m.userId === id)?.user.name ?? 'Bilinmeyen')
                    .join(', ')}
                </strong>
              </span>
            </div>
          )}
        </div>

        {/* Labels & Blockers */}
        {request.projectId && (
          <div className="space-y-1.5">
            <RequestLabels
              orgId={request.organizationId}
              projectId={request.projectId}
              labelIds={p.labelIds}
            />
            <RequestDependencies
              projectId={request.projectId}
              blockerIds={p.blockerIds}
            />
          </div>
        )}
      </div>

      {/* Show changes diff below the card if it's an update */}
      {request.type === 'CARD_UPDATE' && request.targetCard && request.projectId && !editedPayload && (
        <div className="mt-3">
          <p className="text-xs font-semibold text-amber-500 mb-1.5 flex items-center gap-1">
            <Clock className="size-3.5" /> Değişiklik Detayları
          </p>
          <RequestDiff
            projectId={request.projectId}
            cardId={request.targetCard.id}
            payload={p}
            members={members}
          />
        </div>
      )}
    </div>
  );
}

const ChangeRequestsBody: React.FC<BodyProps> = ({
  orgId,
  isAdmin,
  projectFilter,
  typeFilter,
  renderHeader,
  listClassName,
}) => {
  const { t } = useTranslation();
  const { data: org } = useGetOrganizationByIdQuery({ orgId }, { skip: !orgId });
  const members = org?.members ?? [];

  const { data: allRequests = [], isLoading } = useGetChangeRequestsQuery({ orgId }, { skip: !orgId });
  const requests = allRequests.filter(
    (r) =>
      (!projectFilter || r.projectId === projectFilter) &&
      (!typeFilter || r.type === typeFilter),
  );
  const isTriage = !!projectFilter || !!typeFilter;
  const [review, { isLoading: isReviewing }] = useReviewChangeRequestMutation();
  const [redNotu, setRedNotu] = useState<Record<string, string>>({});
  const [editingRequestId, setEditingRequestId] = useState<string | null>(null);
  const [editedPayloads, setEditedPayloads] = useState<Record<string, any>>({});

  const bekleyenler = requests
    .filter((r) => r.status === 'PENDING')
    .sort((a, b) => new Date(b.createdAt).getTime() - new Date(a.createdAt).getTime());
  const gecmis = requests
    .filter((r) => r.status !== 'PENDING')
    .sort((a, b) => {
      const aTime = a.reviewedAt ? new Date(a.reviewedAt).getTime() : 0;
      const bTime = b.reviewedAt ? new Date(b.reviewedAt).getTime() : 0;
      return bTime - aTime;
    });

  const handleToggleAssignee = (requestId: string, userId: string) => {
    const payload = editedPayloads[requestId];
    if (!payload) return;
    const current = payload.assigneeIds || [];
    const nextAssignees = current.includes(userId)
      ? current.filter((id: string) => id !== userId)
      : [...current, userId];
    
    setEditedPayloads((prev) => ({
      ...prev,
      [requestId]: {
        ...payload,
        assigneeIds: nextAssignees,
      },
    }));
  };

  const degerlendir = async (request: ChangeRequest, action: 'approve' | 'reject') => {
    try {
      const payload = action === 'approve' ? editedPayloads[request.id] : undefined;
      await review({
        orgId,
        requestId: request.id,
        action,
        note: redNotu[request.id],
        payload,
      }).unwrap();

      toast.success(action === 'approve' ? 'Talep onaylandı ve uygulandı.' : 'Talep reddedildi.');
      
      setEditingRequestId((current) => (current === request.id ? null : current));
      setEditedPayloads((prev) => {
        const next = { ...prev };
        delete next[request.id];
        return next;
      });
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
    <>
      {renderHeader?.({ pendingCount: bekleyenler.length, isTriage })}

      <div className={listClassName ?? 'max-h-[75vh] space-y-4 overflow-y-auto px-1 no-scrollbar'}>
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
          <div key={request.id} className="rounded-xl border border-border bg-card p-5 shadow-soft">
            <div className="mb-3 flex flex-wrap items-center gap-2">
              <Badge variant="default" className="text-xs px-3 py-1">{requestTypeLabel(request.type)}</Badge>
              {request.project && (
                <span className="text-sm text-muted-foreground">{request.project.name}</span>
              )}
              <span className="ml-auto flex items-center gap-1.5 text-xs text-muted-foreground">
                <Clock className="size-3.5" />
                {zamanFarki(request.createdAt)}
              </span>
            </div>

            <div className="mb-3 flex flex-wrap items-center justify-between gap-2">
              <p className="text-sm text-muted-foreground">
                <span className="font-medium text-foreground">{request.requestedBy.name}</span> tarafından gönderildi
              </p>
              {isAdmin && (request.type === 'CARD_CREATE' || request.type === 'CARD_UPDATE') && (
                <button
                  type="button"
                  onClick={() => {
                    setEditingRequestId(request.id);
                    if (!editedPayloads[request.id]) {
                      setEditedPayloads((prev) => ({
                        ...prev,
                        [request.id]: {
                          title: request.payload.title || '',
                          description: request.payload.description || '',
                          priority: request.payload.priority || 'MEDIUM',
                          dueDate: request.payload.dueDate ? request.payload.dueDate.split('T')[0] : '',
                          assigneeIds: request.payload.assigneeIds || [],
                          labelIds: request.payload.labelIds || [],
                          blockerIds: request.payload.blockerIds || [],
                        },
                      }));
                    }
                  }}
                  className="flex items-center gap-1.5 text-sm text-primary hover:text-primary/80 font-medium cursor-pointer"
                >
                  <Edit2 className="size-3.5" />
                  Düzenle
                </button>
              )}
            </div>

            <TalepIcerigi
              request={request}
              editedPayload={editedPayloads[request.id]}
              members={members}
            />

            {isAdmin && editingRequestId === request.id && (
              <div className="space-y-4 bg-muted/20 p-5 rounded-xl border border-border/80 mt-4 text-left">
                <div>
                  <label className="block text-xs font-semibold text-muted-foreground mb-1.5">
                    Görev Başlığı
                  </label>
                  <Input
                    className="h-9 text-sm"
                    value={editedPayloads[request.id]?.title || ''}
                    onChange={(e) =>
                      setEditedPayloads((prev) => ({
                        ...prev,
                        [request.id]: { ...prev[request.id], title: e.target.value },
                      }))
                    }
                  />
                </div>

                <div>
                  <label className="block text-xs font-semibold text-muted-foreground mb-1.5">
                    Açıklama
                  </label>
                  <Textarea
                    rows={3}
                    className="text-sm"
                    value={editedPayloads[request.id]?.description || ''}
                    onChange={(e) =>
                      setEditedPayloads((prev) => ({
                        ...prev,
                        [request.id]: { ...prev[request.id], description: e.target.value },
                      }))
                    }
                    placeholder={t('addDescriptionPlaceholder')}
                  />
                </div>

                <div className="grid grid-cols-2 gap-4">
                  <div>
                    <label className="block text-xs font-semibold text-muted-foreground mb-1.5">
                      Son Teslim Tarihi
                    </label>
                    <Input
                      type="date"
                      className="h-9 text-sm"
                      value={editedPayloads[request.id]?.dueDate || ''}
                      onChange={(e) =>
                        setEditedPayloads((prev) => ({
                          ...prev,
                          [request.id]: { ...prev[request.id], dueDate: e.target.value },
                        }))
                      }
                    />
                  </div>

                  <div>
                    <label className="block text-xs font-semibold text-muted-foreground mb-1.5">
                      Öncelik
                    </label>
                    <select
                      value={editedPayloads[request.id]?.priority || 'MEDIUM'}
                      onChange={(e) =>
                        setEditedPayloads((prev) => ({
                          ...prev,
                          [request.id]: { ...prev[request.id], priority: e.target.value },
                        }))
                      }
                      className="flex h-9 w-full rounded-md border border-input bg-transparent px-3 py-1 text-sm shadow-sm focus-visible:outline-none focus-visible:ring-1 focus-visible:ring-ring text-foreground"
                    >
                      <option value="LOW" className="text-foreground bg-popover">{t('priorityLow')}</option>
                      <option value="MEDIUM" className="text-foreground bg-popover">{t('priorityMedium')}</option>
                      <option value="HIGH" className="text-foreground bg-popover">{t('priorityHigh')}</option>
                      <option value="URGENT" className="text-foreground bg-popover">{t('priorityUrgent')}</option>
                    </select>
                  </div>
                </div>

                <div>
                  <label className="block text-xs font-semibold text-muted-foreground mb-1.5">
                    Atanan Kişiler
                  </label>
                  <div className="flex flex-wrap gap-1.5 mb-2">
                    {(editedPayloads[request.id]?.assigneeIds || []).map((assigneeId: string) => {
                      const m = members.find((mem) => mem.userId === assigneeId);
                      return (
                        <Badge key={assigneeId} variant="secondary" className="text-xs py-1 px-2">
                          {m?.user.name ?? 'Bilinmeyen'}
                          <button
                            type="button"
                            onClick={() => handleToggleAssignee(request.id, assigneeId)}
                            className="ml-1.5 text-muted-foreground hover:text-foreground"
                          >
                            &times;
                          </button>
                        </Badge>
                      );
                    })}
                    {(editedPayloads[request.id]?.assigneeIds || []).length === 0 && (
                      <span className="text-xs text-muted-foreground">Atanan yok</span>
                    )}
                  </div>
                  <div className="flex flex-wrap gap-1.5 max-h-28 overflow-y-auto border border-border/60 rounded-lg p-2 bg-background">
                    {members.map((m) => {
                      const isAssigned = (editedPayloads[request.id]?.assigneeIds || []).includes(m.userId);
                      return (
                        <button
                          key={m.userId}
                          type="button"
                          onClick={() => handleToggleAssignee(request.id, m.userId)}
                          className={`text-xs px-3 py-1 rounded-md border transition-colors ${
                            isAssigned
                              ? 'bg-primary/10 border-primary text-primary font-medium'
                              : 'bg-muted/40 border-transparent text-muted-foreground hover:bg-muted'
                          }`}
                        >
                          {m.user.name}
                        </button>
                      );
                    })}
                  </div>
                </div>

                <div className="flex justify-end gap-2 pt-1">
                  <Button
                    type="button"
                    variant="ghost"
                    size="sm"
                    onClick={() => setEditingRequestId(null)}
                  >
                    Kaydet ve Kapat
                  </Button>
                </div>
              </div>
            )}

            {isAdmin && (
              <div className="mt-4 flex flex-wrap items-center gap-3 border-t border-border pt-4">
                <Input
                  value={redNotu[request.id] ?? ''}
                  onChange={(e) =>
                    setRedNotu((prev) => ({ ...prev, [request.id]: e.target.value }))
                  }
                  placeholder="Red notu (opsiyonel)"
                  className="h-9 flex-1 text-sm"
                />
                <Button
                  size="default"
                  className="cursor-pointer"
                  disabled={isReviewing}
                  onClick={() => degerlendir(request, 'approve')}
                >
                  <Check className="size-4" />
                  Onayla
                </Button>
                <Button
                  size="default"
                  variant="destructive"
                  className="cursor-pointer"
                  disabled={isReviewing}
                  onClick={() => degerlendir(request, 'reject')}
                >
                  <X className="size-4" />
                  Reddet
                </Button>
              </div>
            )}
          </div>
        ))}

        {gecmis.length > 0 && (
          <>
            <p className="pt-4 text-sm font-semibold text-muted-foreground border-t border-border/40">{t('resolvedRequests')}</p>
            {gecmis.map((request) => (
              <div
                key={request.id}
                className="rounded-xl border border-border/60 bg-muted/30 p-5 opacity-80"
              >
                <div className="mb-2 flex flex-wrap items-center gap-2">
                  <Badge variant="secondary" className="text-xs px-3 py-1">{requestTypeLabel(request.type)}</Badge>
                  <Badge variant={request.status === 'APPROVED' ? 'default' : 'destructive'} className="text-xs px-3 py-1">
                    {request.status === 'APPROVED' ? 'Onaylandı' : 'Reddedildi'}
                  </Badge>
                  <span className="ml-auto text-xs text-muted-foreground">
                    {request.reviewedAt ? zamanFarki(request.reviewedAt) : ''}
                  </span>
                </div>
                <TalepIcerigi request={request} members={members} />
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
    </>
  );
};

// Org genelindeki talepler icin modal surum (bkz. /projects sayfasi).
export const ChangeRequestsDialog: React.FC<Props> = ({
  orgId,
  isAdmin,
  open,
  onOpenChange,
  projectFilter,
  typeFilter,
}) => (
  <Dialog open={open} onOpenChange={onOpenChange}>
    <DialogContent className="sm:max-w-2xl w-full">
      {/* Portal kapaliyken icerigi unmount ettigi icin sorgular yalnizca
          dialog acikken calisir - eski `skip: !open` davranisi korunur. */}
      <ChangeRequestsBody
        orgId={orgId}
        isAdmin={isAdmin}
        projectFilter={projectFilter}
        typeFilter={typeFilter}
        renderHeader={({ pendingCount, isTriage }) => (
          <DialogHeader>
            <DialogTitle className="flex items-center gap-2 text-lg">
              <Inbox className="size-5 text-primary" />
              {isTriage ? 'Triage: Yeni Kart Talepleri' : isAdmin ? 'Bekleyen Talepler' : 'Taleplerim'}
              {pendingCount > 0 && <Badge className="text-xs px-3 py-0.5">{pendingCount}</Badge>}
            </DialogTitle>
            <DialogDescription>
              {isTriage
                ? 'Üyelerin bu projede önerdiği yeni kartlar. Önceliği/atananı/etiketleri düzenleyip onayla, panoya öyle girsin.'
                : isAdmin
                  ? 'Üyelerin gönderdiği değişiklik talepleri. Onaylarsan değişiklik otomatik uygulanır.'
                  : 'Gönderdiğin talepler ve sonuçları.'}
            </DialogDescription>
          </DialogHeader>
        )}
      />
    </DialogContent>
  </Dialog>
);

// Proje yonetim sayfasindaki Triage sekmesi icin modalsiz surum: baslik
// sekmenin kendisinde duruyor, liste sayfayla birlikte akiyor.
export const ChangeRequestsSection: React.FC<Omit<BodyProps, 'renderHeader' | 'listClassName'>> = (props) => (
  <ChangeRequestsBody {...props} listClassName="space-y-4" />
);
