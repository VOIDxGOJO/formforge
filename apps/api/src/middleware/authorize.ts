import type { RequestHandler } from 'express';
import type { Role } from '@prisma/client';
import { membershipRepository } from '../repositories/membership.repository.js';
import { ForbiddenError } from '../lib/errors.js';

export const authorize =
  (allowedRoles: Role[]): RequestHandler =>
  async (req, _res, next) => {
    try {
      const workspaceId = req.params.workspaceId as string | undefined;
      if (!workspaceId || !req.user) {
        next(ForbiddenError());
        return;
      }
      const membership = await membershipRepository.findByUserAndWorkspace(
        req.user.id,
        workspaceId
      );
      if (!membership || !allowedRoles.includes(membership.role)) {
        next(ForbiddenError('Insufficient permissions'));
        return;
      }
      req.membership = { workspaceId, role: membership.role };
      next();
    } catch (err) {
      next(err);
    }
  };
