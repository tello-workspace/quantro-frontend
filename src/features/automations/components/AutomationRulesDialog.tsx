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
import { useTranslation } from '@/hooks/useTranslation';

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

const TRIGGER_KEYS: AutomationTrigger[] = ['CARD_MOVED_TO_COLUMN', 'CARD_CREATED', 'SCHEDULED', 'CARD_DUE_SOON'];
const ACTION_KEYS: AutomationActionType[] = ['ADD_LABEL', 'MOVE_TO_COLUMN', 'ASSIGN_USER', 'SEND_NOTIFICATION', 'CREATE_CARD'];
// enum degerini ceviri anahtarina esleyen yardimcilar (dinamik template yerine
// tip-guvenli sabit map — t()'e dogrudan gecerli bir TranslationKey gecmek icin)
const TRIGGER_I18N_KEY: Record<AutomationTrigger, 'automationTriggerMoved' | 'automationTriggerCreated' | 'automationTriggerScheduled' | 'automationTriggerDueSoon'> = {
  CARD_MOVED_TO_COLUMN: 'automationTriggerMoved',
  CARD_CREATED: 'automationTriggerCreated',
  SCHEDULED: 'automationTriggerScheduled',
  CARD_DUE_SOON: 'automationTriggerDueSoon',
};
const ACTION_I18N_KEY: Record<AutomationActionType, 'automationActionAddLabel' | 'automationActionMove' | 'automationActionAssign' | 'automationActionNotify' | 'automationActionCreateCard'> = {
  ADD_LABEL: 'automationActionAddLabel',
  MOVE_TO_COLUMN: 'automationActionMove',
  ASSIGN_USER: 'automationActionAssign',
  SEND_NOTIFICATION: 'automationActionNotify',
  CREATE_CARD: 'automationActionCreateCard',
};
const DAY_OF_WEEK_LABEL = ['Pazar', 'Pazartesi', 'Salı', 'Çarşamba', 'Perşembe', 'Cuma', 'Cumartesi'];

