import { prisma } from '../lib/prisma.js';

export const userRepository = {
  findByEmail: (email: string) => prisma.user.findUnique({ where: { email } }),
  findById: (id: string) => prisma.user.findUnique({ where: { id } }),
  create: (data: { email: string; passwordHash: string; name: string }) =>
    prisma.user.create({ data })
};
