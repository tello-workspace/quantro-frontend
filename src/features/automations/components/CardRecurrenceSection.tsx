'use client';

import React, { useState } from 'react';
import { toast } from 'sonner';
import { Repeat } from 'lucide-react';
import { Button } from '@/components/ui/button';
import {
  useGetCardRecurrenceQuery,
  useCreateAutomationRuleMutation,
  useDeleteAutomationRuleMutation,
} from '@/features/automations/automationApi';

const GUN_ADLARI = ['Pazar', 'Pazartesi', 'Salı', 'Çarşamba', 'Perşembe', 'Cuma', 'Cumartesi'];

interface CardRecurrenceSectionProps {
  cardId: string;
  orgId: string;
  projectId: string;
  columnId: string;
  cardTitle: string;
}

// Kart üzerinden "bunu her hafta tekrarla" - arka planda mevcut otomasyon
// motoruna (SCHEDULED + CREATE_CARD) yazar, kullanıcı Otomasyonlar
// sekmesine gitmek zorunda kalmaz. sourceCardId ile bu karta bağlı - bkz.
// automation.service.ts'teki not.
export const CardRecurrenceSection: React.FC<CardRecurrenceSectionProps> = ({ cardId, orgId, projectId, columnId, cardTitle }) => {
  const { data: recurrence, refetch } = useGetCardRecurrenceQuery(cardId);
  const [createRule, { isLoading: creating }] = useCreateAutomationRuleMutation();
  const [deleteRule, { isLoading: deleting }] = useDeleteAutomationRuleMutation();
  const [dayOfWeek, setDayOfWeek] = useState(1);

  const handleEnable = async () => {
    try {
      await createRule({
        orgId,
        projectId,
        name: `Tekrar: ${cardTitle}`.slice(0, 100),
        trigger: 'SCHEDULED',
        actionType: 'CREATE_CARD',
        actionColumnId: columnId,
        actionMessage: cardTitle,
        scheduleDayOfWeek: dayOfWeek,
        sourceCardId: cardId,
      }).unwrap();
      toast.success('Tekrarlama ayarlandı');
      refetch();
    } catch (err: any) {
      toast.error(err?.data?.error?.message || 'Tekrarlama ayarlanamadı');
    }
  };

  const handleDisable = async () => {
    if (!recurrence) return;
    try {
      await deleteRule({ ruleId: recurrence.id, projectId }).unwrap();
      toast.success('Tekrarlama durduruldu');
      refetch();
    } catch {
      toast.error('Tekrarlama durdurulamadı');
    }
  };

  return (
    <div className="rounded-xl border border-border/60 bg-card/40 p-3">
      <div className="mb-2 flex items-center gap-1.5 text-sm font-medium text-muted-foreground">
        <Repeat className="size-4" />
        Tekrarlama
      </div>
      {recurrence ? (
        <div className="flex items-center justify-between gap-2">
          <p className="text-sm">
            Her {GUN_ADLARI[recurrence.scheduleDayOfWeek ?? 0]} yeniden açılıyor
          </p>
          <Button type="button" variant="outline" size="sm" onClick={handleDisable} disabled={deleting}>
            Durdur
          </Button>
        </div>
      ) : (
        <div className="flex items-center gap-2">
          <select
            value={dayOfWeek}
            onChange={(e) => setDayOfWeek(Number(e.target.value))}
            className="h-8 rounded-md border border-input bg-transparent px-2 text-sm"
          >
            {GUN_ADLARI.map((gun, i) => (
              <option key={gun} value={i}>
                Her {gun}
              </option>
            ))}
          </select>
          <Button type="button" variant="outline" size="sm" onClick={handleEnable} disabled={creating}>
            Tekrarla
          </Button>
        </div>
      )}
    </div>
  );
};
