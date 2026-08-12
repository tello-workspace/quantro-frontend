'use client';

import { useState } from 'react';
import { useRouter, useSearchParams } from 'next/navigation';
import { useCreateProjectMutation, useGetProjectTemplatesQuery } from '@/features/projects/projectsApi';
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
  // Kart anahtari oneki. Bos birakilirsa backend proje adindan uretiyor -
  // zorunlu kilmak proje acmayi gereksiz yere yavaslatirdi.
  const [key, setKey] = useState('');
  const [templateId, setTemplateId] = useState('');
  const [errorMsg, setErrorMsg] = useState('');

  const [createProject, { isLoading }] = useCreateProjectMutation();
  const { data: templates } = useGetProjectTemplatesQuery({ orgId: orgId ?? '' }, { skip: !orgId });

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    setErrorMsg('');

    if (!orgId) {
      setErrorMsg('Organizasyon bulunamadı.');
      return;
    }

    try {
      const project = await createProject({
        orgId,
        name,
        description: description || undefined,
        key: key.trim() || undefined,
        templateId: templateId || undefined,
      }).unwrap();
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
              <label className="text-sm font-medium">{t('projectKeyLabel')}</label>
              <Input
                type="text"
                placeholder="QNT"
                value={key}
                maxLength={5}
                // Anahtar her zaman buyuk harf: kullanici kucuk yazarken de
                // sonucun nasil gorunecegini gorsun (backend de buyutuyor).
                onChange={(e) => setKey(e.target.value.toUpperCase())}
                className="font-mono uppercase"
              />
              <p className="text-xs text-muted-foreground">{t('projectKeyHint')}</p>
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
            {(templates?.builtin.length || templates?.custom.length) ? (
              <div className="space-y-2">
                <label className="text-sm font-medium">Şablon (opsiyonel)</label>
                <select
                  value={templateId}
                  onChange={(e) => setTemplateId(e.target.value)}
                  className="w-full h-9 rounded-md border border-input bg-transparent px-3 text-sm"
                >
                  <option value="">Varsayılan (To Do / In Progress / Testing / Done)</option>
                  {templates?.builtin.map((tpl) => (
                    <option key={tpl.id} value={tpl.id}>
                      {tpl.name} — {tpl.columnCount} kolon{tpl.labelCount > 0 ? `, ${tpl.labelCount} etiket` : ''}
                    </option>
                  ))}
                  {templates && templates.custom.length > 0 && (
                    <optgroup label="Bu organizasyonun şablonları">
                      {templates.custom.map((tpl) => (
                        <option key={tpl.id} value={tpl.id}>
                          {tpl.name} — {tpl.columnCount} kolon{tpl.labelCount > 0 ? `, ${tpl.labelCount} etiket` : ''}
                        </option>
                      ))}
                    </optgroup>
                  )}
                </select>
              </div>
            ) : null}
            <Button type="submit" disabled={isLoading} className="w-full">
              {isLoading ? 'Oluşturuluyor...' : 'Proje Oluştur'}
            </Button>
          </form>
        </CardContent>
      </Card>
    </main>
  );
}
