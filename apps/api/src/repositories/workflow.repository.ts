import type { Prisma } from '@prisma/client';
import { prisma } from '../lib/prisma.js';

export const workflowRepository = {
  findByForm: (formId: string) =>
    prisma.workflow.findMany({
      where: { formId },
      include: { steps: { orderBy: { order: 'asc' } } },
      orderBy: { createdAt: 'desc' }
    }),
  findActiveByForm: (formId: string) =>
    prisma.workflow.findMany({
      where: { formId, isActive: true },
      include: { steps: { orderBy: { order: 'asc' } } }
    }),
  findById: (id: string) =>
    prisma.workflow.findUnique({
      where: { id },
      include: { steps: { orderBy: { order: 'asc' } } }
    }),
  create: (data: {
    formId: string;
    name: string;
    isActive: boolean;
    steps: Array<{
      actionType: import('@prisma/client').ActionType;
      actionConfig: Prisma.InputJsonValue;
      order: number;
    }>;
  }) =>
    prisma.workflow.create({
      data: {
        formId: data.formId,
        name: data.name,
        isActive: data.isActive,
        steps: { create: data.steps }
      },
      include: { steps: { orderBy: { order: 'asc' } } }
    }),
  update: (
    id: string,
    data: Partial<{ name: string; isActive: boolean }>,
    steps?: Array<{
      actionType: import('@prisma/client').ActionType;
      actionConfig: Prisma.InputJsonValue;
      order: number;
    }>
  ) =>
    prisma.$transaction(async (tx) => {
      if (steps) {
        await tx.workflowStep.deleteMany({ where: { workflowId: id } });
        await tx.workflowStep.createMany({
          data: steps.map((s) => ({ workflowId: id, ...s }))
        });
      }
      return tx.workflow.update({
        where: { id },
        data,
        include: { steps: { orderBy: { order: 'asc' } } }
      });
    }),
  delete: (id: string) => prisma.workflow.delete({ where: { id } })
};
