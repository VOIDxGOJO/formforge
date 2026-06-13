import type { Response } from 'express';
import type { ApiMeta } from '@formforge/types';

export const sendSuccess = <T>(
  res: Response,
  data: T,
  statusCode = 200,
  meta?: ApiMeta
): void => {
  res.status(statusCode).json({
    success: true,
    data,
    ...(meta ? { meta } : {})
  });
};

export const sendError = (
  res: Response,
  error: { code: string; message: string; details?: unknown },
  statusCode = 500
): void => {
  res.status(statusCode).json({ success: false, error });
};
