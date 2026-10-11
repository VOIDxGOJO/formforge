import { Router, type Request, type Response } from 'express';
import { Role } from '@prisma/client';
import { authenticate } from '../middleware/authenticate.js';
import { authorize } from '../middleware/authorize.js';
import { validate } from '../middleware/validate.js';
import { aiRateLimiter } from '../middleware/rate-limit.js';
import { workspaceIdParamsSchema } from '../schemas/workspace.schema.js';
import { generateFormRequestSchema } from '../schemas/ai-form.schema.js';
import { aiFormService } from '../services/ai-form.service.js';
import { asyncHandler } from '../lib/async-handler.js';
import { sendSuccess } from '../lib/response.js';

export const aiFormsRouter = Router({ mergeParams: true });

aiFormsRouter.use(authenticate);

aiFormsRouter.post(
  '/generate',
  validate(workspaceIdParamsSchema, 'params'),
  validate(generateFormRequestSchema),
  authorize([Role.OWNER, Role.ADMIN, Role.MEMBER]),
  aiRateLimiter,
  asyncHandler(async (req: Request, res: Response) => {
    sendSuccess(res, await aiFormService.generate(req.body));
  })
);
