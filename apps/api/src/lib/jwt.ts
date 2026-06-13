import jwt from 'jsonwebtoken';
import { UnauthorizedError } from './errors.js';

const accessSecret = process.env.JWT_ACCESS_SECRET ?? '';
const refreshSecret = process.env.JWT_REFRESH_SECRET ?? '';

export type AccessTokenPayload = {
  sub: string;
  email: string;
};

export type RefreshTokenPayload = {
  sub: string;
  jti: string;
};

export const signAccessToken = (payload: AccessTokenPayload): string =>
  jwt.sign(payload, accessSecret, { expiresIn: '15m' });

export const signRefreshToken = (payload: RefreshTokenPayload): string =>
  jwt.sign(payload, refreshSecret, { expiresIn: '7d' });

export const verifyAccessToken = (token: string): AccessTokenPayload => {
  try {
    return jwt.verify(token, accessSecret) as AccessTokenPayload;
  } catch {
    throw UnauthorizedError('Invalid or expired access token');
  }
};

export const verifyRefreshToken = (token: string): RefreshTokenPayload => {
  try {
    return jwt.verify(token, refreshSecret) as RefreshTokenPayload;
  } catch {
    throw UnauthorizedError('Invalid or expired refresh token');
  }
};
