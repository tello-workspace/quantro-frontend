'use client';

import React, { useState } from 'react';
import { Users, ShieldPlus, X, Plus } from 'lucide-react';
import { toast } from 'react-toastify';
import { useGetOrganizationByIdQuery } from '@/features/organizations/organizationsApi';
import {
  useListBadgesQuery,
  useCreateBadgeMutation,
  useDeleteBadgeMutation,
  useAssignBadgeMutation,
  useRemoveBadgeMutation,
  useUpdateMemberRoleMutation,
  useRemoveMemberMutation,
} from '@/features/organizations/organizationsApi';
import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogHeader,
  DialogTitle,
} from '@/components/ui/dialog';
import { Button } from '@/components/ui/button';
import { Badge } from '@/components/ui/badge';
import { Input } from '@/components/ui/input';
import { Skeleton } from '@/components/ui/skeleton';
import { Avatar, AvatarFallback } from '@/components/ui/avatar';

interface OrgSettingsDialogProps {
  orgId: string;
  isAdmin: boolean;
  open: boolean;
  onOpenChange: (open: boolean) => void;
}

const PILL_COLORS = [
  '#3B82F6', '#10B981', '#F59E0B', '#EF4444', '#8B5CF6',
  '#EC4899', '#14B8A6', '#F97316', '#6366F1', '#84CC16',
];

const EMOJIS = ['⚙️', '🎨', '🐳', '🎯', '📱', '🔒', '☁️', '🤖', '🧪', '📊', '🎮', '🛠️'];

function initials(name: string): string {
  return name.split(' ').map(n => n[0]).filter(Boolean).slice(0, 2).join('').toUpperCase();
}

