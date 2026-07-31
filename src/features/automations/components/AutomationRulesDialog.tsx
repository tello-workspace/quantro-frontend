'use client';

import React, { useState } from 'react';
import { Zap, Trash2, Plus } from 'lucide-react';
import { toast } from 'sonner';
import {
  useGetAutomationRulesQuery,
  useCreateAutomationRuleMutation,
  useToggleAutomationRuleMutation,
  useDeleteAutomationRuleMutation,
  AutomationTrigger,
  AutomationActionType,
} from '@/features/automations/automationApi';
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

interface ColumnOption {
  id: string;
  title: string;
}

interface LabelOption {
  id: string;
  name: string;
  color: string;
}

interface MemberOption {
  userId: string;
  user: { id: string; name: string };
}

interface AutomationRulesDialogProps {
  orgId: string;
  projectId: string;
  open: boolean;
  onOpenChange: (open: boolean) => void;
  columns: ColumnOption[];
  labels: LabelOption[];
  members: MemberOption[];
}

const TRIGGER_LABEL: Record<AutomationTrigger, string> = {
  CARD_MOVED_TO_COLUMN: 'Kart bir sütuna taşınınca',
  CARD_CREATED: 'Kart oluşturulunca',
  SCHEDULED: 'Zamanlanmış (gece taramasında)',
  CARD_DUE_SOON: 'Teslim tarihi yaklaşınca',
};

const ACTION_LABEL: Record<AutomationActionType, string> = {
  ADD_LABEL: 'Etiket ekle',
  MOVE_TO_COLUMN: 'Sütuna taşı',
  ASSIGN_USER: 'Kişiye ata',
  SEND_NOTIFICATION: 'Bildirim gönder',
  CREATE_CARD: 'Yeni kart oluştur',
};

const DAY_OF_WEEK_LABEL = ['Pazar', 'Pazartesi', 'Salı', 'Çarşamba', 'Perşembe', 'Cuma', 'Cumartesi'];

const PRIORITY_LABEL: Record<'LOW' | 'MEDIUM' | 'HIGH' | 'URGENT', string> = {
  LOW: 'Düşük',
  MEDIUM: 'Orta',
  HIGH: 'Yüksek',
  URGENT: 'Acil',
};

