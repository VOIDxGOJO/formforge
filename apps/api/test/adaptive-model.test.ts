import { describe, expect, it } from 'vitest';
import { DEFAULT_ADAPTIVE_CONFIG } from '@formforge/types';
import parity from './fixtures/adaptive-parity.json' with { type: 'json' };
import train from './fixtures/adaptive-train.json' with { type: 'json' };
import { imputeMissing, nextQuestion, type EngineQuestion } from '../src/engine/adaptive.js';
import { fitModel, logLikelihood, seededRandom, uniformModel, type RespondentModel, type ResponseRow } from '../src/engine/model.js';

const bank: EngineQuestion[] = parity.bank.map((b) => ({
  id: b.id, target: b.target, options: b.options, seconds: b.seconds, anchor: b.required, relevance: b.relevance
}));
const optionCounts = bank.map((b) => b.options);
const config = { ...DEFAULT_ADAPTIVE_CONFIG, enabled: true };
const rows = train.rows as ResponseRow[];

/** Imputation accuracy within one scale point over the 300 test respondents (report metric). */
const accuracyWithin1 = (model: RespondentModel) => {
  let hit = 0, total = 0;
  for (const c of parity.cases) {
    const answers = new Map<number, number>();
    let elapsed = 0;
    for (;;) {
      const d = nextQuestion(bank, model, config, { answers, elapsed });
      if (d.next === null) {
        for (const imp of imputeMissing(bank, answers, d.predictions)) {
          total++;
          if (Math.abs(imp.option - c.answers[imp.q]!) <= 1) hit++;
        }
        break;
      }
      answers.set(d.next, c.answers[d.next]!);
      elapsed += bank[d.next]!.seconds;
    }
  }
  return hit / total;
};

const pythonModel: RespondentModel = { k: 6, pi: parity.model.pi, theta: parity.model.theta, nmi: parity.model.nmi };
const pythonAccuracy = accuracyWithin1(pythonModel);
const tsModel = fitModel(rows, optionCounts, { seed: 1 });

describe('fitModel (weighted EM)', () => {
  it('produces valid probabilities', () => {
    expect(tsModel.pi.reduce((a, b) => a + b, 0)).toBeCloseTo(1, 9);
    for (const byClass of tsModel.theta) for (const dist of byClass) expect(dist.reduce((a, b) => a + b, 0)).toBeCloseTo(1, 9);
  });

  it('fits the data far better than no model and improves with iterations', () => {
    const few = fitModel(rows, optionCounts, { seed: 1, iterations: 3 });
    expect(logLikelihood(tsModel, rows)).toBeGreaterThan(logLikelihood(few, rows));
    expect(logLikelihood(few, rows)).toBeGreaterThan(logLikelihood(uniformModel(optionCounts), rows));
  });

  it('predicts skipped answers about as well as the Python-trained model', () => {
    // Python model was trained on 3,000 rows, this one on 1,500, with a different random start.
    expect(pythonAccuracy).toBeGreaterThan(0.8);
    expect(accuracyWithin1(tsModel)).toBeGreaterThan(pythonAccuracy - 0.04);
  });

  it('still learns when 30% of answers are missing (real adaptive submissions)', () => {
    const rand = seededRandom(7);
    const holey = rows.map((r) => r.map((v) => (rand() < 0.3 ? null : v)));
    const model = fitModel(holey, optionCounts, { seed: 1 });
    expect(accuracyWithin1(model)).toBeGreaterThan(pythonAccuracy - 0.06);
  });

  it('is reproducible for a fixed seed and honours record weights', () => {
    expect(fitModel(rows.slice(0, 200), optionCounts, { seed: 3 }).pi).toEqual(fitModel(rows.slice(0, 200), optionCounts, { seed: 3 }).pi);
    const zeroWeight = fitModel([...rows.slice(0, 200), ...rows.slice(0, 200)], optionCounts, {
      seed: 3,
      weights: [...Array(200).fill(1), ...Array(200).fill(0)]
    });
    expect(Number.isFinite(logLikelihood(zeroWeight, rows.slice(0, 200)))).toBe(true);
  });

  it('falls back to a uniform model with no data', () => {
    expect(fitModel([], optionCounts)).toEqual(uniformModel(optionCounts));
  });
});
