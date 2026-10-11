'use client';

import type { FieldSchema } from '@formforge/types';
import { FieldType, estimateFieldSeconds } from '@formforge/types';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { Button } from '@/components/ui/button';

// Field types whose input has no free-text box, so a placeholder would never show.
const NO_PLACEHOLDER: FieldType[] = [FieldType.DROPDOWN, FieldType.RATING, FieldType.FILE];

const toSnakeCase = (text: string) =>
  text
    .toLowerCase()
    .replace(/[^a-z0-9]+/g, '_')
    .replace(/^_+/, '')
    .replace(/^[0-9_]+/, '')
    .slice(0, 64);

// Metadata read by the quality analyzer and the adaptive engine.
function QuestionMetadata({
  field,
  onUpdate
}: {
  field: FieldSchema;
  onUpdate: (patch: Partial<FieldSchema>) => void;
}) {
  const estimate = estimateFieldSeconds(field);
  const relevance = field.relevance ?? 0.5;
  return (
    <details className="rounded-md border px-3 py-2 text-sm" open={!!field.informationTarget}>
      <summary className="cursor-pointer font-medium">Question metadata</summary>
      <div className="mt-3 space-y-3">
        <div className="space-y-1">
          <Label htmlFor="meta-objective">Objective</Label>
          <Input
            id="meta-objective"
            placeholder="What should this question find out?"
            value={field.objective ?? ''}
            onChange={(e) => onUpdate({ objective: e.target.value || undefined })}
          />
        </div>
        <div className="space-y-1">
          <Label htmlFor="meta-target">Information target</Label>
          <Input
            id="meta-target"
            placeholder="e.g. mentor_quality"
            value={field.informationTarget ?? ''}
            onChange={(e) => onUpdate({ informationTarget: toSnakeCase(e.target.value) || undefined })}
          />
        </div>
        <div className="space-y-1">
          <Label htmlFor="meta-seconds">Estimated seconds</Label>
          <Input
            id="meta-seconds"
            type="number"
            min={1}
            max={600}
            placeholder={`${estimate} (estimated)`}
            value={field.estimatedSeconds ?? ''}
            onChange={(e) =>
              onUpdate({ estimatedSeconds: e.target.value ? Math.max(1, Math.min(600, Math.round(Number(e.target.value)))) : undefined })
            }
          />
        </div>
        <div className="space-y-1">
          <Label htmlFor="meta-relevance">Relevance: {relevance.toFixed(2)}</Label>
          <input
            id="meta-relevance"
            type="range"
            min={0}
            max={1}
            step={0.05}
            value={relevance}
            onChange={(e) => onUpdate({ relevance: Number(e.target.value) })}
            className="w-full accent-primary"
          />
        </div>
        <label className="flex items-center gap-2">
          <input
            type="checkbox"
            disabled={field.required}
            checked={!field.required && field.adaptive !== false}
            onChange={(e) => onUpdate({ adaptive: e.target.checked })}
          />
          Adaptive mode may skip this question
        </label>
        {field.required && (
          <p className="text-xs text-muted-foreground">Required questions are always asked first.</p>
        )}
      </div>
    </details>
  );
}

export function FieldConfigPanel({
  field,
  onUpdate,
  onRemove
}: {
  field: FieldSchema | null;
  onUpdate: (patch: Partial<FieldSchema>) => void;
  onRemove: () => void;
}) {
  if (!field) return <div className="rounded-lg border p-4 text-sm text-muted-foreground">Select a field</div>;

  return (
    <div className="space-y-4 rounded-lg border p-4">
      <h3 className="font-semibold">Field settings</h3>
      <div>
        <Label>Label</Label>
        <Input value={field.label} onChange={(e) => onUpdate({ label: e.target.value })} />
      </div>
      {!NO_PLACEHOLDER.includes(field.type) && (
        <div>
          <Label>Placeholder</Label>
          <Input
            value={field.placeholder ?? ''}
            onChange={(e) => onUpdate({ placeholder: e.target.value })}
          />
        </div>
      )}
      {field.type === FieldType.RATING && (
        <p className="text-sm text-muted-foreground">Respondents pick a value from 1 to 5.</p>
      )}
      <label className="flex items-center gap-2 text-sm">
        <input
          type="checkbox"
          checked={field.required}
          onChange={(e) => onUpdate({ required: e.target.checked })}
        />
        Required
      </label>
      {field.type === FieldType.DROPDOWN && (
        <div className="space-y-2">
          <Label>Options (comma-separated labels)</Label>
          <Input
            value={(field.options ?? []).map((o) => o.label).join(', ')}
            onChange={(e) =>
              onUpdate({
                options: e.target.value.split(',').map((label, i) => ({
                  label: label.trim(),
                  value: `option_${i + 1}`
                }))
              })
            }
          />
        </div>
      )}
      <QuestionMetadata field={field} onUpdate={onUpdate} />
      <Button variant="destructive" size="sm" onClick={onRemove}>
        Remove field
      </Button>
    </div>
  );
}
