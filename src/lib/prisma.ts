import { PrismaClient } from "@/generated/prisma/client";
import { PrismaPg } from "@prisma/adapter-pg";

const globalForPrisma = globalThis as unknown as {
  prisma: PrismaClient | undefined;
};

// Cap the pool size per client instance. Vercel can spin up several separate
// instances (build-time static generation, multiple serverless functions),
// each with its own pool - a high per-instance max can exhaust a small
// Postgres plan's total connection limit even though no single instance is
// under heavy concurrent load.
const adapter = new PrismaPg({
  connectionString: process.env.DATABASE_URL!,
  max: 1,
});

export const prisma = globalForPrisma.prisma ?? new PrismaClient({ adapter });

if (process.env.NODE_ENV !== "production") globalForPrisma.prisma = prisma;
