import { nanoid } from 'nanoid';
import type { Prisma } from '@prisma/client';
import { formRepository } from '../repositories/form.repository.js';
import { membershipRepository } from '../repositories/membership.repository.js';
import { NotFoundError, ForbiddenError, ConflictError } from '../lib/errors.js';

const slugify = (name: string) =>
  `${name
    .toLowerCase()
    .replace(/[^a-z0-9]+/g, '-')
    .replace(/^-|-$/g, '')}-${nanoid(8)}`;

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

  create: async (userId: string, workspaceId: string, name: string) => {
    await formService.assertAccess(userId, workspaceId);
    const slug = slugify(name);
    try {
      return await formRepository.create({ workspaceId, name, slug });
    } catch {
      throw ConflictError('Could not create form slug');
    }
  },

  update: async (
    userId: string,
    workspaceId: string,
    formId: string,
    data: Partial<{ name: string; fields: unknown[]; isActive: boolean }>
  ) => {
    await formService.get(userId, workspaceId, formId);
    const update: Partial<{ name: string; fields: Prisma.InputJsonValue; isActive: boolean }> = {};
    if (data.name) update.name = data.name;
    if (data.fields) update.fields = data.fields as Prisma.InputJsonValue;
    if (data.isActive !== undefined) update.isActive = data.isActive;
    return formRepository.update(formId, update);
  },

  delete: async (userId: string, workspaceId: string, formId: string) => {
    await formService.get(userId, workspaceId, formId);
    await formRepository.delete(formId);
  },

  getPublic: async (slug: string) => {
    const form = await formRepository.findBySlug(slug);
    if (!form || !form.isActive) throw NotFoundError('Form not found');
    return {
      id: form.id,
      name: form.name,
      slug: form.slug,
      fields: form.fields
    };
  }
};
