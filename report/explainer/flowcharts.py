"""Plain-language flowcharts for the FormForge 2.0 explainer document (matplotlib, 200 dpi PNG)."""
import os
import matplotlib
matplotlib.use("Agg")
import matplotlib.pyplot as plt
from matplotlib.patches import FancyBboxPatch, FancyArrowPatch, Polygon

OUT = os.path.join(os.path.dirname(os.path.abspath(__file__)), "figs")
os.makedirs(OUT, exist_ok=True)
plt.rcParams["font.family"] = "Calibri"
plt.rcParams["font.size"] = 11

INK = "#2b2540"
ACCENT = "#5b3fd1"
C_START = ACCENT      # start / end (filled, white text)
C_STEP = "#ece8fc"    # normal step
C_AI = "#fde8cf"      # AI step
C_DATA = "#dff1e6"    # stored data
C_USER = "#dbe9f6"    # respondent side
C_DEC = "#fff4c2"     # decision


def canvas(w, h):
    fig, ax = plt.subplots(figsize=(w, h))
    ax.set_xlim(0, w * 10); ax.set_ylim(0, h * 10); ax.axis("off")
    return fig, ax


def step(ax, cx, cy, w, h, text, fc=C_STEP, fs=10.5, color=INK, bold=False):
    ax.add_patch(FancyBboxPatch((cx - w / 2, cy - h / 2), w, h, boxstyle="round,pad=0.25,rounding_size=1.2",
                                fc=fc, ec=INK if fc != C_START else C_START, lw=1.0))
    ax.text(cx, cy, text, ha="center", va="center", fontsize=fs, color=color, fontweight="bold" if bold else "normal")


def terminal(ax, cx, cy, w, h, text, fs=10.5):
    step(ax, cx, cy, w, h, text, fc=C_START, fs=fs, color="white", bold=True)


def decision(ax, cx, cy, w, h, text, fs=10):
    ax.add_patch(Polygon([(cx, cy + h / 2), (cx + w / 2, cy), (cx, cy - h / 2), (cx - w / 2, cy)], closed=True,
                         fc=C_DEC, ec=INK, lw=1.0))
    ax.text(cx, cy, text, ha="center", va="center", fontsize=fs, color=INK)


def arrow(ax, x1, y1, x2, y2, label=None, off=(0, 0), rad=0.0, fs=9.5, ls="-", color=INK):
    ax.add_patch(FancyArrowPatch((x1, y1), (x2, y2), arrowstyle="-|>", mutation_scale=13, lw=1.1, color=color, ls=ls,
                                 connectionstyle=f"arc3,rad={rad}"))
    if label:
        ax.text((x1 + x2) / 2 + off[0], (y1 + y2) / 2 + off[1], label, ha="center", va="center", fontsize=fs,
                style="italic", color=ACCENT, bbox=dict(fc="white", ec="none", pad=0.6))


def line(ax, pts):
    xs, ys = zip(*pts)
    ax.plot(xs, ys, color=INK, lw=1.1)


def note(ax, x, y, text, ha="center", fs=9.5):
    ax.text(x, y, text, ha=ha, va="center", fontsize=fs, style="italic", color=ACCENT)


def legend(ax, x, y, items):
    for i, (fc, label) in enumerate(items):
        ax.add_patch(FancyBboxPatch((x + i * 19, y), 3, 2, boxstyle="round,pad=0.1,rounding_size=0.4", fc=fc, ec=INK, lw=0.8))
        ax.text(x + i * 19 + 4.2, y + 1, label, va="center", fontsize=9.5, color=INK)


def save(fig, name):
    fig.savefig(os.path.join(OUT, name), dpi=200, bbox_inches="tight", facecolor="white")
    plt.close(fig)


