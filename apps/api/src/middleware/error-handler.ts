import type { ErrorRequestHandler } from 'express';
import { AppError } from '../lib/errors.js';
import { sendError } from '../lib/response.js';

export const errorHandler: ErrorRequestHandler = (err, _req, res, _next) => {
  if (err instanceof AppError) {
    sendError(
      res,
      {
        code: err.code,
        message: err.message,
        ...(err.details !== undefined ? { details: err.details } : {})
      },
      err.statusCode
    );
    return;
  }
  if (process.env.NODE_ENV !== 'production') {
    console.error(err);
  }
  sendError(res, { code: 'INTERNAL_SERVER_ERROR', message: 'Something went wrong' }, 500);
};
