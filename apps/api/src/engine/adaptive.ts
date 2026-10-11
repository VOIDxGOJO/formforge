// Next-question selection (report Sections 4.1.10-4.1.12, Algorithm 4.1).
// Mirrors AdaptiveEngine in report_work/experiments/adaptive_sim.py; the parity
// test replays the Python decisions for 300 respondents.

import type { AdaptiveConfig } from '@formforge/types';
import { entropy, posterior, predictive, type RespondentModel } from './model.js';

/** A question the engine can model (choice-type: DROPDOWN or RATING). */
export type EngineQuestion = {
  id: string;
  /** informationTarget; questions sharing a target cover the same information. */
  target: string;
  options: number;
  seconds: number;
  /** Anchors: always asked, first, in form order (required or not skippable). */
  anchor: boolean;
  relevance: number;
};

export type EngineState = {
  /** Question index -> option index, in the order the questions were asked. */
  answers: Map<number, number>;
  /** Estimated seconds spent so far. */
  elapsed: number;
};

export type Scored = {
  utility: Map<number, number>;
  /** Best expected gain as a share of the remaining uncertainty (stop rule). */
  bestGainShare: number;
  covered: Set<string>;
  predictions: number[][];
};

export type Decision = {
  /** Index of the next question, or null when the engine stops. */
  next: number | null;
  predictions: number[][];
  /** Share of information targets that are answered or confidently predicted. */
  coverage: number;
};

const argmax = (row: number[]) => row.reduce((best, v, i) => (v > row[best]! ? i : best), 0);

export const coveredTargets = (bank: EngineQuestion[], answers: Map<number, number>, pred: number[][], confidence: number) => {
  const covered = new Set<string>();
  for (const q of answers.keys()) covered.add(bank[q]!.target);
  bank.forEach((question, q) => {
    if (!answers.has(q) && Math.max(...pred[q]!) >= confidence) covered.add(question.target);
  });
  return covered;
};

export const scoreCandidates = (
  bank: EngineQuestion[],
  model: RespondentModel,
  config: AdaptiveConfig,
  answers: Map<number, number>
): Scored => {
  const post = posterior(model, answers);
  const pred = predictive(model, post);
  const hNow = pred.map(entropy);
  const open = bank.map((_, q) => q).filter((q) => !answers.has(q));
  const covered = coveredTargets(bank, answers, pred, config.confidence);

  // Expected information gain: uncertainty removed about q itself plus the expected
  // drop in uncertainty about every other open question once q's answer is known.
  const eig = new Map<number, number>();
  for (const q of open) {
    let gain = hNow[q]!;
    const pa = pred[q]!;
    const hAfter = new Map<number, number>();
    for (let a = 0; a < pa.length; a++) {
      const postA = post.map((p, k) => p * model.theta[q]![k]![a]!);
      const s = postA.reduce((x, y) => x + y, 0);
      for (let k = 0; k < postA.length; k++) postA[k]! /= s;
      for (const t of open) {
        if (t === q) continue;
        const byClass = model.theta[t]!;
        const dist = Array(byClass[0]!.length).fill(0);
        for (let k = 0; k < postA.length; k++) {
          for (let m = 0; m < dist.length; m++) dist[m] += postA[k]! * byClass[k]![m]!;
        }
        hAfter.set(t, (hAfter.get(t) ?? 0) + pa[a]! * entropy(dist));
      }
    }
    for (const t of open) if (t !== q) gain += hNow[t]! - hAfter.get(t)!;
    eig.set(q, gain);
  }

  const maxEig = open.length ? Math.max(...open.map((q) => eig.get(q)!)) : 0;
  const remaining = open.reduce((s, t) => s + Math.log(bank[t]!.options), 0);
  const bestGainShare = open.length ? maxEig / remaining : 0;
  const maxSeconds = Math.max(...bank.map((b) => b.seconds));
  const asked = [...answers.keys()];
  const w = config.weights;

  const utility = new Map<number, number>();
  for (const q of open) {
    const ig = eig.get(q)! / (maxEig + 1e-12);
    const cov = covered.has(bank[q]!.target) ? 0 : 1;
    const burden = bank[q]!.seconds / maxSeconds;
    const red = asked.length ? Math.max(...asked.map((j) => model.nmi[q]![j]!)) : 0;
    utility.set(
      q,
      w.informationGain * ig + w.relevance * bank[q]!.relevance + w.coverage * cov - w.burden * burden - w.redundancy * red
    );
  }
  return { utility, bestGainShare, covered, predictions: pred };
};

export const nextQuestion = (
  bank: EngineQuestion[],
  model: RespondentModel,
  config: AdaptiveConfig,
  state: EngineState
): Decision => {
  const { utility, bestGainShare, covered, predictions } = scoreCandidates(bank, model, config, state.answers);
  const targetCount = new Set(bank.map((b) => b.target)).size;
  const coverage = targetCount ? covered.size / targetCount : 1;
  const done = (next: number | null): Decision => ({ next, predictions, coverage });

  if (utility.size === 0) return done(null);
  if (state.answers.size >= config.maxQuestions || state.elapsed >= config.maxSeconds) return done(null);
  const anchors = [...utility.keys()].filter((q) => bank[q]!.anchor).sort((a, b) => a - b);
  // Anchors are asked first and the engine never stops while one is missing.
  if (anchors.length) return done(anchors[0]!);
  if (coverage >= config.minCoverage && bestGainShare < config.stopGain) return done(null);

  let best = -Infinity;
  let bestQ: number | null = null;
  for (const [q, u] of utility) {
    if (u > best) {
      best = u;
      bestQ = q;
    }
  }
  return done(bestQ);
};

/** Most likely option and its probability for every unanswered question. */
export const imputeMissing = (bank: EngineQuestion[], answers: Map<number, number>, predictions: number[][]) =>
  bank
    .map((question, q) => ({ question, q }))
    .filter(({ q }) => !answers.has(q))
    .map(({ question, q }) => {
      const option = argmax(predictions[q]!);
      return { questionId: question.id, q, option, confidence: predictions[q]![option]! };
    });
