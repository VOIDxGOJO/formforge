import type { Request, Response } from 'express';
import { authService } from '../services/auth.service.js';
import { sendSuccess } from '../lib/response.js';

export const authController = {
  register: async (req: Request, res: Response) => {
    const data = await authService.register(res, req.body);
    sendSuccess(res, data, 201);
  },
  login: async (req: Request, res: Response) => {
    const data = await authService.login(res, req.body);
    sendSuccess(res, data);
  },
  refresh: async (req: Request, res: Response) => {
    const token = req.cookies?.refresh_token as string | undefined;
    const data = await authService.refresh(res, token ?? '');
    sendSuccess(res, data);
  },
  logout: async (req: Request, res: Response) => {
    const token = req.cookies?.refresh_token as string | undefined;
    await authService.logout(res, token);
    sendSuccess(res, { message: 'Logged out' });
  },
  me: async (req: Request, res: Response) => {
    const data = await authService.getMe(req.user!.id);
    sendSuccess(res, data);
  }
};
