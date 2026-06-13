import { prisma } from '../lib/prisma.js';

export const inviteTokenRepository = {
  create: (data: {
    workspaceId: string;
    email: string;
    token: string;
    role: import('@prisma/client').Role;
    expiresAt: Date;
  }) => prisma.inviteToken.create({ data }),
  findByToken: (token: string) => prisma.inviteToken.findUnique({ where: { token } }),
  markUsed: (id: string) =>
    prisma.inviteToken.update({ where: { id }, data: { usedAt: new Date() } })
};
