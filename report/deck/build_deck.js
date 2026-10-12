// FormForge 2.0 review presentation (25 slides), built from the project report's data and figures.
const path = require("path");
const fs = require("fs");
const pptxgen = require("pptxgenjs");
const React = require("react");
const ReactDOMServer = require("react-dom/server");
const sharp = require("sharp");
const fa = require("react-icons/fa6");
const si = require("react-icons/si");
const { applyTheme } = require(process.env.PPTX_SKILL + "/scripts/apply_theme.js");

const ROOT = path.join(__dirname, "..");
const FIG = (f) => path.join(ROOT, "figures", f);
const SCR = (f) => path.join(ROOT, "screens", f);
const RES = (f) => JSON.parse(fs.readFileSync(path.join(ROOT, "experiments", "results", f), "utf8"));
const C_ = RES("comparison.json"), COLD = RES("cold_start.json"), AB = RES("ablation.json"), Q = RES("quality.json"), PII = RES("pii.json");

const THEME = {
  name: "FormForge Violet",
  headFontFace: "Calibri",
  bodyFontFace: "Calibri",
  colors: {
    dk1: "1E1838", lt1: "FFFFFF", dk2: "241657", lt2: "F3F0FF",
    accent1: "6D3EF5", accent2: "14A37F", accent3: "F08C00", accent4: "4C6EF5", accent5: "E03131", accent6: "868E96",
    hlink: "6D3EF5", folHlink: "5B2FD6",
  },
};
const HEX = THEME.colors;
const pres = new pptxgen();
pres.layout = "LAYOUT_WIDE"; // 13.333 x 7.5
pres.title = "FormForge 2.0 - Project Review";
pres.author = "[Student Name]";
pres.theme = { headFontFace: THEME.headFontFace, bodyFontFace: THEME.bodyFontFace };
const C = pres.SchemeColor;
const W = 13.333;
const MUTED = "6B6785";

// ---------------------------------------------------------------- layouts
pres.defineSlideMaster({
  title: "FF_TITLE",
  background: { color: C.text2 },
  objects: [
    { placeholder: { options: { name: "title", type: "title", x: 0.8, y: 1.9, w: 8.4, h: 2.0, fontSize: 44, bold: true, color: C.background1, valign: "bottom", align: "left", margin: 0 }, text: "" } },
    { placeholder: { options: { name: "body", type: "body", x: 0.8, y: 4.05, w: 8.0, h: 0.9, fontSize: 20, color: "CFC6FF", valign: "top", align: "left", margin: 0 }, text: "" } },
  ],
});
pres.defineSlideMaster({
  title: "FF_CONTENT",
  background: { color: C.background1 },
  margin: [0.5, 0.6, 0.6, 0.6],
  slideNumber: { x: 12.35, y: 7.02, w: 0.5, h: 0.3, fontSize: 10, color: C.accent6, align: "right" },
  objects: [
    { text: { text: "FormForge 2.0  |  PMCA699J Dissertation-II / Internship-II", options: { x: 0.6, y: 7.02, w: 7, h: 0.3, fontSize: 10, color: C.accent6, margin: 0 } } },
    { placeholder: { options: { name: "title", type: "title", x: 0.6, y: 0.35, w: 12.1, h: 0.8, fontSize: 30, bold: true, color: C.text1, valign: "middle", align: "left", margin: 0 }, text: "" } },
  ],
});
pres.defineSlideMaster({
  title: "FF_DARK",
  background: { color: C.text2 },
  slideNumber: { x: 12.35, y: 7.02, w: 0.5, h: 0.3, fontSize: 10, color: "9E95D6", align: "right" },
  objects: [
    { placeholder: { options: { name: "title", type: "title", x: 0.6, y: 0.35, w: 12.1, h: 0.8, fontSize: 30, bold: true, color: C.background1, valign: "middle", align: "left", margin: 0 }, text: "" } },
  ],
});

// ---------------------------------------------------------------- helpers
async function icon(Comp, color = "FFFFFF", size = 256) {
  const svg = ReactDOMServer.renderToStaticMarkup(React.createElement(Comp, { color: "#" + color, size: String(size) }));
  const buf = await sharp(Buffer.from(svg)).png().toBuffer();
  return "image/png;base64," + buf.toString("base64");
}
let objN = 0;
const nm = (p) => `${p}-${++objN}`;
function card(s, x, y, w, h, fill = C.background2, opts = {}) {
  s.addShape(pres.shapes.ROUNDED_RECTANGLE, { x, y, w, h, rectRadius: 0.12, fill: { color: fill }, line: { color: fill, width: 0.5 }, objectName: nm("card"),
    shadow: opts.shadow ? { type: "outer", color: "000000", opacity: 0.12, blur: 6, offset: 2, angle: 90 } : undefined });
}
async function badge(s, Comp, x, y, d = 0.62, bg = C.accent1, fg = "FFFFFF") {
  s.addShape(pres.shapes.OVAL, { x, y, w: d, h: d, fill: { color: bg }, line: { color: bg, width: 0.5 }, objectName: nm("badge") });
  const pad = d * 0.24;
  s.addImage({ data: await icon(Comp, fg), x: x + pad, y: y + pad, w: d - 2 * pad, h: d - 2 * pad, objectName: nm("icon"), altText: "icon" });
}
const txt = (s, text, o) => s.addText(text, { isTextBox: true, fontSize: 15, color: C.text1, valign: "top", margin: 0, objectName: nm("text"), ...o });
function fit(file, maxW, maxH) {
  const b = fs.readFileSync(file);
  const iw = b.readUInt32BE(16), ih = b.readUInt32BE(20);
  const r = Math.min(maxW / iw, maxH / ih);
  return { w: iw * r, h: ih * r };
}
function picture(s, file, x, y, maxW, maxH, alt, center = true) {
  const { w, h } = fit(file, maxW, maxH);
  const px = center ? x + (maxW - w) / 2 : x, py = center ? y + (maxH - h) / 2 : y;
  s.addImage({ path: file, x: px, y: py, w, h, objectName: nm("img"), altText: alt });
  return { x: px, y: py, w, h };
}
function frame(s, file, x, y, maxW, maxH, alt) {
  const { w, h } = fit(file, maxW - 0.12, maxH - 0.12);
  const fx = x + (maxW - w - 0.12) / 2, fy = y + (maxH - h - 0.12) / 2;
  s.addShape(pres.shapes.ROUNDED_RECTANGLE, { x: fx, y: fy, w: w + 0.12, h: h + 0.12, rectRadius: 0.08, fill: { color: C.background1 }, line: { color: "D9D3F7", width: 1 },
    shadow: { type: "outer", color: "000000", opacity: 0.15, blur: 8, offset: 3, angle: 90 }, objectName: nm("frame") });
  s.addImage({ path: file, x: fx + 0.06, y: fy + 0.06, w, h, objectName: nm("shot"), altText: alt });
}
const bullets = (items, o = {}) => items.map((t, i) => ({ text: t, options: { bullet: { indent: 16 }, breakLine: i < items.length - 1, paraSpaceAfter: 6, ...o } }));
const pct = (x, d = 1) => (x * 100).toFixed(d);
const CHART_BASE = {
  catAxisLabelColor: "495057", valAxisLabelColor: "495057", catAxisLabelFontFace: "+mn-lt", valAxisLabelFontFace: "+mn-lt",
  catAxisLabelFontSize: 12, valAxisLabelFontSize: 11, dataLabelFontFace: "+mn-lt", dataLabelFontSize: 11, dataLabelColor: "343A40",
  valGridLine: { color: "E9ECEF", size: 0.75 }, catGridLine: { style: "none" }, legendFontFace: "+mn-lt", legendFontSize: 12, legendColor: "495057",
  titleFontFace: "+mn-lt", titleFontSize: 14, titleColor: HEX.dk1,
};
const content = (section, title) => {
  const s = pres.addSlide({ masterName: "FF_CONTENT", sectionTitle: section });
  s.addText(title, { placeholder: "title" });
  return s;
};

