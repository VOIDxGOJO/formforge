import { Role } from '@prisma/client';
import { v4 as uuidv4 } from 'uuid';
import { nanoid } from 'nanoid';
import { workspaceRepository } from '../repositories/workspace.repository.js';
import { membershipRepository } from '../repositories/membership.repository.js';
import { inviteTokenRepository } from '../repositories/inviteToken.repository.js';
import { userRepository } from '../repositories/user.repository.js';
import { submissionRepository } from '../repositories/submission.repository.js';
import { formRepository } from '../repositories/form.repository.js';
import { workflowRepository } from '../repositories/workflow.repository.js';
import { emailService } from './email.service.js';
import { ConflictError, NotFoundError, ForbiddenError } from '../lib/errors.js';
import { prisma } from '../lib/prisma.js';

const slugify = (name: string) =>
  `${name
    .toLowerCase()
    .replace(/[^a-z0-9]+/g, '-')
    .replace(/^-|-$/g, '')}-${nanoid(6)}`;

export const workspaceService = {
  list: (userId: string) => workspaceRepository.findByUserId(userId),

  get: async (workspaceId: string) => {
    const ws = await workspaceRepository.findById(workspaceId);
    if (!ws) throw NotFoundError('Workspace not found');
    return ws;
  },

  create: async (userId: string, name: string) => {
    const workspace = await workspaceRepository.create({ name, slug: slugify(name) });
    await membershipRepository.create({ userId, workspaceId: workspace.id, role: Role.OWNER });
    return workspace;
  },

  update: (workspaceId: string, name: string) => workspaceRepository.update(workspaceId, { name }),

  invite: async (
    workspaceId: string,
    email: string,
    role: Role,
    inviterName: string
  ) => {
    const token = uuidv4();
    const expiresAt = new Date(Date.now() + 7 * 24 * 60 * 60 * 1000);
    await inviteTokenRepository.create({ workspaceId, email, token, role, expiresAt });
    const workspace = await workspaceRepository.findById(workspaceId);
    const appUrl = process.env.NEXT_PUBLIC_APP_URL ?? 'http://localhost:3000';
    await emailService.sendInvite(
      email,
      workspace?.name ?? 'Workspace',
      `${appUrl}/accept-invite?token=${token}`
    );
    return { email, role, invitedBy: inviterName };
  },

  acceptInvite: async (userId: string, token: string) => {
    const invite = await inviteTokenRepository.findByToken(token);
    if (!invite || invite.usedAt || invite.expiresAt < new Date()) {
      throw NotFoundError('Invalid or expired invite');
    }
    const user = await userRepository.findById(userId);
    if (!user || user.email !== invite.email) {
      throw ForbiddenError('Invite email does not match your account');
    }
    const existing = await membershipRepository.findByUserAndWorkspace(
      userId,
      invite.workspaceId
    );
    if (existing) throw ConflictError('Already a member');
    await membershipRepository.create({
      userId,
      workspaceId: invite.workspaceId,
      role: invite.role
    });
    await inviteTokenRepository.markUsed(invite.id);
    return workspaceRepository.findById(invite.workspaceId);
  },

  listMembers: (workspaceId: string) => membershipRepository.findByWorkspace(workspaceId),

  removeMember: async (workspaceId: string, targetUserId: string, actorRole: Role) => {
    const target = await membershipRepository.findByUserAndWorkspace(
      targetUserId,
      workspaceId
    );
    if (!target) throw NotFoundError('Member not found');
    if (target.role === Role.OWNER) throw ForbiddenError('Cannot remove workspace owner');
    if (actorRole !== Role.OWNER && actorRole !== Role.ADMIN) {
      throw ForbiddenError();
    }
    await membershipRepository.delete(targetUserId, workspaceId);
  },

  deleteWorkspace: async (workspaceId: string) => {
    await workspaceRepository.delete(workspaceId);
  },

  getAnalytics: async (workspaceId: string) => {
    const since30d = new Date();
    since30d.setDate(since30d.getDate() - 30);
    const [forms, submissionsByDay, totalSubmissions, formBreakdown] = await Promise.all([
      prisma.form.count({ where: { workspaceId } }),
      submissionRepository.countByDay(workspaceId, 30),
      submissionRepository.countByWorkspace(workspaceId, since30d),
      submissionRepository.countByForm(workspaceId)
    ]);
    const activeWorkflows = await prisma.workflow.count({
      where: { form: { workspaceId }, isActive: true }
    });
    return {
      totalForms: forms,
      totalSubmissions30d: totalSubmissions,
      activeWorkflows,
      submissionsByDay: submissionsByDay.map((r) => ({
        day: r.day,
        count: Number(r.count)
      })),
      formBreakdown: formBreakdown.map((f) => ({
        id: f.id,
        name: f.name,
        slug: f.slug,
        submissionCount: f._count.submissions
      }))
    };
  }
};
