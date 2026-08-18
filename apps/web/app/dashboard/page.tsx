'use client';

import { useQuery } from '@tanstack/react-query';
import { FileText, Send, Zap, AlertCircle } from 'lucide-react';
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

  if (!workspaceId) return <p className="text-muted-foreground">Select a workspace to view analytics.</p>;

  if (isLoading)
    return (
      <div className="space-y-6">
        <Skeleton className="h-8 w-48" />
        <div className="grid gap-4 md:grid-cols-3">
          <Skeleton className="h-28 w-full" />
          <Skeleton className="h-28 w-full" />
          <Skeleton className="h-28 w-full" />
        </div>
        <Skeleton className="h-72 w-full" />
      </div>
    );

  if (isError)
    return (
      <div className="flex flex-col items-center justify-center gap-3 rounded-xl border border-dashed border-border py-16 text-center">
        <div className="flex h-10 w-10 items-center justify-center rounded-full bg-destructive/10 text-destructive">
          <AlertCircle className="h-5 w-5" />
        </div>
        <p className="text-sm font-medium text-foreground">Failed to load analytics</p>
        <Button onClick={() => refetch()} variant="outline" size="sm">
          Retry
        </Button>
      </div>
    );

  const chartData =
    data?.submissionsByDay.map((d) => ({
      day: String(d.day),
      count: Number(d.count)
    })) ?? [];

  return (
    <div className="space-y-8">
      <div>
        <h1 className="text-3xl font-bold tracking-tight text-foreground">Dashboard</h1>
        <p className="mt-1 text-sm text-muted-foreground">An overview of your forms and activity</p>
      </div>

      <div className="grid gap-4 md:grid-cols-3">
        <StatsCard title="Total forms" value={data?.totalForms ?? 0} icon={FileText} />
        <StatsCard title="Submissions (30d)" value={data?.totalSubmissions30d ?? 0} icon={Send} accent />
        <StatsCard title="Active workflows" value={data?.activeWorkflows ?? 0} icon={Zap} />
      </div>

      <LiveCounter workspaceId={workspaceId} />
      <SubmissionChart data={chartData} />
    </div>
  );
}