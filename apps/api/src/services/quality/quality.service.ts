import type { Prisma } from '@prisma/client';
import type { FieldSchema, QualityReport } from '@formforge/types';
import { prisma } from '../../lib/prisma.js';
import { formService } from '../form.service.js';
import { analyzeWithRules, type AnalyzeInput } from './analyzer.js';
import { reviewWithAI } from './ai-review.js';

export const qualityService = {
  /** Rule layer, plus the AI review when `deep` is set. Stores nothing. */
  analyze: async (input: AnalyzeInput, deep = false): Promise<QualityReport> => {
    const report = analyzeWithRules(input);
    return deep ? reviewWithAI(input.fields, report) : report;
  },

  /** Analyzes the saved form and stores the result as its latest QualityReport. */
  analyzeForm: async (userId: string, workspaceId: string, formId: string, deep: boolean) => {
    const form = await formService.get(userId, workspaceId, formId);
    const report = await qualityService.analyze({ fields: form.fields as FieldSchema[], objective: form.objective }, deep);
    const saved = await prisma.qualityReport.create({
      data: {
        formId,
        score: report.score,
        estimatedSeconds: report.estimatedSeconds,
        issues: report.issues as unknown as Prisma.InputJsonValue
      }
    });
    return { ...report, id: saved.id, createdAt: saved.createdAt };
  },

  latest: async (userId: string, workspaceId: string, formId: string) => {
    await formService.get(userId, workspaceId, formId);
    return prisma.qualityReport.findFirst({ where: { formId }, orderBy: { createdAt: 'desc' } });
  }
};
