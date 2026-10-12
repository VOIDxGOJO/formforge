"""Ablation of the utility terms of the adaptive engine (same respondents, no dropout)."""
import json, os, sys
import numpy as np
import adaptive_sim as S

VARIANTS = {
    "full": {},
    "no_information_gain": dict(alpha=0.0),
    "no_redundancy": dict(eps=0.0),
    "no_burden": dict(delta=0.0),
    "no_coverage": dict(gamma=0.0),
    "relevance_only": dict(alpha=0.0, gamma=0.0, delta=0.0, eps=0.0),
}

def run(seed, n_test=800):
    rng = np.random.default_rng(500 + seed)
    Xtr, _ = S.generate(3000, rng)
    Xte, _ = S.generate(n_test, rng)
    big, _ = S.generate(20000, rng)
    nmi_true = S.nmi_matrix(big)
    model = S.LCM(6).fit(Xtr, seed=seed)
    nmi = S.nmi_matrix(Xtr)
    patience = np.full(n_test, 1e9); tmul = np.ones((n_test, S.Q))
    out = {}
    for name, over in VARIANTS.items():
        cfg = dict(S.CFG); cfg.update(over)
        eng = S.AdaptiveEngine(model, nmi, cfg)
        qs, ts, cov, acc, red = [], [], [], [], []
        for i in range(n_test):
            x = Xte[i]
            a, t, _, pred = S.run_adaptive(eng, x, patience[i], tmul[i])
            qs.append(len(a)); ts.append(t); cov.append(S.target_coverage(x, a, pred))
            red.append(S.redundant_count(a, nmi_true))
            miss = [q for q in range(S.Q) if q not in a]
            if miss:
                p = np.array([int(pred[q, :S.K_OPT[q]].argmax()) for q in miss])
                acc.append(np.mean(np.abs(p - x[miss]) <= 1))
        out[name] = dict(questions=np.mean(qs), seconds=np.mean(ts), coverage=np.mean(cov),
                         pred_acc_pm1=np.mean(acc), redundant=np.mean(red))
    return out

if __name__ == "__main__":
    seeds = int(sys.argv[1]) if len(sys.argv) > 1 else 3
    runs = [run(s) for s in range(seeds)]
    summ = {v: {m: float(np.mean([r[v][m] for r in runs])) for m in runs[0][v]} for v in VARIANTS}
    json.dump(summ, open(os.path.join(S.OUT, "ablation.json"), "w"), indent=2)
    for v, d in summ.items(): print(v, {k: round(x, 3) for k, x in d.items()})
