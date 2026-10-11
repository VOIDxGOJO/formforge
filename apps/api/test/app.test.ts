import request from 'supertest';
import { describe, expect, it } from 'vitest';
import { createApp } from '../src/app.js';

// These cases stop in middleware (routing, validation, authentication),
// so they run without a database.
const app = createApp();

describe('API smoke tests', () => {
  it('returns the error envelope for unknown routes', async () => {
    const res = await request(app).get('/api/v1/does-not-exist');
    expect(res.status).toBe(404);
    expect(res.body).toEqual({ success: false, error: { code: 'NOT_FOUND', message: 'Route not found' } });
  });

  it('rejects registration with a short password', async () => {
    const res = await request(app)
      .post('/api/v1/auth/register')
      .send({ name: 'Ab', email: 'a@b.test', password: '123' });
    expect(res.status).toBe(400);
    expect(res.body.error.code).toBe('VALIDATION_ERROR');
  });

  it('rejects login with a malformed e-mail', async () => {
    const res = await request(app).post('/api/v1/auth/login').send({ email: 'not-an-email', password: 'x' });
    expect(res.status).toBe(400);
    expect(res.body.error.code).toBe('VALIDATION_ERROR');
  });

  it('requires a session cookie for workspace routes', async () => {
    const res = await request(app).get('/api/v1/workspaces');
    expect(res.status).toBe(401);
    expect(res.body.error.code).toBe('UNAUTHORIZED');
  });

  it('rejects a forged access token', async () => {
    const res = await request(app).get('/api/v1/auth/me').set('Cookie', 'access_token=forged.token.value');
    expect(res.status).toBe(401);
  });

  it('rejects a public submission without a responses object', async () => {
    const res = await request(app).post('/api/public/forms/some-form/submit').send({ answers: {} });
    expect(res.status).toBe(400);
    expect(res.body.error.code).toBe('VALIDATION_ERROR');
  });
});
