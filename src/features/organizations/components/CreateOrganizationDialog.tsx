'use client';

import React, { useState } from 'react';
import { useRouter } from 'next/navigation';
import { toast } from 'sonner';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import {
  Dialog,
  DialogContent,
  DialogHeader,
  DialogTitle,
  DialogDescription,
  DialogFooter,
} from '@/components/ui/dialog';
import { useCreateOrganizationMutation } from '@/features/organizations/organizationsApi';
import { useTranslation } from '@/hooks/useTranslation';

interface Props {
  open: boolean;
  onOpenChange: (open: boolean) => void;
}

// Organizasyon olusturma tek bir yerde toplandi. Onceden yalnizca "hic
// organizasyonun yok" bos durumunda, sayfa icine gomulu ham fetch + sayfa
// yenileme seklinde vardi; bir organizasyona sahip olan kullanicinin ikinci
// bir tane (orn. kisisel calisma alani) acmasinin hicbir yolu yoktu.
export const CreateOrganizationDialog: React.FC<Props> = ({ open, onOpenChange }) => {
  const { t } = useTranslation();
  const router = useRouter();
  const [createOrganization, { isLoading }] = useCreateOrganizationMutation();
  const [name, setName] = useState('');
  const [description, setDescription] = useState('');

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    const trimmed = name.trim();
    if (!trimmed) return;

    try {
      const org = await createOrganization({
        name: trimmed,
        description: description.trim() || undefined,
      }).unwrap();

      setName('');
      setDescription('');
      onOpenChange(false);
      toast.success(t('orgCreated'));
      // Yeni organizasyonu dogrudan ac - kullanici olusturduktan sonra onu
      // sekmeler arasinda aramak zorunda kalmasin.
      router.push(`/projects?orgId=${org.id}`);
    } catch (err) {
      const mesaj = (err as { data?: { error?: { message?: string } } })?.data?.error?.message;
      toast.error(mesaj || t('orgCreateError'));
    }
  };

  return (
    <Dialog open={open} onOpenChange={onOpenChange}>
      <DialogContent className="sm:max-w-md">
        <DialogHeader>
          <DialogTitle>{t('createOrg')}</DialogTitle>
          <DialogDescription>{t('createOrgDesc')}</DialogDescription>
        </DialogHeader>

        <form onSubmit={handleSubmit} className="space-y-4">
          <div className="space-y-1.5">
            <Label htmlFor="org-name">{t('orgName')}</Label>
            <Input
              id="org-name"
              value={name}
              onChange={(e) => setName(e.target.value)}
              placeholder={t('orgNamePlaceholder')}
              autoFocus
              required
            />
          </div>

          <div className="space-y-1.5">
            <Label htmlFor="org-desc">{t('descriptionOpt')}</Label>
            <Input
              id="org-desc"
              value={description}
              onChange={(e) => setDescription(e.target.value)}
            />
          </div>

          <DialogFooter>
            <Button type="button" variant="outline" onClick={() => onOpenChange(false)}>
              {t('cancel')}
            </Button>
            <Button type="submit" disabled={isLoading || !name.trim()}>
              {isLoading ? t('loading') : t('create')}
            </Button>
          </DialogFooter>
        </form>
      </DialogContent>
    </Dialog>
  );
};
