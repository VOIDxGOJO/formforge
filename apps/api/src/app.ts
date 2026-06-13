import 'dotenv/config';
import express from 'express';
import cors from 'cors';
import helmet from 'helmet';
import cookieParser from 'cookie-parser';
import morgan from 'morgan';
import { healthRouter } from './routes/health.routes.js';
import { authRouter } from './routes/auth.routes.js';
import { workspacesRouter } from './routes/workspaces.routes.js';
import { formsRouter } from './routes/forms.routes.js';
import { publicRouter } from './routes/public.routes.js';
import { uploadsRouter } from './routes/uploads.routes.js';
import { sseRouter } from './routes/sse.routes.js';
import { globalRateLimiter } from './middleware/rate-limit.js';
import { notFoundHandler } from './middleware/not-found.js';
import { errorHandler } from './middleware/error-handler.js';

export const createApp = (): express.Application => {
  const app = express();

  app.use(helmet());
  app.use(
    cors({
      origin: process.env.CORS_ORIGIN,
      credentials: true
    })
  );
  app.use(
    morgan(process.env.NODE_ENV === 'production' ? 'combined' : 'dev')
  );
  app.use(cookieParser());
  app.use(express.json({ limit: '2mb' }));
  app.use(globalRateLimiter);

  app.use('/api', healthRouter);
  app.get('/', (_req, res) => {
    res.json({
      success: true,
      data: {
        name: 'FormForge API',
        health: '/api/health',
        docs: 'Use the web app at http://localhost:3000'
      }
    });
  });
  app.use('/api/v1/auth', authRouter);
  app.use('/api/v1/workspaces', workspacesRouter);
  app.use(
    '/api/v1/workspaces/:workspaceId/forms',
    formsRouter
  );
  app.use('/api/v1/uploads', uploadsRouter);
  app.use('/api/v1/sse', sseRouter);
  app.use('/api/public', publicRouter);

  app.use(notFoundHandler);
  app.use(errorHandler);

  return app;
};
