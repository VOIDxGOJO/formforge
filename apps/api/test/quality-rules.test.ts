import { describe, expect, it } from 'vitest';
import fx from './fixtures/quality-labelled.json' with { type: 'json' };
import {
  LEXICAL_REDUNDANCY_THRESHOLD,
  isAmbiguous,
  isDoubleBarrelled,
  isLeading,
  lexicalSimilarity,
  readingEase
} from '../src/services/quality/rules.js';

// The labelled set and expected numbers come from the Python evaluation behind
// report Table 7.9. The TypeScript rules must reproduce them exactly.
const CHECKS = { DOUBLE_BARRELLED: isDoubleBarrelled, LEADING: isLeading, AMBIGUOUS: isAmbiguous } as const;
type Key = keyof typeof CHECKS;

const flagsOf = (label: string) => (Object.keys(CHECKS) as Key[]).filter((k) => CHECKS[k](label));

const prf = (tp: number, fp: number, fn: number) => {
  const p = tp + fp ? tp / (tp + fp) : 0;
  const r = tp + fn ? tp / (tp + fn) : 0;
  const f1 = p + r ? (2 * p * r) / (p + r) : 0;
  const round = (x: number) => Math.round(x * 1000) / 1000;
  return { precision: round(p), recall: round(r), f1: round(f1), tp, fp, fn };
};

describe('quality rules: parity with the Python evaluation', () => {
  it('flags exactly the same questions as the Python rules', () => {
    for (const q of fx.questions) expect(flagsOf(q.label).sort(), q.label).toEqual([...q.pythonFlags].sort());
  });

  it.each([
    ['DOUBLE_BARRELLED', 'double_barrelled'],
    ['LEADING', 'leading'],
    ['AMBIGUOUS', 'ambiguous']
  ] as const)('reproduces report Table 7.9 for %s', (type, key) => {
    let tp = 0, fp = 0, fn = 0;
    for (const q of fx.questions) {
      const gold = q.issues.includes(type);
      const pred = CHECKS[type](q.label);
      if (gold && pred) tp++;
      else if (!gold && pred) fp++;
      else if (gold && !pred) fn++;
    }
    expect(prf(tp, fp, fn)).toEqual(fx.expected[key]);
  });

  it('reproduces the "any issue" row (accuracy 90%)', () => {
    let tp = 0, fp = 0, fn = 0, tn = 0;
    for (const q of fx.questions) {
      const gold = q.issues.length > 0;
      const pred = flagsOf(q.label).length > 0;
      if (gold && pred) tp++;
      else if (!gold && pred) fp++;
      else if (gold && !pred) fn++;
      else tn++;
    }
    const { accuracy, ...rest } = fx.expected.any_issue;
    expect(prf(tp, fp, fn)).toEqual(rest);
    expect(Math.round(((tp + tn) / fx.questions.length) * 1000) / 1000).toBe(accuracy);
  });

  it('matches Python lexical similarity and redundancy detection', () => {
    let tp = 0, fp = 0, fn = 0;
    for (const p of fx.pairs) {
      const s = lexicalSimilarity(p.a, p.b);
      expect(s).toBeCloseTo(p.pythonSimilarity, 5);
      const pred = s >= LEXICAL_REDUNDANCY_THRESHOLD;
      if (p.redundant && pred) tp++;
      else if (!p.redundant && pred) fp++;
      else if (p.redundant && !pred) fn++;
    }
    expect(prf(tp, fp, fn)).toEqual(fx.expectedRedundancyAt04);
  });

  it('computes the same reading ease as Python', () => {
    for (const d of fx.demoForm) expect(Math.round(readingEase(d.label) * 10) / 10).toBeCloseTo(d.flesch, 1);
  });
});
