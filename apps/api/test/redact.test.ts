import { readFileSync } from 'node:fs';
import { describe, expect, it } from 'vitest';
import { redact } from '../src/services/privacy/redact.js';

type Row = { text: string; gold: Array<[string, string]>; python_found: Array<[string, string]>; python_output: string };
const fixture = JSON.parse(readFileSync(new URL('./fixtures/pii-labelled.json', import.meta.url), 'utf8')) as {
  overall: { precision: number; recall: number; tp: number; fp: number; fn: number };
  sentences: Row[];
};

describe('redact', () => {
  it('matches the Python redactor exactly on all 30 labelled sentences', () => {
    for (const row of fixture.sentences) {
      const { text, found } = redact(row.text);
      expect(text).toBe(row.python_output);
      expect(found.map((f) => [f.type, f.value])).toEqual(row.python_found);
    }
  });

  it('reproduces the report precision and recall (Section 7.8, test T20)', () => {
    let tp = 0, fp = 0, fn = 0;
    for (const row of fixture.sentences) {
      const found = new Set(redact(row.text).found.map((f) => `${f.type}|${f.value}`));
      const gold = new Set(row.gold.map(([t, v]) => `${t}|${v}`));
      tp += [...found].filter((x) => gold.has(x)).length;
      fp += [...found].filter((x) => !gold.has(x)).length;
      fn += [...gold].filter((x) => !found.has(x)).length;
    }
    expect({ tp, fp, fn }).toEqual({ tp: fixture.overall.tp, fp: fixture.overall.fp, fn: fixture.overall.fn });
    expect(tp / (tp + fn)).toBeGreaterThanOrEqual(0.85);
  });

  it('leaves text without personal details unchanged', () => {
    expect(redact('Workload was too high in the last two weeks.')).toEqual({ text: 'Workload was too high in the last two weeks.', found: [] });
  });
});
