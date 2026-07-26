'use client';

import {
  useGetMyOrganizationsQuery,
  useAddMemberMutation,
  useGetOrganizationByIdQuery,
  useUpdateOrganizationMutation,
  useDeleteOrganizationMutation,
  useRemoveMemberMutation,
  useGetPendingInvitationsQuery,
  useCancelInvitationMutation,
} from '@/features/organizations/organizationsApi';
import { useGetMeQuery } from '@/features/auth/meApi';
import Link from 'next/link';
import { useState } from 'react';
import { toast } from 'react-toastify';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card';
import { Badge } from '@/components/ui/badge';

export default function ProjectsPage() {
  const { data: orgs, isLoading, error } = useGetMyOrganizationsQuery();
  const [showCreateOrg, setShowCreateOrg] = useState(false);
  const [orgName, setOrgName] = useState('');
  const [orgDesc, setOrgDesc] = useState('');

  if (isLoading) {
    return (
      <main className="max-w-4xl mx-auto p-6">
        <p className="text-muted-foreground">Yükleniyor...</p>
      </main>
    );
  }

  if (error) {
    return (
      <main className="max-w-4xl mx-auto p-6">
        <p className="text-destructive">Organizasyonlar yüklenirken hata oluştu.</p>
      </main>
    );
  }

  if (!orgs || orgs.length === 0) {
    return (
      <main className="max-w-4xl mx-auto p-6">
        <div className="text-center py-20">
          <h1 className="text-2xl font-bold text-foreground mb-4">Tello&apos;ya Hoş Geldin!</h1>
          <p className="text-muted-foreground mb-8">Başlamak için bir organizasyon oluştur.</p>

          {showCreateOrg ? (
            <form onSubmit={async (e) => {
              e.preventDefault();
              const token = localStorage.getItem('token');
              if (!token) return;

              try {
                const res = await fetch(`${process.env.NEXT_PUBLIC_API_URL}/organizations`, {
                  method: 'POST',
                  headers: {
                    'Content-Type': 'application/json',
                    Authorization: `Bearer ${token}`,
                  },
                  body: JSON.stringify({ name: orgName, description: orgDesc || undefined }),
                });

                if (res.ok) {
                  setOrgName('');
                  setOrgDesc('');
                  setShowCreateOrg(false);
                  window.location.reload();
                } else {
                  const data = await res.json();
                  alert(data?.error?.message || 'Oluşturulamadı');
                }
              } catch {
                alert('Bir hata oluştu');
              }
            }} className="max-w-md mx-auto space-y-4">
              <Input
                type="text"
                placeholder="Organizasyon adı"
                value={orgName}
                onChange={(e) => setOrgName(e.target.value)}
                required
              />
              <Input
                type="text"
                placeholder="Açıklama (opsiyonel)"
                value={orgDesc}
                onChange={(e) => setOrgDesc(e.target.value)}
              />
              <Button type="submit" className="w-full">Oluştur</Button>
              <Button type="button" variant="ghost" onClick={() => setShowCreateOrg(false)} className="w-full">
                İptal
              </Button>
            </form>
          ) : (
            <Button onClick={() => setShowCreateOrg(true)} size="lg">
              + Organizasyon Oluştur
            </Button>
          )}
        </div>
      </main>
    );
  }

  return (
    <main className="max-w-4xl mx-auto p-6">
      <OrgTabs orgs={orgs} />
    </main>
  );
}

