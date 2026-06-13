'use client';

import { useEffect } from 'react';
import { useQueryClient } from '@tanstack/react-query';

export const useSSE = (workspaceId: string | undefined) => {
  const queryClient = useQueryClient();

  useEffect(() => {
    if (!workspaceId) return;
    const url = `${process.env.NEXT_PUBLIC_API_URL}/api/v1/sse/${workspaceId}`;
    const source = new EventSource(url, { withCredentials: true });
    source.onmessage = () => {
      void queryClient.invalidateQueries({ queryKey: ['analytics', workspaceId] });
      void queryClient.invalidateQueries({ queryKey: ['submissions'] });
    };
    return () => source.close();
  }, [workspaceId, queryClient]);
};
