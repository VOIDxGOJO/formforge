'use client';

import { useState } from 'react';
import { useMutation, useQuery, useQueryClient } from '@tanstack/react-query';
import { UserPlus } from 'lucide-react';
import { apiFetch } from '@/lib/api';
import { useWorkspace } from '@/hooks/use-workspace';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Badge } from '@/components/ui/badge';
import { Skeleton } from '@/components/ui/skeleton';

type Member = {
  id: string;
  role: string;
  user: { id: string; name: string; email: string };
};

function initialsOf(name: string) {
  return name
    .split(' ')
    .map((n) => n[0])
    .slice(0, 2)
    .join('')
    .toUpperCase();
}

export default function SettingsPage() {
  const { workspaceId } = useWorkspace();
  const queryClient = useQueryClient();
  const [name, setName] = useState('');
  const [inviteEmail, setInviteEmail] = useState('');
  const [inviteRole, setInviteRole] = useState<'ADMIN' | 'MEMBER' | 'VIEWER'>('MEMBER');

  const workspace = useQuery({
    queryKey: ['workspace', workspaceId],
    enabled: !!workspaceId,
    queryFn: () => apiFetch<{ id: string; name: string }>(`/api/v1/workspaces/${workspaceId}`)
  });

  const members = useQuery({
    queryKey: ['members', workspaceId],
    enabled: !!workspaceId,
    queryFn: () => apiFetch<Member[]>(`/api/v1/workspaces/${workspaceId}/members`)
  });

  const updateName = useMutation({
    mutationFn: () =>
      apiFetch(`/api/v1/workspaces/${workspaceId}`, {
        method: 'PATCH',
        body: JSON.stringify({ name })
      }),
    onSuccess: () => queryClient.invalidateQueries({ queryKey: ['workspace', workspaceId] })
  });

  const invite = useMutation({
    mutationFn: () =>
      apiFetch(`/api/v1/workspaces/${workspaceId}/invite`, {
        method: 'POST',
        body: JSON.stringify({ email: inviteEmail, role: inviteRole })
      }),
    onSuccess: () => {
      setInviteEmail('');
      void queryClient.invalidateQueries({ queryKey: ['members', workspaceId] });
    }
  });

  if (workspace.isLoading)
    return (
      <div className="space-y-6">
        <Skeleton className="h-8 w-56" />
        <Skeleton className="h-32 w-full" />
        <Skeleton className="h-48 w-full" />
      </div>
    );

  return (
    <div className="max-w-2xl space-y-8">
      <div>
        <h1 className="text-3xl font-bold tracking-tight text-foreground">Workspace settings</h1>
        <p className="mt-1 text-sm text-muted-foreground">Manage your workspace name and team members</p>
      </div>

      <Card>
        <CardHeader>
          <CardTitle className="text-lg">General</CardTitle>
          <p className="text-sm text-muted-foreground">Update your workspace display name</p>
        </CardHeader>
        <CardContent>
          <div className="flex gap-2">
            <Input
              defaultValue={workspace.data?.name}
              onChange={(e) => setName(e.target.value)}
              placeholder="Workspace name"
            />
            <Button onClick={() => updateName.mutate()} disabled={!name}>
              Save
            </Button>
          </div>
        </CardContent>
      </Card>

      <Card>
        <CardHeader>
          <CardTitle className="text-lg">Team</CardTitle>
          <p className="text-sm text-muted-foreground">Invite people to collaborate in this workspace</p>
        </CardHeader>
        <CardContent className="space-y-5">
          <div className="flex gap-2">
            <Input
              placeholder="colleague@company.com"
              value={inviteEmail}
              onChange={(e) => setInviteEmail(e.target.value)}
            />
            <select
              aria-label="Role"
              value={inviteRole}
              onChange={(e) => setInviteRole(e.target.value as typeof inviteRole)}
              className="h-10 rounded-md border border-input bg-background px-3 text-sm"
            >
              <option value="ADMIN">Admin</option>
              <option value="MEMBER">Member</option>
              <option value="VIEWER">Viewer</option>
            </select>
            <Button onClick={() => invite.mutate()} disabled={!inviteEmail || invite.isPending}>
              <UserPlus className="mr-2 h-4 w-4" />
              Invite
            </Button>
          </div>

          <ul className="space-y-2">
            {members.data?.map((m) => (
              <li
                key={m.id}
                className="transition-smooth flex items-center justify-between rounded-lg border border-border px-3 py-2.5 hover:bg-secondary/40"
              >
                <div className="flex items-center gap-3">
                  <div className="flex h-8 w-8 shrink-0 items-center justify-center rounded-full bg-brand-100 text-xs font-bold text-brand-700">
                    {initialsOf(m.user.name)}
                  </div>
                  <div>
                    <p className="text-sm font-medium text-foreground">{m.user.name}</p>
                    <p className="text-xs text-muted-foreground">{m.user.email}</p>
                  </div>
                </div>
                <Badge variant={m.role === 'OWNER' ? 'default' : 'secondary'}>{m.role}</Badge>
              </li>
            ))}
          </ul>
        </CardContent>
      </Card>
    </div>
  );
}