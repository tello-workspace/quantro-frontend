'use client';

import React, { useState } from 'react';
import { CalendarDaysIcon, PlusIcon, SparklesIcon } from '@heroicons/react/24/outline';
import { toast } from "sonner";
import { useCreateChangeRequestMutation } from '@/features/requests/requestsApi';
import { useGetOrganizationByIdQuery } from '@/features/organizations/organizationsApi';
import { useFillCardWithAiMutation } from '@/features/ai/aiApi';
import {
  Dialog,
  DialogContent,
  DialogHeader,
  DialogDescription,
  DialogFooter,
} from '@/components/ui/dialog';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Textarea } from '@/components/ui/textarea';
import { Badge } from '@/components/ui/badge';
import { useTranslation } from '@/hooks/useTranslation';

interface Props {
  orgId: string;
  projectId: string;
  columnId: string | null;
  open: boolean;
  onOpenChange: (open: boolean) => void;
}

export const CreateCardRequestDialog: React.FC<Props> = ({
  orgId,
  projectId,
  columnId,
  open,
  onOpenChange,
}) => {
  const { t } = useTranslation();
  const [title, setTitle] = useState('');
  const [description, setDescription] = useState('');
  const [priority, setPriority] = useState<'LOW' | 'MEDIUM' | 'HIGH' | 'URGENT'>('MEDIUM');
  const [dueDate, setDueDate] = useState('');
  const [selectedAssignees, setSelectedAssignees] = useState<string[]>([]);
  const [showAssigneePicker, setShowAssigneePicker] = useState(false);

  const { data: org } = useGetOrganizationByIdQuery({ orgId }, { skip: !orgId || !open });
  const members = org?.members ?? [];

  const [createRequest, { isLoading }] = useCreateChangeRequestMutation();
  const [fillCardWithAi, { isLoading: isFilling }] = useFillCardWithAiMutation();

  const handleToggleAssignee = (userId: string) => {
    if (selectedAssignees.includes(userId)) {
      setSelectedAssignees(selectedAssignees.filter((id) => id !== userId));
    } else {
      setSelectedAssignees([...selectedAssignees, userId]);
    }
  };

  const handleAiFill = async () => {
    if (!title.trim()) return;
    try {
      const result = await fillCardWithAi({ projectId, title: title.trim() }).unwrap();
      
      if (result.description) {
        setDescription(result.description);
      }
      if (result.priority) {
        setPriority(result.priority as any);
      }
      if (result.dueDate && result.dueDate !== 'null' && result.dueDate !== 'undefined') {
        setDueDate(result.dueDate.split('T')[0]);
      }

      let atamaOnerisiUygulandi = false;
      if (result.suggestedAssigneeId && result.suggestedAssigneeId !== 'null') {
        const targetId = result.suggestedAssigneeId.trim().toLowerCase();
        const member = members.find(
          (m) =>
            m.userId.trim().toLowerCase() === targetId ||
            m.user.id.trim().toLowerCase() === targetId
        );
        if (member) {
          setSelectedAssignees([member.userId]);
          atamaOnerisiUygulandi = true;
        }
      }

      toast.success(
        atamaOnerisiUygulandi
          ? 'AI doldurma başarılı. Önerilen kişi atandı!'
          : 'AI doldurma başarılı!'
      );
    } catch {
      toast.error('AI ile doldurma başarısız oldu.');
    }
  };

  const handleCreate = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!title.trim() || !columnId) return;

    try {
      await createRequest({
        orgId,
        body: {
          type: 'CARD_CREATE',
          targetColumnId: columnId,
          payload: {
            title: title.trim(),
            description: description.trim() || null,
            priority,
            dueDate: dueDate || null,
            assigneeIds: selectedAssignees,
          },
        },
      }).unwrap();

      toast.success('Kart ekleme talebi başarıyla oluşturuldu ve admin onayına gönderildi.');
      
      // Reset state
      setTitle('');
      setDescription('');
      setPriority('MEDIUM');
      setDueDate('');
      setSelectedAssignees([]);
      setShowAssigneePicker(false);
      onOpenChange(false);
    } catch (err) {
      const mesaj = (err as { data?: { error?: { message?: string } } })?.data?.error?.message;
      toast.error(mesaj || 'Talep oluşturulamadı.');
    }
  };

  return (
    <Dialog open={open} onOpenChange={onOpenChange}>
      <DialogContent className="sm:max-w-xl w-full max-h-[90vh] overflow-y-auto">
        <DialogHeader>
          <div className="flex items-center justify-between gap-4 mr-6 pt-2">
            <div className="flex-1">
              <input
                type="text"
                required
                value={title}
                onChange={(e) => setTitle(e.target.value)}
                disabled={isFilling || isLoading}
                className="w-full text-lg font-semibold bg-transparent focus:outline-none focus:ring-1 focus:ring-ring rounded-md px-1 -mx-1 text-foreground border-b border-border/40 pb-1"
                placeholder={t('reqTitlePlaceholder')}
              />
            </div>
            <Button
              type="button"
              variant="outline"
              size="xs"
              onClick={handleAiFill}
              disabled={isFilling || !title.trim() || isLoading}
              className="flex items-center gap-1.5 shrink-0 bg-blue-50 dark:bg-blue-950/40 text-blue-700 dark:text-blue-300 border-blue-200 dark:border-blue-800 hover:bg-blue-100 dark:hover:bg-blue-950/80 transition-all font-medium py-1 px-2.5 rounded-lg text-xs"
            >
              {isFilling ? (
                <>
                  <svg className="animate-spin h-3 w-3 text-blue-700 dark:text-blue-300" xmlns="http://www.w3.org/2000/svg" fill="none" viewBox="0 0 24 24">
                    <circle className="opacity-25" cx="12" cy="12" r="10" stroke="currentColor" strokeWidth="4"></circle>
                    <path className="opacity-75" fill="currentColor" d="M4 12a8 8 0 018-8V0C5.373 0 0 5.373 0 12h4zm2 5.291A7.962 7.962 0 014 12H0c0 3.042 1.135 5.824 3 7.938l3-2.647z"></path>
                  </svg>
                  <span>AI Dolduruyor...</span>
                </>
              ) : (
                <>
                  <SparklesIcon className="h-3.5 w-3.5" />
                  <span>AI ile Doldur</span>
                </>
              )}
            </Button>
          </div>
          <DialogDescription className="mt-1.5">
            Panoda yeni bir kart oluşturmak için detayları doldurun. Talebiniz onaylandığında kart yayınlanacaktır.
          </DialogDescription>
        </DialogHeader>

        <form onSubmit={handleCreate} className="space-y-5 py-2">
          <div>
            <label htmlFor="req-description" className="block text-sm font-medium text-muted-foreground mb-1">
              Açıklama
            </label>
            <div className="relative">
              <Textarea
                id="req-description"
                rows={5}
                value={description}
                onChange={(e) => setDescription(e.target.value)}
                disabled={isFilling || isLoading}
                placeholder={t('reqDescPlaceholder')}
                className={isFilling ? "opacity-30" : ""}
              />
              {isFilling && (
                <div className="absolute inset-0 flex flex-col items-center justify-center bg-background/60 rounded-md backdrop-blur-[1px] border border-dashed border-blue-300 dark:border-blue-800 animate-pulse">
                  <div className="flex items-center gap-2 text-blue-600 dark:text-blue-400 font-medium text-sm">
                    <SparklesIcon className="h-5 w-5 animate-bounce" />
                    <span>{t('aiFillingDetails')}</span>
                  </div>
                  <span className="text-xs text-muted-foreground mt-1">{t('aiFillingDesc')}</span>
                </div>
              )}
            </div>
          </div>

          <div className="grid grid-cols-2 gap-4 items-start">
            <div className="space-y-4">
              <div>
                <label htmlFor="req-dueDate" className="inline-flex items-center gap-1.5 mb-1 text-sm font-medium text-muted-foreground">
                  <CalendarDaysIcon className="h-4 w-4" />
                  Son Teslim Tarihi
                </label>
                <Input
                  type="date"
                  id="req-dueDate"
                  value={dueDate}
                  onChange={(e) => setDueDate(e.target.value)}
                  disabled={isFilling || isLoading}
                />
              </div>

              <div>
                <label htmlFor="req-priority" className="block text-sm font-medium text-muted-foreground mb-1">
                  Öncelik
                </label>
                <select
                  id="req-priority"
                  value={priority}
                  onChange={(e) => setPriority(e.target.value as any)}
                  disabled={isFilling || isLoading}
                  className="flex h-9 w-full rounded-md border border-input bg-transparent px-3 py-1 text-sm shadow-sm transition-colors file:border-0 file:bg-transparent file:text-sm file:font-medium placeholder:text-muted-foreground focus-visible:outline-none focus-visible:ring-1 focus-visible:ring-ring disabled:cursor-not-allowed disabled:opacity-50 text-foreground"
                >
                  <option value="LOW" className="text-foreground bg-popover">{t('priorityLow')}</option>
                  <option value="MEDIUM" className="text-foreground bg-popover">{t('priorityMedium')}</option>
                  <option value="HIGH" className="text-foreground bg-popover">{t('priorityHigh')}</option>
                  <option value="URGENT" className="text-foreground bg-popover">{t('priorityUrgent')}</option>
                </select>
              </div>
            </div>

            <div>
              <label className="block text-sm font-medium text-muted-foreground mb-1.5">
                Önerilen Atamalar
              </label>

              <div className="flex flex-wrap items-center gap-1.5">
                {selectedAssignees.map((assigneeId) => {
                  const m = members.find((mem) => mem.userId === assigneeId);
                  return (
                    <Badge
                      key={assigneeId}
                      variant="secondary"
                      className="flex items-center gap-1 pl-2 pr-1"
                    >
                      {m?.user.name ?? 'Bilinmeyen'}
                      <button
                        type="button"
                        onClick={() => handleToggleAssignee(assigneeId)}
                        disabled={isFilling || isLoading}
                        className="hover:bg-black/10 rounded-sm p-0.5"
                      >
                        <span className="sr-only">{t('removeBtn')}</span>
                        &times;
                      </button>
                    </Badge>
                  );
                })}

                <div className="relative">
                  <Button
                    type="button"
                    variant="outline"
                    size="xs"
                    onClick={() => setShowAssigneePicker((v) => !v)}
                    disabled={isFilling || isLoading}
                  >
                    + Kişi
                  </Button>

                  {showAssigneePicker && (
                    <div className="absolute z-10 mt-2 w-48 rounded-lg border border-border bg-popover shadow-lg p-2 max-h-40 overflow-y-auto">
                      {members.map((m) => {
                        const checked = selectedAssignees.includes(m.userId);
                        return (
                          <label
                            key={m.userId}
                            className="flex items-center gap-2 px-2 py-1 rounded-md text-xs cursor-pointer hover:bg-muted"
                          >
                            <input
                              type="checkbox"
                              checked={checked}
                              onChange={() => handleToggleAssignee(m.userId)}
                              disabled={isFilling || isLoading}
                              className="rounded-md"
                            />
                            <span className="text-foreground">{m.user.name}</span>
                          </label>
                        );
                      })}
                    </div>
                  )}
                </div>
              </div>
            </div>
          </div>

          <DialogFooter className="mt-8 pt-4 border-t border-border">
            <Button
              type="button"
              variant="outline"
              onClick={() => onOpenChange(false)}
              disabled={isFilling || isLoading}
            >
              İptal
            </Button>
            <Button type="submit" disabled={isFilling || isLoading}>
              Talebi Oluştur
            </Button>
          </DialogFooter>
        </form>
      </DialogContent>
    </Dialog>
  );
};
