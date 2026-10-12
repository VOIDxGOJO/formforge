// Helpers that turn report content into docx-js objects following the VIT template rules.
const fs = require("fs");
const path = require("path");
const D = require("docx");
const {
  Paragraph, TextRun, ImageRun, Table, TableRow, TableCell, AlignmentType, WidthType, BorderStyle,
  ShadingType, TabStopType, LineRuleType, PageBreak, VerticalAlign, HeadingLevel,
} = D;

const FIG_DIR = path.join(__dirname, "..", "figures");
const SCREEN_DIR = path.join(__dirname, "..", "screens");
const FONT = "Times New Roman";
const CONTENT_DXA = 11906 - 2160 - 1440; // A4 width - left 1.5" - right 1"
const LINE_15 = { line: 360, lineRule: LineRuleType.AUTO };

function pngSize(file) {
  const b = fs.readFileSync(file);
  return { w: b.readUInt32BE(16), h: b.readUInt32BE(20) };
}

// very small inline markup: **bold**, *italic*, `code`
function runs(text, base = {}) {
  const out = [];
  const re = /(\*\*[^*]+\*\*|\*[^*]+\*|`[^`]+`)/g;
  let last = 0, m;
  while ((m = re.exec(text))) {
    if (m.index > last) out.push(new TextRun({ text: text.slice(last, m.index), font: FONT, ...base }));
    const t = m[0];
    if (t.startsWith("**")) out.push(new TextRun({ text: t.slice(2, -2), bold: true, font: FONT, ...base }));
    else if (t.startsWith("`")) out.push(new TextRun({ text: t.slice(1, -1), font: "Consolas", size: (base.size || 24) - 3 }));
    else out.push(new TextRun({ text: t.slice(1, -1), italics: true, font: FONT, ...base }));
    last = m.index + t.length;
  }
  if (last < text.length) out.push(new TextRun({ text: text.slice(last), font: FONT, ...base }));
  return out;
}

class Builder {
  constructor(registry) {
    this.reg = registry || {};      // key -> number string, filled on pass 1
    this.chap = 0; this.fig = 0; this.tab = 0; this.eqn = 0;
    this.firstPara = false;
    this.listInstance = 0;
    this.figures = []; this.tables = [];
  }

  resolve(text) {
    return text.replace(/\{(fig|tab|eq):([\w-]+)\}/g, (_, k, key) => {
      const v = this.reg[`${k}:${key}`] || "?";
      return k === "fig" ? `Fig. ${v}` : k === "tab" ? `Table ${v}` : `Eqn. ${v}`;
    });
  }

  chapter(title) {
    this.chap += 1; this.fig = 0; this.tab = 0; this.eqn = 0; this.firstPara = true;
    return [
      new Paragraph({
        heading: HeadingLevel.HEADING_1, pageBreakBefore: true, alignment: AlignmentType.CENTER,
        spacing: { after: 360, line: 360 },
        children: [new TextRun({ text: `CHAPTER ${this.chap}`, bold: true, font: FONT, size: 28 }), new TextRun({ break: 1 }),
          new TextRun({ text: title.toUpperCase(), bold: true, font: FONT, size: 28 })],
      }),
    ];
  }

  // unnumbered chapter-like heading (references, appendix)
  plainChapter(title, { toc = true, pageBreak = true } = {}) {
    this.firstPara = true;
    return [new Paragraph({
      heading: toc ? HeadingLevel.HEADING_1 : undefined, pageBreakBefore: pageBreak, alignment: AlignmentType.CENTER,
      spacing: { after: 360, line: 360 },
      children: [new TextRun({ text: title.toUpperCase(), bold: true, font: FONT, size: 28 })],
    })];
  }

  h2(text) {
    return [new Paragraph({ heading: HeadingLevel.HEADING_2, spacing: { before: 240, after: 120, line: 360 }, keepNext: true,
      children: [new TextRun({ text, bold: true, font: FONT, size: 24 })] })];
  }

  h3(text) {
    return [new Paragraph({ heading: HeadingLevel.HEADING_3, spacing: { before: 180, after: 80, line: 360 }, keepNext: true,
      children: [new TextRun({ text, bold: true, italics: true, font: FONT, size: 24 })] })];
  }

