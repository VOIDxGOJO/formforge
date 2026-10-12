"""
FormForge 2.0 - controlled evaluation of the adaptive question engine.

Compares three ways of running the same 16-question "Internship Experience
Feedback" form:
  A. Static form        - every respondent sees every question in order
  B. Rule-based form    - hand written skip logic (what most form builders offer)
  C. FormForge adaptive - utility based next-question selection

and a cold-start experiment (no prior data vs synthetic warm start).

Respondents are drawn from a latent-trait generator so that the ground truth
for every question is known, even for questions that were never asked.
Run:  python adaptive_sim.py            (writes results/*.json)
"""
import json, math, os, sys
import numpy as np

OUT = os.path.join(os.path.dirname(os.path.abspath(__file__)), "results")
os.makedirs(OUT, exist_ok=True)

# ---------------------------------------------------------------- question bank
# id, label, informationTarget, #options, estimatedSeconds, required, relevance
BANK = [
    ("q1", "Which department did you intern in?", "department", 4, 9, True, 0.60),
    ("q2", "How long was your internship?", "duration", 4, 8, False, 0.50),
    ("q3", "Overall, how satisfied were you with the internship?", "overall_satisfaction", 5, 10, True, 1.00),
    ("q4", "How often did you meet your mentor?", "mentor_frequency", 4, 10, False, 0.80),
    ("q5", "How useful was the feedback from your mentor?", "mentor_quality", 5, 12, False, 0.90),
    ("q6", "How well did your tasks match your skills?", "task_fit", 5, 12, False, 0.80),
    ("q7", "How would you rate your satisfaction with the internship?", "overall_satisfaction", 5, 10, False, 0.90),
    ("q8", "How many hours did you work in a typical week?", "workload_hours", 4, 10, False, 0.60),
    ("q9", "How manageable was your workload?", "workload_perception", 5, 11, False, 0.70),
    ("q10", "How much did you improve technically?", "technical_learning", 5, 12, False, 0.90),
    ("q11", "How adequate were the tools and systems you were given?", "infrastructure", 5, 12, False, 0.60),
    ("q12", "How clear was communication inside your team?", "communication", 5, 11, False, 0.70),
    ("q13", "Would you recommend this internship to a junior?", "recommend", 3, 8, True, 0.90),
    ("q14", "Would you accept a pre-placement offer from this company?", "ppo_interest", 3, 9, False, 0.70),
    ("q15", "What was your work mode?", "work_mode", 3, 7, False, 0.40),
    ("q16", "How fair was the stipend for the work done?", "stipend", 5, 10, False, 0.50),
]
Q = len(BANK)
K_OPT = np.array([b[3] for b in BANK])
SEC = np.array([b[4] for b in BANK], dtype=float)
REQ = np.array([b[5] for b in BANK])
REL = np.array([b[6] for b in BANK])
TARGET = [b[2] for b in BANK]
TARGETS = sorted(set(TARGET), key=TARGET.index)
MAXK = int(K_OPT.max())

# ------------------------------------------------------- respondent generator
CLASS_P = np.array([0.35, 0.25, 0.25, 0.15])
#                    mentor workload learning environment
CLASS_MU = np.array([[1.0, 0.0, 1.0, 0.5],     # engaged and well mentored
                     [0.0, 1.2, 0.3, -0.3],    # overloaded
                     [-0.8, -1.0, -1.0, 0.0],  # under-utilised
                     [0.0, 0.3, -0.5, -1.2]])  # blocked by infrastructure
DEPT_P = np.array([[.40, .30, .20, .10], [.20, .40, .25, .15], [.25, .25, .25, .25], [.15, .20, .30, .35]])
MODE_P = np.array([[.5, .3, .2], [.6, .3, .1], [.2, .3, .5], [.3, .2, .5]])


def ordinal(x, k):
    cuts = np.linspace(-1.1, 1.1, k + 1)[1:-1]
    return np.searchsorted(cuts, x)


