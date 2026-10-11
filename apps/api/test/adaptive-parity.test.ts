import { describe, expect, it } from 'vitest';
import { DEFAULT_ADAPTIVE_CONFIG, type AdaptiveConfig } from '@formforge/types';
import fx from './fixtures/adaptive-parity.json' with { type: 'json' };
import { imputeMissing, nextQuestion, type EngineQuestion } from '../src/engine/adaptive.js';
import type { RespondentModel } from '../src/engine/model.js';

// Model, question bank and 300 respondents exported from the Python simulation
// behind report Section 7.5 (seed 0). The TypeScript engine must make the same
// decisions: same questions, same order, same stopping point, same predictions.
const bank: EngineQuestion[] = fx.bank.map((b) => ({
  id: b.id,
  target: b.target,
  options: b.options,
  seconds: b.seconds,
  anchor: b.required,
  relevance: b.relevance
}));
const model: RespondentModel = { k: fx.model.pi.length, pi: fx.model.pi, theta: fx.model.theta, nmi: fx.model.nmi };
const config: AdaptiveConfig = {
  enabled: true,
  maxQuestions: fx.config.max_questions,
  maxSeconds: fx.config.max_seconds,
  minCoverage: fx.config.min_coverage,
  confidence: fx.config.conf,
  stopGain: fx.config.stop_gain,
  weights: {
    informationGain: fx.config.alpha,
    relevance: fx.config.beta,
    coverage: fx.config.gamma,
    burden: fx.config.delta,
    redundancy: fx.config.eps
  }
};

const run = (trueAnswers: number[]) => {
  const answers = new Map<number, number>();
  let elapsed = 0;
  for (;;) {
    const d = nextQuestion(bank, model, config, { answers, elapsed });
    if (d.next === null) return { asked: [...answers.keys()], predictions: d.predictions, answers };
    answers.set(d.next, trueAnswers[d.next]!);
    elapsed += bank[d.next]!.seconds;
  }
};

describe('adaptive engine: parity with the Python simulation', () => {
  it('uses the report defaults', () => {
    expect(config).toEqual({ ...DEFAULT_ADAPTIVE_CONFIG, enabled: true });
  });

  it('asks the same questions, in the same order, and stops at the same point for all 300 respondents', () => {
    const mismatches = fx.cases.filter((c) => JSON.stringify(run(c.answers).asked) !== JSON.stringify(c.askedOrder));
    expect(mismatches.length).toBe(0);
  });

  it('predicts the same value, with the same confidence, for every skipped question', () => {
    let compared = 0;
    for (const c of fx.cases) {
      const r = run(c.answers);
      for (const imp of imputeMissing(bank, r.answers, r.predictions)) {
        expect(imp.option).toBe(c.predicted[String(imp.q) as keyof typeof c.predicted]);
        expect(imp.confidence).toBeCloseTo(c.confidence[String(imp.q) as keyof typeof c.confidence], 5);
        compared++;
      }
    }
    expect(compared).toBeGreaterThan(1500);
  });
});
