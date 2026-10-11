import { describe, expect, it } from 'vitest';
import { DEFAULT_ADAPTIVE_CONFIG, FieldType, estimateFieldSeconds } from '@formforge/types';
import { adaptiveConfigSchema, fieldSchema, updateFormSchema } from '../src/schemas/forms.schema.js';
import { toPublicForm } from '../src/services/form.service.js';

const ratingField = {
  id: 'q5',
  type: 'RATING' as const,
  label: 'How useful was the feedback from your mentor?',
  required: false,
  objective: 'Quality of mentoring',
  informationTarget: 'mentor_quality',
  estimatedSeconds: 12,
  relevance: 0.9,
  adaptive: true
};

describe('field metadata', () => {
  it('keeps metadata when a form is saved', () => {
    expect(fieldSchema.parse(ratingField)).toEqual(ratingField);
  });

  it('still accepts fields without metadata (pre-2.0 forms)', () => {
    expect(fieldSchema.safeParse({ id: 'a', type: 'TEXT', label: 'Name', required: true }).success).toBe(true);
  });

  it('rejects invalid metadata', () => {
    expect(fieldSchema.safeParse({ ...ratingField, informationTarget: 'Mentor Quality' }).success).toBe(false);
    expect(fieldSchema.safeParse({ ...ratingField, relevance: 1.5 }).success).toBe(false);
    expect(fieldSchema.safeParse({ ...ratingField, estimatedSeconds: 0 }).success).toBe(false);
  });
});

describe('adaptive config', () => {
  it('fills every missing value with the report defaults', () => {
    expect(adaptiveConfigSchema.parse({})).toEqual(DEFAULT_ADAPTIVE_CONFIG);
    expect(adaptiveConfigSchema.parse({ enabled: true, weights: { burden: 0.2 } })).toEqual({
      ...DEFAULT_ADAPTIVE_CONFIG,
      enabled: true,
      weights: { ...DEFAULT_ADAPTIVE_CONFIG.weights, burden: 0.2 }
    });
  });

  it('rejects out-of-range limits', () => {
    expect(adaptiveConfigSchema.safeParse({ maxQuestions: 0 }).success).toBe(false);
    expect(adaptiveConfigSchema.safeParse({ confidence: 1 }).success).toBe(false);
  });

  it('can be cleared with null to make a form static again', () => {
    expect(updateFormSchema.parse({ adaptiveConfig: null }).adaptiveConfig).toBeNull();
  });
});

describe('estimateFieldSeconds', () => {
  it('matches the estimates used in the report (base + reading time + choices)', () => {
    // 7 s base + 8 words / 3.5 + 5 scale points * 0.6 = 12.3 s
    expect(estimateFieldSeconds(ratingField)).toBe(12);
    // 45 s base + 10 words / 3.5 = 47.9 s
    expect(
      estimateFieldSeconds({ type: FieldType.TEXTAREA, label: 'What should the company improve for the next batch of interns?' })
    ).toBe(48);
    // 8 s base + 6 words / 3.5 + 4 options * 0.6 = 12.1 s
    expect(
      estimateFieldSeconds({
        type: FieldType.DROPDOWN,
        label: 'Which department did you intern in?',
        options: ['a', 'b', 'c', 'd'].map((v) => ({ label: v, value: v }))
      })
    ).toBe(12);
  });
});

describe('toPublicForm', () => {
  const form = {
    id: 'f1',
    name: 'Internship feedback',
    slug: 'internship-feedback-abc',
    fields: [ratingField],
    adaptiveConfig: { ...DEFAULT_ADAPTIVE_CONFIG, enabled: true }
  };

  it('hides question metadata from respondents', () => {
    const [field] = toPublicForm(form).fields;
    expect(Object.keys(field!).sort()).toEqual(['id', 'label', 'options', 'placeholder', 'required', 'type']);
  });

  it('reports whether the form runs in adaptive mode', () => {
    expect(toPublicForm(form).adaptive).toBe(true);
    expect(toPublicForm({ ...form, adaptiveConfig: null }).adaptive).toBe(false);
  });
});
