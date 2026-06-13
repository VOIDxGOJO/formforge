'use client';

import { useQuery } from '@tanstack/react-query';
import type { FieldSchema } from '@formforge/types';
import { PublicForm } from '@/components/form-renderer/PublicForm';
import { Skeleton } from '@/components/ui/skeleton';
import { Button } from '@/components/ui/button';

const API_URL = process.env.NEXT_PUBLIC_API_URL ?? 'http://localhost:3001';

export function PublicFormClient({ slug }: { slug: string }) {
  const { data, isLoading, isError, refetch } = useQuery({
    queryKey: ['public-form', slug],
    queryFn: async () => {
      const res = await fetch(`${API_URL}/api/public/forms/${slug}`);
      const json = await res.json();
      if (!json.success) throw new Error(json.error?.message ?? 'Failed to load form');
      return json.data as { name: string; fields: FieldSchema[] };
    }
  });

  if (isLoading) return <Skeleton className="h-64" />;
  if (isError)
    return (
      <div>
        <p className="text-red-600">Form not found.</p>
        <Button onClick={() => refetch()}>Retry</Button>
      </div>
    );

  return <PublicForm slug={slug} name={data!.name} fields={data!.fields} />;
}
