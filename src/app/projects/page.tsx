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

export default function ProjectsPage() {
  const { data: orgs, isLoading, error } = useGetMyOrganizationsQuery();
  const [showCreateOrg, setShowCreateOrg] = useState(false);
  const [orgName, setOrgName] = useState('');
  const [orgDesc, setOrgDesc] = useState('');

  if (isLoading) {
    return (
      <main className="max-w-4xl mx-auto p-6">
        <p className="text-slate-500">Yükleniyor...</p>
      </main>
    );
  }

  if (error) {
    return (
      <main className="max-w-4xl mx-auto p-6">
        <p className="text-red-500">Organizasyonlar yüklenirken hata oluştu.</p>
      </main>
    );
  }

  // Hiç organizasyon yoksa onboarding göster
  if (!orgs || orgs.length === 0) {
    return (
      <main className="max-w-4xl mx-auto p-6">
        <div className="text-center py-20">
          <h1 className="text-2xl font-bold text-slate-800 mb-4">Tello&apos;ya Hoş Geldin!</h1>
          <p className="text-slate-500 mb-8">Başlamak için bir organizasyon oluştur.</p>

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
              <input
                type="text"
                placeholder="Organizasyon adı"
                value={orgName}
                onChange={(e) => setOrgName(e.target.value)}
                className="w-full px-4 py-2 border rounded-md focus:outline-none focus:ring focus:ring-indigo-200 text-slate-900"
                required
              />
              <input
                type="text"
                placeholder="Açıklama (opsiyonel)"
                value={orgDesc}
                onChange={(e) => setOrgDesc(e.target.value)}
                className="w-full px-4 py-2 border rounded-md focus:outline-none focus:ring focus:ring-indigo-200 text-slate-900"
              />
              <button
                type="submit"
                className="w-full py-2 bg-indigo-600 text-white rounded-md hover:bg-indigo-700"
              >
                Oluştur
              </button>
              <button
                type="button"
                onClick={() => setShowCreateOrg(false)}
                className="w-full py-2 text-slate-500 hover:text-slate-700"
              >
                İptal
              </button>
            </form>
          ) : (
            <button
              onClick={() => setShowCreateOrg(true)}
              className="px-6 py-3 bg-indigo-600 text-white rounded-md hover:bg-indigo-700"
            >
              + Organizasyon Oluştur
            </button>
          )}
        </div>
      </main>
    );
  }

  // Organizasyon varsa ilkinin projelerini göster
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
            <button
              key={org.id}
              onClick={() => setActiveOrgId(org.id)}
              className={`px-4 py-2 rounded-md text-sm font-medium transition ${
                activeOrgId === org.id
                  ? 'bg-indigo-100 text-indigo-700'
                  : 'text-slate-500 hover:bg-slate-100'
              }`}
            >
              {org.name}
            </button>
          ))}
        </div>

        <div className="flex gap-2">
          <button
            onClick={() => setShowInvite((v) => !v)}
            className="px-4 py-2 border border-indigo-600 text-indigo-600 rounded-md hover:bg-indigo-50 text-sm"
          >
            + Üye Davet Et
            
          </button>
                    {activeOrg.role === 'ADMIN' && (
            <button
              onClick={() => setShowSettings((v) => !v)}
              className="px-4 py-2 border border-slate-300 text-slate-600 rounded-md hover:bg-slate-50 text-sm"
            >
              ⚙ Ayarlar
            </button>
          )}


          <Link
            href={`/projects/new?orgId=${activeOrg.id}`}
            className="px-4 py-2 bg-indigo-600 text-white rounded-md hover:bg-indigo-700 text-sm"
          >
            + Yeni Proje
          </Link>
        </div>
      </div>

      {showInvite && (
        <form onSubmit={handleInvite} className="mb-6 flex gap-2 items-start">
          <div className="flex-1">
            <input
              type="email"
              placeholder="Davet edilecek kullanıcının email'i"
              value={inviteEmail}
              onChange={(e) => setInviteEmail(e.target.value)}
              className="w-full px-3 py-2 border rounded-md focus:outline-none focus:ring focus:ring-indigo-200 text-slate-900 text-sm"
              required
            />
            {inviteMsg && <p className="mt-1 text-xs text-slate-500">{inviteMsg}</p>}
          </div>
          <button
            type="submit"
            disabled={isInviting}
            className="px-4 py-2 bg-indigo-600 text-white rounded-md hover:bg-indigo-700 text-sm disabled:opacity-50"
          >
            {isInviting ? '...' : 'Davet Et'}
          </button>
        </form>
      )}
            {showSettings && <OrgSettingsPanel orgId={activeOrg.id} />}


      <ProjectList orgId={activeOrg.id} />
    </>
  );
}

