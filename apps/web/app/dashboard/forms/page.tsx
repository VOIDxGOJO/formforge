'use client';

import Link from 'next/link';
import { useState } from 'react';
import { useMutation, useQuery, useQueryClient } from '@tanstack/react-query';
import { apiFetch } from '@/lib/api';
import { useWorkspace } from '@/hooks/use-workspace';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Skeleton } from '@/components/ui/skeleton';
import { Badge } from '@/components/ui/badge';
import { GenerateFormDialog } from '@/components/builder/GenerateFormDialog';

type FormItem = { id: string; name: string; slug: string; isActive: boolean };

export default function FormsPage() {
  const { workspaceId } = useWorkspace();
  const [q, setQ] = useState('');
  const [name, setName] = useState('');
  const queryClient = useQueryClient();

  const { data, isLoading, isError, refetch } = useQuery({
    queryKey: ['forms', workspaceId, q],
    enabled: !!workspaceId,
    queryFn: () =>
      apiFetch<FormItem[]>(
        `/api/v1/workspaces/${workspaceId}/forms?page=1&limit=50${q ? `&q=${encodeURIComponent(q)}` : ''}`
      )
  });

  const createForm = useMutation({
    mutationFn: () =>
      apiFetch<FormItem>(`/api/v1/workspaces/${workspaceId}/forms`, {
        method: 'POST',
        body: JSON.stringify({ name })
      }),
    onSuccess: () => {
      setName('');
      void queryClient.invalidateQueries({ queryKey: ['forms', workspaceId] });
    }
  });

  if (!workspaceId) return null;
  if (isLoading) return <Skeleton className="h-40" />;
  if (isError)
    return (
      <div>
        <p className="text-red-600">Failed to load forms.</p>
        <Button onClick={() => refetch()}>Retry</Button>
      </div>
    );

  return (
    <div className="space-y-6">
      <div className="flex items-center justify-between">
        <h1 className="text-2xl font-semibold">Forms</h1>
        <div className="flex gap-2">
          <Input placeholder="Search…" value={q} onChange={(e) => setQ(e.target.value)} />
          <Input placeholder="New form name" value={name} onChange={(e) => setName(e.target.value)} />
          <Button onClick={() => createForm.mutate()} disabled={!name || createForm.isPending}>
            Create
          </Button>
          <GenerateFormDialog workspaceId={workspaceId} />
        </div>
      </div>
      {!data?.length ? (
        <p className="text-muted-foreground">No forms yet. Create your first form.</p>
      ) : (
        <div className="grid gap-4 md:grid-cols-2 lg:grid-cols-3">
          {data.map((form) => (
            <Card key={form.id}>
              <CardHeader>
                <CardTitle className="text-lg">{form.name}</CardTitle>
              </CardHeader>
              <CardContent className="space-y-3">
                <Badge variant={form.isActive ? 'success' : 'secondary'}>
                  {form.isActive ? 'Active' : 'Inactive'}
                </Badge>
                <div className="flex flex-wrap gap-2">
                  <Button asChild size="sm" variant="outline">
                    <Link href={`/dashboard/forms/${form.id}/builder`}>Builder</Link>
                  </Button>
                  <Button asChild size="sm" variant="outline">
                    <Link href={`/dashboard/forms/${form.id}/responses`}>Responses</Link>
                  </Button>
                  <Button asChild size="sm" variant="outline">
                    <Link href={`/dashboard/forms/${form.id}/insights`}>Insights</Link>
                  </Button>
                  <Button asChild size="sm" variant="outline">
                    <Link href={`/dashboard/forms/${form.id}/settings`}>Settings</Link>
                  </Button>
                  <Button asChild size="sm" variant="ghost">
                    <Link href={`/f/${form.slug}`} target="_blank">
                      Public
                    </Link>
                  </Button>
                </div>
              </CardContent>
            </Card>
          ))}
        </div>
      )}
    </div>
  );
}
