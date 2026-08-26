import { PrismaClient } from "@prisma/client";

/**
 * A single Prisma instance, reused across hot reloads in dev and across
 * serverless invocations in prod. DATABASE_URL points at the pooled
 * (PgBouncer) connection; migrations use DIRECT_URL separately.
 */
const globalForPrisma = globalThis as unknown as { prisma?: PrismaClient };

export const prisma =
  globalForPrisma.prisma ??
  new PrismaClient({ log: process.env.NODE_ENV === "development" ? ["error", "warn"] : ["error"] });

if (process.env.NODE_ENV !== "production") globalForPrisma.prisma = prisma;