def generate(n, rng, synthetic=False):
    """Return (answers n x Q, class labels). synthetic=True imitates the known
    weaknesses of LLM-simulated respondents: less spread, a positivity shift,
    uniform persona mix."""
    cp = np.ones(4) / 4 if synthetic else CLASS_P
    c = rng.choice(4, size=n, p=cp)
    mu = CLASS_MU[c] * (0.6 if synthetic else 1.0)
    sd = 0.30 if synthetic else 0.50
    T = mu + rng.normal(0, sd, size=(n, 4))
    if synthetic:
        T[:, [0, 2]] += 0.35
    M, W, L, E = T.T
    noise = 0.30 if synthetic else 0.45
    nz = lambda: rng.normal(0, noise, n)
    S = 0.35 * M - 0.25 * W + 0.40 * L + 0.25 * E + rng.normal(0, 0.3 if not synthetic else 0.2, n)
    X = np.zeros((n, Q), dtype=int)
    X[:, 0] = [rng.choice(4, p=DEPT_P[ci]) for ci in c]
    X[:, 1] = ordinal(0.3 * L + rng.normal(0, 0.9, n), 4)
    X[:, 2] = ordinal(S + nz(), 5)
    X[:, 3] = ordinal(M + nz(), 4)
    X[:, 4] = ordinal(M + nz(), 5)
    X[:, 5] = ordinal(0.6 * L + 0.3 * M + nz(), 5)
    X[:, 6] = ordinal(S + rng.normal(0, 0.25, n), 5)
    X[:, 7] = ordinal(W + nz(), 4)
    X[:, 8] = ordinal(-W + 0.2 * M + nz(), 5)
    X[:, 9] = ordinal(L + nz(), 5)
    X[:, 10] = ordinal(E + nz(), 5)
    X[:, 11] = ordinal(0.5 * M + 0.5 * E + nz(), 5)
    X[:, 12] = ordinal(S + nz(), 3)
    X[:, 13] = ordinal(0.6 * S + 0.4 * L + nz(), 3)
    X[:, 14] = [rng.choice(3, p=MODE_P[ci]) for ci in c]
    X[:, 15] = ordinal(0.2 * E + rng.normal(0, 1.0, n), 5)
    return X, c


# --------------------------------------------------------- latent class model
class LCM:
    """Latent class model fitted with weighted EM. theta[q, k, a] = P(answer a | class k)."""

    def __init__(self, K=6):
        self.K = K
        self.pi = np.ones(K) / K
        self.theta = np.zeros((Q, K, MAXK))
        for q in range(Q):
            self.theta[q, :, :K_OPT[q]] = 1.0 / K_OPT[q]

    def fit(self, X, w=None, iters=80, seed=0):
        if X is None or len(X) == 0:
            return self
        rng = np.random.default_rng(seed)
        n = len(X)
        w = np.ones(n) if w is None else w
        R = rng.dirichlet(np.ones(self.K), size=n)
        onehot = np.zeros((n, Q, MAXK))
        onehot[np.arange(n)[:, None], np.arange(Q)[None, :], X] = 1
        for _ in range(iters):
            Rw = R * w[:, None]
            self.pi = (Rw.sum(0) + 1) / (Rw.sum() + self.K)
            cnt = np.einsum("nk,nqa->qka", Rw, onehot) + 0.5
            for q in range(Q):
                cnt[q, :, K_OPT[q]:] = 0
            self.theta = cnt / cnt.sum(2, keepdims=True)
            logp = np.log(self.pi)[None, :] + np.einsum("nqa,qka->nk", onehot, np.log(self.theta + 1e-12))
            logp -= logp.max(1, keepdims=True)
            R = np.exp(logp)
            R /= R.sum(1, keepdims=True)
        return self

    def posterior(self, answers):
        lp = np.log(self.pi).copy()
        for q, a in answers.items():
            lp += np.log(self.theta[q, :, a] + 1e-12)
        lp -= lp.max()
        p = np.exp(lp)
        return p / p.sum()

    def predictive(self, post):
        return np.einsum("k,qka->qa", post, self.theta)


def entropy(P, axis=-1):
    return -(P * np.log(P + 1e-12)).sum(axis)


def nmi_matrix(X):
    n = len(X)
    M = np.zeros((Q, Q))
    for i in range(Q):
        for j in range(Q):
            if i == j:
                continue
            J = np.zeros((K_OPT[i], K_OPT[j])) + 0.5
            np.add.at(J, (X[:, i], X[:, j]), 1)
            J /= J.sum()
            pi, pj = J.sum(1), J.sum(0)
            mi = (J * np.log(J / np.outer(pi, pj))).sum()
            M[i, j] = mi / max(1e-9, min(entropy(pi), entropy(pj)))
    return M


