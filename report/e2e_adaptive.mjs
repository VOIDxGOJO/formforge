// End-to-end check of adaptive mode through the real HTTP API and database.
// Usage: node e2e_adaptive.mjs <demo password>
import { readFileSync, writeFileSync } from 'node:fs';
import { execSync } from 'node:child_process';
import { randomUUID } from 'node:crypto';

const A = 'http://localhost:3001';
const WS = '8c195f74-792b-4bf0-9293-14618401e933';
const data = JSON.parse(readFileSync(new URL('./e2e_adaptive_data.json', import.meta.url)));
let cookie = '';
const api = async (method, path, body, useCookie = true) => {
  const res = await fetch(A + path, {
    method,
    headers: { 'Content-Type': 'application/json', ...(useCookie && cookie ? { Cookie: cookie } : {}) },
    body: body ? JSON.stringify(body) : undefined
  });
  const set = res.headers.getSetCookie?.() ?? [];
  if (set.length) cookie = set.map((c) => c.split(';')[0]).join('; ');
  return { status: res.status, json: await res.json() };
};
const psql = (sql) => execSync(`docker exec -i ff-report-pg psql -U postgres -d formforge -tA`, { input: sql }).toString().trim();

const login = await api('POST', '/api/v1/auth/login', { email: 'demo.reviewer@formforge.test', password: process.argv[2] }, false);
console.log('login', login.status);
// remove leftovers from earlier runs
for (const old of (await api('GET', `/api/v1/workspaces/${WS}/forms?limit=100&q=adaptive`)).json.data) {
  if (old.name === 'Internship Feedback (adaptive)') await api('DELETE', `/api/v1/workspaces/${WS}/forms/${old.id}`);
}
const sleep = (ms) => new Promise((r) => setTimeout(r, ms));

// 1. form with the report's 16 questions + a required free-text question
const form = (await api('POST', `/api/v1/workspaces/${WS}/forms`, {
  name: 'Internship Feedback (adaptive)',
  objective: 'Understand mentoring, workload, technical learning and whether interns would recommend the company'
})).json.data;
const patched = await api('PATCH', `/api/v1/workspaces/${WS}/forms/${form.id}`, { fields: data.fields });
console.log('form created', patched.status, '| fields', patched.json.data.fields.length);

// 2. 400 past responses (direct insert; the public submit endpoint allows 5/min)
const rows = data.past.map((r) => `('${randomUUID()}','${form.id}','${JSON.stringify(r)}'::jsonb, now() - interval '${Math.floor(Math.random() * 30)} days')`);
psql(`INSERT INTO "Submission" (id, "formId", responses, "submittedAt") VALUES ${rows.join(',')};`);
console.log('past submissions', psql(`select count(*) from "Submission" where "formId"='${form.id}'`));

// 3. adaptive mode + model fit through the API
const notYet = await api('POST', `/api/public/forms/${form.slug}/sessions`, null, false);
console.log('start before enabling ->', notYet.status, notYet.json.error?.message);
const cfg = await api('PATCH', `/api/v1/workspaces/${WS}/forms/${form.id}/adaptive`, { enabled: true });
console.log('enable adaptive', cfg.status, '| maxQuestions', cfg.json.data.maxQuestions);
let t0 = Date.now();
const refit = await api('POST', `/api/v1/workspaces/${WS}/forms/${form.id}/adaptive/refit`);
console.log(`refit ${refit.status} in ${Date.now() - t0} ms | nReal ${refit.json.data.nReal}`);
const status = (await api('GET', `/api/v1/workspaces/${WS}/forms/${form.id}/adaptive`)).json.data;
console.log(`status: ${status.questions.modeled.length} modeled (${status.questions.modeled.filter((q) => q.anchor).length} anchors), asked after: ${status.questions.askedAfter.map((q) => q.id)}, model current: ${status.model.current}`);

