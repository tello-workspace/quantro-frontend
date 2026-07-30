'use client';

import { useEffect, useState } from 'react';
import { useRouter } from 'next/navigation';
import { toast } from "sonner";
import { useGetMeQuery, useUpdateProfileMutation } from '@/features/auth/meApi';
import { useTestAiConfigurationMutation } from '@/features/ai/aiApi';
import { Card, CardContent, CardHeader, CardTitle, CardDescription } from '@/components/ui/card';
import { Input } from '@/components/ui/input';
import { Textarea } from '@/components/ui/textarea';
import { Label } from '@/components/ui/label';
import { Button } from '@/components/ui/button';
import { Skeleton } from '@/components/ui/skeleton';
import { TagInput } from '@/components/ui/TagInput';
import { Avatar, AvatarFallback } from '@/components/ui/avatar';
import { Tabs, TabsList, TabsTrigger, TabsContent } from '@/components/ui/tabs';
import { Eye, EyeOff, Sparkles, Cpu, CheckCircle2, AlertTriangle } from 'lucide-react';

const EXPERTISE_SUGGESTIONS = [
  'Backend', 'Frontend', 'Full Stack', 'DevOps', 'UI/UX', 'Mobil', 'QA/Test',
  'Veritabanı', 'Veri Bilimi', 'AI/ML', 'Güvenlik', 'Proje Yönetimi', 'Cloud',
];

const LANGUAGE_SUGGESTIONS = [
  'JavaScript', 'TypeScript', 'Python', 'Java', 'C#', 'Go', 'Rust', 'PHP',
  'Ruby', 'Swift', 'Kotlin', 'C++', 'SQL', 'HTML/CSS',
];

function initials(name: string) {
  return name
    .split(' ')
    .filter(Boolean)
    .slice(0, 2)
    .map((p) => p[0]?.toUpperCase())
    .join('');
}

