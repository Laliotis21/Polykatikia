import { PrismaClient } from "@prisma/client";

const globalForPrisma = globalThis as unknown as {
  prisma: PrismaClient | undefined;
};

/**
 * Serverless-friendly DATABASE_URL: one Prisma connection per isolate.
 * Supabase transaction pooler (port 6543) multiplexes across instances.
 */
function datasourceUrl(): string | undefined {
  const raw = process.env.DATABASE_URL;
  if (!raw) return undefined;

  try {
    const url = new URL(raw);
    if (!url.searchParams.has("connection_limit")) {
      url.searchParams.set("connection_limit", "1");
    }
    // Transaction-mode pooler: disable prepared statements.
    if (
      url.port === "6543" &&
      !url.searchParams.has("pgbouncer") &&
      url.hostname.includes("pooler.supabase.com")
    ) {
      url.searchParams.set("pgbouncer", "true");
    }
    return url.toString();
  } catch {
    return raw;
  }
}

export const prisma =
  globalForPrisma.prisma ??
  new PrismaClient({
    datasources: {
      db: { url: datasourceUrl() },
    },
    log: process.env.NODE_ENV === "development" ? ["error", "warn"] : ["error"],
  });

// Always reuse across hot reload (dev) and warm serverless isolates (prod).
globalForPrisma.prisma = prisma;