// 4. respondents through the public API
const isRating = new Set(data.fields.filter((f) => f.type === 'RATING').map((f) => f.id));
const idx = (f, v) => (isRating.has(f) ? Number(v) - 1 : Number(String(v).split('_')[1]) - 1);
let asked = 0, within1 = 0, exact = 0, imputedCount = 0, sessions = 0, stepMs = 0, steps = 0;
const results = [];
for (const r of data.test) {
  let res = await api('POST', `/api/public/forms/${form.slug}/sessions`, null, false);
  const sid = res.json.data.sessionId;
  let q = res.json.data.question;
  const order = [];
  while (q) {
    order.push(q.id);
    const value = q.id === 'improve' ? 'More structured code reviews would help.' : r.answers[q.id];
    t0 = Date.now();
    await sleep(220); // ~270 requests/min, under the 300/min session limit
    res = await api('POST', `/api/public/sessions/${sid}/answers`, { fieldId: q.id, value }, false);
    if (!res.json.success) throw new Error(JSON.stringify(res.json.error));
    stepMs += Date.now() - t0; steps++;
    q = res.json.data.question;
  }
  const done = await api('POST', `/api/public/sessions/${sid}/complete`, null, false);
  const sub = JSON.parse(psql(`select json_build_object('responses', responses, 'imputed', imputed, 'sessionId', "sessionId") from "Submission" where id='${done.json.data.id}'`));
  const modeledAsked = order.filter((id) => id !== 'improve').length;
  asked += modeledAsked; sessions++;
  for (const [fid, imp] of Object.entries(sub.imputed ?? {})) {
    imputedCount++;
    const diff = Math.abs(idx(fid, imp.value) - idx(fid, r.answers[fid]));
    if (diff === 0) exact++;
    if (diff <= 1) within1++;
  }
  results.push({ modeledAsked, lastAsked: order.at(-1), imputed: Object.keys(sub.imputed ?? {}).length, hasSession: sub.sessionId === sid, responsesHaveImputed: Object.keys(sub.imputed ?? {}).some((k) => k in sub.responses) });
}
console.log(`\n${sessions} respondents: ${(asked / sessions).toFixed(2)} choice questions asked on average (of 16) | improve asked last: ${results.every((x) => x.lastAsked === 'improve')}`);
console.log(`imputed ${imputedCount} answers: exact ${(100 * exact / imputedCount).toFixed(1)}%, within 1 point ${(100 * within1 / imputedCount).toFixed(1)}%`);
console.log(`every submission linked to its session: ${results.every((x) => x.hasSession)} | predictions kept out of responses: ${results.every((x) => !x.responsesHaveImputed)}`);
console.log(`mean API time per answer: ${(stepMs / steps).toFixed(0)} ms`);

// 5. misuse
const s = (await api('POST', `/api/public/forms/${form.slug}/sessions`, null, false)).json.data;
const wrong = await api('POST', `/api/public/sessions/${s.sessionId}/answers`, { fieldId: 'q16', value: '3' }, false);
const early = await api('POST', `/api/public/sessions/${s.sessionId}/complete`, null, false);
const bad = await api('POST', `/api/public/sessions/${s.sessionId}/answers`, { fieldId: s.question.id, value: 'option_99' }, false);
console.log(`\nwrong question -> ${wrong.status} | complete early -> ${early.status} | invalid value -> ${bad.status}`);
const last = data.test[0];
const s2 = (await api('POST', `/api/public/forms/${form.slug}/sessions`, null, false)).json.data;
let q2 = s2.question;
while (q2) q2 = (await api('POST', `/api/public/sessions/${s2.sessionId}/answers`, { fieldId: q2.id, value: q2.id === 'improve' ? 'ok' : last.answers[q2.id] }, false)).json.data.question;
const c1 = await api('POST', `/api/public/sessions/${s2.sessionId}/complete`, null, false);
const c2 = await api('POST', `/api/public/sessions/${s2.sessionId}/complete`, null, false);
console.log(`complete -> ${c1.status} | complete again -> ${c2.status}`);
writeFileSync(new URL('./e2e_adaptive_form.json', import.meta.url), JSON.stringify({ id: form.id, slug: form.slug }));