function OrgTabs({ orgs }: { orgs: { id: string; name: string; projectCount: number; role: 'ADMIN' | 'MEMBER' }[] }) {
  const [activeOrgId, setActiveOrgId] = useState(orgs[0]?.id);
  const activeOrg = orgs.find((o) => o.id === activeOrgId) || orgs[0];

  const [showInvite, setShowInvite] = useState(false);
  const [inviteEmail, setInviteEmail] = useState('');
  const [inviteMsg, setInviteMsg] = useState('');
  const [addMember, { isLoading: isInviting }] = useAddMemberMutation();
  const [showSettings, setShowSettings] = useState(false);

  const handleInvite = async (e: React.FormEvent) => {
    e.preventDefault();
    setInviteMsg('');
    try {
      await addMember({ orgId: activeOrg.id, email: inviteEmail }).unwrap();
      toast.success('Davetiye gönderildi!');
      setInviteMsg('Davet edildi!');
      setInviteEmail('');
      setTimeout(() => setShowInvite(false), 1200);
    } catch (err: any) {
      const errData = err?.data?.error;
      setInviteMsg(typeof errData === 'string' ? errData : errData?.message || 'Davet edilemedi.');
    }
  };

  return (
    <>
      <div className="flex items-center justify-between mb-6">
        <div className="flex gap-2">
          {orgs.map((org) => (
            <Button
              key={org.id}
              variant={activeOrgId === org.id ? 'default' : 'ghost'}
              size="sm"
              onClick={() => setActiveOrgId(org.id)}
            >
              {org.name}
            </Button>
          ))}
        </div>

        <div className="flex gap-2">
          <Button variant="outline" size="sm" onClick={() => setShowInvite((v) => !v)}>
            + Üye Davet Et
          </Button>
          {activeOrg.role === 'ADMIN' && (
            <Button variant="outline" size="sm" onClick={() => setShowSettings((v) => !v)}>
              ⚙ Ayarlar
            </Button>
          )}
          <Link href={`/projects/new?orgId=${activeOrg.id}`}>
            <Button size="sm">+ Yeni Proje</Button>
          </Link>
        </div>
      </div>

      {showInvite && (
        <form onSubmit={handleInvite} className="mb-6 flex gap-2 items-start">
          <div className="flex-1">
            <Input
              type="email"
              placeholder="Davet edilecek kullanıcının email'i"
              value={inviteEmail}
              onChange={(e) => setInviteEmail(e.target.value)}
              required
            />
            {inviteMsg && <p className="mt-1 text-xs text-muted-foreground">{inviteMsg}</p>}
          </div>
          <Button type="submit" disabled={isInviting} size="sm">
            {isInviting ? '...' : 'Davet Et'}
          </Button>
        </form>
      )}
      {showSettings && <OrgSettingsPanel orgId={activeOrg.id} />}

      <ProjectList orgId={activeOrg.id} />
    </>
  );
}

function ProjectList({ orgId }: { orgId: string }) {
  const { data: projects, isLoading, error } = useGetProjectsQuery({ orgId });

  if (isLoading) return <p className="text-muted-foreground">Yükleniyor...</p>;
  if (error) return <p className="text-destructive">Projeler yüklenemedi.</p>;
  if (!projects || projects.length === 0) {
    return (
      <div className="text-center py-12">
        <p className="text-muted-foreground">Henüz proje yok. Üstteki &quot;+ Yeni Proje&quot; ile ilk projeni oluştur.</p>
      </div>
    );
  }

  return (
    <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
      {projects.map((project) => (
        <Link key={project.id} href={`/projects/${project.id}?orgId=${orgId}`}>
          <Card className="hover:shadow-md transition cursor-pointer">
            <CardHeader>
              <CardTitle>{project.name}</CardTitle>
              {project.description && <CardDescription>{project.description}</CardDescription>}
            </CardHeader>
            <CardContent>
              <Badge variant="secondary">{project._count?.columns ?? 0} sütun</Badge>
            </CardContent>
          </Card>
        </Link>
      ))}
    </div>
  );
}

