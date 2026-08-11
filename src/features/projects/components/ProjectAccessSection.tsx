'use client';

import React, { useState } from 'react';
import { toast } from 'sonner';
import { Avatar, AvatarFallback } from '@/components/ui/avatar';
import { Button } from '@/components/ui/button';
import { UserMinus, Lock, Users, Globe } from 'lucide-react';
import {
  type ProjectVisibility,
  useGetProjectMembersQuery,
  useUpdateProjectVisibilityMutation,
  useAddProjectMemberMutation,
  useRemoveProjectMemberMutation,
} from '@/features/projects/projectsApi';
import { useTranslation, type TranslationKey } from '@/hooks/useTranslation';

interface OrgMemberOption {
  userId: string;
  user: { id: string; name: string; email: string };
}

interface ProjectAccessSectionProps {
  orgId: string;
  projectId: string;
  visibility: ProjectVisibility;
  orgMembers: OrgMemberOption[];
  canManage: boolean;
}

// Metinler degil ANAHTARLAR tutuluyor: dizi modul kapsaminda, t() ise
// hook - cevrilmis metin ancak render aninda cozulebilir.
const VISIBILITY_OPTIONS: {
  value: ProjectVisibility;
  labelKey: TranslationKey;
  descKey: TranslationKey;
  icon: React.ComponentType<{ className?: string }>;
}[] = [
  { value: 'ORG', labelKey: 'paVisOrg', descKey: 'paVisOrgDesc', icon: Globe },
  { value: 'TEAM', labelKey: 'paVisTeam', descKey: 'paVisTeamDesc', icon: Users },
  { value: 'PRIVATE', labelKey: 'paVisPrivate', descKey: 'paVisPrivateDesc', icon: Lock },
];

function initials(name: string): string {
  return name.split(' ').map((n) => n[0]).join('').toUpperCase();
}

export const ProjectAccessSection: React.FC<ProjectAccessSectionProps> = ({
  orgId,
  projectId,
  visibility,
  orgMembers,
  canManage,
}) => {
  const { t } = useTranslation();
  const { data: members = [] } = useGetProjectMembersQuery({ orgId, projectId });
  const [updateVisibility, { isLoading: isUpdatingVisibility }] = useUpdateProjectVisibilityMutation();
  const [addMember, { isLoading: isAdding }] = useAddProjectMemberMutation();
  const [removeMember] = useRemoveProjectMemberMutation();
  const [selectedUserId, setSelectedUserId] = useState('');

  const memberIds = new Set(members.map((m) => m.userId));
  const candidates = orgMembers.filter((m) => !memberIds.has(m.userId));

  const handleVisibilityChange = async (next: ProjectVisibility) => {
    try {
      await updateVisibility({ orgId, projectId, visibility: next }).unwrap();
      toast.success(t('paVisibilityUpdated'));
    } catch (err: any) {
      toast.error(err?.data?.error?.message || t('paVisibilityError'));
    }
  };

  const handleAdd = async () => {
    if (!selectedUserId) return;
    try {
      await addMember({ orgId, projectId, userId: selectedUserId }).unwrap();
      setSelectedUserId('');
    } catch (err: any) {
      toast.error(err?.data?.error?.message || t('paAddError'));
    }
  };

  const handleRemove = async (userId: string) => {
    try {
      await removeMember({ orgId, projectId, userId }).unwrap();
    } catch (err: any) {
      toast.error(err?.data?.error?.message || t('paRemoveError'));
    }
  };

  return (
    <div className="space-y-6">
      <div>
        <h3 className="text-sm font-semibold text-foreground mb-2">{t('paVisibility')}</h3>
        <div className="grid gap-2 sm:grid-cols-3">
          {VISIBILITY_OPTIONS.map((opt) => {
            const Icon = opt.icon;
            const active = visibility === opt.value;
            return (
              <button
                key={opt.value}
                type="button"
                disabled={!canManage || isUpdatingVisibility}
                onClick={() => handleVisibilityChange(opt.value)}
                className={`text-left rounded-xl border p-3 transition-colors disabled:opacity-60 disabled:cursor-not-allowed ${
                  active ? 'border-primary bg-primary/5' : 'border-border hover:bg-accent/40'
                }`}
              >
                <div className="flex items-center gap-1.5 text-sm font-medium text-foreground">
                  <Icon className="size-3.5" /> {t(opt.labelKey)}
                </div>
                <p className="mt-1 text-xs text-muted-foreground">{t(opt.descKey)}</p>
              </button>
            );
          })}
        </div>
      </div>

      {visibility !== 'ORG' && (
        <div>
          <h3 className="text-sm font-semibold text-foreground mb-2">{t('paPeopleWithAccess')}</h3>
          <p className="text-xs text-muted-foreground mb-3">
            {t('paPeopleHint')}
          </p>

          {canManage && (
            <div className="flex items-center gap-2 mb-3">
              <select
                value={selectedUserId}
                onChange={(e) => setSelectedUserId(e.target.value)}
                className="flex-1 text-sm rounded-lg border border-border bg-background px-2.5 py-1.5 focus:outline-none focus:ring-1 focus:ring-ring"
              >
                <option value="">{t('paSelectPerson')}</option>
                {candidates.map((m) => (
                  <option key={m.userId} value={m.userId}>
                    {m.user.name} ({m.user.email})
                  </option>
                ))}
              </select>
              <Button type="button" size="sm" onClick={handleAdd} disabled={!selectedUserId || isAdding}>
                {t('add')}
              </Button>
            </div>
          )}

          {members.length === 0 ? (
            <p className="text-sm text-muted-foreground">{t('paNobody')}</p>
          ) : (
            <ul className="space-y-1.5">
              {members.map((m) => (
                <li key={m.userId} className="flex items-center gap-2.5 rounded-lg border border-border/50 bg-card/40 px-3 py-2">
                  <Avatar className="h-7 w-7 shrink-0">
                    <AvatarFallback className="text-[11px]">{initials(m.user.name)}</AvatarFallback>
                  </Avatar>
                  <div className="min-w-0 flex-1">
                    <p className="text-sm text-foreground truncate">{m.user.name}</p>
                  </div>
                  {canManage && (
                    <Button type="button" variant="ghost" size="icon-sm" onClick={() => handleRemove(m.userId)} title={t('paRemoveAccess')}>
                      <UserMinus className="size-3.5" />
                    </Button>
                  )}
                </li>
              ))}
            </ul>
          )}
        </div>
      )}
    </div>
  );
};