  p(text, opts = {}) {
    const indent = this.firstPara || opts.noIndent ? undefined : { firstLine: 720 };
    this.firstPara = false;
    return [new Paragraph({ alignment: AlignmentType.JUSTIFIED, spacing: { ...LINE_15, after: 120 }, indent,
      children: runs(this.resolve(text), { size: 24 }) })];
  }

  ps(...texts) { return texts.flatMap((t) => this.p(t)); }

  bullets(items, { ref = "bullet" } = {}) {
    return items.map((t) => new Paragraph({ numbering: { reference: ref, level: 0 }, alignment: AlignmentType.JUSTIFIED,
      spacing: { ...LINE_15, after: 60 }, children: runs(this.resolve(t), { size: 24 }) }));
  }

  numbered(items) {
    this.listInstance += 1;
    const inst = this.listInstance;
    return items.map((t) => new Paragraph({ numbering: { reference: "numbered", level: 0, instance: inst }, alignment: AlignmentType.JUSTIFIED,
      spacing: { ...LINE_15, after: 60 }, children: runs(this.resolve(t), { size: 24 }) }));
  }

  figure(key, file, caption, widthIn = 5.6, dir = FIG_DIR) {
    this.fig += 1;
    const no = `${this.chap}.${this.fig}`;
    this.reg[`fig:${key}`] = no;
    const full = path.join(dir, file);
    const { w, h } = pngSize(full);
    const wpx = Math.round(widthIn * 96);
    let hpx = Math.round((wpx * h) / w);
    const maxH = 8.3 * 96;
    let wfin = wpx;
    if (hpx > maxH) { wfin = Math.round((wpx * maxH) / hpx); hpx = maxH; }
    this.figures.push([no, caption]);
    return [
      new Paragraph({ alignment: AlignmentType.CENTER, keepNext: true, spacing: { before: 120, after: 60 },
        children: [new ImageRun({ type: "png", data: fs.readFileSync(full), transformation: { width: wfin, height: hpx },
          altText: { title: caption, description: caption, name: key } })] }),
      new Paragraph({ style: "FigureCaption", alignment: AlignmentType.CENTER, spacing: { after: 240 },
        children: [new TextRun({ text: `Fig. ${no} ${caption}`, bold: true, font: FONT, size: 20 })] }),
    ];
  }

  screen(key, file, caption, widthIn = 5.7) { return this.figure(key, file, caption, widthIn, SCREEN_DIR); }

  // framed box where a screenshot is still to be pasted
  placeholder(key, caption, note) {
    this.fig += 1;
    const no = `${this.chap}.${this.fig}`;
    this.reg[`fig:${key}`] = no;
    this.figures.push([no, caption]);
    const border = { style: BorderStyle.DASHED, size: 8, color: "808080" };
    return [
      new Table({ width: { size: 7800, type: WidthType.DXA }, columnWidths: [7800], alignment: AlignmentType.CENTER,
        rows: [new TableRow({ height: { value: 3600, rule: "atLeast" }, children: [new TableCell({ width: { size: 7800, type: WidthType.DXA },
          verticalAlign: VerticalAlign.CENTER, borders: { top: border, bottom: border, left: border, right: border },
          children: [new Paragraph({ alignment: AlignmentType.CENTER, children: [new TextRun({ text: "[ Insert screenshot here ]", font: FONT, size: 22, color: "808080", bold: true })] }),
            new Paragraph({ alignment: AlignmentType.CENTER, children: [new TextRun({ text: note, font: FONT, size: 20, color: "808080", italics: true })] })] })] })] }),
      new Paragraph({ style: "FigureCaption", alignment: AlignmentType.CENTER, spacing: { before: 60, after: 240 },
        children: [new TextRun({ text: `Fig. ${no} ${caption}`, bold: true, font: FONT, size: 20 })] }),
    ];
  }

