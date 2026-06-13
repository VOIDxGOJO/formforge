import { Router } from 'express';
import { Role } from '@prisma/client';
import { sseController } from '../controllers/sse.controller.js';
import { authenticate } from '../middleware/authenticate.js';
import { authorize } from '../middleware/authorize.js';
import { workspaceIdParamsSchema } from '../schemas/workspace.schema.js';
import { validate } from '../middleware/validate.js';

export const sseRouter = Router();

sseRouter.get(
  '/:workspaceId',
  authenticate,
  validate(workspaceIdParamsSchema, 'params'),
  authorize([Role.OWNER, Role.ADMIN, Role.MEMBER, Role.VIEWER]),
  sseController.connect
);
