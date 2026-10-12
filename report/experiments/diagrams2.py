"""Two-row versions of the wide pipeline diagrams (more readable at page width)."""
from diagrams import canvas, box, arrow, save, C_UI, C_AI, C_API, C_NEW, C_DB


def snake(ax, steps, w=19, h=9, gap=6, y1=30, y2=10, x0=4):
    """Lay out steps in two rows: left-to-right on top, right-to-left at bottom."""
    n1 = (len(steps) + 1) // 2
    pos = []
    for i, (t, c) in enumerate(steps):
        if i < n1:
            x, y = x0 + i * (w + gap), y1
        else:
            k = i - n1
            x, y = x0 + (n1 - 1 - k) * (w + gap), y2
        box(ax, x, y, w, h, t, fc=c, fs=10)
        pos.append((x, y))
    for i in range(len(steps) - 1):
        (xa, ya), (xb, yb) = pos[i], pos[i + 1]
        if ya == yb and ya == y1:
            arrow(ax, xa + w + 0.3, ya + h / 2, xb - 0.3, yb + h / 2)
        elif ya == yb:
            arrow(ax, xa - 0.3, ya + h / 2, xb + w + 0.3, yb + h / 2)
        else:
            arrow(ax, xa + w / 2, ya - 0.3, xb + w / 2, yb + h + 0.3)
    return pos


def generation_flow():
    fig, ax = canvas(10, 4.6)
    steps = [("Creator prompt\n+ objective", C_UI), ("Prompt builder\n(JSON schema)", C_AI), ("LLM (Gemini,\nfree tier)", C_AI), ("zod validation\n+ repair retry", C_API),
             ("Quality\nAnalyzer", C_NEW), ("Preview & edit\nin builder", C_UI), ("Creator\napproves", C_UI), ("Form saved\n(Prisma)", C_DB)]
    pos = snake(ax, steps)
    (x2, y2), (x3, y3) = pos[2], pos[3]
    arrow(ax, x3 + 9.5, y3 + 9.3, x2 + 9.5, y2 + 9.3, text="invalid JSON: re-prompt (max 2)", rad=0.6, off=(0, 6.5), fs=9.5)
    ax.text(50, 2.5, "The AI produces a proposal only; nothing is written to the database without human approval", ha="center", fontsize=10, style="italic")
    save(fig, "fig4_3_generation_flow.png")


def insight_pipeline():
    fig, ax = canvas(10, 4.6)
    steps = [("Stored\nsubmissions", C_DB), ("Pre-processing\n(text fields only)", C_API), ("PII detection\n(regex + cue rules)", C_NEW), ("Masking\n[EMAIL] [PHONE] ...", C_NEW),
             ("LLM + embeddings\n(Gemini)", C_AI), ("Summary, topics,\nsentiment, clusters", C_NEW), ("ResponseInsight\n(cached row)", C_DB), ("Insights page\nin dashboard", C_UI)]
    snake(ax, steps)
    ax.text(50, 43, "Raw personal data never reaches a model: the provider only ever sees masked text", ha="center", fontsize=10, style="italic")
    ax.text(50, 2.5, "Recomputed in the background after 20 new submissions or on demand; the page reads the cached row", ha="center", fontsize=10, style="italic")
    save(fig, "fig4_8_insights_pipeline.png")


if __name__ == "__main__":
    generation_flow(); insight_pipeline(); print("ok")