  table(key, caption, header, rows, widths, { fs = 20, align } = {}) {
    this.tab += 1;
    const no = `${this.chap}.${this.tab}`;
    this.reg[`tab:${key}`] = no;
    this.tables.push([no, caption]);
    const total = widths.reduce((a, b) => a + b, 0);
    const scale = Math.min(1, CONTENT_DXA / total);
    const W = widths.map((w) => Math.floor(w * scale));
    const tw = W.reduce((a, b) => a + b, 0);
    const bd = { style: BorderStyle.SINGLE, size: 4, color: "000000" };
    const borders = { top: bd, bottom: bd, left: bd, right: bd };
    const cell = (t, i, head) => new TableCell({
      width: { size: W[i], type: WidthType.DXA }, borders, verticalAlign: VerticalAlign.CENTER,
      shading: head ? { fill: "D9D9D9", type: ShadingType.CLEAR, color: "auto" } : undefined,
      margins: { top: 50, bottom: 50, left: 90, right: 90 },
      children: String(t).split("\n").map((line) => new Paragraph({
        alignment: head ? AlignmentType.CENTER : (align && align[i]) || AlignmentType.LEFT,
        children: runs(line, { size: fs, bold: head || undefined }) })),
    });
    return [
      new Paragraph({ style: "TableCaption", alignment: AlignmentType.CENTER, keepNext: true, spacing: { before: 200, after: 80 },
        children: [new TextRun({ text: `Table ${no} ${caption}`, bold: true, font: FONT, size: 20 })] }),
      new Table({ width: { size: tw, type: WidthType.DXA }, columnWidths: W, alignment: AlignmentType.CENTER,
        rows: [new TableRow({ tableHeader: true, children: header.map((t, i) => cell(t, i, true)) }),
          ...rows.map((r) => new TableRow({ cantSplit: true, children: r.map((t, i) => cell(t, i, false)) }))] }),
      new Paragraph({ spacing: { after: 120 }, children: [] }),
    ];
  }

  // equation: centred expression, number at the right margin
  eq(key, children) {
    this.eqn += 1;
    const no = `${this.chap}.${this.eqn}`;
    this.reg[`eq:${key}`] = no;
    const kids = Array.isArray(children) ? children : [new D.MathRun(children)];
    return [new Paragraph({
      tabStops: [{ type: TabStopType.CENTER, position: Math.floor(CONTENT_DXA / 2) }, { type: TabStopType.RIGHT, position: CONTENT_DXA }],
      spacing: { before: 120, after: 120, line: 360 },
      children: [new TextRun({ text: "\t", font: FONT }), new D.Math({ children: kids }), new TextRun({ text: `\t(${no})`, font: FONT, size: 24 })],
    })];
  }

  code(caption, text) {
    const lines = text.replace(/\t/g, "  ").split("\n");
    const shade = { fill: "F3F3F3", type: ShadingType.CLEAR, color: "auto" };
    const bd = { style: BorderStyle.SINGLE, size: 4, color: "999999" };
    const out = [];
    if (caption) out.push(...this.textCaption(caption));
    out.push(new Table({ width: { size: CONTENT_DXA, type: WidthType.DXA }, columnWidths: [CONTENT_DXA],
      rows: [new TableRow({ children: [new TableCell({ width: { size: CONTENT_DXA, type: WidthType.DXA }, shading: shade,
        borders: { top: bd, bottom: bd, left: bd, right: bd }, margins: { top: 80, bottom: 80, left: 120, right: 80 },
        children: lines.map((l) => new Paragraph({ spacing: { line: 240, after: 0 },
          children: [new TextRun({ text: l.length ? l : " ", font: "Consolas", size: 17 })] })) })] })] }));
    out.push(new Paragraph({ spacing: { after: 120 }, children: [] }));
    return out;
  }

  textCaption(caption) {
    return [new Paragraph({ alignment: AlignmentType.LEFT, keepNext: true, spacing: { before: 160, after: 60 },
      children: [new TextRun({ text: caption, bold: true, italics: true, font: FONT, size: 20 })] })];
  }

  pageBreak() { return [new Paragraph({ children: [new PageBreak()] })]; }
  blank(n = 1) { return Array.from({ length: n }, () => new Paragraph({ children: [] })); }
}

module.exports = { Builder, runs, FONT, CONTENT_DXA, LINE_15, pngSize, D };
