'use client';

import {
  DndContext,
  closestCenter,
  type DragEndEvent,
  PointerSensor,
  useSensor,
  useSensors
} from '@dnd-kit/core';
import { SortableContext, useSortable, verticalListSortingStrategy } from '@dnd-kit/sortable';
import { CSS } from '@dnd-kit/utilities';
import type { FieldSchema } from '@formforge/types';
import { cn } from '@/lib/utils';

function SortableField({
  field,
  selected,
  onSelect
}: {
  field: FieldSchema;
  selected: boolean;
  onSelect: () => void;
}) {
  const { attributes, listeners, setNodeRef, transform, transition } = useSortable({
    id: field.id
  });
  return (
    <div
      ref={setNodeRef}
      style={{ transform: CSS.Transform.toString(transform), transition }}
      className={cn(
        'cursor-grab rounded-md border p-3',
        selected && 'border-primary ring-1 ring-primary'
      )}
      onClick={onSelect}
      {...attributes}
      {...listeners}
    >
      <p className="font-medium">{field.label}</p>
      <p className="text-xs text-muted-foreground">{field.type}</p>
    </div>
  );
}

export function FieldCanvas({
  fields,
  selectedFieldId,
  onSelect,
  onReorder
}: {
  fields: FieldSchema[];
  selectedFieldId: string | null;
  onSelect: (id: string) => void;
  onReorder: (from: number, to: number) => void;
}) {
  const sensors = useSensors(useSensor(PointerSensor, { activationConstraint: { distance: 6 } }));

  const handleDragEnd = (event: DragEndEvent) => {
    const { active, over } = event;
    if (!over || active.id === over.id) return;
    const oldIndex = fields.findIndex((f) => f.id === active.id);
    const newIndex = fields.findIndex((f) => f.id === over.id);
    if (oldIndex >= 0 && newIndex >= 0) onReorder(oldIndex, newIndex);
  };

  return (
    <DndContext sensors={sensors} collisionDetection={closestCenter} onDragEnd={handleDragEnd}>
      <SortableContext items={fields.map((f) => f.id)} strategy={verticalListSortingStrategy}>
        <div className="min-h-[400px] space-y-2 rounded-lg border bg-muted/20 p-4">
          {!fields.length && (
            <p className="text-center text-sm text-muted-foreground">Add fields from the palette</p>
          )}
          {fields.map((field) => (
            <SortableField
              key={field.id}
              field={field}
              selected={selectedFieldId === field.id}
              onSelect={() => onSelect(field.id)}
            />
          ))}
        </div>
      </SortableContext>
    </DndContext>
  );
}
