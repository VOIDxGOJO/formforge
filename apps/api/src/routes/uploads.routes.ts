import { Router } from 'express';
import { uploadController } from '../controllers/upload.controller.js';
import { authenticate } from '../middleware/authenticate.js';
import { validate } from '../middleware/validate.js';
import { presignSchema } from '../schemas/uploads.schema.js';
import { asyncHandler } from '../lib/async-handler.js';

export const uploadsRouter = Router();

uploadsRouter.post(
  '/presign',
  authenticate,
  validate(presignSchema),
  asyncHandler(uploadController.presign)
);
