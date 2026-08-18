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
    <div className="relative overflow-hidden rounded-xl border border-brand-100 bg-gradient-to-br from-brand-50 to-white p-5">
      <div className="flex items-center gap-2">
        <span className="relative flex h-2 w-2">
          <span className="absolute inline-flex h-full w-full animate-ping rounded-full bg-brand-500 opacity-75" />
          <span className="relative inline-flex h-2 w-2 rounded-full bg-brand-600" />
        </span>
        <p className="text-sm font-medium text-brand-700">Live submissions (30d)</p>
      </div>
      <p className="mt-2 text-3xl font-bold tracking-tight text-foreground">
        {data?.totalSubmissions30d ?? 0}
      </p>
    </div>
  );
}