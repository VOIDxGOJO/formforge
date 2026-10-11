import request from 'supertest';
import { afterAll, beforeAll, describe, expect, it } from 'vitest';
import { prisma } from '../../src/lib/prisma.js';
import { app, createForm, newUser } from './helpers.js';

// Report Table 7.1, T1-T17: the base platform, run against a real database.

const fields = [
  { id: 'name', type: 'TEXT', label: 'Your name', required: true },
  { id: 'email', type: 'EMAIL', label: 'E-mail', required: false },
  { id: 'overall', type: 'RATING', label: 'Overall, how satisfied were you?', required: true }
];

let owner: Awaited<ReturnType<typeof newUser>>;
let form: { id: string; slug: string };

beforeAll(async () => {
  owner = await newUser('Form Owner');
  form = await createForm(owner.agent, owner.workspaceId, 'Workshop Feedback', fields);
});
afterAll(async () => {
  await prisma.$disconnect();
});

describe('Functional tests: base platform', () => {
  it('T1 health check reports the database as connected', async () => {
    const res = await request(app).get('/api/health');
    expect(res.status).toBe(200);
    expect(res.body.data).toMatchObject({ status: 'ok' });
  });

  it('T2 registering an existing e-mail returns 409', async () => {
    const res = await request(app).post('/api/v1/auth/register').send({ name: 'Again', email: owner.email, password: owner.password });
    expect(res.status).toBe(409);
  });

  it('T3 login with a wrong password returns 401 with a generic message', async () => {
    const res = await request(app).post('/api/v1/auth/login').send({ email: owner.email, password: 'wrong-password-1' });
    expect(res.status).toBe(401);
    expect(res.body.error.message).toMatch(/invalid/i);
  });

  it('T4 registering with a 3 character password returns 400', async () => {
    const res = await request(app).post('/api/v1/auth/register').send({ name: 'Short', email: 'short@formforge.test', password: 'abc' });
    expect(res.status).toBe(400);
  });

  it('T5 listing forms without a session cookie returns 401', async () => {
    const res = await request(app).get(`/api/v1/workspaces/${owner.workspaceId}/forms`);
    expect(res.status).toBe(401);
  });

  it('T6 login with valid credentials sets two HTTP-only cookies', async () => {
    const res = await request(app).post('/api/v1/auth/login').send({ email: owner.email, password: owner.password });
    expect(res.status).toBe(200);
    const cookies = ([] as string[]).concat(res.headers['set-cookie'] ?? []);
    expect(cookies).toHaveLength(2);
    expect(cookies.every((c) => /HttpOnly/i.test(c))).toBe(true);
  });

  it('T7 a workspace id that is not a UUID returns 400', async () => {
    const res = await owner.agent.get('/api/v1/workspaces/not-a-uuid/forms');
    expect(res.status).toBe(400);
  });

  it('T8 a workspace the user is not a member of returns 403', async () => {
    const outsider = await newUser('Outsider');
    const res = await outsider.agent.get(`/api/v1/workspaces/${owner.workspaceId}/forms`);
    expect(res.status).toBe(403);
  });

  it('T9 a published form opens by slug without login', async () => {
    const res = await request(app).get(`/api/public/forms/${form.slug}`);
    expect(res.status).toBe(200);
    expect(res.body.data.fields).toHaveLength(3);
  });

  it('T10 submitting without a required field returns 400 naming the field', async () => {
    const res = await request(app).post(`/api/public/forms/${form.slug}/submit`).send({ responses: { overall: '4' } });
    expect(res.status).toBe(400);
    expect(res.body.error.message).toContain('Your name');
  });

  it('T11 an invalid e-mail value returns 400 naming the field', async () => {
    const res = await request(app)
      .post(`/api/public/forms/${form.slug}/submit`)
      .send({ responses: { name: 'Asha', email: 'not-an-email', overall: '4' } });
    expect(res.status).toBe(400);
    expect(res.body.error.message).toMatch(/E-mail.*valid email/i);
  });

  it('T12 a valid response is stored', async () => {
    const res = await request(app)
      .post(`/api/public/forms/${form.slug}/submit`)
      .send({ responses: { name: 'Asha', email: 'asha@example.com', overall: '4' } });
    expect(res.status).toBe(201);
    expect(await prisma.submission.count({ where: { formId: form.id } })).toBe(1);
  });

  it('T13 the sixth public submission within a minute is rate limited', async () => {
    // T10-T12 already used three of the five allowed requests.
    const statuses: number[] = [];
    for (let i = 0; i < 3; i++) {
      const res = await request(app).post(`/api/public/forms/${form.slug}/submit`).send({ responses: { name: `R${i}`, overall: '3' } });
      statuses.push(res.status);
    }
    expect(statuses).toEqual([201, 201, 429]);
  });

  it('T14 CSV export quotes labels that contain commas (RFC 4180)', async () => {
    const res = await owner.agent.get(`/api/v1/workspaces/${owner.workspaceId}/forms/${form.id}/submissions/export`);
    expect(res.status).toBe(200);
    const [header, ...rows] = res.text.trim().split(/\r?\n/);
    expect(header).toContain('"Overall, how satisfied were you?"');
    expect(rows).toHaveLength(3);
  });

  it('T15 a submission on a form with a webhook workflow creates a pending delivery', async () => {
    const hooked = await createForm(owner.agent, owner.workspaceId, 'Hooked Form', [{ id: 'msg', type: 'TEXT', label: 'Message', required: true }]);
    const wf = await owner.agent
      .post(`/api/v1/workspaces/${owner.workspaceId}/forms/${hooked.id}/workflows`)
      .send({ name: 'Notify', steps: [{ actionType: 'WEBHOOK', actionConfig: { url: 'https://example.com/hook' }, order: 0 }] });
    expect(wf.status).toBe(201);
    // Recorded through the service: the public route's limit was used up by T13.
    const { submissionService } = await import('../../src/services/submission.service.js');
    await submissionService.record({ id: hooked.id, workspaceId: owner.workspaceId }, { responses: { msg: 'hello' } });
    const delivery = await prisma.webhookDelivery.findFirst({ where: { workflowStep: { workflow: { formId: hooked.id } } } });
    expect(delivery).toMatchObject({ status: 'PENDING', attemptCount: 0 });
  });

  it('T16 an unpublished form returns 404 by slug', async () => {
    const hidden = await createForm(owner.agent, owner.workspaceId, 'Hidden Form', fields, { isActive: false });
    const res = await request(app).get(`/api/public/forms/${hidden.slug}`);
    expect(res.status).toBe(404);
  });

  it('T17 workspace analytics returns totals and daily counts', async () => {
    const res = await owner.agent.get(`/api/v1/workspaces/${owner.workspaceId}/analytics`);
    expect(res.status).toBe(200);
    expect(res.body.data).toMatchObject({ totalForms: 3, totalSubmissions30d: 4, activeWorkflows: 1 });
    expect(res.body.data.submissionsByDay.reduce((s: number, d: { count: number }) => s + d.count, 0)).toBe(4);
  });
});
