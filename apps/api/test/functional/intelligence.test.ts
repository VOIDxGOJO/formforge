import request from 'supertest';
import { afterAll, beforeAll, describe, expect, it } from 'vitest';
import { Role } from '@prisma/client';
import { setAIProvider } from '../../src/lib/ai/index.js';
import { prisma } from '../../src/lib/prisma.js';
import { insightService } from '../../src/services/insights/insight.service.js';
import { seededRandom } from '../../src/engine/model.js';
import { app, createForm, FakeAI, newUser } from './helpers.js';

// Report Table 7.1, T18-T28: the FormForge 2.0 routes, run against a real database.
// Model calls go to a deterministic fake provider, so the run is repeatable and offline.

const opts = (...labels: string[]) => labels.map((label, i) => ({ label, value: `option_${i + 1}` }));
const adaptiveFields = [
  { id: 'consent', type: 'DROPDOWN', label: 'Do you agree to take part in this survey?', required: true, options: opts('Yes', 'No'), relevance: 0.3 },
  ...Array.from({ length: 12 }, (_, i) => ({
    id: `r${i + 1}`,
    type: 'RATING',
    label: `How would you rate area ${i + 1} of the internship?`,
    required: false,
    relevance: 0.5 + (i % 3) * 0.2,
    informationTarget: `area_${i + 1}`
  })),
  { id: 'mentor', type: 'DROPDOWN', label: 'How often did you meet your mentor?', required: false, options: opts('Never', 'Monthly', 'Weekly', 'Daily') },
  { id: 'improve', type: 'TEXTAREA', label: 'What should the company improve?', required: false }
];

const ai = new FakeAI();
let owner: Awaited<ReturnType<typeof newUser>>;
let form: { id: string; slug: string };
const base = () => `/api/v1/workspaces/${owner.workspaceId}/forms/${form.id}`;

beforeAll(async () => {
  setAIProvider(ai);
  owner = await newUser('Adaptive Owner');
  form = await createForm(owner.agent, owner.workspaceId, 'Adaptive Internship Survey', adaptiveFields);
  const enabled = await owner.agent.patch(`${base()}/adaptive`).send({ enabled: true, maxQuestions: 6 });
  expect(enabled.status).toBe(200);
});
afterAll(async () => {
  await insightService.settle(form.id);
  await prisma.$disconnect();
});

/** Runs one respondent through the adaptive HTTP flow, answering with the given random source. */
const runSession = async (random: () => number) => {
  const start = await request(app).post(`/api/public/forms/${form.slug}/sessions`);
  expect(start.status).toBe(201);
  const { sessionId } = start.body.data;
  const asked: string[] = [];
  let question = start.body.data.question;
  while (question) {
    asked.push(question.id);
    const value =
      question.type === 'RATING' ? String(1 + Math.floor(random() * 5))
      : question.type === 'DROPDOWN' ? question.options[Math.floor(random() * question.options.length)].value
      : 'More code reviews from [PERSON] would help.';
    const res = await request(app).post(`/api/public/sessions/${sessionId}/answers`).send({ fieldId: question.id, value });
    expect(res.status).toBe(200);
    question = res.body.data.question;
  }
  const done = await request(app).post(`/api/public/sessions/${sessionId}/complete`);
  expect(done.status).toBe(201);
  return { sessionId, asked, submissionId: done.body.data.id as string };
};

