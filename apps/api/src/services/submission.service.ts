import type { Prisma } from '@prisma/client';
import { RATING_MAX, RATING_MIN, type FieldSchema } from '@formforge/types';
import { formRepository } from '../repositories/form.repository.js';
import { submissionRepository } from '../repositories/submission.repository.js';
import { formService } from './form.service.js';
import { workflowService } from './workflow.service.js';
import { sseManager } from '../lib/sse-manager.js';
import { NotFoundError, ValidationError } from '../lib/errors.js';
import { prisma } from '../lib/prisma.js';
import { toCsv } from '../lib/csv.js';

export const validateResponses = (fields: FieldSchema[], responses: Record<string, unknown>) => {
  for (const field of fields) {
    const value = responses[field.id];
    const empty = value === undefined || value === null || value === '';
    if (empty) {
      if (field.required) throw ValidationError(`Field "${field.label}" is required`);
      continue;
    }
    if (field.type === 'EMAIL' && (typeof value !== 'string' || !/^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(value))) {
      throw ValidationError(`Field "${field.label}" must be a valid email`);
    }
    if (field.type === 'NUMBER' && !Number.isFinite(Number(value))) {
      throw ValidationError(`Field "${field.label}" must be a number`);
    }
    if (field.type === 'RATING') {
      const n = Number(value);
      if (!Number.isInteger(n) || n < RATING_MIN || n > RATING_MAX) {
        throw ValidationError(`Field "${field.label}" must be a rating from ${RATING_MIN} to ${RATING_MAX}`);
      }
    }
    if (field.type === 'DROPDOWN' && field.options && !field.options.some((o) => o.value === value)) {
      throw ValidationError(`Field "${field.label}" must be one of the listed options`);
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
    const result = await submissionService.record(form, { responses, ...meta });
    if ((form.adaptiveConfig as { enabled?: boolean } | null)?.enabled) {
      // Lazy import: adaptive.service depends on this module.
      void import('./adaptive.service.js').then((m) => m.adaptiveService.maybeRefit(form.id));
    }
    return result;
  },

  /** Stores a submission, runs the form's workflows and pushes the live count. */
  record: async (
    form: { id: string; workspaceId: string },
    data: {
      responses: Record<string, unknown>;
      imputed?: Record<string, unknown>;
      sessionId?: string;
      ipAddress?: string;
      userAgent?: string;
    }
  ) => {
    const submission = await submissionRepository.create({
      formId: form.id,
      responses: data.responses as Prisma.InputJsonValue,
      ...(data.imputed ? { imputed: data.imputed as Prisma.InputJsonValue } : {}),
      sessionId: data.sessionId,
      ipAddress: data.ipAddress,
      userAgent: data.userAgent
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
      return [s.submittedAt, ...fields.map((f) => responses[f.id])];
    });
    return toCsv([headers, ...rows]);
  }
};
