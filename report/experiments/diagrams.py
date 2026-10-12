"""Design diagrams for the report (matplotlib, Times New Roman, 200 dpi PNG)."""
import os
import matplotlib
matplotlib.use("Agg")
import matplotlib.pyplot as plt
from matplotlib.patches import FancyBboxPatch, FancyArrowPatch, Ellipse, Rectangle

FIG = os.path.join(os.path.dirname(os.path.abspath(__file__)), "..", "figures")
os.makedirs(FIG, exist_ok=True)
plt.rcParams["font.family"] = "Times New Roman"
plt.rcParams["font.size"] = 11

C_UI = "#dbe9f6"; C_API = "#e3f1df"; C_AI = "#fdebd3"; C_DB = "#ece4f5"; C_EXT = "#f2f2f2"; C_NEW = "#fff4c2"
EDGE = "#333333"


def canvas(w, h, x0=0):
    fig, ax = plt.subplots(figsize=(w, h))
    ax.set_xlim(x0, x0 + w * 10); ax.set_ylim(0, h * 10); ax.axis("off")
    return fig, ax


def box(ax, x, y, w, h, text, fc="#ffffff", fs=10.5, bold=False, ls="-", r=0.8):
    ax.add_patch(FancyBboxPatch((x, y), w, h, boxstyle=f"round,pad=0.2,rounding_size={r}", fc=fc, ec=EDGE, lw=1.0, ls=ls))
    ax.text(x + w / 2, y + h / 2, text, ha="center", va="center", fontsize=fs, fontweight="bold" if bold else "normal", wrap=True)


def arrow(ax, x1, y1, x2, y2, text=None, style="-|>", ls="-", fs=9, off=(0, 1.2), color=EDGE, rad=0.0):
    ax.add_patch(FancyArrowPatch((x1, y1), (x2, y2), arrowstyle=style, mutation_scale=12, lw=1.0, color=color, ls=ls,
                                 connectionstyle=f"arc3,rad={rad}"))
    if text:
        ax.text((x1 + x2) / 2 + off[0], (y1 + y2) / 2 + off[1], text, ha="center", va="center", fontsize=fs, style="italic",
                bbox=dict(fc="white", ec="none", pad=0.5))


def save(fig, name):
    fig.savefig(os.path.join(FIG, name), dpi=200, bbox_inches="tight", facecolor="white")
    plt.close(fig)


# 1 ----------------------------------------------------------- static vs adaptive
def static_vs_adaptive():
    fig, ax = canvas(10, 4.6)
    ax.text(22, 43, "(a) Conventional static form", ha="center", fontsize=12, fontweight="bold")
    ax.text(72, 43, "(b) FormForge adaptive form", ha="center", fontsize=12, fontweight="bold")
    for i in range(8):
        y = 37 - i * 4.6
        box(ax, 17, y, 10, 3, f"Q{i+1}", fc=C_EXT, fs=10)
        if i < 7:
            arrow(ax, 22, y, 22, y - 1.4)
    ax.text(22, -0.5, "Every respondent answers all questions", ha="center", fontsize=10, style="italic")
    seq = [("Q1 (anchor)", C_NEW), ("Score open questions", C_AI), ("Q5", C_NEW), ("Score open questions", C_AI), ("Q3", C_NEW), ("Stop rule met?", C_AI), ("Submit + predict rest", C_API)]
    for i, (t, c) in enumerate(seq):
        y = 37 - i * 5.3
        box(ax, 60, y, 24, 3.4, t, fc=c, fs=10)
        if i < len(seq) - 1:
            arrow(ax, 72, y, 72, y - 1.9)
    arrow(ax, 84.5, 37 - 5 * 5.3 + 1.7, 84.5, 37 - 1 * 5.3 + 1.7, text="no", rad=-0.5, off=(6, 0))
    ax.text(72, -0.5, "Each respondent follows a different, shorter path", ha="center", fontsize=10, style="italic")
    save(fig, "fig1_1_static_vs_adaptive.png")


