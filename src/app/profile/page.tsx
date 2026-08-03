'use client';

import { useEffect, useRef, useState } from 'react';
import { useRouter } from 'next/navigation';
import { toast } from "sonner";
import {
  useGetMeQuery,
  useUpdateProfileMutation,
  useUploadAvatarMutation,
  useSetPresetAvatarMutation,
  useRemoveAvatarMutation,
} from '@/features/auth/meApi';
import { useTestAiConfigurationMutation } from '@/features/ai/aiApi';
import { Card, CardContent, CardHeader, CardTitle, CardDescription } from '@/components/ui/card';
import { Alert, AlertTitle, AlertDescription } from '@/components/ui/alert';
import { Input } from '@/components/ui/input';
import { Textarea } from '@/components/ui/textarea';
import { Label } from '@/components/ui/label';
import { Button } from '@/components/ui/button';
import { MotionButton } from '@/components/ui/motion-button';
import { Skeleton } from '@/components/ui/skeleton';
import { TagInput } from '@/components/ui/TagInput';
import { Avatar, AvatarFallback, AvatarImage } from '@/components/ui/avatar';
import { Camera } from 'lucide-react';
import { Tabs, TabsList, TabsTrigger, TabsContent } from '@/components/ui/tabs';
import { Eye, EyeOff, Sparkles, Cpu, CheckCircle2, AlertTriangle } from 'lucide-react';
import { useTranslation } from '@/hooks/useTranslation';
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from '@/components/ui/select';

const EXPERTISE_SUGGESTIONS = [
  'Backend', 'Frontend', 'Full Stack', 'DevOps', 'UI/UX', 'Mobil', 'QA/Test',
  'Veritabanı', 'Veri Bilimi', 'AI/ML', 'Güvenlik', 'Proje Yönetimi', 'Cloud',
];

const LANGUAGE_SUGGESTIONS = [
  'JavaScript', 'TypeScript', 'Python', 'Java', 'C#', 'Go', 'Rust', 'PHP',
  'Ruby', 'Swift', 'Kotlin', 'C++', 'SQL', 'HTML/CSS',
];

// public/avatars/ altindaki hazir avatarlar. Backend'deki AVATAR_PRESETS
// beyaz listesiyle birebir ayni olmali - oradaki dogrulama bu isimlere bakiyor.
const AVATAR_PRESETS = ['nova', 'orbit', 'prism', 'pulse', 'ridge', 'flux', 'arc', 'quartz', 'slate'];

function initials(name: string) {
  return name
    .split(' ')
    .filter(Boolean)
    .slice(0, 2)
    .map((p) => p[0]?.toUpperCase())
    .join('');
}

