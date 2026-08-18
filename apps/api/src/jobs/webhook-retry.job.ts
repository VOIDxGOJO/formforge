import cron from 'node-cron';
import { webhookDeliveryRepository } from '../repositories/webhookDelivery.repository.js';
import { webhookService } from '../services/webhook.service.js';

export const startWebhookRetryJob = (): void => {
  if (process.env.NODE_ENV === 'test') return;
  cron.schedule('*/60 * * * * *', async () => {
    try {
      const pending = await webhookDeliveryRepository.findPending();
      await Promise.all(pending.map((d) => webhookService.deliver(d)));
    } catch (err) {
      console.error('[webhook-retry] skipped:', err instanceof Error ? err.message : err);
    }
  });
};
