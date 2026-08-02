'use client';

import React, { useEffect, useState } from 'react';
import Link from 'next/link';
import { useParams, useRouter, useSearchParams } from 'next/navigation';
import { ArrowLeft, Inbox, ListPlus, Rocket, Zap } from 'lucide-react';

import { Tabs, TabsContent, TabsList, TabsTrigger } from '@/components/ui/tabs';
import { boardService, type Column } from '@/features/board/services/boardService';
import { useGetOrganizationByIdQuery } from '@/features/organizations/organizationsApi';
import { useGetProjectByIdQuery } from '@/features/projects/projectsApi';
import { useGetLabelsQuery } from '@/features/labels/labelsApi';
import { useGetChangeRequestsQuery } from '@/features/requests/requestsApi';
import { useGetSprintsQuery } from '@/features/sprints/sprintsApi';
import { useGetCustomFieldsQuery } from '@/features/customFields/customFieldsApi';
import { SprintsSection } from '@/features/sprints/components/SprintsSection';
import { AutomationRulesSection } from '@/features/automations/components/AutomationRulesSection';
import { CustomFieldsSection } from '@/features/customFields/components/CustomFieldsSection';
import { ChangeRequestsSection } from '@/features/requests/components/ChangeRequestsDialog';
import { useTranslation } from '@/hooks/useTranslation';

type TabKey = 'sprints' | 'automations' | 'fields' | 'triage';

const TAB_KEYS: TabKey[] = ['sprints', 'automations', 'fields', 'triage'];

// Pano ust barinda yan yana duran Sprintler / Otomasyonlar / Ek Alanlar /
// Triage butonlari filtrelerle birlikte sikisiyordu. Hepsi bu sayfada tek
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
  const { data: sprints = [] } = useGetSprintsQuery({ orgId, projectId }, { skip: !orgId || !projectId });
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

  const tabParam = searchParams.get('tab') as TabKey | null;
  const requestedTab = tabParam && TAB_KEYS.includes(tabParam) ? tabParam : 'sprints';
  // Uye kullanici yalnizca Sprintler sekmesini gorur; admin'e ozel bir
  // sekmeye link ile gelirse sprintlere dusuruyoruz.
  const activeTab: TabKey = isAdmin || requestedTab === 'sprints' ? requestedTab : 'sprints';

  const handleTabChange = (value: TabKey) => {
    const next = new URLSearchParams(searchParams.toString());
    next.set('tab', value);
    router.replace(`/projects/${projectId}/manage?${next.toString()}`, { scroll: false });
  };

  const boardHref = `/projects/${projectId}${orgId ? `?orgId=${orgId}` : ''}`;

  return (
    <main className="min-h-[calc(100vh-56px)] bg-background px-4 py-6 sm:px-6">
      <div className="mx-auto max-w-5xl">
        <Link
          href={boardHref}
          className="inline-flex items-center gap-1.5 text-sm text-muted-foreground transition-colors hover:text-foreground"
        >
          <ArrowLeft className="size-4" /> Panoya dön
        </Link>

        <div className="mt-3 mb-6">
          <h1 className="text-2xl font-bold text-foreground">Proje Yönetimi</h1>
          <p className="mt-1 text-sm text-muted-foreground">
            {project?.name ? `${project.name} · ` : ''}
            Sprintler, otomasyonlar, ek alanlar ve talep triage&apos;ı tek yerde.
          </p>
        </div>

        <Tabs value={activeTab} onValueChange={(value) => handleTabChange(value as TabKey)}>
          <TabsList className="grid h-auto w-full grid-cols-2 sm:grid-cols-4">
            <TabsTrigger value="sprints" className="gap-1.5 py-1.5">
              <Rocket className="size-4" /> Sprintler
              {sprints.length > 0 && <CountBadge value={sprints.length} />}
            </TabsTrigger>
            {isAdmin && (
              <TabsTrigger value="automations" className="gap-1.5 py-1.5">
                <Zap className="size-4" /> {t('automations')}
              </TabsTrigger>
            )}
            {isAdmin && (
              <TabsTrigger value="fields" className="gap-1.5 py-1.5">
                <ListPlus className="size-4" /> Ek Alanlar
                {customFields.length > 0 && <CountBadge value={customFields.length} />}
              </TabsTrigger>
            )}
            {isAdmin && (
              <TabsTrigger value="triage" className="gap-1.5 py-1.5">
                <Inbox className="size-4" /> Triage
                {triagePendingCount > 0 && <CountBadge value={triagePendingCount} highlight />}
              </TabsTrigger>
            )}
          </TabsList>

          <TabsContent value="sprints" className="mt-5">
            <SectionShell
              title="Sprintler"
              description="Kartları zaman kutulu iterasyonlara ayırıp ilerlemeyi burndown ile takip et."
            >
              <SprintsSection orgId={orgId} projectId={projectId} isAdmin={!!isAdmin} />
            </SectionShell>
          </TabsContent>

          {isAdmin && (
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

          {isAdmin && (
            <TabsContent value="fields" className="mt-5">
              <SectionShell
                title="Ek Alanlar"
                description="Kartlara projene özel alanlar ekle (Jira'daki Custom Fields)."
              >
                <CustomFieldsSection orgId={orgId} projectId={projectId} />
              </SectionShell>
            </TabsContent>
          )}

          {isAdmin && (
            <TabsContent value="triage" className="mt-5">
              <SectionShell
                title="Triage: Yeni Kart Talepleri"
                description="Üyelerin bu projede önerdiği yeni kartlar. Önceliği/atananı/etiketleri düzenleyip onayla, panoya öyle girsin."
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
        </Tabs>
      </div>
    </main>
  );
}

function CountBadge({ value, highlight }: { value: number; highlight?: boolean }) {
  return (
    <span
      className={`inline-flex h-4 min-w-4 items-center justify-center rounded-full px-1 text-[10px] font-semibold ${
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
  return (
    <section className="rounded-2xl border border-border bg-card/40 p-4 sm:p-6">
      <h2 className="text-base font-semibold text-foreground">{title}</h2>
      <p className="mt-1 mb-4 text-sm text-muted-foreground">{description}</p>
      {children}
    </section>
  );
}
