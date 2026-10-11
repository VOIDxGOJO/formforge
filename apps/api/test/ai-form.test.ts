import { describe, expect, it } from 'vitest';
import request from 'supertest';
import { buildGeneratedFormSchema, generateFormRequestSchema } from '../src/schemas/ai-form.schema.js';
import { toFormDraft } from '../src/services/ai-form.service.js';
import { createApp } from '../src/app.js';

const question = (over: Record<string, unknown> = {}) => ({
  label: 'How useful was the feedback from your mentor?',
  type: 'RATING',
  required: false,
  placeholder: null,
  options: null,
  objective: 'Quality of mentoring',
  informationTarget: 'mentor_quality',
  estimatedSeconds: 12,
  relevance: 0.9,
  ...over
});

const generated = {
  title: 'Internship feedback',
  description: null,
  objectives: ['Mentoring quality', 'Workload'],
  questions: [
    question({ required: true, placeholder: 'ignored for ratings' }),
    question({ label: 'Which department were you in?', type: 'DROPDOWN', options: ['Engineering', 'Product'], informationTarget: 'department' }),
    question({ label: 'What should change for the next batch?', type: 'TEXTAREA', placeholder: 'A few lines', informationTarget: 'improvements', relevance: 0.555 })
  ]
};

describe('generated form schema', () => {
  it('accepts a well-formed model reply', () => {
    expect(buildGeneratedFormSchema(3).safeParse(generated).success).toBe(true);
  });

  it('rejects the mistakes the repair loop should fix', () => {
    const s = buildGeneratedFormSchema(3);
    const issues = (g: unknown) => (s.safeParse(g) as { error: { issues: { message: string }[] } }).error.issues.map((i) => i.message).join(' | ');
    expect(issues({ ...generated, questions: [...generated.questions, question()] })).toContain('used twice');
    expect(issues({ ...generated, questions: [question({ type: 'DROPDOWN', options: ['Only one'] }), ...generated.questions.slice(1)] }))
      .toContain('2 to 10 options');
    expect(issues({ ...generated, questions: [question({ informationTarget: 'Mentor Quality' }), ...generated.questions.slice(1)] }))
      .toContain('snake_case');
    expect(buildGeneratedFormSchema(10).safeParse(generated).success).toBe(false); // asked for 10, got 3
  });
});

describe('toFormDraft', () => {
  const draft = toFormDraft(buildGeneratedFormSchema(3).parse(generated), generateFormRequestSchema.parse({ description: 'Internship feedback form' }));

  it('builds builder fields with metadata', () => {
    expect(draft.name).toBe('Internship feedback');
    expect(draft.objective).toBe('Mentoring quality; Workload');
    expect(draft.fields.map((f) => f.id)).toEqual(['mentor_quality', 'department', 'improvements']);
    expect(draft.fields[1]!.options).toEqual([
      { label: 'Engineering', value: 'option_1' },
      { label: 'Product', value: 'option_2' }
    ]);
  });

  it('only keeps placeholders where an input shows them and marks optional questions skippable', () => {
    expect(draft.fields[0]).not.toHaveProperty('placeholder');
    expect(draft.fields[2]!.placeholder).toBe('A few lines');
    expect(draft.fields.map((f) => f.adaptive)).toEqual([false, true, true]);
    expect(draft.fields[2]!.relevance).toBe(0.56);
  });

  it('prefers the objective the creator typed', () => {
    const own = toFormDraft(buildGeneratedFormSchema(3).parse(generated), { description: 'xxxxxxxxxx', questionCount: 3, objective: 'Improve the program' });
    expect(own.objective).toBe('Improve the program');
  });
});

describe('POST /ai/forms/generate', () => {
  it('requires a signed-in user', async () => {
    const res = await request(createApp())
      .post('/api/v1/workspaces/8c195f74-792b-4bf0-9293-14618401e933/ai/forms/generate')
      .send({ description: 'A form about canteen food quality' });
    expect(res.status).toBe(401);
  });
});
