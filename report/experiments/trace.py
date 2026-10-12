"""Step-by-step trace of one adaptive session (for the worked example in Chapter 8)."""
import json, os
import numpy as np
import adaptive_sim as S
LABELS = {
    0: ["Engineering", "Data & Analytics", "Product", "Operations"], 1: ["<4 wk", "4-8 wk", "8-12 wk", ">12 wk"],
    3: ["Never", "Monthly", "Weekly", "Daily"], 7: ["<30 h", "30-40 h", "40-50 h", ">50 h"], 12: ["No", "Maybe", "Yes"],
    13: ["No", "Maybe", "Yes"], 14: ["Remote", "Hybrid", "On-site"],
}
lab = lambda q, a: LABELS.get(q, [str(i + 1) for i in range(S.K_OPT[q])])[a]
rng = np.random.default_rng(42)
Xtr, _ = S.generate(3000, rng); Xte, cls = S.generate(50, rng)
eng = S.AdaptiveEngine(S.LCM(6).fit(Xtr, seed=0), S.nmi_matrix(Xtr))
best = None
for i in range(50):  # pick a respondent who stops early, to show the stop rule
    a, t, d, p = S.run_adaptive(eng, Xte[i], 1e9, np.ones(S.Q))
    if len(a) < 10: best = i; break
x = Xte[best]; answers = {}; t = 0.0; steps = []
while True:
    util, frac, cov, pred = eng.score(answers)
    q, pred = eng.next_question(answers, t)
    top = sorted(util.items(), key=lambda kv: -kv[1])[:3]
    steps.append(dict(step=len(answers) + 1, coverage=round(len(cov) / len(S.TARGETS) * 100), gain=round(frac, 3),
                      top=[(f"q{k+1}", round(v, 3)) for k, v in top],
                      asked=None if q is None else f"q{q+1}", anchor=bool(q is not None and S.REQ[q]),
                      answer=None if q is None else lab(q, x[q])))
    if q is None: break
    answers[q] = x[q]; t += S.SEC[q]
miss = [q for q in range(S.Q) if q not in answers]
imp = [dict(q=f"q{q+1}", predicted=lab(q, int(pred[q, :S.K_OPT[q]].argmax())), true=lab(q, x[q]), conf=round(float(pred[q, :S.K_OPT[q]].max()), 2)) for q in miss]
json.dump(dict(respondent=int(best), seconds=t, steps=steps, imputed=imp), open(os.path.join(S.OUT, "trace.json"), "w"), indent=1)
for s in steps: print(s)
for r in imp: print(r)