export const AutomationRulesDialog: React.FC<AutomationRulesDialogProps> = ({
  orgId,
  projectId,
  open,
  onOpenChange,
  columns,
  labels,
  members,
}) => {
  const confirm = useConfirm();
  const { data: rules = [], isLoading } = useGetAutomationRulesQuery({ orgId, projectId }, { skip: !open });
  const [createRule, { isLoading: isCreating }] = useCreateAutomationRuleMutation();
  const [toggleRule] = useToggleAutomationRuleMutation();
  const [deleteRule] = useDeleteAutomationRuleMutation();

  const [showForm, setShowForm] = useState(false);
  const [name, setName] = useState('');
  const [trigger, setTrigger] = useState<AutomationTrigger>('CARD_MOVED_TO_COLUMN');
  const [triggerColumnId, setTriggerColumnId] = useState('');
  const [actionType, setActionType] = useState<AutomationActionType>('ADD_LABEL');
  const [actionLabelId, setActionLabelId] = useState('');
  const [actionColumnId, setActionColumnId] = useState('');
  const [actionUserId, setActionUserId] = useState('');
  const [actionMessage, setActionMessage] = useState('');
  const [scheduleDayOfWeek, setScheduleDayOfWeek] = useState(''); // '' = her gün
  const [dueSoonDays, setDueSoonDays] = useState('3');
  const [conditionPriority, setConditionPriority] = useState(''); // '' = filtre yok
  const [conditionLabelId, setConditionLabelId] = useState(''); // '' = filtre yok

  const resetForm = () => {
    setName('');
    setTrigger('CARD_MOVED_TO_COLUMN');
    setTriggerColumnId('');
    setActionType('ADD_LABEL');
    setActionLabelId('');
    setActionColumnId('');
    setActionUserId('');
    setActionMessage('');
    setScheduleDayOfWeek('');
    setDueSoonDays('3');
    setConditionPriority('');
    setConditionLabelId('');
    setShowForm(false);
  };

  const handleCreate = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!name.trim()) return;
    if (trigger === 'CARD_MOVED_TO_COLUMN' && !triggerColumnId) {
      toast.error('Bu tetikleyici için hedef sütun seçmelisin.');
      return;
    }
    if (trigger === 'CARD_DUE_SOON' && !dueSoonDays.trim()) {
      toast.error('Kaç gün kala tetikleneceğini yazmalısın.');
      return;
    }
    if (actionType === 'ADD_LABEL' && !actionLabelId) {
      toast.error('Eklenecek etiketi seçmelisin.');
      return;
    }
    if ((actionType === 'MOVE_TO_COLUMN' || actionType === 'CREATE_CARD') && !actionColumnId) {
      toast.error('Hedef sütunu seçmelisin.');
      return;
    }
    if ((actionType === 'ASSIGN_USER' || actionType === 'SEND_NOTIFICATION') && !actionUserId) {
      toast.error('Bir kişi seçmelisin.');
      return;
    }
    if ((actionType === 'SEND_NOTIFICATION' || actionType === 'CREATE_CARD') && !actionMessage.trim()) {
      toast.error(actionType === 'CREATE_CARD' ? 'Yeni kartın başlığını yazmalısın.' : 'Bildirim mesajını yazmalısın.');
      return;
    }

    try {
      await createRule({
        orgId,
        projectId,
        name: name.trim(),
        trigger,
        triggerColumnId: trigger === 'CARD_MOVED_TO_COLUMN' ? triggerColumnId : null,
        actionType,
        actionLabelId: actionType === 'ADD_LABEL' ? actionLabelId : null,
        actionColumnId: actionType === 'MOVE_TO_COLUMN' || actionType === 'CREATE_CARD' ? actionColumnId : null,
        actionUserId: actionType === 'ASSIGN_USER' || actionType === 'SEND_NOTIFICATION' ? actionUserId : null,
        actionMessage:
          actionType === 'SEND_NOTIFICATION' || actionType === 'CREATE_CARD' ? actionMessage.trim() : null,
        scheduleDayOfWeek: trigger === 'SCHEDULED' && scheduleDayOfWeek !== '' ? Number(scheduleDayOfWeek) : null,
        dueSoonDays: trigger === 'CARD_DUE_SOON' ? Number(dueSoonDays) : null,
        conditionPriority: conditionPriority ? (conditionPriority as 'LOW' | 'MEDIUM' | 'HIGH' | 'URGENT') : null,
        conditionLabelId: conditionLabelId || null,
      }).unwrap();
      toast.success('Otomasyon kuralı oluşturuldu.');
      resetForm();
    } catch (err: unknown) {
      const errData = (err as { data?: { error?: { message?: string } } })?.data?.error;
      toast.error(errData?.message || 'Kural oluşturulamadı.');
    }
  };

  const handleToggle = async (ruleId: string, isActive: boolean) => {
    try {
      await toggleRule({ ruleId, projectId, isActive: !isActive }).unwrap();
    } catch {
      toast.error('Kural güncellenemedi.');
    }
  };

  const handleDelete = async (ruleId: string) => {
    const ok = await confirm({
      title: 'Kuralı Sil',
      description: 'Bu otomasyon kuralını silmek istediğinizden emin misiniz?',
      confirmText: 'Sil',
      cancelText: 'İptal',
      variant: 'destructive',
    });
    if (!ok) return;
    try {
      await deleteRule({ ruleId, projectId }).unwrap();
    } catch {
      toast.error('Kural silinemedi.');
    }
  };

  const describeAction = (rule: (typeof rules)[number]) => {
    switch (rule.actionType) {
      case 'ADD_LABEL':
        return `Etiket ekle: ${labels.find((l) => l.id === rule.actionLabelId)?.name ?? '—'}`;
      case 'MOVE_TO_COLUMN':
        return `Sütuna taşı: ${columns.find((c) => c.id === rule.actionColumnId)?.title ?? '—'}`;
      case 'ASSIGN_USER':
        return `Kişiye ata: ${members.find((m) => m.userId === rule.actionUserId)?.user.name ?? '—'}`;
      case 'SEND_NOTIFICATION':
        return `Bildirim gönder: "${rule.actionMessage}"`;
      case 'CREATE_CARD':
        return `Yeni kart oluştur: "${rule.actionMessage}" → ${columns.find((c) => c.id === rule.actionColumnId)?.title ?? '—'}`;
    }
  };

  const describeTrigger = (rule: (typeof rules)[number]) => {
    if (rule.trigger === 'CARD_MOVED_TO_COLUMN') {
      const colTitle = columns.find((c) => c.id === rule.triggerColumnId)?.title ?? '—';
      return `Kart "${colTitle}" sütununa taşınınca`;
    }
    if (rule.trigger === 'SCHEDULED') {
      return rule.scheduleDayOfWeek == null
        ? 'Her gün gece taramasında'
        : `Her ${DAY_OF_WEEK_LABEL[rule.scheduleDayOfWeek]} gece taramasında`;
    }
    if (rule.trigger === 'CARD_DUE_SOON') {
      return `Teslim tarihine ${rule.dueSoonDays} gün kala`;
    }
    return 'Kart oluşturulunca';
  };

  return (
    <Dialog open={open} onOpenChange={onOpenChange}>
      <DialogContent className="max-w-lg max-h-[85vh] overflow-y-auto">
        <DialogHeader>
          <DialogTitle className="flex items-center gap-2">
            <Zap className="size-4 text-primary" /> Otomasyon Kuralları
          </DialogTitle>
          <DialogDescription>
            Belirli bir olay gerçekleştiğinde otomatik olarak bir aksiyon çalıştır.
          </DialogDescription>
        </DialogHeader>

        <div className="space-y-2">
          {isLoading ? (
            <p className="text-sm text-muted-foreground">Yükleniyor...</p>
          ) : rules.length === 0 ? (
            <p className="text-sm text-muted-foreground">Henüz bir otomasyon kuralı yok.</p>
          ) : (
            rules.map((rule) => (
              <div
                key={rule.id}
                className="flex items-start justify-between gap-2 rounded-lg border border-border px-3 py-2"
              >
                <div className="min-w-0">
                  <p className="text-sm font-medium text-foreground truncate">{rule.name}</p>
                  <p className="text-xs text-muted-foreground">{describeTrigger(rule)}</p>
                  {(rule.conditionPriority || rule.conditionLabelId) && (
                    <p className="text-xs text-amber-600 dark:text-amber-400">
                      Koşul:{' '}
                      {[
                        rule.conditionPriority ? `öncelik = ${PRIORITY_LABEL[rule.conditionPriority]}` : null,
                        rule.conditionLabelId
                          ? `etiket = ${labels.find((l) => l.id === rule.conditionLabelId)?.name ?? '—'}`
                          : null,
                      ]
                        .filter(Boolean)
                        .join(' VE ')}
                    </p>
                  )}
                  <p className="text-xs text-muted-foreground">→ {describeAction(rule)}</p>
                </div>
                <div className="flex shrink-0 items-center gap-2">
                  <button
                    type="button"
                    onClick={() => handleToggle(rule.id, rule.isActive)}
                    className={`text-xs font-medium px-2 py-1 rounded-md transition-colors ${
                      rule.isActive
                        ? 'bg-emerald-500/10 text-emerald-600 dark:text-emerald-400'
                        : 'bg-muted text-muted-foreground'
                    }`}
                  >
                    {rule.isActive ? 'Aktif' : 'Pasif'}
                  </button>
                  <button
                    type="button"
                    onClick={() => handleDelete(rule.id)}
                    className="text-muted-foreground hover:text-destructive"
                  >
                    <Trash2 className="size-3.5" />
                  </button>
                </div>
              </div>
            ))
          )}
        </div>

        {!showForm ? (
          <Button type="button" variant="outline" size="sm" onClick={() => setShowForm(true)} className="mt-2">
            <Plus className="size-3.5" /> Yeni Kural
          </Button>
        ) : (
          <form onSubmit={handleCreate} className="mt-2 space-y-3 rounded-lg border border-border p-3">
            <Input
              value={name}
              onChange={(e) => setName(e.target.value)}
              placeholder="Kural adı (örn: Testing'e girince QA'ya ata)"
            />

            <div className="grid grid-cols-2 gap-2">
              <div>
                <label className="block text-xs font-medium text-muted-foreground mb-1">Tetikleyici</label>
                <select
                  value={trigger}
                  onChange={(e) => setTrigger(e.target.value as AutomationTrigger)}
                  className="flex h-9 w-full rounded-md border border-input bg-transparent px-2 text-sm text-foreground"
                >
                  {(Object.keys(TRIGGER_LABEL) as AutomationTrigger[]).map((t) => (
                    <option key={t} value={t} className="bg-popover">
                      {TRIGGER_LABEL[t]}
                    </option>
                  ))}
                </select>
              </div>

              {trigger === 'CARD_MOVED_TO_COLUMN' && (
                <div>
                  <label className="block text-xs font-medium text-muted-foreground mb-1">Hedef Sütun</label>
                  <select
                    value={triggerColumnId}
                    onChange={(e) => setTriggerColumnId(e.target.value)}
                    className="flex h-9 w-full rounded-md border border-input bg-transparent px-2 text-sm text-foreground"
                  >
                    <option value="" className="bg-popover">Seç...</option>
                    {columns.map((c) => (
                      <option key={c.id} value={c.id} className="bg-popover">{c.title}</option>
                    ))}
                  </select>
                </div>
              )}

              {trigger === 'SCHEDULED' && (
                <div>
                  <label className="block text-xs font-medium text-muted-foreground mb-1">Hangi gün</label>
                  <select
                    value={scheduleDayOfWeek}
                    onChange={(e) => setScheduleDayOfWeek(e.target.value)}
                    className="flex h-9 w-full rounded-md border border-input bg-transparent px-2 text-sm text-foreground"
                  >
                    <option value="" className="bg-popover">Her gün</option>
                    {DAY_OF_WEEK_LABEL.map((label, i) => (
                      <option key={i} value={i} className="bg-popover">{label}</option>
                    ))}
                  </select>
                </div>
              )}

              {trigger === 'CARD_DUE_SOON' && (
                <div>
                  <label className="block text-xs font-medium text-muted-foreground mb-1">Kaç gün kala</label>
                  <Input
                    type="number"
                    min={0}
                    max={90}
                    value={dueSoonDays}
                    onChange={(e) => setDueSoonDays(e.target.value)}
                  />
                </div>
              )}
            </div>

            <div>
              <label className="block text-xs font-medium text-muted-foreground mb-1">Aksiyon</label>
              <select
                value={actionType}
                onChange={(e) => setActionType(e.target.value as AutomationActionType)}
                className="flex h-9 w-full rounded-md border border-input bg-transparent px-2 text-sm text-foreground"
              >
                {(Object.keys(ACTION_LABEL) as AutomationActionType[]).map((a) => (
                  <option key={a} value={a} className="bg-popover">
                    {ACTION_LABEL[a]}
                  </option>
                ))}
              </select>
            </div>

            {actionType === 'ADD_LABEL' && (
              <select
                value={actionLabelId}
                onChange={(e) => setActionLabelId(e.target.value)}
                className="flex h-9 w-full rounded-md border border-input bg-transparent px-2 text-sm text-foreground"
              >
                <option value="" className="bg-popover">Etiket seç...</option>
                {labels.map((l) => (
                  <option key={l.id} value={l.id} className="bg-popover">{l.name}</option>
                ))}
              </select>
            )}

            {actionType === 'MOVE_TO_COLUMN' && (
              <select
                value={actionColumnId}
                onChange={(e) => setActionColumnId(e.target.value)}
                className="flex h-9 w-full rounded-md border border-input bg-transparent px-2 text-sm text-foreground"
              >
                <option value="" className="bg-popover">Sütun seç...</option>
                {columns.map((c) => (
                  <option key={c.id} value={c.id} className="bg-popover">{c.title}</option>
                ))}
              </select>
            )}

            {(actionType === 'ASSIGN_USER' || actionType === 'SEND_NOTIFICATION') && (
              <select
                value={actionUserId}
                onChange={(e) => setActionUserId(e.target.value)}
                className="flex h-9 w-full rounded-md border border-input bg-transparent px-2 text-sm text-foreground"
              >
                <option value="" className="bg-popover">Kişi seç...</option>
                {members.map((m) => (
                  <option key={m.userId} value={m.userId} className="bg-popover">{m.user.name}</option>
                ))}
              </select>
            )}

            {actionType === 'CREATE_CARD' && (
              <select
                value={actionColumnId}
                onChange={(e) => setActionColumnId(e.target.value)}
                className="flex h-9 w-full rounded-md border border-input bg-transparent px-2 text-sm text-foreground"
              >
                <option value="" className="bg-popover">Kartın açılacağı sütun...</option>
                {columns.map((c) => (
                  <option key={c.id} value={c.id} className="bg-popover">{c.title}</option>
                ))}
              </select>
            )}

            {(actionType === 'SEND_NOTIFICATION' || actionType === 'CREATE_CARD') && (
              <Input
                value={actionMessage}
                onChange={(e) => setActionMessage(e.target.value)}
                placeholder={actionType === 'CREATE_CARD' ? 'Yeni kartın başlığı...' : 'Bildirim mesajı...'}
              />
            )}

            <div className="border-t border-border pt-2">
              <label className="block text-xs font-medium text-muted-foreground mb-1">
                Koşul (opsiyonel) — ikisi de doluysa ikisi de sağlanmalı
              </label>
              <div className="grid grid-cols-2 gap-2">
                <select
                  value={conditionPriority}
                  onChange={(e) => setConditionPriority(e.target.value)}
                  className="flex h-9 w-full rounded-md border border-input bg-transparent px-2 text-sm text-foreground"
                >
                  <option value="" className="bg-popover">Öncelik filtresi yok</option>
                  {(Object.keys(PRIORITY_LABEL) as (keyof typeof PRIORITY_LABEL)[]).map((p) => (
                    <option key={p} value={p} className="bg-popover">Sadece {PRIORITY_LABEL[p]}</option>
                  ))}
                </select>
                <select
                  value={conditionLabelId}
                  onChange={(e) => setConditionLabelId(e.target.value)}
                  className="flex h-9 w-full rounded-md border border-input bg-transparent px-2 text-sm text-foreground"
                >
                  <option value="" className="bg-popover">Etiket filtresi yok</option>
                  {labels.map((l) => (
                    <option key={l.id} value={l.id} className="bg-popover">Sadece &quot;{l.name}&quot; etiketliler</option>
                  ))}
                </select>
              </div>
            </div>

            <div className="flex items-center justify-end gap-2 pt-1">
              <Button type="button" variant="ghost" size="sm" onClick={resetForm}>İptal</Button>
              <Button type="submit" size="sm" disabled={isCreating}>Kaydet</Button>
            </div>
          </form>
        )}
      </DialogContent>
    </Dialog>
  );
};
