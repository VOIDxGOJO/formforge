"""Stopping-rule sensitivity: confidence threshold / stop gain vs burden and coverage."""
import json, os
import numpy as np
import adaptive_sim as S
SETTINGS = [(0.80, 0.04), (0.75, 0.06), (0.70, 0.10), (0.65, 0.12), (0.60, 0.15), (0.55, 0.20)]
rows = []
for seed in range(3):
    rng = np.random.default_rng(900 + seed)
    Xtr, _ = S.generate(3000, rng); Xte, _ = S.generate(600, rng)
    m = S.LCM(6).fit(Xtr, seed=seed); nmi = S.nmi_matrix(Xtr)
    for conf, sg in SETTINGS:
        e = S.AdaptiveEngine(m, nmi, dict(S.CFG, conf=conf, stop_gain=sg))
        qs, ts, cv, ac = [], [], [], []
        for x in Xte:
            a, t, _, p = S.run_adaptive(e, x, 1e9, np.ones(S.Q))
            qs.append(len(a)); ts.append(t); cv.append(S.target_coverage(x, a, p))
            miss = [q for q in range(S.Q) if q not in a]
            pr = np.array([int(p[q, :S.K_OPT[q]].argmax()) for q in miss]); ac.append(np.mean(np.abs(pr - x[miss]) <= 1))
        rows.append(dict(seed=seed, conf=conf, stop_gain=sg, questions=np.mean(qs), seconds=np.mean(ts), early_stop=np.mean(np.array(qs) < 10), coverage=np.mean(cv), acc=np.mean(ac)))
out = []
for conf, sg in SETTINGS:
    r = [x for x in rows if x["conf"] == conf]
    out.append({k: float(np.mean([x[k] for x in r])) for k in ("conf", "stop_gain", "questions", "seconds", "early_stop", "coverage", "acc")})
json.dump(out, open(os.path.join(S.OUT, "sensitivity.json"), "w"), indent=2)
for o in out: print({k: round(v, 3) for k, v in o.items()})
