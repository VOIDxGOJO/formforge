import { afterEach, describe, expect, it } from 'vitest';
import { FieldType, type FieldSchema } from '@formforge/types';
import { analyzeWithRules } from '../src/services/quality/analyzer.js';
import { reviewWithAI } from '../src/services/quality/ai-review.js';
import { setAIProvider, type AIProvider } from '../src/lib/ai/index.js';

const f = (id: string, label: string, over: Partial<FieldSchema> = {}): FieldSchema => ({
  id,
  type: FieldType.RATING,
  label,
  required: false,
  ...over
});

const internship: FieldSchema[] = [
  f('q3', 'Overall, how satisfied were you with the internship?', { required: true, informationTarget: 'overall_satisfaction' }),
  f('q4', 'How often did you meet your mentor?', { type: FieldType.DROPDOWN, options: ['Never', 'Monthly', 'Weekly', 'Daily'].map((l, i) => ({ label: l, value: `option_${i + 1}` })) }),
  f('q5', 'How satisfied were you with your mentor and project?'),
  f('q7', 'How would you rate your satisfaction with the internship?', { informationTarget: 'overall_satisfaction' }),
  f('q9', 'How much did you enjoy our excellent mentoring programme?')
];

describe('analyzeWithRules', () => {
  const report = analyzeWithRules({ fields: internship, objective: 'Mentoring quality; stipend fairness' });
  const types = (id: string | null) => report.issues.filter((i) => i.fieldId === id).map((i) => i.type).sort();

  it('flags each problem on the right question', () => {
    expect(types('q3')).toEqual([]);
    expect(types('q4')).toEqual(['AMBIGUOUS']); // the rule cannot see the options; AI review can dismiss it
    expect(types('q7')).toEqual(['REDUNDANT']);
    expect(types('q9')).toContain('LEADING');
    expect(report.issues.find((i) => i.fieldId === 'q7')!.relatedFieldId).toBe('q3');
  });

  it('flags a double-barrelled question', () => {
    expect(types('q5')).toContain('DOUBLE_BARRELLED');
  });

  it('reports objectives no question covers, without a penalty', () => {
    const coverage = report.issues.filter((i) => i.type === 'COVERAGE');
    expect(coverage.map((i) => i.message)).toEqual(['No question seems to cover: "stipend fairness".']);
    expect(coverage[0]!.severity).toBe('info');
  });

  it('scores 100 minus the weighted penalties', () => {
    const penalties: Record<string, number> = { DOUBLE_BARRELLED: 12, LEADING: 12, AMBIGUOUS: 8, REDUNDANT: 8, READABILITY: 5, COVERAGE: 0 };
    const expected = 100 - report.issues.reduce((s, i) => s + penalties[i.type]!, 0);
    expect(report.score).toBe(Math.max(0, expected));
    expect(report.score).toBeLessThan(100);
  });

  it('adds up estimated time and flags long, mostly-required forms', () => {
    const many = Array.from({ length: 12 }, (_, i) =>
      f(`t${i}`, `What happened on day ${i + 1} of the project?`, { type: FieldType.TEXTAREA, required: true })
    );
    const r = analyzeWithRules({ fields: many });
    expect(r.estimatedSeconds).toBeGreaterThan(300);
    expect(r.requiredRatio).toBe(1);
    expect(r.issues.map((i) => i.type)).toEqual(expect.arrayContaining(['LONG_FORM', 'REQUIRED_RATIO']));
  });

  it('checks reading ease only on questions long enough for it to mean anything', () => {
    const r = analyzeWithRules({
      fields: [
        f('e', 'Your college email (optional)', { type: FieldType.EMAIL }),
        f('o', 'How useful was the orientation session for understanding the curriculum?')
      ]
    });
    expect(r.issues.filter((i) => i.type === 'READABILITY').map((i) => i.fieldId)).toEqual(['o']);
  });

  it('gives a clean form a perfect score', () => {
    const clean = analyzeWithRules({
      fields: [f('a', 'Which department did you intern in?'), f('b', 'How many hours did you work per week?', { type: FieldType.NUMBER })]
    });
    expect(clean.issues).toEqual([]);
    expect(clean.score).toBe(100);
  });
});

describe('reviewWithAI', () => {
  afterEach(() => setAIProvider(null));

  it('dismisses rule false positives, adds missed issues and finds reworded duplicates', async () => {
    const fields = [
      f('q4', 'How often did you meet your mentor?', { type: FieldType.DROPDOWN, options: [{ label: 'Weekly', value: 'option_1' }] }),
      f('q8', 'How heavy was your workload?'),
      f('q9', 'How demanding was the amount of work you had?')
    ];
    const fake: AIProvider = {
      name: 'fake',
      embed: async () => [[1, 0], [0, 1], [0.05, 1]],
      generateStructured: async () =>
        ({
          reviews: [
            { fieldId: 'q4', dismiss: [{ type: 'AMBIGUOUS', reason: 'options give the frame' }], add: [] },
            { fieldId: 'q8', dismiss: [], add: [{ type: 'AMBIGUOUS', message: '"heavy" has no reference', suggestion: 'Ask for hours per week' }] },
            { fieldId: 'ghost', dismiss: [], add: [{ type: 'LEADING', message: 'unknown field', suggestion: 'ignore me' }] }
          ]
        }) as never
    };
    setAIProvider(fake);
    const base = analyzeWithRules({ fields });
    expect(base.issues.some((i) => i.fieldId === 'q4' && i.type === 'AMBIGUOUS')).toBe(true);

    const reviewed = await reviewWithAI(fields, base);
    const key = (i: { fieldId: string | null; type: string }) => `${i.fieldId}:${i.type}`;
    expect(reviewed.aiReviewed).toBe(true);
    expect(reviewed.issues.map(key)).not.toContain('q4:AMBIGUOUS');
    expect(reviewed.issues.map(key)).toContain('q8:AMBIGUOUS');
    expect(reviewed.issues.find((i) => i.type === 'REDUNDANT')).toMatchObject({ fieldId: 'q9', relatedFieldId: 'q8', source: 'ai' });
    expect(reviewed.issues.map((i) => i.fieldId)).not.toContain('ghost');
    expect(reviewed.score).toBe(100 - 8 - 8);
  });
});
