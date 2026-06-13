import type { Prisma } from '@prisma/client';
import { prisma } from '../lib/prisma.js';

export const formRepository = {
  findById: (id: string) => prisma.form.findUnique({ where: { id } }),
  findBySlug: (slug: string) =>
    prisma.form.findUnique({
      where: { slug },
      include: { workspace: true }
    }),
  findByWorkspace: (
    workspaceId: string,
    opts: { skip: number; take: number; q?: string }
  ) => {
    const where: Prisma.FormWhereInput = {
      workspaceId,
      ...(opts.q ? { name: { contains: opts.q, mode: 'insensitive' } } : {})
    };
    return Promise.all([
      prisma.form.findMany({
        where,
        skip: opts.skip,
        take: opts.take,
        orderBy: { updatedAt: 'desc' }
      }),
      prisma.form.count({ where })
    ]);
  },
  create: (data: { workspaceId: string; name: string; slug: string }) =>
    prisma.form.create({ data }),
  update: (
    id: string,
    data: Partial<{ name: string; fields: Prisma.InputJsonValue; isActive: boolean }>
  ) => prisma.form.update({ where: { id }, data }),
  delete: (id: string) => prisma.form.delete({ where: { id } })
};
