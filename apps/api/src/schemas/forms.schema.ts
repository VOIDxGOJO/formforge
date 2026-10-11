import { z } from 'zod';

const fieldSchema = z.object({
  id: z.string(),
  type: z.enum(['TEXT', 'EMAIL', 'NUMBER', 'TEXTAREA', 'DROPDOWN', 'FILE', 'RATING']),
  label: z.string(),
  placeholder: z.string().optional(),
  required: z.boolean(),
  options: z
    .array(z.object({ label: z.string(), value: z.string() }))
    .optional()
});

export const createFormSchema = z.object({
  name: z.string().min(1).max(200)
});

export const updateFormSchema = z.object({
  name: z.string().min(1).max(200).optional(),
  fields: z.array(fieldSchema).optional(),
  isActive: z.boolean().optional()
});

export const formParamsSchema = z.object({
  workspaceId: z.string().uuid(),
  formId: z.string().uuid()
});

export const listFormsQuerySchema = z.object({
  page: z.coerce.number().int().min(1).default(1),
  limit: z.coerce.number().int().min(1).max(100).default(20),
  q: z.string().optional()
});