# ---------------------------------------------------------------- the engine
CFG = dict(alpha=0.40, beta=0.15, gamma=0.20, delta=0.10, eps=0.30,
           max_questions=10, max_seconds=240, min_coverage=0.80, conf=0.70, stop_gain=0.10)


class AdaptiveEngine:
    def __init__(self, model, nmi, cfg=CFG):
        self.m, self.nmi, self.c = model, nmi, cfg

    def covered(self, answers, pred):
        cov = {TARGET[q] for q in answers}
        for q in range(Q):
            if q not in answers and pred[q, :K_OPT[q]].max() >= self.c["conf"]:
                cov.add(TARGET[q])
        return cov

    def score(self, answers):
        """Return (utility per candidate, info-gain fraction of best) for unanswered questions."""
        post = self.m.posterior(answers)
        pred = self.m.predictive(post)
        H_now = entropy(pred)                         # Q
        open_q = [q for q in range(Q) if q not in answers]
        cov = self.covered(answers, pred)
        eig = np.zeros(Q)
        for q in open_q:
            pa = pred[q, :K_OPT[q]]
            post_a = post[None, :] * self.m.theta[q, :, :K_OPT[q]].T        # A x K
            post_a /= post_a.sum(1, keepdims=True)
            P_t = np.einsum("ak,tkm->atm", post_a, self.m.theta)              # A x Q x M
            H_after = (pa[:, None] * entropy(P_t)).sum(0)                     # Q
            others = [t for t in open_q if t != q]
            eig[q] = (H_now[others] - H_after[others]).sum() + H_now[q]
        denom = sum(math.log(K_OPT[t]) for t in open_q)
        best_frac = max(eig[open_q]) / denom if open_q else 0
        ig = eig / (max(eig[open_q]) + 1e-12) if open_q else eig
        coverage = np.array([0.0 if TARGET[q] in cov else 1.0 for q in range(Q)])
        burden = SEC / SEC.max()
        asked = list(answers)
        red = np.array([max([self.nmi[q, j] for j in asked], default=0.0) for q in range(Q)])
        c = self.c
        u = c["alpha"] * ig + c["beta"] * REL + c["gamma"] * coverage - c["delta"] * burden - c["eps"] * red
        util = {q: u[q] for q in open_q}
        return util, best_frac, cov, pred

    def should_stop(self, answers, elapsed, best_frac, cov):
        c = self.c
        if len(answers) >= c["max_questions"] or elapsed >= c["max_seconds"]:
            return True
        if not all(q in answers for q in range(Q) if REQ[q]):
            return False
        return len(cov) / len(TARGETS) >= c["min_coverage"] and best_frac < c["stop_gain"]

    def next_question(self, answers, elapsed):
        util, best_frac, cov, pred = self.score(answers)
        if not util or self.should_stop(answers, elapsed, best_frac, cov):
            return None, pred
        # mandatory questions act as anchors: they are asked first, in form order,
        # and give the model its initial evidence about the respondent
        missing_req = [q for q in sorted(util) if REQ[q]]
        if missing_req:
            return missing_req[0], pred
        return max(util, key=util.get), pred


# ----------------------------------------------------------------- simulation
H0, TSCALE = 0.0011, 90.0          # dropout hazard per second, grows with elapsed time


def cum_hazard(t):
    return H0 * (t + t * t / (2 * TSCALE))


def run_static(x, patience, tmul, order=range(Q), skip=None):
    answers, t = {}, 0.0
    for q in order:
        if skip and skip(q, answers):
            continue
        t_new = t + SEC[q] * tmul[q]
        if cum_hazard(t_new) > patience:
            return answers, t_new, False
        t = t_new
        answers[q] = x[q]
    return answers, t, True


def rule_skip(q, ans):
    # typical hand-written branching
    if q == 4 and ans.get(3) == 0:            # never met mentor -> skip mentor feedback
        return True
    if q in (8, 10) and ans.get(2, 0) >= 3:   # satisfied -> skip workload / tools probes
        return True
    if q == 8 and ans.get(7) == 0:            # very low hours -> skip workload feeling
        return True
    if q == 6:                                 # designer removed nothing; q7 still asked
        return False
    return False