export default function ProfilePage() {
  const { t } = useTranslation();
  const { data: me, isLoading } = useGetMeQuery();
  const [updateProfile, { isLoading: isSaving }] = useUpdateProfileMutation();
  const [testAiConfig, { isLoading: isTesting }] = useTestAiConfigurationMutation();
  const [uploadAvatar, { isLoading: isUploadingAvatar }] = useUploadAvatarMutation();
  const [setPresetAvatar, { isLoading: isSettingPreset }] = useSetPresetAvatarMutation();
  const [removeAvatar] = useRemoveAvatarMutation();
  const fileInputRef = useRef<HTMLInputElement>(null);

  const router = useRouter();
  const [title, setTitle] = useState('');
  const [bio, setBio] = useState('');
  const [experience, setExperience] = useState('');
  const [githubUrl, setGithubUrl] = useState('');
  const [linkedinUrl, setLinkedinUrl] = useState('');
  const [expertiseAreas, setExpertiseAreas] = useState<string[]>([]);
  const [languages, setLanguages] = useState<string[]>([]);
  const [language, setLanguage] = useState('tr');

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
    setLanguage(me.language ?? 'tr');
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
        language,
        aiProvider: aiProvider || null,
        // Kullanici yeni bir anahtar yazmadiysa alani hic gondermiyoruz -
        // aksi halde her profil kaydinda mevcut anahtar null'a duserdi.
        ...(aiApiKey.trim() ? { aiApiKey: aiApiKey.trim() } : {}),
        aiBaseUrl: aiBaseUrl.trim() || null,
        aiModel: aiModel.trim() || null,
      }).unwrap();
      setAiApiKey('');
      toast.success(t('profileSuccess'));
    } catch (err: any) {
      toast.error(err?.data?.error?.message || t('profileError'));
    }
  };

  const handleAvatarChange = async (e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0];
    e.target.value = ''; // ayni dosyayi tekrar secince onChange tekrar tetiklensin
    if (!file) return;

    if (file.size > 5 * 1024 * 1024) {
      toast.error(t('avatarTooLarge'));
      return;
    }

    try {
      await uploadAvatar(file).unwrap();
      toast.success(t('profileSuccess'));
    } catch (err) {
      const mesaj = (err as { data?: { error?: { message?: string } } })?.data?.error?.message;
      toast.error(mesaj || t('avatarUploadError'));
    }
  };

  const handlePresetSelect = async (preset: string) => {
    try {
      await setPresetAvatar(preset).unwrap();
      toast.success(t('profileSuccess'));
    } catch (err) {
      const mesaj = (err as { data?: { error?: { message?: string } } })?.data?.error?.message;
      toast.error(mesaj || t('avatarUploadError'));
    }
  };

  const handleRemoveAvatar = async () => {
    try {
      await removeAvatar().unwrap();
    } catch {
      toast.error(t('avatarRemoveError'));
    }
  };

  const handleRemoveApiKey = async () => {
    try {
      await updateProfile({ aiApiKey: null }).unwrap();
      setAiApiKey('');
      toast.success(t('aiApiKeyRemoved'));
    } catch (err) {
      const mesaj = (err as { data?: { error?: { message?: string } } })?.data?.error?.message;
      toast.error(mesaj || t('aiApiKeyRemoveError'));
    }
  };

  const handleTestConnection = async () => {
    if (!aiApiKey.trim()) {
      toast.error(t('aiTestPlaceholderRequire'));
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
        toast.success(result.message || t('aiTestSuccess'));
      } else {
        toast.error(t('aiTestError') + (result.message || 'Bilinmeyen hata'));
      }
    } catch (err) {
      const mesaj = (err as { data?: { error?: { message?: string } } })?.data?.error?.message;
      toast.error(mesaj || t('aiTestGenericError'));
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
        <div className="relative group/avatar-upload">
          <Avatar size="lg">
            {me.avatarUrl && <AvatarImage src={me.avatarUrl} alt={me.name} />}
            <AvatarFallback>{initials(me.name)}</AvatarFallback>
          </Avatar>
          <button
            type="button"
            onClick={() => fileInputRef.current?.click()}
            disabled={isUploadingAvatar}
            title={t('changeAvatar')}
            className="absolute inset-0 flex items-center justify-center rounded-full bg-black/50 text-white opacity-0 transition-opacity group-hover/avatar-upload:opacity-100 disabled:opacity-100"
          >
            {isUploadingAvatar ? (
              <span className="size-4 animate-spin rounded-full border-2 border-white border-t-transparent" />
            ) : (
              <Camera className="size-4" />
            )}
          </button>
          <input
            ref={fileInputRef}
            type="file"
            accept="image/png,image/jpeg,image/webp,image/gif"
            className="hidden"
            onChange={handleAvatarChange}
          />
        </div>
        <div>
          <h1 className="text-lg font-bold text-foreground">{me.name}</h1>
          <p className="text-sm text-muted-foreground">{me.email}</p>
          {me.avatarUrl && (
            <button
              type="button"
              onClick={handleRemoveAvatar}
              className="text-xs text-destructive hover:underline mt-0.5"
            >
              {t('removeAvatar')}
            </button>
          )}
        </div>
      </div>

      {/* Hazir avatarlar: fotograf yuklemek istemeyen ya da yukleyemeyen
          kullanicilar icin. Dosya degil, beyaz listedeki bir isim gonderilir. */}
      <div className="mb-6">
        <p className="mb-2 text-xs font-medium text-muted-foreground">{t('presetAvatars')}</p>
        <div className="flex flex-wrap gap-2">
          {AVATAR_PRESETS.map((preset) => {
            const src = `/avatars/${preset}.svg`;
            const isActive = me.avatarUrl === src;
            return (
              <button
                key={preset}
                type="button"
                onClick={() => handlePresetSelect(preset)}
                disabled={isSettingPreset || isActive}
                aria-pressed={isActive}
                aria-label={preset}
                className={`size-10 overflow-hidden rounded-full ring-offset-2 ring-offset-background transition-all hover:scale-105 disabled:hover:scale-100 ${
                  isActive ? 'ring-2 ring-primary' : 'ring-1 ring-border'
                }`}
              >
                {/* Statik, sabit boyutlu SVG - next/image'in optimizasyonundan
                    fayda gormez, o yuzden dogrudan img. */}
                {/* eslint-disable-next-line @next/next/no-img-element */}
                <img src={src} alt="" className="size-full" />
              </button>
            );
          })}
        </div>
      </div>

      <Tabs defaultValue="profile" className="w-full">
        <TabsList className="mb-6 grid w-full grid-cols-2">
          <TabsTrigger value="profile">{t('profileInfo')}</TabsTrigger>
          <TabsTrigger value="ai" className="flex items-center gap-1.5">
            <Sparkles className="size-4 text-primary" /> {t('aiSettings')}
          </TabsTrigger>
        </TabsList>

        <TabsContent value="profile">
          <Card>
            <CardHeader>
              <CardTitle>{t('profileInfo')}</CardTitle>
              <CardDescription>
                {t('profileDesc')}
              </CardDescription>
            </CardHeader>
            <CardContent className="flex flex-col gap-4">
              <div className="grid grid-cols-1 gap-4 sm:grid-cols-2">
                <div className="flex flex-col gap-1.5">
                  <Label htmlFor="title">{t('title')}</Label>
                  <Input
                    id="title"
                    value={title}
                    onChange={(e) => setTitle(e.target.value)}
                    placeholder={t('titlePlaceholder')}
                    maxLength={100}
                  />
                </div>
                <div className="flex flex-col gap-1.5">
                  <Label htmlFor="experience">{t('experience')}</Label>
                  <Input
                    id="experience"
                    value={experience}
                    onChange={(e) => setExperience(e.target.value)}
                    placeholder={t('experiencePlaceholder')}
                    maxLength={50}
                  />
                </div>
              </div>

              <div className="flex flex-col gap-1.5">
                <Label htmlFor="bio">{t('bio')}</Label>
                <Textarea
                  id="bio"
                  value={bio}
                  onChange={(e) => setBio(e.target.value)}
                  placeholder={t('bioPlaceholder')}
                  maxLength={1000}
                  rows={3}
                />
              </div>

              <div className="grid grid-cols-1 gap-4 sm:grid-cols-2">
                <div className="flex flex-col gap-1.5">
                  <Label htmlFor="githubUrl">{t('githubPlaceholder')}</Label>
                  <Input
                    id="githubUrl"
                    value={githubUrl}
                    onChange={(e) => setGithubUrl(e.target.value)}
                    placeholder="https://github.com/kullanici-adi"
                  />
                </div>
                <div className="flex flex-col gap-1.5">
                  <Label htmlFor="linkedinUrl">{t('linkedinPlaceholder')}</Label>
                  <Input
                    id="linkedinUrl"
                    value={linkedinUrl}
                    onChange={(e) => setLinkedinUrl(e.target.value)}
                    placeholder="https://linkedin.com/in/kullanici-adi"
                  />
                </div>
              </div>

              <div className="flex flex-col gap-1.5">
                <Label>{t('expertiseAreas')}</Label>
                <TagInput
                  value={expertiseAreas}
                  onChange={setExpertiseAreas}
                  suggestions={EXPERTISE_SUGGESTIONS}
                  placeholder={t('tagInputExpertisePlaceholder')}
                />
              </div>

              <div className="flex flex-col gap-1.5">
                <Label>{t('languages')}</Label>
                <TagInput
                  value={languages}
                  onChange={setLanguages}
                  suggestions={LANGUAGE_SUGGESTIONS}
                  placeholder={t('tagInputLanguagesPlaceholder')}
                />
              </div>
              <div className="flex flex-col gap-1.5">
                <Label>{t('languagePreference')}</Label>
                <Select value={language} onValueChange={(val) => { if (val) setLanguage(val); }}>
                  <SelectTrigger className="w-full h-10 border border-input rounded-lg px-3 bg-background text-sm flex items-center justify-between">
                    <SelectValue />
                  </SelectTrigger>
                  <SelectContent>
                    <SelectItem value="tr">Türkçe (Turkish)</SelectItem>
                    <SelectItem value="en">English (İngilizce)</SelectItem>
                  </SelectContent>
                </Select>
                <p className="text-xs text-muted-foreground">
                  {t('languagePreferenceDesc')}
                </p>
              </div>

              <div className="mt-2 flex justify-end">
                <MotionButton
                  whileHover={{ scale: 1.03 }}
                  whileTap={{ scale: 0.97 }}
                  onClick={handleSave}
                  disabled={isSaving}
                >
                  {isSaving ? t('saving') : t('save')}
                </MotionButton>
              </div>
            </CardContent>
          </Card>
        </TabsContent>

        <TabsContent value="ai">
          <Card>
            <CardHeader>
              <CardTitle className="flex items-center gap-2">
                <Cpu className="size-5 text-primary" />
                {t('aiSettings')}
              </CardTitle>
              <CardDescription>
                {t('aiSettingsDesc')}
              </CardDescription>
            </CardHeader>
            <CardContent className="flex flex-col gap-5">
              <div className="flex flex-col gap-2">
                <Label htmlFor="aiProvider">{t('aiProvider')}</Label>
                <Select
                  value={aiProvider}
                  onValueChange={(prov) => {
                    if (prov) {
                      setAiProvider(prov);
                      if (prov === 'google-gemini') {
                        if (!aiModel) setAiModel('gemini-flash-latest');
                      } else if (prov === 'openai') {
                        if (!aiModel) setAiModel('gpt-4o-mini');
                      }
                    }
                  }}
                >
                  <SelectTrigger className="w-full h-10 border border-input rounded-lg px-3 bg-background text-sm flex items-center justify-between">
                    <SelectValue />
                  </SelectTrigger>
                  <SelectContent>
                    <SelectItem value="openai">OpenAI API / Custom Endpoint</SelectItem>
                    <SelectItem value="google-gemini">Google Gemini API</SelectItem>
                  </SelectContent>
                </Select>
              </div>

              <div className="flex flex-col gap-2">
                <Label htmlFor="aiApiKey">{t('aiApiKey')}</Label>
                <div className="relative">
                  <Input
                    id="aiApiKey"
                    type={showApiKey ? 'text' : 'password'}
                    value={aiApiKey}
                    onChange={(e) => setAiApiKey(e.target.value)}
                    placeholder={
                      me?.hasAiApiKey
                        ? t('aiApiKeyPlaceholderExisting')
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
                    {t('aiApiKeyHelp')}
                  </p>
                  {me?.hasAiApiKey && (
                    <button
                      type="button"
                      onClick={handleRemoveApiKey}
                      className="shrink-0 text-xs text-destructive hover:underline"
                    >
                      {t('removeSavedApiKey')}
                    </button>
                  )}
                </div>
              </div>

              <div className="grid grid-cols-1 gap-4 sm:grid-cols-2">
                <div className="flex flex-col gap-2">
                  <Label htmlFor="aiBaseUrl">{t('customBaseUrl')}</Label>
                  <Input
                    id="aiBaseUrl"
                    value={aiBaseUrl}
                    onChange={(e) => setAiBaseUrl(e.target.value)}
                    placeholder={
                      aiProvider === 'google-gemini'
                        ? t('customBaseUrlDefaultGemini')
                        : t('customBaseUrlPlaceholder')
                    }
                  />
                  <p className="text-[11px] text-muted-foreground">
                    {t('customBaseUrlHelp')}
                  </p>
                </div>

                <div className="flex flex-col gap-2">
                  <Label htmlFor="aiModel">{t('aiModelLabel')}</Label>
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
                    {t('aiModelHelp')}
                  </p>
                </div>
              </div>

              <Alert variant="warning">
                <AlertTriangle />
                <AlertTitle>{t('aiInfoTitle')}</AlertTitle>
                <AlertDescription>{t('aiInfoDesc')}</AlertDescription>
              </Alert>

              <div className="mt-2 flex items-center justify-between gap-3 border-t pt-4">
                <Button
                  type="button"
                  variant="outline"
                  onClick={handleTestConnection}
                  disabled={isTesting}
                >
                  {isTesting ? t('aiTestingBtn') : t('aiTestBtn')}
                </Button>

                <MotionButton
                  whileHover={{ scale: 1.03 }}
                  whileTap={{ scale: 0.97 }}
                  onClick={handleSave}
                  disabled={isSaving}
                >
                  {isSaving ? t('saving') : t('save')}
                </MotionButton>
              </div>
            </CardContent>
          </Card>
        </TabsContent>
      </Tabs>
    </main>
  );
}
