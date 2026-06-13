import type { Request, Response } from 'express';
import { sseManager } from '../lib/sse-manager.js';

export const sseController = {
  connect: (req: Request, res: Response) => {
    sseManager.connect(req.params.workspaceId as string, res);
  }
};
