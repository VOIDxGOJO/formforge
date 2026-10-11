'use client';

import { useEffect, useState } from 'react';
import { useRouter } from 'next/navigation';
import { useMutation, useQueryClient } from '@tanstack/react-query';
import { Sparkles } from 'lucide-react';
import { apiFetch } from '@/lib/api';
import { useWorkspace } from '@/hooks/use-workspace';
import { useBuilder } from '@/hooks/use-builder';
import { useBuilderStore } from '@/store/builder-store';
import { useDraftStore } from '@/store/draft-store';
import { FieldPalette } from '@/components/builder/FieldPalette';
import { FieldCanvas } from '@/components/builder/FieldCanvas';
import { FieldConfigPanel } from '@/components/builder/FieldConfigPanel';
import { QualityPanel } from '@/components/builder/QualityPanel';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';

// Review page for an AI draft: the normal builder, but the form only gets created on Save.
export default function DraftBuilderPage() {
  const router = useRouter();
  const queryClient = useQueryClient();
  const { workspaceId } = useWorkspace();
  const { draft, clearDraft } = useDraftStore();
  const builder = useBuilder();
  const { fields, selectedFieldId, setFields, undo, redo } = useBuilderStore();
  const [name, setName] = useState('');
  const [objective, setObjective] = useState('');
  const [loaded, setLoaded] = useState(false);

  useEffect(() => {
    if (loaded || !useDraftStore.persist.hasHydrated()) return;
    if (!draft) {
      router.replace('/dashboard/forms');
      return;
    }
    setFields(draft.fields);
    setName(draft.name);
    setObjective(draft.objective);
    setLoaded(true);
  }, [draft, loaded, router, setFields]);

  const save = useMutation({
    mutationFn: async () => {
      const base = `/api/v1/workspaces/${workspaceId}/forms`;
      const form = await apiFetch<{ id: string }>(base, {
        method: 'POST',
        body: JSON.stringify({ name: name.trim(), objective: objective.trim() || undefined })
      });
      await apiFetch(`${base}/${form.id}`, { method: 'PATCH', body: JSON.stringify({ fields }) });
      return form;
    },
    onSuccess: (form) => {
      clearDraft();
      void queryClient.invalidateQueries({ queryKey: ['forms', workspaceId] });
      router.replace(`/dashboard/forms/${form.id}/builder`);
    }
  });

  const discard = () => {
    clearDraft();
    router.push('/dashboard/forms');
  };

  if (!loaded) return null;
  const selected = fields.find((f) => f.id === selectedFieldId) ?? null;

  return (
    <div className="space-y-4">
      <div className="flex items-start gap-3 rounded-lg border border-primary/30 bg-primary/5 px-4 py-3 text-sm">
        <Sparkles className="mt-0.5 h-4 w-4 shrink-0 text-primary" />
        <p>
          <span className="font-medium">AI draft, not saved yet.</span> Review and edit the questions, then save to
          create the form. Discarding removes the draft.
        </p>
      </div>
      <div className="flex items-center justify-between gap-3">
        <Input
          aria-label="Form name"
          value={name}
          onChange={(e) => setName(e.target.value)}
          className="max-w-md text-lg font-semibold"
        />
        <div className="flex gap-2">
          <Button variant="outline" onClick={undo}>
            Undo
          </Button>
          <Button variant="outline" onClick={redo}>
            Redo
          </Button>
          <Button variant="outline" onClick={discard} disabled={save.isPending}>
            Discard
          </Button>
          <Button onClick={() => save.mutate()} disabled={!name.trim() || fields.length === 0 || save.isPending}>
            {save.isPending ? 'Saving…' : 'Save form'}
          </Button>
        </div>
      </div>
      {save.isError && (
        <p role="alert" className="rounded-md bg-destructive/10 px-3 py-2 text-sm text-destructive">
          {(save.error as Error).message}
        </p>
      )}
      <div className="space-y-1">
        <label htmlFor="draft-objective" className="text-sm font-medium">
          Form objective
        </label>
        <textarea
          id="draft-objective"
          rows={2}
          maxLength={1000}
          value={objective}
          onChange={(e) => setObjective(e.target.value)}
          className="w-full rounded-md border border-input bg-background px-3 py-2 text-sm"
        />
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
      {workspaceId && (
        <QualityPanel workspaceId={workspaceId} fields={fields} objective={objective} onSelectField={builder.selectField} />
      )}
    </div>
  );
}
