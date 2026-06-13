import type { Role } from '@prisma/client';
import { prisma } from '../lib/prisma.js';

export const membershipRepository = {
  findByUserAndWorkspace: (userId: string, workspaceId: string) =>
    prisma.membership.findUnique({
      where: { userId_workspaceId: { userId, workspaceId } }
    }),
  findByWorkspace: (workspaceId: string) =>
    prisma.membership.findMany({
      where: { workspaceId },
      include: { user: { select: { id: true, email: true, name: true } } }
    }),
  create: (data: { userId: string; workspaceId: string; role: Role }) =>
    prisma.membership.create({ data }),
  updateRole: (userId: string, workspaceId: string, role: Role) =>
    prisma.membership.update({
      where: { userId_workspaceId: { userId, workspaceId } },
      data: { role }
    }),
  delete: (userId: string, workspaceId: string) =>
    prisma.membership.delete({
      where: { userId_workspaceId: { userId, workspaceId } }
    })
};
