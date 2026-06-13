import cron from 'node-cron';
import { webhookDeliveryRepository } from '../repositories/webhookDelivery.repository.js';
import { webhookService } from '../services/webhook.service.js';

export const startWebhookRetryJob = (): void => {
  if (process.env.NODE_ENV === 'test') return;
  cron.schedule('*/60 * * * * *', async () => {
    const pending = await webhookDeliveryRepository.findPending();
    await Promise.all(pending.map((d) => webhookService.deliver(d)));
  });
};
