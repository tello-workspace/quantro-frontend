'use client';

import React, { useState } from 'react';
import { toast } from 'sonner';
import { AlertTriangle, Check, Copy, Link2, Trash2 } from 'lucide-react';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import {
  useGetWebhooksQuery,
  useCreateWebhookMutation,
  useUpdateWebhookMutation,
  useDeleteWebhookMutation,
  WEBHOOK_EVENTS,
  type WebhookEvent,
  type CreatedWebhook,
} from '@/features/projects/webhooksApi';

const EVENT_LABELS: Record<WebhookEvent, string> = {
  CARD_CREATED: 'Kart oluşturuldu',
  CARD_MOVED: 'Kart taşındı',
  CARD_ASSIGNED: 'Kart atandı',
  CARD_COMMENTED: 'Karta yorum yapıldı',
  CHANGE_REQUEST_APPROVED: 'Değişiklik talebi onaylandı',
};

interface WebhooksSectionProps {
  projectId: string;
}

// Sirri sunucu SADECE olusturulunca dondurur, sonrasinda bir daha
// GOSTERILEMEZ (bkz. ApiTokensSection'daki ayni kisit) - bu yuzden
// yeni webhook'un sirri ekranda tek seferlik bir uyari kutusunda gosterilir.
export const WebhooksSection: React.FC<WebhooksSectionProps> = ({ projectId }) => {
  const { data: webhooks, isLoading } = useGetWebhooksQuery({ projectId });
  const [createWebhook, { isLoading: creating }] = useCreateWebhookMutation();
  const [updateWebhook] = useUpdateWebhookMutation();
  const [deleteWebhook] = useDeleteWebhookMutation();

  const [url, setUrl] = useState('');
  const [selectedEvents, setSelectedEvents] = useState<WebhookEvent[]>([]);
  const [yeniWebhook, setYeniWebhook] = useState<CreatedWebhook | null>(null);
  const [kopyalandi, setKopyalandi] = useState(false);

  const toggleEvent = (event: WebhookEvent) => {
    setSelectedEvents((prev) => (prev.includes(event) ? prev.filter((e) => e !== event) : [...prev, event]));
  };

  const handleCreate = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!url.trim() || selectedEvents.length === 0 || creating) return;
    try {
      const sonuc = await createWebhook({ projectId, url: url.trim(), events: selectedEvents }).unwrap();
      setYeniWebhook(sonuc);
      setKopyalandi(false);
      setUrl('');
      setSelectedEvents([]);
    } catch (err: any) {
      toast.error(err?.data?.error?.message || 'Webhook oluşturulamadı');
    }
  };

  const handleCopy = async () => {
    if (!yeniWebhook) return;
    try {
      await navigator.clipboard.writeText(yeniWebhook.secret);
      setKopyalandi(true);
      toast.success('Sır kopyalandı');
    } catch {
      toast.error('Kopyalanamadı, metni elle seçin');
    }
  };

  const handleToggleActive = async (webhookId: string, isActive: boolean) => {
    try {
      await updateWebhook({ webhookId, projectId, isActive }).unwrap();
    } catch {
      toast.error('Webhook güncellenemedi');
    }
  };

  const handleDelete = async (webhookId: string, webhookUrl: string) => {
    if (!window.confirm(`"${webhookUrl}" webhook'unu silmek istediğine emin misin?`)) return;
    try {
      await deleteWebhook({ webhookId, projectId }).unwrap();
      toast.success('Webhook silindi');
    } catch {
      toast.error('Webhook silinemedi');
    }
  };

  return (
    <div className="space-y-6">
      <p className="text-sm text-muted-foreground">
        Seçtiğin olaylar gerçekleştiğinde bu adrese imzalı bir POST isteği gönderilir (Slack/Discord uyumlu).
      </p>

      {yeniWebhook && (
        <div className="rounded-lg border border-amber-500/40 bg-amber-500/5 p-4">
          <div className="mb-2 flex items-start gap-2">
            <AlertTriangle className="mt-0.5 size-4 shrink-0 text-amber-600" />
            <div className="text-sm">
              <p className="font-medium text-foreground">Bu sır bir daha gösterilmeyecek</p>
              <p className="text-muted-foreground">
                Gelen isteği doğrulamak için bu sırla imzalanan X-Quantro-Signature başlığını kullan.
              </p>
            </div>
          </div>
          <div className="flex items-center gap-2">
            <code className="min-w-0 flex-1 overflow-x-auto rounded-md border border-border bg-background px-3 py-2 font-mono text-xs">
              {yeniWebhook.secret}
            </code>
            <Button type="button" variant="outline" size="sm" onClick={handleCopy}>
              {kopyalandi ? <Check className="size-3.5" /> : <Copy className="size-3.5" />}
            </Button>
          </div>
          <Button type="button" variant="ghost" size="sm" className="mt-2" onClick={() => setYeniWebhook(null)}>
            Kapat
          </Button>
        </div>
      )}

      <form onSubmit={handleCreate} className="space-y-3">
        <div>
          <label htmlFor="webhook-url" className="mb-1.5 block text-sm font-medium">
            URL
          </label>
          <Input
            id="webhook-url"
            type="url"
            value={url}
            onChange={(e) => setUrl(e.target.value)}
            placeholder="https://hooks.slack.com/services/..."
            maxLength={500}
          />
        </div>
        <div>
          <p className="mb-1.5 block text-sm font-medium">Olaylar</p>
          <div className="flex flex-wrap gap-2">
            {WEBHOOK_EVENTS.map((event) => (
              <button
                key={event}
                type="button"
                onClick={() => toggleEvent(event)}
                className={`rounded-full border px-3 py-1 text-xs font-medium transition-colors ${
                  selectedEvents.includes(event)
                    ? 'border-primary bg-primary/10 text-primary'
                    : 'border-border text-muted-foreground hover:text-foreground'
                }`}
              >
                {EVENT_LABELS[event]}
              </button>
            ))}
          </div>
        </div>
        <Button type="submit" disabled={!url.trim() || selectedEvents.length === 0 || creating}>
          {creating ? 'Oluşturuluyor…' : 'Webhook ekle'}
        </Button>
      </form>

      <div className="space-y-2">
        {isLoading && <p className="text-sm text-muted-foreground">Yükleniyor…</p>}

        {!isLoading && (webhooks?.length ?? 0) === 0 && (
          <div className="rounded-lg border border-dashed border-border p-6 text-center">
            <Link2 className="mx-auto mb-2 size-5 text-muted-foreground" />
            <p className="text-sm text-muted-foreground">Henüz webhook eklenmedi.</p>
          </div>
        )}

        {webhooks?.map((webhook) => (
          <div key={webhook.id} className="flex items-center gap-3 rounded-lg border border-border p-3">
            <Link2 className="size-4 shrink-0 text-muted-foreground" />
            <div className="min-w-0 flex-1">
              <p className="truncate text-sm font-medium">{webhook.url}</p>
              <p className="truncate text-xs text-muted-foreground">
                {webhook.events.map((e) => EVENT_LABELS[e]).join(', ')}
              </p>
            </div>
            <Button
              type="button"
              variant="ghost"
              size="sm"
              className="shrink-0"
              onClick={() => handleToggleActive(webhook.id, !webhook.isActive)}
              title={webhook.isActive ? 'Devre dışı bırak' : 'Etkinleştir'}
            >
              {webhook.isActive ? 'Aktif' : 'Pasif'}
            </Button>
            <Button
              type="button"
              variant="ghost"
              size="sm"
              className="shrink-0 text-destructive hover:text-destructive"
              onClick={() => handleDelete(webhook.id, webhook.url)}
              title="Sil"
            >
              <Trash2 className="size-3.5" />
            </Button>
          </div>
        ))}
      </div>
    </div>
  );
};
