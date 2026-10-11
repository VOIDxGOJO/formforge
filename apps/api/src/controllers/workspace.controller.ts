import type { Request, Response } from 'express';
import { workspaceService } from '../services/workspace.service.js';
import { sendSuccess } from '../lib/response.js';

export const workspaceController = {
  list: async (req: Request, res: Response) => {
    const data = await workspaceService.list(req.user!.id);
    sendSuccess(res, data);
  },
  create: async (req: Request, res: Response) => {
    const data = await workspaceService.create(req.user!.id, req.body.name);
    sendSuccess(res, data, 201);
  },
  get: async (req: Request, res: Response) => {
    const data = await workspaceService.get(req.params.workspaceId as string);
    sendSuccess(res, data);
  },
  update: async (req: Request, res: Response) => {
    const data = await workspaceService.update(
      req.params.workspaceId as string,
      req.body.name
    );
    sendSuccess(res, data);
  },
  members: async (req: Request, res: Response) => {
    const data = await workspaceService.listMembers(req.params.workspaceId as string);
    sendSuccess(res, data);
  },
  invite: async (req: Request, res: Response) => {
    const user = await import('../repositories/user.repository.js').then((m) =>
      m.userRepository.findById(req.user!.id)
    );
    const data = await workspaceService.invite(
      req.params.workspaceId as string,
      req.body.email,
      req.body.role,
      user?.name ?? 'A teammate'
    );
    sendSuccess(res, data, 201);
  },
  acceptInvite: async (req: Request, res: Response) => {
    const data = await workspaceService.acceptInvite(
      req.user!.id,
      req.params.workspaceId as string,
      req.body.token
    );
    sendSuccess(res, data);
  },
  removeMember: async (req: Request, res: Response) => {
    await workspaceService.removeMember(
      req.params.workspaceId as string,
      req.params.userId as string,
      req.membership!.role
    );
    sendSuccess(res, { removed: true });
  },
  analytics: async (req: Request, res: Response) => {
    const data = await workspaceService.getAnalytics(req.params.workspaceId as string);
    sendSuccess(res, data);
  },
  delete: async (req: Request, res: Response) => {
    await workspaceService.deleteWorkspace(req.params.workspaceId as string);
    sendSuccess(res, { deleted: true });
  }
};
