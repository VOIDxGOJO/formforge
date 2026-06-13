import { createServer } from 'node:http';
import { createApp } from './app.js';
import { prisma } from './lib/prisma.js';
import { startWebhookRetryJob } from './jobs/webhook-retry.job.js';

const port = Number(process.env.PORT ?? 3001);
const app = createApp();
const server = createServer(app);

server.listen(port, () => {
  console.log(`FormForge API listening on http://localhost:${port}`);
  startWebhookRetryJob();
});

const shutdown = (signal: string) => {
  console.log(`Received ${signal}, shutting down...`);
  server.close(() => {
    void prisma.$disconnect().then(() => process.exit(0));
  });
  setTimeout(() => {
    void prisma.$disconnect().then(() => process.exit(1));
  }, 5000);
};

process.on('SIGTERM', () => shutdown('SIGTERM'));
process.on('SIGINT', () => shutdown('SIGINT'));
