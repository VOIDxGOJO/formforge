// Latent class respondent model (report Section 4.1.9), ported from
// report_work/experiments/adaptive_sim.py. Unlike the Python prototype it also
// accepts missing answers, because real adaptive submissions skip questions.

/** theta[q][k][a] = P(answer option a to question q | class k). */
export type RespondentModel = {
  k: number;
  pi: number[];
  theta: number[][][];
  /** Normalised mutual information between questions (redundancy term). */
  nmi: number[][];
};

/** One row per response; null = question not answered. Values are option indexes. */
export type ResponseRow = Array<number | null>;

const EPS = 1e-12;

export const entropy = (p: ArrayLike<number>): number => {
  let h = 0;
  for (let i = 0; i < p.length; i++) h -= p[i]! * Math.log(p[i]! + EPS);
  return h;
};

/** Model with no information: uniform classes and answers (cold start without data). */
export const uniformModel = (optionCounts: number[], k = 6): RespondentModel => ({
  k,
  pi: Array(k).fill(1 / k),
  theta: optionCounts.map((n) => Array.from({ length: k }, () => Array(n).fill(1 / n))),
  nmi: optionCounts.map(() => optionCounts.map(() => 0))
});

/** P(class | answers). `answers` maps question index -> option index. */
export const posterior = (model: RespondentModel, answers: Map<number, number>): number[] => {
  const lp = model.pi.map(Math.log);
  for (const [q, a] of answers) {
    for (let k = 0; k < model.k; k++) lp[k]! += Math.log(model.theta[q]![k]![a]! + EPS);
  }
  const max = Math.max(...lp);
  const p = lp.map((v) => Math.exp(v - max));
  const sum = p.reduce((s, v) => s + v, 0);
  return p.map((v) => v / sum);
};

/** Predicted answer distribution for every question given a class posterior. */
export const predictive = (model: RespondentModel, post: number[]): number[][] =>
  model.theta.map((byClass) => {
    const out = Array(byClass[0]!.length).fill(0);
    for (let k = 0; k < model.k; k++) {
      const row = byClass[k]!;
      for (let a = 0; a < row.length; a++) out[a] += post[k]! * row[a]!;
    }
    return out;
  });

/** Small seeded PRNG (mulberry32) so model fits are reproducible. */
export const seededRandom = (seed: number) => {
  let s = seed >>> 0;
  return () => {
    s = (s + 0x6d2b79f5) >>> 0;
    let t = s;
    t = Math.imul(t ^ (t >>> 15), t | 1);
    t ^= t + Math.imul(t ^ (t >>> 7), t | 61);
    return ((t ^ (t >>> 14)) >>> 0) / 4294967296;
  };
};

export type FitOptions = { k?: number; iterations?: number; seed?: number; weights?: number[] };

/**
 * Weighted EM (Dempster et al., 1977). Same update order and smoothing as the
 * Python prototype: pi gets +1, theta counts get +0.5. Missing answers are
 * simply left out of the likelihood and the counts.
 */
export const fitModel = (rows: ResponseRow[], optionCounts: number[], opts: FitOptions = {}): RespondentModel => {
  const K = opts.k ?? 6;
  const iterations = opts.iterations ?? 80;
  const Q = optionCounts.length;
  if (rows.length === 0) return uniformModel(optionCounts, K);
  const n = rows.length;
  const w = opts.weights ?? Array(n).fill(1);
  const rand = seededRandom(opts.seed ?? 0);

  // Random soft start: responsibilities drawn from Dirichlet(1, ..., 1).
  let R = Array.from({ length: n }, () => {
    const g = Array.from({ length: K }, () => -Math.log(1 - rand()));
    const s = g.reduce((a, b) => a + b, 0);
    return g.map((v) => v / s);
  });

  let pi = Array(K).fill(1 / K);
  let theta: number[][][] = [];
  for (let it = 0; it < iterations; it++) {
    // M-step
    const classWeight = Array(K).fill(0);
    let total = 0;
    for (let i = 0; i < n; i++) {
      for (let k = 0; k < K; k++) {
        const v = R[i]![k]! * w[i]!;
        classWeight[k] += v;
        total += v;
      }
    }
    pi = classWeight.map((c) => (c + 1) / (total + K));
    theta = optionCounts.map((opts_) => Array.from({ length: K }, () => Array(opts_).fill(0.5)));
    for (let i = 0; i < n; i++) {
      const row = rows[i]!;
      for (let q = 0; q < Q; q++) {
        const a = row[q];
        if (a === null || a === undefined) continue;
        for (let k = 0; k < K; k++) theta[q]![k]![a]! += R[i]![k]! * w[i]!;
      }
    }
    for (const byClass of theta) {
      for (const counts of byClass) {
        const s = counts.reduce((x, y) => x + y, 0);
        for (let a = 0; a < counts.length; a++) counts[a]! /= s;
      }
    }
    // E-step
    const logPi = pi.map(Math.log);
    R = rows.map((row) => {
      const lp = [...logPi];
      for (let q = 0; q < Q; q++) {
        const a = row[q];
        if (a === null || a === undefined) continue;
        for (let k = 0; k < K; k++) lp[k]! += Math.log(theta[q]![k]![a]! + EPS);
      }
      const max = Math.max(...lp);
      const e = lp.map((v) => Math.exp(v - max));
      const s = e.reduce((x, y) => x + y, 0);
      return e.map((v) => v / s);
    });
  }
  return { k: K, pi, theta, nmi: nmiMatrix(rows, optionCounts) };
};

/** NMI between every pair of questions over rows answering both (0.5 smoothing, as in Python). */
export const nmiMatrix = (rows: ResponseRow[], optionCounts: number[]): number[][] => {
  const Q = optionCounts.length;
  const M = Array.from({ length: Q }, () => Array(Q).fill(0));
  for (let i = 0; i < Q; i++) {
    for (let j = 0; j < Q; j++) {
      if (i === j) continue;
      const J = Array.from({ length: optionCounts[i]! }, () => Array(optionCounts[j]!).fill(0.5));
      for (const row of rows) {
        const a = row[i];
        const b = row[j];
        if (a === null || a === undefined || b === null || b === undefined) continue;
        J[a]![b]! += 1;
      }
      const total = J.flat().reduce((s, v) => s + v, 0);
      const P = J.map((r) => r.map((v) => v / total));
      const pi = P.map((r) => r.reduce((s, v) => s + v, 0));
      const pj = P[0]!.map((_, c) => P.reduce((s, r) => s + r[c]!, 0));
      let mi = 0;
      for (let a = 0; a < P.length; a++) {
        for (let b = 0; b < P[a]!.length; b++) mi += P[a]![b]! * Math.log(P[a]![b]! / (pi[a]! * pj[b]!));
      }
      M[i]![j] = mi / Math.max(1e-9, Math.min(entropy(pi), entropy(pj)));
    }
  }
  return M;
};

/** Average log-likelihood of observed answers (used to check that EM converges). */
export const logLikelihood = (model: RespondentModel, rows: ResponseRow[]): number => {
  let ll = 0;
  for (const row of rows) {
    let p = 0;
    for (let k = 0; k < model.k; k++) {
      let lp = Math.log(model.pi[k]!);
      row.forEach((a, q) => {
        if (a !== null && a !== undefined) lp += Math.log(model.theta[q]![k]![a]! + EPS);
      });
      p += Math.exp(lp);
    }
    ll += Math.log(p + EPS);
  }
  return ll / Math.max(1, rows.length);
};
