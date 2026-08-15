'use client';

import {
  useGetMyOrganizationsQuery,
  useAddMemberMutation,
  type OrgRole,
} from '@/features/organizations/organizationsApi';
import Link from 'next/link';
import { useState, useEffect } from 'react';
import { useRouter, useSearchParams } from 'next/navigation';
import { toast } from "sonner";
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card';
import { Dialog, DialogContent, DialogTitle } from '@/components/ui/dialog';
import { MessagesSquare, Users, FolderPlus, ArrowUpRight, Plus, Settings, LayoutGrid, Inbox } from 'lucide-react';
import { ChangeRequestsDialog } from '@/features/requests/components/ChangeRequestsDialog';
import { useGetChangeRequestsQuery } from '@/features/requests/requestsApi';
import { Skeleton } from '@/components/ui/skeleton';
import { OrgChatPanel } from '@/features/chat/OrgChatPanel';
import { OrgMembersDialog } from '@/features/organizations/components/OrgMembersDialog';
import { OrgSettingsDialog } from '@/features/organizations/components/OrgSettingsDialog';
import { CreateOrganizationDialog } from '@/features/organizations/components/CreateOrganizationDialog';
import { Badge } from '@/components/ui/badge';
import { useTranslation } from '@/hooks/useTranslation';

export default function ProjectsPage() {
  const { t } = useTranslation();
  const { data: orgs, isLoading, error } = useGetMyOrganizationsQuery();
  const [showCreateOrg, setShowCreateOrg] = useState(false);

  if (isLoading) {
    return (
      <main className="mx-auto max-w-5xl p-4 sm:p-6">
        <Skeleton className="mb-2 h-8 w-56" />
        <Skeleton className="mb-8 h-4 w-72" />
        <div className="grid grid-cols-1 gap-4 sm:grid-cols-2">
          {[0, 1, 2, 3].map((i) => (
            <Skeleton key={i} className="h-36 rounded-xl" />
          ))}
        </div>
      </main>
    );
  }

  if (error) {
    return (
      <main className="mx-auto max-w-5xl p-4 sm:p-6">
        <div className="rounded-xl border border-destructive/30 bg-destructive/5 px-4 py-6 text-center">
          <p className="text-sm font-medium text-destructive">
            {t('orgLoadError')}
          </p>
          <p className="mt-1 text-xs text-muted-foreground">
            {t('orgLoadErrorDesc')}
          </p>
        </div>
      </main>
    );
  }

  if (!orgs || orgs.length === 0) {
    return (
      <main className="mx-auto max-w-5xl p-4 sm:p-6">
        <div className="py-16 text-center sm:py-20">
          <span className="mx-auto mb-6 flex size-14 items-center justify-center rounded-2xl bg-primary text-primary-foreground shadow-soft-md">
            <LayoutGrid className="size-7" />
          </span>
          <h1 className="mb-3 text-3xl font-bold tracking-tight text-foreground">
            {t('welcome')}
          </h1>
          <p className="mx-auto mb-8 max-w-md text-muted-foreground">
            {t('welcomeDesc')}
          </p>

          <Button onClick={() => setShowCreateOrg(true)} size="lg">
            <Plus className="size-4" /> {t('createOrg')}
          </Button>
        </div>

        <CreateOrganizationDialog open={showCreateOrg} onOpenChange={setShowCreateOrg} />
      </main>
    );
  }

  return (
    <main className="mx-auto max-w-5xl p-4 sm:p-6">
      <OrgTabs orgs={orgs} />
    </main>
  );
}

