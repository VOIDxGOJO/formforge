"""Result charts for Chapter 7 (reads results/*.json written by the experiments)."""
import json, os
import numpy as np
import matplotlib
matplotlib.use("Agg")
import matplotlib.pyplot as plt

HERE = os.path.dirname(os.path.abspath(__file__))
R = os.path.join(HERE, "results")
FIG = os.path.join(HERE, "..", "figures")
plt.rcParams.update({"font.family": "Times New Roman", "font.size": 11, "axes.spines.top": False, "axes.spines.right": False})
COL = {"static": "#9e9e9e", "rule": "#6b8fb5", "adaptive": "#d9822b"}
NAMES = {"static": "Static form", "rule": "Rule-based", "adaptive": "FormForge adaptive"}
load = lambda f: json.load(open(os.path.join(R, f)))


def save(fig, name):
    fig.savefig(os.path.join(FIG, name), dpi=200, bbox_inches="tight", facecolor="white"); plt.close(fig)


def comparison():
    c = load("comparison.json")
    metrics = [("questions", "Questions asked", 1), ("seconds", "Completion time (s)", 1), ("completion", "Completion rate (%)", 100),
               ("coverage_with_imputation", "Information coverage (%)", 100)]
    fig, axs = plt.subplots(1, 4, figsize=(12, 3.4))
    for ax, (m, title, k) in zip(axs, metrics):
        vals = [c[s][m]["mean"] * k for s in ("static", "rule", "adaptive")]
        sds = [c[s][m]["sd"] * k for s in ("static", "rule", "adaptive")]
        bars = ax.bar(range(3), vals, yerr=sds, color=[COL[s] for s in ("static", "rule", "adaptive")], capsize=3, width=0.65)
        for b, v in zip(bars, vals):
            ax.text(b.get_x() + b.get_width() / 2, v * 1.01, f"{v:.1f}", ha="center", va="bottom", fontsize=9.5)
        ax.set_xticks(range(3)); ax.set_xticklabels(["Static", "Rule", "Adaptive"]); ax.set_title(title, fontsize=11)
        ax.set_ylim(0, max(vals) * 1.18)
    fig.tight_layout(); save(fig, "fig7_1_comparison.png")


def histogram():
    c = load("comparison.json")
    fig, ax = plt.subplots(figsize=(7.5, 3.4))
    x = np.arange(17)
    w = 0.28
    for i, (k, lab) in enumerate([("static_q_hist", "static"), ("rule_q_hist", "rule")]):
        h = np.array(c[k]); ax.bar(x + (i - 1) * w, h / h.sum() * 100, w, color=COL[lab], label=NAMES[lab])
    h = np.array(c["adaptive_detail"]["q_hist"]); ax.bar(x + w, h / h.sum() * 100, w, color=COL["adaptive"], label=NAMES["adaptive"])
    ax.set_xlabel("Number of questions answered by a respondent"); ax.set_ylabel("Respondents (%)"); ax.set_xticks(x); ax.legend(frameon=False, fontsize=9.5)
    save(fig, "fig7_2_question_histogram.png")


def ask_rate():
    c = load("comparison.json")
    rate = np.array(c["adaptive_detail"]["ask_rate"]) * 100
    labels = [f"q{i+1}" for i in range(16)]
    fig, ax = plt.subplots(figsize=(8, 3.2))
    cols = ["#d9822b" if i not in (0, 2, 12) else "#7a4a16" for i in range(16)]
    ax.bar(labels, rate, color=cols)
    for i, v in enumerate(rate):
        ax.text(i, v + 1.5, f"{v:.0f}", ha="center", fontsize=8.5)
    ax.set_ylabel("Asked to respondents (%)"); ax.set_ylim(0, 112)
    ax.text(15.4, 104, "dark = required anchor question", ha="right", fontsize=9, style="italic")
    save(fig, "fig7_3_ask_rate.png")


def cold():
    cs = load("cold_start.json")
    ns = [0, 10, 25, 50, 100, 250]
    A = [cs[f"A_no_prior|{n}"]["pred_acc_pm1"] * 100 for n in ns]
    B = [cs[f"B_synthetic|{n}"]["pred_acc_pm1"] * 100 for n in ns]
    Asd = [cs[f"A_no_prior|{n}"]["pred_sd"] * 100 for n in ns]
    Bsd = [cs[f"B_synthetic|{n}"]["pred_sd"] * 100 for n in ns]
    orc = cs["oracle|oracle"]["pred_acc_pm1"] * 100
    fig, ax = plt.subplots(figsize=(7, 3.6))
    xs = np.arange(len(ns))
    ax.errorbar(xs, A, yerr=Asd, marker="o", color="#6b8fb5", label="System A: no prior data", capsize=3)
    ax.errorbar(xs, B, yerr=Bsd, marker="s", color="#d9822b", label="System B: synthetic warm start", capsize=3)
    ax.axhline(orc, ls="--", color="#555555", lw=1); ax.text(0, orc + 0.8, f"oracle model (5000 real responses) = {orc:.1f}%", fontsize=9)
    ax.set_xticks(xs); ax.set_xticklabels([str(n) for n in ns]); ax.set_xlabel("Real responses available for training")
    ax.set_ylabel("Imputation accuracy, within 1 point (%)"); ax.legend(frameon=False, fontsize=9.5, loc="lower right")
    save(fig, "fig7_4_cold_start.png")


