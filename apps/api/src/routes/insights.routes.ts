import { Router, type Request, type Response } from 'express';
import { Role } from '@prisma/client';
import { authenticate } from '../middleware/authenticate.js';
import { authorize } from '../middleware/authorize.js';
import { validate } from '../middleware/validate.js';
import { aiRateLimiter } from '../middleware/rate-limit.js';
import { formParamsSchema } from '../schemas/forms.schema.js';
import { insightService } from '../services/insights/insight.service.js';
import { asyncHandler } from '../lib/async-handler.js';
import { sendSuccess } from '../lib/response.js';

type FormParams = { workspaceId: string; formId: string };

/** Mounted at /api/v1/workspaces/:workspaceId/forms/:formId/insights */
export const insightsRouter = Router({ mergeParams: true });
insightsRouter.use(authenticate);
insightsRouter.get(
  '/',
  validate(formParamsSchema, 'params'),
  authorize([Role.OWNER, Role.ADMIN, Role.MEMBER, Role.VIEWER]),
  asyncHandler(async (req: Request, res: Response) => {
    const { workspaceId, formId } = req.params as FormParams;
    sendSuccess(res, await insightService.status(req.user!.id, workspaceId, formId));
  })
);
// Starts a background computation; the client polls GET until `running` is false.
insightsRouter.post(
  '/',
  validate(formParamsSchema, 'params'),
  authorize([Role.OWNER, Role.ADMIN, Role.MEMBER]),
  aiRateLimiter,
  asyncHandler(async (req: Request, res: Response) => {
    const { workspaceId, formId } = req.params as FormParams;
    sendSuccess(res, await insightService.request(req.user!.id, workspaceId, formId), 202);
  })
);
