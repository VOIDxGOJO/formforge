import bcrypt from 'bcryptjs';
import { v4 as uuidv4 } from 'uuid';
import { Role } from '@prisma/client';
import type { Response } from 'express';
import { userRepository } from '../repositories/user.repository.js';
import { refreshTokenRepository } from '../repositories/refreshToken.repository.js';
import { workspaceRepository } from '../repositories/workspace.repository.js';
import { membershipRepository } from '../repositories/membership.repository.js';
import { signAccessToken, signRefreshToken, verifyRefreshToken } from '../lib/jwt.js';
import { ConflictError, UnauthorizedError } from '../lib/errors.js';
import { nanoid } from 'nanoid';

const cookieOptions = {
  httpOnly: true,
  secure: process.env.NODE_ENV === 'production',
  sameSite: 'lax' as const,
  path: '/'
};

const setAuthCookies = (res: Response, accessToken: string, refreshToken: string) => {
  res.cookie('access_token', accessToken, { ...cookieOptions, maxAge: 15 * 60 * 1000 });
  res.cookie('refresh_token', refreshToken, { ...cookieOptions, maxAge: 7 * 24 * 60 * 60 * 1000 });
};

const clearAuthCookies = (res: Response) => {
  res.clearCookie('access_token', cookieOptions);
  res.clearCookie('refresh_token', cookieOptions);
};

const slugify = (name: string) =>
  `${name
    .toLowerCase()
    .replace(/[^a-z0-9]+/g, '-')
    .replace(/^-|-$/g, '')}-${nanoid(6)}`;

export const authService = {
  register: async (
    res: Response,
    data: { name: string; email: string; password: string }
  ) => {
    const existing = await userRepository.findByEmail(data.email);
    if (existing) throw ConflictError('Email already registered');

    const passwordHash = await bcrypt.hash(data.password, 12);
    const user = await userRepository.create({
      email: data.email,
      passwordHash,
      name: data.name
    });

    const workspace = await workspaceRepository.create({
      name: `${data.name}'s Workspace`,
      slug: slugify(data.name)
    });
    await membershipRepository.create({
      userId: user.id,
      workspaceId: workspace.id,
      role: Role.OWNER
    });

    return authService.issueTokens(res, user.id, user.email);
  },

  login: async (res: Response, data: { email: string; password: string }) => {
    const user = await userRepository.findByEmail(data.email);
    if (!user) throw UnauthorizedError('Invalid credentials');
    const valid = await bcrypt.compare(data.password, user.passwordHash);
    if (!valid) throw UnauthorizedError('Invalid credentials');
    return authService.issueTokens(res, user.id, user.email);
  },

  issueTokens: async (res: Response, userId: string, email: string) => {
    const jti = uuidv4();
    const accessToken = signAccessToken({ sub: userId, email });
    const refreshToken = signRefreshToken({ sub: userId, jti });
    const expiresAt = new Date(Date.now() + 7 * 24 * 60 * 60 * 1000);
    await refreshTokenRepository.create({ userId, token: refreshToken, expiresAt });
    setAuthCookies(res, accessToken, refreshToken);
    const user = await userRepository.findById(userId);
    return { user: { id: userId, email, name: user?.name } };
  },

  refresh: async (res: Response, refreshToken: string) => {
    const payload = verifyRefreshToken(refreshToken);
    const stored = await refreshTokenRepository.findByToken(refreshToken);
    if (!stored || stored.expiresAt < new Date()) {
      throw UnauthorizedError('Refresh token invalid');
    }
    await refreshTokenRepository.deleteByToken(refreshToken);
    const user = await userRepository.findById(payload.sub);
    if (!user) throw UnauthorizedError();
    return authService.issueTokens(res, user.id, user.email);
  },

  logout: async (res: Response, refreshToken?: string) => {
    if (refreshToken) {
      await refreshTokenRepository.deleteByToken(refreshToken).catch(() => undefined);
    }
    clearAuthCookies(res);
  },

  getMe: async (userId: string) => {
    const user = await userRepository.findById(userId);
    if (!user) throw UnauthorizedError();
    const workspaces = await workspaceRepository.findByUserId(userId);
    return {
      id: user.id,
      email: user.email,
      name: user.name,
      workspaces
    };
  }
};
