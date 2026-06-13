import type { Request, Response } from 'express';
import { formService } from '../services/form.service.js';
import { sendSuccess } from '../lib/response.js';

export const formController = {
  list: async (req: Request, res: Response) => {
    const { page, limit, q } = req.query as unknown as {
      page: number;
      limit: number;
      q?: string;
    };
    const result = await formService.list(
      req.user!.id,
      req.params.workspaceId as string,
      page,
      limit,
      q
    );
    sendSuccess(res, result.items, 200, {
      page: result.page,
      limit: result.limit,
      total: result.total
    });
  },
  create: async (req: Request, res: Response) => {
    const data = await formService.create(
      req.user!.id,
      req.params.workspaceId as string,
      req.body.name
    );
    sendSuccess(res, data, 201);
  },
  get: async (req: Request, res: Response) => {
    const data = await formService.get(
      req.user!.id,
      req.params.workspaceId as string,
      req.params.formId as string
    );
    sendSuccess(res, data);
  },
  update: async (req: Request, res: Response) => {
    const data = await formService.update(
      req.user!.id,
      req.params.workspaceId as string,
      req.params.formId as string,
      req.body
    );
    sendSuccess(res, data);
  },
  delete: async (req: Request, res: Response) => {
    await formService.delete(
      req.user!.id,
      req.params.workspaceId as string,
      req.params.formId as string
    );
    sendSuccess(res, { deleted: true });
  },
  getPublic: async (req: Request, res: Response) => {
    const data = await formService.getPublic(req.params.slug as string);
    sendSuccess(res, data);
  }
};
