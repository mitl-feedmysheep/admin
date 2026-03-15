import { PrismaClient } from "@prisma/client";

const globalForPrisma = globalThis as unknown as {
  prisma: PrismaClient | undefined;
};

const databaseUrl = process.env.TEST_DATABASE_URL || process.env.DATABASE_URL;

export const prisma =
  globalForPrisma.prisma ??
  new PrismaClient({
    log: process.env.NODE_ENV === "development" ? ["query", "error", "warn"] : ["error"],
    datasources: {
      db: { url: databaseUrl },
    },
  });

if (process.env.NODE_ENV !== "production") globalForPrisma.prisma = prisma;
