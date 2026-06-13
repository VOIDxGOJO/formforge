'use client';

import { useState } from 'react';
import { useMutation, useQuery, useQueryClient } from '@tanstack/react-query';
import { apiFetch } from '@/lib/api';
import { useWorkspace } from '@/hooks/use-workspace';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Skeleton } from '@/components/ui/skeleton';

type Member = {
  id: string;
  role: string;
  user: { id: string; name: string; email: string };
};

export default function SettingsPage() {
  const { workspaceId } = useWorkspace();
  const queryClient = useQueryClient();
  const [name, setName] = useState('');
  const [inviteEmail, setInviteEmail] = useState('');

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
        body: JSON.stringify({ email: inviteEmail, role: 'MEMBER' })
      }),
    onSuccess: () => {
      setInviteEmail('');
      void queryClient.invalidateQueries({ queryKey: ['members', workspaceId] });
    }
  });

  if (workspace.isLoading) return <Skeleton className="h-64" />;

  return (
    <div className="space-y-6">
      <h1 className="text-2xl font-semibold">Workspace settings</h1>
      <Card>
        <CardHeader>
          <CardTitle>General</CardTitle>
        </CardHeader>
        <CardContent className="flex gap-2">
          <Input
            defaultValue={workspace.data?.name}
            onChange={(e) => setName(e.target.value)}
            placeholder="Workspace name"
          />
          <Button onClick={() => updateName.mutate()} disabled={!name}>
            Save
          </Button>
        </CardContent>
      </Card>
      <Card>
        <CardHeader>
          <CardTitle>Team</CardTitle>
        </CardHeader>
        <CardContent className="space-y-4">
          <div className="flex gap-2">
            <Input
              placeholder="colleague@company.com"
              value={inviteEmail}
              onChange={(e) => setInviteEmail(e.target.value)}
            />
            <Button onClick={() => invite.mutate()} disabled={!inviteEmail}>
              Invite
            </Button>
          </div>
          <ul className="space-y-2">
            {members.data?.map((m) => (
              <li key={m.id} className="flex justify-between rounded border px-3 py-2 text-sm">
                <span>
                  {m.user.name} ({m.user.email})
                </span>
                <span className="text-muted-foreground">{m.role}</span>
              </li>
            ))}
          </ul>
        </CardContent>
      </Card>
    </div>
  );
}
