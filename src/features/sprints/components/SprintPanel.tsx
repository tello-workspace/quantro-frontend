'use client';

import React, { useState } from 'react';
import { Rocket, Trash2, Plus, Play, CheckCircle2 } from 'lucide-react';
import { toast } from 'sonner';
import {
  useGetSprintsQuery,
  useCreateSprintMutation,
  useUpdateSprintMutation,
  useDeleteSprintMutation,
  useGetSprintBurndownQuery,
  Sprint,
} from '@/features/sprints/sprintsApi';
import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogHeader,
  DialogTitle,
} from '@/components/ui/dialog';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { useConfirm } from '@/hooks/useConfirm';
import { SimpleLineChart } from '@/components/ui/SimpleLineChart';

interface SprintPanelProps {
  orgId: string;
  projectId: string;
  isAdmin: boolean;
  open: boolean;
  onOpenChange: (open: boolean) => void;
}

const STATUS_LABEL: Record<Sprint['status'], string> = {
  PLANNED: 'Planlandı',
  ACTIVE: 'Aktif',
  COMPLETED: 'Tamamlandı',
};

const BurndownChart: React.FC<{ sprintId: string }> = ({ sprintId }) => {
  const { data, isLoading } = useGetSprintBurndownQuery({ sprintId });

  if (isLoading) return <p className="text-xs text-muted-foreground py-2">Burndown yükleniyor...</p>;
  if (!data || data.series.length === 0) return null;

  return (
    <div className="mt-2 rounded-lg border border-border p-2">
      <p className="text-xs font-medium text-foreground mb-1">
        Burndown ({data.totalPoints} story point)
      </p>
      <SimpleLineChart
        labels={data.series.map((p) => p.date.slice(5))}
        series={[
          { label: 'Kalan', color: '#3B82F6', values: data.series.map((p) => p.remaining) },
          { label: 'İdeal', color: '#94A3B8', values: data.series.map((p) => p.ideal), dashed: true },
        ]}
      />
    </div>
  );
};

