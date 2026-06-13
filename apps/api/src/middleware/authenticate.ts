import type { RequestHandler } from 'express';
import { verifyAccessToken } from '../lib/jwt.js';
import { UnauthorizedError } from '../lib/errors.js';

export const authenticate: RequestHandler = (req, _res, next) => {
  const token = req.cookies?.access_token as string | undefined;
  if (!token) {
    next(UnauthorizedError());
    return;
  }
  try {
    const payload = verifyAccessToken(token);
    req.user = { id: payload.sub, email: payload.email };
    next();
  } catch (err) {
    next(err);
  }
};
