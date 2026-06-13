import { prisma } from '../lib/prisma.js';

export const refreshTokenRepository = {
  create: (data: { userId: string; token: string; expiresAt: Date }) =>
    prisma.refreshToken.create({ data }),
  findByToken: (token: string) => prisma.refreshToken.findUnique({ where: { token } }),
  deleteByToken: (token: string) => prisma.refreshToken.delete({ where: { token } }),
  deleteByUserId: (userId: string) => prisma.refreshToken.deleteMany({ where: { userId } })
};
