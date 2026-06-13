import { Router } from 'express';
import { formController } from '../controllers/form.controller.js';
import { submissionController } from '../controllers/submission.controller.js';
import { validate } from '../middleware/validate.js';
import { publicSubmitSchema } from '../schemas/submissions.schema.js';
import { publicSubmitRateLimiter } from '../middleware/rate-limit.js';
import { asyncHandler } from '../lib/async-handler.js';
import { z } from 'zod';

const slugParams = z.object({ slug: z.string().min(1) });

export const publicRouter = Router();

publicRouter.get(
  '/forms/:slug',
  validate(slugParams, 'params'),
  asyncHandler(formController.getPublic)
);
publicRouter.post(
  '/forms/:slug/submit',
  publicSubmitRateLimiter,
  validate(slugParams, 'params'),
  validate(publicSubmitSchema),
  asyncHandler(submissionController.submitPublic)
);
