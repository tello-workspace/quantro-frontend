'use client';

import React, { useEffect, useState } from 'react';
import Link from 'next/link';
import { useParams, useRouter, useSearchParams } from 'next/navigation';
import { ArrowLeft, Inbox, ListPlus, Zap, ShieldCheck } from 'lucide-react';

import { Tabs, TabsContent, TabsList, TabsTrigger } from '@/components/ui/tabs';
import { boardService, type Column } from '@/features/board/services/boardService';
import { useGetOrganizationByIdQuery } from '@/features/organizations/organizationsApi';
import { useGetProjectByIdQuery } from '@/features/projects/projectsApi';
import { ProjectAccessSection } from '@/features/projects/components/ProjectAccessSection';
import { useGetLabelsQuery } from '@/features/labels/labelsApi';
import { useGetChangeRequestsQuery } from '@/features/requests/requestsApi';
import { useGetCustomFieldsQuery } from '@/features/customFields/customFieldsApi';
import { AutomationRulesSection } from '@/features/automations/components/AutomationRulesSection';
import { CustomFieldsSection } from '@/features/customFields/components/CustomFieldsSection';
import { ChangeRequestsSection } from '@/features/requests/components/ChangeRequestsDialog';
import { useTranslation } from '@/hooks/useTranslation';

type TabKey = 'automations' | 'fields' | 'triage' | 'access';

const TAB_KEYS: TabKey[] = ['automations', 'fields', 'triage', 'access'];

// Gorunur sekme sayisina gore sekme barinin sutun duzeni. Dar ekranda
// hep en fazla iki sutun: dort sekme yan yana sigmiyor, yazilar kirpiliyordu.
const TAB_GRID: Record<number, string> = {
  1: 'grid-cols-1',
  2: 'grid-cols-2',
  3: 'grid-cols-2 sm:grid-cols-3',
  4: 'grid-cols-2 sm:grid-cols-4',
};

