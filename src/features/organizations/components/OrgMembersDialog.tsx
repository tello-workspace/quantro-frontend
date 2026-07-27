'use client';

import React from 'react';
import { Users } from 'lucide-react';
import { useGetOrganizationByIdQuery } from '@/features/organizations/organizationsApi';
import { useGetMeQuery } from '@/features/auth/meApi';
import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogHeader,
  DialogTitle,
} from '@/components/ui/dialog';
import { Avatar, AvatarFallback } from '@/components/ui/avatar';
import { Badge } from '@/components/ui/badge';
import { Skeleton } from '@/components/ui/skeleton';

interface OrgMembersDialogProps {
  orgId: string;
  open: boolean;
  onOpenChange: (open: boolean) => void;
}

function initials(name: string): string {
  return name
    .split(' ')
    .map((p) => p[0])
    .filter(Boolean)
    .slice(0, 2)
    .join('')
    .toUpperCase();
}

// Uye listesi tum organizasyon uyelerine acik (backend zaten herkese donuyor).
// Uyeyi cikarma/davet yonetimi gibi admin islemleri Ayarlar panelinde kaliyor.
export const OrgMembersDialog: React.FC<OrgMembersDialogProps> = ({ orgId, open, onOpenChange }) => {
  const { data: me } = useGetMeQuery();
  const { data: org, isLoading } = useGetOrganizationByIdQuery({ orgId }, { skip: !open || !orgId });

  const members = org?.members ?? [];

  return (
    <Dialog open={open} onOpenChange={onOpenChange}>
      <DialogContent className="sm:max-w-md w-full">
        <DialogHeader>
          <DialogTitle className="flex items-center gap-2">
            <Users className="h-4 w-4 text-primary" />
            Üyeler
          </DialogTitle>
          <DialogDescription>
            {org ? `${org.name} — ${members.length} kişi` : 'Organizasyon üyeleri'}
          </DialogDescription>
        </DialogHeader>

        {isLoading && (
          <div className="space-y-3">
            {[0, 1, 2].map((i) => (
              <div key={i} className="flex items-center gap-3">
                <Skeleton className="size-8 shrink-0 rounded-full" />
                <div className="flex-1 space-y-1.5">
                  <Skeleton className="h-3.5 w-28" />
                  <Skeleton className="h-3 w-40" />
                </div>
                <Skeleton className="h-5 w-14 rounded-full" />
              </div>
            ))}
          </div>
        )}

        {!isLoading && members.length === 0 && (
          <p className="text-sm text-muted-foreground">Bu organizasyonda üye yok.</p>
        )}

        <ul className="max-h-[60vh] space-y-2 overflow-y-auto">
          {members.map((m) => {
            const isOwner = m.userId === org?.ownerId;
            return (
              <li key={m.userId} className="flex items-center gap-3">
                <Avatar className="h-8 w-8 shrink-0">
                  <AvatarFallback className="text-xs">{initials(m.user.name)}</AvatarFallback>
                </Avatar>
                <div className="min-w-0 flex-1">
                  <p className="truncate text-sm font-medium text-foreground">
                    {m.user.name}
                    {m.userId === me?.id && (
                      <span className="ml-1 text-xs text-muted-foreground">(sen)</span>
                    )}
                  </p>
                  <p className="truncate text-xs text-muted-foreground">{m.user.email}</p>
                </div>
                <div className="flex shrink-0 gap-1">
                  {isOwner && <Badge variant="secondary">Kurucu</Badge>}
                  <Badge variant={m.role === 'ADMIN' ? 'default' : 'secondary'}>
                    {m.role === 'ADMIN' ? 'Admin' : 'Üye'}
                  </Badge>
                </div>
              </li>
            );
          })}
        </ul>
      </DialogContent>
    </Dialog>
  );
};