function ProjectList({ orgId }: { orgId: string }) {
  const { data: projects, isLoading, error } = useGetProjectsQuery({ orgId });

  if (isLoading) return <p className="text-slate-500">Yükleniyor...</p>;
  if (error) return <p className="text-red-500">Projeler yüklenemedi.</p>;
  if (!projects || projects.length === 0) {
    return (
      <div className="text-center py-12">
        <p className="text-slate-500">Henüz proje yok. Üstteki &quot;+ Yeni Proje&quot; ile ilk projeni oluştur.</p>
      </div>
    );
  }

  return (
    <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
      {projects.map((project) => (
        <Link
          key={project.id}
          href={`/projects/${project.id}?orgId=${orgId}`}
          className="block p-5 bg-white rounded-lg shadow border border-gray-100 hover:shadow-md transition"
        >
          <h2 className="font-semibold text-slate-800">{project.name}</h2>
          <p className="text-sm text-slate-500 mt-1">{project.description}</p>
          <div className="mt-3 flex items-center gap-2 text-xs text-slate-400">
            <span>{project._count?.columns ?? 0} sütun</span>
          </div>
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

  if (!org) return <p className="mb-6 text-sm text-slate-500">Yükleniyor...</p>;

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
    <div className="mb-6 p-4 border border-slate-200 rounded-lg bg-slate-50">
      <div className="mb-4">
        {editingName ? (
          <form onSubmit={handleRename} className="flex items-center gap-2">
            <input
              type="text"
              value={name}
              onChange={(e) => setName(e.target.value)}
              className="px-3 py-1.5 border rounded-md text-sm text-slate-900"
              autoFocus
            />
            <button type="submit" disabled={isSaving} className="text-sm text-indigo-600 hover:underline">
              Kaydet
            </button>
            <button type="button" onClick={() => setEditingName(false)} className="text-sm text-slate-500 hover:underline">
              İptal
            </button>
          </form>
        ) : (
          <div className="flex items-center gap-2">
            <h3 className="font-semibold text-slate-800">{org.name}</h3>
            <button onClick={startEditing} className="text-xs text-indigo-600 hover:underline">
              Yeniden Adlandır
            </button>
          </div>
        )}
        {msg && <p className="text-xs text-red-500 mt-1">{msg}</p>}
      </div>

      <div className="mb-4">
        <h4 className="text-sm font-medium text-slate-600 mb-2">Üyeler</h4>
        <ul className="space-y-1">
          {org.members.map((m) => (
            <li key={m.userId} className="flex items-center justify-between text-sm">
              <span className="text-slate-700">
                {m.user.name} <span className="text-slate-400">({m.role === 'ADMIN' ? 'Admin' : 'Üye'})</span>
              </span>
              {isOwner && m.userId !== org.ownerId && (
                <button
                  onClick={() => handleRemoveMember(m.userId)}
                  disabled={isRemoving}
                  className="text-xs text-red-600 hover:underline disabled:opacity-50"
                >
                  Çıkar
                </button>
              )}
            </li>
          ))}
        </ul>
      </div>

      {isAdmin && pendingInvitations && pendingInvitations.length > 0 && (
        <div className="mb-4">
          <h4 className="text-sm font-medium text-slate-600 mb-2">Bekleyen Davetler</h4>
          <ul className="space-y-1">
            {pendingInvitations.map((inv) => (
              <li key={inv.id} className="flex items-center justify-between text-sm">
                <span className="text-slate-700">
                  {inv.invitedUser.name} <span className="text-slate-400">({inv.invitedUser.email})</span>
                </span>
                <button
                  onClick={() => handleCancelInvitation(inv.id)}
                  disabled={isCancelling}
                  className="text-xs text-red-600 hover:underline disabled:opacity-50"
                >
                  Geri Al
                </button>
              </li>
            ))}
          </ul>
        </div>
      )}

      {isOwner && (
        <button
          onClick={handleDeleteOrg}
          disabled={isDeleting}
          className="text-sm text-red-600 hover:underline disabled:opacity-50"
        >
          Organizasyonu Sil
        </button>
      )}
    </div>
  );
}


// Hook'u projenin kendi api'sinden import et
import { useGetProjectsQuery } from '@/features/projects/projectsApi';