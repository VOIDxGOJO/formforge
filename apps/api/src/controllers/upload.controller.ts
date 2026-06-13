import type { Request, Response } from 'express';
import { uploadService } from '../services/upload.service.js';
import { sendSuccess } from '../lib/response.js';

export const uploadController = {
  presign: async (req: Request, res: Response) => {
    const data = await uploadService.presignUpload(
      req.user!.id,
      req.body.formId,
      req.body.filename,
      req.body.contentType
    );
    sendSuccess(res, data);
  }
};