export const SprintPanel: React.FC<SprintPanelProps> = ({ orgId, projectId, isAdmin, open, onOpenChange }) => {
  const confirm = useConfirm();
  const { data: sprints = [], isLoading } = useGetSprintsQuery({ orgId, projectId }, { skip: !open });
  const [createSprint, { isLoading: isCreating }] = useCreateSprintMutation();
  const [updateSprint] = useUpdateSprintMutation();
  const [deleteSprint] = useDeleteSprintMutation();

  const [showForm, setShowForm] = useState(false);
  const [name, setName] = useState('');
  const [goal, setGoal] = useState('');
  const [expandedId, setExpandedId] = useState<string | null>(null);

  const handleCreate = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!name.trim()) return;
    try {
      await createSprint({ orgId, projectId, name: name.trim(), goal: goal.trim() || null }).unwrap();
      toast.success('Sprint oluşturuldu.');
      setName('');
      setGoal('');
      setShowForm(false);
    } catch {
      toast.error('Sprint oluşturulamadı.');
    }
  };

  const handleStart = async (sprintId: string) => {
    try {
      await updateSprint({ sprintId, projectId, status: 'ACTIVE' }).unwrap();
    } catch (err) {
      const msg = (err as { data?: { error?: { message?: string } } })?.data?.error?.message;
      toast.error(msg || 'Sprint başlatılamadı.');
    }
  };

  const handleComplete = async (sprintId: string) => {
    try {
      const result = await updateSprint({ sprintId, projectId, status: 'COMPLETED' }).unwrap();
      const r = result.rollover;
      if (r && (r.rolledOverCount > 0 || r.backlogCount > 0)) {
        const parts: string[] = [];
        if (r.rolledOverCount > 0) {
          parts.push(`${r.rolledOverCount} kart "${r.nextSprintName}" sprintine taşındı`);
        }
        if (r.backlogCount > 0) {
          parts.push(`${r.backlogCount} kart backlog'a alındı`);
        }
        toast.success(`Sprint tamamlandı: ${parts.join(', ')}.`);
      } else {
        toast.success('Sprint tamamlandı.');
      }
    } catch {
      toast.error('Sprint tamamlanamadı.');
    }
  };

  const handleDelete = async (sprintId: string) => {
    const ok = await confirm({
      title: 'Sprint Sil',
      description: 'Bu sprint silinsin mi? Kartlar silinmez, sadece sprint bağlantısı kaldırılır.',
      confirmText: 'Sil',
      cancelText: 'İptal',
      variant: 'destructive',
    });
    if (!ok) return;
    try {
      await deleteSprint({ sprintId, projectId }).unwrap();
    } catch {
      toast.error('Sprint silinemedi.');
    }
  };

  return (
    <Dialog open={open} onOpenChange={onOpenChange}>
      <DialogContent className="max-w-lg max-h-[85vh] overflow-y-auto">
        <DialogHeader>
          <DialogTitle className="flex items-center gap-2">
            <Rocket className="size-4 text-primary" /> Sprintler
          </DialogTitle>
          <DialogDescription>
            Kartları zaman kutulu iterasyonlara ayırıp ilerlemeyi burndown ile takip et.
          </DialogDescription>
        </DialogHeader>

        <div className="space-y-2">
          {isLoading ? (
            <p className="text-sm text-muted-foreground">Yükleniyor...</p>
          ) : sprints.length === 0 ? (
            <p className="text-sm text-muted-foreground">Henüz bir sprint yok.</p>
          ) : (
            sprints.map((sprint) => (
              <div key={sprint.id} className="rounded-lg border border-border px-3 py-2">
                <div className="flex items-start justify-between gap-2">
                  <button
                    type="button"
                    className="min-w-0 text-left"
                    onClick={() => setExpandedId((id) => (id === sprint.id ? null : sprint.id))}
                  >
                    <p className="text-sm font-medium text-foreground truncate">{sprint.name}</p>
                    {sprint.goal && <p className="text-xs text-muted-foreground truncate">{sprint.goal}</p>}
                    <p className="text-xs text-muted-foreground">
                      {STATUS_LABEL[sprint.status]} · {sprint._count?.cards ?? 0} kart
                    </p>
                  </button>
                  <div className="flex shrink-0 items-center gap-1.5">
                    {isAdmin && sprint.status === 'PLANNED' && (
                      <button
                        type="button"
                        onClick={() => handleStart(sprint.id)}
                        className="text-muted-foreground hover:text-emerald-600"
                        title="Sprint'i başlat"
                      >
                        <Play className="size-3.5" />
                      </button>
                    )}
                    {isAdmin && sprint.status === 'ACTIVE' && (
                      <button
                        type="button"
                        onClick={() => handleComplete(sprint.id)}
                        className="text-muted-foreground hover:text-emerald-600"
                        title="Sprint'i tamamla"
                      >
                        <CheckCircle2 className="size-3.5" />
                      </button>
                    )}
                    {isAdmin && (
                      <button
                        type="button"
                        onClick={() => handleDelete(sprint.id)}
                        className="text-muted-foreground hover:text-destructive"
                      >
                        <Trash2 className="size-3.5" />
                      </button>
                    )}
                  </div>
                </div>
                {expandedId === sprint.id && <BurndownChart sprintId={sprint.id} />}
              </div>
            ))
          )}
        </div>

        {isAdmin &&
          (!showForm ? (
            <Button type="button" variant="outline" size="sm" onClick={() => setShowForm(true)} className="mt-2">
              <Plus className="size-3.5" /> Yeni Sprint
            </Button>
          ) : (
            <form onSubmit={handleCreate} className="mt-2 space-y-2 rounded-lg border border-border p-3">
              <Input value={name} onChange={(e) => setName(e.target.value)} placeholder="Sprint adı (örn: Sprint 1)" />
              <Input value={goal} onChange={(e) => setGoal(e.target.value)} placeholder="Sprint hedefi (opsiyonel)" />
              <div className="flex items-center justify-end gap-2 pt-1">
                <Button type="button" variant="ghost" size="sm" onClick={() => setShowForm(false)}>İptal</Button>
                <Button type="submit" size="sm" disabled={isCreating}>Kaydet</Button>
              </div>
            </form>
          ))}
      </DialogContent>
    </Dialog>
  );
};