export default function ProfilePage() {
  const { data: me, isLoading } = useGetMeQuery();
  const [updateProfile, { isLoading: isSaving }] = useUpdateProfileMutation();
  const [testAiConfig, { isLoading: isTesting }] = useTestAiConfigurationMutation();

  const router = useRouter();
  const [title, setTitle] = useState('');
  const [bio, setBio] = useState('');
  const [experience, setExperience] = useState('');
  const [githubUrl, setGithubUrl] = useState('');
  const [linkedinUrl, setLinkedinUrl] = useState('');
  const [expertiseAreas, setExpertiseAreas] = useState<string[]>([]);
  const [languages, setLanguages] = useState<string[]>([]);

  // AI Configuration States
  const [aiProvider, setAiProvider] = useState('openai');
  // Backend ham anahtari asla geri dondurmez (bkz. meApi.ts Me.hasAiApiKey) -
  // bu alan hep bos baslar, kullanici SADECE anahtari degistirmek istediginde
  // doldurur. Bos kalirsa save'de aiApiKey hic gonderilmez, mevcut kayit
  // korunur (backend tarafinda "undefined = dokunma" semantigi var).
  const [aiApiKey, setAiApiKey] = useState('');
  const [aiBaseUrl, setAiBaseUrl] = useState('');
  const [aiModel, setAiModel] = useState('');
  const [showApiKey, setShowApiKey] = useState(false);

  useEffect(() => {
    if (!me) return;
    setTitle(me.title ?? '');
    setBio(me.bio ?? '');
    setExperience(me.experience ?? '');
    setGithubUrl(me.githubUrl ?? '');
    setLinkedinUrl(me.linkedinUrl ?? '');
    setExpertiseAreas(me.expertiseAreas ?? []);
    setLanguages(me.languages ?? []);
    setAiProvider(me.aiProvider ?? 'openai');
    setAiBaseUrl(me.aiBaseUrl ?? '');
    setAiModel(me.aiModel ?? '');
  }, [me]);

  const handleSave = async () => {
    try {
      await updateProfile({
        title: title.trim() || null,
        bio: bio.trim() || null,
        experience: experience.trim() || null,
        githubUrl: githubUrl.trim() || null,
        linkedinUrl: linkedinUrl.trim() || null,
        expertiseAreas,
        languages,
        aiProvider: aiProvider || null,
        // Kullanici yeni bir anahtar yazmadiysa alani hic gondermiyoruz -
        // aksi halde her profil kaydinda mevcut anahtar null'a duserdi.
        ...(aiApiKey.trim() ? { aiApiKey: aiApiKey.trim() } : {}),
        aiBaseUrl: aiBaseUrl.trim() || null,
        aiModel: aiModel.trim() || null,
      }).unwrap();
      setAiApiKey('');
      toast.success('Profil ve AI yapılandırman güncellendi.');
      router.push('/projects');
    } catch (err) {
      const mesaj = (err as { data?: { error?: { message?: string } } })?.data?.error?.message;
      toast.error(mesaj || 'Profil güncellenemedi.');
    }
  };

  const handleRemoveApiKey = async () => {
    try {
      await updateProfile({ aiApiKey: null }).unwrap();
      setAiApiKey('');
      toast.success('Kayıtlı API anahtarı kaldırıldı.');
    } catch (err) {
      const mesaj = (err as { data?: { error?: { message?: string } } })?.data?.error?.message;
      toast.error(mesaj || 'Anahtar kaldırılamadı.');
    }
  };

  const handleTestConnection = async () => {
    if (!aiApiKey.trim()) {
      toast.error('Bağlantı testi için bir API Anahtarı girmelisiniz.');
      return;
    }
    try {
      const result = await testAiConfig({
        provider: aiProvider,
        apiKey: aiApiKey.trim(),
        baseUrl: aiBaseUrl.trim() || null,
        model: aiModel.trim() || null,
      }).unwrap();

      if (result.success) {
        toast.success(result.message || 'Bağlantı testi başarılı!');
      } else {
        toast.error('Bağlantı testi başarısız: ' + (result.message || 'Bilinmeyen hata'));
      }
    } catch (err) {
      const mesaj = (err as { data?: { error?: { message?: string } } })?.data?.error?.message;
      toast.error(mesaj || 'AI bağlantısı test edilirken hata oluştu.');
    }
  };

  if (isLoading || !me) {
    return (
      <main className="mx-auto max-w-3xl p-4 sm:p-6">
        <Skeleton className="mb-2 h-8 w-56" />
        <Skeleton className="h-64 w-full rounded-xl" />
      </main>
    );
  }

  return (
    <main className="mx-auto max-w-3xl p-4 sm:p-6">
      <div className="mb-6 flex items-center gap-4">
        <Avatar size="lg">
          <AvatarFallback>{initials(me.name)}</AvatarFallback>
        </Avatar>
        <div>
          <h1 className="text-lg font-bold text-foreground">{me.name}</h1>
          <p className="text-sm text-muted-foreground">{me.email}</p>
        </div>
      </div>

      <Tabs defaultValue="profile" className="w-full">
        <TabsList className="mb-6 grid w-full grid-cols-2">
          <TabsTrigger value="profile">Profil Bilgileri</TabsTrigger>
          <TabsTrigger value="ai" className="flex items-center gap-1.5">
            <Sparkles className="size-4 text-primary" /> AI Yapılandırması
          </TabsTrigger>
        </TabsList>

        <TabsContent value="profile">
          <Card>
            <CardHeader>
              <CardTitle>Profil Bilgileri</CardTitle>
              <CardDescription>
                Bu bilgiler proje panolarında AI&apos;ın görev atarken en uygun kişiyi
                önerebilmesi için kullanılır — uzmanlık alanların ve bildiğin diller ne kadar
                güncel olursa, &quot;AI ile Doldur&quot; ve otomatik atama önerileri o kadar isabetli olur.
              </CardDescription>
            </CardHeader>
            <CardContent className="flex flex-col gap-4">
              <div className="grid grid-cols-1 gap-4 sm:grid-cols-2">
                <div className="flex flex-col gap-1.5">
                  <Label htmlFor="title">Unvan / Rol</Label>
                  <Input
                    id="title"
                    value={title}
                    onChange={(e) => setTitle(e.target.value)}
                    placeholder="Örn: Senior Backend Developer"
                    maxLength={100}
                  />
                </div>
                <div className="flex flex-col gap-1.5">
                  <Label htmlFor="experience">Deneyim</Label>
                  <Input
                    id="experience"
                    value={experience}
                    onChange={(e) => setExperience(e.target.value)}
                    placeholder="Örn: 2 yıl 3 ay, 6 ay, Yeni başladım"
                    maxLength={50}
                  />
                </div>
              </div>

              <div className="flex flex-col gap-1.5">
                <Label htmlFor="bio">Kısa biyografi</Label>
                <Textarea
                  id="bio"
                  value={bio}
                  onChange={(e) => setBio(e.target.value)}
                  placeholder="Kendini kısaca tanıt..."
                  maxLength={1000}
                  rows={3}
                />
              </div>

              <div className="grid grid-cols-1 gap-4 sm:grid-cols-2">
                <div className="flex flex-col gap-1.5">
                  <Label htmlFor="githubUrl">GitHub linki</Label>
                  <Input
                    id="githubUrl"
                    value={githubUrl}
                    onChange={(e) => setGithubUrl(e.target.value)}
                    placeholder="https://github.com/kullanici-adi"
                  />
                </div>
                <div className="flex flex-col gap-1.5">
                  <Label htmlFor="linkedinUrl">LinkedIn linki</Label>
                  <Input
                    id="linkedinUrl"
                    value={linkedinUrl}
                    onChange={(e) => setLinkedinUrl(e.target.value)}
                    placeholder="https://linkedin.com/in/kullanici-adi"
                  />
                </div>
              </div>

              <div className="flex flex-col gap-1.5">
                <Label>Uzmanlık alanları</Label>
                <TagInput
                  value={expertiseAreas}
                  onChange={setExpertiseAreas}
                  suggestions={EXPERTISE_SUGGESTIONS}
                  placeholder="Örn: Backend, DevOps... (yazıp Enter'a bas)"
                />
              </div>

              <div className="flex flex-col gap-1.5">
                <Label>Bildiği diller</Label>
                <TagInput
                  value={languages}
                  onChange={setLanguages}
                  suggestions={LANGUAGE_SUGGESTIONS}
                  placeholder="Örn: TypeScript, Python... (yazıp Enter'a bas)"
                />
              </div>

              <div className="mt-2 flex justify-end">
                <Button onClick={handleSave} disabled={isSaving}>
                  {isSaving ? 'Kaydediliyor...' : 'Kaydet'}
                </Button>
              </div>
            </CardContent>
          </Card>
        </TabsContent>

        <TabsContent value="ai">
          <Card>
            <CardHeader>
              <CardTitle className="flex items-center gap-2">
                <Cpu className="size-5 text-primary" />
                Özel AI Yapılandırması (AI Configuration)
              </CardTitle>
              <CardDescription>
                Quantro AI özelliklerinde (akıllı chat, kart doldurma vb.) sitenin genel motoru yerine kendinize ait bir yapay zeka modelini ve API anahtarını kullanabilirsiniz.
              </CardDescription>
            </CardHeader>
            <CardContent className="flex flex-col gap-5">
              <div className="flex flex-col gap-2">
                <Label htmlFor="aiProvider">AI Sağlayıcı (Provider)</Label>
                <select
                  id="aiProvider"
                  value={aiProvider}
                  onChange={(e) => {
                    const prov = e.target.value;
                    setAiProvider(prov);
                    // Default values reset placeholders
                    if (prov === 'google-gemini') {
                      if (!aiModel) setAiModel('gemini-flash-latest');
                    } else if (prov === 'openai') {
                      if (!aiModel) setAiModel('gpt-4o-mini');
                    }
                  }}
                  className="flex h-10 w-full rounded-lg border border-input bg-background px-3 py-2 text-sm ring-offset-background outline-none transition-colors focus-visible:ring-2 focus-visible:ring-ring focus-visible:ring-offset-2 disabled:cursor-not-allowed disabled:opacity-50"
                >
                  <option value="openai">OpenAI API / Uyumlu Custom Endpoint</option>
                  <option value="google-gemini">Google Gemini API</option>
                </select>
              </div>

              <div className="flex flex-col gap-2">
                <Label htmlFor="aiApiKey">API Anahtarı (API Key)</Label>
                <div className="relative">
                  <Input
                    id="aiApiKey"
                    type={showApiKey ? 'text' : 'password'}
                    value={aiApiKey}
                    onChange={(e) => setAiApiKey(e.target.value)}
                    placeholder={
                      me?.hasAiApiKey
                        ? '•••••••••••• (değiştirmek için yeni bir anahtar gir)'
                        : aiProvider === 'google-gemini'
                          ? 'AIzaSy...'
                          : 'sk-...'
                    }
                    className="pr-10"
                  />
                  <button
                    type="button"
                    onClick={() => setShowApiKey(!showApiKey)}
                    className="absolute right-3 top-1/2 -translate-y-1/2 text-muted-foreground hover:text-foreground transition-colors"
                  >
                    {showApiKey ? <EyeOff className="size-4" /> : <Eye className="size-4" />}
                  </button>
                </div>
                <div className="flex items-center justify-between gap-2">
                  <p className="text-xs text-muted-foreground">
                    API anahtarınız şifreli olarak saklanır, kayıttan sonra tekrar görüntülenemez.
                  </p>
                  {me?.hasAiApiKey && (
                    <button
                      type="button"
                      onClick={handleRemoveApiKey}
                      className="shrink-0 text-xs text-destructive hover:underline"
                    >
                      Kayıtlı anahtarı kaldır
                    </button>
                  )}
                </div>
              </div>

              <div className="grid grid-cols-1 gap-4 sm:grid-cols-2">
                <div className="flex flex-col gap-2">
                  <Label htmlFor="aiBaseUrl">Özel Endpoint URL (Base URL)</Label>
                  <Input
                    id="aiBaseUrl"
                    value={aiBaseUrl}
                    onChange={(e) => setAiBaseUrl(e.target.value)}
                    placeholder={
                      aiProvider === 'google-gemini'
                        ? 'Varsayılan (Google API)'
                        : 'https://api.openai.com/v1 veya https://openrouter.ai/api/v1'
                    }
                  />
                  <p className="text-[11px] text-muted-foreground">
                    OpenRouter için: <code className="bg-muted px-1 rounded">https://openrouter.ai/api/v1</code> yazın. Boş bırakılırsa sağlayıcının varsayılan adresi kullanılır.
                  </p>
                </div>

                <div className="flex flex-col gap-2">
                  <Label htmlFor="aiModel">Model Adı (Model Name)</Label>
                  <Input
                    id="aiModel"
                    value={aiModel}
                    onChange={(e) => setAiModel(e.target.value)}
                    placeholder={
                      aiProvider === 'google-gemini'
                        ? 'gemini-flash-latest'
                        : 'gpt-4o-mini'
                    }
                  />
                  <p className="text-[11px] text-muted-foreground">
                    Kullanmak istediğiniz tam model kodunu girin.
                  </p>
                </div>
              </div>

              <div className="rounded-lg border border-yellow-500/20 bg-yellow-500/5 p-3 flex gap-3 text-xs text-amber-600 dark:text-amber-400">
                <AlertTriangle className="size-5 shrink-0" />
                <div>
                  <h4 className="font-semibold mb-0.5">Bilgilendirme</h4>
                  <p>
                    Kendi API anahtarınızı tanımladığınızda, Quantro chat paneli ve AI asistan
                    görevleri sizin hesabınız üzerinden ücretlendirilir. Test butonunu
                    kullanarak anahtarınızın geçerliliğini kontrol edebilirsiniz.
                  </p>
                </div>
              </div>

              <div className="mt-2 flex items-center justify-between gap-3 border-t pt-4">
                <Button
                  type="button"
                  variant="outline"
                  onClick={handleTestConnection}
                  disabled={isTesting}
                >
                  {isTesting ? 'Test Ediliyor...' : 'Bağlantıyı Test Et'}
                </Button>

                <Button onClick={handleSave} disabled={isSaving}>
                  {isSaving ? 'Kaydediliyor...' : 'Kaydet'}
                </Button>
              </div>
            </CardContent>
          </Card>
        </TabsContent>
      </Tabs>
    </main>
  );
}