export const OrgSettingsDialog: React.FC<OrgSettingsDialogProps> = ({ orgId, isAdmin, open, onOpenChange }) => {
  const { data: org, isLoading: orgLoading } = useGetOrganizationByIdQuery({ orgId }, { skip: !open || !orgId });
  const { data: badges = [], isLoading: badgesLoading } = useListBadgesQuery({ orgId }, { skip: !open || !orgId });
  const [createBadge, { isLoading: creating }] = useCreateBadgeMutation();
  const [deleteBadge] = useDeleteBadgeMutation();
  const [assignBadge] = useAssignBadgeMutation();
  const [removeBadge] = useRemoveBadgeMutation();
  const [updateMemberRole] = useUpdateMemberRoleMutation();
  const [removeMember] = useRemoveMemberMutation();

  const [activeTab, setActiveTab] = useState<'members' | 'badges'>('members');
  const [showNewBadgeForm, setShowNewBadgeForm] = useState(false);
  const [badgeName, setBadgeName] = useState('');
  const [badgeColor, setBadgeColor] = useState(PILL_COLORS[0]);
  const [badgeIcon, setBadgeIcon] = useState('');
  const [assigningTo, setAssigningTo] = useState<string | null>(null);

  const members = org?.members ?? [];

  // ─── Badge CRUD ──────────────────────────────────────────────────────

  const handleCreateBadge = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!badgeName.trim()) return;
    try {
      await createBadge({ orgId, name: badgeName.trim(), color: badgeColor, icon: badgeIcon || undefined }).unwrap();
      toast.success(`"${badgeName}" rozeti oluşturuldu`);
      setBadgeName('');
      setBadgeColor(PILL_COLORS[0]);
      setBadgeIcon('');
      setShowNewBadgeForm(false);
    } catch (err: any) {
      toast.error(err?.data?.error?.message || 'Rozet oluşturulamadı');
    }
  };

  const handleDeleteBadge = async (badgeId: string, name: string) => {
    if (!confirm(`"${name}" rozetini silmek istediğine emin misin?`)) return;
    try {
      await deleteBadge({ orgId, badgeId }).unwrap();
      toast.success(`"${name}" rozeti silindi`);
    } catch (err: any) {
      toast.error(err?.data?.error?.message || 'Rozet silinemedi');
    }
  };

  const handleToggleBadge = async (userId: string, badgeId: string, isAssigned: boolean) => {
    try {
      if (isAssigned) {
        await removeBadge({ orgId, badgeId, userId }).unwrap();
      } else {
        await assignBadge({ orgId, badgeId, userId }).unwrap();
      }
    } catch (err: any) {
      toast.error(err?.data?.error?.message || 'Rozet güncellenemedi');
    }
  };

  const handleRoleChange = async (userId: string, newRole: 'ADMIN' | 'MEMBER') => {
    try {
      await updateMemberRole({ orgId, userId, role: newRole }).unwrap();
      toast.success('Kullanıcı rolü güncellendi');
    } catch (err: any) {
      toast.error(err?.data?.error?.message || 'Rol güncellenemedi');
    }
  };

  const handleRemoveMember = async (userId: string, userName: string) => {
    if (!confirm(`${userName} isimli üyeyi organizasyondan çıkarmak istediğinize emin misiniz?`)) return;
    try {
      await removeMember({ orgId, userId }).unwrap();
      toast.success(`${userName} organizasyondan çıkarıldı`);
    } catch (err: any) {
      toast.error(err?.data?.error?.message || 'Üye çıkarılamadı');
    }
  };

  const getMemberBadges = (userId: string) => {
    const member = members.find(m => m.userId === userId);
    return (member?.user as any)?.badges?.map((ub: any) => ub.badge) ?? [];
  };

  return (
    <Dialog open={open} onOpenChange={onOpenChange}>
      <DialogContent className="sm:max-w-2xl w-full">
        <DialogHeader>
          <DialogTitle className="flex items-center gap-2">
            <ShieldPlus className="size-5 text-primary" />
            Ekip ve Roller
          </DialogTitle>
          <DialogDescription>
            {org ? `${org.name} — ${members.length} kişi` : 'Organizasyon yönetimi'}
          </DialogDescription>
        </DialogHeader>

        {/* Tab bar */}
        <div className="flex gap-1 border-b border-border mb-4">
          <button
            onClick={() => setActiveTab('members')}
            className={`px-4 py-2 text-sm font-medium transition-colors border-b-2 -mb-[1px] ${
              activeTab === 'members'
                ? 'border-primary text-foreground'
                : 'border-transparent text-muted-foreground hover:text-foreground'
            }`}
          >
            <Users className="size-3.5 inline mr-1.5" />
            Üyeler
          </button>
          <button
            onClick={() => setActiveTab('badges')}
            className={`px-4 py-2 text-sm font-medium transition-colors border-b-2 -mb-[1px] ${
              activeTab === 'badges'
                ? 'border-primary text-foreground'
                : 'border-transparent text-muted-foreground hover:text-foreground'
            }`}
          >
            <ShieldPlus className="size-3.5 inline mr-1.5" />
            Yetkinlikler
          </button>
        </div>

        {(orgLoading || badgesLoading) && (
          <div className="space-y-3">
            {[0, 1, 2].map(i => (
              <Skeleton key={i} className="h-16 rounded-xl" />
            ))}
          </div>
        )}

        {/* ─── TAB 1: ÜYELER ──────────────────────────────────── */}
        {activeTab === 'members' && !orgLoading && (
          <ul className="max-h-[55vh] space-y-2 overflow-y-auto no-scrollbar">
            {members.map(m => {
              const userBadges = getMemberBadges(m.userId);
              const isOwner = m.userId === org?.ownerId;
              return (
                <li key={m.userId} className="flex items-start gap-3 rounded-xl border border-border/60 bg-card p-4">
                  <Avatar className="h-10 w-10 shrink-0">
                    <AvatarFallback className="text-sm">{initials(m.user.name)}</AvatarFallback>
                  </Avatar>
                  <div className="min-w-0 flex-1">
                    <div className="flex flex-wrap items-center gap-1.5">
                      <p className="text-sm font-medium text-foreground">{m.user.name}</p>
                      {isOwner && <Badge variant="secondary" className="text-[10px]">Kurucu</Badge>}
                      {isAdmin && !isOwner ? (
                        <select
                          value={m.role}
                          onChange={(e) => handleRoleChange(m.userId, e.target.value as 'ADMIN' | 'MEMBER')}
                          className="text-[10px] font-semibold px-2 py-0.5 rounded border border-border bg-background text-foreground focus:outline-none focus:ring-1 focus:ring-primary cursor-pointer h-5 leading-none"
                        >
                          <option value="MEMBER">Üye</option>
                          <option value="ADMIN">Admin</option>
                        </select>
                      ) : (
                        <Badge variant={m.role === 'ADMIN' ? 'default' : 'secondary'} className="text-[10px]">
                          {m.role === 'ADMIN' ? 'Admin' : 'Üye'}
                        </Badge>
                      )}
                    </div>
                    <p className="text-xs text-muted-foreground mt-0.5">{m.user.email}</p>

                    {/* Rozetler */}
                    <div className="flex flex-wrap gap-1.5 mt-2">
                      {userBadges.map((b: any) => (
                        <span
                          key={b.id}
                          style={{ backgroundColor: b.color + '20', color: b.color, borderColor: b.color + '40' }}
                          className="inline-flex items-center gap-1 text-[11px] px-2 py-0.5 rounded-full border font-medium"
                        >
                          {b.icon && <span className="text-xs">{b.icon}</span>}
                          {b.name}
                          {isAdmin && (
                            <button
                              onClick={() => handleToggleBadge(m.userId, b.id, true)}
                              className="ml-0.5 hover:opacity-60"
                            >
                              <X className="size-2.5" />
                            </button>
                          )}
                        </span>
                      ))}
                    </div>

                    {/* Admin: rozet ata paneli */}
                    {isAdmin && (
                      <div className="mt-2">
                        {assigningTo === m.userId ? (
                          <div className="flex flex-wrap gap-1.5 mt-1">
                            {badges.filter(b => !userBadges.some((ub: any) => ub.id === b.id)).map(b => (
                              <button
                                key={b.id}
                                onClick={() => handleToggleBadge(m.userId, b.id, false)}
                                style={{ borderColor: b.color + '40', color: b.color }}
                                className="inline-flex items-center gap-1 text-[11px] px-2 py-0.5 rounded-full border hover:bg-muted transition-colors"
                              >
                                {b.icon && <span>{b.icon}</span>}
                                +{b.name}
                              </button>
                            ))}
                            {badges.filter(b => !userBadges.some((ub: any) => ub.id === b.id)).length === 0 && (
                              <span className="text-[11px] text-muted-foreground">Tüm rozetler atanmış</span>
                            )}
                            <button
                              onClick={() => setAssigningTo(null)}
                              className="text-[11px] text-muted-foreground hover:text-foreground ml-1"
                            >
                              Kapat
                            </button>
                          </div>
                        ) : (
                          <button
                            onClick={() => setAssigningTo(m.userId)}
                            className="text-[11px] text-primary hover:text-primary/80 font-medium mt-1"
                          >
                            + Rozet ata
                          </button>
                        )}
                      </div>
                    )}
                  </div>

                  {isAdmin && !isOwner && (
                    <Button
                      variant="ghost"
                      size="icon-sm"
                      onClick={() => handleRemoveMember(m.userId, m.user.name)}
                      className="shrink-0 text-muted-foreground hover:text-destructive self-center"
                      title="Üyeyi Organizasyondan Çıkar"
                    >
                      <X className="size-3.5" />
                    </Button>
                  )}
                </li>
              );
            })}
          </ul>
        )}

        {/* ─── TAB 2: YETKINLIKLER ────────────────────────────── */}
        {activeTab === 'badges' && !badgesLoading && (
          <div className="max-h-[55vh] overflow-y-auto no-scrollbar space-y-3">
            {/* Yeni rozet formu */}
            {showNewBadgeForm ? (
              <form onSubmit={handleCreateBadge} className="rounded-xl border border-border/80 bg-muted/20 p-4 space-y-3">
                <div>
                  <label className="block text-xs font-semibold text-muted-foreground mb-1">Rozet Adı</label>
                  <Input
                    className="h-9 text-sm"
                    placeholder="örn: Backend, Frontend, DevOps"
                    value={badgeName}
                    onChange={e => setBadgeName(e.target.value)}
                    autoFocus
                  />
                </div>

                <div>
                  <label className="block text-xs font-semibold text-muted-foreground mb-1.5">Renk</label>
                  <div className="flex flex-wrap gap-1.5">
                    {PILL_COLORS.map(c => (
                      <button
                        key={c}
                        type="button"
                        onClick={() => setBadgeColor(c)}
                        className={`size-7 rounded-full border-2 transition-all ${
                          badgeColor === c ? 'border-foreground scale-110' : 'border-transparent'
                        }`}
                        style={{ backgroundColor: c }}
                      />
                    ))}
                  </div>
                </div>

                <div>
                  <label className="block text-xs font-semibold text-muted-foreground mb-1.5">İkon (opsiyonel)</label>
                  <div className="flex flex-wrap gap-1.5">
                    <button
                      type="button"
                      onClick={() => setBadgeIcon('')}
                      className={`text-sm px-2 py-1 rounded border transition-all ${
                        !badgeIcon ? 'border-primary bg-primary/10' : 'border-border'
                      }`}
                    >
                      Yok
                    </button>
                    {EMOJIS.map(e => (
                      <button
                        key={e}
                        type="button"
                        onClick={() => setBadgeIcon(e)}
                        className={`text-sm px-2 py-1 rounded border transition-all ${
                          badgeIcon === e ? 'border-primary bg-primary/10 scale-110' : 'border-border'
                        }`}
                      >
                        {e}
                      </button>
                    ))}
                  </div>
                </div>

                <div className="flex justify-end gap-2 pt-1">
                  <Button type="button" variant="ghost" size="sm" onClick={() => setShowNewBadgeForm(false)}>
                    İptal
                  </Button>
                  <Button type="submit" size="sm" disabled={creating || !badgeName.trim()}>
                    {creating ? '...' : 'Oluştur'}
                  </Button>
                </div>
              </form>
            ) : (
              <Button
                variant="outline"
                size="sm"
                onClick={() => setShowNewBadgeForm(true)}
                className="w-full"
              >
                <Plus className="size-3.5 mr-1" />
                Yeni Rozet
              </Button>
            )}

            {/* Rozet listesi */}
            {badges.length === 0 && !showNewBadgeForm && (
              <div className="flex flex-col items-center py-8 text-center">
                <ShieldPlus className="size-8 text-muted-foreground/40 mb-2" />
                <p className="text-sm text-muted-foreground">Henüz rozet oluşturulmamış</p>
                <p className="text-xs text-muted-foreground/60 mt-1">Admin olarak yeni rozetler ekleyip üyelere atayabilirsin</p>
              </div>
            )}

            {badges.map(b => (
              <div key={b.id} className="rounded-xl border border-border bg-card p-4">
                <div className="flex items-center justify-between gap-3">
                  <div className="flex items-center gap-3 min-w-0">
                    <span
                      className="flex size-9 shrink-0 items-center justify-center rounded-lg text-lg"
                      style={{ backgroundColor: b.color + '20' }}
                    >
                      {b.icon || '🏅'}
                    </span>
                    <div>
                      <div className="flex items-center gap-1.5">
                        <span className="text-sm font-medium text-foreground">{b.name}</span>
                        <span
                          className="size-2.5 rounded-full shrink-0"
                          style={{ backgroundColor: b.color }}
                        />
                        <code className="text-[10px] text-muted-foreground font-mono">{b.color}</code>
                      </div>
                      <p className="text-[11px] text-muted-foreground mt-0.5">
                        {b.assignedUsers.length} kişide
                      </p>
                    </div>
                  </div>
                  {isAdmin && (
                    <Button
                      variant="ghost"
                      size="icon-sm"
                      onClick={() => handleDeleteBadge(b.id, b.name)}
                      className="shrink-0 text-muted-foreground hover:text-destructive"
                    >
                      <X className="size-3.5" />
                    </Button>
                  )}
                </div>

                {b.assignedUsers.length > 0 && (
                  <div className="flex flex-wrap gap-1.5 mt-2.5 pt-2.5 border-t border-border/60">
                    {b.assignedUsers.map((u: any) => (
                      <Badge key={u.id} variant="secondary" className="text-[10px]">
                        {u.name}
                      </Badge>
                    ))}
                  </div>
                )}
              </div>
            ))}
          </div>
        )}

        {!isAdmin && (
          <p className="text-xs text-muted-foreground text-center pt-2 border-t border-border/40">
            Üye listesi ve yetkinlikleri görüntüleyebilirsin. Değişiklik yapmak için admin yetkisi gerekir.
          </p>
        )}
      </DialogContent>
    </Dialog>
  );
};
