import { Router } from 'express';
import { Role } from '@prisma/client';
import { workspaceController } from '../controllers/workspace.controller.js';
import { authenticate } from '../middleware/authenticate.js';
import { authorize } from '../middleware/authorize.js';
import { validate } from '../middleware/validate.js';
import {
  createWorkspaceSchema,
  updateWorkspaceSchema,
  inviteSchema,
  acceptInviteSchema,
  workspaceIdParamsSchema,
  memberParamsSchema
} from '../schemas/workspace.schema.js';
import { asyncHandler } from '../lib/async-handler.js';

export const workspacesRouter = Router();

workspacesRouter.use(authenticate);

workspacesRouter.get('/', asyncHandler(workspaceController.list));
workspacesRouter.post('/', validate(createWorkspaceSchema), asyncHandler(workspaceController.create));

workspacesRouter.get(
  '/:workspaceId',
  validate(workspaceIdParamsSchema, 'params'),
  authorize([Role.OWNER, Role.ADMIN, Role.MEMBER, Role.VIEWER]),
  asyncHandler(workspaceController.get)
);
workspacesRouter.patch(
  '/:workspaceId',
  validate(workspaceIdParamsSchema, 'params'),
  validate(updateWorkspaceSchema),
  authorize([Role.OWNER, Role.ADMIN]),
  asyncHandler(workspaceController.update)
);
workspacesRouter.delete(
  '/:workspaceId',
  validate(workspaceIdParamsSchema, 'params'),
  authorize([Role.OWNER]),
  asyncHandler(workspaceController.delete)
);
workspacesRouter.get(
  '/:workspaceId/members',
  validate(workspaceIdParamsSchema, 'params'),
  authorize([Role.OWNER, Role.ADMIN, Role.MEMBER, Role.VIEWER]),
  asyncHandler(workspaceController.members)
);
workspacesRouter.post(
  '/:workspaceId/invite',
  validate(workspaceIdParamsSchema, 'params'),
  validate(inviteSchema),
  authorize([Role.OWNER, Role.ADMIN]),
  asyncHandler(workspaceController.invite)
);
workspacesRouter.post(
  '/:workspaceId/accept-invite',
  validate(workspaceIdParamsSchema, 'params'),
  validate(acceptInviteSchema),
  asyncHandler(workspaceController.acceptInvite)
);
workspacesRouter.delete(
  '/:workspaceId/members/:userId',
  validate(memberParamsSchema, 'params'),
  authorize([Role.OWNER, Role.ADMIN]),
  asyncHandler(workspaceController.removeMember)
);
workspacesRouter.get(
  '/:workspaceId/analytics',
  validate(workspaceIdParamsSchema, 'params'),
  authorize([Role.OWNER, Role.ADMIN, Role.MEMBER, Role.VIEWER]),
  asyncHandler(workspaceController.analytics)
);
