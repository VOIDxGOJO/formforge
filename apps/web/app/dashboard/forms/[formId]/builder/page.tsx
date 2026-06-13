'use client';

import { useEffect } from 'react';
import { useParams } from 'next/navigation';
import { useMutation, useQuery } from '@tanstack/react-query';
import { apiFetch } from '@/lib/api';
import { useWorkspace } from '@/hooks/use-workspace';
import { useBuilder } from '@/hooks/use-builder';
import { useBuilderStore } from '@/store/builder-store';
import { FieldPalette } from '@/components/builder/FieldPalette';
import { FieldCanvas } from '@/components/builder/FieldCanvas';
import { FieldConfigPanel } from '@/components/builder/FieldConfigPanel';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import type { FieldSchema } from '@formforge/types';
import { Skeleton } from '@/components/ui/skeleton';

type FormData = { id: string; name: string; fields: FieldSchema[]; isActive: boolean };

export default function BuilderPage() {
  const { formId } = useParams<{ formId: string }>();
  const { workspaceId } = useWorkspace();
  const builder = useBuilder();
  const { fields, selectedFieldId, setFields, undo, redo } = useBuilderStore();

  const { data, isLoading } = useQuery({
    queryKey: ['form', workspaceId, formId],
    enabled: !!workspaceId && !!formId,
    queryFn: () =>
      apiFetch<FormData>(`/api/v1/workspaces/${workspaceId}/forms/${formId}`)
  });

  useEffect(() => {
    if (data?.fields) setFields(data.fields as FieldSchema[]);
  }, [data, setFields]);

  const save = useMutation({
    mutationFn: () =>
      apiFetch(`/api/v1/workspaces/${workspaceId}/forms/${formId}`, {
        method: 'PATCH',
        body: JSON.stringify({ fields, name: data?.name })
      })
  });

  const togglePublish = useMutation({
    mutationFn: (isActive: boolean) =>
      apiFetch(`/api/v1/workspaces/${workspaceId}/forms/${formId}`, {
        method: 'PATCH',
        body: JSON.stringify({ isActive })
      })
  });

  const selected = fields.find((f) => f.id === selectedFieldId) ?? null;

  if (isLoading) return <Skeleton className="h-96" />;

  return (
    <div className="space-y-4">
      <div className="flex items-center justify-between">
        <Input defaultValue={data?.name} className="max-w-sm text-lg font-semibold" readOnly />
        <div className="flex gap-2">
          <Button variant="outline" onClick={undo}>
            Undo
          </Button>
          <Button variant="outline" onClick={redo}>
            Redo
          </Button>
          <Button
            variant="outline"
            onClick={() => togglePublish.mutate(!data?.isActive)}
          >
            {data?.isActive ? 'Unpublish' : 'Publish'}
          </Button>
          <Button onClick={() => save.mutate()} disabled={save.isPending}>
            {save.isPending ? 'Saving…' : 'Save'}
          </Button>
        </div>
      </div>
      <div className="grid gap-4 lg:grid-cols-[220px_1fr_280px]">
        <FieldPalette onAdd={builder.addField} />
        <FieldCanvas
          fields={fields}
          selectedFieldId={selectedFieldId}
          onSelect={builder.selectField}
          onReorder={builder.reorderFields}
        />
        <FieldConfigPanel
          field={selected}
          onUpdate={(patch) => selected && builder.updateField(selected.id, patch)}
          onRemove={() => selected && builder.removeField(selected.id)}
        />
      </div>
    </div>
  );
}