# 1 ------------------------------------------------------------------ big picture
def big_picture():
    fig, ax = canvas(12, 6)
    ax.text(2, 55, "FORM CREATOR", fontsize=11, fontweight="bold", color=ACCENT)
    xs = [10, 29, 48, 67, 86, 105]
    labels = ["Describe the form\nin plain words", "AI writes a draft\nwith question\nmetadata", "Quality check\nflags weak\nquestions",
              "Edit and save\n(a person\napproves)", "Turn on adaptive\nmode (+ optional\nwarm start)", "Publish and\nshare the link"]
    fills = [C_STEP, C_AI, C_STEP, C_STEP, C_STEP, C_STEP]
    for i, (x, t, f) in enumerate(zip(xs, labels, fills)):
        step(ax, x, 46, 15, 9, t, fc=f, fs=9.3)
        if i < len(xs) - 1:
            arrow(ax, x + 7.8, 46, xs[i + 1] - 7.8, 46)
    ax.text(2, 37, "RESPONDENT", fontsize=11, fontweight="bold", color="#2f6fb0")
    rx = [105, 82, 59]
    rl = ["Opens the link\n(no login)", "Sees one question at a\ntime, only the useful ones", "Finishes in about\na third less time"]
    for i, (x, t) in enumerate(zip(rx, rl)):
        step(ax, x, 29, 19 if i == 1 else 15, 8, t, fc=C_USER, fs=9.3)
    arrow(ax, 105, 41.2, 105, 33.4)
    arrow(ax, 97.2, 29, 91.8, 29); arrow(ax, 72.2, 29, 66.8, 29)
    ax.text(2, 18, "RESULTS", fontsize=11, fontweight="bold", color="#2e7d4f")
    step(ax, 30, 10, 19, 9, "Dashboard, CSV export,\ne-mail and webhook\nworkflows", fc=C_DATA, fs=9.3)
    step(ax, 59, 10, 19, 9, "Answers saved +\nskipped answers predicted\n(clearly labelled)", fc=C_DATA, fs=9.3)
    step(ax, 88, 10, 19, 9, "Insights on open answers\n(names, e-mails masked\nbefore the AI sees them)", fc=C_AI, fs=9.3)
    arrow(ax, 59, 24.7, 59, 14.9)
    arrow(ax, 49.2, 10, 40, 10); arrow(ax, 68.8, 10, 78, 10)
    arrow(ax, 64, 14.9, 78, 24.7, rad=-0.25, ls="--", color=ACCENT)
    ax.text(84, 20, "every 25 responses the model retrains,\nso the questions get smarter", fontsize=9, style="italic", color=ACCENT, ha="left")
    legend(ax, 36, 0.3, [(C_STEP, "creator step"), (C_AI, "uses AI"), (C_USER, "respondent"), (C_DATA, "stored data")])
    save(fig, "f1_big_picture.png")


# 2 ------------------------------------------------------------------ creator flow
def creator_flow():
    fig, ax = canvas(9, 9.4)
    terminal(ax, 45, 90, 22, 5, "Creator wants a new form")
    decision(ax, 45, 79, 26, 9, "Write it\nwith AI?")
    step(ax, 20, 66, 24, 7, "Describe the form,\npick number of questions")
    step(ax, 20, 54, 24, 7, "AI returns a draft\n(checked against a schema,\nrepaired up to 2 times)", fc=C_AI, fs=9.5)
    step(ax, 70, 60, 24, 7, "Build it by hand in the\ndrag-and-drop builder")
    step(ax, 45, 42, 28, 7, "Quality check runs as you type:\nscore, time, list of issues")
    decision(ax, 45, 30, 26, 9, "Happy with\nthe score?")
    step(ax, 75, 30, 20, 7, "Fix flagged questions\n(or Review with AI)", fc=C_AI, fs=9.5)
    step(ax, 45, 19, 24, 6, "Save the form", fc=C_DATA)
    decision(ax, 20, 19, 22, 9, "Use adaptive\nmode?", fs=9.5)
    step(ax, 20, 6.5, 26, 7, "Switch on adaptive mode;\nwarm start if no responses yet", fs=9.5)
    terminal(ax, 62, 6.5, 22, 5, "Publish and share link")
    arrow(ax, 45, 87.5, 45, 83.6)
    arrow(ax, 32, 79, 20, 69.6, "yes", off=(-3, 1))
    arrow(ax, 58, 79, 70, 63.6, "no", off=(3, 1))
    arrow(ax, 20, 62.4, 20, 57.6)
    arrow(ax, 20, 50.4, 38, 45.6)
    arrow(ax, 70, 56.4, 52, 45.6)
    arrow(ax, 45, 38.4, 45, 34.6)
    arrow(ax, 58, 30, 64.8, 30, "no", off=(0, 1.6))
    line(ax, [(75, 33.6), (75, 42), (59.4, 42)]); arrow(ax, 60, 42, 59.4, 42)
    arrow(ax, 45, 25.4, 45, 22.1, "yes", off=(2.5, 0))
    arrow(ax, 32.8, 19, 31.2, 19)
    arrow(ax, 20, 14.4, 20, 10.2, "yes", off=(2.5, 0))
    line(ax, [(9, 19), (4, 19), (4, 1.5), (62, 1.5)]); arrow(ax, 62, 1.5, 62, 3.9)
    note(ax, 6.5, 12, "no")
    arrow(ax, 33.2, 6.5, 50.8, 6.5)
    save(fig, "f2_creator_flow.png")


