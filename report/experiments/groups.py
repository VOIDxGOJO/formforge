"""Per respondent-group breakdown of static vs adaptive (one run, 1,500 respondents)."""
import json, os
import numpy as np
import adaptive_sim as S
NAMES = ["Engaged, well mentored", "Overloaded", "Under-utilised", "Blocked by infrastructure"]
rng = np.random.default_rng(7)
Xtr, _ = S.generate(3000, rng); Xte, cls = S.generate(1500, rng)
eng = S.AdaptiveEngine(S.LCM(6).fit(Xtr, seed=7), S.nmi_matrix(Xtr))
pat = rng.exponential(1.0, len(Xte)); tm = rng.lognormal(0, 0.25, size=(len(Xte), S.Q))
rows = {k: dict(n=0, sq=[], aq=[], sc=[], ac=[], sd=[], ad=[], acc=[]) for k in range(4)}
for i, x in enumerate(Xte):
    r = rows[int(cls[i])]; r["n"] += 1
    a, t, d = S.run_static(x, pat[i], tm[i]); r["sq"].append(len(a)); r["sc"].append(S.target_coverage(x, a)); r["sd"].append(d)
    a, t, d, p = S.run_adaptive(eng, x, pat[i], tm[i]); r["aq"].append(len(a)); r["ac"].append(S.target_coverage(x, a, p)); r["ad"].append(d)
    miss = [q for q in range(S.Q) if q not in a]
    if miss:
        pr = np.array([int(p[q, :S.K_OPT[q]].argmax()) for q in miss]); r["acc"].append(np.mean(np.abs(pr - x[miss]) <= 1))
out = [dict(group=NAMES[k], n=v["n"], static_q=float(np.mean(v["sq"])), adaptive_q=float(np.mean(v["aq"])),
            static_cov=float(np.mean(v["sc"])), adaptive_cov=float(np.mean(v["ac"])), static_done=float(np.mean(v["sd"])),
            adaptive_done=float(np.mean(v["ad"])), acc=float(np.mean(v["acc"]))) for k, v in rows.items()]
json.dump(out, open(os.path.join(S.OUT, "groups.json"), "w"), indent=1)
for o in out: print({k: (round(v, 3) if isinstance(v, float) else v) for k, v in o.items()})
