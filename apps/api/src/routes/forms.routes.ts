import { Router } from 'express';
import { Role } from '@prisma/client';
import { formController } from '../controllers/form.controller.js';
import { submissionController } from '../controllers/submission.controller.js';
import { workflowController } from '../controllers/workflow.controller.js';
import { authenticate } from '../middleware/authenticate.js';
import { authorize } from '../middleware/authorize.js';
import { validate } from '../middleware/validate.js';
import {
  createFormSchema,
  updateFormSchema,
  formParamsSchema,
  listFormsQuerySchema
} from '../schemas/forms.schema.js';
import {
  listSubmissionsQuerySchema,
  submissionParamsSchema
} from '../schemas/submissions.schema.js';
import {
  createWorkflowSchema,
  updateWorkflowSchema,
  workflowParamsSchema
} from '../schemas/workflows.schema.js';
import { workspaceIdParamsSchema } from '../schemas/workspace.schema.js';
import { asyncHandler } from '../lib/async-handler.js';

const memberAuth = [Role.OWNER, Role.ADMIN, Role.MEMBER, Role.VIEWER];
const editorAuth = [Role.OWNER, Role.ADMIN, Role.MEMBER];

export const formsRouter = Router({ mergeParams: true });

formsRouter.use(authenticate);

formsRouter.get(
  '/',
  validate(workspaceIdParamsSchema, 'params'),
  validate(listFormsQuerySchema, 'query'),
  authorize(memberAuth),
  asyncHandler(formController.list)
);
formsRouter.post(
  '/',
  validate(workspaceIdParamsSchema, 'params'),
  validate(createFormSchema),
  authorize(editorAuth),
  asyncHandler(formController.create)
);
formsRouter.get(
  '/:formId',
  validate(formParamsSchema, 'params'),
  authorize(memberAuth),
  asyncHandler(formController.get)
);
formsRouter.patch(
  '/:formId',
  validate(formParamsSchema, 'params'),
  validate(updateFormSchema),
  authorize(editorAuth),
  asyncHandler(formController.update)
);
formsRouter.delete(
  '/:formId',
  validate(formParamsSchema, 'params'),
  authorize([Role.OWNER, Role.ADMIN]),
  asyncHandler(formController.delete)
);

formsRouter.get(
  '/:formId/submissions',
  validate(formParamsSchema, 'params'),
  validate(listSubmissionsQuerySchema, 'query'),
  authorize(memberAuth),
  asyncHandler(submissionController.list)
);
formsRouter.get(
  '/:formId/submissions/export',
  validate(formParamsSchema, 'params'),
  authorize(memberAuth),
  asyncHandler(submissionController.exportCsv)
);
formsRouter.get(
  '/:formId/submissions/:submissionId',
  validate(submissionParamsSchema, 'params'),
  authorize(memberAuth),
  asyncHandler(submissionController.get)
);

formsRouter.get(
  '/:formId/workflows',
  validate(formParamsSchema, 'params'),
  authorize(memberAuth),
  asyncHandler(workflowController.list)
);
formsRouter.post(
  '/:formId/workflows',
  validate(formParamsSchema, 'params'),
  validate(createWorkflowSchema),
  authorize(editorAuth),
  asyncHandler(workflowController.create)
);
formsRouter.patch(
  '/:formId/workflows/:workflowId',
  validate(workflowParamsSchema, 'params'),
  validate(updateWorkflowSchema),
  authorize(editorAuth),
  asyncHandler(workflowController.update)
);
formsRouter.delete(
  '/:formId/workflows/:workflowId',
  validate(workflowParamsSchema, 'params'),
  authorize(editorAuth),
  asyncHandler(workflowController.delete)
);
