import { DeliveryStatus } from '@prisma/client';
import { prisma } from '../lib/prisma.js';

export const webhookDeliveryRepository = {
  create: (data: { workflowStepId: string; submissionId: string }) =>
    prisma.webhookDelivery.create({ data }),
  findPending: () =>
    prisma.webhookDelivery.findMany({
      where: {
        status: DeliveryStatus.PENDING,
        nextRetryAt: { lte: new Date() }
      },
      include: {
        workflowStep: { include: { workflow: { include: { form: true } } } },
        submission: true
      },
      take: 50
    }),
  updateDelivery: (
    id: string,
    data: {
      status?: DeliveryStatus;
      attemptCount?: number;
      nextRetryAt?: Date;
      lastResponseBody?: string | null;
      lastResponseStatus?: number | null;
    }
  ) => prisma.webhookDelivery.update({ where: { id }, data })
};
