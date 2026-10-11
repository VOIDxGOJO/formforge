import { z } from 'zod';
import { fieldSchema } from './forms.schema.js';

/** Analyze unsaved fields (builder or AI draft). */
export const analyzeQualitySchema = z.object({
  fields: z.array(fieldSchema).max(100),
  objective: z.string().max(1000).nullable().optional(),
  deep: z.boolean().default(false)
});

/** Analyze a saved form. */
export const formQualitySchema = z.object({
  deep: z.boolean().default(false)
});
