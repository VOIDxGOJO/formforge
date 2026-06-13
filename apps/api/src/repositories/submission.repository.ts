import type { Prisma } from '@prisma/client';
import { prisma } from '../lib/prisma.js';

export const submissionRepository = {
  create: (data: {
    formId: string;
    responses: Prisma.InputJsonValue;
    ipAddress?: string;
    userAgent?: string;
  }) => prisma.submission.create({ data }),
  findById: (id: string) => prisma.submission.findUnique({ where: { id } }),
  findByForm: (
    formId: string,
    opts: {
      skip: number;
      take: number;
      startDate?: Date;
      endDate?: Date;
    }
  ) => {
    const where: Prisma.SubmissionWhereInput = {
      formId,
      ...(opts.startDate || opts.endDate
        ? {
            submittedAt: {
              ...(opts.startDate ? { gte: opts.startDate } : {}),
              ...(opts.endDate ? { lte: opts.endDate } : {})
            }
          }
        : {})
    };
    return Promise.all([
      prisma.submission.findMany({
        where,
        skip: opts.skip,
        take: opts.take,
        orderBy: { submittedAt: 'desc' }
      }),
      prisma.submission.count({ where })
    ]);
  },
  countByWorkspace: (workspaceId: string, since?: Date) =>
    prisma.submission.count({
      where: {
        form: { workspaceId },
        ...(since ? { submittedAt: { gte: since } } : {})
      }
    }),
  countByDay: (workspaceId: string, days: number) => {
    const since = new Date();
    since.setDate(since.getDate() - days);
    return prisma.$queryRaw<Array<{ day: Date; count: bigint }>>`
      SELECT DATE(s."submittedAt") as day, COUNT(*)::bigint as count
      FROM "Submission" s
      INNER JOIN "Form" f ON s."formId" = f.id
      WHERE f."workspaceId" = ${workspaceId}
        AND s."submittedAt" >= ${since}
      GROUP BY DATE(s."submittedAt")
      ORDER BY day ASC
    `;
  },
  countByForm: (workspaceId: string) =>
    prisma.form.findMany({
      where: { workspaceId },
      select: {
        id: true,
        name: true,
        slug: true,
        _count: { select: { submissions: true } }
      },
      orderBy: { submissions: { _count: 'desc' } }
    })
};
