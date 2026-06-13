import type { RequestHandler } from 'express';
import type { ZodSchema } from 'zod';
import { ValidationError } from '../lib/errors.js';

type RequestPart = 'body' | 'query' | 'params';

export const validate =
  <T>(schema: ZodSchema<T>, part: RequestPart = 'body'): RequestHandler =>
  (req, _res, next) => {
    const result = schema.safeParse(req[part]);
    if (!result.success) {
      next(ValidationError('Validation failed', result.error.flatten()));
      return;
    }
    req[part] = result.data as never;
    next();
  };