# 3 ------------------------------------------------------------------ respondent (adaptive) flow
def respondent_flow():
    fig, ax = canvas(9.6, 11)
    terminal(ax, 40, 104, 26, 5, "Respondent opens the link")
    step(ax, 40, 95, 30, 6, "Ask the required questions first", fc=C_USER)
    step(ax, 40, 84.5, 34, 7, "Update the picture of this person:\nwhich group are they likely in?")
    step(ax, 40, 73.5, 34, 7, "Predict the answer to every\nquestion not asked yet")
    decision(ax, 40, 61, 30, 11, "Reached 10 questions\nor 4 minutes?", fs=9.5)
    decision(ax, 40, 45, 34, 13, "Enough known?\n(80% of topics covered\nand little left to learn)", fs=9.5)
    step(ax, 40, 29, 40, 8, "Score every unasked question:\n+ how much it would teach + relevance + new topic\n− time it takes − overlap with earlier answers", fc=C_DEC, fs=9.3)
    step(ax, 40, 17, 30, 6, "Ask the best question", fc=C_USER)
    step(ax, 82, 45, 22, 9, "Save real answers +\npredicted answers\n(with confidence)", fc=C_DATA, fs=9.5)
    terminal(ax, 82, 30, 20, 5, "Thank you page")
    arrow(ax, 40, 101.5, 40, 98.2)
    arrow(ax, 40, 91.8, 40, 88.2)
    arrow(ax, 40, 80.8, 40, 77.2)
    arrow(ax, 40, 69.8, 40, 66.7)
    arrow(ax, 40, 55.4, 40, 51.7, "no", off=(2.5, 0))
    arrow(ax, 40, 38.4, 40, 33.2, "no", off=(2.5, 0))
    arrow(ax, 40, 25, 40, 20.2)
    line(ax, [(55, 61), (82, 61)]); arrow(ax, 82, 61, 82, 49.7)
    note(ax, 68, 62.8, "yes")
    arrow(ax, 57.1, 45, 70.8, 45, "yes", off=(0, 1.6))
    arrow(ax, 82, 40.3, 82, 32.7)
    line(ax, [(25, 17), (6, 17), (6, 84.5)]); arrow(ax, 6, 84.5, 22.8, 84.5)
    note(ax, 9, 50, "answer\nreceived")
    save(fig, "f3_respondent_flow.png")


# 4 ------------------------------------------------------------------ quality check
def quality_flow():
    fig, ax = canvas(10, 4.8)
    step(ax, 9, 34, 15, 8, "Creator types or\nedits a question")
    step(ax, 31, 34, 21, 13, "Instant rules (free):\ndouble-barrelled, leading,\nvague, repeated, hard to read,\ntoo many required, too long,\nobjective not covered", fs=9)
    step(ax, 55, 34, 18, 8, "Score = 100 − penalties\n+ estimated time", fc=C_DATA, fs=9.5)
    step(ax, 82, 34, 22, 9, "Issue list with a suggestion\nfor each; click to jump\nto the question", fs=9.5)
    decision(ax, 82, 14, 20, 11, "Creator clicks\nReview with AI?", fs=9.3)
    step(ax, 44, 14, 30, 10, "AI review: finds reworded duplicates\n(embeddings), removes false alarms,\nadds missed issues, score recomputed", fc=C_AI, fs=9.3)
    arrow(ax, 16.8, 34, 20.2, 34); arrow(ax, 41.8, 34, 45.8, 34); arrow(ax, 64.3, 34, 70.8, 34)
    arrow(ax, 82, 29.3, 82, 19.7)
    arrow(ax, 72, 14, 59.3, 14, "yes", off=(0, 1.6))
    arrow(ax, 52, 19.3, 72, 29.4, "updated list", off=(-4, 1.5), rad=-0.15)
    ax.text(50, 3, "The rules run half a second after the last change, so problems show up while the creator is writing",
            ha="center", fontsize=9.5, style="italic", color=INK)
    save(fig, "f4_quality_flow.png")


