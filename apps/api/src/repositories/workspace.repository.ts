import { prisma } from '../lib/prisma.js';

export const workspaceRepository = {
  findById: (id: string) => prisma.workspace.findUnique({ where: { id } }),
  findBySlug: (slug: string) => prisma.workspace.findUnique({ where: { slug } }),
  findByUserId: (userId: string) =>
    prisma.workspace.findMany({
      where: { memberships: { some: { userId } } },
      orderBy: { createdAt: 'desc' }
    }),
  create: (data: { name: string; slug: string }) => prisma.workspace.create({ data }),
  update: (id: string, data: { name: string }) =>
    prisma.workspace.update({ where: { id }, data }),
  delete: (id: string) => prisma.workspace.delete({ where: { id } })
};