# 2 ----------------------------------------------------------- system architecture
def architecture():
    fig, ax = canvas(11, 8.4)
    # client tier
    box(ax, 3, 72, 104, 10, "", fc="#f7fbff", r=1.2)
    ax.text(5, 80.3, "Presentation tier - apps/web (Next.js 14, React 18, TypeScript)", fontsize=10.5, fontweight="bold", ha="left")
    for i, t in enumerate(["Dashboard &\nAnalytics", "Form Builder\n(dnd-kit, Zustand)", "AI Generate +\nQuality Report", "Adaptive Public\nForm /f/[slug]", "Response\nInsights"]):
        box(ax, 6 + i * 20.5, 73.5, 17.5, 5.6, t, fc=C_UI if i in (0, 1) else C_NEW, fs=9.5)
    arrow(ax, 55, 72, 55, 66.5, text="REST (JSON, cookies)  +  SSE", style="<|-|>", off=(0, 0))
    # API tier
    box(ax, 3, 24, 104, 42, "", fc="#fbfdf9", r=1.2)
    ax.text(5, 63.8, "Application tier - apps/api (Node.js, Express, TypeScript)", fontsize=10.5, fontweight="bold", ha="left")
    box(ax, 6, 56, 98, 5, "Middleware: helmet  |  CORS  |  rate limiter  |  JWT authenticate  |  zod validate  |  RBAC authorize", fc=C_API, fs=9.5)
    box(ax, 6, 48, 98, 5.5, "Controllers  ->  Services  ->  Repositories (Prisma)", fc=C_API, fs=10)
    core = ["Auth &\nWorkspaces", "Forms &\nSubmissions", "Workflows &\nWebhooks", "SSE\nManager"]
    for i, t in enumerate(core):
        box(ax, 6 + i * 12.6, 38, 11, 7, t, fc=C_API, fs=9)
    ai = ["AI Form\nGenerator", "Quality\nAnalyzer", "Adaptive\nEngine", "Cold-start\nSimulator", "PII\nRedactor", "Response\nIntelligence"]
    for i, t in enumerate(ai):
        box(ax, 57 + (i % 3) * 16, 38 - (i // 3) * 8.6, 14, 6.2, t, fc=C_NEW, fs=9)
    ax.text(80.5, 46.2, "Intelligence services (FormForge 2.0)", ha="center", fontsize=9.5, style="italic")
    box(ax, 6, 27, 48, 7, "node-cron webhook retry job (every 60 s)\nHMAC-SHA256 signed deliveries", fc=C_API, fs=9)
    box(ax, 57, 25.2, 46, 2.4, "AIProvider interface", fc=C_AI, fs=9.5, bold=True)
    # data tier
    box(ax, 6, 6, 30, 10, "PostgreSQL 16\n(Prisma ORM, JSONB fields)", fc=C_DB, fs=10)
    box(ax, 41, 6, 28, 10, "Google Gemini API (free tier)\ngemini-flash-lite-latest\ngemini-embedding-001", fc=C_AI, fs=9.5)
    box(ax, 74, 6, 30, 10, "Alternatives via AI_PROVIDER\nOllama on localhost (no data\nleaves) or OpenAI", fc=C_EXT, fs=9.5, ls="--")
    ax.text(40, 19.5, "Data and inference tier", fontsize=10.5, fontweight="bold", ha="left")
    arrow(ax, 21, 24, 21, 16.5, text="SQL", off=(3, 0))
    arrow(ax, 70, 25, 55, 16.5, text="HTTPS, masked text", off=(10, 1))
    arrow(ax, 90, 25, 89, 16.5, text="config", ls="--", off=(3, 0))
    save(fig, "fig4_1_architecture.png")


# 3 ----------------------------------------------------------- provider abstraction
def provider():
    fig, ax = canvas(9, 4.4)
    box(ax, 30, 34, 30, 7, "Intelligence services\n(generator, analyzer, insights)", fc=C_NEW)
    box(ax, 30, 22, 30, 7.5, "<<interface>> AIProvider\ngenerateStructured(schema, prompt)\nembed(texts)", fc=C_AI, fs=10)
    box(ax, 27, 11.5, 36, 7, "OpenAICompatibleProvider\nstructure-only JSON schema, zod check,\nrepair loop, retry on 500/503", fc=C_AI, fs=9.5)
    box(ax, 2, 1.5, 26, 6.5, "gemini  (DEFAULT)\nfree tier, no cost", fc=C_AI, fs=9.5)
    box(ax, 32, 1.5, 26, 6.5, "ollama\nlocal, no data leaves", fc=C_EXT, fs=9.5, ls="--")
    box(ax, 62, 1.5, 26, 6.5, "openai\npaid API", fc=C_EXT, fs=9.5, ls="--")
    arrow(ax, 45, 34, 45, 29.8)
    arrow(ax, 45, 22, 45, 18.8, text="implements", off=(6, 0))
    for x in (15, 45, 75):
        arrow(ax, 45, 11.5, x, 8.2, ls="-" if x == 15 else "--")
    ax.text(45, -1.8, "AI_PROVIDER picks the endpoint; every input passes PII redaction first", ha="center", fontsize=9.5, style="italic")
    save(fig, "fig4_2_provider.png")


# 4 ----------------------------------------------------------- generation pipeline
def generation_flow():
    fig, ax = canvas(11, 3.2)
    steps = [("Creator prompt\n+ objective", C_UI), ("Prompt builder\n(JSON schema)", C_AI), ("LLM (Gemini,\nfree tier)", C_AI), ("zod validation\n+ repair retry", C_API),
             ("Quality\nAnalyzer", C_NEW), ("Preview &\nedit in builder", C_UI), ("Creator\napproves", C_UI), ("Form saved\n(Prisma)", C_DB)]
    w = 11.6
    for i, (t, c) in enumerate(steps):
        x = 2 + i * (w + 2)
        box(ax, x, 12, w, 9, t, fc=c, fs=9.5)
        if i < len(steps) - 1:
            arrow(ax, x + w + 0.2, 16.5, x + w + 1.8, 16.5)
    arrow(ax, 2 + 3 * 13.6 + 5, 12, 2 + 2 * 13.6 + 5, 12, text="invalid JSON -> re-prompt (max 2)", rad=0.5, off=(0, -6), fs=9)
    ax.text(55, 28, "AI produces a proposal only; nothing is written to the database without human approval", ha="center", fontsize=10, style="italic")
    save(fig, "fig4_3_generation_flow.png")


# 5 ----------------------------------------------------------- adaptive engine loop
def engine_flow():
    fig, ax = canvas(7.4, 8, x0=27)
    box(ax, 30, 72, 30, 6, "Respondent opens /f/[slug]", fc=C_UI)
    box(ax, 30, 62, 30, 6, "Create AdaptiveSession\nload model snapshot", fc=C_API)
    box(ax, 30, 50, 30, 7, "Unanswered required\n(anchor) question?", fc=C_AI)
    box(ax, 66, 51, 22, 5, "Ask next anchor", fc=C_NEW)
    box(ax, 30, 38, 30, 7, "Update class posterior P(z | answers)\nposterior predictive per question", fc=C_API, fs=9.5)
    box(ax, 30, 26, 30, 7, "Stop rule: required done AND\ncoverage >= 80% AND gain < 0.10,\nor 10 questions / 240 s", fc=C_AI, fs=9.5)
    box(ax, 66, 26, 22, 7, "Score every open q:\nU = aIG + bRel + gCov\n- dBurden - eRed", fc=C_NEW, fs=9.5)
    box(ax, 66, 13, 22, 6, "Ask argmax U", fc=C_NEW)
    box(ax, 30, 13, 30, 7, "Submit answers + imputed values\n(flagged as predicted)", fc=C_DB, fs=9.5)
    box(ax, 30, 2, 30, 6, "Refit model in background\n(real data replaces synthetic)", fc=C_API, fs=9.5)
    arrow(ax, 45, 72, 45, 68.2); arrow(ax, 45, 62, 45, 57.2)
    arrow(ax, 60, 53.5, 65.8, 53.5, text="yes", off=(0, 1.3))
    arrow(ax, 45, 50, 45, 45.2, text="no", off=(2, 0))
    arrow(ax, 45, 38, 45, 33.2)
    arrow(ax, 60, 29.5, 65.8, 29.5, text="not met", off=(0, 1.5))
    arrow(ax, 77, 26, 77, 19.2)
    arrow(ax, 45, 26, 45, 20.2, text="met", off=(2.5, 0))
    arrow(ax, 45, 13, 45, 8.2)
    # answer loops back
    ax.plot([88.2, 92, 92, 62], [16, 16, 41.5, 41.5], color=EDGE, lw=1)
    arrow(ax, 62, 41.5, 60.2, 41.5)
    ax.plot([88.2, 92], [53.5, 53.5], color=EDGE, lw=1); ax.plot([92, 92], [53.5, 41.5], color=EDGE, lw=1)
    ax.text(93, 30, "answer\nreceived", fontsize=9, style="italic")
    save(fig, "fig4_4_engine_flow.png")


# 6 ----------------------------------------------------------- ER diagram
def er():
    fig, ax = canvas(11.5, 8.4)
    ents = {
        "User": (2, 66, ["id PK", "email UQ", "passwordHash", "name"]),
        "Membership": (26, 66, ["id PK", "userId FK", "workspaceId FK", "role (enum)"]),
        "Workspace": (50, 66, ["id PK", "name", "slug UQ"]),
        "InviteToken": (74, 66, ["id PK", "workspaceId FK", "email, token", "role, expiresAt"]),
        "RefreshToken": (2, 44, ["id PK", "userId FK", "token UQ", "expiresAt"]),
        "Form": (50, 36, ["id PK", "workspaceId FK", "name, slug UQ", "objective", "fields JSONB*", "adaptiveConfig JSONB", "isActive"]),
        "Submission": (50, 6, ["id PK", "formId FK", "responses JSONB", "imputed JSONB", "sessionId FK"]),
        "Workflow": (74, 42, ["id PK", "formId FK", "name, isActive"]),
        "WorkflowStep": (96, 40, ["id PK", "workflowId FK", "actionType", "actionConfig"]),
        "WebhookDelivery": (74, 6, ["id PK", "workflowStepId FK", "submissionId FK", "status, attemptCount", "nextRetryAt"]),
        "QualityReport": (74, 26, []),
        "AdaptiveSession": (26, 6, ["id PK", "formId FK", "askedOrder[]", "posterior[]", "status"]),
        "ModelSnapshot": (2, 6, ["id PK", "formId FK", "pi, theta JSONB", "nReal, nSynthetic"]),
        "ResponseInsight": (26, 24, ["id PK", "formId FK", "summary, topics", "sentiment, clusters"]),
    }
    ents["QualityReport"] = (74, 26, [])
    new = {"QualityReport", "AdaptiveSession", "ModelSnapshot", "ResponseInsight"}
    ents.pop("QualityReport")
    ents["QualityReport"] = (26, 41, ["id PK", "formId FK", "score", "issues JSONB"])
    pos = {}
    for name, (x, y, attrs) in ents.items():
        h = 3 + 2.3 * len(attrs)
        w = 18
        fc = C_NEW if name in new else C_DB
        ax.add_patch(Rectangle((x, y), w, h, fc="white", ec=EDGE, lw=1))
        ax.add_patch(Rectangle((x, y + h - 3), w, 3, fc=fc, ec=EDGE, lw=1))
        ax.text(x + w / 2, y + h - 1.5, name, ha="center", va="center", fontsize=9.5, fontweight="bold")
        for i, a in enumerate(attrs):
            ax.text(x + 0.8, y + h - 4.6 - i * 2.3, a, fontsize=8.3, va="center")
        pos[name] = (x, y, w, h)

    def link(a, b, la="1", lb="N"):
        xa, ya, wa, ha = pos[a]; xb, yb, wb, hb = pos[b]
        ca = (xa + wa / 2, ya + ha / 2); cb = (xb + wb / 2, yb + hb / 2)
        # attach to nearest edges
        def edge_pt(x, y, w, h, tx, ty):
            cx, cy = x + w / 2, y + h / 2
            dx, dy = tx - cx, ty - cy
            if abs(dx) * h > abs(dy) * w:
                return (x + w if dx > 0 else x, cy)
            return (cx, y + h if dy > 0 else y)
        pa = edge_pt(xa, ya, wa, ha, *cb); pb = edge_pt(xb, yb, wb, hb, *ca)
        ax.plot([pa[0], pb[0]], [pa[1], pb[1]], color=EDGE, lw=0.9)
        ax.text(pa[0] + (pb[0] - pa[0]) * 0.12, pa[1] + (pb[1] - pa[1]) * 0.12 + 0.9, la, fontsize=8.5, color="#a00000")
        ax.text(pa[0] + (pb[0] - pa[0]) * 0.88, pa[1] + (pb[1] - pa[1]) * 0.88 + 0.9, lb, fontsize=8.5, color="#a00000")

    link("User", "Membership"); link("Workspace", "Membership"); link("Workspace", "InviteToken")
    link("User", "RefreshToken"); link("Workspace", "Form"); link("Form", "Submission"); link("Form", "Workflow")
    link("Workflow", "WorkflowStep"); link("WorkflowStep", "WebhookDelivery"); link("Submission", "WebhookDelivery")
    link("Form", "QualityReport"); link("AdaptiveSession", "Submission", "1", "1")
    link("ModelSnapshot", "AdaptiveSession"); link("Form", "ResponseInsight")
    ax.add_patch(Rectangle((97, 72), 3, 2, fc=C_DB, ec=EDGE)); ax.text(101, 73, "existing model", fontsize=8.5, va="center")
    ax.add_patch(Rectangle((97, 76), 3, 2, fc=C_NEW, ec=EDGE)); ax.text(101, 77, "added in 2.0", fontsize=8.5, va="center")
    ax.text(96, 64, "* each field carries objective,\n  informationTarget,\n  estimatedSeconds, relevance", fontsize=8.3, va="center")
    save(fig, "fig4_5_er.png")


# 7 ----------------------------------------------------------- use case
def usecase():
    fig, ax = canvas(10, 7.4)
    ax.add_patch(Rectangle((22, 2), 56, 70, fc="#fcfcfc", ec=EDGE, lw=1.1))
    ax.text(50, 69.5, "FormForge 2.0", ha="center", fontsize=11.5, fontweight="bold")

    def actor(x, y, name):
        ax.add_patch(Ellipse((x, y + 7), 3, 3, fc="white", ec=EDGE))
        ax.plot([x, x], [y + 5.5, y + 1.5], color=EDGE); ax.plot([x - 2.5, x + 2.5], [y + 4.3, y + 4.3], color=EDGE)
        ax.plot([x, x - 2], [y + 1.5, y - 1.5], color=EDGE); ax.plot([x, x + 2], [y + 1.5, y - 1.5], color=EDGE)
        ax.text(x, y - 3.2, name, ha="center", va="top", fontsize=10)
        return (x, y + 3)
    cr = actor(9, 42, "Form creator\n(Owner/Admin/Member)")
    vw = actor(9, 12, "Viewer")
    rs = actor(91, 46, "Respondent")
    ol = actor(91, 14, "LLM provider\n(Gemini)")
    uc = {
        "Generate form with AI": (50, 63), "Run quality analysis": (50, 56.5), "Edit and approve form": (50, 50),
        "Configure adaptive mode": (50, 43.5), "Warm-start with synthetic\nrespondents": (50, 36.5),
        "Answer adaptive form": (50, 29.5), "View response insights": (50, 22.5), "Export CSV / workflows": (50, 15.5),
        "Manage workspace & roles": (50, 8.5),
    }
    for t, (x, y) in uc.items():
        ax.add_patch(Ellipse((x, y), 34, 5.6, fc=C_NEW if "AI" in t or "quality" in t or "adaptive" in t.lower() or "synthetic" in t or "insights" in t else C_API, ec=EDGE))
        ax.text(x, y, t, ha="center", va="center", fontsize=9.3)
    for t in ["Generate form with AI", "Run quality analysis", "Edit and approve form", "Configure adaptive mode", "Warm-start with synthetic\nrespondents", "View response insights", "Export CSV / workflows", "Manage workspace & roles"]:
        x, y = uc[t]; ax.plot([cr[0] + 2.5, x - 17], [cr[1], y], color=EDGE, lw=0.7)
    for t in ["View response insights", "Export CSV / workflows"]:
        x, y = uc[t]; ax.plot([vw[0] + 2.5, x - 17], [vw[1], y], color=EDGE, lw=0.7)
    x, y = uc["Answer adaptive form"]; ax.plot([rs[0] - 2.5, x + 17], [rs[1], y], color=EDGE, lw=0.7)
    for t in ["Generate form with AI", "Run quality analysis", "Warm-start with synthetic\nrespondents", "View response insights"]:
        x, y = uc[t]; ax.plot([ol[0] - 2.5, x + 17], [ol[1], y], color=EDGE, lw=0.7, ls="--")
    save(fig, "fig4_6_usecase.png")


# 8 ----------------------------------------------------------- sequence diagram
def sequence():
    fig, ax = canvas(11, 7.6)
    parts = ["Respondent", "Next.js page", "Express API", "AdaptiveEngine", "PostgreSQL"]
    xs = [8, 30, 52, 74, 96]
    for x, p in zip(xs, parts):
        box(ax, x - 8, 68, 16, 5, p, fc=C_UI if x < 40 else (C_API if x < 60 else (C_NEW if x < 85 else C_DB)), fs=10)
        ax.plot([x, x], [2, 68], color="#777777", lw=0.8, ls="--")
    msgs = [(0, 1, "open /f/slug", 64), (1, 2, "POST /public/forms/:slug/sessions", 60), (2, 4, "load form + ModelSnapshot", 56),
            (2, 3, "next(session)", 52), (3, 2, "q1 (anchor)", 48), (2, 1, "{question}", 44), (0, 1, "answer", 40),
            (1, 2, "POST /sessions/:id/answers", 36), (2, 3, "update posterior, score U(q)", 32), (3, 2, "argmax U or STOP", 28),
            (2, 1, "next question ... (loop)", 24), (1, 2, "POST /sessions/:id/complete", 18), (2, 4, "Submission + imputed values", 14),
            (2, 1, "201 + thank-you", 10), (2, 2, "workflows, SSE broadcast", 6)]
    for a, b, t, y in msgs:
        if a == b:
            ax.add_patch(FancyArrowPatch((xs[a], y + 1.2), (xs[a], y - 1.2), arrowstyle="-|>", mutation_scale=10, connectionstyle="arc3,rad=-1.4", lw=0.9))
            ax.text(xs[a] + 5, y, t, fontsize=9, va="center")
            continue
        arrow(ax, xs[a], y, xs[b], y, ls="--" if b < a else "-")
        ax.text((xs[a] + xs[b]) / 2, y + 1.1, t, ha="center", fontsize=9)
    ax.add_patch(Rectangle((40, 21.5), 44, 17, fc="none", ec="#a00000", lw=0.9))
    ax.text(41, 37.2, "loop  [until stop rule]", fontsize=9, color="#a00000")
    save(fig, "fig4_7_sequence.png")


# 9 ----------------------------------------------------------- privacy + insights pipeline
def insight_pipeline():
    fig, ax = canvas(11, 3.4)
    steps = [("Stored\nsubmissions", C_DB), ("Pre-processing\n(text fields only)", C_API), ("PII detection\n(regex + cue rules)", C_NEW), ("Masking\n[EMAIL] [PHONE]...", C_NEW),
             ("LLM + embeddings\n(Gemini)", C_AI), ("Summary, topics,\nsentiment, clusters", C_NEW), ("ResponseInsight\n(cached)", C_DB)]
    w = 13.2
    for i, (t, c) in enumerate(steps):
        x = 1 + i * (w + 2.3)
        box(ax, x, 10, w, 10, t, fc=c, fs=9.5)
        if i < len(steps) - 1:
            arrow(ax, x + w + 0.2, 15, x + w + 2.1, 15)
    ax.text(55, 27, "Raw personal data never reaches a model; cloud providers (if enabled) only ever see the masked text", ha="center", fontsize=10, style="italic")
    ax.text(55, 4.5, "Recomputed when 20 new submissions arrive or on demand; dashboard reads the cached row", ha="center", fontsize=9.5, style="italic")
    save(fig, "fig4_8_insights_pipeline.png")


# 10 ---------------------------------------------------------- DFD level 0 / 1
def dfd():
    fig, ax = canvas(11, 6.6)
    ax.add_patch(Ellipse((55, 33), 30, 18, fc=C_NEW, ec=EDGE)); ax.text(55, 33, "0\nFormForge 2.0\nSystem", ha="center", va="center", fontsize=11, fontweight="bold")
    box(ax, 2, 50, 20, 8, "Form creator", fc=C_EXT)
    box(ax, 2, 10, 20, 8, "Viewer", fc=C_EXT)
    box(ax, 88, 50, 20, 8, "Respondent", fc=C_EXT)
    box(ax, 88, 10, 20, 8, "Webhook endpoint\n/ email (Resend)", fc=C_EXT, fs=9.5)
    box(ax, 45, 2, 20, 7, "LLM provider", fc=C_AI)
    arrow(ax, 22, 56, 41, 38, text="prompt, edits, approval", off=(-2, 3))
    arrow(ax, 40, 31, 22, 52, text="draft form, quality report,\ninsights", off=(-4, -2), ls="--")
    arrow(ax, 41, 27, 22, 14, text="analytics, CSV", off=(-2, -2), ls="--")
    arrow(ax, 88, 54, 69, 37, text="answers", off=(3, 2))
    arrow(ax, 69, 33, 88, 51, text="next question", off=(6, -2), ls="--")
    arrow(ax, 69, 28, 88, 14, text="signed payload", off=(4, 1))
    arrow(ax, 52, 24, 52, 9.2, text="redacted prompt", off=(-8, 0))
    arrow(ax, 58, 9.2, 58, 24, text="JSON output", off=(7, 0), ls="--")
    save(fig, "fig4_9_dfd0.png")


if __name__ == "__main__":
    static_vs_adaptive(); architecture(); provider(); generation_flow(); engine_flow(); er(); usecase(); sequence(); insight_pipeline(); dfd()
    print("ok", sorted(os.listdir(FIG)))
