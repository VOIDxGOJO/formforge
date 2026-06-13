'use client';

import { FieldType } from '@formforge/types';
import { Button } from '@/components/ui/button';

const types = [
  FieldType.TEXT,
  FieldType.EMAIL,
  FieldType.NUMBER,
  FieldType.TEXTAREA,
  FieldType.DROPDOWN,
  FieldType.FILE
];

export function FieldPalette({ onAdd }: { onAdd: (type: FieldType) => void }) {
  return (
    <div className="space-y-2 rounded-lg border p-4">
      <h3 className="font-semibold">Fields</h3>
      {types.map((type) => (
        <Button key={type} variant="outline" className="w-full justify-start" onClick={() => onAdd(type)}>
          {type}
        </Button>
      ))}
    </div>
  );
}
