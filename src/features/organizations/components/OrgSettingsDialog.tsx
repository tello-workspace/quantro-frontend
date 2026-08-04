'use client';

import React, { useState } from 'react';
import { Users, ShieldPlus, X, Plus } from 'lucide-react';
import { toast } from "sonner";
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
import { Popover, PopoverTrigger, PopoverContent } from '@/components/ui/popover';
import { useConfirm } from '@/hooks/useConfirm';
import { useTranslation } from '@/hooks/useTranslation';

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

const renderBadgeIcon = (icon: string | null, className: string = "size-4") => {
  if (!icon) return null;
  if (icon.startsWith('http') || icon.startsWith('data:')) {
    return <img src={icon} alt="Badge" className={`${className} object-contain rounded`} />;
  }
  return <span className={className.includes("size-9") ? "text-lg" : "text-xs"}>{icon}</span>;
};

export const OrgSettingsDialog: React.FC<OrgSettingsDialogProps> = ({ orgId, isAdmin, open, onOpenChange }) => {
  const { t } = useTranslation();
  const confirm = useConfirm();
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

  const handleFileChange = (e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0];
    if (!file) return;

    if (file.size > 200 * 1024) {
      toast.error("Görsel boyutu çok büyük (maksimum 200KB)");
      return;
    }

    const reader = new FileReader();
    reader.onload = (event) => {
      if (event.target?.result) {
        setBadgeIcon(event.target.result as string);
      }
    };
    reader.readAsDataURL(file);
  };

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
    const ok = await confirm({
      title: 'Rozeti Sil',
      description: `"${name}" rozetini silmek istediğinize emin misiniz?`,
      confirmText: 'Sil',
      cancelText: 'İptal',
      variant: 'destructive',
    });
    if (!ok) return;
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
    const ok = await confirm({
      title: 'Üyeyi Çıkar',
      description: `${userName} isimli üyeyi organizasyondan çıkarmak istediğinize emin misiniz?`,
      confirmText: 'Çıkar',
      cancelText: 'İptal',
      variant: 'destructive',
    });
    if (!ok) return;
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
              const isNameEmail = m.user.name.includes('@');
              const displayName = isNameEmail 
                ? m.user.name.split('@')[0].charAt(0).toUpperCase() + m.user.name.split('@')[0].slice(1) 
                : m.user.name;

              return (
                <li key={m.userId} className="flex items-center gap-3.5 rounded-xl border border-border/50 bg-card/65 p-3.5 hover:bg-card hover:border-border transition-all">
                  <Avatar className="h-10 w-10 shrink-0 shadow-sm border border-border/20">
                    <AvatarFallback className="text-sm font-semibold bg-secondary text-secondary-foreground">{initials(displayName)}</AvatarFallback>
                  </Avatar>
                  <div className="min-w-0 flex-1">
                    <div className="flex flex-wrap items-center gap-2">
                      <p className="text-sm font-semibold text-foreground tracking-tight">{displayName}</p>
                      {isOwner && <Badge variant="secondary" className="text-[10px] px-2 py-0 h-4 bg-muted hover:bg-muted text-muted-foreground font-semibold">Kurucu</Badge>}
                      {isAdmin && !isOwner ? (
                        <select
                          value={m.role}
                          onChange={(e) => handleRoleChange(m.userId, e.target.value as 'ADMIN' | 'MEMBER')}
                          className={`text-[10px] font-bold px-2 py-0.5 rounded-full transition-all cursor-pointer focus:outline-none h-4.5 border-0 shadow-sm ${
                            m.role === 'ADMIN'
                              ? 'bg-primary text-primary-foreground hover:bg-primary/90'
                              : 'bg-secondary text-secondary-foreground hover:bg-secondary/90'
                          }`}
                        >
                          <option value="MEMBER" className="bg-background text-foreground text-xs font-normal">{t('roleMember')}</option>
                          <option value="ADMIN" className="bg-background text-foreground text-xs font-normal">{t('roleAdmin')}</option>
                        </select>
                      ) : (
                        !isOwner && (
                          <Badge variant={m.role === 'ADMIN' ? 'default' : 'secondary'} className="text-[10px] px-2 py-0 h-4 font-semibold">
                            {m.role === 'ADMIN' ? 'Admin' : 'Üye'}
                          </Badge>
                        )
                      )}
                    </div>
                    {isNameEmail && <p className="text-[11px] text-muted-foreground/75 mt-0.5">{m.user.email}</p>}

                    {/* Rozetler ve Yönetim */}
                    <div className="flex flex-wrap items-center gap-1.5 mt-2">
                      {userBadges.map((b: any) => (
                        <span
                          key={b.id}
                          style={{ backgroundColor: b.color + '20', color: b.color, borderColor: b.color + '30' }}
                          className="inline-flex items-center gap-1 text-[11px] px-2.5 py-0.5 rounded-full border font-medium transition-all hover:scale-[1.02]"
                        >
                          {b.icon && renderBadgeIcon(b.icon)}
                          {b.name}
                          {isAdmin && (
                            <button
                              onClick={() => handleToggleBadge(m.userId, b.id, true)}
                              className="ml-1 hover:opacity-60 cursor-pointer"
                            >
                              <X className="size-2.5" />
                            </button>
                          )}
                        </span>
                      ))}

                      {isAdmin && (
                        <Popover>
                          <PopoverTrigger className="inline-flex items-center gap-1 text-[10px] px-2 py-0.5 rounded-full border border-dashed border-muted-foreground/30 text-muted-foreground hover:text-foreground hover:border-muted-foreground/60 transition-all cursor-pointer font-semibold h-[20px] bg-transparent">
                            <Plus className="size-2.5" /> Rozet Ekle
                          </PopoverTrigger>
                          <PopoverContent align="start" className="w-60 p-2 border border-border/85 bg-popover text-popover-foreground rounded-xl shadow-lg">
                            <div className="space-y-1.5">
                              <p className="text-[11px] font-semibold text-muted-foreground px-2 py-1">{t('toggleBadges')}</p>
                              <div className="max-h-48 overflow-y-auto no-scrollbar space-y-0.5">
                                {badges.map(b => {
                                  const isAssigned = userBadges.some((ub: any) => ub.id === b.id);
                                  return (
                                    <button
                                      key={b.id}
                                      onClick={() => handleToggleBadge(m.userId, b.id, isAssigned)}
                                      className={`w-full flex items-center justify-between gap-2 px-2.5 py-1.5 rounded-lg text-xs font-medium transition-colors text-left cursor-pointer ${
                                        isAssigned 
                                          ? 'bg-primary/10 text-primary hover:bg-primary/15' 
                                          : 'hover:bg-muted text-foreground'
                                      }`}
                                    >
                                      <div className="flex items-center gap-2 min-w-0">
                                        <span
                                          className="flex size-5 shrink-0 items-center justify-center rounded-md overflow-hidden"
                                          style={{ backgroundColor: b.color + '20' }}
                                        >
                                          {b.icon ? renderBadgeIcon(b.icon, "size-5") : '🏅'}
                                        </span>
                                        <span className="truncate">{b.name}</span>
                                      </div>
                                      {isAssigned && (
                                        <span className="size-1.5 rounded-full bg-primary shrink-0" />
                                      )}
                                    </button>
                                  );
                                })}
                                {badges.length === 0 && (
                                  <p className="text-xs text-muted-foreground text-center py-4">{t('noBadgesYetDot')}</p>
                                )}
                              </div>
                            </div>
                          </PopoverContent>
                        </Popover>
                      )}
                    </div>
                  </div>

                  {isAdmin && !isOwner && (
                    <button
                      onClick={() => handleRemoveMember(m.userId, m.user.name)}
                      className="shrink-0 size-8 flex items-center justify-center rounded-full text-muted-foreground/60 hover:text-destructive hover:bg-destructive/10 transition-all ml-2 cursor-pointer"
                      title={t('removeMemberFromOrg')}
                    >
                      <X className="size-4" />
                    </button>
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
                  <label className="block text-xs font-semibold text-muted-foreground mb-1">{t('badgeNameLabel')}</label>
                  <Input
                    className="h-9 text-sm"
                    placeholder={t('badgeNamePlaceholder')}
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
                  <label className="block text-xs font-semibold text-muted-foreground mb-1.5">{t('iconOptional')}</label>
                  <div className="flex flex-wrap gap-1.5 mb-2">
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
                  <div className="space-y-2">
                    <Input
                      className="h-9 text-xs"
                      placeholder={t('customImageUrlPlaceholder')}
                      value={badgeIcon.startsWith('http') ? badgeIcon : ''}
                      onChange={e => setBadgeIcon(e.target.value)}
                    />
                    <div className="flex items-center gap-2">
                      <span className="text-xs font-semibold text-muted-foreground">{t('orUploadImage')}</span>
                      <input
                        type="file"
                        accept="image/*"
                        onChange={handleFileChange}
                        className="text-xs file:mr-2 file:py-1 file:px-2 file:rounded-md file:border-0 file:text-xs file:font-semibold file:bg-primary/10 file:text-primary hover:file:bg-primary/20 cursor-pointer"
                      />
                    </div>
                    {badgeIcon && (badgeIcon.startsWith('http') || badgeIcon.startsWith('data:')) && (
                      <div className="flex items-center gap-2 p-2 rounded-lg border border-border bg-card">
                        <span className="text-xs font-semibold text-muted-foreground">{t('previewLabel')}</span>
                        <img src={badgeIcon} alt="Önizleme" className="size-6 object-contain rounded" />
                      </div>
                    )}
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
                <p className="text-sm text-muted-foreground">{t('noBadgesYet')}</p>
                <p className="text-xs text-muted-foreground/60 mt-1">{t('badgesAdminHint')}</p>
              </div>
            )}

            {badges.map(b => (
              <div key={b.id} className="rounded-xl border border-border bg-card p-4">
                <div className="flex items-center justify-between gap-3">
                  <div className="flex items-center gap-3 min-w-0">
                    <span
                      className="flex size-9 shrink-0 items-center justify-center rounded-lg text-lg overflow-hidden"
                      style={{ backgroundColor: b.color + '20' }}
                    >
                      {b.icon ? renderBadgeIcon(b.icon, "size-9") : '🏅'}
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
