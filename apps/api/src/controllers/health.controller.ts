import type { Request, Response } from 'express';
import { prisma } from '../lib/prisma.js';
import { sendSuccess } from '../lib/response.js';

export const healthController = {
  get: async (_req: Request, res: Response) => {
    let db: 'connected' | 'error' = 'connected';
    try {
      await prisma.$queryRaw`SELECT 1`;
    } catch {
      db = 'error';
    }
    const payload = {
      status: db === 'connected' ? 'ok' : 'degraded',
      timestamp: new Date().toISOString(),
      uptime: process.uptime(),
      db
    };
    if (db === 'error') {
      res.status(503);
    }
    sendSuccess(res, payload);
  }
};
