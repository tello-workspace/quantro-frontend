'use client';

import React, { useState } from 'react';
import { toast } from 'sonner';
import { AlertTriangle, Check, Copy, GitBranch, Trash2 } from 'lucide-react';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import {
  useGetGithubLinkQuery,
  useCreateGithubLinkMutation,
  useUpdateGithubLinkMutation,
  useDeleteGithubLinkMutation,
  type CreatedGithubLink,
} from '@/features/projects/githubApi';

interface GithubLinkSectionProps {
  projectId: string;
  columns: { id: string; title: string }[];
}

/** Kolon eslemesi satiri: olay -> hedef sutun. */
const ESLEME_ALANLARI = [
  {
    alan: 'branchColumnId',
    baslik: 'Dala push yapıldığında',
    aciklama: 'Kart anahtarını içeren bir dala ilk push geldiğinde',
  },
  {
    alan: 'prOpenColumnId',
    baslik: 'PR açıldığında',
    aciklama: 'Pull request açıldığında, yeniden açıldığında veya taslaktan çıkarıldığında',
  },
  {
    alan: 'prMergedColumnId',
    baslik: 'PR merge edildiğinde',
    aciklama: 'Pull request birleştirildiğinde. Merge edilmeden kapanan PR kartı taşımaz.',
  },
] as const;

type EslemeAlani = (typeof ESLEME_ALANLARI)[number]['alan'];

