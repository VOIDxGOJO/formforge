import { z } from 'zod';
import { Role } from '@prisma/client';

export const createWorkspaceSchema = z.object({
  name: z.string().min(2).max(100)
});

export const updateWorkspaceSchema = z.object({
  name: z.string().min(2).max(100)
});

// Ownership is never granted through an invite; only one OWNER exists per workspace.
export const inviteSchema = z.object({
  email: z.string().email(),
  role: z.enum([Role.ADMIN, Role.MEMBER, Role.VIEWER]).default(Role.MEMBER)
});

export const acceptInviteSchema = z.object({
  token: z.string().min(1)
});

export const workspaceIdParamsSchema = z.object({
  workspaceId: z.string().uuid()
});

export const memberParamsSchema = workspaceIdParamsSchema.extend({
  userId: z.string().uuid()
});
