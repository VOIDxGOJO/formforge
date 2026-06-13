import { z } from 'zod';

const allowedTypes = new Set([
  'image/jpeg',
  'image/png',
  'image/webp',
  'application/pdf',
  'text/plain'
]);

export const presignSchema = z.object({
  filename: z.string().min(1).max(255),
  contentType: z.string().refine((v) => allowedTypes.has(v), 'Unsupported content type'),
  formId: z.string().uuid()
});
