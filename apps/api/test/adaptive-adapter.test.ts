import { describe, expect, it } from 'vitest';
import { FieldType, type FieldSchema } from '@formforge/types';
import {
  DEFAULT_RELEVANCE,
  buildPlan,
  decodeAnswer,
  encodeAnswer,
  modelMatchesBank,
  toResponseRows
} from '../src/engine/form-adapter.js';
import { syntheticWeight } from '../src/services/adaptive.service.js';

const opts = (...labels: string[]) => labels.map((label, i) => ({ label, value: `option_${i + 1}` }));
const fields: FieldSchema[] = [
  { id: 'dept', type: FieldType.DROPDOWN, label: 'Which department did you intern in?', required: true, options: opts('Eng', 'Data', 'Ops'), informationTarget: 'department' },
  { id: 'overall', type: FieldType.RATING, label: 'Overall, how satisfied were you?', required: false, relevance: 1, estimatedSeconds: 10 },
  { id: 'mode', type: FieldType.DROPDOWN, label: 'What was your work mode?', required: false, options: opts('Remote', 'Hybrid'), adaptive: false },
  { id: 'single', type: FieldType.DROPDOWN, label: 'Only one option?', required: false, options: opts('Yes') },
  { id: 'improve', type: FieldType.TEXTAREA, label: 'What should improve?', required: true },
  { id: 'notes', type: FieldType.TEXT, label: 'Anything else?', required: false },
  { id: 'email', type: FieldType.EMAIL, label: 'Email for follow-up', required: false, adaptive: false }
];

describe('buildPlan', () => {
  const plan = buildPlan(fields);

  it('models choice questions only (dropdowns with 2+ options and ratings)', () => {
    expect(plan.bank.map((b) => b.id)).toEqual(['dept', 'overall', 'mode']);
  });

  it('treats required and "never skip" questions as anchors', () => {
    expect(plan.bank.map((b) => b.anchor)).toEqual([true, false, true]);
  });

  it('fills defaults: target = field id, relevance 0.5, estimated time', () => {
    expect(plan.bank[0]).toMatchObject({ target: 'department', options: 3, relevance: DEFAULT_RELEVANCE });
    expect(plan.bank[1]).toMatchObject({ target: 'overall', options: 5, relevance: 1, seconds: 10 });
    expect(plan.bank[2]!.seconds).toBeGreaterThan(0);
  });

  it('asks required or never-skip text questions after the engine and leaves the rest out', () => {
    expect(plan.tail.map((f) => f.id)).toEqual(['improve', 'email']);
    expect(plan.skipped.map((f) => f.id)).toEqual(['single', 'notes']);
  });
});

describe('answer encoding', () => {
  const [dept, overall] = fields;
  it('maps values to option indexes and back', () => {
    expect(encodeAnswer(dept!, 'option_3')).toBe(2);
    expect(decodeAnswer(dept!, 2)).toBe('option_3');
    expect(encodeAnswer(overall!, '4')).toBe(3);
    expect(encodeAnswer(overall!, 5)).toBe(4);
    expect(decodeAnswer(overall!, 0)).toBe('1');
  });

  it('returns null for missing or invalid answers', () => {
    for (const bad of [undefined, null, '', 'option_9']) expect(encodeAnswer(dept!, bad)).toBeNull();
    for (const bad of ['0', '6', '2.5', 'great']) expect(encodeAnswer(overall!, bad)).toBeNull();
  });

  it('turns submissions into training rows and drops empty ones', () => {
    const plan = buildPlan(fields);
    const rows = toResponseRows(plan.modeled, [
      { dept: 'option_1', overall: '5', mode: 'option_2' },
      { dept: 'option_2' },
      { improve: 'text only' }
    ]);
    expect(rows).toEqual([[0, 4, 1], [1, null, null]]);
  });
});

describe('model / form consistency', () => {
  it('rejects a stored model when questions or option counts changed', () => {
    const { bank } = buildPlan(fields);
    expect(modelMatchesBank(['dept', 'overall', 'mode'], [3, 5, 2], bank)).toBe(true);
    expect(modelMatchesBank(['dept', 'overall'], [3, 5], bank)).toBe(false);
    expect(modelMatchesBank(['dept', 'overall', 'mode'], [4, 5, 2], bank)).toBe(false);
  });
});

describe('syntheticWeight', () => {
  it('follows w(n) = 25 / (25 + n)', () => {
    expect(syntheticWeight(0)).toBe(1);
    expect(syntheticWeight(25)).toBe(0.5);
    expect(syntheticWeight(100)).toBe(0.2);
  });
});
