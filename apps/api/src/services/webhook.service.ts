import { createHmac } from 'node:crypto';
import { DeliveryStatus } from '@prisma/client';
import { webhookDeliveryRepository } from '../repositories/webhookDelivery.repository.js';

const BACKOFF_MS = [30_000, 120_000, 600_000, 3_600_000, 14_400_000];

export const computeBackoff = (attemptCount: number): number => {
  const index = Math.min(attemptCount, BACKOFF_MS.length - 1);
  return BACKOFF_MS[index]!;
};

const signPayload = (payload: string): string => {
  const secret = process.env.WEBHOOK_SIGNING_SECRET ?? '';
  return createHmac('sha256', secret).update(payload).digest('hex');
};

export const webhookService = {
  deliver: async (delivery: Awaited<ReturnType<typeof webhookDeliveryRepository.findPending>>[0]) => {
    const config = delivery.workflowStep.actionConfig as { url: string };
    const payload = {
      deliveryId: delivery.id,
      submissionId: delivery.submissionId,
      formId: delivery.workflowStep.workflow.formId,
      responses: delivery.submission.responses,
      submittedAt: delivery.submission.submittedAt
    };
    const body = JSON.stringify(payload);
    const controller = new AbortController();
    const timeout = setTimeout(() => controller.abort(), 10_000);

    try {
      const response = await fetch(config.url, {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
          'X-FormForge-Delivery': delivery.id,
          'X-FormForge-Signature': signPayload(body)
        },
        body,
        signal: controller.signal
      });
      const responseBody = await response.text();
      if (response.ok) {
        await webhookDeliveryRepository.updateDelivery(delivery.id, {
          status: DeliveryStatus.DELIVERED,
          lastResponseBody: responseBody.slice(0, 5000),
          lastResponseStatus: response.status
        });
        return;
      }
      throw new Error(`HTTP ${response.status}`);
    } catch (err) {
      const nextAttempt = delivery.attemptCount + 1;
      if (nextAttempt >= 5) {
        await webhookDeliveryRepository.updateDelivery(delivery.id, {
          status: DeliveryStatus.FAILED,
          attemptCount: nextAttempt
        });
        return;
      }
      await webhookDeliveryRepository.updateDelivery(delivery.id, {
        attemptCount: nextAttempt,
        nextRetryAt: new Date(Date.now() + computeBackoff(nextAttempt - 1)),
        lastResponseBody: err instanceof Error ? err.message : 'Unknown error'
      });
    } finally {
      clearTimeout(timeout);
    }
  }
};