def run_adaptive(engine, x, patience, tmul):
    answers, t = {}, 0.0
    while True:
        q, pred = engine.next_question(answers, t)
        if q is None:
            return answers, t, True, pred
        t_new = t + SEC[q] * tmul[q]
        if cum_hazard(t_new) > patience:
            pred = engine.m.predictive(engine.m.posterior(answers))
            return answers, t_new, False, pred
        t = t_new
        answers[q] = x[q]


def target_coverage(x, answers, pred=None):
    """Fraction of information targets whose true value is known (asked, or
    predicted correctly when pred is given)."""
    known = set()
    for q in range(Q):
        if q in answers:
            known.add(TARGET[q])
        elif pred is not None and int(pred[q, :K_OPT[q]].argmax()) == x[q]:
            known.add(TARGET[q])
    return len(known) / len(TARGETS)


def redundant_count(answers, nmi, thr=0.35):
    asked = list(answers)
    return sum(1 for i, q in enumerate(asked) if any(nmi[q, j] > thr for j in asked[:i]))


def evaluate_systems(seed, n_train=3000, n_test=1500):
    rng = np.random.default_rng(seed)
    Xtr, _ = generate(n_train, rng)
    Xte, _ = generate(n_test, rng)
    big, _ = generate(20000, rng)
    nmi_true = nmi_matrix(big)
    model = LCM(6).fit(Xtr, seed=seed)
    eng = AdaptiveEngine(model, nmi_matrix(Xtr))
    patience = rng.exponential(1.0, n_test)
    tmul = rng.lognormal(0, 0.25, size=(n_test, Q))
    res = {k: dict(q=[], t=[], done=[], cov=[], cov_imp=[], red=[], acc=[], acc1=[], qorder=[]) for k in ("static", "rule", "adaptive")}
    for i in range(n_test):
        x = Xte[i]
        for name in ("static", "rule", "adaptive"):
            if name == "adaptive":
                a, t, done, pred = run_adaptive(eng, x, patience[i], tmul[i])
            else:
                a, t, done = run_static(x, patience[i], tmul[i], skip=rule_skip if name == "rule" else None)
                pred = None
            r = res[name]
            r["q"].append(len(a)); r["t"].append(t); r["done"].append(done)
            r["cov"].append(target_coverage(x, a))
            r["cov_imp"].append(target_coverage(x, a, pred))
            r["red"].append(redundant_count(a, nmi_true))
            if name == "adaptive":
                miss = [q for q in range(Q) if q not in a]
                if miss:
                    p = np.array([int(pred[q, :K_OPT[q]].argmax()) for q in miss])
                    r["acc"].append(float(np.mean(p == x[miss])))
                    r["acc1"].append(float(np.mean(np.abs(p - x[miss]) <= 1)))
                if i < 400:
                    r["qorder"].append(list(a.keys()))
    out = {}
    for name, r in res.items():
        q = np.array(r["q"]); cov_imp = np.array(r["cov_imp"])
        out[name] = dict(
            questions=float(q.mean()), seconds=float(np.mean(r["t"])),
            completion=float(np.mean(r["done"])), coverage=float(np.mean(r["cov"])),
            coverage_with_imputation=float(cov_imp.mean()),
            redundant=float(np.mean(r["red"])),
            targets_per_question=float(np.mean(cov_imp * len(TARGETS) / np.maximum(q, 1))),
            pred_acc=float(np.mean(r["acc"])) if r["acc"] else None,
            pred_acc_pm1=float(np.mean(r["acc1"])) if r["acc1"] else None,
            q_hist=np.bincount(q, minlength=Q + 1).tolist(),
        )
        if name == "adaptive":
            first = [o[0] for o in r["qorder"] if o]
            out[name]["first_question_counts"] = np.bincount(first, minlength=Q).tolist()
            freq = np.zeros(Q)
            for o in r["qorder"]:
                freq[o] += 1
            out[name]["ask_rate"] = (freq / len(r["qorder"])).tolist()
            out[name]["distinct_paths"] = len({tuple(o) for o in r["qorder"]})
    return out


