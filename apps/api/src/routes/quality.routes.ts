import { Router, type NextFunction, type Request, type Response } from 'express';
import { Role } from '@prisma/client';
import { authenticate } from '../middleware/authenticate.js';
import { authorize } from '../middleware/authorize.js';
import { validate } from '../middleware/validate.js';
import { aiRateLimiter } from '../middleware/rate-limit.js';
import { workspaceIdParamsSchema } from '../schemas/workspace.schema.js';
import { formParamsSchema } from '../schemas/forms.schema.js';
import { analyzeQualitySchema, formQualitySchema } from '../schemas/quality.schema.js';
import { qualityService } from '../services/quality/quality.service.js';
import { asyncHandler } from '../lib/async-handler.js';
import { sendSuccess } from '../lib/response.js';

const allRoles = [Role.OWNER, Role.ADMIN, Role.MEMBER, Role.VIEWER];

// Only the AI review spends model quota, so only deep requests are rate limited.
const limitDeep = (req: Request, res: Response, next: NextFunction) =>
  req.body?.deep ? aiRateLimiter(req, res, next) : next();

/** Mounted at /api/v1/workspaces/:workspaceId/quality */
export const qualityRouter = Router({ mergeParams: true });
qualityRouter.use(authenticate);
qualityRouter.post(
  '/analyze',
  validate(workspaceIdParamsSchema, 'params'),
  validate(analyzeQualitySchema),
  authorize(allRoles),
  limitDeep,
  asyncHandler(async (req: Request, res: Response) => {
    const { fields, objective, deep } = req.body;
    sendSuccess(res, await qualityService.analyze({ fields, objective }, deep));
  })
);

/** Mounted at /api/v1/workspaces/:workspaceId/forms/:formId/quality */
export const formQualityRouter = Router({ mergeParams: true });
formQualityRouter.use(authenticate);
formQualityRouter.post(
  '/',
  validate(formParamsSchema, 'params'),
  validate(formQualitySchema),
  authorize(allRoles),
  limitDeep,
  asyncHandler(async (req: Request, res: Response) => {
    const { workspaceId, formId } = req.params as { workspaceId: string; formId: string };
    sendSuccess(res, await qualityService.analyzeForm(req.user!.id, workspaceId, formId, req.body.deep), 201);
  })
);
formQualityRouter.get(
  '/',
  validate(formParamsSchema, 'params'),
  authorize(allRoles),
  asyncHandler(async (req: Request, res: Response) => {
    const { workspaceId, formId } = req.params as { workspaceId: string; formId: string };
    sendSuccess(res, await qualityService.latest(req.user!.id, workspaceId, formId));
  })
);