function OrgSettingsPanel({ orgId }: { orgId: string }) {
  const { data: me } = useGetMeQuery();
  const { data: org } = useGetOrganizationByIdQuery({ orgId });

  const [editingName, setEditingName] = useState(false);
  const [name, setName] = useState('');
  const [msg, setMsg] = useState('');

  const [updateOrganization, { isLoading: isSaving }] = useUpdateOrganizationMutation();
  const [deleteOrganization, { isLoading: isDeleting }] = useDeleteOrganizationMutation();
  const [removeMember, { isLoading: isRemoving }] = useRemoveMemberMutation();
  const [cancelInvitation, { isLoading: isCancelling }] = useCancelInvitationMutation();
  const isAdmin = org?.myRole === 'ADMIN';
  const { data: pendingInvitations } = useGetPendingInvitationsQuery({ orgId }, { skip: !isAdmin });

  if (!org) return <p className="mb-6 text-sm text-muted-foreground">Yükleniyor...</p>;

  const isOwner = me?.id === org.ownerId;

  const handleCancelInvitation = async (invitationId: string) => {
    try {
      await cancelInvitation({ orgId, invitationId }).unwrap();
      toast.success('Davet geri alındı');
    } catch (err) {
      const errData = (err as { data?: { error?: { message?: string } | string } })?.data?.error;
      alert(typeof errData === 'string' ? errData : errData?.message || 'Davet geri alınamadı.');
    }
  };

  const startEditing = () => {
    setName(org.name);
    setEditingName(true);
  };

  const handleRename = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!name.trim()) return;
    try {
      await updateOrganization({ orgId, name: name.trim() }).unwrap();
      toast.success('Organizasyon güncellendi');
      setEditingName(false);
    } catch (err: any) {
      const errData = err?.data?.error;
      setMsg(typeof errData === 'string' ? errData : errData?.message || 'Güncellenemedi.');
    }
  };

  const handleDeleteOrg = async () => {
    if (!confirm('Bu organizasyonu silmek istediğine emin misin? Tüm projeler de silinecek. Bu işlem geri alınamaz.')) return;
    try {
      await deleteOrganization({ orgId }).unwrap();
      window.location.href = '/projects';
    } catch (err: any) {
      const errData = err?.data?.error;
      alert(typeof errData === 'string' ? errData : errData?.message || 'Silinemedi.');
    }
  };

  const handleRemoveMember = async (userId: string) => {
    if (!confirm('Bu üyeyi organizasyondan çıkarmak istediğine emin misin?')) return;
    try {
      await removeMember({ orgId, userId }).unwrap();
      toast.success('Üye çıkarıldı');
    } catch (err: any) {
      const errData = err?.data?.error;
      alert(typeof errData === 'string' ? errData : errData?.message || 'Çıkarılamadı.');
    }
  };

  return (
    <Card className="mb-6">
      <CardHeader>
        {editingName ? (
          <form onSubmit={handleRename} className="flex items-center gap-2">
            <Input
              type="text"
              value={name}
              onChange={(e) => setName(e.target.value)}
              className="max-w-xs"
              autoFocus
            />
            <Button type="submit" disabled={isSaving} size="sm">Kaydet</Button>
            <Button type="button" variant="ghost" onClick={() => setEditingName(false)} size="sm">İptal</Button>
          </form>
        ) : (
          <div className="flex items-center gap-2">
            <CardTitle>{org.name}</CardTitle>
            <Button variant="link" size="sm" onClick={startEditing}>Yeniden Adlandır</Button>
          </div>
        )}
        {msg && <p className="text-xs text-destructive mt-1">{msg}</p>}
      </CardHeader>

      <CardContent className="space-y-4">
        <div>
          <h4 className="text-sm font-medium mb-2">Üyeler</h4>
          <ul className="space-y-1">
            {org.members.map((m) => (
              <li key={m.userId} className="flex items-center justify-between text-sm">
                <span className="text-foreground">
                  {m.user.name} <span className="text-muted-foreground">({m.role === 'ADMIN' ? 'Admin' : 'Üye'})</span>
                </span>
                {isOwner && m.userId !== org.ownerId && (
                  <Button
                    variant="destructive"
                    size="xs"
                    disabled={isRemoving}
                    onClick={() => handleRemoveMember(m.userId)}
                  >
                    Çıkar
                  </Button>
                )}
              </li>
            ))}
          </ul>
        </div>

        {isAdmin && pendingInvitations && pendingInvitations.length > 0 && (
          <div>
            <h4 className="text-sm font-medium mb-2">Bekleyen Davetler</h4>
            <ul className="space-y-1">
              {pendingInvitations.map((inv) => (
                <li key={inv.id} className="flex items-center justify-between text-sm">
                  <span className="text-foreground">
                    {inv.invitedUser.name}{' '}
                    <span className="text-muted-foreground">({inv.invitedUser.email})</span>
                  </span>
                  <Button
                    variant="destructive"
                    size="xs"
                    disabled={isCancelling}
                    onClick={() => handleCancelInvitation(inv.id)}
                  >
                    Geri Al
                  </Button>
                </li>
              ))}
            </ul>
          </div>
        )}

        {isOwner && (
          <Button variant="destructive" size="sm" disabled={isDeleting} onClick={handleDeleteOrg}>
            Organizasyonu Sil
          </Button>
        )}
      </CardContent>
    </Card>
  );
}

import { useGetProjectsQuery } from '@/features/projects/projectsApi';