# ---------------------------------------------------------------- cold start
def cold_start(seed, checkpoints=(0, 10, 25, 50, 100, 250), n_syn=300, n_test=600):
    rng = np.random.default_rng(1000 + seed)
    stream, _ = generate(max(checkpoints), rng)
    syn, _ = generate(n_syn, rng, synthetic=True)
    Xte, _ = generate(n_test, rng)
    big, _ = generate(5000, rng)
    patience = np.full(n_test, 1e9)               # no dropout: isolate model quality
    tmul = np.ones((n_test, Q))
    rows = []
    oracle = LCM(6).fit(big, seed=seed)
    for n in list(checkpoints) + ["oracle"]:
        for system in ("A_no_prior", "B_synthetic") if n != "oracle" else ("oracle",):
            if system == "oracle":
                model, data = oracle, big
            elif system == "A_no_prior":
                data = stream[:n]
                model = LCM(6).fit(data, seed=seed) if n > 0 else LCM(6)
            else:
                w_syn = 25.0 / (25.0 + n)
                data = np.vstack([syn, stream[:n]]) if n > 0 else syn
                w = np.concatenate([np.full(n_syn, w_syn), np.ones(n)])
                model = LCM(6).fit(data, w=w, seed=seed)
            nmi = nmi_matrix(data) if len(data) > 1 else np.zeros((Q, Q))
            eng = AdaptiveEngine(model, nmi)
            qs, accs, covs = [], [], []
            for i in range(n_test):
                x = Xte[i]
                a, t, done, pred = run_adaptive(eng, x, patience[i], tmul[i])
                miss = [q for q in range(Q) if q not in a]
                if miss:
                    p = np.array([int(pred[q, :K_OPT[q]].argmax()) for q in miss])
                    accs.append(float(np.mean(np.abs(p - x[miss]) <= 1)))
                qs.append(len(a)); covs.append(target_coverage(x, a, pred))
            rows.append(dict(n_real=n, system=system, questions=float(np.mean(qs)),
                             pred_acc_pm1=float(np.mean(accs)) if accs else None, coverage=float(np.mean(covs))))
    return rows


def agg(list_of_dicts):
    keys = [k for k, v in list_of_dicts[0].items() if isinstance(v, (int, float)) and v is not None]
    return {k: dict(mean=float(np.mean([d[k] for d in list_of_dicts])), sd=float(np.std([d[k] for d in list_of_dicts]))) for k in keys}


if __name__ == "__main__":
    seeds = int(sys.argv[1]) if len(sys.argv) > 1 else 5
    runs = []
    for s in range(seeds):
        r = evaluate_systems(s)
        runs.append(r)
        print("seed", s, {k: round(v["questions"], 2) for k, v in r.items()}, flush=True)
    summary = {name: agg([r[name] for r in runs]) for name in ("static", "rule", "adaptive")}
    summary["adaptive_detail"] = {k: runs[0]["adaptive"][k] for k in ("first_question_counts", "ask_rate", "distinct_paths", "q_hist")}
    summary["static_q_hist"] = runs[0]["static"]["q_hist"]
    summary["rule_q_hist"] = runs[0]["rule"]["q_hist"]
    json.dump(summary, open(os.path.join(OUT, "comparison.json"), "w"), indent=2)
    print(json.dumps({k: {m: round(v["mean"], 3) for m, v in summary[k].items()} for k in ("static", "rule", "adaptive")}, indent=1))

    cs = []
    for s in range(seeds):
        cs += cold_start(s)
        print("cold-start seed", s, flush=True)
    table = {}
    for r in cs:
        key = f'{r["system"]}|{r["n_real"]}'
        table.setdefault(key, []).append(r)
    cs_sum = {k: dict(system=v[0]["system"], n_real=v[0]["n_real"],
                      questions=float(np.mean([x["questions"] for x in v])),
                      pred_acc_pm1=float(np.mean([x["pred_acc_pm1"] for x in v if x["pred_acc_pm1"] is not None])),
                      pred_sd=float(np.std([x["pred_acc_pm1"] for x in v if x["pred_acc_pm1"] is not None])),
                      coverage=float(np.mean([x["coverage"] for x in v]))) for k, v in table.items()}
    json.dump(cs_sum, open(os.path.join(OUT, "cold_start.json"), "w"), indent=2)
    for k, v in cs_sum.items():
        print(k, round(v["questions"], 2), round(v["pred_acc_pm1"], 3), round(v["coverage"], 3))
