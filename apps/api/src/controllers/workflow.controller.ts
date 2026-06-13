import type { Request, Response } from 'express';
import { workflowRepository } from '../repositories/workflow.repository.js';
import { formService } from '../services/form.service.js';
import { sendSuccess } from '../lib/response.js';
import { NotFoundError } from '../lib/errors.js';

export const workflowController = {
  list: async (req: Request, res: Response) => {
    await formService.get(
      req.user!.id,
      req.params.workspaceId as string,
      req.params.formId as string
    );
    const data = await workflowRepository.findByForm(req.params.formId as string);
    sendSuccess(res, data);
  },
  create: async (req: Request, res: Response) => {
    await formService.get(
      req.user!.id,
      req.params.workspaceId as string,
      req.params.formId as string
    );
    const data = await workflowRepository.create({
      formId: req.params.formId as string,
      name: req.body.name,
      isActive: req.body.isActive,
      steps: req.body.steps
    });
    sendSuccess(res, data, 201);
  },
  update: async (req: Request, res: Response) => {
    await formService.get(
      req.user!.id,
      req.params.workspaceId as string,
      req.params.formId as string
    );
    const existing = await workflowRepository.findById(req.params.workflowId as string);
    if (!existing || existing.formId !== req.params.formId) {
      throw NotFoundError('Workflow not found');
    }
    const data = await workflowRepository.update(
      req.params.workflowId as string,
      { name: req.body.name, isActive: req.body.isActive },
      req.body.steps
    );
    sendSuccess(res, data);
  },
  delete: async (req: Request, res: Response) => {
    await formService.get(
      req.user!.id,
      req.params.workspaceId as string,
      req.params.formId as string
    );
    await workflowRepository.delete(req.params.workflowId as string);
    sendSuccess(res, { deleted: true });
  }
};
