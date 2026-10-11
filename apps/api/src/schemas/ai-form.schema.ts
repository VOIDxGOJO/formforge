import { z } from 'zod';

/** Body of POST /workspaces/:workspaceId/ai/forms/generate */
export const generateFormRequestSchema = z.object({
  description: z.string().trim().min(10, 'Describe the form in at least 10 characters').max(2000),
  objective: z.string().trim().max(1000).optional(),
  questionCount: z.number().int().min(3).max(25).default(10)
});

export type GenerateFormRequest = z.infer<typeof generateFormRequestSchema>;

/** Field types the model may use (FILE is left to the creator). */
export const GENERATED_TYPES = ['TEXT', 'EMAIL', 'NUMBER', 'TEXTAREA', 'DROPDOWN', 'RATING'] as const;

// Every property is required and nullable rather than optional:
// strict structured-output modes reject optional properties.
const generatedQuestionSchema = z
  .object({
    label: z.string().min(5).max(200),
    type: z.enum(GENERATED_TYPES),
    required: z.boolean(),
    placeholder: z.string().max(120).nullable(),
    options: z.array(z.string().min(1).max(80)).nullable(),
    objective: z.string().min(3).max(300),
    informationTarget: z.string().regex(/^[a-z][a-z0-9_]*$/, 'must be snake_case').max(64),
    estimatedSeconds: z.number().int().min(3).max(300),
    relevance: z.number().min(0).max(1)
  })
  .superRefine((q, ctx) => {
    if (q.type === 'DROPDOWN' && (!q.options || q.options.length < 2 || q.options.length > 10)) {
      ctx.addIssue({ code: z.ZodIssueCode.custom, path: ['options'], message: 'DROPDOWN needs 2 to 10 options' });
    }
    if (q.type !== 'DROPDOWN' && q.options && q.options.length > 0) {
      ctx.addIssue({ code: z.ZodIssueCode.custom, path: ['options'], message: 'only DROPDOWN may have options; use null' });
    }
  });

export const buildGeneratedFormSchema = (questionCount: number) =>
  z
    .object({
      title: z.string().min(3).max(200),
      description: z.string().max(500).nullable(),
      objectives: z.array(z.string().min(3).max(300)).min(1).max(8),
      questions: z.array(generatedQuestionSchema).min(3).max(25)
    })
    .superRefine((form, ctx) => {
      if (Math.abs(form.questions.length - questionCount) > 2) {
        ctx.addIssue({
          code: z.ZodIssueCode.custom,
          path: ['questions'],
          message: `write ${questionCount} questions (got ${form.questions.length})`
        });
      }
      const targets = form.questions.map((q) => q.informationTarget);
      const dup = targets.find((t, i) => targets.indexOf(t) !== i);
      if (dup) {
        ctx.addIssue({ code: z.ZodIssueCode.custom, path: ['questions'], message: `informationTarget "${dup}" is used twice` });
      }
    });

export type GeneratedForm = z.infer<ReturnType<typeof buildGeneratedFormSchema>>;
