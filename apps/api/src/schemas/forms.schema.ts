import { z } from 'zod';
import { DEFAULT_ADAPTIVE_CONFIG as D } from '@formforge/types';

export const fieldSchema = z.object({
  id: z.string(),
  type: z.enum(['TEXT', 'EMAIL', 'NUMBER', 'TEXTAREA', 'DROPDOWN', 'FILE', 'RATING']),
  label: z.string(),
  placeholder: z.string().optional(),
  required: z.boolean(),
  options: z
    .array(z.object({ label: z.string(), value: z.string() }))
    .optional(),
  // FormForge 2.0 question metadata (all optional, so older forms stay valid)
  objective: z.string().max(300).optional(),
  informationTarget: z
    .string()
    .regex(/^[a-z][a-z0-9_]*$/, 'informationTarget must be snake_case')
    .max(64)
    .optional(),
  estimatedSeconds: z.number().int().min(1).max(600).optional(),
  relevance: z.number().min(0).max(1).optional(),
  adaptive: z.boolean().optional()
});

const weight = (fallback: number) => z.number().min(0).max(1).default(fallback);

export const adaptiveConfigSchema = z.object({
  enabled: z.boolean().default(D.enabled),
  maxQuestions: z.number().int().min(1).max(50).default(D.maxQuestions),
  maxSeconds: z.number().int().min(30).max(3600).default(D.maxSeconds),
  minCoverage: z.number().min(0).max(1).default(D.minCoverage),
  confidence: z.number().min(0.5).max(0.99).default(D.confidence),
  stopGain: z.number().min(0).max(1).default(D.stopGain),
  weights: z
    .object({
      informationGain: weight(D.weights.informationGain),
      relevance: weight(D.weights.relevance),
      coverage: weight(D.weights.coverage),
      burden: weight(D.weights.burden),
      redundancy: weight(D.weights.redundancy)
    })
    .default({})
});

export const createFormSchema = z.object({
  name: z.string().min(1).max(200),
  objective: z.string().max(1000).optional()
});

export const updateFormSchema = z.object({
  name: z.string().min(1).max(200).optional(),
  objective: z.string().max(1000).nullable().optional(),
  fields: z.array(fieldSchema).optional(),
  adaptiveConfig: adaptiveConfigSchema.nullable().optional(),
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
