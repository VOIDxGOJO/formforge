import { nanoid } from 'nanoid';
import { Prisma } from '@prisma/client';
import type { AdaptiveConfig, FieldSchema, PublicFormConfig } from '@formforge/types';
import { formRepository } from '../repositories/form.repository.js';
import { membershipRepository } from '../repositories/membership.repository.js';
import { NotFoundError, ForbiddenError, ConflictError } from '../lib/errors.js';

const slugify = (name: string) =>
  `${name
    .toLowerCase()
    .replace(/[^a-z0-9]+/g, '-')
    .replace(/^-|-$/g, '')}-${nanoid(8)}`;

// Respondents only get what they need to render the form; question metadata
// (targets, relevance, timings) and adaptive settings stay internal.
export const toPublicForm = (form: {
  id: string;
  name: string;
  slug: string;
  fields: unknown;
  adaptiveConfig: unknown;
}): PublicFormConfig => ({
  id: form.id,
  name: form.name,
  slug: form.slug,
  fields: (form.fields as FieldSchema[]).map(({ id, type, label, placeholder, required, options }) => ({
    id,
    type,
    label,
    placeholder,
    required,
    options
  })),
  adaptive: (form.adaptiveConfig as AdaptiveConfig | null)?.enabled === true
});

export const formService = {
  assertAccess: async (userId: string, workspaceId: string) => {
    const membership = await membershipRepository.findByUserAndWorkspace(userId, workspaceId);
    if (!membership) throw ForbiddenError();
    return membership;
  },

  list: async (
    userId: string,
    workspaceId: string,
    page: number,
    limit: number,
    q?: string
  ) => {
    await formService.assertAccess(userId, workspaceId);
    const skip = (page - 1) * limit;
    const [items, total] = await formRepository.findByWorkspace(workspaceId, {
      skip,
      take: limit,
      q
    });
    return { items, total, page, limit };
  },

  get: async (userId: string, workspaceId: string, formId: string) => {
    await formService.assertAccess(userId, workspaceId);
    const form = await formRepository.findById(formId);
    if (!form || form.workspaceId !== workspaceId) throw NotFoundError('Form not found');
    return form;
  },

  create: async (userId: string, workspaceId: string, name: string, objective?: string) => {
    await formService.assertAccess(userId, workspaceId);
    // Only a duplicate slug (unique violation) is retried; any other error, such as a
    // database that is missing a migration, surfaces with its real cause.
    for (let attempt = 0; attempt < 3; attempt++) {
      try {
        return await formRepository.create({ workspaceId, name, slug: slugify(name), objective });
      } catch (err) {
        if (!(err instanceof Prisma.PrismaClientKnownRequestError && err.code === 'P2002')) throw err;
      }
    }
    throw ConflictError('Could not create a unique form slug');
  },

  update: async (
    userId: string,
    workspaceId: string,
    formId: string,
    data: Partial<{
      name: string;
      objective: string | null;
      fields: unknown[];
      adaptiveConfig: AdaptiveConfig | null;
      isActive: boolean;
    }>
  ) => {
    await formService.get(userId, workspaceId, formId);
    const update: Prisma.FormUpdateInput = {};
    if (data.name) update.name = data.name;
    if (data.objective !== undefined) update.objective = data.objective;
    if (data.fields) update.fields = data.fields as Prisma.InputJsonValue;
    if (data.adaptiveConfig !== undefined) {
      update.adaptiveConfig =
        data.adaptiveConfig === null ? Prisma.DbNull : (data.adaptiveConfig as Prisma.InputJsonValue);
    }
    if (data.isActive !== undefined) update.isActive = data.isActive;
    return formRepository.update(formId, update);
  },

  delete: async (userId: string, workspaceId: string, formId: string) => {
    await formService.get(userId, workspaceId, formId);
    await formRepository.delete(formId);
  },

  getPublic: async (slug: string): Promise<PublicFormConfig> => {
    const form = await formRepository.findBySlug(slug);
    if (!form || !form.isActive) throw NotFoundError('Form not found');
    return toPublicForm(form);
  }
};
