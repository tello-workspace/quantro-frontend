'use client';

import React, { useState } from 'react';
import { Copy, Check, Trash2, KeyRound, Plus, AlertTriangle } from 'lucide-react';
import { toast } from 'sonner';
import {
  useListApiTokensQuery,
  useCreateApiTokenMutation,
  useRevokeApiTokenMutation,
  type OlusturulanToken,
} from '../meApi';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { useTranslation } from '@/hooks/useTranslation';

// API anahtari yonetimi.
//
// Tasarimin merkezindeki kisit: ham anahtar sunucuda TUTULMUYOR (yalnizca
// sha256 hash'i), dolayisiyla uretildigi andan sonra bir daha
// GOSTERILEMEZ. Arayuzun bunu net anlatmasi ve kopyalamayi kolaylastirmasi
// gerekiyor - aksi halde kullanici pencereyi kapatip anahtari kaybediyor.

function tarihYaz(iso: string | null, hicKullanilmadi: string): string {
  if (!iso) return hicKullanilmadi;
  return new Date(iso).toLocaleString();
}

export const ApiTokensSection: React.FC = () => {
  const { t } = useTranslation();
  const { data: tokenlar, isLoading } = useListApiTokensQuery();
  const [olustur, { isLoading: olusturuluyor }] = useCreateApiTokenMutation();
  const [iptalEt] = useRevokeApiTokenMutation();

  const [ad, setAd] = useState('');
  const [yeniToken, setYeniToken] = useState<OlusturulanToken | null>(null);
  const [kopyalandi, setKopyalandi] = useState(false);

  const handleOlustur = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!ad.trim() || olusturuluyor) return;
    try {
      const sonuc = await olustur(ad.trim()).unwrap();
      setYeniToken(sonuc);
      setAd('');
      setKopyalandi(false);
    } catch (error) {
      const mesaj =
        (error as { data?: { error?: { message?: string } } })?.data?.error?.message ??
        t('apiTokenCreateError');
      toast.error(mesaj);
    }
  };

  const handleKopyala = async () => {
    if (!yeniToken) return;
    try {
      await navigator.clipboard.writeText(yeniToken.token);
      setKopyalandi(true);
      toast.success(t('apiTokenCopied'));
    } catch {
      // Clipboard API guvenli olmayan baglamda (http) calismiyor - kullanici
      // metni elle secebilsin diye hata gostermek yerine yonlendiriyoruz.
      toast.error(t('apiTokenCopyFailed'));
    }
  };

  const handleIptal = async (id: string, tokenAdi: string) => {
    if (!window.confirm(t('apiTokenRevokeConfirm').replace('{name}', tokenAdi))) return;
    try {
      await iptalEt(id).unwrap();
      toast.success(t('apiTokenRevoked'));
    } catch {
      toast.error(t('apiTokenRevokeError'));
    }
  };

  return (
    <div className="space-y-6">
      <p className="text-sm text-muted-foreground">{t('apiTokensDesc')}</p>

      {/* Yeni uretilen anahtar: yalnizca bu ekranda gorunur. */}
      {yeniToken && (
        <div className="rounded-lg border border-amber-500/40 bg-amber-500/5 p-4">
          <div className="mb-2 flex items-start gap-2">
            <AlertTriangle className="mt-0.5 size-4 shrink-0 text-amber-600" />
            <div className="text-sm">
              <p className="font-medium text-foreground">{t('apiTokenOnceTitle')}</p>
              <p className="text-muted-foreground">{t('apiTokenOnceDesc')}</p>
            </div>
          </div>
          <div className="flex items-center gap-2">
            <code className="min-w-0 flex-1 overflow-x-auto rounded-md border border-border bg-background px-3 py-2 font-mono text-xs">
              {yeniToken.token}
            </code>
            <Button type="button" variant="outline" size="sm" onClick={handleKopyala}>
              {kopyalandi ? <Check className="size-3.5" /> : <Copy className="size-3.5" />}
            </Button>
          </div>
          <Button
            type="button"
            variant="ghost"
            size="sm"
            className="mt-2"
            onClick={() => setYeniToken(null)}
          >
            {t('apiTokenDismiss')}
          </Button>
        </div>
      )}

      <form onSubmit={handleOlustur} className="flex items-end gap-2">
        <div className="min-w-0 flex-1">
          <label htmlFor="token-adi" className="mb-1.5 block text-sm font-medium">
            {t('apiTokenNameLabel')}
          </label>
          <Input
            id="token-adi"
            value={ad}
            onChange={(e) => setAd(e.target.value)}
            placeholder={t('apiTokenNamePlaceholder')}
            maxLength={100}
          />
        </div>
        <Button type="submit" disabled={!ad.trim() || olusturuluyor}>
          <Plus className="size-4" /> {olusturuluyor ? t('apiTokenCreating') : t('apiTokenCreate')}
        </Button>
      </form>

      <div className="space-y-2">
        {isLoading && <p className="text-sm text-muted-foreground">{t('loading')}</p>}

        {!isLoading && (tokenlar?.length ?? 0) === 0 && (
          <div className="rounded-lg border border-dashed border-border p-6 text-center">
            <KeyRound className="mx-auto mb-2 size-5 text-muted-foreground" />
            <p className="text-sm text-muted-foreground">{t('apiTokenEmpty')}</p>
          </div>
        )}

        {tokenlar?.map((token) => (
          <div
            key={token.id}
            className="flex items-center gap-3 rounded-lg border border-border p-3"
          >
            <KeyRound className="size-4 shrink-0 text-muted-foreground" />
            <div className="min-w-0 flex-1">
              <p className="truncate text-sm font-medium">{token.name}</p>
              <p className="truncate text-xs text-muted-foreground">
                <code className="font-mono">{token.prefix}…</code>
                {' · '}
                {t('apiTokenLastUsed')}: {tarihYaz(token.lastUsedAt, t('apiTokenNeverUsed'))}
              </p>
            </div>
            <Button
              type="button"
              variant="ghost"
              size="sm"
              className="shrink-0 text-destructive hover:text-destructive"
              onClick={() => handleIptal(token.id, token.name)}
              title={t('apiTokenRevoke')}
            >
              <Trash2 className="size-3.5" />
            </Button>
          </div>
        ))}
      </div>
    </div>
  );
};
