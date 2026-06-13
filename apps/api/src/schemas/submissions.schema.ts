import { z } from 'zod';

export const listSubmissionsQuerySchema = z.object({
  page: z.coerce.number().int().min(1).default(1),
  limit: z.coerce.number().int().min(1).max(100).default(20),
  formId: z.string().uuid().optional(),
  startDate: z.string().datetime().optional(),
  endDate: z.string().datetime().optional()
});

export const publicSubmitSchema = z.object({
  responses: z.record(z.unknown())
});

export const submissionParamsSchema = z.object({
  workspaceId: z.string().uuid(),
  formId: z.string().uuid(),
  submissionId: z.string().uuid()
});