function OrgTabs({ orgs }: { orgs: { id: string; name: string; projectCount: number; role: OrgRole }[] }) {
  const { t } = useTranslation();
  const searchParams = useSearchParams();
  const router = useRouter();
  const [activeOrgId, setActiveOrgId] = useState(orgs[0]?.id);
  const activeOrg = orgs.find((o) => o.id === activeOrgId) || orgs[0];

  const [showInvite, setShowInvite] = useState(false);
  const [inviteEmail, setInviteEmail] = useState('');
  const [inviteMsg, setInviteMsg] = useState('');
  const [addMember, { isLoading: isInviting }] = useAddMemberMutation();
  const [showOrgSettings, setShowOrgSettings] = useState(false);
  const [showChat, setShowChat] = useState(false);
  const [showMembers, setShowMembers] = useState(false);
  const [showRequests, setShowRequests] = useState(false);
  const [showCreateOrg, setShowCreateOrg] = useState(false);

  // Secim URL'e de yaziliyor: yalnizca state'te tutuldugunda sayfa
  // yenilendiginde secim kaybolup listenin ilk organizasyonuna donuyordu.
  const selectOrg = (orgId: string) => {
    setActiveOrgId(orgId);
    router.replace(`/projects?orgId=${orgId}`, { scroll: false });
  };

  useEffect(() => {
    const queryOrgId = searchParams.get('orgId');
    if (queryOrgId && orgs.some((o) => o.id === queryOrgId)) {
      setActiveOrgId(queryOrgId);
    }
    if (searchParams.get('showRequests') === 'true') {
      setShowRequests(true);
    }
  }, [searchParams, orgs]);

  const isAdmin = activeOrg.role === 'ADMIN';
  // Bekleyen talep sayaci: admin icin is listesi, uye icin kendi takibi
  const { data: bekleyenTalepler = [] } = useGetChangeRequestsQuery(
    { orgId: activeOrg.id, status: 'PENDING' },
    { skip: !activeOrg.id },
  );

  const handleInvite = async (e: React.FormEvent) => {
    e.preventDefault();
    setInviteMsg('');
    try {
      await addMember({ orgId: activeOrg.id, email: inviteEmail }).unwrap();
      toast.success(t('inviteSuccess'));
      setInviteMsg(t('invited'));
      setInviteEmail('');
      setTimeout(() => setShowInvite(false), 1200);
    } catch (err: any) {
      const errData = err?.data?.error;
      setInviteMsg(typeof errData === 'string' ? errData : errData?.message || t('inviteError'));
    }
  };

  return (
    <>
      {/* Sayfa basligi: aktif organizasyon ve rol bir bakista gorunsun */}
      <div className="mb-6">
        <div className="flex flex-wrap items-center gap-2">
          <h1 className="text-2xl font-bold tracking-tight text-foreground">{activeOrg.name}</h1>
          <Badge variant={activeOrg.role === 'ADMIN' ? 'default' : 'secondary'}>
            {activeOrg.role === 'ADMIN' ? t('roleAdmin') : t('roleMember')}
          </Badge>
        </div>
        <p className="mt-1 text-sm text-muted-foreground">
          {t('orgDescription')}
        </p>
      </div>

      <div className="mb-6 flex flex-wrap items-center justify-between gap-3">
        {/* Organizasyon secimi + yeni olusturma. Serit onceden yalnizca
            orgs.length > 1 iken ciziliyordu; tek organizasyonu olan kullanici
            ikinci bir tane (orn. kendi kisisel calisma alani) acabilecegini
            hicbir yerden goremiyordu. */}
        <div className="flex items-center gap-1 rounded-xl border border-border bg-muted/50 p-1">
          {orgs.map((org) => (
            <button
              key={org.id}
              onClick={() => selectOrg(org.id)}
              className={`cursor-pointer rounded-lg px-3 py-1.5 text-sm font-medium transition-all duration-200 ${
                activeOrgId === org.id
                  ? 'bg-card text-foreground shadow-soft'
                  : 'text-muted-foreground hover:text-foreground'
              }`}
            >
              {org.name}
            </button>
          ))}
          <button
            type="button"
            onClick={() => setShowCreateOrg(true)}
            title={t('createOrg')}
            aria-label={t('createOrg')}
            className="cursor-pointer rounded-lg px-2 py-1.5 text-muted-foreground transition-colors hover:bg-card hover:text-foreground"
          >
            <Plus className="size-4" />
          </button>
        </div>

        <div className="ml-auto flex flex-wrap gap-2">
          <Button variant="outline" size="sm" className="cursor-pointer" onClick={() => setShowMembers(true)}>
            <Users className="size-3.5" />
            {t('members')}
          </Button>
          <Button variant="outline" size="sm" className="cursor-pointer" onClick={() => setShowChat(true)}>
            <MessagesSquare className="size-3.5" />
            {t('chat')}
          </Button>
          <Button variant="outline" size="sm" className="cursor-pointer" onClick={() => setShowRequests(true)}>
            <Inbox className="size-3.5" />
            {isAdmin ? t('requests') : t('myRequests')}
            {bekleyenTalepler.length > 0 && (
              <Badge variant={isAdmin ? 'default' : 'secondary'} className="ml-1 tabular-nums">
                {bekleyenTalepler.length}
              </Badge>
            )}
          </Button>
          {isAdmin && (
            <Button variant="outline" size="sm" className="cursor-pointer" onClick={() => setShowInvite((v) => !v)}>
              <Plus className="size-3.5" />
              {t('inviteMember')}
            </Button>
          )}
          {isAdmin && (
            <Button variant="outline" size="sm" className="cursor-pointer" onClick={() => setShowOrgSettings(true)}>
              <Settings className="size-3.5" />
              {t('settings')}
            </Button>
          )}
          {/* Proje olusturma admin'e ozel; uye talep akisini kullanir */}
          {isAdmin && (
            <Link href={`/projects/new?orgId=${activeOrg.id}`}>
              <Button size="sm" className="cursor-pointer">
                <Plus className="size-3.5" />
                {t('newProject')}
              </Button>
            </Link>
          )}
        </div>
      </div>

      {showInvite && (
        <form onSubmit={handleInvite} className="mb-6 flex gap-2 items-start">
          <div className="flex-1">
            <Input
              type="email"
              placeholder={t('invitePlaceholder')}
              value={inviteEmail}
              onChange={(e) => setInviteEmail(e.target.value)}
              required
            />
            {inviteMsg && <p className="mt-1 text-xs text-muted-foreground">{inviteMsg}</p>}
          </div>
          <Button type="submit" disabled={isInviting} size="sm">
            {isInviting ? '...' : t('inviteBtn')}
          </Button>
        </form>
      )}

      <ProjectList orgId={activeOrg.id} />

      <CreateOrganizationDialog open={showCreateOrg} onOpenChange={setShowCreateOrg} />

      <OrgMembersDialog orgId={activeOrg.id} open={showMembers} onOpenChange={setShowMembers} />

      <OrgSettingsDialog
        orgId={activeOrg.id}
        isAdmin={isAdmin}
        open={showOrgSettings}
        onOpenChange={setShowOrgSettings}
      />

      <ChangeRequestsDialog
        orgId={activeOrg.id}
        isAdmin={isAdmin}
        open={showRequests}
        onOpenChange={setShowRequests}
      />

      <Dialog open={showChat} onOpenChange={setShowChat}>
        <DialogContent className="sm:max-w-lg w-full p-0">
          <DialogTitle className="sr-only">{t('orgChat')}</DialogTitle>
          <div className="h-[70vh]">
            <OrgChatPanel orgId={activeOrg.id} orgName={activeOrg.name} />
          </div>
        </DialogContent>
      </Dialog>
    </>
  );
}