export const GithubLinkSection: React.FC<GithubLinkSectionProps> = ({ projectId, columns }) => {
  const { data: link, isLoading } = useGetGithubLinkQuery({ projectId });
  const [createLink, { isLoading: creating }] = useCreateGithubLinkMutation();
  const [updateLink] = useUpdateGithubLinkMutation();
  const [deleteLink] = useDeleteGithubLinkMutation();

  const [owner, setOwner] = useState('');
  const [repo, setRepo] = useState('');
  // Secret sunucudan SADECE olusturulunca donuyor; sonrasinda bir daha
  // gosterilemez (WebhooksSection ve ApiTokensSection ile ayni sozlesme).
  const [yeniBaglanti, setYeniBaglanti] = useState<CreatedGithubLink | null>(null);
  const [kopyalanan, setKopyalanan] = useState<string | null>(null);

  const webhookUrl = link ? `${process.env.NEXT_PUBLIC_API_URL}/integrations/github/webhook/${link.id}` : '';

  const kopyala = async (metin: string, etiket: string) => {
    try {
      await navigator.clipboard.writeText(metin);
      setKopyalanan(etiket);
      toast.success(`${etiket} kopyalandı`);
    } catch {
      // Pano izni yoksa ya da sayfa guvenli baglamda degilse: kullaniciya
      // "kopyalandi" demek yerine ne yapmasi gerektigini soyluyoruz.
      toast.error('Kopyalanamadı, metni elle seçin');
    }
  };

  const handleCreate = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!owner.trim() || !repo.trim() || creating) return;
    try {
      const sonuc = await createLink({ projectId, owner: owner.trim(), repo: repo.trim() }).unwrap();
      setYeniBaglanti(sonuc);
      setOwner('');
      setRepo('');
    } catch (err: unknown) {
      const mesaj = (err as { data?: { error?: { message?: string } } })?.data?.error?.message;
      toast.error(mesaj || 'GitHub bağlantısı kurulamadı');
    }
  };

  const handleEsleme = async (alan: EslemeAlani, columnId: string) => {
    try {
      // Bos secim = eslemeyi kaldir. Backend null'i "temizle", undefined'i
      // "dokunma" olarak ayirt ediyor.
      await updateLink({ projectId, [alan]: columnId || null }).unwrap();
    } catch {
      toast.error('Eşleme kaydedilemedi');
    }
  };

  const handleDelete = async () => {
    if (!link) return;
    if (!window.confirm(`${link.owner}/${link.repo} bağlantısını kaldırmak istediğine emin misin?`)) return;
    try {
      await deleteLink({ projectId }).unwrap();
      toast.success('GitHub bağlantısı kaldırıldı');
    } catch {
      toast.error('Bağlantı kaldırılamadı');
    }
  };

  if (isLoading) return <p className="text-sm text-muted-foreground">Yükleniyor…</p>;

  // ─── Baglanti henuz kurulmamis ───────────────────────────────────────
  if (!link) {
    return (
      <div className="space-y-4">
        <p className="text-sm text-muted-foreground">
          Bir GitHub deposunu bu projeye bağla: dal adında, commit mesajında veya PR başlığında geçen kart
          anahtarı (örn. <code className="rounded bg-muted px-1 py-0.5 font-mono text-xs">QNT-42</code>) kartı
          kendiliğinden taşır.
        </p>

        <form onSubmit={handleCreate} className="space-y-3">
          <div className="grid gap-3 sm:grid-cols-2">
            <div>
              <label htmlFor="gh-owner" className="mb-1.5 block text-sm font-medium">
                Kullanıcı / organizasyon
              </label>
              <Input
                id="gh-owner"
                value={owner}
                onChange={(e) => setOwner(e.target.value)}
                placeholder="merto"
                maxLength={39}
              />
            </div>
            <div>
              <label htmlFor="gh-repo" className="mb-1.5 block text-sm font-medium">
                Depo adı
              </label>
              <Input
                id="gh-repo"
                value={repo}
                onChange={(e) => setRepo(e.target.value)}
                placeholder="quantro-backend"
                maxLength={100}
              />
            </div>
          </div>
          <Button type="submit" disabled={!owner.trim() || !repo.trim() || creating}>
            {creating ? 'Bağlanıyor…' : 'Depoyu bağla'}
          </Button>
        </form>
      </div>
    );
  }

  // ─── Baglanti kurulmus ───────────────────────────────────────────────
  return (
    <div className="space-y-6">
      {yeniBaglanti && (
        <div className="rounded-lg border border-amber-500/40 bg-amber-500/5 p-4">
          <div className="mb-3 flex items-start gap-2">
            <AlertTriangle className="mt-0.5 size-4 shrink-0 text-amber-600" />
            <div className="text-sm">
              <p className="font-medium text-foreground">Bu sır bir daha gösterilmeyecek</p>
              <p className="text-muted-foreground">
                GitHub&apos;da depo → Settings → Webhooks → Add webhook adımında aşağıdaki iki değeri gir.
                Content type <strong>application/json</strong> olmalı; olaylardan <strong>Pushes</strong> ve{' '}
                <strong>Pull requests</strong> seçilmeli.
              </p>
            </div>
          </div>

          <p className="mb-1 text-xs font-medium text-muted-foreground">Payload URL</p>
          <div className="mb-3 flex items-center gap-2">
            <code className="min-w-0 flex-1 overflow-x-auto rounded-md border border-border bg-background px-3 py-2 font-mono text-xs">
              {webhookUrl}
            </code>
            <Button type="button" variant="outline" size="sm" onClick={() => kopyala(webhookUrl, 'Adres')}>
              {kopyalanan === 'Adres' ? <Check className="size-3.5" /> : <Copy className="size-3.5" />}
            </Button>
          </div>

          <p className="mb-1 text-xs font-medium text-muted-foreground">Secret</p>
          <div className="flex items-center gap-2">
            <code className="min-w-0 flex-1 overflow-x-auto rounded-md border border-border bg-background px-3 py-2 font-mono text-xs">
              {yeniBaglanti.secret}
            </code>
            <Button type="button" variant="outline" size="sm" onClick={() => kopyala(yeniBaglanti.secret, 'Sır')}>
              {kopyalanan === 'Sır' ? <Check className="size-3.5" /> : <Copy className="size-3.5" />}
            </Button>
          </div>

          <Button type="button" variant="ghost" size="sm" className="mt-3" onClick={() => setYeniBaglanti(null)}>
            Kapat
          </Button>
        </div>
      )}

      <div className="flex items-center gap-3 rounded-lg border border-border p-3">
        <GitBranch className="size-4 shrink-0 text-muted-foreground" />
        <div className="min-w-0 flex-1">
          <p className="truncate text-sm font-medium">
            {link.owner}/{link.repo}
          </p>
          <p className="truncate text-xs text-muted-foreground">
            {link.isActive ? 'Olaylar dinleniyor' : 'Duraklatıldı — gelen olaylar yok sayılıyor'}
          </p>
        </div>
        <Button
          type="button"
          variant="ghost"
          size="sm"
          className="shrink-0"
          onClick={() => updateLink({ projectId, isActive: !link.isActive })}
          title={link.isActive ? 'Duraklat' : 'Devam ettir'}
        >
          {link.isActive ? 'Aktif' : 'Pasif'}
        </Button>
        <Button
          type="button"
          variant="ghost"
          size="sm"
          className="shrink-0 text-destructive hover:text-destructive"
          onClick={handleDelete}
          title="Bağlantıyı kaldır"
        >
          <Trash2 className="size-3.5" />
        </Button>
      </div>

      {!yeniBaglanti && (
        <div>
          <p className="mb-1 text-xs font-medium text-muted-foreground">Payload URL</p>
          <div className="flex items-center gap-2">
            <code className="min-w-0 flex-1 overflow-x-auto rounded-md border border-border bg-background px-3 py-2 font-mono text-xs">
              {webhookUrl}
            </code>
            <Button type="button" variant="outline" size="sm" onClick={() => kopyala(webhookUrl, 'Adres')}>
              {kopyalanan === 'Adres' ? <Check className="size-3.5" /> : <Copy className="size-3.5" />}
            </Button>
          </div>
          <p className="mt-1.5 text-xs text-muted-foreground">
            Sır kaybolduysa bağlantıyı kaldırıp yeniden kurman gerekir — mevcut sır bir daha gösterilemez.
          </p>
        </div>
      )}

      <div className="space-y-3">
        <div>
          <p className="text-sm font-medium">Kolon eşlemesi</p>
          <p className="text-xs text-muted-foreground">
            Boş bırakılan olayda kart taşınmaz; bağlantı yine de karta işlenir.
          </p>
        </div>

        {ESLEME_ALANLARI.map(({ alan, baslik, aciklama }) => (
          <div key={alan} className="rounded-lg border border-border p-3">
            <label htmlFor={`gh-${alan}`} className="block text-sm font-medium">
              {baslik}
            </label>
            <p className="mb-2 text-xs text-muted-foreground">{aciklama}</p>
            <select
              id={`gh-${alan}`}
              value={link[alan] ?? ''}
              onChange={(e) => handleEsleme(alan, e.target.value)}
              className="h-9 w-full rounded-md border border-border bg-background px-3 text-sm"
            >
              <option value="">— Taşıma yapma —</option>
              {columns.map((c) => (
                <option key={c.id} value={c.id}>
                  {c.title}
                </option>
              ))}
            </select>
          </div>
        ))}
      </div>
    </div>
  );
};