// Pano ust barinda yan yana duran Otomasyonlar / Ek Alanlar / Triage /
// Erisim butonlari filtrelerle birlikte sikisiyordu. Hepsi bu sayfada tek
// yerde toplandi; panoda tek bir "Yönetim" butonu kaldi. Aktif sekme ?tab
// ile URL'de tutuluyor ki panodan/sidebar'dan dogrudan link verilebilsin.
export default function ProjectManagePage() {
  const params = useParams();
  const router = useRouter();
  const searchParams = useSearchParams();
  const { t } = useTranslation();
  const projectId = params?.projectId as string;
  const orgId = searchParams.get('orgId') ?? '';

  const { data: project } = useGetProjectByIdQuery({ orgId, projectId }, { skip: !orgId });
  const { data: org } = useGetOrganizationByIdQuery({ orgId }, { skip: !orgId });
  const isAdmin = org?.myRole === 'ADMIN';
  const members = org?.members ?? [];

  const { data: labels = [] } = useGetLabelsQuery({ orgId, projectId }, { skip: !orgId || !projectId });
  const { data: customFields = [] } = useGetCustomFieldsQuery(
    { orgId, projectId },
    { skip: !orgId || !projectId || !isAdmin },
  );
  const { data: changeRequests = [] } = useGetChangeRequestsQuery({ orgId }, { skip: !orgId || !isAdmin });
  const triagePendingCount = changeRequests.filter(
    (r) => r.status === 'PENDING' && r.type === 'CARD_CREATE' && r.projectId === projectId,
  ).length;

  // Otomasyon kurallari sutun adlarini gostermek icin panodaki sutunlara
  // ihtiyac duyuyor; pano verisi RTK Query'de degil, boardService'te.
  const [columns, setColumns] = useState<Column[]>([]);
  useEffect(() => {
    if (!projectId) return;
    let iptal = false;
    boardService.getBoardData(projectId).then((data) => {
      if (!iptal && data) setColumns(Object.values(data.columns));
    });
    return () => {
      iptal = true;
    };
  }, [projectId]);

  // Uye kullanici yalnizca talep sekmesini gorur. Onceden butun sekmeler VE
  // butun sekme icerikleri isAdmin ile sarilıydı: uye "Yönetim"e (panoda
  // herkese acik bir buton) bastiginda basliktan sonrasi tamamen bos bir
  // sayfa geliyordu. Gorunur sekmeler tek yerden turetiliyor ki liste ile
  // icerik bir daha ayrisamasin.
  const visibleTabs: TabKey[] = isAdmin ? TAB_KEYS : ['triage'];

  const tabParam = searchParams.get('tab') as TabKey | null;
  const requestedTab = tabParam && TAB_KEYS.includes(tabParam) ? tabParam : visibleTabs[0];
  // Goremeyecegi bir sekmeye link ile gelirse gorebildigi ilkine dusuyor.
  const activeTab: TabKey = visibleTabs.includes(requestedTab) ? requestedTab : visibleTabs[0];

  const handleTabChange = (value: TabKey) => {
    const next = new URLSearchParams(searchParams.toString());
    next.set('tab', value);
    router.replace(`/projects/${projectId}/manage?${next.toString()}`, { scroll: false });
  };

  const boardHref = `/projects/${projectId}${orgId ? `?orgId=${orgId}` : ''}`;

  return (
    <main className="min-h-[calc(100vh-56px)] bg-background px-4 py-6 sm:px-6">
      <div className="mx-auto max-w-5xl">
        <div className="flex flex-wrap items-center gap-x-2 gap-y-1 text-sm text-muted-foreground">
          <Link
            href={`/projects${orgId ? `?orgId=${orgId}` : ''}`}
            className="transition-colors hover:text-foreground"
          >
            {org?.name ?? t('manageOrgFallback')}
          </Link>
          <span aria-hidden>/</span>
          <Link href={boardHref} className="inline-flex items-center gap-1.5 transition-colors hover:text-foreground">
            <ArrowLeft className="size-4" /> {project?.name ?? t('manageBackToBoard')}
          </Link>
        </div>

        <div className="mt-3 mb-6">
          <h1 className="text-2xl font-bold text-foreground">{t('projectManagement')}</h1>
          {/* Alt baslik "Sprintler"i sayiyordu ama sayfada sprint sekmesi yok;
              ozellik kaldirildiginda metin guncellenmemis. */}
          <p className="mt-1 text-sm text-muted-foreground">
            {project?.name ? `${project.name} · ` : ''}
            {t('manageSubtitle')}
          </p>
        </div>

        <Tabs value={activeTab} onValueChange={(value) => handleTabChange(value as TabKey)}>
          {/* Sutun sayisi sabit 4'tu: uyeye tek sekme dustugunde o sekme
              barin ceyregini kaplayip geri kalani bos kaliyordu. Sinif
              adlari statik - Tailwind uretilmis sinifi ancak kaynakta
              acikca goruyorsa cikti dosyasina koyuyor. */}
          <TabsList className={`grid h-auto w-full gap-1 p-1.5 ${TAB_GRID[visibleTabs.length] ?? 'grid-cols-2 sm:grid-cols-4'}`}>
            {visibleTabs.includes('automations') && (
              <TabsTrigger value="automations" className="h-11 gap-2 px-3">
                <Zap className="size-4" /> {t('automations')}
              </TabsTrigger>
            )}
            {visibleTabs.includes('fields') && (
              <TabsTrigger value="fields" className="h-11 gap-2 px-3">
                <ListPlus className="size-4" /> {t('customFieldsTab')}
                {customFields.length > 0 && <CountBadge value={customFields.length} />}
              </TabsTrigger>
            )}
            {visibleTabs.includes('triage') && (
              <TabsTrigger value="triage" className="h-11 gap-2 px-3">
                <Inbox className="size-4" /> {isAdmin ? t('triageTab') : t('myRequests')}
                {triagePendingCount > 0 && <CountBadge value={triagePendingCount} highlight />}
              </TabsTrigger>
            )}
            {visibleTabs.includes('access') && (
              <TabsTrigger value="access" className="h-11 gap-2 px-3">
                <ShieldCheck className="size-4" /> {t('accessTab')}
              </TabsTrigger>
            )}
          </TabsList>

          {visibleTabs.includes('automations') && (
            <TabsContent value="automations" className="mt-5">
              <SectionShell title={t('automationRules')} description={t('automationRulesDesc')}>
                <AutomationRulesSection
                  orgId={orgId}
                  projectId={projectId}
                  columns={columns.map((c) => ({ id: c.id, title: c.title }))}
                  labels={labels}
                  members={members}
                />
              </SectionShell>
            </TabsContent>
          )}

          {visibleTabs.includes('fields') && (
            <TabsContent value="fields" className="mt-5">
              <SectionShell
                title={t('customFieldsTab')}
                description={t('customFieldsDesc')}
              >
                <CustomFieldsSection orgId={orgId} projectId={projectId} />
              </SectionShell>
            </TabsContent>
          )}

          {visibleTabs.includes('triage') && (
            <TabsContent value="triage" className="mt-5">
              <SectionShell
                title={isAdmin ? t('triageTab') : t('myRequests')}
                description={isAdmin ? t('triageDesc') : t('myRequestsDesc')}
              >
                <ChangeRequestsSection
                  orgId={orgId}
                  isAdmin={isAdmin}
                  projectFilter={projectId}
                  typeFilter="CARD_CREATE"
                />
              </SectionShell>
            </TabsContent>
          )}

          {visibleTabs.includes('access') && (
            <TabsContent value="access" className="mt-5">
              <SectionShell
                title={t('accessTab')}
                description={t('accessDesc')}
              >
                {project && (
                  <ProjectAccessSection
                    orgId={orgId}
                    projectId={projectId}
                    visibility={project.visibility}
                    orgMembers={members}
                    canManage={isAdmin}
                  />
                )}
              </SectionShell>
            </TabsContent>
          )}
        </Tabs>
      </div>
    </main>
  );
}

function CountBadge({ value, highlight }: { value: number; highlight?: boolean }) {
  return (
    <span
      className={`inline-flex h-5 min-w-5 shrink-0 items-center justify-center rounded-full px-1.5 text-[11px] font-semibold tabular-nums ${
        highlight ? 'bg-primary text-primary-foreground' : 'bg-muted-foreground/15 text-muted-foreground'
      }`}
    >
      {value}
    </span>
  );
}

function SectionShell({
  title,
  description,
  children,
}: {
  title: string;
  description: string;
  children: React.ReactNode;
}) {
  // Baslik gorsel olarak gizli: hemen ustundeki secili sekme zaten ayni
  // kelimeyi yaziyordu ("Erişim" sekmesi -> "Erişim" basligi). Ekran
  // okuyucu icin bolumun adi yine de duruyor.
  return (
    <section aria-label={title} className="rounded-2xl border border-border bg-card/40 p-4 sm:p-6">
      <h2 className="sr-only">{title}</h2>
      <p className="mb-4 text-sm text-muted-foreground">{description}</p>
      {children}
    </section>
  );
}
