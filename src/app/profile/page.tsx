'use client';

import { useEffect, useState } from 'react';
import { useRouter } from 'next/navigation';
import { toast } from 'react-toastify';
import { useGetMeQuery, useUpdateProfileMutation } from '@/features/auth/meApi';
import { Card, CardContent, CardHeader, CardTitle, CardDescription } from '@/components/ui/card';
import { Input } from '@/components/ui/input';
import { Textarea } from '@/components/ui/textarea';
import { Label } from '@/components/ui/label';
import { Button } from '@/components/ui/button';
import { Skeleton } from '@/components/ui/skeleton';
import { TagInput } from '@/components/ui/TagInput';
import { Avatar, AvatarFallback } from '@/components/ui/avatar';

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

  const router = useRouter();
  const [title, setTitle] = useState('');
  const [bio, setBio] = useState('');
  const [experience, setExperience] = useState('');
  const [githubUrl, setGithubUrl] = useState('');
  const [linkedinUrl, setLinkedinUrl] = useState('');
  const [expertiseAreas, setExpertiseAreas] = useState<string[]>([]);
  const [languages, setLanguages] = useState<string[]>([]);

  useEffect(() => {
    if (!me) return;
    setTitle(me.title ?? '');
    setBio(me.bio ?? '');
    setExperience(me.experience ?? '');
    setGithubUrl(me.githubUrl ?? '');
    setLinkedinUrl(me.linkedinUrl ?? '');
    setExpertiseAreas(me.expertiseAreas ?? []);
    setLanguages(me.languages ?? []);
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
      }).unwrap();
      toast.success('Profilin güncellendi.');
      router.push('/projects');
    } catch (err) {
      const mesaj = (err as { data?: { error?: { message?: string } } })?.data?.error?.message;
      toast.error(mesaj || 'Profil güncellenemedi.');
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

      <Card>
        <CardHeader>
          <CardTitle>Profil bilgileri</CardTitle>
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
    </main>
  );
}