(async () => {
  // =============================================================== 1. TITLE
  pres.addSection({ title: "Introduction" });
  let s = pres.addSlide({ masterName: "FF_TITLE", sectionTitle: "Introduction" });
  s.addText("FormForge 2.0", { placeholder: "title" });
  s.addText("An Information-Aware Adaptive Questionnaire Platform with Privacy-Preserving AI", { placeholder: "body" });
  txt(s, [{ text: "[STUDENT NAME]  |  [REGISTER NUMBER]", options: { bold: true, breakLine: true } }, { text: "Guide: Prof. / Dr. [Guide Name]", options: { breakLine: true } },
    { text: "Master of Computer Applications  |  SCORE, VIT Vellore", options: {} }], { x: 0.8, y: 5.35, w: 7.5, h: 1.1, fontSize: 15, color: "E6E1FF", paraSpaceAfter: 4 });
  s.addShape(pres.shapes.OVAL, { x: 9.55, y: 1.45, w: 3.1, h: 3.1, fill: { color: "34247A" }, line: { color: "34247A" }, objectName: "title-disc" });
  s.addImage({ data: await icon(fa.FaShuffle, "B9A8FF"), x: 10.35, y: 2.25, w: 1.5, h: 1.5, objectName: "title-icon", altText: "Adaptive questions icon" });
  txt(s, "Ask fewer, better questions", { x: 9.2, y: 4.85, w: 3.8, h: 0.5, fontSize: 16, italic: true, color: "CFC6FF", align: "center" });
  s.addNotes("Introduce the project: FormForge started as a multi-tenant form builder. After Review 1 it was turned into a research-driven adaptive questionnaire platform that chooses the next question for each respondent, runs at zero cost on a free AI model behind a privacy layer, and was experimentally evaluated against conventional forms.");

  // =============================================================== 2. AGENDA
  s = content("Introduction", "Agenda");
  const agenda = [["Context", "Review 1 feedback, problem, objectives"], ["Literature", "2024-2026 research and the gap"], ["Design", "Architecture, UML, data model, algorithms"],
    ["Build", "Implementation, testing and live demo"], ["Results", "Static vs rule-based vs adaptive, cold start, ablation"], ["Close", "Cost, conclusion and future scope"]];
  for (let i = 0; i < agenda.length; i++) {
    const col = i % 3, row = Math.floor(i / 3);
    const x = 0.6 + col * 4.1, y = 1.55 + row * 2.6;
    card(s, x, y, 3.8, 2.25);
    txt(s, String(i + 1).padStart(2, "0"), { x: x + 0.3, y: y + 0.25, w: 1.5, h: 0.8, fontSize: 40, bold: true, color: C.accent1 });
    txt(s, agenda[i][0], { x: x + 0.3, y: y + 1.05, w: 3.3, h: 0.45, fontSize: 20, bold: true });
    txt(s, agenda[i][1], { x: x + 0.3, y: y + 1.5, w: 3.3, h: 0.6, fontSize: 14, color: MUTED });
  }
  s.addNotes("Walk through the structure of the talk: context and literature, the design of each module, implementation and demo, then the experimental results and cost.");

  // =============================================================== 3. REVIEW 1 -> 2.0
  s = content("Introduction", "From Review 1 to FormForge 2.0");
  card(s, 0.6, 1.45, 5.7, 4.6, "F8F9FA");
  await badge(s, fa.FaTriangleExclamation, 0.9, 1.7, 0.6, "ADB5BD");
  txt(s, "Review 1: FormForge 1.0", { x: 1.7, y: 1.78, w: 4.4, h: 0.5, fontSize: 20, bold: true });
  txt(s, bullets(["Multi-tenant form builder with RBAC workspaces", "Drag-and-drop builder, public form links", "Webhooks, e-mail workflows, SSE live counter", "Feedback: \"nothing new, built many times before\""]),
    { x: 0.95, y: 2.55, w: 5.1, h: 3.3, fontSize: 18, color: "495057", paraSpaceAfter: 12 });
  s.addShape(pres.shapes.RIGHT_ARROW, { x: 6.45, y: 3.45, w: 0.55, h: 0.6, fill: { color: C.accent1 }, line: { color: C.accent1 }, objectName: "arrow" });
  card(s, 7.15, 1.45, 5.6, 4.6, C.background2);
  await badge(s, fa.FaLightbulb, 7.45, 1.7, 0.6);
  txt(s, "Now: research-driven 2.0", { x: 8.25, y: 1.78, w: 4.4, h: 0.5, fontSize: 20, bold: true });
  txt(s, bullets(["Adaptive engine picks the next question per respondent", "A free LLM generates forms with metadata", "Automatic questionnaire quality analysis", "Synthetic cold start, PII masking, insights", "Measured against static and rule-based forms"]),
    { x: 7.5, y: 2.55, w: 5.0, h: 3.3, fontSize: 18, paraSpaceAfter: 12 });
  s.addNotes("Review 1 correctly pointed out that a form builder alone is not novel. The existing platform was kept as the foundation, and research components were added on top, with a measurable research question.");

  // =============================================================== 4. PROBLEM
  s = content("Introduction", "The Problem with Static Forms");
  const probs = [[fa.FaListCheck, "Same list for everyone", "A student who never met a mentor still answers five mentoring questions"],
    [fa.FaClock, "Long forms get abandoned", "In our simulation about 30% of respondents left the 16-question static form midway"],
    [fa.FaTriangleExclamation, "Badly written questions", "46% of 250 items in locally designed surveys were not recommended for use (Reed et al., 2024)"],
    [fa.FaLock, "AI usually means cloud", "Paid APIs fail on quota and send personal data off the machine"]];
  for (let i = 0; i < 4; i++) {
    const y = 1.45 + i * 1.32;
    await badge(s, probs[i][0], 0.6, y + 0.1, 0.7, i === 2 ? C.accent3 : C.accent1);
    txt(s, probs[i][1], { x: 1.55, y: y + 0.05, w: 5.6, h: 0.45, fontSize: 19, bold: true });
    txt(s, probs[i][2], { x: 1.55, y: y + 0.5, w: 5.6, h: 0.7, fontSize: 14, color: MUTED });
  }
  card(s, 7.6, 1.45, 5.15, 5.2, C.text2);
  txt(s, "Research question", { x: 7.95, y: 1.75, w: 4.5, h: 0.4, fontSize: 15, bold: true, color: "B9A8FF" });
  txt(s, "Can a form decide, for each respondent, which question is worth asking next, so that useful information is collected with fewer questions and less effort?",
    { x: 7.95, y: 2.25, w: 4.5, h: 2.7, fontSize: 22, italic: true, color: C.background1 });
  txt(s, "...while running at zero cost and keeping response data on the machine.", { x: 7.95, y: 5.3, w: 4.5, h: 1.0, fontSize: 15, color: "CFC6FF" });
  s.addNotes("Four problems motivate the work. The central research question is on the right: selecting the next question by its information value while controlling respondent burden.");

  // =============================================================== 5. OBJECTIVES
  s = content("Introduction", "Objectives");
  const objs = [[fa.FaWandMagicSparkles, "AI form generation", "Plain-language prompt to a structured form with metadata, via a free LLM"],
    [fa.FaClipboardCheck, "Quality analyzer", "Flag double-barrelled, leading, ambiguous and redundant questions; estimate time"],
    [fa.FaShuffle, "Adaptive engine", "Score every unanswered question and ask the one with the highest utility"],
    [fa.FaUsersGear, "Cold start", "Warm start new forms with synthetic respondents whose weight decays"],
    [fa.FaUserShield, "Privacy and insights", "Mask PII before any model call; summarise answers into topics and sentiment"],
    [fa.FaFlask, "Evaluation", "Compare with static and rule-based forms on seven metrics"]];
  for (let i = 0; i < 6; i++) {
    const col = i % 3, row = Math.floor(i / 3), x = 0.6 + col * 4.1, y = 1.5 + row * 2.65;
    card(s, x, y, 3.8, 2.35, C.background2);
    await badge(s, objs[i][0], x + 0.3, y + 0.3, 0.65);
    txt(s, objs[i][1], { x: x + 1.15, y: y + 0.38, w: 2.5, h: 0.5, fontSize: 19, bold: true });
    txt(s, objs[i][2], { x: x + 0.3, y: y + 1.12, w: 3.25, h: 1.1, fontSize: 14, color: "4A4565" });
  }
  s.addNotes("Six objectives, one per module. The adaptive engine and its evaluation are the core research contribution; the other modules support it.");

  // =============================================================== 6. LITERATURE
  pres.addSection({ title: "Literature" });
  s = content("Literature", "Literature Survey: Key Recent Work");
  const lit = [["Bachmann et al., 2024", "Adaptive questionnaires", "74% accuracy vs <40% for fixed short forms"],
    ["Bachmann et al., 2025", "GPT-4 synthetic cold start", "RMSE 0.420 to 0.297; gain fades after ~175 users"],
    ["Hu et al., 2024", "Information-gain questioning", "+38.1% task success with fewer questions"],
    ["Li et al., 2025", "Adaptive testing (ATLAS)", "Up to 90% fewer items at same precision"],
    ["Adhikari et al., 2025", "LLM questionnaire generation", "Generated items clearer and more specific"],
    ["Reed et al., 2024", "Quality of local surveys", "46% of 250 items not recommended"],
    ["Lukauskas & Šarkauskaitė, 2026", "Audit of synthetic respondents", "+0.84 SD acquiescence; poor transfer"],
    ["Nayyeri & Rasoolzadegan, 2025", "Local LLM for web forms", "Local model avoids cloud data leakage"]];
  const head = (t) => ({ text: t, options: { bold: true, color: "FFFFFF", fill: { color: HEX.accent1 }, fontSize: 14 } });
  s.addTable([[head("Work"), head("Focus"), head("Key finding")], ...lit.map((r, i) => r.map((c) => ({ text: c, options: { fontSize: 13, color: HEX.dk1, fill: { color: i % 2 ? "FFFFFF" : HEX.lt2 } } })))],
    { x: 0.6, y: 1.45, w: 12.1, colW: [3.4, 3.6, 5.1], rowH: 0.52, border: { type: "solid", pt: 0.5, color: "E2DDF7" }, fontFace: "Calibri", valign: "middle", margin: [0.04, 0.12, 0.04, 0.12], objectName: "lit-table" });
  txt(s, "15 references in the report, 2024-2026, all with verified DOI or arXiv links", { x: 0.6, y: 6.35, w: 12, h: 0.35, fontSize: 12, italic: true, color: MUTED });
  s.addNotes("Highlight Bachmann 2024 and 2025 as the closest precedents for adaptive selection and cold start, Hu 2024 for information gain, and the 2026 audit as the main caution about synthetic respondents.");

  // =============================================================== 7. GAP
  s = content("Literature", "Research Gap and Our Answer");
  const gaps = [["Adaptive questionnaires exist only for fixed instruments", "Adaptive selection inside a general-purpose form builder"],
    ["Generators produce wording, not machine-readable structure", "Every generated question carries target, objective, time"],
    ["Selection optimises information alone", "Utility adds burden, redundancy and coverage"],
    ["Cold start studied with large paid models only", "Synthetic warm start with a free model and a decaying weight"],
    ["AI features send raw responses to the cloud", "PII masking before any model call; local model one setting away"]];
  txt(s, "Gap in existing work", { x: 0.6, y: 1.4, w: 5.6, h: 0.4, fontSize: 15, bold: true, color: MUTED });
  txt(s, "FormForge 2.0", { x: 7.15, y: 1.4, w: 5.6, h: 0.4, fontSize: 15, bold: true, color: C.accent1 });
  for (let i = 0; i < gaps.length; i++) {
    const y = 1.9 + i * 0.97;
    card(s, 0.6, y, 5.75, 0.8, "F8F9FA");
    txt(s, gaps[i][0], { x: 0.85, y: y + 0.1, w: 5.3, h: 0.6, fontSize: 15, color: "495057", valign: "middle" });
    s.addShape(pres.shapes.RIGHT_ARROW, { x: 6.5, y: y + 0.22, w: 0.45, h: 0.36, fill: { color: C.accent1 }, line: { color: C.accent1 }, objectName: nm("arrow") });
    card(s, 7.1, y, 5.65, 0.8, C.background2);
    txt(s, gaps[i][1], { x: 7.35, y: y + 0.1, w: 5.2, h: 0.6, fontSize: 15, bold: true, valign: "middle" });
  }
  s.addNotes("Each individual idea has been studied. The novelty is the integration into a general form platform plus the burden- and redundancy-aware utility and its evaluation.");

  // =============================================================== 8. SOLUTION OVERVIEW
  pres.addSection({ title: "Design" });
  s = content("Design", "Solution Overview");
  txt(s, "Six intelligence modules added on top of the existing FormForge platform", { x: 0.6, y: 1.25, w: 12, h: 0.4, fontSize: 16, color: MUTED });
  const mods = [[fa.FaWandMagicSparkles, "AI Generator", "Prompt to draft form", "Creation"], [fa.FaClipboardCheck, "Quality Analyzer", "Score + issues", "Creation"],
    [fa.FaShuffle, "Adaptive Engine", "Next best question", "Answering"], [fa.FaUsersGear, "Cold-start Simulator", "Synthetic warm start", "Answering"],
    [fa.FaUserShield, "PII Redactor", "Mask before AI", "Analysis"], [fa.FaChartPie, "Response Intelligence", "Topics, sentiment", "Analysis"]];
  for (let i = 0; i < 6; i++) {
    const x = 0.6 + i * 2.05;
    card(s, x, 1.85, 1.85, 3.0, C.background2, { shadow: true });
    await badge(s, mods[i][0], x + 0.6, 2.1, 0.65);
    txt(s, mods[i][1], { x: x + 0.12, y: 2.95, w: 1.61, h: 0.75, fontSize: 15, bold: true, align: "center" });
    txt(s, mods[i][2], { x: x + 0.12, y: 3.7, w: 1.61, h: 0.5, fontSize: 13, color: MUTED, align: "center" });
    txt(s, mods[i][3], { x: x + 0.12, y: 4.3, w: 1.61, h: 0.35, fontSize: 12, bold: true, color: C.accent1, align: "center" });
  }
  card(s, 0.6, 5.15, 12.15, 1.5, "F8F9FA");
  txt(s, "Foundation (FormForge 1.0)", { x: 0.9, y: 5.3, w: 4, h: 0.4, fontSize: 15, bold: true });
  txt(s, "Workspaces + RBAC  |  JWT auth  |  drag-and-drop builder  |  public forms  |  webhooks with HMAC + retries  |  SSE live counter  |  analytics  |  CSV export",
    { x: 0.9, y: 5.75, w: 11.6, h: 0.7, fontSize: 15, color: "495057" });
  s.addNotes("The intelligence modules map to the three stages of a form's life: creation, answering and analysis. The original platform is reused unchanged underneath.");

  // =============================================================== 9. TECH STACK
  s = content("Design", "Tools and Technologies");
  const stack = [["Frontend", [[si.SiNextdotjs, "Next.js 14"], [si.SiReact, "React 18"], [si.SiTailwindcss, "Tailwind"]], "dnd-kit, Zustand, TanStack Query, Recharts"],
    ["Backend", [[si.SiNodedotjs, "Node.js"], [si.SiExpress, "Express"], [si.SiTypescript, "TypeScript"]], "zod validation, JWT, bcrypt, node-cron"],
    ["Data", [[si.SiPostgresql, "PostgreSQL 16"], [si.SiPrisma, "Prisma 6"], [si.SiDocker, "Docker"]], "JSONB fields, migrations, Compose"],
    ["AI", [[si.SiGooglegemini, "Gemini API"], [fa.FaRobot, "flash-lite"], [si.SiOllama, "Ollama (opt.)"]], "Free tier, OpenAI-compatible, swappable"],
    ["Research", [[si.SiPython, "Python"], [si.SiNumpy, "NumPy"], [fa.FaChartPie, "Matplotlib"]], "Simulation, EM, evaluation"],
    ["Tooling", [[si.SiTurborepo, "Turborepo"], [si.SiVitest, "Vitest"], [si.SiZod, "zod"]], "Monorepo, strict TS, 124 tests, CI"]];
  for (let i = 0; i < 6; i++) {
    const col = i % 2, row = Math.floor(i / 2), x = 0.6 + col * 6.15, y = 1.4 + row * 1.8;
    card(s, x, y, 5.95, 1.6, i % 2 ? "F8F9FA" : C.background2);
    txt(s, stack[i][0], { x: x + 0.25, y: y + 0.18, w: 1.6, h: 0.4, fontSize: 17, bold: true, color: C.accent1 });
    txt(s, stack[i][2], { x: x + 0.25, y: y + 0.65, w: 1.75, h: 0.8, fontSize: 12, color: MUTED });
    for (let j = 0; j < 3; j++) {
      const ix = x + 2.15 + j * 1.27;
      s.addImage({ data: await icon(stack[i][1][j][0], HEX.dk2), x: ix + 0.3, y: y + 0.2, w: 0.6, h: 0.6, objectName: nm("tech"), altText: stack[i][1][j][1] });
      txt(s, stack[i][1][j][1], { x: ix - 0.05, y: y + 0.92, w: 1.3, h: 0.5, fontSize: 12, align: "center" });
    }
  }
  s.addNotes("All tools are free and open-source. The Gemini free tier was chosen because a local model was too slow and too large for a laptop without a GPU; Ollama or OpenAI can be selected with one setting behind the same interface.");

  // =============================================================== 10. ARCHITECTURE
  s = content("Design", "System Architecture");
  picture(s, FIG("fig4_1_architecture.png"), 0.6, 1.3, 8.0, 5.55, "Three-tier architecture diagram");
  const archPts = [["Three tiers", "Next.js client, Express API, PostgreSQL + Gemini API"], ["Fixed middleware chain", "helmet, CORS, rate limit, JWT, zod, RBAC"],
    ["Layered API", "routes, controllers, services, repositories"], ["One AIProvider interface", "Gemini free tier by default, masked text only"]];
  for (let i = 0; i < 4; i++) {
    const y = 1.5 + i * 1.32;
    card(s, 8.95, y, 3.8, 1.15, C.background2);
    txt(s, archPts[i][0], { x: 9.2, y: y + 0.12, w: 3.4, h: 0.4, fontSize: 16, bold: true });
    txt(s, archPts[i][1], { x: 9.2, y: y + 0.52, w: 3.4, h: 0.55, fontSize: 13, color: MUTED });
  }
  s.addNotes("Yellow boxes are the new FormForge 2.0 services; green are the original platform. All model calls go through the AIProvider interface, which defaults to the Gemini free tier and only ever receives masked text.");

  // =============================================================== 11. UML
  s = content("Design", "Use Case and Data Flow Diagrams");
  frame(s, FIG("fig4_6_usecase.png"), 0.6, 1.3, 6.0, 5.1, "Use case diagram");
  frame(s, FIG("fig4_9_dfd0.png"), 6.75, 1.3, 6.0, 5.1, "Level 0 data flow diagram");
  txt(s, "Use case: creator, viewer, respondent; LLM provider as secondary actor", { x: 0.6, y: 6.45, w: 6, h: 0.4, fontSize: 13, color: MUTED, align: "center" });
  txt(s, "DFD level 0: only redacted text flows to the model; only JSON returns", { x: 6.75, y: 6.45, w: 6, h: 0.4, fontSize: 13, color: MUTED, align: "center" });
  s.addNotes("The respondent never logs in. The language model supports generation, quality review, the simulator and insights but is never used while a respondent answers.");

  // =============================================================== 12. DATA MODEL
  s = content("Design", "Data Model");
  frame(s, FIG("fig4_5_er.png"), 0.6, 1.3, 7.9, 5.5, "Entity relationship diagram");
  txt(s, "9 existing models kept unchanged", { x: 8.85, y: 1.45, w: 3.9, h: 0.4, fontSize: 17, bold: true });
  txt(s, "Only three columns added: Form.objective, Form.adaptiveConfig, Submission.imputed", { x: 8.85, y: 1.9, w: 3.9, h: 0.9, fontSize: 14, color: MUTED });
  const newM = [["QualityReport", "score, issues, time"], ["AdaptiveSession", "asked order, posterior"], ["ModelSnapshot", "pi, theta, nReal, nSynthetic"], ["ResponseInsight", "summary, topics, sentiment"]];
  for (let i = 0; i < 4; i++) {
    const y = 3.05 + i * 0.92;
    card(s, 8.85, y, 3.9, 0.78, "FFF4C2");
    txt(s, newM[i][0], { x: 9.05, y: y + 0.08, w: 3.6, h: 0.35, fontSize: 15, bold: true });
    txt(s, newM[i][1], { x: 9.05, y: y + 0.42, w: 3.6, h: 0.3, fontSize: 12, color: MUTED });
  }
  s.addNotes("Question metadata lives inside the existing fields JSON, so older forms stay valid. Predicted values are stored separately from real answers.");

  // =============================================================== 13. AI GENERATION
  s = content("Design", "AI Form Generation with a Free LLM");
  picture(s, FIG("fig4_3_generation_flow.png"), 0.6, 1.3, 7.4, 3.6, "AI form generation pipeline");
  card(s, 0.6, 5.1, 7.4, 1.6, C.background2);
  txt(s, [{ text: "Human in the loop: ", options: { bold: true } }, { text: "the model returns a proposal only. It opens in the existing builder and nothing is saved until the creator approves." }],
    { x: 0.85, y: 5.3, w: 6.9, h: 1.2, fontSize: 15 });
  card(s, 8.3, 1.3, 4.45, 5.4, C.text2);
  txt(s, "Every question carries metadata", { x: 8.55, y: 1.5, w: 4, h: 0.4, fontSize: 16, bold: true, color: "B9A8FF" });
  txt(s, '{\n "label": "Mentor feedback?",\n "type": "RATING",\n "required": false,\n "objective": "Mentoring",\n "informationTarget":\n     "mentor_quality",\n "estimatedSeconds": 12,\n "relevance": 0.9\n}',
    { x: 8.55, y: 2.0, w: 4.05, h: 3.7, fontSize: 14, fontFace: "Courier New", color: "E6E1FF" });
  txt(s, "Used later by the analyzer and the adaptive engine", { x: 8.55, y: 5.85, w: 4, h: 0.6, fontSize: 13, italic: true, color: "CFC6FF" });
  s.addNotes("Schema enforced with zod; all properties required and nullable after the structured-output issue we hit with optional fields. Invalid JSON is sent back for repair at most twice. Gemini rejects some JSON Schema keywords, so the model gets a structure-only schema and zod does the full check. A 10-question draft takes about 5 to 7 seconds.");

  // =============================================================== 14. QUALITY ANALYZER
  s = content("Design", "Form Quality Analyzer");
  const checks = [["Double-barrelled", "\"How satisfied were you with your mentor and project?\""], ["Leading", "\"How much did you enjoy our excellent service?\""],
    ["Ambiguous", "\"Do you exercise regularly?\""], ["Redundant", "\"How happy...\" vs \"How satisfied...\""], ["Readability", "Flesch below 50 (6+ words) or over 25 words"],
    ["Burden", "Required ratio over 70%; time over 5 min"]];
  for (let i = 0; i < 6; i++) {
    const col = i % 2, row = Math.floor(i / 2), x = 0.6 + col * 3.95, y = 1.4 + row * 1.55;
    card(s, x, y, 3.75, 1.35, i < 3 ? "FFF0F0" : C.background2);
    txt(s, checks[i][0], { x: x + 0.25, y: y + 0.15, w: 3.3, h: 0.4, fontSize: 17, bold: true, color: i < 3 ? "C92A2A" : C.text1 });
    txt(s, checks[i][1], { x: x + 0.25, y: y + 0.6, w: 3.3, h: 0.65, fontSize: 13, color: "4A4565", italic: i < 4 });
  }
  card(s, 8.6, 1.4, 4.15, 4.4, C.text2);
  txt(s, "Quality score", { x: 8.85, y: 1.6, w: 3.7, h: 0.4, fontSize: 16, bold: true, color: "B9A8FF" });
  txt(s, "Score = max(0, 100 - Σ w(issue))", { x: 8.85, y: 2.1, w: 3.7, h: 0.5, fontSize: 17, bold: true, color: C.background1 });
  txt(s, bullets(["12 for double-barrelled or leading", "8 for ambiguous or redundant", "5 for readability", "6 for required ratio or time"]),
    { x: 8.85, y: 2.75, w: 3.7, h: 1.8, fontSize: 14, color: "E6E1FF" });
  txt(s, "Rules run instantly in the builder; an optional AI review adds depth", { x: 8.85, y: 4.75, w: 3.7, h: 0.9, fontSize: 13, italic: true, color: "CFC6FF" });
  txt(s, "Completion time = base time by field type + reading time (3.5 words/s) + 0.6 s per option", { x: 0.6, y: 6.15, w: 12.1, h: 0.45, fontSize: 14, color: MUTED });
  s.addNotes("The categories follow the error types reported by Reed et al. 2024 and the checks used in Adhikari et al. 2025. Findings are suggestions; the creator decides.");

  // =============================================================== 15. UTILITY
  s = content("Design", "Adaptive Engine: Choosing the Next Question");
  card(s, 0.6, 1.35, 12.15, 1.25, C.text2);
  txt(s, "U(q) = α·IG(q) + β·Rel(q) + γ·Cov(q) − δ·Bur(q) − ε·Red(q)", { x: 0.9, y: 1.55, w: 11.6, h: 0.85, fontSize: 30, bold: true, color: C.background1, align: "center", valign: "middle" });
  const terms = [["IG", "Information gain", "Expected drop in uncertainty over all unanswered questions", "α = 0.40", C.accent1],
    ["Rel", "Relevance", "How central the question is to the form objective", "β = 0.15", C.accent4],
    ["Cov", "Coverage", "1 if its information target is still unknown", "γ = 0.20", C.accent2],
    ["Bur", "Burden", "Estimated answering time, normalised", "δ = 0.10", C.accent3],
    ["Red", "Redundancy", "Max normalised mutual information with answered questions", "ε = 0.30", C.accent5]];
  for (let i = 0; i < 5; i++) {
    const x = 0.6 + i * 2.45;
    card(s, x, 2.85, 2.3, 2.85, C.background2);
    s.addShape(pres.shapes.OVAL, { x: x + 0.75, y: 3.05, w: 0.8, h: 0.8, fill: { color: terms[i][4] }, line: { color: terms[i][4] }, objectName: nm("term") });
    txt(s, terms[i][0], { x: x + 0.75, y: 3.05, w: 0.8, h: 0.8, fontSize: 16, bold: true, color: "FFFFFF", align: "center", valign: "middle" });
    txt(s, terms[i][1], { x: x + 0.15, y: 3.95, w: 2.0, h: 0.4, fontSize: 16, bold: true, align: "center" });
    txt(s, terms[i][2], { x: x + 0.15, y: 4.38, w: 2.0, h: 0.85, fontSize: 12, color: MUTED, align: "center" });
    txt(s, terms[i][3], { x: x + 0.15, y: 5.25, w: 2.0, h: 0.35, fontSize: 14, bold: true, color: C.accent1, align: "center" });
  }
  txt(s, "Respondent model: latent class model (K = 6) fitted with EM. Posterior over classes after each answer gives predictions for every unasked question.",
    { x: 0.6, y: 5.95, w: 12.1, h: 0.7, fontSize: 15, color: "4A4565" });
  s.addNotes("Information gain is the only term that reacts to the respondent's own answers, so it has the largest weight. Redundancy is next because asking two questions that measure the same thing is wasted effort.");

  // =============================================================== 16. ENGINE FLOW
  s = content("Design", "Adaptive Engine: Flow and Safety Rules");
  picture(s, FIG("fig4_4_engine_flow.png"), 0.6, 1.3, 5.6, 5.55, "Adaptive engine control flow");
  const rules = [[fa.FaBullseye, "Anchors first", "Required questions are asked first, in the creator's order"], [fa.FaBan, "Never repeat", "No question asked twice; never more than 10 or 240 s"],
    [fa.FaGaugeHigh, "Stop rule", "Coverage ≥ 80% and remaining gain < 10% of maximum"], [fa.FaCircleCheck, "Honest output", "Skipped answers predicted, stored and labelled separately"],
    [fa.FaLock, "Hidden scores", "Respondents never see utilities or predictions"]];
  for (let i = 0; i < 5; i++) {
    const y = 1.4 + i * 1.07;
    await badge(s, rules[i][0], 6.6, y + 0.08, 0.6);
    txt(s, rules[i][1], { x: 7.4, y: y + 0.02, w: 5.3, h: 0.4, fontSize: 17, bold: true });
    txt(s, rules[i][2], { x: 7.4, y: y + 0.44, w: 5.3, h: 0.5, fontSize: 14, color: MUTED });
  }
  s.addNotes("Anchors-first came from an early experiment where the engine picked the redundant satisfaction question first and was then forced to ask the required one too. Verified on 7,500 simulated sessions with zero rule violations.");

  // =============================================================== 17. COLD START
  s = content("Design", "Cold Start with Synthetic Respondents");
  const steps = [[fa.FaFileLines, "New form", "0 real responses"], [fa.FaRobot, "Personas", "The LLM writes varied respondent profiles"], [fa.FaUsersGear, "Synthetic answers", "Options shuffled per persona, letter-labelled"],
    [fa.FaLayerGroup, "Weighted fit", "EM on synthetic + real data"], [fa.FaArrowTrendUp, "Real data takes over", "Synthetic weight decays"]];
  for (let i = 0; i < 5; i++) {
    const x = 0.6 + i * 2.48;
    await badge(s, steps[i][0], x + 0.75, 1.5, 0.75);
    txt(s, steps[i][1], { x, y: 2.4, w: 2.25, h: 0.45, fontSize: 16, bold: true, align: "center" });
    txt(s, steps[i][2], { x, y: 2.85, w: 2.25, h: 0.7, fontSize: 13, color: MUTED, align: "center" });
    if (i < 4) s.addShape(pres.shapes.RIGHT_ARROW, { x: x + 2.15, y: 1.72, w: 0.4, h: 0.3, fill: { color: "C5B8FF" }, line: { color: "C5B8FF" }, objectName: nm("arr") });
  }
  card(s, 0.6, 3.85, 6.0, 2.8, C.background2);
  txt(s, "Synthetic weight", { x: 0.9, y: 4.05, w: 5.4, h: 0.4, fontSize: 16, bold: true });
  txt(s, "w(n) = 25 / (25 + n)", { x: 0.9, y: 4.55, w: 5.4, h: 0.7, fontSize: 30, bold: true, color: C.accent1 });
  txt(s, "n = real responses. Full weight at 0, half at 25, one fifth at 100.", { x: 0.9, y: 5.4, w: 5.4, h: 0.9, fontSize: 14, color: MUTED });
  card(s, 6.75, 3.85, 6.0, 2.8, "FFF4E6");
  await badge(s, fa.FaTriangleExclamation, 7.0, 4.05, 0.55, C.accent3);
  txt(s, "Used only to initialise, never as data", { x: 7.7, y: 4.1, w: 4.9, h: 0.45, fontSize: 16, bold: true });
  txt(s, "LLM respondents show low variance and an acquiescence shift of +0.84 SD (Lukauskas & Šarkauskaitė, 2026; Bisbee et al., 2024). Synthetic rows are kept apart and never appear in responses, exports or insights.",
    { x: 7.0, y: 4.75, w: 5.5, h: 1.7, fontSize: 14, color: "4A4565" });
  s.addNotes("Inspired by Bachmann et al. 2025, who pre-trained an adaptive questionnaire with GPT-4 answers. We follow the same design with a free model, with a decaying weight so real data takes over. In a live check, 40 Gemini personas took 14 seconds and lifted prediction accuracy from 56% to 73% before any real response.");

  // =============================================================== 18. PRIVACY + INSIGHTS
  s = content("Design", "Privacy Layer and Response Intelligence");
  picture(s, FIG("fig4_8_insights_pipeline.png"), 0.6, 1.25, 7.0, 3.3, "Privacy-preserving insights pipeline");
  card(s, 0.6, 4.75, 7.0, 1.95, "F8F9FA");
  txt(s, "Masking example", { x: 0.85, y: 4.9, w: 6.5, h: 0.4, fontSize: 15, bold: true });
  txt(s, [{ text: "IN   ", options: { bold: true, color: MUTED } }, { text: "Reach me on 7012345678 or at a.k@vit.ac.in", options: { breakLine: true } },
    { text: "OUT ", options: { bold: true, color: C.accent1 } }, { text: "Reach me on [PHONE] or at [EMAIL]" }], { x: 0.85, y: 5.4, w: 6.6, h: 1.1, fontSize: 15, fontFace: "Courier New", paraSpaceAfter: 6 });
  card(s, 7.85, 1.25, 4.9, 5.45, C.background2);
  txt(s, "Insights from open answers", { x: 8.1, y: 1.45, w: 4.4, h: 0.4, fontSize: 16, bold: true });
  txt(s, bullets(["Summary, topics with counts, sentiment, clusters per question", "Computed in the background every 20 responses", "Detects email, phone, URL, IP, Aadhaar, PAN, register no., names"]),
    { x: 8.1, y: 1.95, w: 4.45, h: 2.2, fontSize: 15, paraSpaceAfter: 8 });
  txt(s, "Prompt-injection safeguards", { x: 8.1, y: 4.2, w: 4.4, h: 0.4, fontSize: 16, bold: true });
  txt(s, bullets(["Answers sent as delimited data, never as instructions", "Model returns answer numbers, not quotes", "Insights are display-only; never trigger actions"]),
    { x: 8.1, y: 4.65, w: 4.45, h: 1.9, fontSize: 15, paraSpaceAfter: 8 });
  s.addNotes("The provider only ever sees masked text: in the demo, all 8 planted personal details were masked and none reached the model. Results are cached so the page never waits on a model.");

  // =============================================================== 19. IMPLEMENTATION & TESTING
  pres.addSection({ title: "Build" });
  s = content("Build", "Implementation and Testing");
  const st = [["95", "unit tests, incl. 3 parity tests vs Python"], ["29 / 29", "API tests on a real database"], ["15", "new API endpoints"], ["7,500", "simulated sessions, 0 rule violations"]];
  for (let i = 0; i < 4; i++) {
    const x = 0.6 + i * 3.06;
    card(s, x, 1.35, 2.85, 1.65, C.background2);
    txt(s, st[i][0], { x: x + 0.2, y: 1.45, w: 2.45, h: 0.85, fontSize: 38, bold: true, color: C.accent1, align: "center" });
    txt(s, st[i][1], { x: x + 0.2, y: 2.3, w: 2.45, h: 0.6, fontSize: 13, color: MUTED, align: "center" });
  }
  const tests = [["Duplicate e-mail registration", "409 Conflict"], ["Access another workspace", "403 Forbidden"], ["Missing required field", "400, field named"],
    ["6th public submit in a minute", "429 Rate limited"], ["Unpublished form by slug", "404"], ["Webhook workflow on submit", "Delivery queued, HMAC signed"], ["Adaptive session limits", "No repeats, limit kept, anchors first"], ["PII in insights", "Masked; nothing personal sent"]];
  s.addTable([[head("Test case"), head("Result")], ...tests.map((r, i) => r.map((c) => ({ text: c, options: { fontSize: 13, color: HEX.dk1, fill: { color: i % 2 ? "FFFFFF" : HEX.lt2 } } })))],
    { x: 0.6, y: 3.25, w: 7.4, colW: [4.2, 3.2], rowH: 0.42, border: { type: "solid", pt: 0.5, color: "E2DDF7" }, fontFace: "Calibri", valign: "middle", margin: [0.03, 0.12, 0.03, 0.12], objectName: "test-table" });
  card(s, 8.3, 3.25, 4.45, 3.4, C.text2);
  txt(s, "Issues found and fixed", { x: 8.55, y: 3.45, w: 4, h: 0.4, fontSize: 16, bold: true, color: "B9A8FF" });
  txt(s, bullets(["Optional schema fields rejected: made required + nullable", "Gemini schema limits: structure-only schema", "Redundant early pick (98%): anchors first, now 0%", "CSV labels with commas: RFC 4180 writer", "Model change mid-session: snapshot pinned"]),
    { x: 8.55, y: 3.95, w: 4.0, h: 2.6, fontSize: 13, color: "E6E1FF" });
  s.addNotes("The 29 functional tests run the real Express app against a PostgreSQL test database, with a fake model so the run is repeatable. The engine constraints were also verified on 7,500 simulated sessions.");

  // =============================================================== 20. DEMO
  s = content("Build", "Working System");
  frame(s, SCR("s11_ai_generation.png"), 0.6, 1.25, 6.3, 2.15, "AI generation dialog and generated draft");
  txt(s, "AI draft in 7 s, opened in the builder", { x: 0.6, y: 3.38, w: 6.3, h: 0.3, fontSize: 12, color: MUTED, align: "center" });
  frame(s, SCR("s13_adaptive_respondent.png"), 0.6, 3.7, 3.1, 1.75, "Adaptive form, one question at a time");
  frame(s, SCR("s12_quality_report.png"), 3.8, 3.95, 3.1, 1.2, "Quality report panel");
  txt(s, "Respondent view  |  quality report", { x: 0.6, y: 5.45, w: 6.3, h: 0.3, fontSize: 12, color: MUTED, align: "center" });
  frame(s, SCR("s15_insights.png"), 7.05, 1.25, 5.7, 4.2, "Insights page");
  txt(s, "Insights on masked answers: summary, sentiment, topics", { x: 7.05, y: 5.45, w: 5.7, h: 0.3, fontSize: 12, color: MUTED, align: "center" });
  const flow = ["Describe form", "AI draft + quality report", "Edit and approve", "Publish adaptive", "Insights"];
  for (let i = 0; i < flow.length; i++) {
    const x = 0.6 + i * 2.48;
    card(s, x, 5.8, 2.2, 0.75, i === 3 ? C.accent1 : C.background2);
    txt(s, flow[i], { x: x + 0.1, y: 5.85, w: 2.0, h: 0.65, fontSize: 14, bold: true, align: "center", valign: "middle", color: i === 3 ? "FFFFFF" : C.text1 });
    if (i < flow.length - 1) s.addShape(pres.shapes.RIGHT_ARROW, { x: x + 2.22, y: 6.04, w: 0.24, h: 0.26, fill: { color: "C5B8FF" }, line: { color: "C5B8FF" }, objectName: nm("arr") });
  }
  s.addNotes("Show the live demo here if possible: generate a form, look at its quality report, publish it in adaptive mode, answer it on a phone, and open insights.");

  // =============================================================== 21. EXPERIMENT SETUP
  pres.addSection({ title: "Results" });
  s = content("Results", "Experimental Setup");
  const setup = [[fa.FaFileLines, "16-question form", "Internship feedback: 3 required anchors, 1 deliberately redundant question"],
    [fa.FaUsers, "Simulated respondents", "4 latent groups, correlated traits, noise; true answer known for every question"],
    [fa.FaClock, "Break-off model", "Quit hazard grows with elapsed time; same patience for all systems (paired)"],
    [fa.FaVial, "Protocol", "Model trained on 3,000; tested on 1,500; repeated with 5 seeds"]];
  for (let i = 0; i < 4; i++) {
    const y = 1.4 + i * 1.3;
    await badge(s, setup[i][0], 0.6, y + 0.1, 0.65);
    txt(s, setup[i][1], { x: 1.45, y: y + 0.05, w: 5.3, h: 0.4, fontSize: 17, bold: true });
    txt(s, setup[i][2], { x: 1.45, y: y + 0.47, w: 5.3, h: 0.7, fontSize: 14, color: MUTED });
  }
  card(s, 7.15, 1.4, 5.6, 2.35, C.background2);
  txt(s, "Three systems compared", { x: 7.4, y: 1.55, w: 5.1, h: 0.4, fontSize: 16, bold: true });
  txt(s, bullets(["Static: all 16 questions in order", "Rule-based: hand-written skip logic", "FormForge adaptive: utility engine, max 10 questions"]), { x: 7.4, y: 2.05, w: 5.1, h: 1.6, fontSize: 14 });
  card(s, 7.15, 3.95, 5.6, 2.7, "F8F9FA");
  txt(s, "Seven metrics", { x: 7.4, y: 4.1, w: 5.1, h: 0.4, fontSize: 16, bold: true });
  txt(s, bullets(["Questions asked, completion time, completion rate", "Information coverage, redundant questions", "Prediction accuracy, targets per question"]), { x: 7.4, y: 4.6, w: 5.1, h: 1.9, fontSize: 14 });
  s.addNotes("Simulation is the only way to know the true answers to skipped questions. A field study with students is in the future scope.");

  // =============================================================== 22. HEADLINE RESULTS
  s = content("Results", "Adaptive vs Static vs Rule-Based");
  const qRed = (1 - C_.adaptive.questions.mean / C_.static.questions.mean) * 100;
  const tRed = (1 - C_.adaptive.seconds.mean / C_.static.seconds.mean) * 100;
  const heads = [[`−${qRed.toFixed(0)}%`, "questions asked", `${C_.static.questions.mean.toFixed(1)} → ${C_.adaptive.questions.mean.toFixed(1)}`],
    [`−${tRed.toFixed(0)}%`, "completion time", `${C_.static.seconds.mean.toFixed(0)} s → ${C_.adaptive.seconds.mean.toFixed(0)} s`],
    [`+${((C_.adaptive.completion.mean - C_.static.completion.mean) * 100).toFixed(1)} pts`, "completion rate", `${pct(C_.static.completion.mean)}% → ${pct(C_.adaptive.completion.mean)}%`],
    ["0", "redundant questions", `static asked ${C_.static.redundant.mean.toFixed(2)} per person`]];
  for (let i = 0; i < 4; i++) {
    const y = 1.35 + i * 1.35;
    card(s, 0.6, y, 4.4, 1.2, i % 2 ? "F8F9FA" : C.background2);
    txt(s, heads[i][0], { x: 0.8, y: y + 0.12, w: 2.2, h: 0.95, fontSize: 34, bold: true, color: C.accent2, valign: "middle" });
    txt(s, heads[i][1], { x: 3.0, y: y + 0.17, w: 1.9, h: 0.4, fontSize: 15, bold: true });
    txt(s, heads[i][2], { x: 3.0, y: y + 0.6, w: 1.9, h: 0.45, fontSize: 12, color: MUTED });
  }
  s.addChart(pres.charts.BAR, [
    { name: "Static", labels: ["Completion rate (%)", "Coverage incl. predictions (%)"], values: [+pct(C_.static.completion.mean), +pct(C_.static.coverage_with_imputation.mean)] },
    { name: "Rule-based", labels: ["Completion rate (%)", "Coverage incl. predictions (%)"], values: [+pct(C_.rule.completion.mean), +pct(C_.rule.coverage_with_imputation.mean)] },
    { name: "FormForge adaptive", labels: ["Completion rate (%)", "Coverage incl. predictions (%)"], values: [+pct(C_.adaptive.completion.mean), +pct(C_.adaptive.coverage_with_imputation.mean)] },
  ], { x: 5.3, y: 1.3, w: 7.45, h: 5.0, barDir: "col", barGapWidthPct: 60, chartColors: ["ADB5BD", "6B8FB5", HEX.accent1], showValue: true, dataLabelPosition: "outEnd",
    dataLabelFormatCode: "0.0", valAxisMinVal: 0, valAxisMaxVal: 100, showLegend: true, legendPos: "b", showTitle: true, title: "Completion and information coverage (mean of 5 runs)", ...CHART_BASE, objectName: "chart-main" });
  txt(s, `Same information, fewer questions: adaptive coverage ${pct(C_.adaptive.coverage_with_imputation.mean)}% vs ${pct(C_.static.coverage_with_imputation.mean)}% static, at ${C_.adaptive.targets_per_question.mean.toFixed(2)} vs ${C_.static.targets_per_question.mean.toFixed(2)} targets per question`,
    { x: 5.3, y: 6.35, w: 7.45, h: 0.45, fontSize: 13, italic: true, color: MUTED });
  s.addNotes(`Skipped answers are predicted, exactly right ${pct(C_.adaptive.pred_acc.mean)}% and within one point ${pct(C_.adaptive.pred_acc_pm1.mean)}% of the time. They are labelled as predicted, never treated as answers.`);

  // =============================================================== 23. COLD START + ABLATION
  s = content("Results", "Cold Start and Ablation");
  const ns = [0, 10, 25, 50, 100, 250];
  s.addChart(pres.charts.LINE, [
    { name: "No prior data", labels: ns.map(String), values: ns.map((n) => +pct(COLD[`A_no_prior|${n}`].pred_acc_pm1)) },
    { name: "Synthetic warm start", labels: ns.map(String), values: ns.map((n) => +pct(COLD[`B_synthetic|${n}`].pred_acc_pm1)) },
  ], { x: 0.6, y: 1.3, w: 6.0, h: 4.6, chartColors: ["6B8FB5", HEX.accent1], lineSize: 3, lineDataSymbol: "circle", lineDataSymbolSize: 8, valAxisMinVal: 50, valAxisMaxVal: 90,
    showValue: false, showLegend: true, legendPos: "b", showTitle: true, title: "Prediction accuracy (within 1 point, %) vs real responses", showCatAxisTitle: true, catAxisTitle: "Real responses", catAxisTitleFontSize: 12, catAxisTitleColor: "495057", ...CHART_BASE, objectName: "chart-cold" });
  const abOrder = [["full", "Full utility"], ["no_information_gain", "No info gain"], ["no_redundancy", "No redundancy"], ["no_coverage", "No coverage"], ["relevance_only", "Fixed top-10"]];
  s.addChart(pres.charts.BAR, [
    { name: "Prediction accuracy (%)", labels: abOrder.map((a) => a[1]), values: abOrder.map((a) => +pct(AB[a[0]].pred_acc_pm1)) },
  ], { x: 6.85, y: 1.3, w: 5.9, h: 4.6, barDir: "col", chartColors: [HEX.accent1], showValue: true, dataLabelPosition: "outEnd", dataLabelFormatCode: "0.0", valAxisMinVal: 50, valAxisMaxVal: 100,
    showLegend: false, showTitle: true, title: "Ablation: prediction accuracy within 1 point (%)", ...CHART_BASE, objectName: "chart-ablation" });
  txt(s, `Simulation: ${pct(COLD["A_no_prior|0"].pred_acc_pm1, 0)}% → ${pct(COLD["B_synthetic|0"].pred_acc_pm1, 0)}% before any real response. Live check with 40 Gemini personas: 56% → 73% (real data: 82%)`,
    { x: 0.6, y: 6.05, w: 6.0, h: 0.6, fontSize: 13, italic: true, color: MUTED });
  txt(s, `The respondent model matters most: a fixed top-10 order asks ${AB.relevance_only.redundant.toFixed(2)} redundant questions per person vs 0 for the engine`,
    { x: 6.85, y: 6.05, w: 5.9, h: 0.6, fontSize: 13, italic: true, color: MUTED });
  s.addNotes("Cold start follows Bachmann et al. 2025. Caveat: synthetic data in the simulation shares the model's structure; the live check with real Gemini personas gave a smaller but clear gain (56% to 73% within one point, against 82% with real data). Ablation shows information gain and the respondent model drive the gains.");

  // =============================================================== 24. QUALITY, PII, COST
  s = content("Results", "Quality Analyzer, PII Masking and Cost");
  s.addChart(pres.charts.BAR, [
    { name: "Precision", labels: ["Double-barrelled", "Leading", "Ambiguous", "Any issue"], values: ["double_barrelled", "leading", "ambiguous", "any_issue"].map((k) => Q[k].precision) },
    { name: "Recall", labels: ["Double-barrelled", "Leading", "Ambiguous", "Any issue"], values: ["double_barrelled", "leading", "ambiguous", "any_issue"].map((k) => Q[k].recall) },
  ], { x: 0.6, y: 1.3, w: 6.3, h: 4.3, barDir: "col", chartColors: ["6B8FB5", HEX.accent1], showValue: true, dataLabelPosition: "outEnd", dataLabelFormatCode: "0.00", valAxisMinVal: 0, valAxisMaxVal: 1.1,
    showLegend: true, legendPos: "b", showTitle: true, title: `Quality analyzer on ${Q.n_questions} hand-labelled questions`, ...CHART_BASE, objectName: "chart-quality" });
  txt(s, `Accuracy ${pct(Q.any_issue.accuracy, 0)}% for flagged vs clean questions`, { x: 0.6, y: 5.75, w: 6.3, h: 0.4, fontSize: 13, italic: true, color: MUTED });
  card(s, 7.15, 1.3, 5.6, 1.95, C.background2);
  txt(s, `F1 ${PII.overall.f1.toFixed(2)}`, { x: 7.4, y: 1.45, w: 2.4, h: 0.9, fontSize: 36, bold: true, color: C.accent1 });
  txt(s, "PII detection", { x: 9.8, y: 1.55, w: 2.8, h: 0.4, fontSize: 16, bold: true });
  txt(s, `${PII.overall.tp} of ${PII.n_entities} entities masked; precision ${PII.overall.precision.toFixed(2)}, recall ${PII.overall.recall.toFixed(2)}`, { x: 9.8, y: 1.95, w: 2.8, h: 1.1, fontSize: 13, color: MUTED });
  card(s, 7.15, 3.45, 5.6, 3.2, C.text2);
  txt(s, "₹0", { x: 7.4, y: 3.6, w: 2.4, h: 1.2, fontSize: 60, bold: true, color: "7CE0B8" });
  txt(s, "recurring cost", { x: 9.6, y: 3.85, w: 3.0, h: 0.4, fontSize: 17, bold: true, color: C.background1 });
  txt(s, "Free tier, no API bills", { x: 9.6, y: 4.3, w: 3.0, h: 0.5, fontSize: 13, color: "CFC6FF" });
  txt(s, bullets(["Gemini free tier for generation and embeddings", "PostgreSQL + Node.js in Docker, all open source", "Only masked text leaves the machine; Ollama keeps all local"]), { x: 7.4, y: 5.0, w: 5.2, h: 1.55, fontSize: 13, color: "E6E1FF" });
  s.addNotes("Double-barrelled recall is lowest because the rule misses pairs separated by an article. Cost is zero by design. The trade-offs are free-tier rate limits, handled with retries and background jobs, and that masked text leaves the machine; Ollama avoids that for sensitive forms.");

  // =============================================================== 25. CONCLUSION
  pres.addSection({ title: "Close" });
  s = pres.addSlide({ masterName: "FF_DARK", sectionTitle: "Close" });
  s.addText("Conclusion and Future Scope", { placeholder: "title" });
  const conc = [`${qRed.toFixed(0)}% fewer questions and ${tRed.toFixed(0)}% less time with almost the same information`, "AI generation and quality checks at zero cost",
    "Synthetic warm start works for brand-new forms", "Privacy by design: masking before every model call"];
  txt(s, "What we showed", { x: 0.6, y: 1.4, w: 6, h: 0.45, fontSize: 18, bold: true, color: "B9A8FF" });
  for (let i = 0; i < conc.length; i++) {
    const y = 1.95 + i * 1.0;
    await badge(s, fa.FaCircleCheck, 0.6, y, 0.55, C.accent2);
    txt(s, conc[i], { x: 1.35, y: y + 0.02, w: 5.3, h: 0.85, fontSize: 18, color: C.background1 });
  }
  card(s, 7.15, 1.4, 5.6, 4.35, "34247A");
  txt(s, "Future scope", { x: 7.45, y: 1.6, w: 5, h: 0.45, fontSize: 18, bold: true, color: "B9A8FF" });
  txt(s, bullets(["Field study with students: static vs adaptive", "Learn utility weights per form (contextual bandits)", "Grow the question bank from open answers",
    "Local NER model for stronger PII masking", "Adaptive selection for free-text questions"]), { x: 7.45, y: 2.2, w: 5.1, h: 3.4, fontSize: 18, color: "E6E1FF", paraSpaceAfter: 12 });
  txt(s, "Thank you  |  Questions?", { x: 0.6, y: 6.15, w: 12.1, h: 0.6, fontSize: 24, bold: true, color: C.background1, align: "center" });
  s.addNotes("Close with the one-line takeaway: a form does not have to be a fixed list. Then invite questions.");

  const out = path.join(__dirname, "FormForge_Review_Presentation.pptx");
  await pres.writeFile({ fileName: out });
  await applyTheme(out, THEME);
  console.log("written", out);
})().catch((e) => { console.error(e); process.exit(1); });