function ProjectList({ orgId }: { orgId: string }) {
  const { t } = useTranslation();
  const { data: projects, isLoading, error } = useGetProjectsQuery({ orgId });

  // Duz "Yukleniyor..." yazisi yerine iskelet: yukleme sirasinda sayfa
  // yuksekligi sabit kaliyor, icerik gelince zipla olmuyor
  if (isLoading) {
    return (
      <div className="grid grid-cols-1 gap-4 sm:grid-cols-2">
        {[0, 1, 2, 3].map((i) => (
          <Card key={i} className="p-5">
            <Skeleton className="mb-3 h-5 w-2/5" />
            <Skeleton className="mb-4 h-3.5 w-4/5" />
            <Skeleton className="h-5 w-20 rounded-full" />
          </Card>
        ))}
      </div>
    );
  }

  if (error) {
    return (
      <div className="rounded-xl border border-destructive/30 bg-destructive/5 px-4 py-6 text-center">
        <p className="text-sm font-medium text-destructive">{t('projectsLoadError')}</p>
        <p className="mt-1 text-xs text-muted-foreground">
          {t('networkRefreshDesc')}
        </p>
      </div>
    );
  }

  if (!projects || projects.length === 0) {
    return (
      <div className="flex flex-col items-center rounded-2xl border border-dashed border-border px-6 py-14 text-center">
        <span className="mb-4 flex size-12 items-center justify-center rounded-full bg-primary/10 text-primary">
          <FolderPlus className="size-6" />
        </span>
        <h3 className="text-base font-semibold text-foreground">{t('noProject')}</h3>
        <p className="mt-1 max-w-sm text-sm text-muted-foreground">
          {t('noProjectDesc')}
        </p>
      </div>
    );
  }

  return (
    <div className="grid grid-cols-1 gap-4 sm:grid-cols-2">
      {projects.map((project) => (
        <Link key={project.id} href={`/projects/${project.id}?orgId=${orgId}`} className="group">
          <Card className="h-full cursor-pointer border-border/70 shadow-soft transition-all duration-200 group-hover:-translate-y-0.5 group-hover:border-primary/50 group-hover:shadow-soft-md">
            <CardHeader>
              <div className="flex items-start justify-between gap-3">
                <CardTitle className="transition-colors group-hover:text-primary">
                  {project.name}
                </CardTitle>
                <ArrowUpRight className="size-4 shrink-0 text-muted-foreground opacity-0 transition-all duration-200 group-hover:translate-x-0.5 group-hover:opacity-100" />
              </div>
              {project.description ? (
                <CardDescription className="line-clamp-2">{project.description}</CardDescription>
              ) : (
                <CardDescription className="italic opacity-70">{t('noDescription')}</CardDescription>
              )}
            </CardHeader>
            <CardContent>
              <Badge variant="secondary" className="tabular-nums">
                {project._count?.columns ?? 0} {t('columnCount')}
              </Badge>
            </CardContent>
          </Card>
        </Link>
      ))}
    </div>
  );
}


import { useGetProjectsQuery } from '@/features/projects/projectsApi';
