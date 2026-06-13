import { z } from 'zod';
import { ActionType } from '@prisma/client';

const stepSchema = z.object({
  actionType: z.nativeEnum(ActionType),
  actionConfig: z.record(z.unknown()),
  order: z.number().int().min(0)
});

export const createWorkflowSchema = z.object({
  name: z.string().min(1).max(200),
  isActive: z.boolean().default(true),
  steps: z.array(stepSchema).min(1)
});

export const updateWorkflowSchema = z.object({
  name: z.string().min(1).max(200).optional(),
  isActive: z.boolean().optional(),
  steps: z.array(stepSchema).optional()
});

export const workflowParamsSchema = z.object({
  workspaceId: z.string().uuid(),
  formId: z.string().uuid(),
  workflowId: z.string().uuid()
});
