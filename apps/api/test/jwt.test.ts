import jwt from 'jsonwebtoken';
import { describe, expect, it } from 'vitest';
import { signAccessToken, signRefreshToken, verifyAccessToken, verifyRefreshToken } from '../src/lib/jwt.js';

describe('jwt helpers', () => {
  it('round-trips an access token', () => {
    const token = signAccessToken({ sub: 'user-1', email: 'u@test.dev' });
    expect(verifyAccessToken(token)).toMatchObject({ sub: 'user-1', email: 'u@test.dev' });
  });

  it('does not accept a refresh token as an access token', () => {
    const refresh = signRefreshToken({ sub: 'user-1', jti: 'abc' });
    expect(() => verifyAccessToken(refresh)).toThrow('Invalid or expired access token');
    expect(verifyRefreshToken(refresh)).toMatchObject({ sub: 'user-1', jti: 'abc' });
  });

  it('rejects an expired access token', () => {
    const expired = jwt.sign({ sub: 'user-1', email: 'u@test.dev' }, 'test-access-secret', { expiresIn: -10 });
    expect(() => verifyAccessToken(expired)).toThrow();
  });
});
