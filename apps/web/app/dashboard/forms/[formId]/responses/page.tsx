'use client';

import { useState } from 'react';
import { useParams } from 'next/navigation';
import { useQuery } from '@tanstack/react-query';
import { apiFetch } from '@/lib/api';
import { useWorkspace } from '@/hooks/use-workspace';
import { SubmissionTable } from '@/components/inbox/SubmissionTable';
import { SubmissionDetailDrawer } from '@/components/inbox/SubmissionDetailDrawer';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Skeleton } from '@/components/ui/skeleton';

type Submission = {
  id: string;
  submittedAt: string;
  responses: Record<string, unknown>;
};

export default function ResponsesPage() {
  const { formId } = useParams<{ formId: string }>();
  const { workspaceId } = useWorkspace();
  const [selectedId, setSelectedId] = useState<string | null>(null);
  const [startDate, setStartDate] = useState('');
  const [endDate, setEndDate] = useState('');

  const query = useQuery({
    queryKey: ['submissions', workspaceId, formId, startDate, endDate],
    enabled: !!workspaceId && !!formId,
    queryFn: () => {
      const params = new URLSearchParams({ page: '1', limit: '50' });
      if (startDate) params.set('startDate', new Date(startDate).toISOString());
      if (endDate) params.set('endDate', new Date(endDate).toISOString());
      return apiFetch<Submission[]>(
        `/api/v1/workspaces/${workspaceId}/forms/${formId}/submissions?${params}`
      );
    }
  });

  const selected = query.data?.find((s) => s.id === selectedId) ?? null;

  const exportCsv = () => {
    window.open(
      `${process.env.NEXT_PUBLIC_API_URL}/api/v1/workspaces/${workspaceId}/forms/${formId}/submissions/export`,
      '_blank'
    );
  };

  if (query.isLoading) return <Skeleton className="h-64" />;
  if (query.isError)
    return (
      <div>
        <p className="text-red-600">Failed to load submissions.</p>
        <Button onClick={() => query.refetch()}>Retry</Button>
      </div>
    );

  return (
    <div className="space-y-4">
      <div className="flex flex-wrap items-center justify-between gap-2">
        <h1 className="text-2xl font-semibold">Responses</h1>
        <div className="flex gap-2">
          <Input type="date" value={startDate} onChange={(e) => setStartDate(e.target.value)} />
          <Input type="date" value={endDate} onChange={(e) => setEndDate(e.target.value)} />
          <Button variant="outline" onClick={exportCsv}>
            Export CSV
          </Button>
        </div>
      </div>
      {!query.data?.length ? (
        <p className="text-muted-foreground">No submissions yet.</p>
      ) : (
        <SubmissionTable items={query.data} onSelect={setSelectedId} />
      )}
      <SubmissionDetailDrawer
        open={!!selectedId}
        submission={selected}
        onClose={() => setSelectedId(null)}
      />
    </div>
  );
}
