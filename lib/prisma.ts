import { PrismaClient } from "@prisma/client";

const globalForPrisma = globalThis as unknown as {
  prisma: PrismaClient | undefined;
};

function missingDbProxy() {
  const handler: ProxyHandler<any> = {
    get() {
      throw new Error(
        "Missing DATABASE_URL environment variable. Please set DATABASE_URL in your deployment settings.",
      );
    },
    apply() {
      throw new Error(
        "Missing DATABASE_URL environment variable. Please set DATABASE_URL in your deployment settings.",
      );
    },
  };

  return new Proxy(() => {}, handler) as unknown as PrismaClient;
}

let prisma: PrismaClient;

if (process.env.NODE_ENV === "production" && !process.env.DATABASE_URL) {
  // In production without DATABASE_URL, use a proxy that throws a clear error
  // when any prisma operation is attempted. This yields a clearer runtime
  // message instead of obscure stack traces.
  prisma = missingDbProxy();
} else {
  prisma =
    globalForPrisma.prisma ??
    new PrismaClient();

  if (process.env.NODE_ENV !== "production") {
    globalForPrisma.prisma = prisma;
  }
}

export { prisma };