import { PrismaClient } from "@prisma/client";

const globalForPrisma = global as unknown as { prisma: PrismaClient };

export const prisma =
  globalForPrisma.prisma ||
  new PrismaClient({
    log: ["query"], //如果你想看 SQL 日志可以保留这个
  });

if (process.env.NODE_ENV !== "production") globalForPrisma.prisma = prisma;