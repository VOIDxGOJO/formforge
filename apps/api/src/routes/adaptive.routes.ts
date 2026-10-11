import { Router, type Request, type Response } from 'express';
import { Role } from '@prisma/client';
import { z } from 'zod';
import { authenticate } from '../middleware/authenticate.js';
import { authorize } from '../middleware/authorize.js';
import { validate } from '../middleware/validate.js';
import { publicSessionRateLimiter } from '../middleware/rate-limit.js';
import { adaptiveConfigSchema, formParamsSchema } from '../schemas/forms.schema.js';
import { adaptiveService } from '../services/adaptive.service.js';
import { asyncHandler } from '../lib/async-handler.js';
import { sendSuccess } from '../lib/response.js';

const allRoles = [Role.OWNER, Role.ADMIN, Role.MEMBER, Role.VIEWER];
const editors = [Role.OWNER, Role.ADMIN, Role.MEMBER];
type FormParams = { workspaceId: string; formId: string };

/** Creator side, mounted at /api/v1/workspaces/:workspaceId/forms/:formId/adaptive */
export const adaptiveRouter = Router({ mergeParams: true });
adaptiveRouter.use(authenticate);
adaptiveRouter.get(
  '/',
  validate(formParamsSchema, 'params'),
  authorize(allRoles),
  asyncHandler(async (req: Request, res: Response) => {
    const { workspaceId, formId } = req.params as FormParams;
    sendSuccess(res, await adaptiveService.status(req.user!.id, workspaceId, formId));
  })
);
adaptiveRouter.patch(
  '/',
  validate(formParamsSchema, 'params'),
  validate(adaptiveConfigSchema),
  authorize(editors),
  asyncHandler(async (req: Request, res: Response) => {
    const { workspaceId, formId } = req.params as FormParams;
    sendSuccess(res, await adaptiveService.updateConfig(req.user!.id, workspaceId, formId, req.body));
  })
);
adaptiveRouter.post(
  '/refit',
  validate(formParamsSchema, 'params'),
  authorize(editors),
  asyncHandler(async (req: Request, res: Response) => {
    const { workspaceId, formId } = req.params as FormParams;
    sendSuccess(res, await adaptiveService.refitForCreator(req.user!.id, workspaceId, formId), 201);
  })
);

/** Respondent side, mounted at /api/public */
export const publicAdaptiveRouter = Router();
const slugParams = z.object({ slug: z.string().min(1) });
const sessionParams = z.object({ sessionId: z.string().uuid() });
const answerBody = z.object({
  fieldId: z.string().min(1),
  value: z.union([z.string().max(5000), z.number(), z.null()])
});

publicAdaptiveRouter.post(
  '/forms/:slug/sessions',
  publicSessionRateLimiter,
  validate(slugParams, 'params'),
  asyncHandler(async (req: Request, res: Response) => {
    sendSuccess(res, await adaptiveService.start(req.params.slug as string), 201);
  })
);
publicAdaptiveRouter.post(
  '/sessions/:sessionId/answers',
  publicSessionRateLimiter,
  validate(sessionParams, 'params'),
  validate(answerBody),
  asyncHandler(async (req: Request, res: Response) => {
    sendSuccess(res, await adaptiveService.answer(req.params.sessionId as string, req.body.fieldId, req.body.value));
  })
);
publicAdaptiveRouter.post(
  '/sessions/:sessionId/complete',
  publicSessionRateLimiter,
  validate(sessionParams, 'params'),
  asyncHandler(async (req: Request, res: Response) => {
    sendSuccess(
      res,
      await adaptiveService.complete(req.params.sessionId as string, { ipAddress: req.ip, userAgent: req.get('user-agent') }),
      201
    );
  })
);
