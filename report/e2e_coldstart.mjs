// Cold-start check with real Gemini personas (report Section 7.6, but with an LLM).
// Usage: node e2e_coldstart.mjs <demo password>
import { readFileSync, writeFileSync } from 'node:fs';
import { execSync } from 'node:child_process';

const A = 'http://localhost:3001';
const WS = '8c195f74-792b-4bf0-9293-14618401e933';
const data = JSON.parse(readFileSync(new URL('./e2e_adaptive_data.json', import.meta.url)));
let cookie = '';
const api = async (method, path, body) => {
  const res = await fetch(A + path, {
    method,
    headers: { 'Content-Type': 'application/json', ...(cookie ? { Cookie: cookie } : {}) },
    body: body ? JSON.stringify(body) : undefined
  });
  const set = res.headers.getSetCookie?.() ?? [];
  if (set.length) cookie = set.map((c) => c.split(';')[0]).join('; ');
  return { status: res.status, json: await res.json() };
};
const psql = (sql) => execSync(`docker exec -i ff-report-pg psql -U postgres -d formforge -tA`, { input: sql }).toString().trim();

await api('POST', '/api/v1/auth/login', { email: 'demo.reviewer@formforge.test', password: process.argv[2] });
for (const old of (await api('GET', `/api/v1/workspaces/${WS}/forms?limit=100&q=cold`)).json.data) {
  if (old.name === 'Internship Feedback (cold start)') await api('DELETE', `/api/v1/workspaces/${WS}/forms/${old.id}`);
}
const form = (await api('POST', `/api/v1/workspaces/${WS}/forms`, {
  name: 'Internship Feedback (cold start)',
  objective: 'Understand mentoring, workload, technical learning and whether interns would recommend the company'
})).json.data;
await api('PATCH', `/api/v1/workspaces/${WS}/forms/${form.id}`, { fields: data.fields });
await api('PATCH', `/api/v1/workspaces/${WS}/forms/${form.id}/adaptive`, { enabled: true });
console.log('new form, submissions:', psql(`select count(*) from "Submission" where "formId"='${form.id}'`));

const t0 = Date.now();
const sim = await api('POST', `/api/v1/workspaces/${WS}/forms/${form.id}/simulate`, { personas: 40 });
if (!sim.json.success) { console.log('simulate failed', sim.status, JSON.stringify(sim.json.error)); process.exit(1); }
console.log(`warm start: ${sim.json.data.personas} personas in ${((Date.now() - t0) / 1000).toFixed(1)} s | answer rate ${sim.json.data.answerRate} | model nReal=${sim.json.data.model.nReal} nSynthetic=${sim.json.data.model.nSynthetic}`);
const sample = (await api('GET', `/api/v1/workspaces/${WS}/forms/${form.id}/simulate`)).json.data;
console.log('sample personas:'); sample.slice(0, 4).forEach((s) => console.log('  -', s.persona.slice(0, 150)));

// Positivity check: mean overall satisfaction (q3, 1-5) synthetic vs the simulated "real" respondents
const synMean = Number(psql(`select avg((responses->>'q3')::int) from "SyntheticResponse" where "formId"='${form.id}' and responses ? 'q3'`));
const realMean = data.past.reduce((s, r) => s + Number(r.q3), 0) / data.past.length;
const dist = psql(`select responses->>'q3' as v, count(*) from "SyntheticResponse" where "formId"='${form.id}' group by 1 order by 1`).replace(/\n/g, '  ');
console.log(`overall satisfaction mean: synthetic ${synMean.toFixed(2)} vs real ${realMean.toFixed(2)} | synthetic distribution (value|count): ${dist}`);
writeFileSync(new URL('./e2e_coldstart_form.json', import.meta.url), JSON.stringify({ id: form.id, slug: form.slug }));