def ablation():
    a = load("ablation.json")
    order = ["full", "no_information_gain", "no_redundancy", "no_burden", "no_coverage", "relevance_only"]
    lab = ["Full utility", "without IG", "without Redundancy", "without Burden", "without Coverage", "Relevance only"]
    fig, ax1 = plt.subplots(figsize=(8, 3.4))
    x = np.arange(len(order)); w = 0.38
    cov = [a[o]["coverage"] * 100 for o in order]; acc = [a[o]["pred_acc_pm1"] * 100 for o in order]
    ax1.bar(x - w / 2, cov, w, color="#d9822b", label="Information coverage (%)")
    ax1.bar(x + w / 2, acc, w, color="#6b8fb5", label="Imputation accuracy +-1 (%)")
    for i in range(len(order)):
        ax1.text(i - w / 2, cov[i] + 1, f"{cov[i]:.1f}", ha="center", fontsize=8.5); ax1.text(i + w / 2, acc[i] + 1, f"{acc[i]:.1f}", ha="center", fontsize=8.5)
    ax1.set_xticks(x); ax1.set_xticklabels(lab, fontsize=9.5); ax1.set_ylim(0, 105); ax1.legend(frameon=False, fontsize=9.5, loc="lower left")
    save(fig, "fig7_5_ablation.png")


def quality():
    q = load("quality.json"); p = load("pii.json")
    fig, axs = plt.subplots(1, 2, figsize=(11, 3.4))
    cats = ["double_barrelled", "leading", "ambiguous", "any_issue"]; names = ["Double-barrelled", "Leading", "Ambiguous", "Any issue"]
    x = np.arange(4); w = 0.26
    for i, (m, c) in enumerate([("precision", "#6b8fb5"), ("recall", "#d9822b"), ("f1", "#7a9e5a")]):
        vals = [q[k][m] for k in cats]; axs[0].bar(x + (i - 1) * w, vals, w, color=c, label=m.capitalize() if m != "f1" else "F1")
    axs[0].set_xticks(x); axs[0].set_xticklabels(names); axs[0].set_ylim(0, 1.12); axs[0].legend(frameon=False, ncol=3, fontsize=9.5); axs[0].set_title("(a) Quality analyzer rule layer", fontsize=11)
    types = [t for t in ["EMAIL", "PHONE", "PERSON", "URL", "IP", "AADHAAR", "PAN", "REGNO"] if t in p["per_type"]]
    x = np.arange(len(types))
    axs[1].bar(x - 0.2, [p["per_type"][t]["precision"] for t in types], 0.4, color="#6b8fb5", label="Precision")
    axs[1].bar(x + 0.2, [p["per_type"][t]["recall"] for t in types], 0.4, color="#d9822b", label="Recall")
    axs[1].set_xticks(x); axs[1].set_xticklabels(types, fontsize=9); axs[1].set_ylim(0, 1.12); axs[1].legend(frameon=False, ncol=2, fontsize=9.5); axs[1].set_title("(b) PII detector by entity type", fontsize=11)
    fig.tight_layout(); save(fig, "fig7_6_quality_pii.png")


def gantt():
    tasks = [("Review 1 feedback, repository audit", 0, 1), ("Literature survey (2024-2026 papers)", 0, 2), ("Data model + API contracts", 1, 1),
             ("AIProvider + Gemini provider", 2, 1), ("AI form generation + builder hand-off", 2, 2), ("Form quality analyzer", 3, 2),
             ("Adaptive engine v1 (scoring)", 4, 2), ("Adaptive engine v2 (latent class model)", 5, 2), ("Synthetic respondents + cold start", 6, 2),
             ("Baseline experiments + evaluation", 7, 2), ("PII redaction layer", 8, 1), ("Response intelligence", 8, 2),
             ("Integration + UI", 9, 2), ("Testing, report, presentation", 10, 2)]
    fig, ax = plt.subplots(figsize=(9, 4.6))
    for i, (t, s, d) in enumerate(tasks):
        ax.barh(i, d, left=s, color="#d9822b" if i in (6, 7, 8, 9) else "#6b8fb5", edgecolor="#333333", lw=0.6)
    ax.set_yticks(range(len(tasks))); ax.set_yticklabels([t for t, _, _ in tasks], fontsize=9.5); ax.invert_yaxis()
    ax.set_xticks(range(13)); ax.set_xticklabels([f"W{i+1}" for i in range(13)], fontsize=9); ax.set_xlim(0, 12)
    ax.grid(axis="x", ls=":", alpha=0.6); ax.set_xlabel("Week (July - October 2026)")
    save(fig, "fig6_1_gantt.png")


if __name__ == "__main__":
    for f in (comparison, histogram, ask_rate, cold, ablation, quality, gantt):
        try:
            f(); print("ok", f.__name__)
        except Exception as e:
            print("FAIL", f.__name__, e)
