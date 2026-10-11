import { FieldType, RATING_MAX, type FieldSchema } from '@formforge/types';

/** Human-readable answer: option labels for dropdowns, "4 / 5" for ratings. */
export const formatAnswer = (field: FieldSchema | undefined, value: unknown): string => {
  if (value === undefined || value === null || value === '') return '—';
  if (!field) return typeof value === 'string' ? value : JSON.stringify(value);
  if (field.type === FieldType.DROPDOWN) {
    return field.options?.find((o) => o.value === value)?.label ?? String(value);
  }
  if (field.type === FieldType.RATING) return `${value} / ${RATING_MAX}`;
  return typeof value === 'string' ? value : JSON.stringify(value);
};
