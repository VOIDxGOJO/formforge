import { ActionType } from '@prisma/client';
import type { Submission, Workflow, WorkflowStep } from '@prisma/client';
import { workflowRepository } from '../repositories/workflow.repository.js';
import { webhookDeliveryRepository } from '../repositories/webhookDelivery.repository.js';
import { emailService } from './email.service.js';

const interpolate = (template: string, responses: Record<string, unknown>): string =>
  template.replace(/\{\{(\w+)\}\}/g, (_, key: string) => String(responses[key] ?? ''));

export const workflowService = {
  loadActiveWorkflowsForForm: (formId: string) => workflowRepository.findActiveByForm(formId),

  evaluateAndDispatch: async (
    workflow: Workflow & { steps: WorkflowStep[] },
    submission: Submission
  ) => {
    const responses = submission.responses as Record<string, unknown>;
    for (const step of workflow.steps) {
      if (step.actionType === ActionType.SEND_EMAIL) {
        await workflowService.dispatchEmail(step, responses);
      } else if (step.actionType === ActionType.WEBHOOK) {
        await workflowService.dispatchWebhook(step, submission.id);
      }
    }
  },

  dispatchEmail: async (step: WorkflowStep, responses: Record<string, unknown>) => {
    const config = step.actionConfig as { to: string; subject: string; body: string };
    await emailService.sendWorkflowEmail(
      config.to,
      interpolate(config.subject, responses),
      interpolate(config.body, responses)
    );
  },

  dispatchWebhook: async (step: WorkflowStep, submissionId: string) => {
    await webhookDeliveryRepository.create({
      workflowStepId: step.id,
      submissionId
    });
  },

  processSubmissionWorkflows: async (formId: string, submission: Submission) => {
    const workflows = await workflowService.loadActiveWorkflowsForForm(formId);
    await Promise.all(workflows.map((w) => workflowService.evaluateAndDispatch(w, submission)));
  }
};
