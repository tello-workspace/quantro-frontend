'use client';

import React, { useState } from 'react';
import { toast } from 'sonner';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Trash2 } from 'lucide-react';
import {
  useGetProjectTemplatesQuery,
  useSaveProjectAsTemplateMutation,
  useDeleteProjectTemplateMutation,
} from '@/features/projects/projectsApi';

interface SaveAsTemplateSectionProps {
  orgId: string;
  projectId: string;
}

export const SaveAsTemplateSection: React.FC<SaveAsTemplateSectionProps> = ({ orgId, projectId }) => {
  const { data: templates } = useGetProjectTemplatesQuery({ orgId });
  const [saveAsTemplate, { isLoading: saving }] = useSaveProjectAsTemplateMutation();
  const [deleteTemplate] = useDeleteProjectTemplateMutation();
  const [name, setName] = useState('');

  const handleSave = async () => {
    if (!name.trim()) return;
    try {
      await saveAsTemplate({ orgId, projectId, name: name.trim() }).unwrap();
      toast.success('Şablon kaydedildi');
      setName('');
    } catch (err: any) {
      toast.error(err?.data?.error?.message || 'Şablon oluşturulamadı');
    }
  };

  return (
    <div className="space-y-4">
      <div className="flex items-center gap-2">
        <Input
          value={name}
          onChange={(e) => setName(e.target.value)}
          placeholder="Şablon adı (örn. Yazılım Geliştirme v2)"
          className="flex-1"
        />
        <Button type="button" size="sm" onClick={handleSave} disabled={!name.trim() || saving}>
          Bu projeden şablon oluştur
        </Button>
      </div>

      {templates && templates.custom.length > 0 && (
        <div>
          <p className="text-xs font-semibold text-muted-foreground mb-2">Bu organizasyonun şablonları</p>
          <ul className="space-y-1.5">
            {templates.custom.map((tpl) => (
              <li key={tpl.id} className="flex items-center gap-2.5 rounded-lg border border-border/50 bg-card/40 px-3 py-2 text-sm">
                <span className="flex-1 truncate">
                  {tpl.name} <span className="text-muted-foreground">— {tpl.columnCount} kolon{tpl.labelCount > 0 ? `, ${tpl.labelCount} etiket` : ''}</span>
                </span>
                <Button
                  type="button"
                  variant="ghost"
                  size="icon-sm"
                  onClick={() => deleteTemplate({ orgId, templateId: tpl.id })}
                  title="Şablonu sil"
                >
                  <Trash2 className="size-3.5" />
                </Button>
              </li>
            ))}
          </ul>
        </div>
      )}
    </div>
  );
};
