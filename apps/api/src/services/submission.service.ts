import type { Prisma } from '@prisma/client';
import type { FieldSchema } from '@formforge/types';
import { formRepository } from '../repositories/form.repository.js';
import { submissionRepository } from '../repositories/submission.repository.js';
import { formService } from './form.service.js';
import { workflowService } from './workflow.service.js';
import { sseManager } from '../lib/sse-manager.js';
import { NotFoundError, ValidationError } from '../lib/errors.js';
import { prisma } from '../lib/prisma.js';

const validateResponses = (fields: FieldSchema[], responses: Record<string, unknown>) => {
  for (const field of fields) {
    const value = responses[field.id];
    if (field.required && (value === undefined || value === null || value === '')) {
      throw ValidationError(`Field "${field.label}" is required`);
    }
    if (field.type === 'EMAIL' && value && typeof value === 'string') {
      if (!/^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(value)) {
        throw ValidationError(`Field "${field.label}" must be a valid email`);
      }
    }
  }
};

export const submissionService = {
  submitPublic: async (
    slug: string,
    responses: Record<string, unknown>,
    meta: { ipAddress?: string; userAgent?: string }
  ) => {
    const form = await formRepository.findBySlug(slug);
    if (!form || !form.isActive) throw NotFoundError('Form not found');
    const fields = form.fields as FieldSchema[];
    validateResponses(fields, responses);
    const submission = await submissionRepository.create({
      formId: form.id,
      responses: responses as Prisma.InputJsonValue,
      ipAddress: meta.ipAddress,
      userAgent: meta.userAgent
    });
    await workflowService.processSubmissionWorkflows(form.id, submission);
    const count = await prisma.submission.count({ where: { formId: form.id } });
    sseManager.broadcast(form.workspaceId, {
      type: 'new_submission',
      formId: form.id,
      count
    });
    return { id: submission.id, message: 'Submission received' };
  },

  list: async (
    userId: string,
    workspaceId: string,
    formId: string,
    opts: { page: number; limit: number; startDate?: Date; endDate?: Date }
  ) => {
    await formService.get(userId, workspaceId, formId);
    const skip = (opts.page - 1) * opts.limit;
    const [items, total] = await submissionRepository.findByForm(formId, {
      skip,
      take: opts.limit,
      startDate: opts.startDate,
      endDate: opts.endDate
    });
    return { items, total, page: opts.page, limit: opts.limit };
  },

  get: async (
    userId: string,
    workspaceId: string,
    formId: string,
    submissionId: string
  ) => {
    await formService.get(userId, workspaceId, formId);
    const submission = await submissionRepository.findById(submissionId);
    if (!submission || submission.formId !== formId) {
      throw NotFoundError('Submission not found');
    }
    return submission;
  },

  exportCsv: async (userId: string, workspaceId: string, formId: string) => {
    const form = await formService.get(userId, workspaceId, formId);
    const [items] = await submissionRepository.findByForm(formId, {
      skip: 0,
      take: 10_000
    });
    const fields = form.fields as FieldSchema[];
    const headers = ['submittedAt', ...fields.map((f) => f.label)];
    const rows = items.map((s) => {
      const responses = s.responses as Record<string, unknown>;
      return [
        s.submittedAt.toISOString(),
        ...fields.map((f) => JSON.stringify(responses[f.id] ?? ''))
      ];
    });
    const csv = [headers.join(','), ...rows.map((r) => r.join(','))].join('\n');
    return csv;
  }
};
