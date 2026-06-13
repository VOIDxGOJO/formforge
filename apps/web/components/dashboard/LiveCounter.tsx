'use client';

import { useSSE } from '@/hooks/use-sse';
import { useQuery } from '@tanstack/react-query';
import { apiFetch } from '@/lib/api';

export function LiveCounter({ workspaceId }: { workspaceId: string }) {
  useSSE(workspaceId);
  const { data } = useQuery({
    queryKey: ['analytics', workspaceId],
    queryFn: () =>
      apiFetch<{
        totalSubmissions30d: number;
      }>(`/api/v1/workspaces/${workspaceId}/analytics`)
  });
  return (
    <div className="rounded-lg border bg-emerald-50 p-4 text-emerald-900">
      <p className="text-sm font-medium">Live submissions (30d)</p>
      <p className="text-2xl font-bold">{data?.totalSubmissions30d ?? 0}</p>
    </div>
  );
}
