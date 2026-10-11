import { describe, expect, it } from 'vitest';
import { inviteSchema } from '../src/schemas/workspace.schema.js';

describe('inviteSchema', () => {
  it('defaults to MEMBER and allows ADMIN and VIEWER', () => {
    expect(inviteSchema.parse({ email: 'a@b.dev' }).role).toBe('MEMBER');
    expect(inviteSchema.parse({ email: 'a@b.dev', role: 'ADMIN' }).role).toBe('ADMIN');
    expect(inviteSchema.parse({ email: 'a@b.dev', role: 'VIEWER' }).role).toBe('VIEWER');
  });

  it('never allows inviting someone as OWNER', () => {
    expect(inviteSchema.safeParse({ email: 'a@b.dev', role: 'OWNER' }).success).toBe(false);
  });
});
