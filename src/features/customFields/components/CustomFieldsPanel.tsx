'use client';

import React, { useState } from 'react';
import { ListPlus, Trash2, Plus, X } from 'lucide-react';
import { toast } from 'sonner';
import {
  useGetCustomFieldsQuery,
  useCreateCustomFieldMutation,
  useDeleteCustomFieldMutation,
  CustomFieldType,
} from '@/features/customFields/customFieldsApi';
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

interface CustomFieldsPanelProps {
  orgId: string;
  projectId: string;
  open: boolean;
  onOpenChange: (open: boolean) => void;
}

const TYPE_LABEL: Record<CustomFieldType, string> = {
  TEXT: 'Metin',
  NUMBER: 'Sayı',
  DATE: 'Tarih',
  SELECT: 'Seçenek listesi',
  CHECKBOX: 'Onay kutusu',
};

export const CustomFieldsPanel: React.FC<CustomFieldsPanelProps> = ({ orgId, projectId, open, onOpenChange }) => {
  const confirm = useConfirm();
  const { data: fields = [], isLoading } = useGetCustomFieldsQuery({ orgId, projectId }, { skip: !open });
  const [createField, { isLoading: isCreating }] = useCreateCustomFieldMutation();
  const [deleteField] = useDeleteCustomFieldMutation();

  const [showForm, setShowForm] = useState(false);
  const [name, setName] = useState('');
  const [type, setType] = useState<CustomFieldType>('TEXT');
  const [options, setOptions] = useState<string[]>([]);
  const [optionInput, setOptionInput] = useState('');

  const resetForm = () => {
    setName('');
    setType('TEXT');
    setOptions([]);
    setOptionInput('');
    setShowForm(false);
  };

  const addOption = () => {
    const trimmed = optionInput.trim();
    if (!trimmed || options.includes(trimmed)) return;
    setOptions((o) => [...o, trimmed]);
    setOptionInput('');
  };

  const handleCreate = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!name.trim()) return;
    if (type === 'SELECT' && options.length === 0) {
      toast.error('Seçenek listesi için en az bir seçenek eklemelisin.');
      return;
    }
    try {
      await createField({ orgId, projectId, name: name.trim(), type, options }).unwrap();
      toast.success('Ek alan oluşturuldu.');
      resetForm();
    } catch (err) {
      const msg = (err as { data?: { error?: { message?: string } } })?.data?.error?.message;
      toast.error(msg || 'Ek alan oluşturulamadı.');
    }
  };

  const handleDelete = async (fieldId: string) => {
    const ok = await confirm({
      title: 'Ek Alanı Sil',
      description: 'Bu alan ve tüm kartlardaki değerleri silinecek. Emin misin?',
      confirmText: 'Sil',
      cancelText: 'İptal',
      variant: 'destructive',
    });
    if (!ok) return;
    try {
      await deleteField({ fieldId, projectId }).unwrap();
    } catch {
      toast.error('Ek alan silinemedi.');
    }
  };

  return (
    <Dialog open={open} onOpenChange={onOpenChange}>
      <DialogContent className="max-w-lg max-h-[85vh] overflow-y-auto">
        <DialogHeader>
          <DialogTitle className="flex items-center gap-2">
            <ListPlus className="size-4 text-primary" /> Ek Alanlar
          </DialogTitle>
          <DialogDescription>
            Kartlara projene özel alanlar ekle (Jira'daki Custom Fields).
          </DialogDescription>
        </DialogHeader>

        <div className="space-y-2">
          {isLoading ? (
            <p className="text-sm text-muted-foreground">Yükleniyor...</p>
          ) : fields.length === 0 ? (
            <p className="text-sm text-muted-foreground">Henüz bir ek alan yok.</p>
          ) : (
            fields.map((field) => (
              <div key={field.id} className="flex items-center justify-between gap-2 rounded-lg border border-border px-3 py-2">
                <div className="min-w-0">
                  <p className="text-sm font-medium text-foreground truncate">{field.name}</p>
                  <p className="text-xs text-muted-foreground">
                    {TYPE_LABEL[field.type]}
                    {field.type === 'SELECT' && field.options.length > 0 && `: ${field.options.join(', ')}`}
                  </p>
                </div>
                <button
                  type="button"
                  onClick={() => handleDelete(field.id)}
                  className="text-muted-foreground hover:text-destructive shrink-0"
                >
                  <Trash2 className="size-3.5" />
                </button>
              </div>
            ))
          )}
        </div>

        {!showForm ? (
          <Button type="button" variant="outline" size="sm" onClick={() => setShowForm(true)} className="mt-2">
            <Plus className="size-3.5" /> Yeni Alan
          </Button>
        ) : (
          <form onSubmit={handleCreate} className="mt-2 space-y-2 rounded-lg border border-border p-3">
            <Input value={name} onChange={(e) => setName(e.target.value)} placeholder="Alan adı (örn: Ortam)" />
            <select
              value={type}
              onChange={(e) => setType(e.target.value as CustomFieldType)}
              className="flex h-9 w-full rounded-md border border-input bg-transparent px-2 text-sm text-foreground"
            >
              {(Object.keys(TYPE_LABEL) as CustomFieldType[]).map((t) => (
                <option key={t} value={t} className="bg-popover">{TYPE_LABEL[t]}</option>
              ))}
            </select>

            {type === 'SELECT' && (
              <div>
                <div className="flex gap-1.5">
                  <Input
                    value={optionInput}
                    onChange={(e) => setOptionInput(e.target.value)}
                    onKeyDown={(e) => {
                      if (e.key === 'Enter') {
                        e.preventDefault();
                        addOption();
                      }
                    }}
                    placeholder="Seçenek yaz, Enter'a bas"
                  />
                  <Button type="button" variant="outline" size="sm" onClick={addOption}>Ekle</Button>
                </div>
                {options.length > 0 && (
                  <div className="flex flex-wrap gap-1 mt-1.5">
                    {options.map((opt) => (
                      <span key={opt} className="inline-flex items-center gap-1 text-xs bg-muted px-2 py-0.5 rounded-full">
                        {opt}
                        <button type="button" onClick={() => setOptions((o) => o.filter((x) => x !== opt))}>
                          <X className="size-3" />
                        </button>
                      </span>
                    ))}
                  </div>
                )}
              </div>
            )}

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