// Backend ForbiddenError dönerse (403) yetkisiz kullanıcıya net bir mesaj
// göster. Varsayılan hata mesajı backend'den gelebilir; 403'te "yetkiniz yok"
// açıkça söylenir ki MEMBER kullanıcı otomasyonu yönetmeye çalıştığında
// ne olduğunu anlasın.
function getAutomationError(
  err: unknown,
  fallback: string,
  forbiddenMessage: string,
): { message: string; isForbidden: boolean } {
  const errData = (err as { data?: { error?: { message?: string } } })?.data?.error;
  const status = (err as { status?: number })?.status;
  if (status === 403) {
    return { message: forbiddenMessage, isForbidden: true };
  }
  return { message: errData?.message || fallback, isForbidden: false };
}

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
  const { t } = useTranslation();
  const forbiddenMessage = t('automationForbidden');
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
      toast.error(t('automationTriggerColumnRequired'));
      return;
    }
    if (trigger === 'CARD_DUE_SOON' && !dueSoonDays.trim()) {
      toast.error(t('automationDueSoonRequired'));
      return;
    }
    if (actionType === 'ADD_LABEL' && !actionLabelId) {
      toast.error(t('automationLabelRequired'));
      return;
    }
    if ((actionType === 'MOVE_TO_COLUMN' || actionType === 'CREATE_CARD') && !actionColumnId) {
      toast.error(t('automationColumnRequired'));
      return;
    }
    if ((actionType === 'ASSIGN_USER' || actionType === 'SEND_NOTIFICATION') && !actionUserId) {
      toast.error(t('automationPersonRequired'));
      return;
    }
    if ((actionType === 'SEND_NOTIFICATION' || actionType === 'CREATE_CARD') && !actionMessage.trim()) {
      toast.error(actionType === 'CREATE_CARD' ? t('automationCardTitleRequired') : t('automationMessageRequired'));
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
      toast.success(t('automationCreated'));
      resetForm();
    } catch (err: unknown) {
      const { message, isForbidden } = getAutomationError(err, t('automationCreateError'), forbiddenMessage);
      toast.error(message);
      // Yetkisiz kullanıcıysa formu kapat - zaten kaydedemez.
      if (isForbidden) setShowForm(false);
    }
  };

  const handleToggle = async (ruleId: string, isActive: boolean) => {
    try {
      await toggleRule({ ruleId, projectId, isActive: !isActive }).unwrap();
    } catch (err: unknown) {
      toast.error(getAutomationError(err, t('automationToggleError'), forbiddenMessage).message);
    }
  };

  const handleDelete = async (ruleId: string) => {
    const ok = await confirm({
      title: t('automationDeleteTitle'),
      description: t('automationDeleteDesc'),
      confirmText: t('automationDeleteTaskTitle'),
      cancelText: t('automationCancel'),
      variant: 'destructive',
    });
    if (!ok) return;
    try {
      await deleteRule({ ruleId, projectId }).unwrap();
    } catch (err: unknown) {
      toast.error(getAutomationError(err, t('automationDeleteError'), forbiddenMessage).message);
    }
  };

  const describeAction = (rule: (typeof rules)[number]) => {
    switch (rule.actionType) {
      case 'ADD_LABEL':
        return `${t('automationActionAddLabel')}: ${labels.find((l) => l.id === rule.actionLabelId)?.name ?? '—'}`;
      case 'MOVE_TO_COLUMN':
        return `${t('automationActionMove')}: ${columns.find((c) => c.id === rule.actionColumnId)?.title ?? '—'}`;
      case 'ASSIGN_USER':
        return `${t('automationActionAssign')}: ${members.find((m) => m.userId === rule.actionUserId)?.user.name ?? '—'}`;
      case 'SEND_NOTIFICATION':
        return `${t('automationActionNotify')}: "${rule.actionMessage}"`;
      case 'CREATE_CARD':
        return `${t('automationActionCreateCard')}: "${rule.actionMessage}" → ${columns.find((c) => c.id === rule.actionColumnId)?.title ?? '—'}`;
    }
  };

  const describeTrigger = (rule: (typeof rules)[number]) => {
    if (rule.trigger === 'CARD_MOVED_TO_COLUMN') {
      const colTitle = columns.find((c) => c.id === rule.triggerColumnId)?.title ?? '—';
      return `${t('automationTriggerMoved')}: "${colTitle}"`;
    }
    if (rule.trigger === 'SCHEDULED') {
      return rule.scheduleDayOfWeek == null
        ? t('automationScheduledNightly')
        : `${t('automationScheduledWeekly')} ${DAY_OF_WEEK_LABEL[rule.scheduleDayOfWeek]} ${t('automationScheduledNightlyWeekly')}`;
    }
    if (rule.trigger === 'CARD_DUE_SOON') {
      return `${t('automationDueSoonDesc')} ${rule.dueSoonDays} ${t('automationDueSoonDesc2')}`;
    }
    return t('automationTriggerCreated');
  };

  return (
    <Dialog open={open} onOpenChange={onOpenChange}>
      <DialogContent className="max-w-lg max-h-[85vh] overflow-y-auto">
        <DialogHeader>
          <DialogTitle className="flex items-center gap-2">
            <Zap className="size-4 text-primary" /> {t('automationRules')}
          </DialogTitle>
          <DialogDescription>
            {t('automationRulesDesc')}
          </DialogDescription>
        </DialogHeader>

        <div className="space-y-2">
          {isLoading ? (
            <p className="text-sm text-muted-foreground">{t('automationLoading')}</p>
          ) : rules.length === 0 ? (
            <p className="text-sm text-muted-foreground">{t('automationNoRules')}</p>
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
                      {t('automationConditionSectionLabel')}:{' '}
                      {[
                        rule.conditionPriority
                          ? `${t('automationConditionPriority')} ${PRIORITY_LABEL[rule.conditionPriority]}`
                          : null,
                        rule.conditionLabelId
                          ? `${t('automationConditionLabelEquals')} ${labels.find((l) => l.id === rule.conditionLabelId)?.name ?? '—'}`
                          : null,
                      ]
                        .filter(Boolean)
                        .join(` ${t('automationConditionAnd')} `)}
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
                    {rule.isActive ? t('automationActive') : t('automationInactive')}
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
            <Plus className="size-3.5" /> {t('automationNewRule')}
          </Button>
        ) : (
          <form onSubmit={handleCreate} className="mt-2 space-y-3 rounded-lg border border-border p-3">
            <Input
              value={name}
              onChange={(e) => setName(e.target.value)}
              placeholder={t('automationRuleNamePlaceholder')}
            />

            <div className="grid grid-cols-2 gap-2">
              <div>
                <label className="block text-xs font-medium text-muted-foreground mb-1">{t('automationTriggerLabel')}</label>
                <select
                  value={trigger}
                  onChange={(e) => setTrigger(e.target.value as AutomationTrigger)}
                  className="flex h-9 w-full rounded-md border border-input bg-transparent px-2 text-sm text-foreground"
                >
                  {TRIGGER_KEYS.map((trig) => (
                    <option key={trig} value={trig} className="bg-popover">
                      {t(TRIGGER_I18N_KEY[trig])}
                    </option>
                  ))}
                </select>
              </div>

              {trigger === 'CARD_MOVED_TO_COLUMN' && (
                <div>
                  <label className="block text-xs font-medium text-muted-foreground mb-1">{t('automationTargetColumn')}</label>
                  <select
                    value={triggerColumnId}
                    onChange={(e) => setTriggerColumnId(e.target.value)}
                    className="flex h-9 w-full rounded-md border border-input bg-transparent px-2 text-sm text-foreground"
                  >
                    <option value="" className="bg-popover">{t('automationSelect')}</option>
                    {columns.map((c) => (
                      <option key={c.id} value={c.id} className="bg-popover">{c.title}</option>
                    ))}
                  </select>
                </div>
              )}

              {trigger === 'SCHEDULED' && (
                <div>
                  <label className="block text-xs font-medium text-muted-foreground mb-1">{t('automationDayOfWeek')}</label>
                  <select
                    value={scheduleDayOfWeek}
                    onChange={(e) => setScheduleDayOfWeek(e.target.value)}
                    className="flex h-9 w-full rounded-md border border-input bg-transparent px-2 text-sm text-foreground"
                  >
                    <option value="" className="bg-popover">{t('automationEveryDay')}</option>
                    {DAY_OF_WEEK_LABEL.map((label, i) => (
                      <option key={i} value={i} className="bg-popover">{label}</option>
                    ))}
                  </select>
                </div>
              )}

              {trigger === 'CARD_DUE_SOON' && (
                <div>
                  <label className="block text-xs font-medium text-muted-foreground mb-1">{t('automationDueSoonDays')}</label>
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
              <label className="block text-xs font-medium text-muted-foreground mb-1">{t('automationActionLabel')}</label>
              <select
                value={actionType}
                onChange={(e) => setActionType(e.target.value as AutomationActionType)}
                className="flex h-9 w-full rounded-md border border-input bg-transparent px-2 text-sm text-foreground"
              >
                {ACTION_KEYS.map((a) => (
                  <option key={a} value={a} className="bg-popover">
                    {t(ACTION_I18N_KEY[a])}
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
                <option value="" className="bg-popover">{t('automationLabelSelect')}</option>
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
                <option value="" className="bg-popover">{t('automationColumnSelect')}</option>
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
                <option value="" className="bg-popover">{t('automationPersonSelect')}</option>
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
                <option value="" className="bg-popover">{t('automationCardColumnSelect')}</option>
                {columns.map((c) => (
                  <option key={c.id} value={c.id} className="bg-popover">{c.title}</option>
                ))}
              </select>
            )}

            {(actionType === 'SEND_NOTIFICATION' || actionType === 'CREATE_CARD') && (
              <Input
                value={actionMessage}
                onChange={(e) => setActionMessage(e.target.value)}
                placeholder={actionType === 'CREATE_CARD' ? t('automationCardTitlePlaceholder') : t('automationMessagePlaceholder')}
              />
            )}

            <div className="border-t border-border pt-2">
              <label className="block text-xs font-medium text-muted-foreground mb-1">
                {t('automationConditionSectionLabel')}
              </label>
              <div className="grid grid-cols-2 gap-2">
                <select
                  value={conditionPriority}
                  onChange={(e) => setConditionPriority(e.target.value)}
                  className="flex h-9 w-full rounded-md border border-input bg-transparent px-2 text-sm text-foreground"
                >
                  <option value="" className="bg-popover">{t('automationPriorityFilterNone')}</option>
                  {(Object.keys(PRIORITY_LABEL) as (keyof typeof PRIORITY_LABEL)[]).map((p) => (
                    <option key={p} value={p} className="bg-popover">{t('automationOnlyPriority')} {PRIORITY_LABEL[p]}</option>
                  ))}
                </select>
                <select
                  value={conditionLabelId}
                  onChange={(e) => setConditionLabelId(e.target.value)}
                  className="flex h-9 w-full rounded-md border border-input bg-transparent px-2 text-sm text-foreground"
                >
                  <option value="" className="bg-popover">{t('automationLabelFilterNone')}</option>
                  {labels.map((l) => (
                    <option key={l.id} value={l.id} className="bg-popover">{t('automationOnlyLabel')} &quot;{l.name}&quot;</option>
                  ))}
                </select>
              </div>
            </div>

            <div className="flex items-center justify-end gap-2 pt-1">
              <Button type="button" variant="ghost" size="sm" onClick={resetForm}>{t('automationCancel')}</Button>
              <Button type="submit" size="sm" disabled={isCreating}>{t('automationSave')}</Button>
            </div>
          </form>
        )}
      </DialogContent>
    </Dialog>
  );
};
