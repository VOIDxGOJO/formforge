import type { Request, Response } from 'express';
import { submissionService } from '../services/submission.service.js';
import { sendSuccess } from '../lib/response.js';

export const submissionController = {
  submitPublic: async (req: Request, res: Response) => {
    const data = await submissionService.submitPublic(
      req.params.slug as string,
      req.body.responses,
      { ipAddress: req.ip, userAgent: req.get('user-agent') ?? undefined }
    );
    sendSuccess(res, data, 201);
  },
  list: async (req: Request, res: Response) => {
    const q = req.query as unknown as {
      page: number;
      limit: number;
      startDate?: string;
      endDate?: string;
    };
    const result = await submissionService.list(
      req.user!.id,
      req.params.workspaceId as string,
      req.params.formId as string,
      {
        page: q.page,
        limit: q.limit,
        startDate: q.startDate ? new Date(q.startDate) : undefined,
        endDate: q.endDate ? new Date(q.endDate) : undefined
      }
    );
    sendSuccess(res, result.items, 200, {
      page: result.page,
      limit: result.limit,
      total: result.total
    });
  },
  get: async (req: Request, res: Response) => {
    const data = await submissionService.get(
      req.user!.id,
      req.params.workspaceId as string,
      req.params.formId as string,
      req.params.submissionId as string
    );
    sendSuccess(res, data);
  },
  exportCsv: async (req: Request, res: Response) => {
    const csv = await submissionService.exportCsv(
      req.user!.id,
      req.params.workspaceId as string,
      req.params.formId as string
    );
    res.setHeader('Content-Type', 'text/csv');
    res.setHeader('Content-Disposition', 'attachment; filename="submissions.csv"');
    res.send(csv);
  }
};
