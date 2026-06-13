'use client';

import { useState } from 'react';
import { useParams } from 'next/navigation';
import { useMutation, useQuery, useQueryClient } from '@tanstack/react-query';
import { apiFetch } from '@/lib/api';
import { useWorkspace } from '@/hooks/use-workspace';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Skeleton } from '@/components/ui/skeleton';
import { ActionType } from '@formforge/types';

type Workflow = {
  id: string;
  name: string;
  isActive: boolean;
  steps: Array<{ actionType: ActionType; actionConfig: Record<string, string>; order: number }>;
};

export default function FormSettingsPage() {
  const { formId } = useParams<{ formId: string }>();
  const { workspaceId } = useWorkspace();
  const queryClient = useQueryClient();
  const [name, setName] = useState('New workflow');
  const [webhookUrl, setWebhookUrl] = useState('');
  const [emailTo, setEmailTo] = useState('');

  const { data, isLoading } = useQuery({
    queryKey: ['workflows', workspaceId, formId],
    enabled: !!workspaceId && !!formId,
    queryFn: () =>
      apiFetch<Workflow[]>(`/api/v1/workspaces/${workspaceId}/forms/${formId}/workflows`)
  });

  const createWorkflow = useMutation({
    mutationFn: (type: ActionType) =>
      apiFetch(`/api/v1/workspaces/${workspaceId}/forms/${formId}/workflows`, {
        method: 'POST',
        body: JSON.stringify({
          name,
          isActive: true,
          steps: [
            type === ActionType.WEBHOOK
              ? {
                  actionType: ActionType.WEBHOOK,
                  order: 0,
                  actionConfig: { url: webhookUrl, description: 'Webhook' }
                }
              : {
                  actionType: ActionType.SEND_EMAIL,
                  order: 0,
                  actionConfig: {
                    to: emailTo,
                    subject: 'New submission',
                    body: 'A new form submission was received.'
                  }
                }
          ]
        })
      }),
    onSuccess: () => void queryClient.invalidateQueries({ queryKey: ['workflows', workspaceId, formId] })
  });

  if (isLoading) return <Skeleton className="h-64" />;

  return (
    <div className="space-y-6">
      <h1 className="text-2xl font-semibold">Form workflows</h1>
      <Card>
        <CardHeader>
          <CardTitle>Create workflow</CardTitle>
        </CardHeader>
        <CardContent className="space-y-3">
          <Input placeholder="Workflow name" value={name} onChange={(e) => setName(e.target.value)} />
          <Input placeholder="Email to (for SEND_EMAIL)" value={emailTo} onChange={(e) => setEmailTo(e.target.value)} />
          <Input placeholder="Webhook URL" value={webhookUrl} onChange={(e) => setWebhookUrl(e.target.value)} />
          <div className="flex gap-2">
            <Button onClick={() => createWorkflow.mutate(ActionType.SEND_EMAIL)} disabled={!emailTo}>
              Add email workflow
            </Button>
            <Button variant="outline" onClick={() => createWorkflow.mutate(ActionType.WEBHOOK)} disabled={!webhookUrl}>
              Add webhook workflow
            </Button>
          </div>
        </CardContent>
      </Card>
      <div className="space-y-2">
        {data?.map((w) => (
          <Card key={w.id}>
            <CardContent className="flex items-center justify-between py-4">
              <div>
                <p className="font-medium">{w.name}</p>
                <p className="text-sm text-muted-foreground">{w.steps.length} step(s)</p>
              </div>
              <span className="text-sm">{w.isActive ? 'Active' : 'Inactive'}</span>
            </CardContent>
          </Card>
        ))}
      </div>
    </div>
  );
}
