'use client';

import type { FieldSchema } from '@formforge/types';
import { FieldType } from '@formforge/types';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { Button } from '@/components/ui/button';

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
      <div>
        <Label>Placeholder</Label>
        <Input
          value={field.placeholder ?? ''}
          onChange={(e) => onUpdate({ placeholder: e.target.value })}
        />
      </div>
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
      <Button variant="destructive" size="sm" onClick={onRemove}>
        Remove field
      </Button>
    </div>
  );
}