# 5 ------------------------------------------------------------------ warm start
def warmstart_flow():
    fig, ax = canvas(10, 4.4)
    xs = [9, 27, 45, 63, 81]
    t = ["New form,\n0 responses", "AI writes N varied\npersonas (happy,\nneutral, unhappy)", "Each persona answers;\noptions shuffled and\nlettered per persona",
         "Letters mapped back;\nanswers that do not\nfit are dropped", "Model trained on\nsynthetic answers\n(stored separately)"]
    f = [C_STEP, C_AI, C_AI, C_STEP, C_DATA]
    for i in range(5):
        step(ax, xs[i], 30, 15, 10, t[i], fc=f[i], fs=9.3)
        if i < 4:
            arrow(ax, xs[i] + 7.8, 30, xs[i + 1] - 7.8, 30)
    step(ax, 65, 9, 38, 9, "Real responses arrive: synthetic weight = 25 / (25 + n)\nfull at 0, half at 25, a fifth at 100", fs=9.3)
    step(ax, 24, 9, 24, 8, "Adaptive mode works from\nthe very first respondent", fc=C_USER, fs=9.5)
    arrow(ax, 81, 24.6, 76, 13.8)
    arrow(ax, 45.7, 9, 36.3, 9)
    save(fig, "f5_warmstart_flow.png")


# 6 ------------------------------------------------------------------ insights + privacy
def insights_flow():
    fig, ax = canvas(11.5, 5.4)
    row1 = [(10, "20 new responses\nor Refresh clicked", C_STEP), (33, "Collect text answers\n(newest 400\nper question)", C_STEP),
            (56, "Mask personal details:\n[EMAIL] [PHONE]\n[PERSON] [AADHAAR] …", C_DATA), (79, "Send in batches of\n40 numbered lines,\nmarked as data only", C_AI),
            (102, "AI returns summary,\ntopics as answer\nnumbers, sentiment", C_AI)]
    for i, (x, t, f) in enumerate(row1):
        step(ax, x, 40, 18, 10, t, fc=f, fs=9.2)
        if i < 4:
            arrow(ax, x + 9.3, 40, row1[i + 1][0] - 9.3, 40)
    row2 = [(102, "Group similar answers\nper question\n(embeddings + k-means)", C_AI), (75, "One call merges topics,\nwrites the summary,\nnames each group", C_AI),
            (48, "Server counts topics and\npicks real quotes from\nthe answer numbers", C_STEP), (21, "Saved and shown on the\nInsights page (display\nonly, never acts)", C_DATA)]
    for i, (x, t, f) in enumerate(row2):
        step(ax, x, 15, 21, 10, t, fc=f, fs=9.2)
        if i < 3:
            arrow(ax, x - 10.8, 15, row2[i + 1][0] + 10.8, 15)
    arrow(ax, 102, 34.6, 102, 20.4)
    ax.text(57, 52.5, "Personal data is removed before anything leaves the server; the AI never writes quotes or counts itself",
            ha="center", fontsize=9.8, style="italic", color=INK)
    ax.text(57, 3, "Runs in the background, so the page never waits; free-tier limits are handled by waiting and retrying",
            ha="center", fontsize=9.5, style="italic", color=INK)
    save(fig, "f6_insights_flow.png")


# 7 ------------------------------------------------------------------ request path
def request_path():
    fig, ax = canvas(10, 3.2)
    xs = [7, 22, 37, 52, 67, 82, 95]
    t = ["Browser\n(Next.js)", "Security headers\n+ CORS", "Rate limit", "Login check\n(JWT cookie)", "Input check\n(zod)", "Role check\n(Owner…Viewer)", "Service →\ndatabase"]
    f = [C_USER, C_STEP, C_STEP, C_STEP, C_STEP, C_STEP, C_DATA]
    for i in range(7):
        step(ax, xs[i], 18, 11.5 if i < 6 else 9, 9, t[i], fc=f[i], fs=9)
        if i < 6:
            arrow(ax, xs[i] + 5.95, 18, xs[i + 1] - (5.95 if i < 5 else 4.7), 18)
    ax.text(50, 4, "Every request takes the same path; anything that fails a check is stopped with a clear error (400, 401, 403 or 429)",
            ha="center", fontsize=9.5, style="italic", color=INK)
    save(fig, "f7_request_path.png")


if __name__ == "__main__":
    big_picture(); creator_flow(); respondent_flow(); quality_flow(); warmstart_flow(); insights_flow(); request_path()
    print("ok", sorted(os.listdir(OUT)))
