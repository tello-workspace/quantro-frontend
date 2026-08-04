'use client';

import { useState } from 'react';
import { useRouter, useSearchParams } from 'next/navigation';
import { useCreateProjectMutation } from '@/features/projects/projectsApi';
import { toast } from "sonner";
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Textarea } from '@/components/ui/textarea';
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card';
import { useTranslation } from '@/hooks/useTranslation';

export default function NewProjectPage() {
  const { t } = useTranslation();
  const router = useRouter();
  const searchParams = useSearchParams();
  const orgId = searchParams.get('orgId');

  const [name, setName] = useState('');
  const [description, setDescription] = useState('');
  const [errorMsg, setErrorMsg] = useState('');

  const [createProject, { isLoading }] = useCreateProjectMutation();

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    setErrorMsg('');

    if (!orgId) {
      setErrorMsg('Organizasyon bulunamadı.');
      return;
    }

    try {
      const project = await createProject({ orgId, name, description: description || undefined }).unwrap();
      toast.success('Proje oluşturuldu!');
      router.push(`/projects/${project.id}?orgId=${orgId}`);
    } catch (err: any) {
      const errData = err?.data?.error;
      setErrorMsg(typeof errData === 'string' ? errData : errData?.message || 'Proje oluşturulamadı.');
    }
  };

  return (
    <main className="max-w-md mx-auto p-6">
      <Card>
        <CardHeader>
          <CardTitle>Yeni Proje</CardTitle>
          <CardDescription>{t('newProjectDesc')}</CardDescription>
        </CardHeader>
        <CardContent>
          {errorMsg && (
            <div className="mb-4 p-3 text-sm text-destructive bg-destructive/10 rounded-lg border border-destructive/20">
              {errorMsg}
            </div>
          )}

          <form onSubmit={handleSubmit} className="space-y-4">
            <div className="space-y-2">
              <label className="text-sm font-medium">{t('projectNameLabel')}</label>
              <Input
                type="text"
                placeholder={t('projectNameLabel')}
                value={name}
                onChange={(e) => setName(e.target.value)}
                required
              />
            </div>
            <div className="space-y-2">
              <label className="text-sm font-medium">{t('descriptionOptional')}</label>
              <Textarea
                placeholder={t('descriptionLabel')}
                value={description}
                onChange={(e) => setDescription(e.target.value)}
                rows={3}
              />
            </div>
            <Button type="submit" disabled={isLoading} className="w-full">
              {isLoading ? 'Oluşturuluyor...' : 'Proje Oluştur'}
            </Button>
          </form>
        </CardContent>
      </Card>
    </main>
  );
}
