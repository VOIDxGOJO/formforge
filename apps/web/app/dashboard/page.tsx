'use client';

import { useQuery } from '@tanstack/react-query';
import { apiFetch } from '@/lib/api';
import { useWorkspace } from '@/hooks/use-workspace';
import { StatsCard } from '@/components/dashboard/StatsCard';
import { SubmissionChart } from '@/components/dashboard/SubmissionChart';
import { LiveCounter } from '@/components/dashboard/LiveCounter';
import { Skeleton } from '@/components/ui/skeleton';
import { Button } from '@/components/ui/button';

type Analytics = {
  totalForms: number;
  totalSubmissions30d: number;
  activeWorkflows: number;
  submissionsByDay: Array<{ day: string; count: number }>;
};

export default function DashboardPage() {
  const { workspaceId } = useWorkspace();
  const { data, isLoading, isError, refetch } = useQuery({
    queryKey: ['analytics', workspaceId],
    enabled: !!workspaceId,
    queryFn: () => apiFetch<Analytics>(`/api/v1/workspaces/${workspaceId}/analytics`)
  });

  if (!workspaceId) return <p>Select a workspace to view analytics.</p>;
  if (isLoading) return <Skeleton className="h-40 w-full" />;
  if (isError)
    return (
      <div className="space-y-2">
        <p className="text-red-600">Failed to load analytics.</p>
        <Button onClick={() => refetch()}>Retry</Button>
      </div>
    );

  const chartData =
    data?.submissionsByDay.map((d) => ({
      day: String(d.day),
      count: Number(d.count)
    })) ?? [];

  return (
    <div className="space-y-6">
      <h1 className="text-2xl font-semibold">Dashboard</h1>
      <div className="grid gap-4 md:grid-cols-3">
        <StatsCard title="Total forms" value={data?.totalForms ?? 0} />
        <StatsCard title="Submissions (30d)" value={data?.totalSubmissions30d ?? 0} />
        <StatsCard title="Active workflows" value={data?.activeWorkflows ?? 0} />
      </div>
      <LiveCounter workspaceId={workspaceId} />
      <SubmissionChart data={chartData} />
    </div>
  );
}
