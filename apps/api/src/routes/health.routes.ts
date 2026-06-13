import { Router } from 'express';
import { healthController } from '../controllers/health.controller.js';
import { asyncHandler } from '../lib/async-handler.js';

export const healthRouter = Router();
healthRouter.get('/health', asyncHandler(healthController.get));
