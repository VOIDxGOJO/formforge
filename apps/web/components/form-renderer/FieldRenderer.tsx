'use client';

import type { FieldSchema } from '@formforge/types';
import { FieldType } from '@formforge/types';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import type { UseFormRegister } from 'react-hook-form';

export function FieldRenderer({
  field,
  register
}: {
  field: FieldSchema;
  register: UseFormRegister<Record<string, string>>;
}) {
  const rules = { required: field.required ? `${field.label} is required` : false };
  return (
    <div className="space-y-2">
      <Label>
        {field.label}
        {field.required && <span className="text-red-500"> *</span>}
      </Label>
      {field.type === FieldType.TEXTAREA ? (
        <textarea
          className="flex min-h-[100px] w-full rounded-md border px-3 py-2 text-sm"
          placeholder={field.placeholder}
          {...register(field.id, rules)}
        />
      ) : field.type === FieldType.DROPDOWN ? (
        <select className="h-10 w-full rounded-md border px-3 text-sm" {...register(field.id, rules)}>
          <option value="">Select…</option>
          {(field.options ?? []).map((o) => (
            <option key={o.value} value={o.value}>
              {o.label}
            </option>
          ))}
        </select>
      ) : field.type === FieldType.FILE ? (
        <Input type="file" {...register(field.id, rules)} />
      ) : (
        <Input
          type={
            field.type === FieldType.EMAIL
              ? 'email'
              : field.type === FieldType.NUMBER
                ? 'number'
                : 'text'
          }
          placeholder={field.placeholder}
          {...register(field.id, rules)}
        />
      )}
    </div>
  );
}