describe('Functional tests: FormForge 2.0', () => {
  it('T18 adaptive sessions never repeat a question or exceed the question limit', async () => {
    const random = seededRandom(42);
    for (let i = 0; i < 12; i++) {
      const { asked } = await runSession(random);
      const modeled = asked.filter((id) => id !== 'improve');
      expect(new Set(asked).size).toBe(asked.length);
      expect(modeled.length).toBeLessThanOrEqual(6);
    }
  });

  it('T19 required questions are always asked, first', async () => {
    const { asked } = await runSession(seededRandom(7));
    expect(asked[0]).toBe('consent');
  });

  it('T20 a completed session stores answers and predicted values separately', async () => {
    const { submissionId, asked } = await runSession(seededRandom(3));
    const sub = await prisma.submission.findUniqueOrThrow({ where: { id: submissionId } });
    const responses = sub.responses as Record<string, unknown>;
    const imputed = sub.imputed as Record<string, { value: string; confidence: number }>;
    expect(Object.keys(responses).every((id) => asked.includes(id))).toBe(true);
    expect(Object.keys(imputed).length).toBeGreaterThan(0);
    for (const [id, p] of Object.entries(imputed)) {
      expect(asked).not.toContain(id);
      expect(p.confidence).toBeGreaterThan(0);
    }
  });

  it('T21 out-of-order answers, early completion and double completion are refused', async () => {
    const start = await request(app).post(`/api/public/forms/${form.slug}/sessions`);
    const { sessionId, question } = start.body.data;
    const wrong = await request(app).post(`/api/public/sessions/${sessionId}/answers`).send({ fieldId: 'r12', value: '3' });
    expect(wrong.status).toBe(409);
    const early = await request(app).post(`/api/public/sessions/${sessionId}/complete`);
    expect(early.status).toBe(409);
    const bad = await request(app).post(`/api/public/sessions/${sessionId}/answers`).send({ fieldId: question.id, value: 'not-an-option' });
    expect(bad.status).toBe(400);

    const { sessionId: finished } = await runSession(seededRandom(9));
    const again = await request(app).post(`/api/public/sessions/${finished}/complete`);
    expect(again.status).toBe(409);
  });

  it('T22 the public form hides question metadata', async () => {
    const res = await request(app).get(`/api/public/forms/${form.slug}`);
    const text = JSON.stringify(res.body.data);
    expect(text).not.toContain('relevance');
    expect(text).not.toContain('informationTarget');
  });

  it('T23 AI generation returns a draft with metadata and a quality report', async () => {
    const res = await owner.agent
      .post(`/api/v1/workspaces/${owner.workspaceId}/ai/forms/generate`)
      .send({ description: 'Feedback form for interns who finished a summer internship', questionCount: 3 });
    expect(res.status).toBe(200);
    expect(res.body.data.fields).toHaveLength(3);
    expect(res.body.data.fields[1]).toMatchObject({ type: 'RATING', informationTarget: 'overall_satisfaction' });
    expect(res.body.data.quality.score).toBeGreaterThan(0);
  });

  it('T24 the quality report of a saved form is stored and returned', async () => {
    const post = await owner.agent.post(`${base()}/quality`).send({ deep: false });
    expect(post.status).toBe(201);
    const get = await owner.agent.get(`${base()}/quality`);
    expect(get.body.data).toMatchObject({ id: post.body.data.id, score: post.body.data.score });
  });

  it('T25 a synthetic warm start trains the model but never creates submissions', async () => {
    const before = await prisma.submission.count({ where: { formId: form.id } });
    const res = await owner.agent.post(`${base()}/simulate`).send({ personas: 20 });
    expect(res.status).toBe(201);
    expect(res.body.data).toMatchObject({ personas: 20, answerRate: 1 });
    expect(res.body.data.model.nSynthetic).toBe(20);
    expect(await prisma.syntheticResponse.count({ where: { formId: form.id } })).toBe(20);
    expect(await prisma.submission.count({ where: { formId: form.id } })).toBe(before);
    const removed = await owner.agent.delete(`${base()}/simulate`);
    expect(removed.body.data.removed).toBe(20);
  });

  it('T26 a Viewer can read adaptive status but cannot start a warm start', async () => {
    const viewer = await newUser('Viewer');
    await prisma.membership.create({ data: { userId: (await prisma.user.findUniqueOrThrow({ where: { email: viewer.email } })).id, workspaceId: owner.workspaceId, role: Role.VIEWER } });
    expect((await viewer.agent.get(`${base()}/adaptive`)).status).toBe(200);
    expect((await viewer.agent.post(`${base()}/simulate`).send({ personas: 10 })).status).toBe(403);
  });

  it('T27 insights mask personal details before any text reaches the model', async () => {
    const { submissionService } = await import('../../src/services/submission.service.js');
    const pii = ['priya.sharma@gmail.com', '9876543210', 'Ravi Kumar'];
    await submissionService.record(form, { responses: { consent: 'option_1', improve: `The stipend was late. Mail priya.sharma@gmail.com or call 9876543210.` } });
    await submissionService.record(form, { responses: { consent: 'option_1', improve: 'My mentor Ravi Kumar had no time for interns.' } });
    ai.calls = [];
    const res = await owner.agent.post(`${base()}/insights`);
    expect(res.status).toBe(202);
    await insightService.settle(form.id);
    const status = await owner.agent.get(`${base()}/insights`);
    expect(status.body.data).toMatchObject({ running: false, lastError: null });
    expect(status.body.data.insight.sentiment.masked).toEqual({ EMAIL: 1, PHONE: 1, PERSON: 1 });
    const sent = JSON.stringify(ai.calls);
    for (const value of pii) {
      expect(sent).not.toContain(value);
      expect(JSON.stringify(status.body.data.insight)).not.toContain(value);
    }
  });

  it('T28 the seventh AI request in a minute is rate limited', async () => {
    // Six AI requests are allowed per user per minute; T23 (generate), T25 (simulate) and
    // T27 (insights) used three of them, and T24 ran without the AI review.
    const statuses: number[] = [];
    for (let i = 0; i < 4; i++) {
      const res = await owner.agent
        .post(`/api/v1/workspaces/${owner.workspaceId}/ai/forms/generate`)
        .send({ description: 'Feedback form for interns who finished a summer internship', questionCount: 3 });
      statuses.push(res.status);
    }
    expect(statuses).toEqual([200, 200, 200, 429]);
  });
});
